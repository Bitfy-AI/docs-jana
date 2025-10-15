/**
 * LoggerFactory - Factory for creating Logger instances
 *
 * @module src/core/factories/logger-factory
 * @description Factory implementation for creating Logger instances with
 * proper dependency injection and configuration management.
 *
 * @example
 * const logger = LoggerFactory.create({
 *   level: 'debug',
 *   output: 'console'
 * });
 */

const ConfigManager = require('../../utils/config-manager');

/**
 * Log levels enum
 * @enum {string}
 */
const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
};

/**
 * @typedef {Object} LoggerFactoryConfig
 * @property {string} [level='info'] - Minimum log level
 * @property {string} [output='console'] - Output destination: 'console' | 'file' | 'both'
 * @property {string} [filePath] - Log file path (required if output includes 'file')
 * @property {boolean} [colorize=true] - Colorize console output
 * @property {boolean} [includeTimestamp=true] - Include timestamp in logs
 * @property {string} [context] - Context/category for logs
 */

/**
 * Simple Logger implementation
 * TODO: This will be replaced with the unified Logger from FASE 4
 *
 * @class
 */
class SimpleLogger {
  /**
   * Create a logger instance
   *
   * @param {LoggerFactoryConfig} config - Logger configuration
   */
  constructor(config = {}) {
    this.config = {
      level: config.level || 'info',
      output: config.output || 'console',
      filePath: config.filePath,
      colorize: config.colorize !== false,
      includeTimestamp: config.includeTimestamp !== false,
      context: config.context
    };

    // Level priority for filtering
    this.levelPriority = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };

    this.minLevel = this.levelPriority[this.config.level] || 1;
  }

  /**
   * Check if level should be logged
   *
   * @private
   * @param {string} level - Log level
   * @returns {boolean} True if should log
   */
  _shouldLog(level) {
    const levelPriority = this.levelPriority[level] || 0;
    return levelPriority >= this.minLevel;
  }

  /**
   * Format log message
   *
   * @private
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {any} [data] - Additional data
   * @returns {string} Formatted message
   */
  _format(level, message, data) {
    const parts = [];

    if (this.config.includeTimestamp) {
      parts.push(`[${new Date().toISOString()}]`);
    }

    parts.push(`[${level.toUpperCase()}]`);

    if (this.config.context) {
      parts.push(`[${this.config.context}]`);
    }

    parts.push(message);

    if (data !== undefined) {
      parts.push(typeof data === 'object' ? JSON.stringify(data) : data);
    }

    return parts.join(' ');
  }

  /**
   * Log debug message
   *
   * @param {string} message - Message to log
   * @param {any} [data] - Additional data
   */
  debug(message, data) {
    if (!this._shouldLog('debug')) return;
    const formatted = this._format('debug', message, data);
    console.log(formatted);
  }

  /**
   * Log info message
   *
   * @param {string} message - Message to log
   * @param {any} [data] - Additional data
   */
  info(message, data) {
    if (!this._shouldLog('info')) return;
    const formatted = this._format('info', message, data);
    console.log(formatted);
  }

  /**
   * Log warning message
   *
   * @param {string} message - Message to log
   * @param {any} [data] - Additional data
   */
  warn(message, data) {
    if (!this._shouldLog('warn')) return;
    const formatted = this._format('warn', message, data);
    console.warn(formatted);
  }

  /**
   * Log error message
   *
   * @param {string} message - Message to log
   * @param {Error|any} [error] - Error object or additional data
   */
  error(message, error) {
    if (!this._shouldLog('error')) return;
    const formatted = this._format('error', message);
    console.error(formatted);

    if (error instanceof Error) {
      console.error(error.stack || error.message);
    } else if (error) {
      console.error(error);
    }
  }

  /**
   * Create child logger with inherited config
   *
   * @param {string} context - Context for child logger
   * @returns {SimpleLogger} Child logger instance
   */
  child(context) {
    return new SimpleLogger({
      ...this.config,
      context
    });
  }

  /**
   * Set log level
   *
   * @param {string} level - New log level
   */
  setLevel(level) {
    if (!(level in this.levelPriority)) {
      throw new Error(`Invalid log level: ${level}`);
    }
    this.config.level = level;
    this.minLevel = this.levelPriority[level];
  }
}

/**
 * LoggerFactory - Creates Logger instances with configuration
 *
 * @class
 */
class LoggerFactory {
  /**
   * Create a Logger instance
   *
   * @param {LoggerFactoryConfig} config - Logger configuration
   * @returns {SimpleLogger} Configured logger instance
   *
   * @example
   * // Basic logger
   * const logger = LoggerFactory.create({
   *   level: 'debug',
   *   output: 'console'
   * });
   *
   * @example
   * // Logger with context
   * const httpLogger = LoggerFactory.create({
   *   level: 'info',
   *   context: 'HTTP'
   * });
   *
   * @example
   * // Using ConfigManager defaults
   * const logger = LoggerFactory.createFromConfig();
   */
  static create(config = {}) {
    // Merge with ConfigManager defaults if available
    const finalConfig = LoggerFactory._mergeWithConfigManager(config);

    // Validate configuration
    LoggerFactory._validateConfig(finalConfig);

    return new SimpleLogger(finalConfig);
  }

  /**
   * Create Logger from ConfigManager defaults
   *
   * @param {string} [configKey='logger'] - Config key to use
   * @returns {SimpleLogger} Configured logger instance
   *
   * @example
   * const logger = LoggerFactory.createFromConfig();
   */
  static createFromConfig(configKey = 'logger') {
    const configManager = new ConfigManager();
    const loggerConfig = configManager.get(configKey, {});

    return LoggerFactory.create(loggerConfig);
  }

  /**
   * Merge config with ConfigManager defaults
   *
   * @private
   * @param {Object} config - User config
   * @returns {Object} Merged config
   */
  static _mergeWithConfigManager(config) {
    try {
      const configManager = new ConfigManager();
      const loggerDefaults = configManager.get('logger', {});

      return {
        ...loggerDefaults,
        ...config
      };
    } catch (error) {
      // If ConfigManager fails, just use provided config
      return config;
    }
  }

  /**
   * Validate configuration
   *
   * @private
   * @param {Object} config - Config to validate
   * @throws {Error} If config is invalid
   */
  static _validateConfig(config) {
    const validLevels = ['debug', 'info', 'warn', 'error'];
    if (config.level && !validLevels.includes(config.level)) {
      throw new Error(`LoggerFactory: Invalid log level: ${config.level}. Must be one of: ${validLevels.join(', ')}`);
    }

    const validOutputs = ['console', 'file', 'both'];
    if (config.output && !validOutputs.includes(config.output)) {
      throw new Error(`LoggerFactory: Invalid output: ${config.output}. Must be one of: ${validOutputs.join(', ')}`);
    }

    if ((config.output === 'file' || config.output === 'both') && !config.filePath) {
      throw new Error('LoggerFactory: filePath is required when output includes file');
    }
  }
}

// Export both factory and LogLevel enum
module.exports = LoggerFactory;
module.exports.LogLevel = LogLevel;
module.exports.SimpleLogger = SimpleLogger;
