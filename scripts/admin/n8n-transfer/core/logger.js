/**
 * Logger - Sistema de logging estruturado com suporte a níveis, mascaramento de dados sensíveis e rotação de logs
 *
 * @module scripts/admin/n8n-transfer/core/logger
 * @description Logger estruturado com suporte a múltiplos níveis (DEBUG, INFO, WARN, ERROR),
 * logging em arquivo com timestamps, mascaramento automático de API keys e secrets,
 * output diferenciado para console (com cores) vs arquivo (plain text), e rotação de logs opcional.
 *
 * @example
 * // Criar logger básico
 * const logger = new Logger({ level: 'INFO' });
 * logger.info('Transferência iniciada');
 * logger.warn('API key antiga detectada');
 * logger.error('Falha na conexão', { error: err });
 *
 * @example
 * // Logger com arquivo e rotação
 * const logger = new Logger({
 *   level: 'DEBUG',
 *   enableFileLogging: true,
 *   logFilePath: './logs/transfer.log',
 *   enableRotation: true
 * });
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes (fallback se chalk não disponível ou for ESM-only)
const colors = {
  reset: '\x1b[0m',
  gray: '\x1b[90m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  white: '\x1b[37m',
};

// =============================================================================
// TYPESCRIPT/JSDOC TYPE DEFINITIONS
// =============================================================================

/**
 * Níveis de log disponíveis
 * @typedef {'DEBUG' | 'INFO' | 'WARN' | 'ERROR'} LogLevel
 */

/**
 * Configuração do Logger
 *
 * @typedef {Object} LoggerConfig
 * @property {LogLevel} [level='INFO'] - Nível mínimo de log (default: INFO)
 * @property {boolean} [enableFileLogging=true] - Ativar logging em arquivo (default: true)
 * @property {boolean} [enableConsoleLogging=true] - Ativar logging no console (default: true)
 * @property {string} [logFilePath] - Caminho do arquivo de log (default: ./logs/transfer.log)
 * @property {boolean} [enableRotation=false] - Ativar rotação de logs com winston (default: false)
 * @property {string} [maxSize='10m'] - Tamanho máximo do arquivo antes de rotação (ex: '10m', '100k')
 * @property {number} [maxFiles=5] - Número máximo de arquivos de log rotacionados
 *
 * @example
 * const config = {
 *   level: 'DEBUG',
 *   enableFileLogging: true,
 *   logFilePath: './logs/transfer.log',
 *   enableRotation: true,
 *   maxSize: '10m',
 *   maxFiles: 5
 * };
 */

/**
 * Entrada de log estruturada
 *
 * @typedef {Object} LogEntry
 * @property {string} timestamp - Timestamp ISO 8601
 * @property {LogLevel} level - Nível do log
 * @property {string} message - Mensagem de log
 * @property {Object} [metadata] - Metadados adicionais
 */

// =============================================================================
// LOGGER CLASS
// =============================================================================

// Hierarquia de níveis de log (menor número = mais prioritário)
const LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// Regex patterns para detectar dados sensíveis
const SENSITIVE_PATTERNS = [
  // API Keys (n8n_api_*, Bearer tokens, etc)
  /\b(n8n_api_[a-zA-Z0-9_-]+)/gi,
  /\b(Bearer\s+[a-zA-Z0-9_\-.]+)/gi,
  /\b([a-zA-Z0-9_-]{32,})/g, // Tokens longos genéricos

  // Passwords em URLs ou JSON
  /(password["\s:=]+)([^"\s&,}]+)/gi,
  /(pwd["\s:=]+)([^"\s&,}]+)/gi,
  /(apikey["\s:=]+)([^"\s&,}]+)/gi,
  /(api_key["\s:=]+)([^"\s&,}]+)/gi,
  /(token["\s:=]+)([^"\s&,}]+)/gi,
  /(secret["\s:=]+)([^"\s&,}]+)/gi,
];

/**
 * Logger estruturado para N8N Transfer System
 *
 * @class
 * @description Implementa logging com níveis, mascaramento de secrets, output diferenciado
 * para console (colorido) e arquivo (plain text), e suporte opcional a rotação de logs.
 *
 * @example
 * const logger = new Logger({ level: 'INFO' });
 * logger.info('Operação iniciada');
 * logger.debug('Detalhes técnicos', { url: 'https://api.example.com' });
 * logger.warn('Aviso importante');
 * logger.error('Erro crítico', { error: new Error('Falha') });
 */
class Logger {

  /**
   * Cria uma nova instância do Logger
   *
   * @param {LoggerConfig} [config={}] - Configuração do logger
   * @throws {Error} Se nível de log inválido for especificado
   *
   * @example
   * const logger = new Logger({
   *   level: 'DEBUG',
   *   enableFileLogging: true,
   *   logFilePath: './logs/app.log'
   * });
   */
  constructor(config = {}) {
    // Validar e definir nível de log
    this.level = (config.level || 'INFO').toUpperCase();
    if (!Object.prototype.hasOwnProperty.call(LEVELS, this.level)) {
      throw new Error(`Nível de log inválido: ${this.level}. Use DEBUG, INFO, WARN ou ERROR.`);
    }

    // Configurações de logging
    this.enableFileLogging = config.enableFileLogging ?? true;
    this.enableConsoleLogging = config.enableConsoleLogging ?? true;

    // Configuração de arquivo de log
    const defaultLogPath = path.join(process.cwd(), 'scripts', 'admin', 'n8n-transfer', 'logs', 'transfer.log');
    this.logFilePath = config.logFilePath || defaultLogPath;

    // Configuração de rotação (winston)
    this.enableRotation = config.enableRotation ?? false;
    this.maxSize = config.maxSize || '10m';
    this.maxFiles = config.maxFiles || 5;

    // Inicializar logger (winston se rotação habilitada, senão file stream)
    if (this.enableRotation) {
      this._initWinstonLogger();
    } else if (this.enableFileLogging) {
      this._initFileLogger();
    }

    // Log inicial de configuração
    this.debug(`Logger inicializado: level=${this.level}, fileLogging=${this.enableFileLogging}, rotation=${this.enableRotation}`);
  }

  /**
   * Inicializa logger baseado em winston com rotação de logs
   *
   * @private
   * @throws {Error} Se winston não estiver instalado
   */
  _initWinstonLogger() {
    try {
      const winston = require('winston');
      require('winston-daily-rotate-file');

      const logDir = path.dirname(this.logFilePath);
      const logFileName = path.basename(this.logFilePath, '.log');

      // Criar diretório de logs se não existir
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      // Configurar transport de rotação diária
      const rotateTransport = new winston.transports.DailyRotateFile({
        filename: path.join(logDir, `${logFileName}-%DATE%.log`),
        datePattern: 'YYYY-MM-DD',
        maxSize: this.maxSize,
        maxFiles: `${this.maxFiles}d`,
        format: winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
          return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
        }),
      });

      this.winstonLogger = winston.createLogger({
        level: this.level.toLowerCase(),
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.errors({ stack: true })
        ),
        transports: [rotateTransport],
      });

      this.isWinston = true;
    } catch (error) {
      console.warn(`${colors.yellow}⚠️  Winston não disponível. Usando file logging simples. Instale winston com: pnpm add winston winston-daily-rotate-file${colors.reset}`);
      this.enableRotation = false;
      this._initFileLogger();
    }
  }

  /**
   * Inicializa logger baseado em file stream simples (sem rotação)
   *
   * @private
   */
  _initFileLogger() {
    const logDir = path.dirname(this.logFilePath);

    // Criar diretório de logs se não existir
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Criar arquivo de log se não existir
    if (!fs.existsSync(this.logFilePath)) {
      fs.writeFileSync(this.logFilePath, '', 'utf8');
    }

    this.fileStream = fs.createWriteStream(this.logFilePath, { flags: 'a', encoding: 'utf8' });
    this.isWinston = false;
  }

  /**
   * Verifica se um nível de log deve ser registrado baseado no nível configurado
   *
   * @private
   * @param {LogLevel} level - Nível do log a verificar
   * @returns {boolean} True se deve logar, false caso contrário
   */
  _shouldLog(level) {
    return LEVELS[level] >= LEVELS[this.level];
  }

  /**
   * Mascara dados sensíveis (API keys, tokens, passwords) em uma string
   *
   * @private
   * @param {string} text - Texto a ser mascarado
   * @returns {string} Texto com dados sensíveis mascarados
   *
   * @example
   * const masked = logger._maskSensitiveData('API Key: n8n_api_abc123xyz');
   * // Retorna: 'API Key: ***xyz'
   */
  _maskSensitiveData(text) {
    if (typeof text !== 'string') {
      return text;
    }

    let maskedText = text;

    // Aplicar todas as regex de mascaramento
    SENSITIVE_PATTERNS.forEach(pattern => {
      maskedText = maskedText.replace(pattern, (match, ...groups) => {
        // Se o padrão captura grupos, mascarar o último grupo (valor sensível)
        if (groups.length > 0) {
          const value = groups[groups.length - 2]; // Penúltimo elemento (último é offset)
          if (value && value.length > 3) {
            const masked = '*'.repeat(value.length - 3) + value.slice(-3);
            return match.replace(value, masked);
          }
        }

        // Mascaramento genérico para tokens longos (mostrar últimos 3 chars)
        if (match.length > 3) {
          return '*'.repeat(match.length - 3) + match.slice(-3);
        }

        return '***';
      });
    });

    return maskedText;
  }

  /**
   * Serializa metadados para string, mascarando dados sensíveis
   *
   * @private
   * @param {Object} metadata - Metadados a serializar
   * @returns {string} Metadados serializados e mascarados
   */
  _serializeMetadata(metadata) {
    if (!metadata || Object.keys(metadata).length === 0) {
      return '';
    }

    try {
      const serialized = JSON.stringify(metadata, null, 2);
      return this._maskSensitiveData(serialized);
    } catch (error) {
      return '[Erro ao serializar metadados]';
    }
  }

  /**
   * Formata entrada de log para console (com cores)
   *
   * @private
   * @param {LogLevel} level - Nível do log
   * @param {string} message - Mensagem
   * @param {Object} [metadata] - Metadados opcionais
   * @returns {string} Log formatado com cores
   */
  _formatConsoleLog(level, message, metadata) {
    const timestamp = new Date().toISOString();
    const coloredTimestamp = `${colors.gray}${timestamp}${colors.reset}`;

    let coloredLevel;
    switch (level) {
    case 'DEBUG':
      coloredLevel = `${colors.cyan}[DEBUG]${colors.reset}`;
      break;
    case 'INFO':
      coloredLevel = `${colors.blue}[INFO]${colors.reset}`;
      break;
    case 'WARN':
      coloredLevel = `${colors.yellow}[WARN]${colors.reset}`;
      break;
    case 'ERROR':
      coloredLevel = `${colors.red}[ERROR]${colors.reset}`;
      break;
    default:
      coloredLevel = `${colors.white}[${level}]${colors.reset}`;
    }

    const maskedMessage = this._maskSensitiveData(message);
    const metadataStr = this._serializeMetadata(metadata);

    let formatted = `${coloredTimestamp} ${coloredLevel} ${maskedMessage}`;
    if (metadataStr) {
      formatted += `\n${colors.gray}${metadataStr}${colors.reset}`;
    }

    return formatted;
  }

  /**
   * Formata entrada de log para arquivo (plain text, sem cores)
   *
   * @private
   * @param {LogLevel} level - Nível do log
   * @param {string} message - Mensagem
   * @param {Object} [metadata] - Metadados opcionais
   * @returns {string} Log formatado para arquivo
   */
  _formatFileLog(level, message, metadata) {
    const timestamp = new Date().toISOString();
    const maskedMessage = this._maskSensitiveData(message);
    const metadataStr = this._serializeMetadata(metadata);

    let formatted = `[${timestamp}] [${level}] ${maskedMessage}`;
    if (metadataStr) {
      formatted += ` ${metadataStr}`;
    }

    return formatted;
  }

  /**
   * Escreve log no arquivo
   *
   * @private
   * @param {LogLevel} level - Nível do log
   * @param {string} message - Mensagem
   * @param {Object} [metadata] - Metadados opcionais
   */
  _writeToFile(level, message, metadata) {
    if (!this.enableFileLogging) {
      return;
    }

    const formattedLog = this._formatFileLog(level, message, metadata);

    if (this.isWinston && this.winstonLogger) {
      // Usar winston
      this.winstonLogger.log({
        level: level.toLowerCase(),
        message: this._maskSensitiveData(message),
        ...metadata,
      });
    } else if (this.fileStream) {
      // Usar file stream simples
      this.fileStream.write(formattedLog + '\n');
    }
  }

  /**
   * Escreve log no console
   *
   * @private
   * @param {LogLevel} level - Nível do log
   * @param {string} message - Mensagem
   * @param {Object} [metadata] - Metadados opcionais
   */
  _writeToConsole(level, message, metadata) {
    if (!this.enableConsoleLogging) {
      return;
    }

    const formattedLog = this._formatConsoleLog(level, message, metadata);
    console.log(formattedLog);
  }

  /**
   * Método genérico de logging
   *
   * @private
   * @param {LogLevel} level - Nível do log
   * @param {string} message - Mensagem de log
   * @param {Object} [metadata] - Metadados adicionais
   */
  _log(level, message, metadata) {
    if (!this._shouldLog(level)) {
      return;
    }

    this._writeToConsole(level, message, metadata);
    this._writeToFile(level, message, metadata);
  }

  /**
   * Log de nível DEBUG
   *
   * @param {string} message - Mensagem de log
   * @param {Object} [metadata] - Metadados adicionais
   *
   * @example
   * logger.debug('Requisição HTTP iniciada', { url: 'https://api.example.com', method: 'GET' });
   */
  debug(message, metadata) {
    this._log('DEBUG', message, metadata);
  }

  /**
   * Log de nível INFO
   *
   * @param {string} message - Mensagem de log
   * @param {Object} [metadata] - Metadados adicionais
   *
   * @example
   * logger.info('Transferência concluída com sucesso', { totalWorkflows: 10 });
   */
  info(message, metadata) {
    this._log('INFO', message, metadata);
  }

  /**
   * Log de nível WARN
   *
   * @param {string} message - Mensagem de log
   * @param {Object} [metadata] - Metadados adicionais
   *
   * @example
   * logger.warn('API key está próxima da expiração', { daysRemaining: 7 });
   */
  warn(message, metadata) {
    this._log('WARN', message, metadata);
  }

  /**
   * Log de nível ERROR
   *
   * @param {string} message - Mensagem de log
   * @param {Object} [metadata] - Metadados adicionais (incluindo error.stack)
   *
   * @example
   * try {
   *   // código que pode falhar
   * } catch (error) {
   *   logger.error('Falha na transferência de workflow', { error: error.message, stack: error.stack });
   * }
   */
  error(message, metadata) {
    this._log('ERROR', message, metadata);
  }

  /**
   * Fecha o logger gracefully (fecha file streams e winston transports)
   *
   * @returns {Promise<void>}
   *
   * @example
   * await logger.close();
   */
  async close() {
    return new Promise((resolve) => {
      if (this.isWinston && this.winstonLogger) {
        this.winstonLogger.end(() => {
          this.debug('Logger fechado (winston)');
          resolve();
        });
      } else if (this.fileStream) {
        this.fileStream.end(() => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = Logger;
