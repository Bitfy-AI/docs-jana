/**
 * Unit Tests for ConfigManager - SOURCE_N8N_TAG support
 *
 * Tests the SOURCE/TARGET fallback logic for tag filtering
 */

const ConfigManager = require('../../src/utils/config-manager');
const n8nConfigSchema = require('../../src/config/n8n-config-schema');

describe('ConfigManager - SOURCE/TARGET Tag Support', () => {
  describe('Schema validation', () => {
    it('should have sourceTag field in n8n config schema', () => {
      expect(n8nConfigSchema.sourceTag).toBeDefined();
      expect(n8nConfigSchema.sourceTag.type).toBe('string');
      expect(n8nConfigSchema.sourceTag.env).toBe('SOURCE_N8N_TAG');
      expect(n8nConfigSchema.sourceTag.required).toBe(false);
    });

    it('should have targetTag field in n8n config schema', () => {
      expect(n8nConfigSchema.targetTag).toBeDefined();
      expect(n8nConfigSchema.targetTag.type).toBe('string');
      expect(n8nConfigSchema.targetTag.env).toBe('TARGET_N8N_TAG');
      expect(n8nConfigSchema.targetTag.required).toBe(false);
    });

    it('should have tag field in n8n config schema', () => {
      expect(n8nConfigSchema.tag).toBeDefined();
      expect(n8nConfigSchema.tag.type).toBe('string');
      expect(n8nConfigSchema.tag.env).toBe('N8N_TAG');
      expect(n8nConfigSchema.tag.required).toBe(false);
    });
  });

  describe('Tag fallback logic', () => {
    it('should use N8N_TAG when SOURCE_N8N_TAG is not set', () => {
      const env = {
        N8N_URL: 'https://n8n.example.com',
        N8N_API_KEY: 'test-key',
        N8N_TAG: 'production',
      };

      const configManager = new ConfigManager(null, ['node', 'script.js'], env);
      const config = configManager.load();

      expect(config.tag).toBe('production');
      expect(config.sourceTag).toBeUndefined();
    });

    it('should use SOURCE_N8N_TAG when both are set', () => {
      const env = {
        N8N_URL: 'https://n8n.example.com',
        N8N_API_KEY: 'test-key',
        N8N_TAG: 'development',
        SOURCE_N8N_URL: 'https://source.n8n.example.com',
        SOURCE_N8N_API_KEY: 'source-key',
        SOURCE_N8N_TAG: 'production',
      };

      const configManager = new ConfigManager(null, ['node', 'script.js'], env);
      const config = configManager.load();

      // ConfigManager should apply fallback: sourceTag → tag
      expect(config.sourceTag).toBe('production');
      expect(config.tag).toBe('production'); // Falls back to sourceTag
    });

    it('should use N8N_TAG when only N8N credentials are set', () => {
      const env = {
        N8N_URL: 'https://n8n.example.com',
        N8N_API_KEY: 'test-key',
        N8N_TAG: 'staging',
      };

      const configManager = new ConfigManager(null, ['node', 'script.js'], env);
      const config = configManager.load();

      expect(config.tag).toBe('staging');
      expect(config.sourceTag).toBeUndefined();
    });

    it('should work without any tag set', () => {
      const env = {
        N8N_URL: 'https://n8n.example.com',
        N8N_API_KEY: 'test-key',
      };

      const configManager = new ConfigManager(null, ['node', 'script.js'], env);
      const config = configManager.load();

      expect(config.tag).toBeUndefined();
      expect(config.sourceTag).toBeUndefined();
    });
  });

  describe('CLI argument precedence', () => {
    it('should use SOURCE_N8N_TAG from environment when set', () => {
      const env = {
        N8N_URL: 'https://n8n.example.com',
        N8N_API_KEY: 'test-key',
        SOURCE_N8N_TAG: 'production',
      };

      const argv = ['node', 'script.js'];

      const configManager = new ConfigManager(null, argv, env);
      const config = configManager.load();

      // SOURCE_N8N_TAG should be used
      expect(config.tag).toBe('production');
      expect(config.sourceTag).toBe('production');
    });

    it('should use positional argument for tag', () => {
      const env = {
        N8N_URL: 'https://n8n.example.com',
        N8N_API_KEY: 'test-key',
      };

      const argv = ['node', 'script.js', 'https://n8n.com', 'api-key', 'my-tag'];

      const configManager = new ConfigManager(null, argv, env);
      const config = configManager.load();

      expect(config.tag).toBe('my-tag');
    });
  });

  describe('Integration with SOURCE/TARGET pattern', () => {
    it('should apply all SOURCE fallbacks together', () => {
      const env = {
        N8N_URL: 'https://target.n8n.example.com',
        N8N_API_KEY: 'target-key',
        N8N_TAG: 'development',
        SOURCE_N8N_URL: 'https://source.n8n.example.com',
        SOURCE_N8N_API_KEY: 'source-key',
        SOURCE_N8N_TAG: 'production',
      };

      const configManager = new ConfigManager(null, ['node', 'script.js'], env);
      const config = configManager.load();

      // All SOURCE values should take precedence
      expect(config.n8nUrl).toBe('https://source.n8n.example.com');
      expect(config.apiKey).toBe('source-key');
      expect(config.tag).toBe('production');
    });

    it('should keep N8N values when SOURCE is not set', () => {
      const env = {
        N8N_URL: 'https://n8n.example.com',
        N8N_API_KEY: 'test-key',
        N8N_TAG: 'production',
      };

      const configManager = new ConfigManager(null, ['node', 'script.js'], env);
      const config = configManager.load();

      expect(config.n8nUrl).toBe('https://n8n.example.com');
      expect(config.apiKey).toBe('test-key');
      expect(config.tag).toBe('production');
    });

    it('should handle partial SOURCE configuration', () => {
      const env = {
        N8N_URL: 'https://n8n.example.com',
        N8N_API_KEY: 'test-key',
        N8N_TAG: 'development',
        SOURCE_N8N_URL: 'https://source.n8n.example.com',
        // No SOURCE_N8N_API_KEY
        SOURCE_N8N_TAG: 'production',
      };

      const configManager = new ConfigManager(null, ['node', 'script.js'], env);
      const config = configManager.load();

      // URL and TAG should use SOURCE, API_KEY should use N8N
      expect(config.n8nUrl).toBe('https://source.n8n.example.com');
      expect(config.apiKey).toBe('test-key'); // Falls back to N8N
      expect(config.tag).toBe('production'); // Uses SOURCE
    });
  });

  describe('TARGET_N8N_TAG Support', () => {
    it('should load TARGET_N8N_TAG from environment', () => {
      const env = {
        N8N_URL: 'https://n8n.example.com',
        N8N_API_KEY: 'test-key',
        TARGET_N8N_URL: 'https://target.n8n.example.com',
        TARGET_N8N_API_KEY: 'target-key',
        TARGET_N8N_TAG: 'production-target',
      };

      const configManager = new ConfigManager(null, ['node', 'script.js'], env);
      const config = configManager.load();

      expect(config.targetTag).toBe('production-target');
      expect(config.targetN8nUrl).toBe('https://target.n8n.example.com');
      expect(config.targetApiKey).toBe('target-key');
    });

    it('should keep both SOURCE and TARGET tags available', () => {
      const env = {
        N8N_URL: 'https://n8n.example.com',
        N8N_API_KEY: 'test-key',
        SOURCE_N8N_URL: 'https://source.n8n.example.com',
        SOURCE_N8N_API_KEY: 'source-key',
        SOURCE_N8N_TAG: 'production-source',
        TARGET_N8N_URL: 'https://target.n8n.example.com',
        TARGET_N8N_API_KEY: 'target-key',
        TARGET_N8N_TAG: 'staging-target',
      };

      const configManager = new ConfigManager(null, ['node', 'script.js'], env);
      const config = configManager.load();

      // SOURCE tags take precedence for config.tag (download operations)
      expect(config.tag).toBe('production-source');
      expect(config.sourceTag).toBe('production-source');

      // TARGET tags available separately (upload operations)
      expect(config.targetTag).toBe('staging-target');
    });

    it('should work with only TARGET_N8N_TAG set', () => {
      const env = {
        N8N_URL: 'https://n8n.example.com',
        N8N_API_KEY: 'test-key',
        TARGET_N8N_TAG: 'qa-environment',
      };

      const configManager = new ConfigManager(null, ['node', 'script.js'], env);
      const config = configManager.load();

      expect(config.targetTag).toBe('qa-environment');
      expect(config.tag).toBeUndefined(); // No SOURCE or N8N_TAG fallback
    });
  });
});
