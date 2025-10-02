/**
 * Unit Tests - EdgeCaseHandler
 *
 * Testes para tratamento de casos extremos e situações especiais.
 * Cobre detecção de duplicatas, validação de códigos, sanitização e erros.
 *
 * @module __tests__/unit/edge-case-handler.test
 */

// Mock environment variables before loading modules
process.env.SOURCE_N8N_URL = 'http://test.com';
process.env.SOURCE_N8N_API_KEY = 'test-key';

// Mock Logger before requiring the module
jest.mock('../../../../../src/utils/logger', () => {
  return jest.fn().mockImplementation(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }));
});

const EdgeCaseHandler = require('../../utils/edge-case-handler');

describe('EdgeCaseHandler', () => {
  let handler;
  let mockLogger;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    handler = new EdgeCaseHandler(mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('detectDuplicateNames', () => {
    it('should detect duplicate workflow names', () => {
      const workflows = [
        { id: '1', name: { new: 'Workflow Teste' }, code: 'TST-001' },
        { id: '2', name: { new: 'Workflow Teste' }, code: 'TST-002' },
        { id: '3', name: { new: 'Unique' }, code: 'TST-003' }
      ];

      const result = handler.detectDuplicateNames(workflows);

      expect(result.hasDuplicates).toBe(true);
      expect(result.duplicates.size).toBe(1);
      expect(result.duplicates.get('Workflow Teste')).toHaveLength(2);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should return no duplicates for unique names', () => {
      const workflows = [
        { id: '1', name: { new: 'Workflow 1' }, code: 'TST-001' },
        { id: '2', name: { new: 'Workflow 2' }, code: 'TST-002' }
      ];

      const result = handler.detectDuplicateNames(workflows);

      expect(result.hasDuplicates).toBe(false);
      expect(result.duplicates.size).toBe(0);
    });

    it('should handle workflows without name.new', () => {
      const workflows = [
        { id: '1', name: 'Direct Name', code: 'TST-001' },
        { id: '2', name: 'Direct Name', code: 'TST-002' }
      ];

      const result = handler.detectDuplicateNames(workflows);

      expect(result.hasDuplicates).toBe(true);
      expect(result.duplicates.get('Direct Name')).toHaveLength(2);
    });

    it('should handle empty array', () => {
      const result = handler.detectDuplicateNames([]);

      expect(result.hasDuplicates).toBe(false);
      expect(result.duplicates.size).toBe(0);
    });

    it('should log details of duplicates', () => {
      const workflows = [
        { id: '1', name: { new: 'Dup' }, code: 'TST-001' },
        { id: '2', name: { new: 'Dup' }, code: 'TST-002' }
      ];

      handler.detectDuplicateNames(workflows);

      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('duplicado'));
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('ID: 1'));
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('ID: 2'));
    });
  });

  describe('validateWorkflowCodes', () => {
    it('should detect placeholder codes AAA-AAA-###', () => {
      const workflows = [
        { id: '1', name: { new: 'Workflow Test' }, code: 'AAA-AAA-001' },
        { id: '2', name: { new: 'Valid' }, code: 'TST-001' }
      ];

      const result = handler.validateWorkflowCodes(workflows);

      expect(result.hasInvalidCodes).toBe(true);
      expect(result.invalidCodes).toHaveLength(1);
      expect(result.invalidCodes[0].code).toBe('AAA-AAA-001');
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('placeholder'));
    });

    it('should detect empty codes', () => {
      const workflows = [
        { id: '1', name: { new: 'No Code' }, code: '' },
        { id: '2', name: { new: 'Also No Code' }, code: null }
      ];

      const result = handler.validateWorkflowCodes(workflows);

      expect(result.hasInvalidCodes).toBe(true);
      expect(result.invalidCodes).toHaveLength(2);
    });

    it('should return no invalid codes for valid workflows', () => {
      const workflows = [
        { id: '1', name: { new: 'WF1' }, code: 'BCO-ATU-001' },
        { id: '2', name: { new: 'WF2' }, code: 'TST-002' }
      ];

      const result = handler.validateWorkflowCodes(workflows);

      expect(result.hasInvalidCodes).toBe(false);
      expect(result.invalidCodes).toHaveLength(0);
    });

    it('should handle case-insensitive placeholder detection', () => {
      const workflows = [
        { id: '1', name: { new: 'Test' }, code: 'aaa-aaa-999' }
      ];

      const result = handler.validateWorkflowCodes(workflows);

      expect(result.hasInvalidCodes).toBe(true);
    });
  });

  describe('sanitizeName', () => {
    it('should remove emojis from name', () => {
      const sanitized = handler.sanitizeName('Workflow 🚀 Test');
      expect(sanitized).toBe('Workflow Test'); // Spaces normalized
    });

    it('should remove brackets and parentheses', () => {
      const sanitized = handler.sanitizeName('Workflow [Beta] (Test)');
      expect(sanitized).toBe('Workflow Beta Test'); // Spaces normalized
    });

    it('should normalize multiple spaces', () => {
      const sanitized = handler.sanitizeName('Workflow    with    spaces');
      expect(sanitized).toBe('Workflow with spaces');
    });

    it('should remove control characters', () => {
      const sanitized = handler.sanitizeName('Workflow\x00\x1FTest');
      expect(sanitized).toBe('WorkflowTest');
    });

    it('should trim whitespace', () => {
      const sanitized = handler.sanitizeName('  Workflow Test  ');
      expect(sanitized).toBe('Workflow Test');
    });

    it('should return "Unknown" for null or undefined', () => {
      expect(handler.sanitizeName(null)).toBe('Unknown');
      expect(handler.sanitizeName(undefined)).toBe('Unknown');
    });

    it('should return "Unknown" for non-string input', () => {
      expect(handler.sanitizeName(123)).toBe('Unknown');
      expect(handler.sanitizeName({})).toBe('Unknown');
    });

    it('should handle complex emoji combinations', () => {
      const sanitized = handler.sanitizeName('Test 😀🎉🚀🇧🇷');
      expect(sanitized).not.toContain('😀');
      expect(sanitized).not.toContain('🎉');
      expect(sanitized).not.toContain('🚀');
    });
  });

  describe('handleRateLimit', () => {
    it('should increase backoff delay on 429 error', () => {
      const error = new Error('Rate limit');
      error.statusCode = 429;

      const result = handler.handleRateLimit(error, 0); // Pass attempt number, not config

      expect(result.shouldRetry).toBe(true); // Correct property name
      expect(result.delay).toBeGreaterThan(1000); // Correct property name
      expect(result.message).toContain('Rate limit');
    });

    it('should return false for non-429 errors', () => {
      const error = new Error('Other error');
      error.statusCode = 500;

      const result = handler.handleRateLimit(error, 0); // Pass attempt number, not config

      expect(result.shouldRetry).toBe(false); // Correct property name
    });
  });

  describe('isIdempotencyError', () => {
    it('should detect 409 Conflict as idempotency error', () => {
      const error = new Error('Conflict');
      error.statusCode = 409;

      const isIdem = handler.isIdempotencyError(error);
      expect(isIdem).toBe(true);
    });

    it('should return false for non-409 errors', () => {
      const error = new Error('Other');
      error.statusCode = 400;

      const isIdem = handler.isIdempotencyError(error);
      expect(isIdem).toBe(false);
    });
  });

  describe('handleTimeout', () => {
    it('should increase timeout for ETIMEDOUT', () => {
      const error = new Error('Timeout');
      error.code = 'ETIMEDOUT';

      const result = handler.handleTimeout(error, { timeout: 5000 });

      expect(result.isTimeout).toBe(true);
      expect(result.newTimeout).toBe(7500); // 50% increase
      expect(result.shouldRetry).toBe(true);
    });

    it('should respect maximum timeout limit', () => {
      const error = new Error('Timeout');
      error.code = 'ETIMEDOUT';

      const result = handler.handleTimeout(error, { timeout: 50000 });

      expect(result.newTimeout).toBeLessThanOrEqual(60000); // Max timeout
    });

    it('should handle ECONNRESET as timeout', () => {
      const error = new Error('Connection reset');
      error.code = 'ECONNRESET';

      const result = handler.handleTimeout(error, { timeout: 5000 });

      expect(result.isTimeout).toBe(true);
      expect(result.shouldRetry).toBe(true);
    });

    it('should return false for non-timeout errors', () => {
      const error = new Error('Other error');

      const result = handler.handleTimeout(error, { timeout: 5000 });

      expect(result.isTimeout).toBe(false);
      expect(result.shouldRetry).toBe(false);
    });
  });

  describe('validateResponse', () => {
    it('should validate valid JSON response', () => {
      const response = { data: { id: '123', name: 'Test' } };

      const result = handler.validateResponse(response);

      expect(result.isValid).toBe(true);
    });

    it('should detect empty responses', () => {
      const result = handler.validateResponse(null);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('null'); // English error message
    });

    it('should detect malformed responses', () => {
      const response = 'not an object';

      const result = handler.validateResponse(response);

      expect(result.isValid).toBe(false);
    });
  });
});
