/**
 * ConfigManager Unit Tests
 *
 * Tests comprehensive functionality of ConfigManager including:
 * - Loading default config when file doesn't exist
 * - Loading and merging user config
 * - Saving config to file
 * - Config validation (invalid values)
 * - Schema migration
 * - Edge cases (corrupted JSON, missing fields)
 */

const path = require('path');
const os = require('os');

// Mock do sistema de arquivos - DEVE vir antes do require do ConfigManager
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn()
  }
}));

const fs = require('fs').promises;
const ConfigManager = require('../../../../src/ui/menu/components/ConfigManager');

describe('ConfigManager', () => {
  let configManager;
  const expectedConfigPath = path.join(os.homedir(), '.docs-jana', 'config.json');

  beforeEach(() => {
    configManager = new ConfigManager();
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with null config', () => {
      expect(configManager.config).toBeNull();
    });

    it('should set correct config path', () => {
      expect(configManager.configPath).toBe(expectedConfigPath);
    });
  });

  describe('load()', () => {
    it('should load default config when file does not exist', async () => {
      // Simula arquivo não existente
      fs.access.mockRejectedValue({ code: 'ENOENT' });
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();

      const config = await configManager.load();

      expect(config).toHaveProperty('version', '1.0');
      expect(config).toHaveProperty('preferences');
      expect(config.preferences).toHaveProperty('theme', 'default');
      expect(config.preferences).toHaveProperty('animationsEnabled', true);
      expect(config.preferences).toHaveProperty('animationSpeed', 'normal');
      expect(config.preferences).toHaveProperty('iconsEnabled', true);
      expect(config.preferences).toHaveProperty('showDescriptions', true);
      expect(config.preferences).toHaveProperty('showPreviews', true);
      expect(config.preferences).toHaveProperty('historySize', 50);

      // Deve salvar configuração padrão
      expect(fs.writeFile).toHaveBeenCalledWith(
        expectedConfigPath,
        expect.any(String),
        expect.objectContaining({ encoding: 'utf-8', mode: 0o600 })
      );
    });

    it('should load and merge user config from file', async () => {
      const userConfig = {
        version: '1.0',
        preferences: {
          theme: 'dark',
          animationsEnabled: false,
          animationSpeed: 'fast',
          iconsEnabled: true,
          showDescriptions: true,
          showPreviews: false,
          historySize: 100
        }
      };

      fs.access.mockResolvedValue();
      fs.readFile.mockResolvedValue(JSON.stringify(userConfig));

      const config = await configManager.load();

      expect(config.preferences.theme).toBe('dark');
      expect(config.preferences.animationsEnabled).toBe(false);
      expect(config.preferences.animationSpeed).toBe('fast');
      expect(config.preferences.showPreviews).toBe(false);
      expect(config.preferences.historySize).toBe(100);
    });

    it('should handle corrupted JSON and use defaults', async () => {
      fs.access.mockResolvedValue();
      fs.readFile.mockResolvedValue('{ invalid json content }');
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();

      const config = await configManager.load();

      // Deve retornar configuração padrão
      expect(config.preferences.theme).toBe('default');
      expect(config.preferences.animationsEnabled).toBe(true);

      // Deve ter tentado salvar configuração padrão
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should merge partial user config with defaults', async () => {
      const partialConfig = {
        version: '1.0',
        preferences: {
          theme: 'light',
          // Faltam outros campos - devem usar defaults
        }
      };

      fs.access.mockResolvedValue();
      fs.readFile.mockResolvedValue(JSON.stringify(partialConfig));

      const config = await configManager.load();

      // Campos especificados
      expect(config.preferences.theme).toBe('light');

      // Campos não especificados - devem vir dos defaults
      expect(config.preferences.animationsEnabled).toBe(true);
      expect(config.preferences.animationSpeed).toBe('normal');
      expect(config.preferences.historySize).toBe(50);
    });

    it('should throw error for other file system errors', async () => {
      const permissionError = new Error('Permission denied');
      permissionError.code = 'EACCES';

      fs.access.mockResolvedValue();  // Arquivo existe
      fs.readFile.mockRejectedValue(permissionError);  // Mas não pode ler

      await expect(configManager.load()).rejects.toThrow('Permission denied');
    });
  });

  describe('save()', () => {
    it('should save config to file with correct permissions', async () => {
      const config = ConfigManager.getDefaultConfig();
      configManager.config = config;

      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();

      await configManager.save();

      expect(fs.mkdir).toHaveBeenCalledWith(
        path.join(os.homedir(), '.docs-jana'),
        { recursive: true }
      );

      expect(fs.writeFile).toHaveBeenCalledWith(
        expectedConfigPath,
        expect.stringContaining('"version": "1.0"'),
        expect.objectContaining({
          encoding: 'utf-8',
          mode: 0o600
        })
      );
    });

    it('should save provided config parameter', async () => {
      const customConfig = {
        version: '1.0',
        preferences: {
          theme: 'dark',
          animationsEnabled: true,
          animationSpeed: 'normal',
          iconsEnabled: true,
          showDescriptions: true,
          showPreviews: true,
          historySize: 50,
          keyboardShortcuts: {
            help: ['h', '?'],
            exit: ['q', 'Escape'],
            rerun: ['r']
          }
        }
      };

      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();

      await configManager.save(customConfig);

      const savedContent = fs.writeFile.mock.calls[0][1];
      const savedConfig = JSON.parse(savedContent);

      expect(savedConfig.preferences.theme).toBe('dark');
      expect(configManager.config).toEqual(customConfig);
    });

    it('should throw error if no config to save', async () => {
      await expect(configManager.save()).rejects.toThrow('No configuration to save');
    });

    it('should throw error if save fails', async () => {
      configManager.config = ConfigManager.getDefaultConfig();
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockRejectedValue(new Error('Disk full'));

      await expect(configManager.save()).rejects.toThrow('Failed to save configuration');
    });

    it('should validate config before saving', async () => {
      const invalidConfig = {
        version: '1.0',
        preferences: {
          theme: 'invalid-theme',  // Tema inválido
          animationsEnabled: true,
          animationSpeed: 'normal',
          iconsEnabled: true,
          showDescriptions: true,
          showPreviews: true,
          historySize: 50
        }
      };

      await expect(configManager.save(invalidConfig)).rejects.toThrow('Invalid theme');
    });
  });

  describe('get()', () => {
    beforeEach(async () => {
      fs.access.mockRejectedValue({ code: 'ENOENT' });
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();
      await configManager.load();
    });

    it('should get top-level config value', () => {
      const version = configManager.get('version');
      expect(version).toBe('1.0');
    });

    it('should get nested config value using dot notation', () => {
      const theme = configManager.get('preferences.theme');
      expect(theme).toBe('default');

      const animSpeed = configManager.get('preferences.animationSpeed');
      expect(animSpeed).toBe('normal');
    });

    it('should return undefined for non-existent key', () => {
      const value = configManager.get('preferences.nonExistentKey');
      expect(value).toBeUndefined();
    });

    it('should throw error if config not loaded', () => {
      const freshManager = new ConfigManager();
      expect(() => freshManager.get('theme')).toThrow('Configuration not loaded');
    });
  });

  describe('set()', () => {
    beforeEach(async () => {
      fs.access.mockRejectedValue({ code: 'ENOENT' });
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();
      await configManager.load();
    });

    it('should set nested config value using dot notation', () => {
      configManager.set('preferences.theme', 'dark');
      expect(configManager.config.preferences.theme).toBe('dark');
    });

    it('should set multiple values independently', () => {
      configManager.set('preferences.theme', 'light');
      configManager.set('preferences.animationsEnabled', false);
      configManager.set('preferences.historySize', 100);

      expect(configManager.config.preferences.theme).toBe('light');
      expect(configManager.config.preferences.animationsEnabled).toBe(false);
      expect(configManager.config.preferences.historySize).toBe(100);
    });

    it('should throw error if setting invalid value', () => {
      expect(() => {
        configManager.set('preferences.theme', 'invalid-theme');
      }).toThrow('Invalid theme');
    });

    it('should throw error if config not loaded', () => {
      const freshManager = new ConfigManager();
      expect(() => freshManager.set('theme', 'dark')).toThrow('Configuration not loaded');
    });

    it('should create intermediate objects if they do not exist', () => {
      configManager.set('newSection.newKey', 'newValue');
      expect(configManager.config.newSection.newKey).toBe('newValue');
    });
  });

  describe('reset()', () => {
    it('should reset to default configuration', async () => {
      fs.access.mockRejectedValue({ code: 'ENOENT' });
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();

      await configManager.load();

      // Modifica configuração
      configManager.set('preferences.theme', 'dark');
      configManager.set('preferences.animationsEnabled', false);

      // Reseta
      await configManager.reset();

      // Verifica que voltou aos defaults
      expect(configManager.config.preferences.theme).toBe('default');
      expect(configManager.config.preferences.animationsEnabled).toBe(true);

      // Deve ter salvo
      expect(fs.writeFile).toHaveBeenCalled();
    });
  });

  describe('validateConfig()', () => {
    it('should accept valid config', () => {
      const validConfig = {
        version: '1.0',
        preferences: {
          theme: 'dark',
          animationsEnabled: true,
          animationSpeed: 'fast',
          iconsEnabled: true,
          showDescriptions: true,
          showPreviews: true,
          historySize: 50
        }
      };

      expect(() => configManager.validateConfig(validConfig)).not.toThrow();
    });

    it('should reject config without version', () => {
      const invalidConfig = {
        preferences: {}
      };

      expect(() => configManager.validateConfig(invalidConfig)).toThrow('Config must have a version');
    });

    it('should reject config without preferences', () => {
      const invalidConfig = {
        version: '1.0'
      };

      expect(() => configManager.validateConfig(invalidConfig)).toThrow('Config must have preferences object');
    });

    it('should reject invalid theme', () => {
      const invalidConfig = {
        version: '1.0',
        preferences: {
          theme: 'invalid-theme',
          animationsEnabled: true,
          animationSpeed: 'normal',
          iconsEnabled: true,
          showDescriptions: true,
          showPreviews: true,
          historySize: 50
        }
      };

      expect(() => configManager.validateConfig(invalidConfig)).toThrow('Invalid theme');
    });

    it('should reject invalid animationSpeed', () => {
      const invalidConfig = {
        version: '1.0',
        preferences: {
          theme: 'default',
          animationsEnabled: true,
          animationSpeed: 'super-fast',  // Inválido
          iconsEnabled: true,
          showDescriptions: true,
          showPreviews: true,
          historySize: 50
        }
      };

      expect(() => configManager.validateConfig(invalidConfig)).toThrow('Invalid animationSpeed');
    });

    it('should reject non-boolean values for boolean fields', () => {
      const invalidConfig = {
        version: '1.0',
        preferences: {
          theme: 'default',
          animationsEnabled: 'yes',  // Deve ser boolean
          animationSpeed: 'normal',
          iconsEnabled: true,
          showDescriptions: true,
          showPreviews: true,
          historySize: 50
        }
      };

      expect(() => configManager.validateConfig(invalidConfig)).toThrow('animationsEnabled must be a boolean');
    });

    it('should reject invalid historySize (too small)', () => {
      const invalidConfig = {
        version: '1.0',
        preferences: {
          theme: 'default',
          animationsEnabled: true,
          animationSpeed: 'normal',
          iconsEnabled: true,
          showDescriptions: true,
          showPreviews: true,
          historySize: 0  // Muito pequeno
        }
      };

      expect(() => configManager.validateConfig(invalidConfig)).toThrow('historySize must be a number between 1 and 1000');
    });

    it('should reject invalid historySize (too large)', () => {
      const invalidConfig = {
        version: '1.0',
        preferences: {
          theme: 'default',
          animationsEnabled: true,
          animationSpeed: 'normal',
          iconsEnabled: true,
          showDescriptions: true,
          showPreviews: true,
          historySize: 1001  // Muito grande
        }
      };

      expect(() => configManager.validateConfig(invalidConfig)).toThrow('historySize must be a number between 1 and 1000');
    });

    it('should reject non-object config', () => {
      expect(() => configManager.validateConfig(null)).toThrow('Config must be an object');
      expect(() => configManager.validateConfig('string')).toThrow('Config must be an object');
      expect(() => configManager.validateConfig(123)).toThrow('Config must be an object');
    });
  });

  describe('validateAndMigrate()', () => {
    it('should migrate config with missing fields to include defaults', () => {
      const oldConfig = {
        version: '1.0',
        preferences: {
          theme: 'dark'
          // Faltam outros campos
        }
      };

      const migrated = configManager.validateAndMigrate(oldConfig);

      expect(migrated.preferences.theme).toBe('dark');  // Preservado
      expect(migrated.preferences.animationsEnabled).toBe(true);  // Default
      expect(migrated.preferences.animationSpeed).toBe('normal');  // Default
      expect(migrated.preferences.historySize).toBe(50);  // Default
    });

    it('should preserve all valid user preferences', () => {
      const userConfig = {
        version: '1.0',
        preferences: {
          theme: 'light',
          animationsEnabled: false,
          animationSpeed: 'slow',
          iconsEnabled: false,
          showDescriptions: false,
          showPreviews: false,
          historySize: 25
        }
      };

      const migrated = configManager.validateAndMigrate(userConfig);

      expect(migrated.preferences.theme).toBe('light');
      expect(migrated.preferences.animationsEnabled).toBe(false);
      expect(migrated.preferences.animationSpeed).toBe('slow');
      expect(migrated.preferences.iconsEnabled).toBe(false);
      expect(migrated.preferences.showDescriptions).toBe(false);
      expect(migrated.preferences.showPreviews).toBe(false);
      expect(migrated.preferences.historySize).toBe(25);
    });

    it('should migrate keyboard shortcuts if present', () => {
      const configWithShortcuts = {
        version: '1.0',
        preferences: {
          theme: 'default',
          animationsEnabled: true,
          animationSpeed: 'normal',
          iconsEnabled: true,
          showDescriptions: true,
          showPreviews: true,
          historySize: 50,
          keyboardShortcuts: {
            help: ['h'],
            exit: ['q'],
            custom: ['c']
          }
        }
      };

      const migrated = configManager.validateAndMigrate(configWithShortcuts);

      expect(migrated.preferences.keyboardShortcuts.help).toEqual(['h']);
      expect(migrated.preferences.keyboardShortcuts.exit).toEqual(['q']);
      expect(migrated.preferences.keyboardShortcuts.custom).toEqual(['c']);
    });

    it('should return defaults if migration validation fails', () => {
      const invalidConfig = {
        version: '1.0',
        preferences: {
          theme: 'super-invalid-theme',
          animationsEnabled: true,
          animationSpeed: 'normal',
          iconsEnabled: true,
          showDescriptions: true,
          showPreviews: true,
          historySize: 50
        }
      };

      // Spy no console.warn para verificar que aviso foi emitido
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const migrated = configManager.validateAndMigrate(invalidConfig);

      expect(migrated.preferences.theme).toBe('default');  // Voltou ao default
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Config validation failed'));

      warnSpy.mockRestore();
    });

    it('should handle config without preferences object', () => {
      const configWithoutPrefs = {
        version: '1.0'
      };

      const migrated = configManager.validateAndMigrate(configWithoutPrefs);

      expect(migrated.preferences).toBeDefined();
      expect(migrated.preferences.theme).toBe('default');
    });
  });

  describe('getDefaultConfig()', () => {
    it('should return default config object', () => {
      const defaultConfig = ConfigManager.getDefaultConfig();

      expect(defaultConfig).toHaveProperty('version', '1.0');
      expect(defaultConfig).toHaveProperty('preferences');
      expect(defaultConfig.preferences).toHaveProperty('theme', 'default');
      expect(defaultConfig.preferences).toHaveProperty('historySize', 50);
    });

    it('should return a new copy each time (not reference)', () => {
      const config1 = ConfigManager.getDefaultConfig();
      const config2 = ConfigManager.getDefaultConfig();

      config1.preferences.theme = 'dark';

      expect(config2.preferences.theme).toBe('default');  // Não foi afetado
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty config file', async () => {
      fs.access.mockResolvedValue();
      fs.readFile.mockResolvedValue('');
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();

      const config = await configManager.load();

      // Deve retornar defaults
      expect(config.preferences.theme).toBe('default');
    });

    it('should handle config with extra unknown fields', async () => {
      const configWithExtra = {
        version: '1.0',
        unknownField: 'something',
        preferences: {
          theme: 'dark',
          animationsEnabled: true,
          animationSpeed: 'normal',
          iconsEnabled: true,
          showDescriptions: true,
          showPreviews: true,
          historySize: 50,
          unknownPref: 'value'
        }
      };

      fs.access.mockResolvedValue();
      fs.readFile.mockResolvedValue(JSON.stringify(configWithExtra));

      const config = await configManager.load();

      // Campos conhecidos devem ser preservados
      expect(config.preferences.theme).toBe('dark');

      // Campo desconhecido no root não causa erro (mas não é preservado na estrutura validada)
      expect(() => configManager.validateConfig(config)).not.toThrow();
    });

    it('should handle deeply nested get() calls', () => {
      configManager.config = {
        version: '1.0',
        preferences: {
          keyboardShortcuts: {
            help: ['h', '?']
          }
        }
      };

      const helpShortcuts = configManager.get('preferences.keyboardShortcuts.help');
      expect(helpShortcuts).toEqual(['h', '?']);
    });

    it('should handle set() creating deep nested paths', () => {
      configManager.config = ConfigManager.getDefaultConfig();

      configManager.set('preferences.advanced.experimental.feature', true);

      expect(configManager.config.preferences.advanced.experimental.feature).toBe(true);
    });

    it('should preserve file formatting with proper indentation', async () => {
      configManager.config = ConfigManager.getDefaultConfig();
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();

      await configManager.save();

      const savedContent = fs.writeFile.mock.calls[0][1];

      // Verifica que JSON está formatado (com indentação de 2 espaços)
      expect(savedContent).toContain('\n');
      expect(savedContent).toContain('  ');  // Indentação
      expect(savedContent).toMatch(/"version": "1\.0"/);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle full load -> modify -> save cycle', async () => {
      // Load
      fs.access.mockRejectedValue({ code: 'ENOENT' });
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();

      await configManager.load();

      // Modify
      configManager.set('preferences.theme', 'dark');
      configManager.set('preferences.animationsEnabled', false);

      // Save
      await configManager.save();

      const savedContent = fs.writeFile.mock.calls[1][1];  // Segunda chamada (primeira foi no load)
      const savedConfig = JSON.parse(savedContent);

      expect(savedConfig.preferences.theme).toBe('dark');
      expect(savedConfig.preferences.animationsEnabled).toBe(false);
    });

    it('should handle multiple load calls with different file states', async () => {
      // Primeira carga - arquivo não existe
      fs.access.mockRejectedValueOnce({ code: 'ENOENT' });
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();

      const config1 = await configManager.load();
      expect(config1.preferences.theme).toBe('default');

      // Segunda carga - arquivo existe com dados do usuário
      const userConfig = {
        version: '1.0',
        preferences: {
          theme: 'dark',
          animationsEnabled: true,
          animationSpeed: 'normal',
          iconsEnabled: true,
          showDescriptions: true,
          showPreviews: true,
          historySize: 50
        }
      };

      fs.access.mockResolvedValueOnce();
      fs.readFile.mockResolvedValueOnce(JSON.stringify(userConfig));

      const config2 = await configManager.load();
      expect(config2.preferences.theme).toBe('dark');
    });
  });

  describe('Error Handling', () => {
    it('should provide helpful error message for validation failures', () => {
      const invalidConfig = {
        version: '1.0',
        preferences: {
          theme: 'default',
          animationsEnabled: 'not-a-boolean',  // Erro
          animationSpeed: 'normal',
          iconsEnabled: true,
          showDescriptions: true,
          showPreviews: true,
          historySize: 50
        }
      };

      expect(() => configManager.validateConfig(invalidConfig))
        .toThrow('animationsEnabled must be a boolean');
    });

    it('should handle file system errors gracefully', async () => {
      const permissionError = new Error('Permission denied');
      permissionError.code = 'EACCES';

      fs.access.mockResolvedValue();  // Arquivo existe
      fs.readFile.mockRejectedValue(permissionError);  // Mas não pode ler

      await expect(configManager.load()).rejects.toThrow('Permission denied');
    });
  });
});
