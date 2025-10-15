/**
 * HttpClientFactory - Factory for creating HttpClient instances
 *
 * @module src/core/factories/http-client-factory
 * @description Factory implementation for creating HttpClient instances with
 * proper dependency injection and configuration management.
 *
 * @example
 * const factory = HttpClientFactory.create({
 *   baseUrl: 'https://api.example.com',
 *   timeout: 30000
 * });
 */

const { HttpClient, N8NHttpClient } = require('../http');
const ConfigManager = require('../../utils/config-manager');

/**
 * @typedef {Object} HttpClientFactoryConfig
 * @property {string} [baseUrl] - Base URL for HTTP requests
 * @property {number} [timeout] - Request timeout in ms
 * @property {number} [maxRetries] - Maximum retry attempts
 * @property {number} [retryDelay] - Delay between retries in ms
 * @property {number} [maxRequestsPerSecond] - Rate limit
 * @property {Object} [headers] - Default headers
 * @property {Object} [logger] - Logger instance
 * @property {string} [type='generic'] - Client type: 'generic' | 'n8n'
 */

/**
 * HttpClientFactory - Creates HttpClient instances with configuration
 *
 * @class
 */
class HttpClientFactory {
  /**
   * Create an HttpClient instance
   *
   * @param {HttpClientFactoryConfig} config - Client configuration
   * @returns {HttpClient|N8NHttpClient} Configured client instance
   * @throws {Error} If configuration is invalid
   *
   * @example
   * // Generic HTTP client
   * const client = HttpClientFactory.create({
   *   baseUrl: 'https://api.example.com',
   *   timeout: 30000
   * });
   *
   * @example
   * // N8N-specific client
   * const n8nClient = HttpClientFactory.create({
   *   type: 'n8n',
   *   baseUrl: 'https://n8n.example.com',
   *   apiKey: 'your-api-key'
   * });
   *
   * @example
   * // Using ConfigManager for defaults
   * const client = HttpClientFactory.createFromConfig();
   */
  static create(config = {}) {
    // Merge with ConfigManager defaults if available
    const finalConfig = HttpClientFactory._mergeWithConfigManager(config);

    // Validate required fields
    HttpClientFactory._validateConfig(finalConfig);

    // Create appropriate client type
    const clientType = config.type || 'generic';

    if (clientType === 'n8n') {
      return HttpClientFactory._createN8NClient(finalConfig);
    }

    return HttpClientFactory._createGenericClient(finalConfig);
  }

  /**
   * Create HttpClient from ConfigManager defaults
   *
   * @param {string} [configKey='http'] - Config key to use
   * @returns {HttpClient} Configured client instance
   *
   * @example
   * const client = HttpClientFactory.createFromConfig();
   */
  static createFromConfig(configKey = 'http') {
    const configManager = new ConfigManager();
    const httpConfig = configManager.get(configKey, {});

    return HttpClientFactory.create(httpConfig);
  }

  /**
   * Create N8N client from config
   *
   * @param {string} type - 'source' or 'target'
   * @returns {N8NHttpClient} Configured N8N client
   *
   * @example
   * const sourceClient = HttpClientFactory.createN8NClient('source');
   * const targetClient = HttpClientFactory.createN8NClient('target');
   */
  static createN8NClient(type) {
    if (!['source', 'target'].includes(type)) {
      throw new Error(`Invalid N8N client type: ${type}. Must be 'source' or 'target'`);
    }

    const configManager = new ConfigManager();
    const n8nConfig = configManager.get(`n8n.${type}`);
    const httpConfig = configManager.get('http', {});

    if (!n8nConfig) {
      throw new Error(`N8N ${type} configuration not found`);
    }

    // Validate N8N config
    configManager.validateN8N(type);

    return N8NHttpClient.create({
      baseUrl: n8nConfig.url,
      apiKey: n8nConfig.apiKey,
      timeout: httpConfig.timeout,
      maxRetries: httpConfig.maxRetries,
      maxRequestsPerSecond: httpConfig.maxRequestsPerSecond || 10
    });
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
      const httpDefaults = configManager.get('http', {});

      return {
        timeout: httpDefaults.timeout,
        maxRetries: httpDefaults.maxRetries,
        retryDelay: httpDefaults.retryDelay,
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
    if (!config.baseUrl) {
      throw new Error('HttpClientFactory: baseUrl is required');
    }

    if (config.timeout && (typeof config.timeout !== 'number' || config.timeout <= 0)) {
      throw new Error('HttpClientFactory: timeout must be a positive number');
    }

    if (config.maxRetries && (typeof config.maxRetries !== 'number' || config.maxRetries < 0)) {
      throw new Error('HttpClientFactory: maxRetries must be a non-negative number');
    }
  }

  /**
   * Create generic HttpClient
   *
   * @private
   * @param {Object} config - Client config
   * @returns {HttpClient} Client instance
   */
  static _createGenericClient(config) {
    return HttpClient.create(config);
  }

  /**
   * Create N8N-specific HttpClient
   *
   * @private
   * @param {Object} config - Client config
   * @returns {N8NHttpClient} N8N client instance
   */
  static _createN8NClient(config) {
    if (!config.apiKey) {
      throw new Error('HttpClientFactory: apiKey is required for N8N client');
    }

    return N8NHttpClient.create(config);
  }
}

module.exports = HttpClientFactory;
