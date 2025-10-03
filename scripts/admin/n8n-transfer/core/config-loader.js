/**
 * @fileoverview ConfigLoader for N8N Transfer System
 *
 * This module provides configuration loading and validation for the N8N transfer system.
 * It loads environment variables from .env, validates them using Zod schemas, and tests
 * connectivity to SOURCE and TARGET N8N instances.
 *
 * @module n8n-transfer/core/config-loader
 * @author Jana Team
 * @version 1.0.0
 */

const { z } = require('zod');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

// =============================================================================
// ZOD VALIDATION SCHEMA
// =============================================================================

/**
 * Zod schema for N8N Transfer configuration
 *
 * Validates that all required environment variables are present and properly formatted.
 */
const ConfigSchema = z.object({
  SOURCE_N8N_URL: z.string()
    .url('SOURCE_N8N_URL must be a valid URL')
    .min(1, 'SOURCE_N8N_URL cannot be empty'),

  SOURCE_N8N_API_KEY: z.string()
    .min(1, 'SOURCE_N8N_API_KEY cannot be empty'),

  TARGET_N8N_URL: z.string()
    .url('TARGET_N8N_URL must be a valid URL')
    .min(1, 'TARGET_N8N_URL cannot be empty'),

  TARGET_N8N_API_KEY: z.string()
    .min(1, 'TARGET_N8N_API_KEY cannot be empty'),
}).strict();

// =============================================================================
// TYPESCRIPT/JSDOC TYPE DEFINITIONS
// =============================================================================

/**
 * N8N Transfer Configuration
 *
 * @typedef {Object} TransferConfig
 * @property {string} SOURCE_N8N_URL - Source N8N instance URL (e.g., 'https://source.n8n.io')
 * @property {string} SOURCE_N8N_API_KEY - Source N8N API key for authentication
 * @property {string} TARGET_N8N_URL - Target N8N instance URL (e.g., 'https://target.n8n.io')
 * @property {string} TARGET_N8N_API_KEY - Target N8N API key for authentication
 *
 * @example
 * const config = {
 *   SOURCE_N8N_URL: 'https://source.n8n.io',
 *   SOURCE_N8N_API_KEY: 'n8n_api_123abc...',
 *   TARGET_N8N_URL: 'https://target.n8n.io',
 *   TARGET_N8N_API_KEY: 'n8n_api_456def...'
 * };
 */

/**
 * Connectivity test result
 *
 * @typedef {Object} ConnectivityResult
 * @property {boolean} success - Whether connectivity test passed
 * @property {string} [error] - Error message if test failed
 * @property {number} [statusCode] - HTTP status code from health check
 * @property {number} [responseTime] - Response time in milliseconds
 */

// =============================================================================
// CONFIG LOADER CLASS
// =============================================================================

/**
 * ConfigLoader class
 *
 * Loads and validates N8N transfer configuration from .env file.
 * Provides methods to test connectivity to SOURCE and TARGET instances.
 *
 * @class
 *
 * @example
 * const loader = new ConfigLoader();
 * try {
 *   const config = loader.load();
 *   console.log('Configuration loaded successfully');
 *
 *   const sourceTest = await loader.testConnectivity('SOURCE');
 *   if (!sourceTest.success) {
 *     console.error('SOURCE connectivity failed:', sourceTest.error);
 *   }
 * } catch (error) {
 *   console.error('Configuration error:', error.message);
 * }
 */
class ConfigLoader {
  /**
   * Create a ConfigLoader instance
   *
   * @param {string} [envPath='.env'] - Path to .env file (relative to project root)
   */
  constructor(envPath = '.env') {
    this.envPath = path.resolve(process.cwd(), envPath);
    this.config = null;
  }

  /**
   * Load and validate configuration from .env file
   *
   * Reads the .env file, extracts N8N transfer variables, validates them using Zod schema,
   * and warns if SOURCE_N8N_URL equals TARGET_N8N_URL.
   *
   * @returns {TransferConfig} Validated configuration object
   * @throws {Error} If .env file doesn't exist
   * @throws {Error} If required variables are missing
   * @throws {z.ZodError} If validation fails
   *
   * @example
   * const loader = new ConfigLoader();
   * const config = loader.load();
   * console.log('Source URL:', config.SOURCE_N8N_URL);
   */
  load() {
    // Check if .env file exists
    if (!fs.existsSync(this.envPath)) {
      throw new Error(
        `Arquivo .env não encontrado em: ${this.envPath}\n\n` +
        'Crie um arquivo .env com as seguintes variáveis:\n' +
        '  SOURCE_N8N_URL=https://source.n8n.io\n' +
        '  SOURCE_N8N_API_KEY=seu_api_key_fonte\n' +
        '  TARGET_N8N_URL=https://target.n8n.io\n' +
        '  TARGET_N8N_API_KEY=seu_api_key_destino'
      );
    }

    // Load .env file
    const result = dotenv.config({ path: this.envPath });

    if (result.error) {
      throw new Error(`Erro ao carregar .env: ${result.error.message}`);
    }

    // Extract N8N transfer variables
    const rawConfig = {
      SOURCE_N8N_URL: process.env.SOURCE_N8N_URL,
      SOURCE_N8N_API_KEY: process.env.SOURCE_N8N_API_KEY,
      TARGET_N8N_URL: process.env.TARGET_N8N_URL,
      TARGET_N8N_API_KEY: process.env.TARGET_N8N_API_KEY,
    };

    // Validate configuration using Zod
    const validatedConfig = this.validate(rawConfig);

    // Store validated config
    this.config = validatedConfig;

    // Warn if SOURCE and TARGET URLs are identical
    if (validatedConfig.SOURCE_N8N_URL === validatedConfig.TARGET_N8N_URL) {
      console.warn(
        '\n⚠️  AVISO: SOURCE_N8N_URL e TARGET_N8N_URL são idênticos!\n' +
        '   Transferência de workflows para a mesma instância pode causar duplicações.\n'
      );
    }

    return validatedConfig;
  }

  /**
   * Validate configuration object using Zod schema
   *
   * @param {Object} config - Raw configuration object to validate
   * @returns {TransferConfig} Validated configuration
   * @throws {z.ZodError} If validation fails
   *
   * @example
   * const loader = new ConfigLoader();
   * const config = loader.validate({
   *   SOURCE_N8N_URL: 'https://source.n8n.io',
   *   SOURCE_N8N_API_KEY: 'key123',
   *   TARGET_N8N_URL: 'https://target.n8n.io',
   *   TARGET_N8N_API_KEY: 'key456'
   * });
   */
  validate(config) {
    try {
      return ConfigSchema.parse(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Format validation errors for user-friendly display
        const formattedErrors = error.issues.map(issue => {
          return `  - ${issue.path.join('.')}: ${issue.message}`;
        }).join('\n');

        throw new Error(
          '❌ Erro de validação de configuração:\n\n' +
          formattedErrors + '\n\n' +
          'Verifique se todas as variáveis estão definidas corretamente em .env'
        );
      }
      throw error;
    }
  }

  /**
   * Test connectivity to N8N instance
   *
   * Performs a health check by making an HTTP request to the N8N instance.
   * Tests both SOURCE and TARGET instances to ensure they are reachable and responding.
   *
   * @param {'SOURCE'|'TARGET'} instanceType - Which instance to test ('SOURCE' or 'TARGET')
   * @param {number} [timeout=5000] - Request timeout in milliseconds (default: 5000)
   * @returns {Promise<ConnectivityResult>} Connectivity test result
   *
   * @example
   * const loader = new ConfigLoader();
   * loader.load();
   *
   * const sourceTest = await loader.testConnectivity('SOURCE');
   * if (sourceTest.success) {
   *   console.log('SOURCE is reachable');
   * } else {
   *   console.error('SOURCE test failed:', sourceTest.error);
   * }
   *
   * const targetTest = await loader.testConnectivity('TARGET', 10000);
   * if (!targetTest.success) {
   *   console.error('TARGET test failed:', targetTest.error);
   * }
   */
  async testConnectivity(instanceType, timeout = 5000) {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call load() first.');
    }

    if (instanceType !== 'SOURCE' && instanceType !== 'TARGET') {
      throw new Error('instanceType must be "SOURCE" or "TARGET"');
    }

    const url = instanceType === 'SOURCE'
      ? this.config.SOURCE_N8N_URL
      : this.config.TARGET_N8N_URL;

    const apiKey = instanceType === 'SOURCE'
      ? this.config.SOURCE_N8N_API_KEY
      : this.config.TARGET_N8N_API_KEY;

    return new Promise((resolve) => {
      const startTime = Date.now();

      try {
        // Parse URL
        const parsedUrl = new URL(url);
        const isHttps = parsedUrl.protocol === 'https:';
        const httpModule = isHttps ? https : http;

        // Build health check URL (N8N API endpoint: /healthz or /api/v1/workflows)
        const healthCheckPath = '/healthz';
        const healthCheckUrl = `${url}${healthCheckPath}`;

        // Make HTTP request
        const req = httpModule.get(healthCheckUrl, {
          headers: {
            'X-N8N-API-KEY': apiKey,
            'Accept': 'application/json',
          },
          timeout,
        }, (res) => {
          const responseTime = Date.now() - startTime;
          const statusCode = res.statusCode;

          // Consume response body (required to prevent memory leaks)
          res.on('data', () => {});
          res.on('end', () => {
            if (statusCode >= 200 && statusCode < 400) {
              resolve({
                success: true,
                statusCode,
                responseTime,
              });
            } else {
              resolve({
                success: false,
                error: `HTTP ${statusCode}: Servidor respondeu com status de erro`,
                statusCode,
                responseTime,
              });
            }
          });
        });

        // Handle request timeout
        req.on('timeout', () => {
          req.destroy();
          resolve({
            success: false,
            error: `Timeout após ${timeout}ms. Servidor não respondeu a tempo.`,
          });
        });

        // Handle request errors (network, DNS, etc.)
        req.on('error', (error) => {
          const responseTime = Date.now() - startTime;
          resolve({
            success: false,
            error: `Erro de conexão: ${error.message}`,
            responseTime,
          });
        });

      } catch (error) {
        resolve({
          success: false,
          error: `Erro ao parsear URL: ${error.message}`,
        });
      }
    });
  }

  /**
   * Get the currently loaded configuration
   *
   * @returns {TransferConfig|null} Current configuration or null if not loaded
   *
   * @example
   * const loader = new ConfigLoader();
   * loader.load();
   * const config = loader.getConfig();
   * console.log('Source URL:', config.SOURCE_N8N_URL);
   */
  getConfig() {
    return this.config;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = ConfigLoader;
