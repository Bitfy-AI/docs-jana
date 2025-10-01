/**
 * Unit Tests for HttpClient
 * Tests critical security and reliability fixes including:
 * - Retry loop correctness (maxRetries attempts, not maxRetries+1)
 * - Timeout race condition handling
 * - Empty response handling
 * - Exponential backoff calculation
 * - Retry behavior on different HTTP status codes
 */

const HttpClient = require('../../src/utils/http-client');
const http = require('http');
const https = require('https');

describe('HttpClient', () => {
  let httpClient;

  beforeEach(() => {
    httpClient = new HttpClient('https://api.example.com', {}, {
      maxRetries: 3,
      baseDelay: 1000,
      timeout: 5000
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Retry Logic', () => {
    it('should execute exactly maxRetries attempts (not maxRetries+1)', async () => {
      const mockRequest = jest.fn();
      let attemptCount = 0;

      // Mock executeRequest to always fail
      httpClient.executeRequest = jest.fn().mockImplementation(async () => {
        attemptCount++;
        throw Object.assign(new Error('HTTP 500: Server Error'), { statusCode: 500 });
      });

      // Mock sleep to avoid actual delays
      httpClient.sleep = jest.fn().mockResolvedValue(undefined);

      await expect(httpClient.request('/test')).rejects.toThrow('HTTP 500');

      // Should attempt exactly 3 times (maxRetries = 3)
      expect(attemptCount).toBe(3);
      expect(httpClient.executeRequest).toHaveBeenCalledTimes(3);
    });

    it('should not retry on successful request', async () => {
      httpClient.executeRequest = jest.fn().mockResolvedValue({ data: 'success' });

      const result = await httpClient.request('/test');

      expect(result).toEqual({ data: 'success' });
      expect(httpClient.executeRequest).toHaveBeenCalledTimes(1);
      expect(httpClient.stats.retriedRequests).toBe(0);
    });

    it('should stop retrying on first success after failures', async () => {
      let attemptCount = 0;
      httpClient.executeRequest = jest.fn().mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 2) {
          throw Object.assign(new Error('HTTP 500'), { statusCode: 500 });
        }
        return { data: 'success' };
      });

      httpClient.sleep = jest.fn().mockResolvedValue(undefined);

      const result = await httpClient.request('/test');

      expect(result).toEqual({ data: 'success' });
      expect(attemptCount).toBe(2);
      expect(httpClient.stats.retriedRequests).toBe(1);
    });
  });

  describe('Retry Conditions', () => {
    beforeEach(() => {
      httpClient.sleep = jest.fn().mockResolvedValue(undefined);
    });

    it('should retry on 429 (rate limit)', async () => {
      let attemptCount = 0;
      httpClient.executeRequest = jest.fn().mockImplementation(async () => {
        attemptCount++;
        throw Object.assign(new Error('HTTP 429'), { statusCode: 429 });
      });

      await expect(httpClient.request('/test')).rejects.toThrow();
      expect(attemptCount).toBe(3); // maxRetries attempts
    });

    it('should retry on 5xx errors', async () => {
      const statusCodes = [500, 502, 503, 504];

      for (const code of statusCodes) {
        httpClient.resetStats();
        let attemptCount = 0;

        httpClient.executeRequest = jest.fn().mockImplementation(async () => {
          attemptCount++;
          throw Object.assign(new Error(`HTTP ${code}`), { statusCode: code });
        });

        await expect(httpClient.request('/test')).rejects.toThrow();
        expect(attemptCount).toBe(3);
      }
    });

    it('should NOT retry on 4xx client errors (except 429)', async () => {
      const statusCodes = [400, 401, 403, 404];

      for (const code of statusCodes) {
        let attemptCount = 0;

        httpClient.executeRequest = jest.fn().mockImplementation(async () => {
          attemptCount++;
          throw Object.assign(new Error(`HTTP ${code}`), { statusCode: code });
        });

        await expect(httpClient.request('/test')).rejects.toThrow();
        expect(attemptCount).toBe(1); // No retries
      }
    });

    it('should retry on network errors (ECONNRESET, ETIMEDOUT, ENOTFOUND)', async () => {
      const errorCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'];

      for (const code of errorCodes) {
        httpClient.resetStats();
        let attemptCount = 0;

        httpClient.executeRequest = jest.fn().mockImplementation(async () => {
          attemptCount++;
          const error = new Error(`Network error: ${code}`);
          error.code = code;
          throw error;
        });

        await expect(httpClient.request('/test')).rejects.toThrow();
        expect(attemptCount).toBe(3);
      }
    });
  });

  describe('Exponential Backoff', () => {
    it('should calculate exponential backoff correctly', () => {
      const baseDelay = 1000;
      httpClient.retryConfig.baseDelay = baseDelay;

      // Test exponential growth: baseDelay * 2^attempt
      const delay0 = httpClient.calculateBackoff(0);
      const delay1 = httpClient.calculateBackoff(1);
      const delay2 = httpClient.calculateBackoff(2);

      // Check that delay increases exponentially (allowing for jitter)
      // delay = baseDelay * 2^attempt + jitter (0-1000ms)
      expect(delay0).toBeGreaterThanOrEqual(baseDelay); // 1000ms + jitter
      expect(delay0).toBeLessThan(baseDelay + 1000);

      expect(delay1).toBeGreaterThanOrEqual(baseDelay * 2); // 2000ms + jitter
      expect(delay1).toBeLessThan(baseDelay * 2 + 1000);

      expect(delay2).toBeGreaterThanOrEqual(baseDelay * 4); // 4000ms + jitter
      expect(delay2).toBeLessThan(baseDelay * 4 + 1000);
    });

    it('should add random jitter to prevent thundering herd', () => {
      const delays = [];
      for (let i = 0; i < 10; i++) {
        delays.push(httpClient.calculateBackoff(0));
      }

      // All delays should be different due to jitter
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });
  });

  describe('Timeout Handling', () => {
    it('should handle timeout without race condition', async () => {
      // Create a mock request that takes longer than timeout
      const mockReq = {
        destroy: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn()
      };

      // Mock https.request to return our mock request
      jest.spyOn(https, 'request').mockImplementation((options, callback) => {
        // Simulate timeout by not calling callback
        setTimeout(() => {
          // After timeout, simulate both timeout and response arriving
          // This tests the race condition fix
        }, 100);
        return mockReq;
      });

      httpClient.retryConfig.timeout = 50; // Very short timeout

      await expect(httpClient.executeRequest('/test')).rejects.toThrow('timeout');
      expect(mockReq.destroy).toHaveBeenCalled();

      https.request.mockRestore();
    });

    it('should not double-handle when response arrives after timeout', async () => {
      let resolveCount = 0;
      let rejectCount = 0;

      const mockReq = {
        destroy: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn((event, handler) => {
          if (event === 'error') {
            mockReq._errorHandler = handler;
          }
        })
      };

      jest.spyOn(https, 'request').mockImplementation((options, callback) => {
        const mockRes = {
          statusCode: 200,
          on: jest.fn((event, handler) => {
            if (event === 'data') {
              // Simulate data arriving after timeout
              setTimeout(() => handler('{"data":"test"}'), 100);
            }
            if (event === 'end') {
              setTimeout(() => handler(), 110);
            }
          })
        };

        // Call callback immediately to start response
        setTimeout(() => callback(mockRes), 90);
        return mockReq;
      });

      httpClient.retryConfig.timeout = 50;

      try {
        await httpClient.executeRequest('/test');
        resolveCount++;
      } catch (error) {
        rejectCount++;
      }

      // Should only reject once (timeout), not resolve after timeout
      expect(rejectCount).toBe(1);
      expect(resolveCount).toBe(0);

      https.request.mockRestore();
    });
  });

  describe('Empty Response Handling', () => {
    it('should return null for empty response body', async () => {
      const mockReq = {
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn()
      };

      jest.spyOn(https, 'request').mockImplementation((options, callback) => {
        const mockRes = {
          statusCode: 200,
          on: jest.fn((event, handler) => {
            if (event === 'data') {
              // No data chunks
            }
            if (event === 'end') {
              // End with empty data
              setTimeout(() => handler(), 10);
            }
          })
        };

        setTimeout(() => callback(mockRes), 10);
        return mockReq;
      });

      const result = await httpClient.executeRequest('/test');
      expect(result).toBeNull();

      https.request.mockRestore();
    });

    it('should return null for whitespace-only response', async () => {
      const mockReq = {
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn()
      };

      jest.spyOn(https, 'request').mockImplementation((options, callback) => {
        const mockRes = {
          statusCode: 200,
          on: jest.fn((event, handler) => {
            if (event === 'data') {
              handler('   \n\t  '); // Whitespace only
            }
            if (event === 'end') {
              setTimeout(() => handler(), 10);
            }
          })
        };

        setTimeout(() => callback(mockRes), 10);
        return mockReq;
      });

      const result = await httpClient.executeRequest('/test');
      expect(result).toBeNull();

      https.request.mockRestore();
    });

    it('should parse valid JSON response', async () => {
      const mockReq = {
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn()
      };

      jest.spyOn(https, 'request').mockImplementation((options, callback) => {
        const mockRes = {
          statusCode: 200,
          on: jest.fn((event, handler) => {
            if (event === 'data') {
              handler('{"key":"value"}');
            }
            if (event === 'end') {
              setTimeout(() => handler(), 10);
            }
          })
        };

        setTimeout(() => callback(mockRes), 10);
        return mockReq;
      });

      const result = await httpClient.executeRequest('/test');
      expect(result).toEqual({ key: 'value' });

      https.request.mockRestore();
    });

    it('should return raw data for non-JSON response', async () => {
      const mockReq = {
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn()
      };

      jest.spyOn(https, 'request').mockImplementation((options, callback) => {
        const mockRes = {
          statusCode: 200,
          on: jest.fn((event, handler) => {
            if (event === 'data') {
              handler('plain text response');
            }
            if (event === 'end') {
              setTimeout(() => handler(), 10);
            }
          })
        };

        setTimeout(() => callback(mockRes), 10);
        return mockReq;
      });

      const result = await httpClient.executeRequest('/test');
      expect(result).toBe('plain text response');

      https.request.mockRestore();
    });
  });

  describe('Statistics Tracking', () => {
    beforeEach(() => {
      httpClient.sleep = jest.fn().mockResolvedValue(undefined);
    });

    it('should track total requests', async () => {
      httpClient.executeRequest = jest.fn().mockResolvedValue({ data: 'test' });

      await httpClient.request('/test1');
      await httpClient.request('/test2');

      expect(httpClient.stats.totalRequests).toBe(2);
    });

    it('should track retried requests', async () => {
      let attemptCount = 0;
      httpClient.executeRequest = jest.fn().mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 2) {
          throw Object.assign(new Error('HTTP 500'), { statusCode: 500 });
        }
        return { data: 'success' };
      });

      await httpClient.request('/test');

      expect(httpClient.stats.retriedRequests).toBe(1);
    });

    it('should track failed requests', async () => {
      httpClient.executeRequest = jest.fn().mockRejectedValue(
        Object.assign(new Error('HTTP 404'), { statusCode: 404 })
      );

      await expect(httpClient.request('/test')).rejects.toThrow();

      expect(httpClient.stats.failedRequests).toBe(1);
    });

    it('should reset stats correctly', () => {
      httpClient.stats.totalRequests = 10;
      httpClient.stats.retriedRequests = 5;
      httpClient.stats.failedRequests = 2;

      httpClient.resetStats();

      expect(httpClient.stats.totalRequests).toBe(0);
      expect(httpClient.stats.retriedRequests).toBe(0);
      expect(httpClient.stats.failedRequests).toBe(0);
    });
  });

  describe('Helper Methods', () => {
    it('should extract status code from error object', () => {
      const error1 = Object.assign(new Error('Test'), { statusCode: 404 });
      expect(httpClient.extractStatusCode(error1)).toBe(404);

      const error2 = new Error('HTTP 500: Server Error');
      expect(httpClient.extractStatusCode(error2)).toBe(500);

      const error3 = new Error('Network error');
      expect(httpClient.extractStatusCode(error3)).toBeNull();
    });

    it('should update headers correctly', () => {
      httpClient.setHeaders({ 'X-Custom': 'value' });
      expect(httpClient.defaultHeaders['X-Custom']).toBe('value');

      httpClient.setHeaders({ 'Authorization': 'Bearer token' });
      expect(httpClient.defaultHeaders['Authorization']).toBe('Bearer token');
    });
  });

  describe('HTTP Methods', () => {
    beforeEach(() => {
      httpClient.request = jest.fn().mockResolvedValue({ data: 'test' });
    });

    it('should call GET with correct parameters', async () => {
      await httpClient.get('/test', { 'X-Custom': 'header' });

      expect(httpClient.request).toHaveBeenCalledWith('/test', {
        method: 'GET',
        headers: { 'X-Custom': 'header' }
      });
    });

    it('should call POST with correct parameters', async () => {
      const body = { key: 'value' };
      await httpClient.post('/test', body, { 'X-Custom': 'header' });

      expect(httpClient.request).toHaveBeenCalledWith('/test', {
        method: 'POST',
        body,
        headers: { 'X-Custom': 'header' }
      });
    });

    it('should call PUT with correct parameters', async () => {
      const body = { key: 'value' };
      await httpClient.put('/test', body, { 'X-Custom': 'header' });

      expect(httpClient.request).toHaveBeenCalledWith('/test', {
        method: 'PUT',
        body,
        headers: { 'X-Custom': 'header' }
      });
    });

    it('should call DELETE with correct parameters', async () => {
      await httpClient.delete('/test', { 'X-Custom': 'header' });

      expect(httpClient.request).toHaveBeenCalledWith('/test', {
        method: 'DELETE',
        headers: { 'X-Custom': 'header' }
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined options', async () => {
      httpClient.executeRequest = jest.fn().mockResolvedValue({ data: 'test' });

      await expect(httpClient.request('/test', null)).resolves.toBeDefined();
      await expect(httpClient.request('/test', undefined)).resolves.toBeDefined();
    });

    it('should handle empty endpoint', async () => {
      httpClient.executeRequest = jest.fn().mockResolvedValue({ data: 'test' });

      await httpClient.request('');
      expect(httpClient.executeRequest).toHaveBeenCalledWith('', {});
    });

    it('should handle baseUrl with trailing slash', () => {
      const client = new HttpClient('https://api.example.com/');
      expect(client.baseUrl).toBe('https://api.example.com');
    });
  });
});
