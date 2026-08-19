const BrowserDetector = require('./BrowserDetector');
const ChromiumAdapter = require('../adapters/ChromiumAdapter');
const FirefoxAdapter = require('../adapters/FirefoxAdapter');
const FsUtils = require('../utils/fsUtils');

class BrowserManager {
  constructor() {
    this.detector = new BrowserDetector();
    this.adapters = {};
  }

  detect() {
    return this.detector.detect();
  }

  getAdapter(browserId, profilePath) {
    if (browserId.toLowerCase().includes('firefox') || browserId.toLowerCase().includes('librewolf') || browserId.toLowerCase().includes('zen')) {
      return new FirefoxAdapter(browserId, '', profilePath);
    }

    return new ChromiumAdapter(browserId, '', profilePath);
  }

  async clearData(browserId, profilePath, dataTypes = [], protectedDomains = []) {
    const adapter = this.getAdapter(browserId, profilePath);
    const results = [];

    for (const dataType of dataTypes) {
      const methodName = `clear${dataType.charAt(0).toUpperCase() + dataType.slice(1)}`;
      if (typeof adapter[methodName] === 'function') {
        try {
          const result = await adapter[methodName](protectedDomains);
          results.push({
            dataType,
            ...result,
          });
        } catch (error) {
          results.push({
            dataType,
            success: false,
            message: error.message,
          });
        }
      }
    }

    return results;
  }

  async backup(browserId, profilePath, dataTypes = []) {
    const adapter = this.getAdapter(browserId, profilePath);
    try {
      return await adapter.backup(dataTypes);
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  isBrowserRunning(browserId) {
    return this.detector.isBrowserRunning(browserId);
  }
}

module.exports = BrowserManager;
