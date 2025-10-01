/**
 * Unit Tests for EnvLoader
 * Tests critical security and reliability fixes including:
 * - TOCTOU fix (no existsSync check before read)
 * - ENOENT error handling (file not found is not an error)
 * - .env parsing (KEY=VALUE format)
 * - Quote removal
 * - Comment and empty line handling
 */

const EnvLoader = require('../../src/utils/env-loader');
const fs = require('fs');
const path = require('path');

describe('EnvLoader', () => {
  let originalEnv;

  beforeEach(() => {
    // Save original process.env
    originalEnv = { ...process.env };

    // Clear process.env for testing
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('TEST_')) {
        delete process.env[key];
      }
    });

    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original process.env
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('TOCTOU Fix', () => {
    it('should attempt to read file directly without existsSync check', () => {
      const readFileSpy = jest.spyOn(fs, 'readFileSync').mockReturnValue('TEST_KEY=value');
      const existsSpy = jest.spyOn(fs, 'existsSync');

      EnvLoader.load('/test/.env');

      // Should call readFileSync directly
      expect(readFileSpy).toHaveBeenCalledWith('/test/.env', 'utf8');

      // Should NOT call existsSync (TOCTOU vulnerability prevention)
      expect(existsSpy).not.toHaveBeenCalled();
    });

    it('should handle ENOENT gracefully without logging error', () => {
      const error = new Error('ENOENT: no such file or directory');
      error.code = 'ENOENT';
      jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw error;
      });

      const result = EnvLoader.load('/nonexistent/.env');

      expect(result).toBe(false);
      expect(console.warn).not.toHaveBeenCalled();
      expect(console.error).not.toHaveBeenCalled();
    });

    it('should log warning for non-ENOENT errors', () => {
      const error = new Error('EACCES: permission denied');
      error.code = 'EACCES';
      jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw error;
      });

      const result = EnvLoader.load('/test/.env');

      expect(result).toBe(false);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Could not load .env file')
      );
    });
  });

  describe('.env Parsing', () => {
    it('should parse simple KEY=VALUE pairs', () => {
      jest.spyOn(fs, 'readFileSync').mockReturnValue(
        'TEST_KEY1=value1\nTEST_KEY2=value2'
      );

      const result = EnvLoader.load('/test/.env');

      expect(result).toBe(true);
      expect(process.env.TEST_KEY1).toBe('value1');
      expect(process.env.TEST_KEY2).toBe('value2');
    });

    it('should handle values with spaces', () => {
      jest.spyOn(fs, 'readFileSync').mockReturnValue(
        'TEST_KEY=value with spaces'
      );

      EnvLoader.load('/test/.env');

      expect(process.env.TEST_KEY).toBe('value with spaces');
    });

    it('should handle empty values', () => {
      jest.spyOn(fs, 'readFileSync').mockReturnValue(
        'TEST_EMPTY='
      );

      EnvLoader.load('/test/.env');

      expect(process.env.TEST_EMPTY).toBe('');
    });

    it('should skip empty lines', () => {
      jest.spyOn(fs, 'readFileSync').mockReturnValue(
        'TEST_KEY1=value1\n\n\nTEST_KEY2=value2'
      );

      EnvLoader.load('/test/.env');

      expect(process.env.TEST_KEY1).toBe('value1');
      expect(process.env.TEST_KEY2).toBe('value2');
    });

    it('should skip comment lines', () => {
      jest.spyOn(fs, 'readFileSync').mockReturnValue(
        '# This is a comment\nTEST_KEY=value\n# Another comment'
      );

      EnvLoader.load('/test/.env');

      expect(process.env.TEST_KEY).toBe('value');
    });

    it('should skip lines with only whitespace', () => {
      jest.spyOn(fs, 'readFileSync').mockReturnValue(
        'TEST_KEY1=value1\n   \t   \nTEST_KEY2=value2'
      );

      EnvLoader.load('/test/.env');

      expect(process.env.TEST_KEY1).toBe('value1');
      expect(process.env.TEST_KEY2).toBe('value2');
    });

    it('should skip lines with empty keys (e.g., "=value")', () => {
      jest.spyOn(fs, 'readFileSync').mockReturnValue(
        '=invalid\nTEST_KEY=valid'
      );

      EnvLoader.load('/test/.env');

      expect(process.env['']).toBeUndefined();
      expect(process.env.TEST_KEY).toBe('valid');
    });
  });

  describe('Quote Removal', () => {
    it('should remove double quotes from values', () => {
      jest.spyOn(fs, 'readFileSync').mockReturnValue(
        'TEST_KEY="quoted value"'
      );

      EnvLoader.load('/test/.env');

      expect(process.env.TEST_KEY).toBe('quoted value');
    });

    it('should remove single quotes from values', () => {
      jest.spyOn(fs, 'readFileSync').mockReturnValue(
        "TEST_KEY='quoted value'"
      );

      EnvLoader.load('/test/.env');

      expect(process.env.TEST_KEY).toBe('quoted value');
    });

    it('should not remove mismatched quotes', () => {
      jest.spyOn(fs, 'readFileSync').mockReturnValue(
        'TEST_KEY="quoted value\''
      );

      EnvLoader.load('/test/.env');

      expect(process.env.TEST_KEY).toBe('"quoted value\'');
    });

    it('should handle values with quotes in the middle', () => {
      jest.spyOn(fs, 'readFileSync').mockReturnValue(
        'TEST_KEY=value "with" quotes'
      );

      EnvLoader.load('/test/.env');

      expect(process.env.TEST_KEY).toBe('value "with" quotes');
    });

    it('should handle empty quoted values', () => {
      jest.spyOn(fs, 'readFileSync').mockReturnValue(
        'TEST_EMPTY1=""\nTEST_EMPTY2=\'\''
      );

      EnvLoader.load('/test/.env');

      expect(process.env.TEST_EMPTY1).toBe('');
      expect(process.env.TEST_EMPTY2).toBe('');
    });
  });

  describe('Variable Precedence', () => {
    it('should not overwrite existing environment variables', () => {
      process.env.TEST_EXISTING = 'original';

      jest.spyOn(fs, 'readFileSync').mockReturnValue(
        'TEST_EXISTING=from_env_file'
      );

      EnvLoader.load('/test/.env');

      // Should keep original value
      expect(process.env.TEST_EXISTING).toBe('original');
    });

    it('should set new variables', () => {
      jest.spyOn(fs, 'readFileSync').mockReturnValue(
        'TEST_NEW=new_value'
      );

      EnvLoader.load('/test/.env');

      expect(process.env.TEST_NEW).toBe('new_value');
    });
  });

  describe('Edge Cases', () => {
    it('should handle values with equals signs', () => {
      jest.spyOn(fs, 'readFileSync').mockReturnValue(
        'TEST_KEY=value=with=equals'
      );

      EnvLoader.load('/test/.env');

      expect(process.env.TEST_KEY).toBe('value=with=equals');
    });

    it('should handle keys with spaces after trimming', () => {
      jest.spyOn(fs, 'readFileSync').mockReturnValue(
        'TEST_KEY   =   value'
      );

      EnvLoader.load('/test/.env');

      expect(process.env.TEST_KEY).toBe('value');
    });

    it('should handle Windows line endings (CRLF)', () => {
      jest.spyOn(fs, 'readFileSync').mockReturnValue(
        'TEST_KEY1=value1\r\nTEST_KEY2=value2'
      );

      EnvLoader.load('/test/.env');

      expect(process.env.TEST_KEY1).toBe('value1');
      expect(process.env.TEST_KEY2).toBe('value2');
    });

    it('should handle mixed line endings', () => {
      jest.spyOn(fs, 'readFileSync').mockReturnValue(
        'TEST_KEY1=value1\nTEST_KEY2=value2\nTEST_KEY3=value3'
      );

      EnvLoader.load('/test/.env');

      expect(process.env.TEST_KEY1).toBe('value1');
      expect(process.env.TEST_KEY2).toBe('value2');
      expect(process.env.TEST_KEY3).toBe('value3');
    });

    it('should handle empty file', () => {
      jest.spyOn(fs, 'readFileSync').mockReturnValue('');

      const result = EnvLoader.load('/test/.env');

      expect(result).toBe(true);
    });

    it('should handle file with only comments', () => {
      jest.spyOn(fs, 'readFileSync').mockReturnValue(
        '# Comment 1\n# Comment 2\n# Comment 3'
      );

      const result = EnvLoader.load('/test/.env');

      expect(result).toBe(true);
    });

    it('should handle special characters in values', () => {
      jest.spyOn(fs, 'readFileSync').mockReturnValue(
        'TEST_KEY=value!@#$%^&*()'
      );

      EnvLoader.load('/test/.env');

      expect(process.env.TEST_KEY).toBe('value!@#$%^&*()');
    });

    it('should handle multiline values (split into separate lines)', () => {
      jest.spyOn(fs, 'readFileSync').mockReturnValue(
        'TEST_KEY=line1\nline2'
      );

      EnvLoader.load('/test/.env');

      // Should only parse first line as KEY=VALUE
      expect(process.env.TEST_KEY).toBe('line1');
    });
  });

  describe('Default Path', () => {
    it('should use process.cwd()/.env as default path', () => {
      const expectedPath = path.join(process.cwd(), '.env');
      const readFileSpy = jest.spyOn(fs, 'readFileSync').mockReturnValue('TEST_KEY=value');

      EnvLoader.load();

      expect(readFileSpy).toHaveBeenCalledWith(expectedPath, 'utf8');
    });
  });

  describe('exists() method', () => {
    it('should return true if .env exists', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);

      expect(EnvLoader.exists()).toBe(true);
    });

    it('should return false if .env does not exist', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);

      expect(EnvLoader.exists()).toBe(false);
    });
  });

  describe('createFromExample() method', () => {
    it('should create .env from .env.example', () => {
      jest.spyOn(fs, 'existsSync').mockImplementation((path) => {
        return path.includes('.env.example'); // .env.example exists, .env doesn't
      });
      jest.spyOn(fs, 'copyFileSync').mockImplementation(() => {});

      const result = EnvLoader.createFromExample();

      expect(result).toBe(true);
      expect(fs.copyFileSync).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('criado'));
    });

    it('should not overwrite existing .env', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true); // Both files exist

      const result = EnvLoader.createFromExample();

      expect(result).toBe(false);
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('já existe'));
    });

    it('should fail if .env.example does not exist', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);

      const result = EnvLoader.createFromExample();

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('não encontrado'));
    });

    it('should handle copy errors', () => {
      jest.spyOn(fs, 'existsSync').mockImplementation((path) => {
        return path.includes('.env.example');
      });
      jest.spyOn(fs, 'copyFileSync').mockImplementation(() => {
        throw new Error('Copy failed');
      });

      const result = EnvLoader.createFromExample();

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Erro'));
    });
  });

  describe('Real-world .env Examples', () => {
    it('should parse typical .env file', () => {
      jest.spyOn(fs, 'readFileSync').mockReturnValue(`
# Database configuration
TEST_DB_HOST=localhost
TEST_DB_PORT=5432
TEST_DB_NAME=mydb

# API Keys
TEST_API_KEY="sk-1234567890abcdef"
TEST_SECRET_KEY='my-secret-key'

# Feature flags
TEST_FEATURE_ENABLED=true
TEST_DEBUG=false
      `);

      EnvLoader.load('/test/.env');

      expect(process.env.TEST_DB_HOST).toBe('localhost');
      expect(process.env.TEST_DB_PORT).toBe('5432');
      expect(process.env.TEST_DB_NAME).toBe('mydb');
      expect(process.env.TEST_API_KEY).toBe('sk-1234567890abcdef');
      expect(process.env.TEST_SECRET_KEY).toBe('my-secret-key');
      expect(process.env.TEST_FEATURE_ENABLED).toBe('true');
      expect(process.env.TEST_DEBUG).toBe('false');
    });

    it('should handle URLs and connection strings', () => {
      jest.spyOn(fs, 'readFileSync').mockReturnValue(
        'TEST_DATABASE_URL="postgresql://user:password@localhost:5432/db?schema=public"'
      );

      EnvLoader.load('/test/.env');

      expect(process.env.TEST_DATABASE_URL).toBe('postgresql://user:password@localhost:5432/db?schema=public');
    });

    it('should handle complex values with special characters', () => {
      jest.spyOn(fs, 'readFileSync').mockReturnValue(
        'TEST_JWT_SECRET="my-jwt-secret!@#$%^&*()_+-=[]{}|;:,.<>?"'
      );

      EnvLoader.load('/test/.env');

      expect(process.env.TEST_JWT_SECRET).toBe('my-jwt-secret!@#$%^&*()_+-=[]{}|;:,.<>?');
    });
  });
});
