import removeColors from './ansiStripper';
import jsonfile from 'jsonfile';
import moment from 'moment';
import fs from 'fs';
import _s from 'underscore.string';

class Logger {
  constructor(options) {
    this._defaultPrefix = options.defaultPrefix || '';
    this._infoPrefix = options.infoPrefix || this._defaultPrefix;
    this._warnPrefix = options.warnPrefix || this._defaultPrefix;
    this._errPrefix = options.errPrefix || this._defaultPrefix;
    this._silent = options.silent || false; // silent saves log data on file system, instead of console.log'em.
    this.logFilename = options.logFile || false;
    this._logFile = null;
  }

  getLogFile(refresh = false) {
    if (!fs.existsSync(this.logFilename)) return;

    if (!this._logFile || refresh) {
      this._logFile = jsonfile.readFileSync(this.logFilename);
    }

    return this._logFile;
  }

  persistLog() {
    jsonfile.writeFileSync(this.logFilename, this._logFile);
  }

  addToLogFile(json) {
    const logFile = this.getLogFile();
    logFile.logs.push(json);
    this._logFile = logFile;
  }

  info(...args) {
    this._outputData(args, 'info');
  }

  error(...args) {
    this._outputData(args, 'err');
  }

  warning(...args) {
    this._outputData(args, 'warn');
  }

  _outputData(args, type) {
    let datetime;
    let prefix;
    let data = args[0];
    let forceSilent;
    let sprintfVars;
    let logSchema;

    if (Array.isArray(args[1])) {
      sprintfVars = args[1];
      data = _s.vsprintf(data, sprintfVars);

      if (typeof args[2] === 'boolean') {
        forceSilent = args[2];
      }
    } else if (typeof args[1] === 'boolean') {
      forceSilent = args[1];
    }

    if (this._silent || forceSilent) {
      if (!this.logFilename) throw new Error('logFile option not provided.');
      if (!fs.existsSync(this.logFilename)) {
        console.warn('logFile does not exists. Run `createLogs`.');
        return;
      }

      datetime = moment();
      data = removeColors(data);

      logSchema = {
        date: datetime,
        type,
        data,
      };

      this.addToLogFile(logSchema);
      this.persistLog();
    } else {
      prefix = this[`_${type}Prefix`];

      switch (type) {
        case 'info':
          console.log(prefix + data);
          break;
        case 'warn':
          console.warn(prefix + data);
          break;
        case 'err':
          console.error(prefix + data);
          break;
        default:
          break;
      }
    }
  }

  createLogs() {
    if (fs.existsSync(this.logFilename)) return;

    const logSchema = {
      logs: [],
    };

    fs.writeFileSync(this.logFilename, '');
    fs.chmodSync(this.logFilename, 0o777);

    this._logFile = logSchema;
    this.persistLog();
  }

  cleanLogs() {
    if (fs.existsSync(this.logFilename)) {
      fs.unlinkSync(this.logFilename);
    }

    this.createLogs();
  }
}

export default Logger;
