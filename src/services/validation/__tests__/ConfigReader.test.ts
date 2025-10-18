/**
 * Testes unitários para ConfigReader
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { ConfigReader, ConfigError } from '../ConfigReader';
import { DEFAULT_VALIDATION_CONFIG } from '../../../types/validation';

// Mock do fs
vi.mock('fs');

describe('ConfigReader', () => {
  const TEST_CONFIG_PATH = '.jana/config.test.json';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('read()', () => {
    it('should read valid configuration from file', () => {
      const mockConfig = {
        validation: {
          idPattern: String.raw`\([A-Z]+-[A-Z]+-\d{3}\)`,
          strict: true,
          maxDuplicates: 100,
          logPath: '.jana/logs/validation.log',
        },
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockConfig));

      const reader = new ConfigReader(TEST_CONFIG_PATH);
      const config = reader.read();

      expect(config).toEqual({
        idPattern: String.raw`\([A-Z]+-[A-Z]+-\d{3}\)`,
        strict: true,
        maxDuplicates: 100,
        logPath: '.jana/logs/validation.log',
      });
    });

    it('should create default config if file does not exist', () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdirSync).mockReturnValue(undefined);
      vi.mocked(writeFileSync).mockReturnValue(undefined);
      vi.mocked(readFileSync).mockReturnValue(
        JSON.stringify({
          validation: DEFAULT_VALIDATION_CONFIG,
        })
      );

      const reader = new ConfigReader(TEST_CONFIG_PATH);
      const config = reader.read();

      expect(mkdirSync).toHaveBeenCalled();
      expect(writeFileSync).toHaveBeenCalledWith(
        TEST_CONFIG_PATH,
        expect.stringContaining('"validation"'),
        'utf-8'
      );
      expect(config.idPattern).toBeDefined();
    });

    it('should use default values for optional fields', () => {
      const mockConfig = {
        validation: {
          strict: true,
          maxDuplicates: 50,
          logPath: '.jana/logs/custom.log',
        },
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockConfig));

      const reader = new ConfigReader(TEST_CONFIG_PATH);
      const config = reader.read();

      expect(config.idPattern).toBe(DEFAULT_VALIDATION_CONFIG.idPattern);
      expect(config.strict).toBe(true);
      expect(config.maxDuplicates).toBe(50);
    });

    it('should throw ConfigError on invalid JSON', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('{ invalid json }');

      const reader = new ConfigReader(TEST_CONFIG_PATH);

      expect(() => reader.read()).toThrow(ConfigError);
      expect(() => reader.read()).toThrow(/Invalid JSON in config file/);
    });

    it('should throw ConfigError on schema validation failure', () => {
      const invalidConfig = {
        validation: {
          strict: 'not-a-boolean', // Should be boolean
          maxDuplicates: -10, // Should be positive
          logPath: '.jana/logs/test.log',
        },
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(invalidConfig));

      const reader = new ConfigReader(TEST_CONFIG_PATH);

      expect(() => reader.read()).toThrow(ConfigError);
    });
  });

  describe('validateIDPattern()', () => {
    it('should validate correct regex pattern', () => {
      const reader = new ConfigReader(TEST_CONFIG_PATH);

      expect(reader.validateIDPattern(String.raw`\([A-Z]+\)`)).toBe(true);
      expect(reader.validateIDPattern(String.raw`\d{3}`)).toBe(true);
      expect(reader.validateIDPattern(String.raw`[A-Z]+-[A-Z]+-\d{3}`)).toBe(true);
    });

    it('should throw ConfigError on invalid regex', () => {
      const reader = new ConfigReader(TEST_CONFIG_PATH);

      expect(() => reader.validateIDPattern('([A-Z')).toThrow(ConfigError);
      expect(() => reader.validateIDPattern('*invalid*')).toThrow(ConfigError);
    });

    it('should include error details in ConfigError', () => {
      const reader = new ConfigReader(TEST_CONFIG_PATH);

      try {
        reader.validateIDPattern('([unclosed');
        expect.fail('Should have thrown ConfigError');
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigError);
        expect((error as ConfigError).missingField).toBe('validation.idPattern');
        expect((error as ConfigError).message).toContain('Invalid regex pattern');
      }
    });
  });

  describe('getDefault()', () => {
    it('should return default configuration', () => {
      const defaultConfig = ConfigReader.getDefault();

      expect(defaultConfig).toEqual(DEFAULT_VALIDATION_CONFIG);
    });

    it('should return copy not reference', () => {
      const config1 = ConfigReader.getDefault();
      const config2 = ConfigReader.getDefault();

      config1.strict = false;

      expect(config2.strict).toBe(true); // Should not be affected
    });
  });

  describe('createDefaultConfig()', () => {
    it('should create directories recursively', () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdirSync).mockReturnValue(undefined);
      vi.mocked(writeFileSync).mockReturnValue(undefined);
      vi.mocked(readFileSync).mockReturnValue(
        JSON.stringify({ validation: DEFAULT_VALIDATION_CONFIG })
      );

      const reader = new ConfigReader('.jana/nested/path/config.json');
      reader.read();

      expect(mkdirSync).toHaveBeenCalledWith(expect.stringContaining('.jana/nested/path'), {
        recursive: true,
      });
    });

    it('should write properly formatted JSON', () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdirSync).mockReturnValue(undefined);
      let writtenContent = '';
      vi.mocked(writeFileSync).mockImplementation((path, content) => {
        writtenContent = content as string;
      });
      vi.mocked(readFileSync).mockReturnValue(writtenContent || '{}');

      const reader = new ConfigReader(TEST_CONFIG_PATH);
      reader.read();

      expect(writtenContent).toContain('"validation"');
      expect(writtenContent).toContain('"n8n"');
      expect(() => JSON.parse(writtenContent)).not.toThrow();
    });

    it('should use environment variables if available', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        N8N_API_URL: 'https://test.n8n.com',
        N8N_API_KEY: 'test-key-123',
      };

      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdirSync).mockReturnValue(undefined);
      let writtenContent = '';
      vi.mocked(writeFileSync).mockImplementation((path, content) => {
        writtenContent = content as string;
      });

      const reader = new ConfigReader(TEST_CONFIG_PATH);

      // Trigger createDefaultConfig
      vi.mocked(readFileSync).mockReturnValue(writtenContent || '{}');

      expect(writtenContent).toContain('https://test.n8n.com');
      expect(writtenContent).toContain('test-key-123');

      process.env = originalEnv;
    });
  });
});
