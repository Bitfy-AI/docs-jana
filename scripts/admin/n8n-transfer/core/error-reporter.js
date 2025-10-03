/**
 * ErrorReporter - Sistema de formatação e reporte de erros padronizado
 *
 * @module scripts/admin/n8n-transfer/core/error-reporter
 * @description Utilitários para formatação de erros em formato padronizado com
 * códigos, mensagens claras e sugestões acionáveis. Detecta tipos específicos de
 * erro (autenticação, rede, timeout, storage) e fornece orientações para resolução.
 *
 * @example
 * const ErrorReporter = require('./error-reporter');
 * const reporter = new ErrorReporter();
 *
 * try {
 *   // operação que pode falhar
 * } catch (error) {
 *   const formattedError = reporter.format(error);
 *   console.error(formattedError.message);
 *   console.log('Sugestão:', formattedError.suggestion);
 * }
 *
 * @author Jana Team
 * @version 1.0.0
 */

// =============================================================================
// TYPESCRIPT/JSDOC TYPE DEFINITIONS
// =============================================================================

/**
 * Tipo de erro detectado
 * @typedef {'AUTHENTICATION' | 'NETWORK' | 'TIMEOUT' | 'STORAGE' | 'VALIDATION' | 'NOT_FOUND' | 'UNKNOWN'} ErrorType
 */

/**
 * Erro formatado com informações estruturadas
 *
 * @typedef {Object} FormattedError
 * @property {string} code - Código único do erro (ex: 'ERR_AUTH_INVALID')
 * @property {ErrorType} type - Tipo do erro
 * @property {string} message - Mensagem de erro em português
 * @property {string} suggestion - Sugestão acionável para resolução
 * @property {Object} [details] - Detalhes adicionais do erro
 * @property {Error} [originalError] - Erro original (opcional)
 *
 * @example
 * {
 *   code: 'ERR_AUTH_INVALID',
 *   type: 'AUTHENTICATION',
 *   message: 'Falha na autenticação: API key inválida',
 *   suggestion: 'Verifique se a API key em .env está correta e ativa no N8N',
 *   details: { statusCode: 401 },
 *   originalError: Error('401 Unauthorized')
 * }
 */

// =============================================================================
// ERROR REPORTER CLASS
// =============================================================================

/**
 * ErrorReporter - Formata erros em estrutura padronizada com sugestões
 *
 * @class
 * @description Detecta automaticamente tipos de erro e fornece mensagens claras
 * em português com sugestões acionáveis para resolução.
 *
 * @example
 * const reporter = new ErrorReporter();
 *
 * // Formatar erro de autenticação
 * const authError = new Error('401 Unauthorized');
 * const formatted = reporter.format(authError);
 * // {
 * //   code: 'ERR_AUTH_INVALID',
 * //   type: 'AUTHENTICATION',
 * //   message: 'Falha na autenticação...',
 * //   suggestion: 'Verifique se a API key...'
 * // }
 */
class ErrorReporter {
  /**
   * Cria nova instância do ErrorReporter
   *
   * @example
   * const reporter = new ErrorReporter();
   */
  constructor() {
    // Configurações podem ser adicionadas aqui no futuro
  }

  /**
   * Formata erro em estrutura padronizada com código, tipo, mensagem e sugestão
   *
   * @param {Error | string} error - Erro a ser formatado
   * @param {Object} [context={}] - Contexto adicional (ex: { operation: 'transfer', workflowId: '123' })
   * @returns {FormattedError} Erro formatado com sugestões
   *
   * @example
   * // Erro de rede
   * const netError = new Error('ECONNREFUSED');
   * const formatted = reporter.format(netError);
   * console.log(formatted.code); // 'ERR_NETWORK_REFUSED'
   * console.log(formatted.suggestion); // 'Verifique se a URL...'
   *
   * @example
   * // Erro com contexto
   * const err = new Error('Timeout');
   * const formatted = reporter.format(err, { operation: 'getWorkflows' });
   * console.log(formatted.details.operation); // 'getWorkflows'
   */
  format(error, context = {}) {
    // Converter string em Error se necessário
    const err = error instanceof Error ? error : new Error(String(error));

    // Detectar tipo de erro
    const errorType = this._detectErrorType(err);

    // Gerar código, mensagem e sugestão baseados no tipo
    const errorInfo = this._getErrorInfo(errorType, err);

    return {
      code: errorInfo.code,
      type: errorType,
      message: errorInfo.message,
      suggestion: errorInfo.suggestion,
      details: {
        ...context,
        timestamp: new Date().toISOString(),
        errorMessage: err.message,
        stack: err.stack,
      },
      originalError: err,
    };
  }

  /**
   * Detecta tipo de erro baseado na mensagem e propriedades
   *
   * @private
   * @param {Error} error - Erro a ser analisado
   * @returns {ErrorType} Tipo detectado
   */
  _detectErrorType(error) {
    const message = error.message.toLowerCase();
    const code = error.code?.toLowerCase() || '';

    // Autenticação
    if (
      message.includes('401') ||
      message.includes('unauthorized') ||
      message.includes('authentication') ||
      message.includes('api key')
    ) {
      return 'AUTHENTICATION';
    }

    // Not Found
    if (message.includes('404') || message.includes('not found')) {
      return 'NOT_FOUND';
    }

    // Timeout
    if (
      message.includes('timeout') ||
      message.includes('etimedout') ||
      code === 'etimedout'
    ) {
      return 'TIMEOUT';
    }

    // Network
    if (
      code === 'econnrefused' ||
      code === 'enotfound' ||
      code === 'econnreset' ||
      message.includes('econnrefused') ||
      message.includes('enotfound') ||
      message.includes('network') ||
      message.includes('dns')
    ) {
      return 'NETWORK';
    }

    // Storage
    if (
      code === 'enospc' ||
      message.includes('enospc') ||
      message.includes('no space') ||
      message.includes('disk full')
    ) {
      return 'STORAGE';
    }

    // Validation
    if (
      message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('required')
    ) {
      return 'VALIDATION';
    }

    return 'UNKNOWN';
  }

  /**
   * Retorna informações estruturadas (code, message, suggestion) para um tipo de erro
   *
   * @private
   * @param {ErrorType} type - Tipo do erro
   * @param {Error} error - Erro original
   * @returns {Object} Objeto com code, message, suggestion
   */
  _getErrorInfo(type, error) {
    const errorMap = {
      AUTHENTICATION: {
        code: 'ERR_AUTH_INVALID',
        message: `Falha na autenticação: ${this._extractMessage(error)}`,
        suggestion: 'Verifique se a API key no arquivo .env está correta e ativa na instância N8N. Acesse N8N > Settings > API Keys para verificar.',
      },
      NOT_FOUND: {
        code: 'ERR_NOT_FOUND',
        message: `Recurso não encontrado: ${this._extractMessage(error)}`,
        suggestion: 'Verifique se o workflow/recurso existe na instância N8N. Pode ter sido deletado ou o ID está incorreto.',
      },
      TIMEOUT: {
        code: 'ERR_TIMEOUT',
        message: `Timeout na operação: ${this._extractMessage(error)}`,
        suggestion: 'A operação demorou muito tempo. Verifique se a instância N8N está respondendo e tente aumentar o timeout ou verificar a conexão de rede.',
      },
      NETWORK: {
        code: 'ERR_NETWORK',
        message: `Erro de rede: ${this._extractMessage(error)}`,
        suggestion: 'Verifique se a URL da instância N8N está correta no .env e se a instância está acessível. Teste acessando a URL no navegador.',
      },
      STORAGE: {
        code: 'ERR_STORAGE_FULL',
        message: `Erro de armazenamento: ${this._extractMessage(error)}`,
        suggestion: 'Disco cheio. Libere espaço em disco ou configure um diretório diferente para logs/reports.',
      },
      VALIDATION: {
        code: 'ERR_VALIDATION',
        message: `Erro de validação: ${this._extractMessage(error)}`,
        suggestion: 'Os dados fornecidos são inválidos. Verifique se todos os campos obrigatórios estão preenchidos corretamente.',
      },
      UNKNOWN: {
        code: 'ERR_UNKNOWN',
        message: `Erro desconhecido: ${this._extractMessage(error)}`,
        suggestion: 'Erro não identificado. Verifique os logs para mais detalhes ou entre em contato com o suporte.',
      },
    };

    return errorMap[type] || errorMap.UNKNOWN;
  }

  /**
   * Extrai mensagem limpa do erro (sem stack trace)
   *
   * @private
   * @param {Error} error - Erro original
   * @returns {string} Mensagem extraída
   */
  _extractMessage(error) {
    // Remover stack trace e pegar só a primeira linha
    const message = error.message.split('\n')[0];

    // Limitar tamanho para evitar mensagens muito longas
    return message.length > 200 ? `${message.substring(0, 200)}...` : message;
  }

  /**
   * Cria erro formatado para tipo específico
   *
   * @param {ErrorType} type - Tipo do erro
   * @param {string} message - Mensagem customizada
   * @param {Object} [context={}] - Contexto adicional
   * @returns {FormattedError} Erro formatado
   *
   * @example
   * // Criar erro de autenticação customizado
   * const authError = reporter.createError('AUTHENTICATION', 'API key expirada', {
   *   instance: 'SOURCE'
   * });
   * console.log(authError.code); // 'ERR_AUTH_INVALID'
   * console.log(authError.suggestion); // 'Verifique se a API key...'
   */
  createError(type, message, context = {}) {
    const error = new Error(message);

    // Forçar tipo específico ao invés de detectar automaticamente
    const errorInfo = this._getErrorInfo(type, error);

    return {
      code: errorInfo.code,
      type: type,
      message: errorInfo.message,
      suggestion: errorInfo.suggestion,
      details: {
        ...context,
        timestamp: new Date().toISOString(),
        errorMessage: error.message,
        stack: error.stack,
      },
      originalError: error,
    };
  }

  /**
   * Verifica se um erro é de um tipo específico
   *
   * @param {Error | FormattedError} error - Erro a verificar
   * @param {ErrorType} type - Tipo esperado
   * @returns {boolean} True se o erro é do tipo especificado
   *
   * @example
   * const err = new Error('401 Unauthorized');
   * const formatted = reporter.format(err);
   *
   * if (reporter.isErrorType(formatted, 'AUTHENTICATION')) {
   *   console.log('Erro de autenticação detectado');
   * }
   */
  isErrorType(error, type) {
    // Se já é FormattedError, verificar a propriedade type
    if (error.type) {
      return error.type === type;
    }

    // Se é Error, detectar tipo
    if (error instanceof Error) {
      return this._detectErrorType(error) === type;
    }

    return false;
  }

  /**
   * Formata múltiplos erros em lista estruturada
   *
   * @param {Array<Error | string>} errors - Lista de erros
   * @param {Object} [context={}] - Contexto comum para todos os erros
   * @returns {Array<FormattedError>} Lista de erros formatados
   *
   * @example
   * const errors = [
   *   new Error('401 Unauthorized'),
   *   new Error('ECONNREFUSED'),
   *   'Validation failed'
   * ];
   *
   * const formatted = reporter.formatMany(errors, { operation: 'bulk-transfer' });
   * formatted.forEach(err => {
   *   console.log(`${err.code}: ${err.message}`);
   *   console.log(`→ ${err.suggestion}`);
   * });
   */
  formatMany(errors, context = {}) {
    return errors.map(error => this.format(error, context));
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = ErrorReporter;
