/**
 * Outline Authentication Factory - Factory Pattern
 * Cria OutlineService com autenticação e dependências configuradas
 */

const TokenStrategy = require('./token-strategy');
const HttpClient = require('../utils/http-client');
const OutlineService = require('../services/outline-service');
const Logger = require('../utils/logger');
const FileManager = require('../utils/file-manager');

class OutlineAuthFactory {
  /**
   * Cria uma instância configurada do OutlineService
   *
   * @param {object} config - Objeto de configuração
   * @param {string} config.apiToken - Token de API do Outline
   * @param {string} config.baseUrl - URL base da API do Outline
   * @param {number} [config.delay=200] - Delay entre requisições (rate limiting)
   * @param {boolean} [config.verbose=false] - Ativar logs detalhados
   * @param {string} [config.logLevel='info'] - Nível de log (debug, info, warn, error)
   * @param {number} [config.maxRetries=3] - Número máximo de tentativas
   * @param {number} [config.timeout=30000] - Timeout para requisições HTTP
   * @returns {OutlineService} Instância configurada do OutlineService
   * @throws {Error} Se a configuração for inválida
   */
  static create(config) {
    // Valida a configuração
    const validation = this.validate(config);
    if (!validation.valid) {
      throw new Error(
        `Configuração inválida para OutlineService:\n${validation.errors.join('\n')}`
      );
    }

    // Extrai configurações com valores padrão
    const {
      apiToken,
      baseUrl,
      delay = 200,
      verbose = false,
      logLevel = 'info',
      maxRetries = 3,
      timeout = 30000
    } = config;

    // Cria estratégia de autenticação
    const authStrategy = new TokenStrategy(apiToken);

    // Cria cliente HTTP com configurações de retry
    const httpClient = new HttpClient(baseUrl, {}, {
      maxRetries,
      timeout,
      baseDelay: delay
    });

    // Cria logger
    const logger = new Logger({
      logLevel: verbose ? 'debug' : logLevel,
      enableTimestamp: true
    });

    // Cria file manager
    const fileManager = new FileManager(logger);

    // Cria e retorna o OutlineService
    const outlineService = new OutlineService(
      httpClient,
      authStrategy,
      logger,
      fileManager,
      {
        delay,
        verbose
      }
    );

    logger.debug('OutlineService criado com sucesso');
    logger.debug(`Base URL: ${baseUrl}`);
    logger.debug(`Max retries: ${maxRetries}, Timeout: ${timeout}ms`);

    return outlineService;
  }

  /**
   * Valida a configuração do OutlineService
   *
   * @param {object} config - Objeto de configuração
   * @returns {object} { valid: boolean, errors: string[] }
   */
  static validate(config) {
    const errors = [];

    // Verifica se config existe
    if (!config || typeof config !== 'object') {
      return {
        valid: false,
        errors: ['Configuração deve ser um objeto']
      };
    }

    // Valida apiToken
    if (!config.apiToken) {
      errors.push('apiToken é obrigatório');
    } else if (typeof config.apiToken !== 'string') {
      errors.push('apiToken deve ser uma string');
    } else if (config.apiToken.trim().length === 0) {
      errors.push('apiToken não pode ser vazio');
    } else if (config.apiToken.trim().length < 10) {
      errors.push('apiToken parece inválido (muito curto)');
    }

    // Valida baseUrl
    if (!config.baseUrl) {
      errors.push('baseUrl é obrigatório');
    } else if (typeof config.baseUrl !== 'string') {
      errors.push('baseUrl deve ser uma string');
    } else if (config.baseUrl.trim().length === 0) {
      errors.push('baseUrl não pode ser vazio');
    } else {
      // Valida formato da URL
      try {
        const url = new URL(config.baseUrl);
        if (!url.protocol.startsWith('http')) {
          errors.push('baseUrl deve começar com http:// ou https://');
        } else {
          // Validação de segurança HTTPS
          const isProduction = process.env.NODE_ENV === 'production';
          const allowHttp = process.env.OUTLINE_ALLOW_HTTP === 'true';
          const isHttps = url.protocol === 'https:';

          if (!isHttps) {
            // HTTP detectado
            if (isProduction && !allowHttp) {
              // Produção: rejeitar HTTP
              errors.push(
                'baseUrl deve usar HTTPS para segurança. ' +
                'Tokens enviados via HTTP são transmitidos sem criptografia. ' +
                'Use https:// em produção.'
              );
            } else if (allowHttp) {
              // Desenvolvimento com OUTLINE_ALLOW_HTTP=true: permitir mas avisar
              console.warn(
                '\n⚠️  AVISO DE SEGURANÇA: Usando HTTP não criptografado!\n' +
                `    URL: ${config.baseUrl}\n` +
                '    Tokens de API serão transmitidos em texto claro.\n' +
                '    NUNCA use HTTP em ambiente de produção!\n' +
                '    Configure HTTPS para proteger suas credenciais.\n'
              );
            } else {
              // Desenvolvimento sem OUTLINE_ALLOW_HTTP: rejeitar
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

    // Valida parâmetros opcionais se fornecidos
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
}

module.exports = OutlineAuthFactory;
