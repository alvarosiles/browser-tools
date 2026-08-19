const BrowserAdapter = require('./BrowserAdapter');
const sqlite3 = require('sqlite3');
const path = require('path');
const FsUtils = require('../utils/fsUtils');
const DomainUtils = require('../utils/domainUtils');

class ChromiumAdapter extends BrowserAdapter {
  async getDomainsInCookies() {
    try {
      const cookiePath = path.join(this.profilePath, 'Cookies');
      if (!FsUtils.exists(cookiePath)) return [];

      return new Promise((resolve) => {
        const domains = new Set();
        const db = new sqlite3.Database(cookiePath, sqlite3.OPEN_READONLY, (err) => {
          if (err) {
            resolve([]);
            return;
          }

          db.all(`SELECT DISTINCT host_key FROM cookies`, (err, rows) => {
            if (err) {
              resolve([]);
            } else {
              rows?.forEach(row => {
                if (row.host_key) {
                  const domain = row.host_key.replace(/^\./, '');
                  domains.add(domain);
                }
              });
              resolve(Array.from(domains));
            }
            db.close();
          });
        });
      });
    } catch {
      return [];
    }
  }

  async clearCookies(protectedDomains = []) {
    try {
      const cookiePath = path.join(this.profilePath, 'Cookies');
      if (!FsUtils.exists(cookiePath)) {
        return { success: true, message: 'No cookies found' };
      }

      const domains = await this.getDomainsInCookies();
      const unprotectedDomains = this.filterProtectedDomains(domains, protectedDomains);

      if (unprotectedDomains.length === 0) {
        return { success: true, message: 'All cookies are protected' };
      }

      return new Promise((resolve) => {
        const db = new sqlite3.Database(cookiePath, (err) => {
          if (err) {
            resolve({ success: false, message: err.message });
            return;
          }

          const placeholders = unprotectedDomains.map(() => '?').join(',');
          const query = `DELETE FROM cookies WHERE host_key IN (${placeholders}) OR host_key IN (${unprotectedDomains.map(d => `'.' || ?`).join(',')})`;

          const params = [...unprotectedDomains, ...unprotectedDomains];

          db.run(query, params, function(err) {
            if (err) {
              resolve({ success: false, message: err.message });
            } else {
              resolve({ success: true, message: `Deleted cookies from ${this.changes} entries` });
            }
            db.close();
          });
        });
      });
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async clearCache(protectedDomains = []) {
    try {
      const cachePath = path.join(this.profilePath, 'Cache', 'Cache_Data');
      if (!FsUtils.exists(cachePath)) {
        return { success: true, message: 'No cache found' };
      }

      FsUtils.deleteDir(cachePath);
      return { success: true, message: 'Cache cleared' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async backup(dataTypes = []) {
    const PathResolver = require('../utils/pathResolver');
    const backupPath = PathResolver.getBackupDirForBrowser(this.browserId);

    try {
      const itemsToCopy = {
        history: 'History',
        cookies: 'Cookies',
        bookmarks: 'Bookmarks',
        localStorage: 'Local Storage',
        prefs: 'Preferences',
      };

      for (const [dataType, fileName] of Object.entries(itemsToCopy)) {
        if (dataTypes.includes(dataType)) {
          const sourcePath = path.join(this.profilePath, fileName);
          if (FsUtils.exists(sourcePath)) {
            const destPath = path.join(backupPath, fileName);
            if (FsUtils.isDirectory(sourcePath)) {
              FsUtils.copyDir(sourcePath, destPath);
            } else {
              FsUtils.copyFile(sourcePath, destPath);
            }
          }
        }
      }

      const manifestPath = path.join(backupPath, 'manifest.json');
      FsUtils.writeJSON(manifestPath, {
        browser: this.browserId,
        timestamp: new Date().toISOString(),
        profile: path.basename(this.profilePath),
        dataTypes,
      });

      return { success: true, path: backupPath };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

module.exports = ChromiumAdapter;
