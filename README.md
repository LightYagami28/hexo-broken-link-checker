# Hexo Broken Link Checker

[![npm version](https://img.shields.io/npm/v/hexo-broken-link-checker.svg)](https://www.npmjs.com/package/hexo-broken-link-checker)
[![Build Status](https://img.shields.io/travis/sergiolepore/hexo-broken-link-checker.svg)](https://travis-ci.org/sergiolepore/hexo-broken-link-checker)
[![Coverage Status](https://img.shields.io/coveralls/sergiolepore/hexo-broken-link-checker.svg)](https://coveralls.io/github/sergiolepore/hexo-broken-link-checker?branch=master)
[![Dependency Status](https://img.shields.io/david/sergiolepore/hexo-broken-link-checker.svg)](https://david-dm.org/sergiolepore/hexo-broken-link-checker)

Hexo Broken Link Checker is a [Hexo](https://github.com/hexojs/hexo) plugin that detects broken links, missing images, and redirects.

## Plugin Installation

Run the following command in the root directory of Hexo:

```sh
npm install hexo-broken-link-checker --save
```

Enable the plugin in `_config.yml`:

```yaml
plugins:
  - hexo-broken-link-checker
```

_Not necessary for Hexo 3._

## Configuration

Open `_config.yml` and add the following lines:

```yaml
# Hexo Broken Link Checker configuration
link_checker:
  enabled: true
  storage_dir: temp/link_checker
  silent_logs: false
```

### Options:
- `enabled: (boolean)` - Enables or disables link inspection.
- `storage_dir: (string)` - Directory where plugin stores its files.
- `silent_logs: (boolean)` - If `true`, logs are saved to a file instead of console output.

## First Run

After configuration, create the necessary files with:

```sh
hexo link_checker setup
```

You'll see output like this:

```
(i) Creating working directory: /Users/username/blog/temp/link_checker/
(i) Generating storage file: data.json
(i) Applying write permissions to storage file.
(i) Generating log file: /Users/username/blog/temp/link_checker/log.json
(i) Done.
```

If run multiple times, a warning message will appear.

**Pro Tip:** `link_checker` has an alias `lc`, so `hexo link_checker [args]` and `hexo lc [args]` are the same.

## Usage

### Extracting Links

Ensure the plugin is enabled:

```yaml
# _config.yml
link_checker:
  enabled: true
```

The plugin will automatically analyze posts every time you run:

```sh
hexo generate
```

Currently, `hexo-broken-link-checker` detects:
- `<a>` tags (hyperlinks)
- `<img>` tags (images)
- YouTube embedded videos

### Scanning Links

After generating the site, run:

```sh
hexo lc scan
```

This command checks all stored links by making HTTP requests and saves the results.

#### Example cron job for automatic scans

```sh
# Every day at 10 PM, scan and save errors to linkchecker_errors.log
0 22 * * * cd /home/user/MyBlog/ && hexo lc scan 2> linkchecker_errors.log
```

### Checking Scan Results

```sh
hexo lc show-links [options]
```

Options:
- `--filter=[all|broken|ok|redirects|unverified]` → Filter links by status.
- `--id=[linkID]` → Show detailed link info.

### Checking Log Files

```sh
hexo lc show-logs
```

If `silent_logs: true` in `_config.yml`, logs are saved instead of displayed in console.
