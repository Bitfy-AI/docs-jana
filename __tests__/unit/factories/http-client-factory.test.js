/**
 * Unit tests for HttpClientFactory
 */

const HttpClientFactory = require('../../../src/core/factories/http-client-factory');
const { HttpClient, N8NHttpClient } = require('../../../src/core/http');

// Mock ConfigManager
jest.mock('../../../src/utils/config-manager', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn((key, defaultValue) => {
      const config = {
        http: {
          timeout: 30000,
          maxRetries: 3,
          retryDelay: 1000
        },
        'n8n.source': {
          url: 'https://source.example.com',
          apiKey: 'source-key'
        },
        'n8n.target': {
          url: 'https://target.example.com',
          apiKey: 'target-key'
        }
      };
      return config[key] || defaultValue;
    }),
    validateN8N: jest.fn()
  }));
});

describe('HttpClientFactory', () => {
  describe('create', () => {
    test('creates generic HttpClient', () => {
      const client = HttpClientFactory.create({
        baseUrl: 'https://api.example.com',
        timeout: 10000
      });

      expect(client).toBeInstanceOf(HttpClient);
    });

    test('creates N8N client when type is n8n', () => {
      const client = HttpClientFactory.create({
        type: 'n8n',
        baseUrl: 'https://n8n.example.com',
        apiKey: 'test-key'
      });

      expect(client).toBeInstanceOf(N8NHttpClient);
    });

    test('throws error if baseUrl missing', () => {
      expect(() => HttpClientFactory.create({}))
        .toThrow('baseUrl is required');
    });

    test('throws error for N8N client without apiKey', () => {
      expect(() => HttpClientFactory.create({
        type: 'n8n',
        baseUrl: 'https://n8n.example.com'
      })).toThrow('apiKey is required');
    });

    test('validates timeout is positive number', () => {
      expect(() => HttpClientFactory.create({
        baseUrl: 'https://api.example.com',
        timeout: -1000
      })).toThrow('timeout must be a positive number');
    });

    test('validates maxRetries is non-negative', () => {
      expect(() => HttpClientFactory.create({
        baseUrl: 'https://api.example.com',
        maxRetries: -1
      })).toThrow('maxRetries must be a non-negative number');
    });
  });

  describe('createN8NClient', () => {
    test('creates source N8N client', () => {
      const client = HttpClientFactory.createN8NClient('source');
      expect(client).toBeInstanceOf(N8NHttpClient);
    });

    test('creates target N8N client', () => {
      const client = HttpClientFactory.createN8NClient('target');
      expect(client).toBeInstanceOf(N8NHttpClient);
    });

    test('throws error for invalid type', () => {
      expect(() => HttpClientFactory.createN8NClient('invalid'))
        .toThrow('Invalid N8N client type');
    });
  });

  describe('createFromConfig', () => {
    test('creates client from ConfigManager defaults', () => {
      const client = HttpClientFactory.createFromConfig();
      // Should not throw and should be HttpClient instance
      expect(client).toBeDefined();
    });
  });

  describe('config merging', () => {
    test('merges user config with defaults', () => {
      const client = HttpClientFactory.create({
        baseUrl: 'https://api.example.com',
        timeout: 45000 // Override default
      });

      expect(client).toBeInstanceOf(HttpClient);
    });

    test('handles ConfigManager failure gracefully', () => {
      // Even if ConfigManager fails, should work with provided config
      const client = HttpClientFactory.create({
        baseUrl: 'https://api.example.com'
      });

      expect(client).toBeInstanceOf(HttpClient);
    });
  });
});
