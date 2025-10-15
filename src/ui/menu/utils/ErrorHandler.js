/**
 * ErrorHandler - Sistema centralizado de tratamento de erros
 *
 * Responsável por:
 * - Categorizar erros (user-input, system, command-execution, runtime)
 * - Fornecer mensagens amigáveis ao usuário
 * - Implementar estratégias de fallback e recuperação
 * - Registrar erros com contexto adequado
 *
 * Requirements: Confiabilidade.1 (Error Handling)
 */

class ErrorHandler {
  /**
   * @param {Object} options - Opções do error handler
   * @param {boolean} [options.debug=false] - Habilitar modo debug
   * @param {Function} [options.logger=null] - Logger opcional
   */
  constructor(options = {}) {
    this.debug = options.debug || process.env.DEBUG === 'true';
    this.logger = options.logger || null;
  }

  /**
   * Categoriza erro baseado em suas características
   *
   * @param {Error} error - Erro a categorizar
   * @returns {string} Categoria do erro
   * @private
   */
  categorizeError(error) {
    // System errors (ENOENT, EACCES, etc.)
    if (error.code && error.code.startsWith('E')) {
      return 'system';
    }

    // Command execution errors
    if (error.message && (
      error.message.includes('Command') ||
      error.message.includes('execution') ||
      error.code === 'EXECUTION_ERROR'
    )) {
      return 'command-execution';
    }

    // User input errors
    if (error.message && (
      error.message.includes('Invalid') ||
      error.message.includes('required') ||
      error.message.includes('validation')
    )) {
      return 'user-input';
    }

    // Runtime errors (default)
    return 'runtime';
  }

  /**
   * Trata erro e retorna resposta estruturada
   *
   * @param {Error} error - Erro a tratar
   * @param {Object} context - Contexto do erro
   * @returns {ErrorResponse} Resposta de erro
   *
   * @typedef {Object} ErrorResponse
   * @property {string} category - Categoria do erro
   * @property {string} message - Mensagem amigável
   * @property {string} suggestion - Sugestão de ação
   * @property {boolean} recoverable - Se é recuperável
   * @property {Object} [details] - Detalhes técnicos (apenas em debug)
   */
  handle(error, context = {}) {
    const category = this.categorizeError(error);

    // Log error se logger disponível
    if (this.logger) {
      this.logger.error('Error caught by ErrorHandler', error, { category, ...context });
    } else if (this.debug) {
      console.error('[ErrorHandler]', category, error.message);
      if (error.stack) {
        console.error(error.stack);
      }
    }

    // Gera resposta baseada na categoria
    switch (category) {
    case 'user-input':
      return this.handleUserInputError(error, context);
    case 'system':
      return this.handleSystemError(error, context);
    case 'command-execution':
      return this.handleCommandError(error, context);
    case 'runtime':
    default:
      return this.handleRuntimeError(error, context);
    }
  }

  /**
   * Trata erros de entrada do usuário
   * @private
   */
  handleUserInputError(error, context) {
    return {
      category: 'user-input',
      message: error.message || 'Entrada inválida',
      suggestion: 'Verifique os dados informados e tente novamente.',
      recoverable: true,
      details: this.debug ? { error: error.message, context } : undefined
    };
  }

  /**
   * Trata erros de sistema (filesystem, network, etc.)
   * @private
   */
  handleSystemError(error, context) {
    const errorMessages = {
      'ENOENT': 'Arquivo ou diretório não encontrado',
      'EACCES': 'Permissão negada',
      'EEXIST': 'Arquivo ou diretório já existe',
      'ENOTDIR': 'Não é um diretório',
      'EISDIR': 'É um diretório',
      'EMFILE': 'Muitos arquivos abertos',
      'ENOSPC': 'Sem espaço em disco'
    };

    const message = errorMessages[error.code] || `Erro de sistema: ${error.code || 'desconhecido'}`;
    const isRecoverable = ['ENOENT', 'ENOTDIR'].includes(error.code);

    return {
      category: 'system',
      message,
      suggestion: isRecoverable
        ? 'Verifique o caminho do arquivo e tente novamente.'
        : 'Verifique as permissões e espaço disponível.',
      recoverable: isRecoverable,
      details: this.debug ? { error: error.message, code: error.code, context } : undefined
    };
  }

  /**
   * Trata erros de execução de comandos
   * @private
   */
  handleCommandError(error, context) {
    return {
      category: 'command-execution',
      message: error.message || 'Falha ao executar comando',
      suggestion: 'Verifique a configuração e conexão com o serviço.',
      recoverable: true,
      details: this.debug ? { error: error.message, context } : undefined
    };
  }

  /**
   * Trata erros de runtime (exceções não previstas)
   * @private
   */
  handleRuntimeError(error, context) {
    return {
      category: 'runtime',
      message: 'Erro inesperado',
      suggestion: 'Se o problema persistir, ative o modo debug (DEBUG=true) e verifique os logs.',
      recoverable: false,
      details: this.debug ? { error: error.message, stack: error.stack, context } : undefined
    };
  }

  /**
   * Tenta recuperar de erro executando fallback
   *
   * @param {Error} error - Erro a recuperar
   * @param {Function} fallback - Função de fallback
   * @returns {any} Resultado do fallback
   * @throws {Error} Se fallback também falhar
   */
  async recover(error, fallback) {
    if (this.logger) {
      this.logger.warn('Attempting error recovery', { error: error.message });
    }

    try {
      const result = await fallback();

      if (this.logger) {
        this.logger.info('Error recovery successful');
      }

      return result;
    } catch (recoveryError) {
      if (this.logger) {
        this.logger.error('Error recovery failed', recoveryError);
      }

      throw new Error(`Recovery failed: ${recoveryError.message}`);
    }
  }

  /**
   * Cria mensagem de erro user-friendly
   *
   * @param {ErrorResponse} errorResponse - Resposta de erro
   * @returns {string} Mensagem formatada
   */
  formatUserMessage(errorResponse) {
    const lines = [];

    lines.push(`❌ ${errorResponse.message}`);

    if (errorResponse.suggestion) {
      lines.push(`💡 ${errorResponse.suggestion}`);
    }

    if (this.debug && errorResponse.details) {
      lines.push('\n🔍 Detalhes técnicos:');
      lines.push(JSON.stringify(errorResponse.details, null, 2));
    }

    return lines.join('\n');
  }

  /**
   * Habilita modo debug
   */
  enableDebug() {
    this.debug = true;
  }

  /**
   * Desabilita modo debug
   */
  disableDebug() {
    this.debug = false;
  }

  /**
   * Define logger
   *
   * @param {Object} logger - Logger instance
   */
  setLogger(logger) {
    this.logger = logger;
  }
}

module.exports = ErrorHandler;
