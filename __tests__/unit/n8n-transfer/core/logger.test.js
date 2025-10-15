/**
 * @fileoverview Testes unitários para Logger
 * @module tests/unit/core/logger.test
 */

const Logger = require('../../../../scripts/admin/n8n-transfer/core/logger');
const fs = require('fs');
const path = require('path');

describe('Logger', () => {
  let logger;
  const testLogFile = path.join(__dirname, '../../../../scripts/admin/n8n-transfer/logs/test.log');

  beforeEach(() => {
    // Setup será feito aqui
    // Limpar arquivo de log de teste se existir
    if (fs.existsSync(testLogFile)) {
      fs.unlinkSync(testLogFile);
    }

    logger = new Logger({
      level: 'DEBUG',
      enableFileLogging: true,
      enableConsoleLogging: false, // Desabilitar console para testes
      logFilePath: testLogFile,
    });
  });

  afterEach(() => {
    // Limpar arquivo de log após cada teste
    if (fs.existsSync(testLogFile)) {
      fs.unlinkSync(testLogFile);
    }
  });

  describe('constructor()', () => {
    it('deve criar logger com configuração padrão', () => {
      const defaultLogger = new Logger();

      expect(defaultLogger.level).toBe('INFO');
      expect(defaultLogger.enableFileLogging).toBe(true);
      expect(defaultLogger.enableConsoleLogging).toBe(true);
    });

    it('deve aceitar configuração customizada', () => {
      const customLogger = new Logger({
        level: 'ERROR',
        enableFileLogging: false,
      });

      expect(customLogger.level).toBe('ERROR');
      expect(customLogger.enableFileLogging).toBe(false);
    });

    it('deve rejeitar nível de log inválido', () => {
      expect(() => {
        new Logger({ level: 'INVALID' });
      }).toThrow('Nível de log inválido');
    });

    it('deve criar diretório de logs se não existir', () => {
      const logDir = path.dirname(testLogFile);

      expect(fs.existsSync(logDir)).toBe(true);
    });
  });

  describe('níveis de log', () => {
    it('deve logar mensagem DEBUG quando level=DEBUG', () => {
      logger.debug('Test debug message');

      logger.flush();
      const logContent = fs.readFileSync(testLogFile, 'utf-8');
      expect(logContent).toContain('[DEBUG]');
      expect(logContent).toContain('Test debug message');
    });

    it('deve logar mensagem INFO', () => {
      logger.info('Test info message');

      logger.flush();
      const logContent = fs.readFileSync(testLogFile, 'utf-8');
      expect(logContent).toContain('[INFO]');
      expect(logContent).toContain('Test info message');
    });

    it('deve logar mensagem WARN', () => {
      logger.warn('Test warning message');

      logger.flush();
      const logContent = fs.readFileSync(testLogFile, 'utf-8');
      expect(logContent).toContain('[WARN]');
      expect(logContent).toContain('Test warning message');
    });

    it('deve logar mensagem ERROR', () => {
      logger.error('Test error message');

      logger.flush();
      const logContent = fs.readFileSync(testLogFile, 'utf-8');
      expect(logContent).toContain('[ERROR]');
      expect(logContent).toContain('Test error message');
    });

    it('não deve logar DEBUG quando level=INFO', () => {
      const infoLogger = new Logger({
        level: 'INFO',
        enableFileLogging: true,
        enableConsoleLogging: false,
        logFilePath: testLogFile,
      });

      infoLogger.debug('This should not appear');
      infoLogger.info('This should appear');

      logger.flush();
      const logContent = fs.readFileSync(testLogFile, 'utf-8');
      expect(logContent).not.toContain('This should not appear');
      expect(logContent).toContain('This should appear');
    });

    it('não deve logar INFO/DEBUG quando level=ERROR', () => {
      const errorLogger = new Logger({
        level: 'ERROR',
        enableFileLogging: true,
        enableConsoleLogging: false,
        logFilePath: testLogFile,
      });

      errorLogger.debug('Debug message');
      errorLogger.info('Info message');
      errorLogger.warn('Warn message');
      errorLogger.error('Error message');

      logger.flush();
      const logContent = fs.readFileSync(testLogFile, 'utf-8');
      expect(logContent).not.toContain('Debug message');
      expect(logContent).not.toContain('Info message');
      expect(logContent).not.toContain('Warn message');
      expect(logContent).toContain('Error message');
    });
  });

  describe('mascaramento de dados sensíveis', () => {
    it('deve mascarar API keys no formato n8n_api_xxx', () => {
      logger.info('API key: n8n_api_1234567890abcdef');

      logger.flush();
      const logContent = fs.readFileSync(testLogFile, 'utf-8');
      expect(logContent).not.toContain('n8n_api_1234567890abcdef');
      expect(logContent).toContain('***');
    });

    it('deve mascarar Bearer tokens', () => {
      logger.info('Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');

      logger.flush();
      const logContent = fs.readFileSync(testLogFile, 'utf-8');
      expect(logContent).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(logContent).toContain('***');
    });

    it('deve mascarar passwords em URLs', () => {
      logger.info('Connecting to: user:mypassword123@server.com');

      logger.flush();
      const logContent = fs.readFileSync(testLogFile, 'utf-8');
      expect(logContent).not.toContain('mypassword123');
      expect(logContent).toContain('***');
    });

    it('deve mascarar api_key em JSON', () => {
      logger.info('Config: {"api_key": "secret123", "url": "https://example.com"}');

      logger.flush();
      const logContent = fs.readFileSync(testLogFile, 'utf-8');
      expect(logContent).not.toContain('secret123');
      expect(logContent).toContain('***');
    });

    it('deve mascarar múltiplos secrets na mesma mensagem', () => {
      logger.info('Keys: n8n_api_123 and Bearer xyz789');

      logger.flush();
      const logContent = fs.readFileSync(testLogFile, 'utf-8');
      expect(logContent).not.toContain('n8n_api_123');
      expect(logContent).not.toContain('xyz789');
      const maskCount = (logContent.match(/\*\*\*/g) || []).length;
      expect(maskCount).toBeGreaterThanOrEqual(2);
    });

    it('deve manter texto normal sem mascaramento', () => {
      logger.info('This is a normal message without secrets');

      logger.flush();
      const logContent = fs.readFileSync(testLogFile, 'utf-8');
      expect(logContent).toContain('This is a normal message without secrets');
      expect(logContent).not.toContain('***');
    });
  });

  describe('formato de log', () => {
    it('deve incluir timestamp ISO 8601', () => {
      logger.info('Test message');

      logger.flush();
      const logContent = fs.readFileSync(testLogFile, 'utf-8');
      // Formato: 2025-10-02T12:34:56.789Z
      expect(logContent).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
    });

    it('deve incluir nível entre colchetes', () => {
      logger.info('Test message');

      logger.flush();
      const logContent = fs.readFileSync(testLogFile, 'utf-8');
      expect(logContent).toMatch(/\[INFO\]/);
    });

    it('deve formatar mensagem completa corretamente', () => {
      logger.info('Test message');

      logger.flush();
      const logContent = fs.readFileSync(testLogFile, 'utf-8');
      // Formato esperado: [TIMESTAMP] [LEVEL] message
      expect(logContent).toMatch(/\d{4}-\d{2}-\d{2}T.*\[INFO\]\s+Test message/);
    });
  });

  describe('metadata', () => {
    it('deve logar metadata como JSON', () => {
      logger.info('Operation completed', { duration: 1234, status: 'success' });

      logger.flush();
      const logContent = fs.readFileSync(testLogFile, 'utf-8');
      expect(logContent).toContain('duration');
      expect(logContent).toContain('1234');
      expect(logContent).toContain('success');
    });

    it('deve mascarar secrets em metadata', () => {
      logger.info('Config loaded', { apiKey: 'secret123', url: 'https://example.com' });

      logger.flush();
      const logContent = fs.readFileSync(testLogFile, 'utf-8');
      expect(logContent).not.toContain('secret123');
      expect(logContent).toContain('***');
    });

    it('deve logar objetos complexos', () => {
      logger.info('Complex data', {
        nested: {
          level: 2,
          array: [1, 2, 3],
        },
      });

      logger.flush();
      const logContent = fs.readFileSync(testLogFile, 'utf-8');
      expect(logContent).toContain('nested');
      expect(logContent).toContain('array');
    });
  });

  describe('file logging', () => {
    it('deve criar arquivo de log se não existir', () => {
      expect(fs.existsSync(testLogFile)).toBe(true);
    });

    it('deve fazer append ao arquivo existente', () => {
      logger.info('First message');
      logger.info('Second message');

      logger.flush();
      const logContent = fs.readFileSync(testLogFile, 'utf-8');
      expect(logContent).toContain('First message');
      expect(logContent).toContain('Second message');

      const lines = logContent.trim().split('\n');
      expect(lines.length).toBeGreaterThanOrEqual(2);
    });

    it('não deve logar em arquivo quando file logging desabilitado', () => {
      const noFileLogger = new Logger({
        enableFileLogging: false,
        enableConsoleLogging: false,
      });

      noFileLogger.info('This should not be in file');

      // Como o logger de teste usa outro arquivo, verificar que não foi criado arquivo padrão
      const defaultLogFile = path.join(
        __dirname,
        '../../../../scripts/admin/n8n-transfer/logs/transfer.log'
      );

      // Se o arquivo existir, verificar que não contém a mensagem
      if (fs.existsSync(defaultLogFile)) {
        const content = fs.readFileSync(defaultLogFile, 'utf-8');
        expect(content).not.toContain('This should not be in file');
      }
    });
  });

  describe('_shouldLog()', () => {
    it('deve permitir log de nível igual ou superior', () => {
      const infoLogger = new Logger({ level: 'INFO', enableFileLogging: false });

      expect(infoLogger._shouldLog('DEBUG')).toBe(false);
      expect(infoLogger._shouldLog('INFO')).toBe(true);
      expect(infoLogger._shouldLog('WARN')).toBe(true);
      expect(infoLogger._shouldLog('ERROR')).toBe(true);
    });
  });

  describe('_maskSensitiveData()', () => {
    it('deve retornar string vazia para input vazio', () => {
      const masked = logger._maskSensitiveData('');
      expect(masked).toBe('');
    });

    it('deve retornar mesma string se não houver secrets', () => {
      const text = 'This is a normal message';
      const masked = logger._maskSensitiveData(text);
      expect(masked).toBe(text);
    });
  });
});
