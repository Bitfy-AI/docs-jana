/**
 * Unit tests for LoggerFactory
 */

const LoggerFactory = require('../../../src/core/factories/logger-factory');
const { SimpleLogger } = LoggerFactory;

describe('LoggerFactory', () => {
  describe('create', () => {
    test('creates logger with default config', () => {
      const logger = LoggerFactory.create();
      expect(logger).toBeInstanceOf(SimpleLogger);
    });

    test('creates logger with custom level', () => {
      const logger = LoggerFactory.create({ level: 'debug' });
      expect(logger.config.level).toBe('debug');
    });

    test('creates logger with context', () => {
      const logger = LoggerFactory.create({ context: 'TEST' });
      expect(logger.config.context).toBe('TEST');
    });

    test('throws error for invalid log level', () => {
      expect(() => LoggerFactory.create({ level: 'invalid' }))
        .toThrow('Invalid log level');
    });

    test('throws error for invalid output', () => {
      expect(() => LoggerFactory.create({ output: 'invalid' }))
        .toThrow('Invalid output');
    });

    test('throws error for file output without filePath', () => {
      expect(() => LoggerFactory.create({ output: 'file' }))
        .toThrow('filePath is required');
    });
  });

  describe('SimpleLogger', () => {
    let logger;
    let consoleSpy;

    beforeEach(() => {
      logger = new SimpleLogger({ level: 'debug' });
      consoleSpy = {
        log: jest.spyOn(console, 'log').mockImplementation(),
        warn: jest.spyOn(console, 'warn').mockImplementation(),
        error: jest.spyOn(console, 'error').mockImplementation()
      };
    });

    afterEach(() => {
      Object.values(consoleSpy).forEach(spy => spy.mockRestore());
    });

    describe('log levels', () => {
      test('debug logs when level is debug', () => {
        logger.debug('test message');
        expect(consoleSpy.log).toHaveBeenCalled();
      });

      test('info logs when level is info or below', () => {
        logger.info('test message');
        expect(consoleSpy.log).toHaveBeenCalled();
      });

      test('warn logs when level is warn or below', () => {
        logger.warn('test message');
        expect(consoleSpy.warn).toHaveBeenCalled();
      });

      test('error always logs', () => {
        logger.error('test message');
        expect(consoleSpy.error).toHaveBeenCalled();
      });

      test('debug does not log when level is info', () => {
        const infoLogger = new SimpleLogger({ level: 'info' });
        infoLogger.debug('test message');
        expect(consoleSpy.log).not.toHaveBeenCalled();
      });
    });

    describe('sensitive data masking', () => {
      test('masks n8n API keys', () => {
        logger.info('API key: n8n_api_secretkey123');
        const call = consoleSpy.log.mock.calls[0][0];
        expect(call).toContain('***');
        expect(call).not.toContain('n8n_api_secretkey123');
      });

      test('masks Bearer tokens', () => {
        logger.info('Authorization: Bearer abc123def456');
        const call = consoleSpy.log.mock.calls[0][0];
        expect(call).toContain('***');
        expect(call).not.toContain('abc123def456');
      });

      test('masks passwords', () => {
        logger.info('password: mypass123');
        const call = consoleSpy.log.mock.calls[0][0];
        expect(call).toContain('***');
        expect(call).not.toContain('mypass123');
      });

      test('masks api keys', () => {
        logger.info('apikey: key12345');
        const call = consoleSpy.log.mock.calls[0][0];
        expect(call).toContain('***');
        expect(call).not.toContain('key12345');
      });

      test('keeps last 3 characters visible', () => {
        logger.info('token: abcdefghijk');
        const call = consoleSpy.log.mock.calls[0][0];
        expect(call).toContain('ijk');
      });
    });

    describe('message formatting', () => {
      test('includes timestamp when enabled', () => {
        const timestampLogger = new SimpleLogger({ includeTimestamp: true });
        timestampLogger.info('test');
        const call = consoleSpy.log.mock.calls[0][0];
        expect(call).toMatch(/\[\d{4}-\d{2}-\d{2}T/);
      });

      test('excludes timestamp when disabled', () => {
        const noTimestampLogger = new SimpleLogger({ includeTimestamp: false });
        noTimestampLogger.info('test');
        const call = consoleSpy.log.mock.calls[0][0];
        expect(call).not.toMatch(/\[\d{4}-\d{2}-\d{2}T/);
      });

      test('includes context when provided', () => {
        const contextLogger = new SimpleLogger({ context: 'HTTP' });
        contextLogger.info('test');
        const call = consoleSpy.log.mock.calls[0][0];
        expect(call).toContain('[HTTP]');
      });

      test('includes log level', () => {
        logger.info('test');
        const call = consoleSpy.log.mock.calls[0][0];
        expect(call).toContain('[INFO]');
      });
    });

    describe('child logger', () => {
      test('creates child with inherited config', () => {
        const child = logger.child('CHILD');
        expect(child).toBeInstanceOf(SimpleLogger);
        expect(child.config.context).toBe('CHILD');
      });

      test('child logs with parent config', () => {
        const child = logger.child('CHILD');
        child.info('test');
        const call = consoleSpy.log.mock.calls[0][0];
        expect(call).toContain('[CHILD]');
      });
    });

    describe('setLevel', () => {
      test('changes log level', () => {
        logger.setLevel('error');
        logger.info('should not log');
        expect(consoleSpy.log).not.toHaveBeenCalled();

        logger.error('should log');
        expect(consoleSpy.error).toHaveBeenCalled();
      });

      test('throws error for invalid level', () => {
        expect(() => logger.setLevel('invalid'))
          .toThrow('Invalid log level');
      });
    });

    describe('error logging', () => {
      test('logs error object stack trace', () => {
        const error = new Error('test error');
        logger.error('Error occurred', error);

        expect(consoleSpy.error).toHaveBeenCalledTimes(2);
        const secondCall = consoleSpy.error.mock.calls[1][0];
        expect(secondCall).toContain('Error: test error');
      });

      test('logs non-error data', () => {
        logger.error('Error occurred', { code: 500 });
        expect(consoleSpy.error).toHaveBeenCalledTimes(2);
      });
    });
  });
});
