import wrench from 'wrench';
import colors from 'colors';
import Logger from '../util/logger';
import fs from 'fs';
import Hexo from 'hexo';
import jsonfile from 'jsonfile';
import JSONSelect from 'JSONSelect';
import HtmlParser from '../util/htmlParser';
import LinkChecker from '../util/linkChecker';
import linkItemFormatter from '../util/linkItemFormatter';
import CliTable from 'cli-table';
import moment from 'moment';
import async from 'async';
import _s from 'underscore.string';

const hexo = new Hexo(process.cwd(), {});
const userConfig = hexo.config.link_checker || false;

class BrokenLinkChecker {
  static RUNNING_SCOPE_COMMAND = 1;
  static RUNNING_SCOPE_FILTER = 2;
  static LIST_LINKS_FILTER_ALL = 1;
  static LIST_LINKS_FILTER_BROKEN = 2;
  static LIST_LINKS_FILTER_REDIRECTS = 3;
  static LIST_LINKS_FILTER_UNVERIFIED = 4;
  static LIST_LINKS_FILTER_OK = 5;

  constructor(options) {
    this.runningScope = options.scope || BrokenLinkChecker.RUNNING_SCOPE_COMMAND;
    this.pluginConfig = {
      enabled: typeof userConfig.enabled !== 'undefined' ? userConfig.enabled : true,
      storageDir: userConfig.storage_dir || 'temp/link_checker',
      silentLogs: options.silentLogs || userConfig.silent_logs || false,
    };

    this.workingDirectory = `${hexo.base_dir}${this.pluginConfig.storageDir}/`;

    this.storageFile = 'data.json';
    this.logFile = 'log.json';
    this._storageTemplateFile = `${__dirname}/../data/storageTemplate.json`;
    this._jsonStorage = null;

    const loggerOptions = {
      defaultPrefix: null,
      infoPrefix: null,
      warnPrefix: null,
      errPrefix: null,
      silent: this.pluginConfig.silentLogs,
      logFile: `${this.workingDirectory}${this.logFile}`,
    };

    // change the log prefix based on the running scope
    switch (this.runningScope) {
      case BrokenLinkChecker.RUNNING_SCOPE_COMMAND:
        loggerOptions.defaultPrefix = '(i) '.cyan;
        loggerOptions.warnPrefix = '(!) '.yellow;
        loggerOptions.errPrefix = '(x) '.red;
        break;
      case BrokenLinkChecker.RUNNING_SCOPE_FILTER:
        loggerOptions.defaultPrefix = `[${this.toString()} Info]`.cyan;
        loggerOptions.warnPrefix = `[${this.toString()} Warning]`.yellow;
        loggerOptions.errPrefix = `[${this.toString()} Error]`.red;
        break;
    }

    this.logger = new Logger(loggerOptions);
  }

  toString() {
    return 'BrokenLinkChecker';
  }

  getRunningScope() {
    return this.runningScope;
  }

  getLogger() {
    return this.logger;
  }

  getPluginConfig() {
    return this.pluginConfig;
  }

  getWorkingDirectory() {
    return this.workingDirectory;
  }

  getStorageFile() {
    return this.storageFile;
  }

  getStorageFilename() {
    return `${this.workingDirectory}${this.storageFile}`;
  }

  getJSONStorage(refresh = false) {
    if (!fs.readFileSync(this.getStorageFilename())) return;

    if (!this._jsonStorage || refresh) {
      this._jsonStorage = jsonfile.readFileSync(this.getStorageFilename());
    }

    return this._jsonStorage;
  }

  persistJSONStorage() {
    jsonfile.writeFileSync(this.getStorageFilename(), this._jsonStorage);
  }

  setup() {
    const logger = this.getLogger();
    const statMode = 0o777;
    let storageSourceFile;
    let storageDestFile;
    let storageSourceContents;

    logger.info('Creating working directory: %s', [this.workingDirectory.inverse]);

    if (!fs.existsSync(this.workingDirectory)) {
      wrench.mkdirSyncRecursive(this.workingDirectory, statMode);
    } else {
      logger.warning('The directory already exists.');
    }

    logger.info('Generating storage file: %s', [this.storageFile.inverse]);

    storageSourceFile = this._storageTemplateFile;
    storageDestFile = this.getStorageFilename();

    if (!fs.existsSync(storageDestFile)) {
      storageSourceContents = fs.readFileSync(storageSourceFile);
      fs.writeFileSync(storageDestFile, storageSourceContents);
    } else {
      logger.warning(
          `The storage file %s already exists and will not be overwritten. If you are COMPLETELY SURE, delete and recreate the files by running hexo link_checker reset.`,
          [storageDestFile.yellow.inverse]
      );
    }

    // reset stat mode
    logger.info('Applying write permissions to storage file.');
    fs.chmodSync(storageDestFile, statMode);

    logger.info('Generating log file: %s', [logger.logFilename.inverse]);
    logger.createLogs();

    logger.info('Done.\n');
  }

  clear() {
    const logger = this.getLogger();
    const target = this.workingDirectory;

    logger.info('Removing all files in %s', [target.inverse]);

    if (fs.existsSync(target)) {
      wrench.rmdirSyncRecursive(target, () => {
        logger.warning('There was an error removing %s directory. Please, remove it manually.', [target.inverse]);
      });
    }

    logger.info('Done.\n');
  }

  cleanLogs() {
    const logger = this.getLogger();

    logger.info('Regenerating log file: %s', [logger.logFilename.inverse]);
    logger.cleanLogs();
    logger.info('Done.\n');
  }

  storeLink(jsonSchema) {
    const logger = this.getLogger();
    const url = jsonSchema.url || false;

    if (!url) {
      logger.error('Invalid JSON schema.', true);
      return false;
    }

    const storageFile = this.getJSONStorage();
    const query = `:has(:root > .url:val("${url}"))`;
    const matches = JSONSelect.match(query, storageFile);

    if (matches.length) {
      return false;
    }

    this._jsonStorage.links.push(jsonSchema);
    this.persistJSONStorage();

    return true;
  }

  processRawData(postData) {
    const logger = this.getLogger();
    let urlSchemaArr = [];
    let ignoredCount = 0;
    const htmlParser = new HtmlParser(postData);

    logger.info('Extracting links from %s', [postData.source.inverse]);

    urlSchemaArr = [
      ...urlSchemaArr,
      ...htmlParser.processATags(),
      ...htmlParser.processImgTags(),
      ...htmlParser.processYouTube(),
    ];

    logger.info('Trying to persist %d links to storage.', [urlSchemaArr.length]);

    urlSchemaArr.forEach((link) => {
      const operationStatus = this.storeLink(link);
      if (!operationStatus) ignoredCount++;
    });

    if (ignoredCount > 0) {
      logger.info('%d duplicated links have been ignored.', [ignoredCount]);
    }

    logger.info('Done.');
  }

  checkLinks() {
    const storageFile = this.getJSONStorage();
    const logger = this.getLogger();
    const checker = new LinkChecker(storageFile.links);

    logger.info('Scanning links...');

    checker.start((err, links) => {
      logger.info('Processed %d links in %s seconds.', [links.length, checker.getSpentTime()]);

      this._jsonStorage.links = links;
      this.persistJSONStorage();

      logger.info('Run %s to summarize all of them.', ['hexo link_checker show-links'.inverse]);
    }, (url) => {
      logger.info('Checking %s', [url]);
    });
  }

  listLinkStorage(filter = BrokenLinkChecker.LIST_LINKS_FILTER_ALL) {
    const logger = this.getLogger();
    const table = new CliTable({
      head: ['ID'.bold, 'URL'.bold, 'Status'.bold],
      colWidths: [26, 60, 12],
    });

    async.filter(this.getJSONStorage().links, (item, callback) => {
      switch (filter) {
        case BrokenLinkChecker.LIST_LINKS_FILTER_ALL:
          callback(true);
          break;
        case BrokenLinkChecker.LIST_LINKS_FILTER_BROKEN:
          callback(item.lastChecked && !item.success);
          break;
        case BrokenLinkChecker.LIST_LINKS_FILTER_OK:
          callback(item.success === true);
          break;
        case BrokenLinkChecker.LIST_LINKS_FILTER_REDIRECTS:
          callback(item.redirects.length > 0);
          break;
        case BrokenLinkChecker.LIST_LINKS_FILTER_UNVERIFIED:
          callback(item.lastChecked === null);
          break;
        default:
          logger.error('Filter option "%s" is not valid.', [filter]);
      }
    }, (results) => {
      results.forEach((item) => {
        const formattedItem = linkItemFormatter(item);
        table.push([formattedItem.id, formattedItem.url, formattedItem.status]);
      });

      console.log(table.toString());
    });
  }

  listLinkById(id) {
    const storageFile = this.getJSONStorage();
    const query = _s.sprintf(':has(:root > .id:val("%s"))', id);
    const matches = JSONSelect.match(query, storageFile);

    if (matches.length) {
      const item = linkItemFormatter(matches[0]);
      const table = new CliTable();

      table.push(['ID'.bold.cyan, item.id]);
      table.push(['URL'.bold.cyan, item.url]);
      table.push(['Last Time Checked'.bold.cyan, item.lastChecked]);
      table.push(['Status'.bold.cyan, item.status]);
      table.push(['Redirects'.bold.cyan, item.redirects.length]);
      table.push(['Link Text'.bold.cyan, item.link.text]);
      table.push(['Source Title'.bold.cyan, item.source.title]);
      table.push(['Source File'.bold.cyan, item.source.file]);

      console.log(table.toString());
    }
  }

  listLogs(filter) {
    const logger = this.getLogger();
    let logFile = logger.getLogFile();
    let query;
    const table = new CliTable({
      head: ['Date'.bold, 'Type'.bold, 'Data'],
    });

    if (filter) {
      query = _s.sprintf(':has(:root > .type:val("%s"))', filter);
      const matches = JSONSelect.match(query, logFile);
      logFile.logs = matches;
    }

    logFile.logs.forEach((item) => {
      let logType;
      switch (item.type) {
        case 'info':
          logType = item.type.cyan;
          break;
        case 'warn':
          logType = item.type.yellow;
          break;
        case 'err':
          logType = item.type.red;
          break;
        default:
          logType = item.type;
          break;
      }

      table.push([item.date, logType, item.message]);
    });

    console.log(table.toString());
  }

  reset() {
    const logger = this.getLogger();

    this.clear();
    this.setup();

    logger.info('Done.\n');
  }
}

export default BrokenLinkChecker;
