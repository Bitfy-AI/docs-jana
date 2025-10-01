/**
 * Logger utility - Centralized logging with different levels
 * Supports progress tracking and sensitive data masking
 */

class Logger {
  constructor(options = {}) {
    this.enableTimestamp = options.enableTimestamp ?? true;
    this.logLevel = options.logLevel || 'info'; // debug, info, warn, error
    this._progressBar = null;
    this.cliProgress = null;

    // Try to load cli-progress if available
    try {
      this.cliProgress = require('cli-progress');
    } catch (e) {
      // cli-progress not available, will use fallback
      this.cliProgress = null;
    }

    // Sensitive data patterns to mask
    this.sensitivePatterns = [
      { pattern: /Bearer\s+\S+/gi, replacement: 'Bearer ***REDACTED***' },
      { pattern: /password[:\s=]+\S+/gi, replacement: 'password: ***REDACTED***' },
      { pattern: /apiKey[:\s=]+\S+/gi, replacement: 'apiKey: ***REDACTED***' },
      { pattern: /token[:\s=]+\S+/gi, replacement: 'token: ***REDACTED***' },
      { pattern: /authorization[:\s=]+\S+/gi, replacement: 'authorization: ***REDACTED***' },
      { pattern: /"api[_-]?key"\s*:\s*"[^"]+"/gi, replacement: '"api_key": "***REDACTED***"' },
      { pattern: /"token"\s*:\s*"[^"]+"/gi, replacement: '"token": "***REDACTED***"' },
      { pattern: /"password"\s*:\s*"[^"]+"/gi, replacement: '"password": "***REDACTED***"' }
    ];
  }

  _getTimestamp() {
    if (!this.enableTimestamp) return '';
    return `[${new Date().toISOString()}] `;
  }

  _shouldLog(level) {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level] >= levels[this.logLevel];
  }

  /**
   * Masks sensitive data in messages (supports strings and objects)
   * Auto-detects and redacts patterns like "Bearer xxx", "password: xxx", etc.
   * FIX: Implements deep object traversal to mask sensitive data in nested objects
   * @param {string|object} message - Message to mask (string or object)
   * @returns {string} - Masked message as string
   */
  maskSensitive(message) {
    // FIX: Handle objects by deep cloning and traversing to mask sensitive keys
    if (typeof message === 'object' && message !== null) {
      try {
        // Deep clone to avoid mutating original object
        const cloned = JSON.parse(JSON.stringify(message));
        this._maskObjectDeep(cloned);
        message = JSON.stringify(cloned, null, 2);
      } catch (e) {
        message = String(message);
      }
    } else if (typeof message !== 'string') {
      // Try to stringify non-object, non-string values
      try {
        message = JSON.stringify(message, null, 2);
      } catch (e) {
        message = String(message);
      }
    }

    // Apply pattern-based masking to the string representation
    let maskedMessage = message;
    for (const { pattern, replacement } of this.sensitivePatterns) {
      maskedMessage = maskedMessage.replace(pattern, replacement);
    }

    return maskedMessage;
  }

  /**
   * Recursively masks sensitive keys in objects
   * @private
   * @param {object} obj - Object to mask (mutated in place)
   */
  _maskObjectDeep(obj) {
    // Sensitive keys to mask (case-insensitive)
    const sensitiveKeys = ['password', 'token', 'apikey', 'api_key', 'authorization', 'bearer', 'secret'];

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const lowerKey = key.toLowerCase();

        // Check if this key is sensitive
        if (sensitiveKeys.some(sensitiveKey => lowerKey.includes(sensitiveKey))) {
          // Mask the value
          obj[key] = '***REDACTED***';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          // Recursively traverse nested objects and arrays
          this._maskObjectDeep(obj[key]);
        }
      }
    }
  }

  debug(message, ...args) {
    if (this._shouldLog('debug')) {
      const maskedMessage = this.maskSensitive(message);
      const maskedArgs = args.map(arg =>
        typeof arg === 'string' ? this.maskSensitive(arg) : arg
      );
      console.log(`${this._getTimestamp()}🔍 ${maskedMessage}`, ...maskedArgs);
    }
  }

  info(message, ...args) {
    if (this._shouldLog('info')) {
      const maskedMessage = this.maskSensitive(message);
      const maskedArgs = args.map(arg =>
        typeof arg === 'string' ? this.maskSensitive(arg) : arg
      );
      console.log(`${this._getTimestamp()}ℹ️  ${maskedMessage}`, ...maskedArgs);
    }
  }

  success(message, ...args) {
    if (this._shouldLog('info')) {
      const maskedMessage = this.maskSensitive(message);
      const maskedArgs = args.map(arg =>
        typeof arg === 'string' ? this.maskSensitive(arg) : arg
      );
      console.log(`${this._getTimestamp()}✅ ${maskedMessage}`, ...maskedArgs);
    }
  }

  warn(message, ...args) {
    if (this._shouldLog('warn')) {
      const maskedMessage = this.maskSensitive(message);
      const maskedArgs = args.map(arg =>
        typeof arg === 'string' ? this.maskSensitive(arg) : arg
      );
      console.warn(`${this._getTimestamp()}⚠️  ${maskedMessage}`, ...maskedArgs);
    }
  }

  error(message, ...args) {
    if (this._shouldLog('error')) {
      const maskedMessage = this.maskSensitive(message);
      const maskedArgs = args.map(arg =>
        typeof arg === 'string' ? this.maskSensitive(arg) : arg
      );
      console.error(`${this._getTimestamp()}❌ ${maskedMessage}`, ...maskedArgs);
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

  /**
   * Creates and starts a progress bar
   * @param {number} total - Total number of items
   * @param {string} format - Progress bar format (optional)
   * @returns {Object} - Progress bar instance or null
   */
  progressBar(total, format = null) {
    if (!this._shouldLog('info')) {
      return null;
    }

    // Default format string with ETA, rate, and percentage
    const defaultFormat = format ||
      '{bar} {percentage}% | ETA: {eta}s | {value}/{total} | Rate: {rate}/s';

    if (this.cliProgress) {
      // Use cli-progress if available
      this._progressBar = new this.cliProgress.SingleBar({
        format: defaultFormat,
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true
      });
      this._progressBar.start(total, 0);
      return this._progressBar;
    } else {
      // Fallback: create a simple progress tracker
      const self = this;
      this._progressBar = {
        total: total,
        current: 0,
        startTime: Date.now(),
        update: function(current, metadata = {}) {
          this.current = current;
          const percentage = ((current / total) * 100).toFixed(1);
          const elapsed = (Date.now() - this.startTime) / 1000;
          const rate = elapsed > 0 ? (current / elapsed) : 0;
          const eta = (total > current && rate > 0) ? ((total - current) / rate).toFixed(1) : 0;

          const metadataStr = Object.keys(metadata).length > 0
            ? ` | ${Object.entries(metadata).map(([k, v]) => `${k}: ${v}`).join(', ')}`
            : '';

          const progressMsg = `Progress: ${current}/${total} (${percentage}%) | ` +
            `ETA: ${eta}s | Rate: ${rate.toFixed(2)}/s${metadataStr}`;

          console.log(progressMsg);
        },
        stop: () => {
          self._progressBar = null;
        }
      };
      return this._progressBar;
    }
  }

  /**
   * Updates the progress bar
   * @param {number} current - Current progress value
   * @param {Object} metadata - Additional metadata to display (optional)
   */
  updateProgress(current, metadata = {}) {
    if (!this._progressBar) {
      return;
    }

    if (this.cliProgress && this._progressBar.update) {
      // cli-progress progress bar
      this._progressBar.update(current, metadata);
    } else if (this._progressBar.update) {
      // Fallback progress tracker
      this._progressBar.update(current, metadata);
    }
  }

  /**
   * Completes and stops the progress bar
   */
  completeProgress() {
    if (!this._progressBar) {
      return;
    }

    if (this._progressBar.stop) {
      this._progressBar.stop();
    }

    this._progressBar = null;
  }
}

module.exports = Logger;