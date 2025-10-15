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

/**
 * @class ErrorHandler
 * @description Sistema centralizado de tratamento de erros com categorização automática,
 * mensagens amigáveis, e estratégias de recuperação. Suporta 4 categorias de erro:
 * user-input, system, command-execution, e runtime.
 *
 * @example
 * // Criar handler com logger
 * const handler = new ErrorHandler({
 *   debug: true,
 *   logger: new MenuLogger()
 * });
 *
 * // Tratar erro
 * try {
 *   throw new Error('Invalid input: email required');
 * } catch (error) {
 *   const response = handler.handle(error, { field: 'email' });
 *   console.log(handler.formatUserMessage(response));
 *   // Output: ❌ Invalid input: email required
 *   //         💡 Verifique os dados informados e tente novamente.
 * }
 *
 * // Recuperar de erro com fallback
 * const result = await handler.recover(error, async () => {
 *   return await loadFromCache();
 * });
 */
class ErrorHandler {
  /**
   * Cria instância do ErrorHandler
   * @param {Object} options - Opções do error handler
   * @param {boolean} [options.debug=false] - Habilitar modo debug (mostra detalhes técnicos)
   * @param {Object} [options.logger=null] - Logger opcional para registro de erros
   * @example
   * const handler = new ErrorHandler({ debug: true });
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
   * Trata erro e retorna resposta estruturada com mensagem amigável e sugestão de ação
   *
   * @param {Error} error - Erro a tratar
   * @param {Object} [context={}] - Contexto adicional do erro (ex: {command: 'upload', file: 'data.json'})
   * @returns {ErrorResponse} Resposta de erro estruturada
   *
   * @typedef {Object} ErrorResponse
   * @property {string} category - Categoria do erro (user-input, system, command-execution, runtime)
   * @property {string} message - Mensagem amigável ao usuário
   * @property {string} suggestion - Sugestão de ação para resolver
   * @property {boolean} recoverable - Indica se erro é recuperável
   * @property {Object} [details] - Detalhes técnicos (apenas em modo debug)
   *
   * @example
   * // Tratar erro de arquivo não encontrado
   * try {
   *   await fs.readFile('/path/to/missing.json');
   * } catch (error) {
   *   const response = handler.handle(error, { file: 'config.json' });
   *   console.log(response);
   *   // {
   *   //   category: 'system',
   *   //   message: 'Arquivo ou diretório não encontrado',
   *   //   suggestion: 'Verifique o caminho do arquivo e tente novamente.',
   *   //   recoverable: true
   *   // }
   * }
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
   * Tenta recuperar de erro executando função de fallback
   *
   * @param {Error} error - Erro original do qual tentar recuperar
   * @param {Function} fallback - Função async de fallback a executar
   * @returns {Promise<any>} Resultado da função de fallback
   * @throws {Error} Se fallback também falhar
   *
   * @example
   * // Recuperar de erro de API usando cache local
   * try {
   *   const data = await fetchFromAPI();
   * } catch (error) {
   *   const cachedData = await handler.recover(error, async () => {
   *     return await loadFromCache();
   *   });
   *   return cachedData;
   * }
   *
   * @example
   * // Recuperar com valor padrão
   * const config = await handler.recover(error, async () => {
   *   return { theme: 'default', lang: 'en' };
   * });
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
   * Formata resposta de erro em mensagem user-friendly com emojis e formatação
   *
   * @param {ErrorResponse} errorResponse - Resposta de erro do método handle()
   * @returns {string} Mensagem formatada pronta para exibir ao usuário
   *
   * @example
   * const response = handler.handle(error, { command: 'upload' });
   * const message = handler.formatUserMessage(response);
   * console.error(message);
   * // Output:
   * // ❌ Falha ao executar comando
   * // 💡 Verifique a configuração e conexão com o serviço.
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
   * Habilita modo debug para exibir detalhes técnicos nos erros
   *
   * @example
   * handler.enableDebug();
   * // Agora ErrorResponse.details será incluído
   */
  enableDebug() {
    this.debug = true;
  }

  /**
   * Desabilita modo debug para ocultar detalhes técnicos
   *
   * @example
   * handler.disableDebug();
   * // Agora apenas mensagens amigáveis serão exibidas
   */
  disableDebug() {
    this.debug = false;
  }

  /**
   * Define ou atualiza instância do logger
   *
   * @param {Object} logger - Instância de logger com métodos error(), warn(), info()
   *
   * @example
   * const logger = new MenuLogger({ level: 'debug' });
   * handler.setLogger(logger);
   * // Agora todos os erros serão registrados via logger
   */
  setLogger(logger) {
    this.logger = logger;
  }
}

module.exports = ErrorHandler;
