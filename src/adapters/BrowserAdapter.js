const FsUtils = require('../utils/fsUtils');
const DomainUtils = require('../utils/domainUtils');

class BrowserAdapter {
  constructor(browserId, browserPath, profilePath) {
    this.browserId = browserId;
    this.browserPath = browserPath;
    this.profilePath = profilePath;
  }

  async getDataTypes() {
    return [
      'history',
      'cookies',
      'cache',
      'localStorage',
      'indexedDB',
      'downloads',
      'autofill',
      'siteSettings',
    ];
  }

  async getDomainsInHistory(protectedDomains = []) {
    return [];
  }

  async getDomainsInCookies(protectedDomains = []) {
    return [];
  }

  async clearHistory(protectedDomains = []) {
    return { success: false, message: 'Not implemented' };
  }

  async clearCookies(protectedDomains = []) {
    return { success: false, message: 'Not implemented' };
  }

  async clearCache(protectedDomains = []) {
    return { success: false, message: 'Not implemented' };
  }

  async clearLocalStorage(protectedDomains = []) {
    return { success: false, message: 'Not implemented' };
  }

  async clearIndexedDB(protectedDomains = []) {
    return { success: false, message: 'Not implemented' };
  }

  async clearDownloads(protectedDomains = []) {
    return { success: false, message: 'Not implemented' };
  }

  async clearAutofill(protectedDomains = []) {
    return { success: false, message: 'Not implemented' };
  }

  async clearSiteSettings(protectedDomains = []) {
    return { success: false, message: 'Not implemented' };
  }

  async clearAll(dataTypes = [], protectedDomains = []) {
    const results = [];

    for (const dataType of dataTypes) {
      const method = `clear${dataType.charAt(0).toUpperCase() + dataType.slice(1)}`;
      if (typeof this[method] === 'function') {
        try {
          const result = await this[method](protectedDomains);
          results.push({ dataType, ...result });
        } catch (error) {
          results.push({ dataType, success: false, message: error.message });
        }
      }
    }

    return results;
  }

  async backup(dataTypes = []) {
    return { success: false, message: 'Not implemented' };
  }

  isProtected(domain, protectedDomains) {
    return DomainUtils.isProtected(domain, protectedDomains);
  }

  filterProtectedDomains(domains, protectedDomains) {
    return DomainUtils.filterProtectedDomains(domains, protectedDomains);
  }
}

module.exports = BrowserAdapter;
