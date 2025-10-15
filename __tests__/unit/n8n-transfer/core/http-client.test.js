/**
 * Unit Tests for N8N Transfer HttpClient
 *
 * Comprehensive test suite covering:
 * - All HTTP methods (getWorkflows, getWorkflow, createWorkflow, testConnection)
 * - Retry logic with exponential backoff (3 attempts)
 * - Timeout handling (10s default)
 * - Rate limiting (10 req/sec)
 * - Secure logging with API key masking
 * - Statistics tracking (getStats, resetStats)
 * - Error handling and validation
 *
 * Target: >80% code coverage
 */

const HttpClient = require('../../../../scripts/admin/n8n-transfer/core/http-client');
const https = require('https');
const http = require('http');

describe('HttpClient', () => {
  let mockLogger;
  let client;

  beforeEach(() => {
    // Create mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    // Create HttpClient instance
    client = new HttpClient({
      baseUrl: 'https://n8n.example.com',
      apiKey: 'test-api-key-12345',
      logger: mockLogger,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  // ==================== Constructor Tests ====================
  describe('Constructor', () => {
    it('should throw error if baseUrl is not provided', () => {
      expect(() => {
        new HttpClient({ apiKey: 'test-key' });
      }).toThrow('HttpClient: baseUrl é obrigatório');
    });

    it('should throw error if apiKey is not provided', () => {
      expect(() => {
        new HttpClient({ baseUrl: 'https://example.com' });
      }).toThrow('HttpClient: apiKey é obrigatório');
    });

    it('should remove trailing slash from baseUrl', () => {
      const client = new HttpClient({
        baseUrl: 'https://example.com/',
        apiKey: 'test-key',
      });
      expect(client.baseUrl).toBe('https://example.com');
    });

    it('should use default values for optional parameters', () => {
      const client = new HttpClient({
        baseUrl: 'https://example.com',
        apiKey: 'test-key',
      });

      expect(client.maxRetries).toBe(3);
      expect(client.timeout).toBe(10000);
      expect(client.maxRequestsPerSecond).toBe(10);
    });

    it('should accept custom configuration values', () => {
      const client = new HttpClient({
        baseUrl: 'https://example.com',
        apiKey: 'test-key',
        maxRetries: 5,
        timeout: 5000,
        maxRequestsPerSecond: 20,
      });

      expect(client.maxRetries).toBe(5);
      expect(client.timeout).toBe(5000);
      expect(client.maxRequestsPerSecond).toBe(20);
    });

    it('should create no-op logger if none provided', () => {
      const client = new HttpClient({
        baseUrl: 'https://example.com',
        apiKey: 'test-key',
      });

      // Should not throw when calling logger methods
      expect(() => {
        client.logger.debug('test');
        client.logger.info('test');
        client.logger.warn('test');
        client.logger.error('test');
      }).not.toThrow();
    });

    it('should initialize statistics object', () => {
      expect(client.stats).toEqual({
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        retriedRequests: 0,
        rateLimitedRequests: 0,
      });
    });
  });

  // ==================== API Key Masking Tests ====================
  describe('_maskApiKey', () => {
    it('should mask API key showing only last 3 characters', () => {
      const masked = client._maskApiKey('test-api-key-12345');
      // 'test-api-key-12345' has 18 characters, so 15 asterisks + last 3 chars
      expect(masked).toBe('***************345');
    });

    it('should return *** for empty API key', () => {
      expect(client._maskApiKey('')).toBe('***');
    });

    it('should return *** for API key shorter than 3 chars', () => {
      expect(client._maskApiKey('ab')).toBe('***');
    });

    it('should return *** for null/undefined', () => {
      expect(client._maskApiKey(null)).toBe('***');
      expect(client._maskApiKey(undefined)).toBe('***');
    });
  });

  // ==================== Rate Limiting Tests ====================
  describe('Rate Limiting', () => {
    it('should allow requests under rate limit', async () => {
      const startTime = Date.now();

      // Make 5 requests (under limit of 10)
      for (let i = 0; i < 5; i++) {
        await client._rateLimitCheck();
      }

      const elapsed = Date.now() - startTime;

      // Should complete quickly without waiting
      expect(elapsed).toBeLessThan(100);
      expect(client.stats.rateLimitedRequests).toBe(0);
    });

    it('should throttle requests when exceeding rate limit', async () => {
      const startTime = Date.now();

      // Make 11 requests (over limit of 10/sec)
      for (let i = 0; i < 11; i++) {
        await client._rateLimitCheck();
      }

      const elapsed = Date.now() - startTime;

      // Should have waited due to rate limiting
      expect(elapsed).toBeGreaterThanOrEqual(50); // At least some delay
      expect(client.stats.rateLimitedRequests).toBeGreaterThan(0);
    });

    it('should log when rate limit is hit', async () => {
      // Fill up rate limit
      for (let i = 0; i < 10; i++) {
        client.requestTimestamps.push(Date.now());
      }

      await client._rateLimitCheck();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Rate limit atingido')
      );
    });

    it('should clean old timestamps (>1 second)', async () => {
      const now = Date.now();
      client.requestTimestamps = [
        now - 2000, // Old (should be removed)
        now - 1500, // Old (should be removed)
        now - 500,  // Recent (should be kept)
      ];

      await client._rateLimitCheck();

      // Old timestamps should be filtered out
      expect(client.requestTimestamps.length).toBeLessThan(3);
    });
  });

  // ==================== Backoff Calculation Tests ====================
  describe('_calculateBackoff', () => {
    it('should calculate exponential backoff correctly', () => {
      expect(client._calculateBackoff(0)).toBe(1000);  // 1s
      expect(client._calculateBackoff(1)).toBe(2000);  // 2s
      expect(client._calculateBackoff(2)).toBe(4000);  // 4s
      expect(client._calculateBackoff(3)).toBe(8000);  // 8s
    });

    it('should use base delay of 1000ms', () => {
      const delay = client._calculateBackoff(0);
      expect(delay).toBe(1000);
    });
  });

  // ==================== Retry Logic Tests ====================
  describe('_shouldRetry', () => {
    it('should retry on 429 (rate limit)', () => {
      expect(client._shouldRetry(new Error('Rate limited'), 429)).toBe(true);
    });

    it('should retry on 5xx errors', () => {
      expect(client._shouldRetry(new Error('Server error'), 500)).toBe(true);
      expect(client._shouldRetry(new Error('Bad gateway'), 502)).toBe(true);
      expect(client._shouldRetry(new Error('Service unavailable'), 503)).toBe(true);
      expect(client._shouldRetry(new Error('Gateway timeout'), 504)).toBe(true);
    });

    it('should NOT retry on 4xx client errors', () => {
      expect(client._shouldRetry(new Error('Bad request'), 400)).toBe(false);
      expect(client._shouldRetry(new Error('Unauthorized'), 401)).toBe(false);
      expect(client._shouldRetry(new Error('Forbidden'), 403)).toBe(false);
      expect(client._shouldRetry(new Error('Not found'), 404)).toBe(false);
    });

    it('should retry on network errors', () => {
      const econnreset = new Error('Connection reset');
      econnreset.code = 'ECONNRESET';
      expect(client._shouldRetry(econnreset, null)).toBe(true);

      const etimedout = new Error('Timed out');
      etimedout.code = 'ETIMEDOUT';
      expect(client._shouldRetry(etimedout, null)).toBe(true);

      const enotfound = new Error('Not found');
      enotfound.code = 'ENOTFOUND';
      expect(client._shouldRetry(enotfound, null)).toBe(true);

      const econnrefused = new Error('Connection refused');
      econnrefused.code = 'ECONNREFUSED';
      expect(client._shouldRetry(econnrefused, null)).toBe(true);
    });

    it('should NOT retry on unknown network errors', () => {
      const error = new Error('Unknown error');
      error.code = 'UNKNOWN_CODE';
      expect(client._shouldRetry(error, null)).toBe(false);
    });
  });

  // ==================== Sleep Tests ====================
  describe('_sleep', () => {
    it('should delay for specified milliseconds', async () => {
      const startTime = Date.now();
      await client._sleep(100);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeGreaterThanOrEqual(90); // Allow some margin
    });
  });

  // ==================== Request Execution Tests ====================
  describe('_executeRequest', () => {
    let mockRequest;
    let mockResponse;

    beforeEach(() => {
      mockRequest = {
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn(),
        destroy: jest.fn(),
      };

      mockResponse = {
        statusCode: 200,
        on: jest.fn(),
      };
    });

    it('should make HTTPS request by default', async () => {
      jest.spyOn(https, 'request').mockImplementation((options, callback) => {
        setTimeout(() => {
          callback(mockResponse);
          const endHandler = mockResponse.on.mock.calls.find(call => call[0] === 'end')[1];
          mockResponse.on.mock.calls.find(call => call[0] === 'data')[1]('{"result":"ok"}');
          endHandler();
        }, 10);
        return mockRequest;
      });

      const result = await client._executeRequest('/api/v1/workflows');

      expect(https.request).toHaveBeenCalled();
      expect(result).toEqual({ result: 'ok' });
    });

    it('should use HTTP for http:// URLs', async () => {
      const httpClient = new HttpClient({
        baseUrl: 'http://n8n.example.com',
        apiKey: 'test-key',
      });

      jest.spyOn(http, 'request').mockImplementation((options, callback) => {
        setTimeout(() => {
          callback(mockResponse);
          const endHandler = mockResponse.on.mock.calls.find(call => call[0] === 'end')[1];
          mockResponse.on.mock.calls.find(call => call[0] === 'data')[1]('{"result":"ok"}');
          endHandler();
        }, 10);
        return mockRequest;
      });

      await httpClient._executeRequest('/api/v1/workflows');

      expect(http.request).toHaveBeenCalled();
    });

    it('should include API key in headers', async () => {
      jest.spyOn(https, 'request').mockImplementation((options, callback) => {
        expect(options.headers['X-N8N-API-KEY']).toBe('test-api-key-12345');

        setTimeout(() => {
          callback(mockResponse);
          const endHandler = mockResponse.on.mock.calls.find(call => call[0] === 'end')[1];
          endHandler();
        }, 10);
        return mockRequest;
      });

      await client._executeRequest('/test');
    });

    it('should handle JSON response', async () => {
      jest.spyOn(https, 'request').mockImplementation((options, callback) => {
        setTimeout(() => {
          callback(mockResponse);
          const dataHandler = mockResponse.on.mock.calls.find(call => call[0] === 'data')[1];
          const endHandler = mockResponse.on.mock.calls.find(call => call[0] === 'end')[1];

          dataHandler('{"workflows":[{"id":"1","name":"Test"}]}');
          endHandler();
        }, 10);
        return mockRequest;
      });

      const result = await client._executeRequest('/test');
      expect(result).toEqual({ workflows: [{ id: '1', name: 'Test' }] });
    });

    it('should handle empty response', async () => {
      jest.spyOn(https, 'request').mockImplementation((options, callback) => {
        setTimeout(() => {
          callback(mockResponse);
          const endHandler = mockResponse.on.mock.calls.find(call => call[0] === 'end')[1];
          endHandler();
        }, 10);
        return mockRequest;
      });

      const result = await client._executeRequest('/test');
      expect(result).toBeNull();
    });

    it('should handle non-JSON response as string', async () => {
      jest.spyOn(https, 'request').mockImplementation((options, callback) => {
        setTimeout(() => {
          callback(mockResponse);
          const dataHandler = mockResponse.on.mock.calls.find(call => call[0] === 'data')[1];
          const endHandler = mockResponse.on.mock.calls.find(call => call[0] === 'end')[1];

          dataHandler('plain text response');
          endHandler();
        }, 10);
        return mockRequest;
      });

      const result = await client._executeRequest('/test');
      expect(result).toBe('plain text response');
    });

    it('should reject on HTTP error status', async () => {
      mockResponse.statusCode = 404;

      jest.spyOn(https, 'request').mockImplementation((options, callback) => {
        setTimeout(() => {
          callback(mockResponse);
          const dataHandler = mockResponse.on.mock.calls.find(call => call[0] === 'data')[1];
          const endHandler = mockResponse.on.mock.calls.find(call => call[0] === 'end')[1];

          dataHandler('Not found');
          endHandler();
        }, 10);
        return mockRequest;
      });

      await expect(client._executeRequest('/test')).rejects.toThrow('HTTP 404');
    });

    it('should reject on request error', async () => {
      jest.spyOn(https, 'request').mockImplementation((options, callback) => {
        setTimeout(() => {
          const errorHandler = mockRequest.on.mock.calls.find(call => call[0] === 'error')[1];
          errorHandler(new Error('Network error'));
        }, 10);
        return mockRequest;
      });

      await expect(client._executeRequest('/test')).rejects.toThrow('Network error');
    });

    it('should handle timeout', async () => {
      jest.spyOn(https, 'request').mockImplementation((options, callback) => {
        // Never call callback to simulate timeout
        return mockRequest;
      });

      client.timeout = 100;

      await expect(client._executeRequest('/test')).rejects.toThrow('timeout');
      expect(mockRequest.destroy).toHaveBeenCalled();
    });

    it('should send body for POST requests', async () => {
      jest.spyOn(https, 'request').mockImplementation((options, callback) => {
        setTimeout(() => {
          callback(mockResponse);
          const endHandler = mockResponse.on.mock.calls.find(call => call[0] === 'end')[1];
          endHandler();
        }, 10);
        return mockRequest;
      });

      const body = { name: 'Test Workflow' };
      await client._executeRequest('/test', { method: 'POST', body });

      expect(mockRequest.write).toHaveBeenCalledWith(JSON.stringify(body));
    });

    it('should not double-handle response after timeout', async () => {
      let resolveCount = 0;
      let rejectCount = 0;

      jest.spyOn(https, 'request').mockImplementation((options, callback) => {
        // Simulate timeout, then response
        setTimeout(() => {
          callback(mockResponse);
          const endHandler = mockResponse.on.mock.calls.find(call => call[0] === 'end')[1];
          endHandler();
        }, 150);
        return mockRequest;
      });

      client.timeout = 50;

      try {
        await client._executeRequest('/test');
        resolveCount++;
      } catch (error) {
        rejectCount++;
      }

      expect(rejectCount).toBe(1); // Only timeout rejection
      expect(resolveCount).toBe(0);
    });
  });

  // ==================== Retry with Backoff Tests ====================
  describe('_requestWithRetry', () => {
    beforeEach(() => {
      jest.spyOn(client, '_sleep').mockResolvedValue();
      jest.spyOn(client, '_rateLimitCheck').mockResolvedValue();
    });

    it('should succeed on first attempt', async () => {
      jest.spyOn(client, '_executeRequest').mockResolvedValue({ data: 'success' });

      const result = await client._requestWithRetry('/test');

      expect(result).toEqual({ data: 'success' });
      expect(client._executeRequest).toHaveBeenCalledTimes(1);
      expect(client.stats.totalRequests).toBe(1);
      expect(client.stats.successfulRequests).toBe(1);
      expect(client.stats.retriedRequests).toBe(0);
    });

    it('should retry on retryable error and succeed', async () => {
      let attempt = 0;
      jest.spyOn(client, '_executeRequest').mockImplementation(async () => {
        attempt++;
        if (attempt < 3) {
          const error = new Error('HTTP 500');
          error.statusCode = 500;
          throw error;
        }
        return { data: 'success' };
      });

      const result = await client._requestWithRetry('/test');

      expect(result).toEqual({ data: 'success' });
      expect(client._executeRequest).toHaveBeenCalledTimes(3);
      expect(client.stats.retriedRequests).toBe(2);
      expect(client.stats.successfulRequests).toBe(1);
    });

    it('should fail after max retries', async () => {
      const error = new Error('HTTP 500');
      error.statusCode = 500;
      jest.spyOn(client, '_executeRequest').mockRejectedValue(error);

      await expect(client._requestWithRetry('/test')).rejects.toThrow('HTTP 500');

      expect(client._executeRequest).toHaveBeenCalledTimes(3);
      expect(client.stats.failedRequests).toBe(1);
      expect(client.stats.retriedRequests).toBe(2);
    });

    it('should not retry on non-retryable error', async () => {
      const error = new Error('HTTP 404');
      error.statusCode = 404;
      jest.spyOn(client, '_executeRequest').mockRejectedValue(error);

      await expect(client._requestWithRetry('/test')).rejects.toThrow('HTTP 404');

      expect(client._executeRequest).toHaveBeenCalledTimes(1);
      expect(client.stats.failedRequests).toBe(1);
      expect(client.stats.retriedRequests).toBe(0);
    });

    it('should use exponential backoff between retries', async () => {
      const error = new Error('HTTP 500');
      error.statusCode = 500;
      jest.spyOn(client, '_executeRequest').mockRejectedValue(error);

      await expect(client._requestWithRetry('/test')).rejects.toThrow();

      expect(client._sleep).toHaveBeenCalledWith(1000); // First retry
      expect(client._sleep).toHaveBeenCalledWith(2000); // Second retry
    });

    it('should log retry attempts', async () => {
      const error = new Error('HTTP 500');
      error.statusCode = 500;
      jest.spyOn(client, '_executeRequest').mockRejectedValue(error);

      await expect(client._requestWithRetry('/test')).rejects.toThrow();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Erro na requisição')
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Retentando em')
      );
    });

    it('should mask API key in logs', async () => {
      jest.spyOn(client, '_executeRequest').mockResolvedValue({ data: 'test' });

      await client._requestWithRetry('/test');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('***345')
      );
      expect(mockLogger.debug).not.toHaveBeenCalledWith(
        expect.stringContaining('test-api-key-12345')
      );
    });

    it('should check rate limit before each attempt', async () => {
      let attempt = 0;
      jest.spyOn(client, '_executeRequest').mockImplementation(async () => {
        attempt++;
        if (attempt < 2) {
          const error = new Error('HTTP 500');
          error.statusCode = 500;
          throw error;
        }
        return { data: 'success' };
      });

      await client._requestWithRetry('/test');

      expect(client._rateLimitCheck).toHaveBeenCalledTimes(2);
    });
  });

  // ==================== getWorkflows() Tests ====================
  describe('getWorkflows', () => {
    it('should fetch all workflows successfully', async () => {
      const mockWorkflows = [
        { id: '1', name: 'Workflow 1', active: true },
        { id: '2', name: 'Workflow 2', active: false },
      ];

      jest.spyOn(client, '_requestWithRetry').mockResolvedValue({
        data: mockWorkflows,
      });

      const result = await client.getWorkflows();

      expect(result).toEqual(mockWorkflows);
      expect(client._requestWithRetry).toHaveBeenCalledWith('/api/v1/workflows', {
        method: 'GET',
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Buscando workflows')
      );
    });

    it('should handle response without data wrapper', async () => {
      const mockWorkflows = [
        { id: '1', name: 'Workflow 1' },
      ];

      jest.spyOn(client, '_requestWithRetry').mockResolvedValue(mockWorkflows);

      const result = await client.getWorkflows();
      expect(result).toEqual(mockWorkflows);
    });

    it('should return empty array if no workflows', async () => {
      jest.spyOn(client, '_requestWithRetry').mockResolvedValue({ data: [] });

      const result = await client.getWorkflows();
      expect(result).toEqual([]);
    });
  });

  // ==================== getWorkflow() Tests ====================
  describe('getWorkflow', () => {
    it('should fetch specific workflow by ID', async () => {
      const mockWorkflow = {
        id: '123',
        name: 'Test Workflow',
        nodes: [],
        connections: {},
      };

      jest.spyOn(client, '_requestWithRetry').mockResolvedValue(mockWorkflow);

      const result = await client.getWorkflow('123');

      expect(result).toEqual(mockWorkflow);
      expect(client._requestWithRetry).toHaveBeenCalledWith('/api/v1/workflows/123', {
        method: 'GET',
      });
    });

    it('should throw error if workflowId is not provided', async () => {
      await expect(client.getWorkflow()).rejects.toThrow('workflowId é obrigatório');
      await expect(client.getWorkflow('')).rejects.toThrow('workflowId é obrigatório');
      await expect(client.getWorkflow(null)).rejects.toThrow('workflowId é obrigatório');
    });

    it('should log workflow details', async () => {
      const mockWorkflow = { id: '123', name: 'My Workflow' };
      jest.spyOn(client, '_requestWithRetry').mockResolvedValue(mockWorkflow);

      await client.getWorkflow('123');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('My Workflow')
      );
    });
  });

  // ==================== createWorkflow() Tests ====================
  describe('createWorkflow', () => {
    it('should create workflow successfully', async () => {
      const workflowData = {
        name: 'New Workflow',
        nodes: [{ id: '1', type: 'start' }],
        connections: {},
        active: false,
      };

      const createdWorkflow = {
        ...workflowData,
        id: 'generated-id',
      };

      jest.spyOn(client, '_requestWithRetry').mockResolvedValue(createdWorkflow);

      const result = await client.createWorkflow(workflowData);

      expect(result).toEqual(createdWorkflow);
      expect(client._requestWithRetry).toHaveBeenCalledWith('/api/v1/workflows', {
        method: 'POST',
        body: workflowData,
      });
    });

    it('should throw error if workflowData is not provided', async () => {
      await expect(client.createWorkflow()).rejects.toThrow('workflowData.name é obrigatório');
      await expect(client.createWorkflow(null)).rejects.toThrow('workflowData.name é obrigatório');
    });

    it('should throw error if name is missing', async () => {
      await expect(client.createWorkflow({ nodes: [] })).rejects.toThrow('workflowData.name é obrigatório');
    });

    it('should throw error if nodes is missing', async () => {
      await expect(client.createWorkflow({ name: 'Test' })).rejects.toThrow('workflowData.nodes deve ser um array');
    });

    it('should throw error if nodes is not an array', async () => {
      await expect(client.createWorkflow({
        name: 'Test',
        nodes: 'not-an-array',
      })).rejects.toThrow('workflowData.nodes deve ser um array');
    });

    it('should log workflow creation', async () => {
      const workflowData = {
        name: 'Test Workflow',
        nodes: [],
      };

      jest.spyOn(client, '_requestWithRetry').mockResolvedValue({
        ...workflowData,
        id: '123',
      });

      await client.createWorkflow(workflowData);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Criando workflow')
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('criado com sucesso')
      );
    });
  });

  // ==================== testConnection() Tests ====================
  describe('testConnection', () => {
    it('should return success when connection is valid', async () => {
      jest.spyOn(client, '_requestWithRetry').mockResolvedValue({ data: [] });

      const result = await client.testConnection();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Conexão bem-sucedida');
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Conectividade OK')
      );
    });

    it('should return error details on authentication failure (401)', async () => {
      const error = new Error('Unauthorized');
      error.statusCode = 401;
      jest.spyOn(client, '_requestWithRetry').mockRejectedValue(error);

      const result = await client.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Falha na autenticação');
      expect(result.suggestion).toBe('Verifique se a API key está correta');
    });

    it('should return error details on forbidden (403)', async () => {
      const error = new Error('Forbidden');
      error.statusCode = 403;
      jest.spyOn(client, '_requestWithRetry').mockRejectedValue(error);

      const result = await client.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Falha na autenticação');
    });

    it('should return error details on connection refused', async () => {
      const error = new Error('Connection refused');
      error.code = 'ECONNREFUSED';
      jest.spyOn(client, '_requestWithRetry').mockRejectedValue(error);

      const result = await client.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Não foi possível conectar ao servidor');
      expect(result.suggestion).toBe('Verifique se a URL está correta e o servidor está rodando');
    });

    it('should return error details on timeout', async () => {
      const error = new Error('Timeout');
      error.code = 'ETIMEDOUT';
      jest.spyOn(client, '_requestWithRetry').mockRejectedValue(error);

      const result = await client.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Timeout na conexão');
      expect(result.suggestion).toBe('Verifique a conectividade de rede e firewall');
    });

    it('should return error details on server not found', async () => {
      const error = new Error('Not found');
      error.code = 'ENOTFOUND';
      jest.spyOn(client, '_requestWithRetry').mockRejectedValue(error);

      const result = await client.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Servidor não encontrado');
      expect(result.suggestion).toBe('Verifique se a URL está correta');
    });

    it('should return generic error for unknown errors', async () => {
      const error = new Error('Unknown error occurred');
      jest.spyOn(client, '_requestWithRetry').mockRejectedValue(error);

      const result = await client.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
      expect(result.originalError).toBe('Unknown error occurred');
    });

    it('should include original error message', async () => {
      const error = new Error('Detailed error message');
      jest.spyOn(client, '_requestWithRetry').mockRejectedValue(error);

      const result = await client.testConnection();

      expect(result.originalError).toBe('Detailed error message');
    });
  });

  // ==================== Statistics Tests ====================
  describe('Statistics', () => {
    describe('getStats', () => {
      it('should return copy of statistics object', () => {
        client.stats.totalRequests = 10;
        client.stats.successfulRequests = 8;
        client.stats.failedRequests = 2;

        const stats = client.getStats();

        expect(stats).toEqual({
          totalRequests: 10,
          successfulRequests: 8,
          failedRequests: 2,
          retriedRequests: 0,
          rateLimitedRequests: 0,
        });

        // Should be a copy, not reference
        stats.totalRequests = 100;
        expect(client.stats.totalRequests).toBe(10);
      });
    });

    describe('resetStats', () => {
      it('should reset all statistics to zero', () => {
        client.stats.totalRequests = 100;
        client.stats.successfulRequests = 80;
        client.stats.failedRequests = 20;
        client.stats.retriedRequests = 15;
        client.stats.rateLimitedRequests = 5;

        client.resetStats();

        expect(client.stats).toEqual({
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          retriedRequests: 0,
          rateLimitedRequests: 0,
        });
      });

      it('should log reset action', () => {
        client.resetStats();

        expect(mockLogger.debug).toHaveBeenCalledWith(
          expect.stringContaining('Estatísticas resetadas')
        );
      });
    });
  });

  // ==================== Integration Tests ====================
  describe('Integration Scenarios', () => {
    it('should handle complete workflow fetch cycle', async () => {
      // Mock successful request
      jest.spyOn(https, 'request').mockImplementation((options, callback) => {
        const mockRes = {
          statusCode: 200,
          on: jest.fn((event, handler) => {
            if (event === 'data') {
              setTimeout(() => handler('{"data":[{"id":"1","name":"Test"}]}'), 10);
            }
            if (event === 'end') {
              setTimeout(() => handler(), 20);
            }
          }),
        };
        setTimeout(() => callback(mockRes), 5);
        return {
          write: jest.fn(),
          end: jest.fn(),
          on: jest.fn(),
          destroy: jest.fn(),
        };
      });

      const workflows = await client.getWorkflows();

      expect(workflows).toHaveLength(1);
      expect(workflows[0].name).toBe('Test');
      expect(client.stats.totalRequests).toBe(1);
      expect(client.stats.successfulRequests).toBe(1);
    });

    it('should handle retry and eventual success', async () => {
      let attemptCount = 0;

      jest.spyOn(https, 'request').mockImplementation((options, callback) => {
        attemptCount++;

        const mockRes = {
          statusCode: attemptCount < 3 ? 500 : 200,
          on: jest.fn((event, handler) => {
            if (event === 'data') {
              const data = attemptCount < 3 ? 'Server error' : '{"data":[]}';
              setTimeout(() => handler(data), 10);
            }
            if (event === 'end') {
              setTimeout(() => handler(), 20);
            }
          }),
        };

        setTimeout(() => callback(mockRes), 5);

        return {
          write: jest.fn(),
          end: jest.fn(),
          on: jest.fn(),
          destroy: jest.fn(),
        };
      });

      // Mock sleep to speed up test
      jest.spyOn(client, '_sleep').mockResolvedValue();

      const workflows = await client.getWorkflows();

      expect(workflows).toEqual([]);
      expect(client.stats.totalRequests).toBe(1);
      expect(client.stats.retriedRequests).toBe(2);
      expect(client.stats.successfulRequests).toBe(1);
    });

    it('should respect rate limiting across multiple requests', async () => {
      jest.spyOn(client, '_executeRequest').mockResolvedValue({ data: 'ok' });
      jest.spyOn(client, '_sleep').mockResolvedValue();

      const startTime = Date.now();

      // Make 15 rapid requests (over limit)
      const promises = Array(15).fill(null).map(() =>
        client._requestWithRetry('/test')
      );

      await Promise.all(promises);

      expect(client.stats.rateLimitedRequests).toBeGreaterThan(0);
    });
  });

  // ==================== Edge Cases ====================
  describe('Edge Cases', () => {
    it('should handle very long API keys', () => {
      const longKey = 'a'.repeat(1000);
      const masked = client._maskApiKey(longKey);

      expect(masked).toMatch(/^\*+aaa$/);
      expect(masked.length).toBe(1000);
    });

    it('should handle workflow with empty nodes array', async () => {
      const workflowData = {
        name: 'Empty Workflow',
        nodes: [],
      };

      jest.spyOn(client, '_requestWithRetry').mockResolvedValue({
        ...workflowData,
        id: '123',
      });

      const result = await client.createWorkflow(workflowData);
      expect(result.nodes).toEqual([]);
    });

    it('should handle concurrent requests', async () => {
      jest.spyOn(client, '_executeRequest').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return { data: 'ok' };
      });

      const promises = [
        client._requestWithRetry('/test1'),
        client._requestWithRetry('/test2'),
        client._requestWithRetry('/test3'),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(client.stats.totalRequests).toBe(3);
      expect(client.stats.successfulRequests).toBe(3);
    });

    it('should handle special characters in workflow names', async () => {
      const workflowData = {
        name: 'Test "Workflow" with \'quotes\' & special <chars>',
        nodes: [],
      };

      jest.spyOn(client, '_requestWithRetry').mockResolvedValue({
        ...workflowData,
        id: '123',
      });

      await expect(client.createWorkflow(workflowData)).resolves.toBeDefined();
    });
  });
});
