const path = require('path');
const os = require('os');

class PathResolver {
  static getHomeDir() {
    return os.homedir();
  }

  static getPlatform() {
    return process.platform;
  }

  static resolveBrowserPath(browserName) {
    const platform = this.getPlatform();
    const homeDir = this.getHomeDir();

    const pathMap = {
      win32: {
        'chrome': `${homeDir}\\AppData\\Roaming\\Google\\Chrome\\User Data`,
        'edge': `${homeDir}\\AppData\\Roaming\\Microsoft\\Edge\\User Data`,
        'firefox': `${homeDir}\\AppData\\Roaming\\Mozilla\\Firefox\\Profiles`,
        'brave': `${homeDir}\\AppData\\Roaming\\BraveSoftware\\Brave-Browser\\User Data`,
        'opera': `${homeDir}\\AppData\\Roaming\\Opera Software\\Opera Stable`,
        'vivaldi': `${homeDir}\\AppData\\Roaming\\Vivaldi\\User Data`,
        'librewolf': `${homeDir}\\AppData\\Roaming\\LibreWolf\\Profiles`,
      },
      linux: {
        'chrome': `${homeDir}/.config/google-chrome`,
        'edge': `${homeDir}/.config/microsoft-edge`,
        'firefox': `${homeDir}/.mozilla/firefox`,
        'brave': `${homeDir}/.config/BraveSoftware/Brave-Browser`,
        'opera': `${homeDir}/.config/opera`,
        'vivaldi': `${homeDir}/.config/vivaldi`,
        'gnomeweb': `${homeDir}/.local/share/evolution`,
        'librewolf': `${homeDir}/.librewolf`,
        'zen': `${homeDir}/.zen`,
      },
      darwin: {
        'chrome': `${homeDir}/Library/Application Support/Google/Chrome`,
        'edge': `${homeDir}/Library/Application Support/Microsoft Edge`,
        'firefox': `${homeDir}/Library/Application Support/Firefox/Profiles`,
        'brave': `${homeDir}/Library/Application Support/BraveSoftware/Brave-Browser`,
        'opera': `${homeDir}/Library/Application Support/Opera`,
        'vivaldi': `${homeDir}/Library/Application Support/Vivaldi`,
        'librewolf': `${homeDir}/Library/Application Support/LibreWolf`,
        'zen': `${homeDir}/Library/Application Support/Zen`,
      },
    };

    return pathMap[platform]?.[browserName.toLowerCase()] || null;
  }

  static getBackupDir() {
    const homeDir = this.getHomeDir();
    return path.join(homeDir, 'BrowserBackup');
  }

  static getBackupDirForBrowser(browserName) {
    const baseDir = this.getBackupDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('Z')[0];
    return path.join(baseDir, browserName, timestamp);
  }
}

module.exports = PathResolver;
