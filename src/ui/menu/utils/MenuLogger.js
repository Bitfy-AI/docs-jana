/**
 * MenuLogger - Sistema de logging para o menu interativo
 *
 * Responsável por:
 * - Logging de debug, info, warn, error
 * - Logging de performance de operações críticas
 * - Controle de verbosidade baseado em configuração
 * - Ocultar stack traces em produção
 *
 * Requirements: Manutenibilidade.1 (Logging)
 */

class MenuLogger {
  /**
   * @param {Object} options - Opções do logger
   * @param {string} [options.level='info'] - Nível de logging (debug, info, warn, error)
   * @param {boolean} [options.enabled=true] - Habilitar logging
   * @param {boolean} [options.timestamps=true] - Incluir timestamps
   * @param {boolean} [options.colors=true] - Usar cores no output
   */
  constructor(options = {}) {
    this.level = options.level || 'info';
    this.enabled = options.enabled !== false;
    this.timestamps = options.timestamps !== false;
    this.colors = options.colors !== false;
    this.debugMode = process.env.DEBUG === 'true';

    // Níveis de logging (menor número = mais importante)
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };

    // Cores ANSI
    this.colorCodes = {
      debug: '\x1b[36m',   // Cyan
      info: '\x1b[32m',    // Green
      warn: '\x1b[33m',    // Yellow
      error: '\x1b[31m',   // Red
      reset: '\x1b[0m'
    };

    // Performance timers
    this.timers = new Map();
  }

  /**
   * Verifica se deve logar baseado no nível
   * @private
   */
  shouldLog(level) {
    if (!this.enabled) {
      return false;
    }

    // Debug só loga se DEBUG=true
    if (level === 'debug' && !this.debugMode) {
      return false;
    }

    const currentLevel = this.levels[this.level] || 1;
    const messageLevel = this.levels[level] || 1;

    return messageLevel >= currentLevel;
  }

  /**
   * Formata mensagem de log
   * @private
   */
  format(level, message, data = null) {
    const parts = [];

    // Timestamp
    if (this.timestamps) {
      const now = new Date().toISOString();
      parts.push(`[${now}]`);
    }

    // Level
    const levelStr = level.toUpperCase().padEnd(5);

    if (this.colors) {
      const color = this.colorCodes[level] || '';
      parts.push(`${color}${levelStr}${this.colorCodes.reset}`);
    } else {
      parts.push(levelStr);
    }

    // Message
    parts.push(message);

    // Data (se fornecido)
    if (data) {
      if (typeof data === 'object') {
        parts.push(JSON.stringify(data, null, 2));
      } else {
        parts.push(String(data));
      }
    }

    return parts.join(' ');
  }

  /**
   * Log de debug (apenas se DEBUG=true)
   *
   * @param {string} message - Mensagem
   * @param {any} [data] - Dados adicionais
   */
  debug(message, data = null) {
    if (this.shouldLog('debug')) {
      console.debug(this.format('debug', message, data));
    }
  }

  /**
   * Log de informação
   *
   * @param {string} message - Mensagem
   * @param {any} [data] - Dados adicionais
   */
  info(message, data = null) {
    if (this.shouldLog('info')) {
      console.log(this.format('info', message, data));
    }
  }

  /**
   * Log de warning
   *
   * @param {string} message - Mensagem
   * @param {any} [data] - Dados adicionais
   */
  warn(message, data = null) {
    if (this.shouldLog('warn')) {
      console.warn(this.format('warn', message, data));
    }
  }

  /**
   * Log de erro
   *
   * @param {string} message - Mensagem
   * @param {Error} error - Objeto de erro
   * @param {Object} [context] - Contexto adicional
   */
  error(message, error, context = {}) {
    if (this.shouldLog('error')) {
      const data = {
        error: error.message,
        code: error.code,
        ...context
      };

      // Incluir stack trace apenas em debug
      if (this.debugMode && error.stack) {
        data.stack = error.stack;
      }

      console.error(this.format('error', message, data));
    }
  }

  /**
   * Inicia timer de performance
   *
   * @param {string} operation - Nome da operação
   */
  startTimer(operation) {
    this.timers.set(operation, Date.now());
  }

  /**
   * Para timer e loga performance
   *
   * @param {string} operation - Nome da operação
   * @returns {number} Duração em ms
   */
  endTimer(operation) {
    const startTime = this.timers.get(operation);

    if (!startTime) {
      this.warn(`Timer not found for operation: ${operation}`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(operation);

    this.performance(operation, duration);

    return duration;
  }

  /**
   * Log de performance
   *
   * @param {string} operation - Nome da operação
   * @param {number} duration - Duração em ms
   */
  performance(operation, duration) {
    if (this.debugMode) {
      const message = `Performance: ${operation} completed in ${duration}ms`;

      // Alerta se operação demorou muito
      if (duration > 1000) {
        this.warn(message, { slow: true });
      } else {
        this.debug(message);
      }
    }
  }

  /**
   * Define nível de logging
   *
   * @param {string} level - Novo nível (debug, info, warn, error)
   */
  setLevel(level) {
    if (this.levels[level] !== undefined) {
      this.level = level;
    } else {
      this.warn(`Invalid log level: ${level}`);
    }
  }

  /**
   * Habilita logging
   */
  enable() {
    this.enabled = true;
  }

  /**
   * Desabilita logging
   */
  disable() {
    this.enabled = false;
  }

  /**
   * Habilita timestamps
   */
  enableTimestamps() {
    this.timestamps = true;
  }

  /**
   * Desabilita timestamps
   */
  disableTimestamps() {
    this.timestamps = false;
  }

  /**
   * Habilita cores
   */
  enableColors() {
    this.colors = true;
  }

  /**
   * Desabilita cores
   */
  disableColors() {
    this.colors = false;
  }
}

module.exports = MenuLogger;
