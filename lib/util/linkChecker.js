import request from 'request';
import async from 'async';
import moment from 'moment';

class LinkChecker {
  constructor(linkArray) {
    this.linkArray = linkArray;
    this.processedArray = [];
    this._startTime = null;
    this._endTime = null;
  }

  getLinkArray() {
    return this.linkArray;
  }

  getProcessedArray() {
    return this.processedArray;
  }

  getSpentTime(humanReadable = false) {
    const timeFormat = 'seconds';
    let spentTime;

    if (!this._startTime || !this._endTime) return;

    if (humanReadable) {
      spentTime = this._startTime.from(this._endTime, true);
    } else {
      spentTime = this._endTime.diff(this._startTime, timeFormat);
    }

    return spentTime;
  }

  start(doneCallback, everyCallback) {
    this._endTime = null;
    this._startTime = moment();

    async.eachLimit(this.linkArray, 3, (item, callback) => {
      const url = item.url;
      const currentTime = moment();
      const lastChecked = item.lastChecked;

      // only process links where lastChecked is 1 hour ago
      if (lastChecked && currentTime.diff(moment(lastChecked), 'seconds') < 3600) {
        this.processedArray.push(item);
        callback();
        return;
      }

      if (everyCallback) everyCallback(url);

      item.lastChecked = currentTime;

      request(url, (error, response, body) => {
        if (!error && response.statusCode === 200) {
          item.success = true;
          item.redirects = response.request.redirects;
        } else {
          item.success = false;
          item.redirects = [];
        }

        this.processedArray.push(item);
        callback();
      });
    }, (err) => {
      this._endTime = moment();
      doneCallback(err, this.processedArray);
    });
  }
}

export default LinkChecker;
