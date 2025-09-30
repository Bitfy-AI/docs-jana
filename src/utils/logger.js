/**
 * Logger utility - Centralized logging with different levels
 */

class Logger {
  constructor(options = {}) {
    this.enableTimestamp = options.enableTimestamp ?? true;
    this.logLevel = options.logLevel || 'info'; // debug, info, warn, error
  }

  _getTimestamp() {
    if (!this.enableTimestamp) return '';
    return `[${new Date().toISOString()}] `;
  }

  _shouldLog(level) {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level] >= levels[this.logLevel];
  }

  debug(message, ...args) {
    if (this._shouldLog('debug')) {
      console.log(`${this._getTimestamp()}🔍 ${message}`, ...args);
    }
  }

  info(message, ...args) {
    if (this._shouldLog('info')) {
      console.log(`${this._getTimestamp()}ℹ️  ${message}`, ...args);
    }
  }

  success(message, ...args) {
    if (this._shouldLog('info')) {
      console.log(`${this._getTimestamp()}✅ ${message}`, ...args);
    }
  }

  warn(message, ...args) {
    if (this._shouldLog('warn')) {
      console.warn(`${this._getTimestamp()}⚠️  ${message}`, ...args);
    }
  }

  error(message, ...args) {
    if (this._shouldLog('error')) {
      console.error(`${this._getTimestamp()}❌ ${message}`, ...args);
    }
  }

  header(message) {
    if (this._shouldLog('info')) {
      console.log('\n' + '='.repeat(50));
      console.log(`${message}`);
      console.log('='.repeat(50));
    }
  }

  progress(current, total, message) {
    if (this._shouldLog('info')) {
      console.log(`${this._getTimestamp()}📥 [${current}/${total}] ${message}`);
    }
  }

  section(message) {
    if (this._shouldLog('info')) {
      console.log(`\n${this._getTimestamp()}📍 ${message}`);
    }
  }

  tag(tagName) {
    if (this._shouldLog('info')) {
      console.log(`${this._getTimestamp()}🏷️  Tag: ${tagName}`);
    }
  }

  folder(path) {
    if (this._shouldLog('info')) {
      console.log(`${this._getTimestamp()}📁 Pasta criada: ${path}`);
    }
  }

  summary(data) {
    if (this._shouldLog('info')) {
      this.header('📊 RESUMO DO BACKUP');
      Object.entries(data).forEach(([key, value]) => {
        console.log(`${key}: ${value}`);
      });
      console.log('='.repeat(50) + '\n');
    }
  }
}

module.exports = Logger;