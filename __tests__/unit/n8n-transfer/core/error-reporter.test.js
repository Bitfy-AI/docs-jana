/**
 * @fileoverview Testes unitários para ErrorReporter
 * @module tests/unit/core/error-reporter.test
 */

const ErrorReporter = require('../../../../scripts/admin/n8n-transfer/core/error-reporter');

describe('ErrorReporter', () => {
  let reporter;

  beforeEach(() => {
    reporter = new ErrorReporter();
  });

  describe('format()', () => {
    it('deve formatar erro de autenticação (401)', () => {
      const error = new Error('401 Unauthorized');
      const formatted = reporter.format(error);

      expect(formatted.type).toBe('AUTHENTICATION');
      expect(formatted.code).toBe('ERR_AUTH_INVALID');
      expect(formatted.message).toContain('Falha na autenticação');
      expect(formatted.suggestion).toContain('API key');
      expect(formatted.originalError).toBe(error);
    });

    it('deve formatar erro de rede (ECONNREFUSED)', () => {
      const error = new Error('Connection refused');
      error.code = 'ECONNREFUSED';
      const formatted = reporter.format(error);

      expect(formatted.type).toBe('NETWORK');
      expect(formatted.code).toBe('ERR_NETWORK');
      expect(formatted.message).toContain('Erro de rede');
      expect(formatted.suggestion).toContain('URL');
    });

    it('deve formatar erro de timeout', () => {
      const error = new Error('Request timeout');
      const formatted = reporter.format(error);

      expect(formatted.type).toBe('TIMEOUT');
      expect(formatted.code).toBe('ERR_TIMEOUT');
      expect(formatted.message).toContain('Timeout');
      expect(formatted.suggestion).toContain('timeout');
    });

    it('deve formatar erro de storage (ENOSPC)', () => {
      const error = new Error('No space left on device');
      error.code = 'ENOSPC';
      const formatted = reporter.format(error);

      expect(formatted.type).toBe('STORAGE');
      expect(formatted.code).toBe('ERR_STORAGE_FULL');
      expect(formatted.message).toContain('armazenamento');
      expect(formatted.suggestion).toContain('Disco cheio');
    });

    it('deve formatar erro de validação', () => {
      const error = new Error('Validation failed: name is required');
      const formatted = reporter.format(error);

      expect(formatted.type).toBe('VALIDATION');
      expect(formatted.code).toBe('ERR_VALIDATION');
      expect(formatted.message).toContain('validação');
    });

    it('deve formatar erro 404 como NOT_FOUND', () => {
      const error = new Error('404 Not Found');
      const formatted = reporter.format(error);

      expect(formatted.type).toBe('NOT_FOUND');
      expect(formatted.code).toBe('ERR_NOT_FOUND');
      expect(formatted.message).toContain('não encontrado');
    });

    it('deve formatar erro desconhecido', () => {
      const error = new Error('Something weird happened');
      const formatted = reporter.format(error);

      expect(formatted.type).toBe('UNKNOWN');
      expect(formatted.code).toBe('ERR_UNKNOWN');
      expect(formatted.suggestion).toContain('logs');
    });

    it('deve aceitar string e converter em Error', () => {
      const formatted = reporter.format('Simple error message');

      expect(formatted.type).toBe('UNKNOWN');
      expect(formatted.message).toContain('Simple error message');
      expect(formatted.originalError).toBeInstanceOf(Error);
    });

    it('deve incluir contexto adicional em details', () => {
      const error = new Error('Test error');
      const context = { operation: 'transfer', workflowId: '123' };
      const formatted = reporter.format(error, context);

      expect(formatted.details.operation).toBe('transfer');
      expect(formatted.details.workflowId).toBe('123');
      expect(formatted.details.timestamp).toBeDefined();
    });

    it('deve incluir stack trace em details', () => {
      const error = new Error('Test error');
      const formatted = reporter.format(error);

      expect(formatted.details.stack).toBeDefined();
      expect(formatted.details.errorMessage).toBe('Test error');
    });

    it('deve truncar mensagens muito longas', () => {
      const longMessage = 'A'.repeat(250);
      const error = new Error(longMessage);
      const formatted = reporter.format(error);

      expect(formatted.message.length).toBeLessThan(250);
      expect(formatted.message).toContain('...');
    });
  });

  describe('createError()', () => {
    it('deve criar erro formatado de tipo específico', () => {
      const formatted = reporter.createError('AUTHENTICATION', 'Custom auth error', {
        instance: 'SOURCE',
      });

      expect(formatted.type).toBe('AUTHENTICATION');
      expect(formatted.code).toBe('ERR_AUTH_INVALID');
      expect(formatted.message).toContain('Custom auth error');
      expect(formatted.details.instance).toBe('SOURCE');
    });

    it('deve criar erro de timeout customizado', () => {
      const formatted = reporter.createError('TIMEOUT', 'Operation took too long');

      expect(formatted.type).toBe('TIMEOUT');
      expect(formatted.code).toBe('ERR_TIMEOUT');
    });
  });

  describe('isErrorType()', () => {
    it('deve identificar tipo de erro formatado', () => {
      const error = new Error('401 Unauthorized');
      const formatted = reporter.format(error);

      expect(reporter.isErrorType(formatted, 'AUTHENTICATION')).toBe(true);
      expect(reporter.isErrorType(formatted, 'NETWORK')).toBe(false);
    });

    it('deve identificar tipo de Error não formatado', () => {
      const error = new Error('ECONNREFUSED');
      error.code = 'ECONNREFUSED';

      expect(reporter.isErrorType(error, 'NETWORK')).toBe(true);
      expect(reporter.isErrorType(error, 'TIMEOUT')).toBe(false);
    });

    it('deve retornar false para tipos não reconhecidos', () => {
      const formatted = reporter.format(new Error('Random error'));

      expect(reporter.isErrorType(formatted, 'AUTHENTICATION')).toBe(false);
      expect(reporter.isErrorType(formatted, 'NETWORK')).toBe(false);
    });
  });

  describe('formatMany()', () => {
    it('deve formatar múltiplos erros', () => {
      const errors = [
        new Error('401 Unauthorized'),
        new Error('ECONNREFUSED'),
        'Validation failed',
      ];

      const formatted = reporter.formatMany(errors);

      expect(formatted).toHaveLength(3);
      expect(formatted[0].type).toBe('AUTHENTICATION');
      expect(formatted[1].type).toBe('NETWORK');
      expect(formatted[2].type).toBe('VALIDATION');
    });

    it('deve aplicar contexto comum a todos os erros', () => {
      const errors = [new Error('Error 1'), new Error('Error 2')];
      const context = { operation: 'bulk-transfer' };

      const formatted = reporter.formatMany(errors, context);

      expect(formatted[0].details.operation).toBe('bulk-transfer');
      expect(formatted[1].details.operation).toBe('bulk-transfer');
    });

    it('deve retornar array vazio para lista vazia', () => {
      const formatted = reporter.formatMany([]);

      expect(formatted).toEqual([]);
    });
  });

  describe('_detectErrorType()', () => {
    it('deve detectar erro de API key inválida', () => {
      const error = new Error('Invalid API key provided');
      const type = reporter._detectErrorType(error);

      expect(type).toBe('AUTHENTICATION');
    });

    it('deve detectar erro ENOTFOUND como NETWORK', () => {
      const error = new Error('DNS lookup failed');
      error.code = 'ENOTFOUND';
      const type = reporter._detectErrorType(error);

      expect(type).toBe('NETWORK');
    });

    it('deve detectar ETIMEDOUT como TIMEOUT', () => {
      const error = new Error('Connection timeout');
      error.code = 'ETIMEDOUT';
      const type = reporter._detectErrorType(error);

      expect(type).toBe('TIMEOUT');
    });
  });

  describe('_extractMessage()', () => {
    it('deve extrair primeira linha da mensagem', () => {
      const error = new Error('First line\nSecond line\nThird line');
      const message = reporter._extractMessage(error);

      expect(message).toBe('First line');
      expect(message).not.toContain('\n');
    });

    it('deve truncar mensagens muito longas', () => {
      const longMessage = 'A'.repeat(250);
      const error = new Error(longMessage);
      const message = reporter._extractMessage(error);

      expect(message.length).toBeLessThanOrEqual(203); // 200 + '...'
      expect(message).toContain('...');
    });

    it('deve manter mensagens curtas intactas', () => {
      const error = new Error('Short message');
      const message = reporter._extractMessage(error);

      expect(message).toBe('Short message');
    });
  });
});
