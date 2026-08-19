const fs = require('fs');
const path = require('path');
const os = require('os');

function exists(p) {
  try { return fs.existsSync(p); } catch(e) { return false; }
}

function detectBrowsers() {
  const platform = os.platform();
  const home = os.homedir();
  const list = [];

  // Chrome
  let chromePath;
  if (platform === 'win32') chromePath = path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'User Data');
  else if (platform === 'darwin') chromePath = path.join('/Applications', 'Google Chrome.app');
  else chromePath = path.join(home, '.config', 'google-chrome');
  list.push({ name: 'Google Chrome', installed: exists(chromePath) });

  // Edge
  let edgePath;
  if (platform === 'win32') edgePath = path.join(process.env.PROGRAMFILES || '', 'Microsoft', 'Edge');
  else if (platform === 'darwin') edgePath = path.join('/Applications', 'Microsoft Edge.app');
  else edgePath = path.join(home, '.config', 'microsoft-edge');
  list.push({ name: 'Microsoft Edge', installed: exists(edgePath) });

  // Firefox
  let ffPath;
  if (platform === 'win32') ffPath = path.join(process.env.APPDATA || '', 'Mozilla', 'Firefox');
  else if (platform === 'darwin') ffPath = path.join(home, 'Library', 'Application Support', 'Firefox');
  else ffPath = path.join(home, '.mozilla', 'firefox');
  list.push({ name: 'Mozilla Firefox', installed: exists(ffPath) });

  // Brave
  let bravePath;
  if (platform === 'win32') bravePath = path.join(process.env.LOCALAPPDATA || '', 'BraveSoftware', 'Brave-Browser');
  else if (platform === 'darwin') bravePath = path.join('/Applications', 'Brave Browser.app');
  else bravePath = path.join(home, '.config', 'BraveSoftware', 'Brave-Browser');
  list.push({ name: 'Brave', installed: exists(bravePath) });

  // Opera
  let operaPath = platform === 'win32' ? path.join(process.env.APPDATA || '', 'Opera Software') : path.join(home, '.config', 'opera');
  list.push({ name: 'Opera', installed: exists(operaPath) });

  // GNOME Web (epiphany)
  list.push({ name: 'GNOME Web', installed: exists('/usr/bin/epiphany') });

  // Chromium
  let chromiumPath = platform === 'win32' ? path.join(process.env.PROGRAMFILES || '', 'Chromium') : path.join(home, '.config', 'chromium');
  list.push({ name: 'Chromium', installed: exists(chromiumPath) });

  // Vivaldi
  list.push({ name: 'Vivaldi', installed: exists(path.join(home, '.config', 'vivaldi')) });

  // LibreWolf
  list.push({ name: 'LibreWolf', installed: exists(path.join(home, '.librewolf')) });

  // Zen Browser (generic check)
  list.push({ name: 'Zen Browser', installed: exists(path.join(home, '.config', 'zen-browser')) });

  return list;
}

module.exports = { detectBrowsers };
