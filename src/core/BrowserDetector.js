const fs = require('fs');
const path = require('path');
const PathResolver = require('../utils/pathResolver');
const FsUtils = require('../utils/fsUtils');

class BrowserDetector {
  constructor() {
    this.browsers = [
      {
        id: 'chrome',
        name: 'Google Chrome',
        icon: 'chrome',
      },
      {
        id: 'edge',
        name: 'Microsoft Edge',
        icon: 'edge',
      },
      {
        id: 'firefox',
        name: 'Mozilla Firefox',
        icon: 'firefox',
      },
      {
        id: 'brave',
        name: 'Brave',
        icon: 'brave',
      },
      {
        id: 'opera',
        name: 'Opera',
        icon: 'opera',
      },
      {
        id: 'vivaldi',
        name: 'Vivaldi',
        icon: 'vivaldi',
      },
      {
        id: 'librewolf',
        name: 'LibreWolf',
        icon: 'librewolf',
      },
      {
        id: 'zen',
        name: 'Zen Browser',
        icon: 'zen',
      },
      {
        id: 'gnomeweb',
        name: 'GNOME Web',
        icon: 'gnomeweb',
      },
    ];
  }

  detect() {
    return this.browsers.map(browser => {
      const browserPath = PathResolver.resolveBrowserPath(browser.id);
      const installed = browserPath && FsUtils.exists(browserPath);

      return {
        ...browser,
        installed,
        path: installed ? browserPath : null,
        profiles: installed ? this.getProfiles(browser.id, browserPath) : [],
      };
    });
  }

  getProfiles(browserId, browserPath) {
    const profiles = [];

    if (browserId === 'firefox' || browserId === 'librewolf') {
      const profilesPath = browserPath;
      if (FsUtils.isDirectory(profilesPath)) {
        const dirs = FsUtils.readDir(profilesPath);
        for (const dir of dirs) {
          const fullPath = path.join(profilesPath, dir);
          if (FsUtils.isDirectory(fullPath) && dir.includes('.')) {
            profiles.push({
              name: dir,
              path: fullPath,
            });
          }
        }
      }
    } else if (browserId === 'gnomeweb') {
      const profilesPath = browserPath;
      if (FsUtils.isDirectory(profilesPath)) {
        profiles.push({
          name: 'Default',
          path: profilesPath,
        });
      }
    } else {
      const defaultPath = path.join(browserPath, 'Default');
      if (FsUtils.exists(defaultPath)) {
        profiles.push({
          name: 'Default',
          path: defaultPath,
        });
      }

      const localStatePath = path.join(browserPath, 'Local State');
      if (FsUtils.exists(localStatePath)) {
        const localState = FsUtils.readJSON(localStatePath);
        if (localState?.profile?.info_cache) {
          for (const [profileName, profileInfo] of Object.entries(localState.profile.info_cache)) {
            if (profileName !== 'Default') {
              const profilePath = path.join(browserPath, profileName);
              if (FsUtils.exists(profilePath)) {
                profiles.push({
                  name: profileName,
                  path: profilePath,
                });
              }
            }
          }
        }
      }
    }

    return profiles.length > 0 ? profiles : [{ name: 'Default', path: browserPath }];
  }

  isBrowserRunning(browserId) {
    const platform = process.platform;

    if (platform === 'win32') {
      const { execSync } = require('child_process');
      try {
        const browserProcessNames = {
          chrome: 'chrome.exe',
          edge: 'msedge.exe',
          firefox: 'firefox.exe',
          brave: 'brave.exe',
          opera: 'opera.exe',
          vivaldi: 'vivaldi.exe',
          librewolf: 'librewolf.exe',
          zen: 'zen.exe',
          gnomeweb: 'epiphany',
        };

        const processName = browserProcessNames[browserId];
        if (!processName) return false;

        const result = execSync(`tasklist`, { encoding: 'utf8' });
        return result.includes(processName);
      } catch {
        return false;
      }
    } else if (platform === 'linux') {
      const { execSync } = require('child_process');
      try {
        const browserProcessNames = {
          chrome: 'chrome',
          edge: 'microsoft-edge',
          firefox: 'firefox',
          brave: 'brave',
          opera: 'opera',
          vivaldi: 'vivaldi',
          librewolf: 'librewolf',
          zen: 'zen',
          gnomeweb: 'epiphany',
        };

        const processName = browserProcessNames[browserId];
        if (!processName) return false;

        const result = execSync(`pgrep -l ${processName}`, { encoding: 'utf8' });
        return result.length > 0;
      } catch {
        return false;
      }
    } else if (platform === 'darwin') {
      const { execSync } = require('child_process');
      try {
        const browserBundleNames = {
          chrome: 'Google Chrome',
          edge: 'Microsoft Edge',
          firefox: 'Firefox',
          brave: 'Brave Browser',
          opera: 'Opera',
          vivaldi: 'Vivaldi',
          librewolf: 'LibreWolf',
          zen: 'Zen',
          gnomeweb: 'GNOME Web',
        };

        const bundleName = browserBundleNames[browserId];
        if (!bundleName) return false;

        const result = execSync(`pgrep -f "${bundleName}"`, { encoding: 'utf8' });
        return result.length > 0;
      } catch {
        return false;
      }
    }

    return false;
  }
}

module.exports = BrowserDetector;
