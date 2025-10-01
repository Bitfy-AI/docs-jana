/**
 * Unit Tests for Logger
 * Tests critical security and functionality fixes including:
 * - Deep object traversal for sensitive data masking
 * - Nested objects with sensitive keys (password, token, etc.)
 * - Arrays containing sensitive data
 * - Pattern-based masking for strings
 * - Combined pattern + object masking
 */

const Logger = require('../../src/utils/logger');

describe('Logger', () => {
  let logger;
  let consoleSpy;

  beforeEach(() => {
    logger = new Logger({ enableTimestamp: false, logLevel: 'debug' });

    // Spy on console methods
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(() => {}),
      warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
      error: jest.spyOn(console, 'error').mockImplementation(() => {})
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Deep Object Traversal for Sensitive Data Masking', () => {
    it('should mask sensitive keys in deeply nested objects', () => {
      const sensitiveObj = {
        user: {
          name: 'John',
          auth: {
            token: 'secret-token-123',
            password: 'my-password'
          }
        }
      };

      const result = logger.maskSensitive(sensitiveObj);

      // Result is a JSON string with masked values
      // Pattern-based masking adds space after colon for sensitive keys
      expect(result).toContain('"name":"John"'); // Non-sensitive, no space
      expect(result).toContain('"token":"***REDACTED***"'); // Sensitive, has space from pattern
      expect(result).toContain('"password":"***REDACTED***"'); // Sensitive, has space from pattern
      expect(result).not.toContain('secret-token-123');
      expect(result).not.toContain('my-password');
    });

    it('should mask apiKey in nested objects', () => {
      const obj = {
        config: {
          api: {
            apiKey: 'sk-1234567890',
            apiSecret: 'pk-abcdef'
          }
        }
      };

      const result = logger.maskSensitive(obj);

      // apiKey contains 'apikey', apiSecret contains 'secret' - both should be masked
      expect(result).toContain('"apiKey":"***REDACTED***"'); // Key contains 'apikey'
      expect(result).toContain('"apiSecret":"***REDACTED***"'); // Key contains 'secret'
      expect(result).not.toContain('sk-1234567890');
      expect(result).not.toContain('pk-abcdef');
    });

    it('should mask authorization headers in nested objects', () => {
      const obj = {
        request: {
          headers: {
            authorization: 'Bearer token-123',
            'content-type': 'application/json'
          }
        }
      };

      const result = logger.maskSensitive(obj);

      expect(result).toContain('"authorization":"***REDACTED***"');
      expect(result).toContain('"content-type":"application/json"');
      expect(result).not.toContain('Bearer token-123');
    });

    it('should mask bearer tokens in nested objects', () => {
      const obj = {
        auth: {
          bearer: 'token-xyz',
          bearerToken: 'another-token'
        }
      };

      const result = logger.maskSensitive(obj);

      expect(result).toContain('"bearer":"***REDACTED***"');
      expect(result).toContain('"bearerToken":"***REDACTED***"');
      expect(result).not.toContain('token-xyz');
      expect(result).not.toContain('another-token');
    });

    it('should mask secrets in nested objects', () => {
      const obj = {
        app: {
          config: {
            secret: 'my-secret-key',
            clientSecret: 'client-secret-123'
          }
        }
      };

      const result = logger.maskSensitive(obj);

      expect(result).toContain('"secret":"***REDACTED***"');
      expect(result).toContain('"clientSecret":"***REDACTED***"');
      expect(result).not.toContain('my-secret-key');
      expect(result).not.toContain('client-secret-123');
    });

    it('should handle case-insensitive sensitive key matching', () => {
      const obj = {
        data: {
          PASSWORD: 'pass123',
          Token: 'token123',
          ApiKey: 'key123'
        }
      };

      const result = logger.maskSensitive(obj);

      // JSON.stringify preserves the original case of keys
      expect(result).toContain('"PASSWORD":"***REDACTED***"');
      expect(result).toContain('"Token":"***REDACTED***"');
      expect(result).toContain('"ApiKey":"***REDACTED***"');
      expect(result).not.toContain('pass123');
      expect(result).not.toContain('token123');
      expect(result).not.toContain('key123');
    });

    it('should mask at multiple nesting levels', () => {
      const obj = {
        level1: {
          password: 'level1-pass',
          level2: {
            token: 'level2-token',
            level3: {
              apiKey: 'level3-key',
              level4: {
                secret: 'level4-secret'
              }
            }
          }
        }
      };

      const result = logger.maskSensitive(obj);

      expect(result).toContain('"password":"***REDACTED***"');
      expect(result).toContain('"token":"***REDACTED***"');
      expect(result).toContain('"apiKey":"***REDACTED***"');
      expect(result).toContain('"secret":"***REDACTED***"');
      expect(result).not.toContain('level1-pass');
      expect(result).not.toContain('level2-token');
      expect(result).not.toContain('level3-key');
      expect(result).not.toContain('level4-secret');
    });

    it('should preserve non-sensitive data in nested objects', () => {
      const obj = {
        user: {
          id: 123,
          name: 'John Doe',
          email: 'john@example.com',
          auth: {
            password: 'secret',
            lastLogin: '2024-01-01'
          }
        }
      };

      const result = logger.maskSensitive(obj);

      expect(result).toContain('"id":123');
      expect(result).toContain('"name":"John Doe"');
      expect(result).toContain('"email":"john@example.com"');
      expect(result).toContain('"password":"***REDACTED***"');
      expect(result).toContain('"lastLogin":"2024-01-01"');
      expect(result).not.toContain('secret');
    });
  });

  describe('Array Handling with Sensitive Data', () => {
    it('should mask sensitive data in arrays of objects', () => {
      const arr = [
        { user: 'alice', password: 'pass1' },
        { user: 'bob', token: 'token2' },
        { user: 'charlie', apiKey: 'key3' }
      ];

      const result = logger.maskSensitive(arr);

      expect(result).toContain('"user":"alice"');
      expect(result).toContain('"password":"***REDACTED***"');
      expect(result).toContain('"user":"bob"');
      expect(result).toContain('"token":"***REDACTED***"');
      expect(result).toContain('"user":"charlie"');
      expect(result).toContain('"apiKey":"***REDACTED***"');
      expect(result).not.toContain('pass1');
      expect(result).not.toContain('token2');
      expect(result).not.toContain('key3');
    });

    it('should mask sensitive data in nested arrays', () => {
      const obj = {
        users: [
          {
            name: 'User 1',
            credentials: {
              password: 'pass1',
              tokens: [
                { type: 'access', token: 'access-token-1' },
                { type: 'refresh', token: 'refresh-token-1' }
              ]
            }
          }
        ]
      };

      const result = logger.maskSensitive(obj);

      expect(result).toContain('"name":"User 1"');
      expect(result).toContain('"password":"***REDACTED***"');
      expect(result).toContain('"type":"access"');
      expect(result).toContain('"token":"***REDACTED***"');
      expect(result).toContain('"type":"refresh"');
      expect(result).not.toContain('pass1');
      expect(result).not.toContain('access-token-1');
      expect(result).not.toContain('refresh-token-1');
    });

    it('should handle arrays with mixed data types', () => {
      const arr = [
        'plain string',
        { password: 'secret' },
        123,
        null,
        { token: 'token-abc' }
      ];

      const result = logger.maskSensitive(arr);
      const parsed = JSON.parse(result);

      expect(parsed[0]).toBe('plain string');
      expect(parsed[1].password).toBe('***REDACTED***');
      expect(parsed[2]).toBe(123);
      expect(parsed[3]).toBeNull();
      expect(parsed[4].token).toBe('***REDACTED***');
    });

    it('should mask sensitive keys containing partial matches', () => {
      const obj = {
        userPassword: 'pass123',
        jwtToken: 'token456',
        apiKeyValue: 'key789',
        secretKey: 'secret-abc'
      };

      const result = logger.maskSensitive(obj);
      const parsed = JSON.parse(result);

      expect(parsed.userPassword).toBe('***REDACTED***');
      expect(parsed.jwtToken).toBe('***REDACTED***');
      expect(parsed.apiKeyValue).toBe('***REDACTED***');
      expect(parsed.secretKey).toBe('***REDACTED***');
    });
  });

  describe('Pattern-Based Masking for Strings', () => {
    it('should mask Bearer tokens in strings', () => {
      const message = 'Authorization: Bearer sk-1234567890abcdef';
      const result = logger.maskSensitive(message);

      expect(result).toContain('Bearer ***REDACTED***');
      expect(result).not.toContain('sk-1234567890abcdef');
    });

    it('should mask password patterns in strings', () => {
      const message = 'User login with password: mySecretPass123';
      const result = logger.maskSensitive(message);

      expect(result).toContain('password: ***REDACTED***');
      expect(result).not.toContain('mySecretPass123');
    });

    it('should mask apiKey patterns in strings', () => {
      const message = 'Using apiKey=sk-test-123456 for authentication';
      const result = logger.maskSensitive(message);

      expect(result).toContain('apiKey: ***REDACTED***');
      expect(result).not.toContain('sk-test-123456');
    });

    it('should mask token patterns in strings', () => {
      const message = 'Request with token: abc123xyz789';
      const result = logger.maskSensitive(message);

      expect(result).toContain('token: ***REDACTED***');
      expect(result).not.toContain('abc123xyz789');
    });

    it('should mask authorization patterns in strings', () => {
      const message = 'Header: authorization=Bearer token123';
      const result = logger.maskSensitive(message);

      expect(result).toContain('authorization: ***REDACTED***');
      expect(result).not.toContain('Bearer token123');
    });

    it('should mask JSON-formatted sensitive data in strings', () => {
      const message = '{"api_key":"sk-123","token":"abc-xyz"}';
      const result = logger.maskSensitive(message);

      expect(result).toContain('"api_key":  "***REDACTED***"');
      expect(result).toContain('"token":  "***REDACTED***"');
      expect(result).not.toContain('sk-123');
      expect(result).not.toContain('abc-xyz');
    });

    it('should handle case-insensitive pattern matching', () => {
      const message = 'Bearer Token123 and PASSWORD: secret123';
      const result = logger.maskSensitive(message);

      expect(result).toContain('***REDACTED***');
      expect(result).not.toContain('Token123');
      expect(result).not.toContain('secret123');
    });

    it('should mask multiple patterns in the same string', () => {
      const message = 'Auth: Bearer token123, apiKey=key456, password: pass789';
      const result = logger.maskSensitive(message);

      expect(result).toContain('***REDACTED***');
      expect(result).not.toContain('token123');
      expect(result).not.toContain('key456');
      expect(result).not.toContain('pass789');
    });
  });

  describe('Combined Pattern + Object Masking', () => {
    it('should mask both patterns and object keys', () => {
      const obj = {
        message: 'Login with password: secret123',
        credentials: {
          password: 'secret123',
          token: 'token-abc'
        }
      };

      const result = logger.maskSensitive(obj);

      // Pattern masking in message string - masking happens AFTER object masking
      expect(result).toContain('password: ***REDACTED***');
      expect(result).not.toContain('secret123');

      // Object key masking
      expect(result).toContain('"password":"***REDACTED***"');
      expect(result).toContain('"token":"***REDACTED***"');
      expect(result).not.toContain('token-abc');
    });

    it('should handle complex nested structures with both patterns and objects', () => {
      const data = {
        logs: [
          'Request: Bearer token123',
          { auth: { apiKey: 'key456' } }
        ],
        config: {
          message: 'Using token: xyz789',
          secrets: {
            password: 'pass000'
          }
        }
      };

      const result = logger.maskSensitive(data);

      // Array with string pattern
      expect(result).toContain('Bearer ***REDACTED***');

      // Array with object - apiKey should be masked
      expect(result).toContain('"apiKey":"***REDACTED***"');
      expect(result).not.toContain('key456');

      // Nested object with pattern
      expect(result).toContain('token: ***REDACTED***');
      expect(result).not.toContain('xyz789');

      // Nested object with sensitive key
      expect(result).toContain('"password":"***REDACTED***"');
      expect(result).not.toContain('pass000');
    });

    it('should preserve JSON structure while masking', () => {
      const obj = {
        id: 123,
        data: {
          apiKey: 'secret',
          count: 456
        },
        message: 'password: hidden'
      };

      const result = logger.maskSensitive(obj);

      expect(result).toContain('"id":123');
      expect(result).toContain('"apiKey":"***REDACTED***"');
      expect(result).toContain('"count":456');
      expect(result).toContain('password: ***REDACTED***');
      expect(result).not.toContain('secret');
      expect(result).not.toContain('hidden');
    });
  });

  describe('Log Level Filtering', () => {
    it('should log debug messages when level is debug', () => {
      logger.debug('Debug message');
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Debug message')
      );
    });

    it('should not log debug messages when level is info', () => {
      logger.logLevel = 'info';
      logger.debug('Debug message');
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it('should log info messages when level is info', () => {
      logger.logLevel = 'info';
      logger.info('Info message');
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should log warn messages when level is warn', () => {
      logger.logLevel = 'warn';
      logger.warn('Warning message');
      expect(consoleSpy.warn).toHaveBeenCalled();
    });

    it('should log error messages at all levels', () => {
      logger.logLevel = 'error';
      logger.error('Error message');
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should respect log level hierarchy', () => {
      logger.logLevel = 'warn';

      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warn');
      logger.error('Error');

      expect(consoleSpy.log).not.toHaveBeenCalled(); // debug and info not logged
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('Timestamp Handling', () => {
    it('should include timestamp when enabled', () => {
      logger.enableTimestamp = true;
      logger.info('Test message');

      const call = consoleSpy.log.mock.calls[0][0];
      expect(call).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
    });

    it('should not include timestamp when disabled', () => {
      logger.enableTimestamp = false;
      logger.info('Test message');

      const call = consoleSpy.log.mock.calls[0][0];
      expect(call).not.toMatch(/\[\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('Logging Methods', () => {
    it('should mask sensitive data in all log methods', () => {
      const sensitiveMsg = { password: 'secret' };

      logger.debug(sensitiveMsg);
      logger.info(sensitiveMsg);
      logger.success(sensitiveMsg);
      logger.warn(sensitiveMsg);
      logger.error(sensitiveMsg);

      // All should have masked the password
      expect(consoleSpy.log.mock.calls.every(call =>
        call[0].includes('***REDACTED***')
      )).toBe(true);
      expect(consoleSpy.warn.mock.calls.every(call =>
        call[0].includes('***REDACTED***')
      )).toBe(true);
      expect(consoleSpy.error.mock.calls.every(call =>
        call[0].includes('***REDACTED***')
      )).toBe(true);
    });

    it('should mask additional arguments', () => {
      const sensitiveArg = 'token: secret123';
      logger.info('Message', sensitiveArg);

      const calls = consoleSpy.log.mock.calls[0];
      expect(calls[1]).toContain('***REDACTED***');
      expect(calls[1]).not.toContain('secret123');
    });

    it('should handle non-string additional arguments', () => {
      logger.info('Message', 123, null, true);

      const calls = consoleSpy.log.mock.calls[0];
      expect(calls).toHaveLength(4); // message + 3 args
      expect(calls[1]).toBe(123);
      expect(calls[2]).toBeNull();
      expect(calls[3]).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null input', () => {
      expect(() => logger.maskSensitive(null)).not.toThrow();
      const result = logger.maskSensitive(null);
      expect(result).toBe('null');
    });

    it('should handle undefined input', () => {
      expect(() => logger.maskSensitive(undefined)).not.toThrow();
      const result = logger.maskSensitive(undefined);
      // undefined stringifies differently in different contexts
      expect(['undefined', 'null'].includes(result)).toBe(true);
    });

    it('should handle empty objects', () => {
      const result = logger.maskSensitive({});
      expect(result).toBe('{}');
    });

    it('should handle empty arrays', () => {
      const result = logger.maskSensitive([]);
      expect(result).toBe('[]');
    });

    it('should handle primitive types', () => {
      expect(logger.maskSensitive(123)).toBe('123');
      expect(logger.maskSensitive(true)).toBe('true');
      expect(logger.maskSensitive(false)).toBe('false');
    });

    it('should handle circular references gracefully', () => {
      const circular = { name: 'test' };
      circular.self = circular;

      expect(() => logger.maskSensitive(circular)).not.toThrow();
    });

    it('should handle very deep nesting', () => {
      let deep = { password: 'secret' };
      for (let i = 0; i < 100; i++) {
        deep = { nested: deep };
      }

      expect(() => logger.maskSensitive(deep)).not.toThrow();
    });

    it('should handle objects with null prototype', () => {
      const obj = Object.create(null);
      obj.password = 'secret';

      const result = logger.maskSensitive(obj);
      const parsed = JSON.parse(result);
      expect(parsed.password).toBe('***REDACTED***');
    });

    it('should handle empty string values', () => {
      const obj = {
        password: '',
        token: '',
        normal: ''
      };

      const result = logger.maskSensitive(obj);
      const parsed = JSON.parse(result);

      expect(parsed.password).toBe('***REDACTED***');
      expect(parsed.token).toBe('***REDACTED***');
      expect(parsed.normal).toBe('');
    });

    it('should handle special characters in values', () => {
      const obj = {
        password: 'p@$$w0rd!@#$%^&*()',
        token: 't0k3n<>?:"{}'
      };

      const result = logger.maskSensitive(obj);
      const parsed = JSON.parse(result);

      expect(parsed.password).toBe('***REDACTED***');
      expect(parsed.token).toBe('***REDACTED***');
    });
  });

  describe('Special Logging Methods', () => {
    it('should log header with separator', () => {
      logger.header('Test Header');

      expect(consoleSpy.log).toHaveBeenCalledWith('\n' + '='.repeat(50));
      expect(consoleSpy.log).toHaveBeenCalledWith('Test Header');
      expect(consoleSpy.log).toHaveBeenCalledWith('='.repeat(50));
    });

    it('should log progress information', () => {
      logger.progress(5, 10, 'Processing item');

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('[5/10]')
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Processing item')
      );
    });

    it('should log section information', () => {
      logger.section('New Section');

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('New Section')
      );
    });

    it('should log tag information', () => {
      logger.tag('important');

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('important')
      );
    });

    it('should log folder information', () => {
      logger.folder('/path/to/folder');

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('/path/to/folder')
      );
    });

    it('should log summary with data', () => {
      logger.summary({
        'Total': 100,
        'Success': 95,
        'Failed': 5
      });

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Total: 100')
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Success: 95')
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Failed: 5')
      );
    });
  });

  describe('Real-World Scenarios', () => {
    it('should mask credentials in HTTP request logs', () => {
      const requestLog = {
        method: 'POST',
        url: '/api/login',
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer sk-1234567890'
        },
        body: {
          username: 'john@example.com',
          password: 'mySecretPassword123'
        }
      };

      const result = logger.maskSensitive(requestLog);

      expect(result).toContain('"method":"POST"');
      expect(result).toContain('"url":"/api/login"');
      expect(result).toContain('"content-type":"application/json"');
      expect(result).toContain('"authorization":"***REDACTED***"');
      expect(result).toContain('"username":"john@example.com"');
      expect(result).toContain('"password":"***REDACTED***"');
      expect(result).not.toContain('Bearer sk-1234567890');
      expect(result).not.toContain('mySecretPassword123');
    });

    it('should mask API keys in configuration objects', () => {
      const config = {
        app: {
          name: 'MyApp',
          version: '1.0.0'
        },
        services: {
          stripe: {
            apiKey: 'sk_live_abcdef123456',
            publishableKey: 'pk_live_xyz789'
          },
          aws: {
            accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
            secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
          }
        }
      };

      const result = logger.maskSensitive(config);

      expect(result).toContain('"name":"MyApp"');
      expect(result).toContain('"apiKey":"***REDACTED***"');
      expect(result).toContain('"publishableKey":"pk_live_xyz789"'); // Not masked (doesn't contain 'apikey')
      expect(result).toContain('"accessKeyId":"AKIAIOSFODNN7EXAMPLE"'); // Not masked
      expect(result).toContain('"secretAccessKey":"***REDACTED***"'); // Contains 'secret'
      expect(result).not.toContain('sk_live_abcdef123456');
      expect(result).not.toContain('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');
    });

    it('should mask database connection strings', () => {
      const dbConfig = {
        connection: 'postgresql://user:password@localhost:5432/db',
        credentials: {
          username: 'dbuser',
          password: 'dbpass123'
        }
      };

      const result = logger.maskSensitive(dbConfig);

      // Connection string pattern should be masked
      expect(result).toContain('password: ***REDACTED***');
      expect(result).toContain('"username":"dbuser"');
      expect(result).toContain('"password":"***REDACTED***"');
      expect(result).not.toContain('dbpass123');
    });

    it('should mask JWT tokens in authentication flows', () => {
      const authFlow = {
        step: 'authentication',
        user: 'alice@example.com',
        auth: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'def50200e8f7b...',
          idToken: 'eyJhbGciOiJSUzI1NiIsImtpZCI6...'
        }
      };

      const result = logger.maskSensitive(authFlow);

      expect(result).toContain('"step":"authentication"');
      expect(result).toContain('"user":"alice@example.com"');
      // All token-related keys are masked
      expect(result).toContain('"accessToken":"***REDACTED***"');
      expect(result).toContain('"refreshToken":"***REDACTED***"');
      expect(result).toContain('"idToken":"***REDACTED***"');
      expect(result).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(result).not.toContain('def50200e8f7b');
    });

    it('should handle error objects with sensitive data', () => {
      const error = {
        message: 'Authentication failed: Invalid apiToken abc123',
        code: 'AUTH_ERROR',
        context: {
          apiKey: 'sk-test-123',
          timestamp: '2024-01-01T00:00:00Z'
        }
      };

      const result = logger.maskSensitive(error);

      // Pattern masking should mask the token in the message
      expect(result).toContain('***REDACTED***');
      expect(result).not.toContain('abc123');
      expect(result).toContain('"code":"AUTH_ERROR"');
      expect(result).toContain('"api_key":"***REDACTED***"');
      expect(result).toContain('"timestamp":"2024-01-01T00:00:00Z"');
      expect(result).not.toContain('sk-test-123');
    });
  });
});
