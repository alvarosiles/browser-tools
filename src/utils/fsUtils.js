const fs = require('fs');
const path = require('path');

class FsUtils {
  static exists(filePath) {
    try {
      fs.accessSync(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  static isDirectory(filePath) {
    try {
      return fs.statSync(filePath).isDirectory();
    } catch {
      return false;
    }
  }

  static isFile(filePath) {
    try {
      return fs.statSync(filePath).isFile();
    } catch {
      return false;
    }
  }

  static readDir(dirPath) {
    try {
      return fs.readdirSync(dirPath);
    } catch {
      return [];
    }
  }

  static readFile(filePath, encoding = 'utf8') {
    try {
      return fs.readFileSync(filePath, encoding);
    } catch {
      return null;
    }
  }

  static readJSON(filePath) {
    const content = this.readFile(filePath);
    if (!content) return null;
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  static writeFile(filePath, content) {
    try {
      const dir = path.dirname(filePath);
      if (!this.exists(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    } catch {
      return false;
    }
  }

  static writeJSON(filePath, data) {
    return this.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  static copyFile(source, dest) {
    try {
      const dir = path.dirname(dest);
      if (!this.exists(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.copyFileSync(source, dest);
      return true;
    } catch {
      return false;
    }
  }

  static deleteFile(filePath) {
    try {
      if (this.exists(filePath)) {
        fs.unlinkSync(filePath);
      }
      return true;
    } catch {
      return false;
    }
  }

  static deleteDir(dirPath) {
    try {
      if (this.exists(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
      }
      return true;
    } catch {
      return false;
    }
  }

  static copyDir(source, dest) {
    try {
      if (!this.exists(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      const files = fs.readdirSync(source);
      for (const file of files) {
        const srcPath = path.join(source, file);
        const destPath = path.join(dest, file);
        if (this.isDirectory(srcPath)) {
          this.copyDir(srcPath, destPath);
        } else {
          this.copyFile(srcPath, destPath);
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  static getSize(filePath) {
    try {
      return fs.statSync(filePath).size;
    } catch {
      return 0;
    }
  }
}

module.exports = FsUtils;
