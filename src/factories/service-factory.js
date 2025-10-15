/**
 * Service Factory - Unified Factory Pattern
 * Creates fully configured service instances for both N8N and Outline
 *
 * This factory encapsulates ALL dependency creation logic that was previously
 * scattered across command files, providing a single point of service instantiation.
 *
 * Features:
 * - Single factory for multiple service types (N8N, Outline)
 * - Complete dependency injection (HttpClient, Logger, FileManager, Auth)
 * - Comprehensive validation and error handling
 * - Consistent configuration across all services
 * - JSDoc documentation for all methods
 *
 * @example
 * // Create N8N service
 * const n8nService = ServiceFactory.create('n8n', {
 *   baseUrl: 'https://n8n.example.com',
 *   apiKey: 'your-api-key',
 *   logLevel: 'info'
 * });
 *
 * @example
 * // Create Outline service
 * const outlineService = ServiceFactory.create('outline', {
 *   apiToken: 'your-token',
 *   baseUrl: 'https://outline.example.com',
 *   delay: 200,
 *   verbose: false
 * });
 */

const HttpClient = require('../utils/http-client');
const Logger = require('../utils/logger');
const FileManager = require('../utils/file-manager');
const AuthFactory = require('../auth/auth-factory');
const TokenStrategy = require('../auth/token-strategy');
const WorkflowService = require('../services/workflow-service');
const OutlineService = require('../services/outline-service');

class ServiceFactory {
  /**
   * Create a fully configured service instance
   *
   * This is the main entry point for creating services. It handles all dependency
   * injection, validation, and configuration for the requested service type.
   *
   * @param {string} serviceType - Type of service to create ('n8n' or 'outline')
   * @param {object} config - Configuration object for the service
   * @returns {WorkflowService|OutlineService} Fully configured service instance
   * @throws {Error} If serviceType is unknown or config is invalid
   *
   * @example
   * const service = ServiceFactory.create('n8n', {
   *   baseUrl: 'https://n8n.example.com',
   *   apiKey: 'abc123'
   * });
   */
  static create(serviceType, config) {
    // Validate service type
    if (!serviceType || typeof serviceType !== 'string') {
      throw new TypeError('serviceType é obrigatório e deve ser uma string');
    }

    // Normalize service type to lowercase
    const normalizedType = serviceType.toLowerCase();

    // Route to appropriate factory method based on service type
    switch (normalizedType) {
    case 'n8n':
      return this.createN8nService(config);
    case 'outline':
      return this.createOutlineService(config);
    default:
      throw new Error(
        `Tipo de serviço desconhecido: "${serviceType}". ` +
          'Tipos válidos: \'n8n\', \'outline\''
      );
    }
  }

  /**
   * Create a fully configured N8N WorkflowService
   *
   * This method creates an N8N service with all dependencies properly injected.
   * It follows the same pattern used in n8n-download.js but encapsulates it
   * for reusability across multiple commands.
   *
   * @param {object} config - N8N service configuration
   * @param {string} config.baseUrl - N8N instance URL (required)
   * @param {string} [config.apiKey] - N8N API key (optional, requires apiKey OR username+password)
   * @param {string} [config.username] - N8N username for basic auth (optional)
   * @param {string} [config.password] - N8N password for basic auth (optional)
   * @param {number} [config.maxRetries=3] - Maximum number of retry attempts
   * @param {number} [config.timeout=30000] - HTTP request timeout in milliseconds
   * @param {string} [config.logLevel='info'] - Log level (debug, info, warn, error)
   * @param {boolean} [config.enableColors=true] - Enable colored log output
   * @param {boolean} [config.enableTimestamp=false] - Enable timestamps in logs
   * @returns {WorkflowService} Fully configured WorkflowService instance
   * @throws {Error} If configuration is invalid or authentication fails
   *
   * @example
   * const service = ServiceFactory.createN8nService({
   *   baseUrl: 'https://n8n.example.com',
   *   apiKey: 'abc123',
   *   logLevel: 'debug'
   * });
   * const workflows = await service.listWorkflows();
   */
  static createN8nService(config) {
    // Validate configuration
    const validation = this._validateN8nConfig(config);
    if (!validation.valid) {
      throw new Error(
        `Configuração inválida para N8N service:\n${validation.errors.join('\n')}`
      );
    }

    // Extract configuration with defaults
    const {
      baseUrl,
      apiKey,
      username,
      password,
      maxRetries = 3,
      timeout = 30000,
      logLevel = 'info',
      enableColors = true,
      enableTimestamp = false
    } = config;

    // Create logger
    const logger = new Logger({
      logLevel,
      enableColors,
      enableTimestamp
    });

    logger.debug('Creating N8N WorkflowService...');

    // Create authentication strategy using AuthFactory
    // AuthFactory handles the logic of choosing between API Key and Basic Auth
    const authStrategy = AuthFactory.create({
      apiKey,
      username,
      password
    });

    // Create HTTP client with authentication headers and retry configuration
    const httpClient = new HttpClient(
      baseUrl,
      authStrategy.getHeaders(),
      {
        maxRetries,
        timeout
      }
    );

    // Create file manager
    const fileManager = new FileManager(logger);

    // Create and return the WorkflowService
    const workflowService = new WorkflowService(
      httpClient,
      authStrategy,
      logger
    );

    logger.debug('N8N WorkflowService criado com sucesso');
    logger.debug(`Base URL: ${baseUrl}`);
    logger.debug(`Auth type: ${authStrategy.constructor.name}`);
    logger.debug(`Max retries: ${maxRetries}, Timeout: ${timeout}ms`);

    return workflowService;
  }

  /**
   * Create a fully configured Outline OutlineService
   *
   * This method creates an Outline service with all dependencies properly injected.
   * It follows the same pattern used in outline-auth-factory.js but is integrated
   * into the unified factory pattern.
   *
   * @param {object} config - Outline service configuration
   * @param {string} config.apiToken - Outline API token (required)
   * @param {string} config.baseUrl - Outline instance URL (required)
   * @param {number} [config.delay=200] - Delay between requests in ms (rate limiting)
   * @param {boolean} [config.verbose=false] - Enable verbose/debug logging
   * @param {string} [config.logLevel='info'] - Log level (debug, info, warn, error)
   * @param {number} [config.maxRetries=3] - Maximum number of retry attempts
   * @param {number} [config.timeout=30000] - HTTP request timeout in milliseconds
   * @param {number} [config.maxCacheSize=1000] - Maximum cache size for documents
   * @param {boolean} [config.enableTimestamp=true] - Enable timestamps in logs
   * @returns {OutlineService} Fully configured OutlineService instance
   * @throws {Error} If configuration is invalid
   *
   * @example
   * const service = ServiceFactory.createOutlineService({
   *   apiToken: 'ol_token_abc123',
   *   baseUrl: 'https://outline.example.com',
   *   delay: 300,
   *   verbose: true
   * });
   * const collections = await service.listCollections();
   */
  static createOutlineService(config) {
    // Validate configuration
    const validation = this._validateOutlineConfig(config);
    if (!validation.valid) {
      throw new Error(
        `Configuração inválida para Outline service:\n${validation.errors.join('\n')}`
      );
    }

    // Extract configuration with defaults
    const {
      apiToken,
      baseUrl,
      delay = 200,
      verbose = false,
      logLevel = 'info',
      maxRetries = 3,
      timeout = 30000,
      maxCacheSize = 1000,
      enableTimestamp = true
    } = config;

    // Create logger with verbose override
    const logger = new Logger({
      logLevel: verbose ? 'debug' : logLevel,
      enableTimestamp
    });

    logger.debug('Creating Outline OutlineService...');

    // Create authentication strategy for Outline (token-based)
    const authStrategy = new TokenStrategy(apiToken);

    // Create HTTP client with retry configuration
    const httpClient = new HttpClient(baseUrl, {}, {
      maxRetries,
      timeout,
      baseDelay: delay
    });

    // Create file manager
    const fileManager = new FileManager(logger);

    // Create and return the OutlineService
    const outlineService = new OutlineService(
      httpClient,
      authStrategy,
      logger,
      fileManager,
      {
        delay,
        verbose,
        maxCacheSize
      }
    );

    logger.debug('Outline OutlineService criado com sucesso');
    logger.debug(`Base URL: ${baseUrl}`);
    logger.debug(`Delay: ${delay}ms, Max retries: ${maxRetries}, Timeout: ${timeout}ms`);
    logger.debug(`Max cache size: ${maxCacheSize}`);

    return outlineService;
  }

  /**
   * Validate N8N service configuration
   *
   * Ensures all required fields are present and valid for N8N service creation.
   * Validates URL format, authentication credentials, and optional parameters.
   *
   * @private
   * @param {object} config - Configuration object to validate
   * @returns {object} Validation result with { valid: boolean, errors: string[] }
   */
  static _validateN8nConfig(config) {
    const errors = [];

    // Validate config exists
    if (!config || typeof config !== 'object') {
      return {
        valid: false,
        errors: ['Configuração deve ser um objeto']
      };
    }

    // Validate baseUrl
    if (!config.baseUrl) {
      errors.push('baseUrl é obrigatório');
    } else if (typeof config.baseUrl !== 'string') {
      errors.push('baseUrl deve ser uma string');
    } else if (config.baseUrl.trim().length === 0) {
      errors.push('baseUrl não pode ser vazio');
    } else {
      // Validate URL format
      try {
        const url = new URL(config.baseUrl);
        if (!url.protocol.startsWith('http')) {
          errors.push('baseUrl deve começar com http:// ou https://');
        }
      } catch (e) {
        errors.push('baseUrl deve ser uma URL válida');
      }
    }

    // Validate authentication credentials
    // Either apiKey OR (username + password) must be provided
    const hasApiKey = config.apiKey && typeof config.apiKey === 'string' && config.apiKey.trim().length > 0;
    const hasUsername = config.username && typeof config.username === 'string' && config.username.trim().length > 0;
    const hasPassword = config.password && typeof config.password === 'string' && config.password.trim().length > 0;
    const hasBasicAuth = hasUsername && hasPassword;

    if (!hasApiKey && !hasBasicAuth) {
      errors.push(
        'Credenciais de autenticação são obrigatórias. ' +
        'Forneça apiKey OU username + password'
      );
    }

    // Validate apiKey if provided
    if (config.apiKey !== undefined && !hasApiKey) {
      errors.push('apiKey deve ser uma string não vazia se fornecido');
    }

    // Validate username/password if provided
    if (config.username !== undefined && !hasUsername) {
      errors.push('username deve ser uma string não vazia se fornecido');
    }
    if (config.password !== undefined && !hasPassword) {
      errors.push('password deve ser uma string não vazia se fornecido');
    }

    // Validate optional parameters if provided
    if (config.maxRetries !== undefined) {
      if (typeof config.maxRetries !== 'number') {
        errors.push('maxRetries deve ser um número');
      } else if (config.maxRetries < 0) {
        errors.push('maxRetries não pode ser negativo');
      } else if (config.maxRetries > 10) {
        errors.push('maxRetries muito alto (máximo 10)');
      }
    }

    if (config.timeout !== undefined) {
      if (typeof config.timeout !== 'number') {
        errors.push('timeout deve ser um número');
      } else if (config.timeout < 1000) {
        errors.push('timeout muito baixo (mínimo 1000ms)');
      } else if (config.timeout > 300000) {
        errors.push('timeout muito alto (máximo 300000ms)');
      }
    }

    if (config.logLevel !== undefined) {
      const validLevels = ['debug', 'info', 'warn', 'error'];
      if (!validLevels.includes(config.logLevel)) {
        errors.push(`logLevel deve ser um de: ${validLevels.join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate Outline service configuration
   *
   * Ensures all required fields are present and valid for Outline service creation.
   * Validates URL format, API token, and optional parameters including security checks.
   *
   * @private
   * @param {object} config - Configuration object to validate
   * @returns {object} Validation result with { valid: boolean, errors: string[] }
   */
  static _validateOutlineConfig(config) {
    const errors = [];

    // Validate config exists
    if (!config || typeof config !== 'object') {
      return {
        valid: false,
        errors: ['Configuração deve ser um objeto']
      };
    }

    // Validate apiToken
    if (!config.apiToken) {
      errors.push('apiToken é obrigatório');
    } else if (typeof config.apiToken !== 'string') {
      errors.push('apiToken deve ser uma string');
    } else if (config.apiToken.trim().length === 0) {
      errors.push('apiToken não pode ser vazio');
    } else if (config.apiToken.trim().length < 10) {
      errors.push('apiToken parece inválido (muito curto)');
    }

    // Validate baseUrl
    if (!config.baseUrl) {
      errors.push('baseUrl é obrigatório');
    } else if (typeof config.baseUrl !== 'string') {
      errors.push('baseUrl deve ser uma string');
    } else if (config.baseUrl.trim().length === 0) {
      errors.push('baseUrl não pode ser vazio');
    } else {
      // Validate URL format and security
      try {
        const url = new URL(config.baseUrl);
        if (!url.protocol.startsWith('http')) {
          errors.push('baseUrl deve começar com http:// ou https://');
        } else {
          // HTTPS validation for security
          const isProduction = process.env.NODE_ENV === 'production';
          const allowHttp = process.env.OUTLINE_ALLOW_HTTP === 'true';
          const isHttps = url.protocol === 'https:';

          if (!isHttps) {
            // HTTP detected
            if (isProduction && !allowHttp) {
              // Production: reject HTTP
              errors.push(
                'baseUrl deve usar HTTPS para segurança. ' +
                'Tokens enviados via HTTP são transmitidos sem criptografia. ' +
                'Use https:// em produção.'
              );
            } else if (allowHttp) {
              // Development with OUTLINE_ALLOW_HTTP=true: allow but warn
              console.warn(
                '\n⚠️  AVISO DE SEGURANÇA: Usando HTTP não criptografado!\n' +
                `    URL: ${config.baseUrl}\n` +
                '    Tokens de API serão transmitidos em texto claro.\n' +
                '    NUNCA use HTTP em ambiente de produção!\n' +
                '    Configure HTTPS para proteger suas credenciais.\n'
              );
            } else {
              // Development without OUTLINE_ALLOW_HTTP: reject
              errors.push(
                'baseUrl deve usar HTTPS para segurança. ' +
                'Para permitir HTTP em desenvolvimento, defina OUTLINE_ALLOW_HTTP=true'
              );
            }
          }
        }
      } catch (e) {
        errors.push('baseUrl deve ser uma URL válida');
      }
    }

    // Validate optional parameters if provided
    if (config.delay !== undefined) {
      if (typeof config.delay !== 'number') {
        errors.push('delay deve ser um número');
      } else if (config.delay < 0) {
        errors.push('delay não pode ser negativo');
      } else if (config.delay > 10000) {
        errors.push('delay muito alto (máximo 10000ms)');
      }
    }

    if (config.maxRetries !== undefined) {
      if (typeof config.maxRetries !== 'number') {
        errors.push('maxRetries deve ser um número');
      } else if (config.maxRetries < 0) {
        errors.push('maxRetries não pode ser negativo');
      } else if (config.maxRetries > 10) {
        errors.push('maxRetries muito alto (máximo 10)');
      }
    }

    if (config.timeout !== undefined) {
      if (typeof config.timeout !== 'number') {
        errors.push('timeout deve ser um número');
      } else if (config.timeout < 1000) {
        errors.push('timeout muito baixo (mínimo 1000ms)');
      } else if (config.timeout > 300000) {
        errors.push('timeout muito alto (máximo 300000ms)');
      }
    }

    if (config.maxCacheSize !== undefined) {
      if (typeof config.maxCacheSize !== 'number') {
        errors.push('maxCacheSize deve ser um número');
      } else if (config.maxCacheSize < 1) {
        errors.push('maxCacheSize deve ser pelo menos 1');
      } else if (config.maxCacheSize > 10000) {
        errors.push('maxCacheSize muito alto (máximo 10000)');
      }
    }

    if (config.logLevel !== undefined) {
      const validLevels = ['debug', 'info', 'warn', 'error'];
      if (!validLevels.includes(config.logLevel)) {
        errors.push(`logLevel deve ser um de: ${validLevels.join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate if credentials are sufficient for a service type
   *
   * This is a convenience method to check if configuration is valid
   * without actually creating the service.
   *
   * @param {string} serviceType - Type of service ('n8n' or 'outline')
   * @param {object} config - Configuration object to validate
   * @returns {boolean} True if configuration is valid, false otherwise
   *
   * @example
   * if (ServiceFactory.validate('n8n', config)) {
   *   const service = ServiceFactory.create('n8n', config);
   * }
   */
  static validate(serviceType, config) {
    try {
      // Validate service type
      if (!serviceType || typeof serviceType !== 'string') {
        return false;
      }

      const normalizedType = serviceType.toLowerCase();

      // Route to appropriate validation method
      let validation;
      switch (normalizedType) {
      case 'n8n':
        validation = this._validateN8nConfig(config);
        break;
      case 'outline':
        validation = this._validateOutlineConfig(config);
        break;
      default:
        return false;
      }

      return validation.valid;
    } catch {
      return false;
    }
  }

  /**
   * Get validation errors for a configuration
   *
   * Returns detailed error messages if configuration is invalid.
   * Useful for providing user feedback about what's wrong with the config.
   *
   * @param {string} serviceType - Type of service ('n8n' or 'outline')
   * @param {object} config - Configuration object to validate
   * @returns {string[]} Array of error messages (empty if valid)
   *
   * @example
   * const errors = ServiceFactory.getValidationErrors('outline', config);
   * if (errors.length > 0) {
   *   console.error('Configuration errors:', errors);
   * }
   */
  static getValidationErrors(serviceType, config) {
    try {
      // Validate service type
      if (!serviceType || typeof serviceType !== 'string') {
        return ['serviceType deve ser uma string'];
      }

      const normalizedType = serviceType.toLowerCase();

      // Route to appropriate validation method
      let validation;
      switch (normalizedType) {
      case 'n8n':
        validation = this._validateN8nConfig(config);
        break;
      case 'outline':
        validation = this._validateOutlineConfig(config);
        break;
      default:
        return [`Tipo de serviço desconhecido: "${serviceType}"`];
      }

      return validation.errors;
    } catch (error) {
      return [`Erro ao validar configuração: ${error.message}`];
    }
  }

  /**
   * Get list of supported service types
   *
   * @returns {string[]} Array of supported service type names
   *
   * @example
   * const types = ServiceFactory.getSupportedTypes();
   * console.log('Supported services:', types); // ['n8n', 'outline']
   */
  static getSupportedTypes() {
    return ['n8n', 'outline'];
  }
}

module.exports = ServiceFactory;
