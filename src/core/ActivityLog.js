const FsUtils = require('../utils/fsUtils');
const path = require('path');
const os = require('os');

class ActivityLog {
  constructor() {
    this.logs = [];
    this.logPath = path.join(os.homedir(), '.browser-data-cleaner', 'activity.log');
  }

  log(message, level = 'info') {
    const timestamp = new Date().toLocaleTimeString('es-ES');
    const entry = `${timestamp}  ${message}`;
    this.logs.push({ message, level, timestamp });
    console.log(entry);
    this.persist();
  }

  info(message) {
    this.log(message, 'info');
  }

  warning(message) {
    this.log('⚠️  ' + message, 'warning');
  }

  success(message) {
    this.log('✓ ' + message, 'success');
  }

  error(message) {
    this.log('✗ ' + message, 'error');
  }

  getLogs() {
    return this.logs;
  }

  clear() {
    this.logs = [];
    this.persist();
  }

  persist() {
    const logContent = this.logs.map(l => `${l.timestamp} [${l.level.toUpperCase()}] ${l.message}`).join('\n');
    FsUtils.writeFile(this.logPath, logContent);
  }

  load() {
    const content = FsUtils.readFile(this.logPath);
    if (!content) return [];

    return content.split('\n').map(line => {
      const match = line.match(/(\d{2}:\d{2}:\d{2}) \[(\w+)\] (.*)/);
      if (match) {
        return {
          timestamp: match[1],
          level: match[2].toLowerCase(),
          message: match[3],
        };
      }
      return null;
    }).filter(Boolean);
  }
}

module.exports = ActivityLog;
