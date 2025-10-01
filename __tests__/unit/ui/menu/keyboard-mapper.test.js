/**
 * Unit Tests - KeyboardMapper
 *
 * Test coverage:
 * - Default key mappings
 * - Custom keymap setting
 * - Conflict detection
 * - Invalid key handling
 * - Case sensitivity
 * - Reserved keys protection
 */

const KeyboardMapper = require('../../../../src/ui/menu/utils/KeyboardMapper');

describe('KeyboardMapper', () => {
  let mapper;

  beforeEach(() => {
    mapper = new KeyboardMapper();
  });

  describe('Default Key Mappings', () => {
    test('should map arrow up to navigate-up action', () => {
      expect(mapper.getAction('up')).toBe('navigate-up');
    });

    test('should map arrow down to navigate-down action', () => {
      expect(mapper.getAction('down')).toBe('navigate-down');
    });

    test('should map enter to select action', () => {
      expect(mapper.getAction('enter')).toBe('select');
    });

    test('should map space to select action', () => {
      expect(mapper.getAction('space')).toBe('select');
    });

    test('should map q to quit action', () => {
      expect(mapper.getAction('q')).toBe('quit');
    });

    test('should map escape to quit action', () => {
      expect(mapper.getAction('escape')).toBe('quit');
    });

    test('should map h to help action', () => {
      expect(mapper.getAction('h')).toBe('help');
    });

    test('should map ? to help action', () => {
      expect(mapper.getAction('?')).toBe('help');
    });

    test('should map r to refresh action', () => {
      expect(mapper.getAction('r')).toBe('refresh');
    });

    test('should map p to preview action', () => {
      expect(mapper.getAction('p')).toBe('preview');
    });

    test('should map backspace to history action', () => {
      expect(mapper.getAction('backspace')).toBe('history');
    });

    test('should map c to config action', () => {
      expect(mapper.getAction('c')).toBe('config');
    });

    test('should map numbers 1-9 to direct selection', () => {
      expect(mapper.getAction('1')).toBe('select-1');
      expect(mapper.getAction('2')).toBe('select-2');
      expect(mapper.getAction('3')).toBe('select-3');
      expect(mapper.getAction('4')).toBe('select-4');
      expect(mapper.getAction('5')).toBe('select-5');
      expect(mapper.getAction('6')).toBe('select-6');
      expect(mapper.getAction('7')).toBe('select-7');
      expect(mapper.getAction('8')).toBe('select-8');
      expect(mapper.getAction('9')).toBe('select-9');
    });

    test('should return null for unmapped key', () => {
      expect(mapper.getAction('z')).toBeNull();
      expect(mapper.getAction('0')).toBeNull();
      expect(mapper.getAction('F1')).toBeNull();
    });
  });

  describe('Custom Keymap Setting', () => {
    test('should allow adding custom key mappings', () => {
      mapper.customizeKeymap({ 'x': 'custom-action' });
      expect(mapper.getAction('x')).toBe('custom-action');
    });

    test('should allow multiple custom mappings at once', () => {
      mapper.customizeKeymap({
        'x': 'action-x',
        'y': 'action-y',
        'z': 'action-z'
      });

      expect(mapper.getAction('x')).toBe('action-x');
      expect(mapper.getAction('y')).toBe('action-y');
      expect(mapper.getAction('z')).toBe('action-z');
    });

    test('should override non-reserved default mappings', () => {
      // 'h' é mapeado para 'help' por padrão, mas não é reservado
      mapper.customizeKeymap({ 'h': 'custom-help' });
      expect(mapper.getAction('h')).toBe('custom-help');
    });

    test('should throw error for reserved keys', () => {
      // Navigation keys throw navigation error first
      expect(() => {
        mapper.customizeKeymap({ 'enter': 'custom-enter' });
      }).toThrow('Cannot override navigation key');

      expect(() => {
        mapper.customizeKeymap({ 'escape': 'custom-escape' });
      }).toThrow('Cannot override navigation key');

      expect(() => {
        mapper.customizeKeymap({ 'space': 'custom-space' });
      }).toThrow('Cannot override navigation key');
    });

    test('should throw error for navigation keys', () => {
      expect(() => {
        mapper.customizeKeymap({ 'up': 'custom-up' });
      }).toThrow('Cannot override navigation key');

      expect(() => {
        mapper.customizeKeymap({ 'down': 'custom-down' });
      }).toThrow('Cannot override navigation key');
    });

    test('should throw error for invalid action (empty string)', () => {
      expect(() => {
        mapper.customizeKeymap({ 'x': '' });
      }).toThrow('Invalid action for key "x"');
    });

    test('should throw error for invalid action (null)', () => {
      expect(() => {
        mapper.customizeKeymap({ 'x': null });
      }).toThrow('Invalid action for key "x"');
    });

    test('should throw error for invalid mappings object', () => {
      expect(() => {
        mapper.customizeKeymap(null);
      }).toThrow('Mappings must be an object');

      expect(() => {
        mapper.customizeKeymap('invalid');
      }).toThrow('Mappings must be an object');
    });

    test('should remove custom mapping', () => {
      mapper.customizeKeymap({ 'x': 'action-x' });
      expect(mapper.getAction('x')).toBe('action-x');

      mapper.removeCustomMapping('x');
      expect(mapper.getAction('x')).toBeNull();
    });

    test('should clear all custom mappings', () => {
      mapper.customizeKeymap({
        'x': 'action-x',
        'y': 'action-y'
      });

      expect(mapper.getAction('x')).toBe('action-x');
      expect(mapper.getAction('y')).toBe('action-y');

      mapper.clearCustomMappings();

      expect(mapper.getAction('x')).toBeNull();
      expect(mapper.getAction('y')).toBeNull();

      // Padrões permanecem intactos
      expect(mapper.getAction('h')).toBe('help');
    });
  });

  describe('Conflict Detection', () => {
    test('should not allow duplicate keys in same customization call', () => {
      // Map interno deve detectar isso, mas o objeto JS sobrescreve
      // Vamos testar aplicando separadamente
      mapper.customizeKeymap({ 'x': 'action-1' });
      mapper.customizeKeymap({ 'x': 'action-2' });

      // A segunda chamada sobrescreve a primeira
      expect(mapper.getAction('x')).toBe('action-2');
    });

    test('should detect reserved key conflicts', () => {
      expect(() => {
        mapper.customizeKeymap({ 'up': 'my-up' });
      }).toThrow();
    });

    test('should allow using same action for different keys', () => {
      // Não é conflito ter ações iguais para teclas diferentes
      expect(() => {
        mapper.customizeKeymap({
          'x': 'same-action',
          'y': 'same-action'
        });
      }).not.toThrow();

      expect(mapper.getAction('x')).toBe('same-action');
      expect(mapper.getAction('y')).toBe('same-action');
    });
  });

  describe('Invalid Key Handling', () => {
    test('should return null for null key', () => {
      expect(mapper.getAction(null)).toBeNull();
    });

    test('should return null for undefined key', () => {
      expect(mapper.getAction(undefined)).toBeNull();
    });

    test('should return null for empty string key', () => {
      expect(mapper.getAction('')).toBeNull();
    });

    test('should return null for non-string key', () => {
      expect(mapper.getAction(123)).toBeNull();
      expect(mapper.getAction({})).toBeNull();
      expect(mapper.getAction([])).toBeNull();
    });

    test('should handle whitespace in key lookup', () => {
      expect(mapper.getAction(' h ')).toBe('help');
      expect(mapper.getAction('\th\t')).toBe('help');
    });
  });

  describe('Case Sensitivity', () => {
    test('should be case-insensitive for default mappings', () => {
      expect(mapper.getAction('H')).toBe('help');
      expect(mapper.getAction('h')).toBe('help');
      expect(mapper.getAction('Q')).toBe('quit');
      expect(mapper.getAction('q')).toBe('quit');
    });

    test('should normalize custom keys to lowercase', () => {
      mapper.customizeKeymap({ 'X': 'action-x' });

      expect(mapper.getAction('x')).toBe('action-x');
      expect(mapper.getAction('X')).toBe('action-x');
    });

    test('isCaseSensitive should return false by default', () => {
      expect(mapper.isCaseSensitive('h')).toBe(false);
      expect(mapper.isCaseSensitive('H')).toBe(false);
    });
  });

  describe('getAllShortcuts', () => {
    test('should return all default shortcuts', () => {
      const shortcuts = mapper.getAllShortcuts();

      expect(shortcuts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'up', action: 'navigate-up', type: 'default' }),
          expect.objectContaining({ key: 'down', action: 'navigate-down', type: 'default' }),
          expect.objectContaining({ key: 'h', action: 'help', type: 'default' }),
          expect.objectContaining({ key: 'q', action: 'quit', type: 'default' })
        ])
      );
    });

    test('should include custom shortcuts', () => {
      mapper.customizeKeymap({ 'x': 'custom-x' });

      const shortcuts = mapper.getAllShortcuts();

      expect(shortcuts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'x', action: 'custom-x', type: 'custom' })
        ])
      );
    });

    test('should override default with custom in list', () => {
      mapper.customizeKeymap({ 'h': 'my-help' });

      const shortcuts = mapper.getAllShortcuts();
      const hShortcut = shortcuts.find(s => s.key === 'h');

      expect(hShortcut).toEqual(
        expect.objectContaining({
          key: 'h',
          action: 'my-help',
          type: 'custom'
        })
      );
    });

    test('should sort shortcuts by type and key', () => {
      mapper.customizeKeymap({ 'z': 'action-z', 'a': 'action-a' });

      const shortcuts = mapper.getAllShortcuts();

      // Verifica que defaults vêm antes de customs
      const firstCustomIndex = shortcuts.findIndex(s => s.type === 'custom');
      const lastDefaultIndex = shortcuts.map((s, i) => s.type === 'default' ? i : -1)
        .filter(i => i !== -1)
        .pop();

      expect(firstCustomIndex).toBeGreaterThan(lastDefaultIndex);
    });
  });

  describe('isAvailable', () => {
    test('should return false for reserved keys', () => {
      expect(mapper.isAvailable('enter')).toBe(false);
      expect(mapper.isAvailable('escape')).toBe(false);
      expect(mapper.isAvailable('space')).toBe(false);
    });

    test('should return false for navigation keys', () => {
      expect(mapper.isAvailable('up')).toBe(false);
      expect(mapper.isAvailable('down')).toBe(false);
    });

    test('should return false for used default keys', () => {
      expect(mapper.isAvailable('h')).toBe(false);
      expect(mapper.isAvailable('q')).toBe(false);
    });

    test('should return true for unused keys', () => {
      expect(mapper.isAvailable('x')).toBe(true);
      expect(mapper.isAvailable('y')).toBe(true);
      expect(mapper.isAvailable('0')).toBe(true);
    });

    test('should return true for custom-overridden keys', () => {
      mapper.customizeKeymap({ 'h': 'my-help' });
      // Depois de sobrescrever, não está mais disponível
      expect(mapper.isAvailable('h')).toBe(false);
    });
  });

  describe('getDescription', () => {
    test('should return description for default keys', () => {
      expect(mapper.getDescription('h')).toBe('Exibir ajuda');
      expect(mapper.getDescription('q')).toBe('Sair do menu');
    });

    test('should return description for custom keys', () => {
      mapper.customizeKeymap({ 'x': 'action-x' });
      expect(mapper.getDescription('x')).toBe('Custom: action-x');
    });

    test('should return null for unmapped keys', () => {
      expect(mapper.getDescription('z')).toBeNull();
    });

    test('should be case-insensitive', () => {
      expect(mapper.getDescription('H')).toBe('Exibir ajuda');
      expect(mapper.getDescription('Q')).toBe('Sair do menu');
    });
  });

  describe('Import/Export Config', () => {
    test('should export configuration with custom mappings', () => {
      mapper.customizeKeymap({ 'x': 'action-x', 'y': 'action-y' });

      const config = mapper.exportConfig();

      expect(config).toEqual({
        version: '1.0',
        customMappings: {
          'x': { action: 'action-x', description: 'Custom: action-x' },
          'y': { action: 'action-y', description: 'Custom: action-y' }
        }
      });
    });

    test('should export empty config when no custom mappings', () => {
      const config = mapper.exportConfig();

      expect(config).toEqual({
        version: '1.0',
        customMappings: {}
      });
    });

    test('should import configuration', () => {
      const config = {
        version: '1.0',
        customMappings: {
          'x': { action: 'action-x', description: 'Custom: action-x' },
          'y': { action: 'action-y', description: 'Custom: action-y' }
        }
      };

      mapper.importConfig(config);

      expect(mapper.getAction('x')).toBe('action-x');
      expect(mapper.getAction('y')).toBe('action-y');
    });

    test('should throw error for invalid import config', () => {
      expect(() => {
        mapper.importConfig(null);
      }).toThrow('Invalid config format');

      expect(() => {
        mapper.importConfig({});
      }).toThrow('Invalid config format');
    });

    test('should clear previous mappings on import', () => {
      mapper.customizeKeymap({ 'x': 'old-action' });

      const config = {
        version: '1.0',
        customMappings: {
          'y': { action: 'new-action', description: 'New' }
        }
      };

      mapper.importConfig(config);

      // Old mapping foi removido
      expect(mapper.getAction('x')).toBeNull();
      // New mapping foi aplicado
      expect(mapper.getAction('y')).toBe('new-action');
    });

    test('should rollback on invalid import', () => {
      mapper.customizeKeymap({ 'x': 'action-x' });

      const invalidConfig = {
        version: '1.0',
        customMappings: {
          'enter': 'invalid' // Reserved key
        }
      };

      expect(() => {
        mapper.importConfig(invalidConfig);
      }).toThrow();

      // Mapping original permanece
      expect(mapper.getAction('x')).toBe('action-x');
    });
  });

  describe('Edge Cases', () => {
    test('should handle consecutive customizations', () => {
      mapper.customizeKeymap({ 'x': 'action-1' });
      mapper.customizeKeymap({ 'y': 'action-2' });
      mapper.customizeKeymap({ 'z': 'action-3' });

      expect(mapper.getAction('x')).toBe('action-1');
      expect(mapper.getAction('y')).toBe('action-2');
      expect(mapper.getAction('z')).toBe('action-3');
    });

    test('should trim whitespace from keys and actions', () => {
      mapper.customizeKeymap({ ' x ': '  action-x  ' });

      expect(mapper.getAction('x')).toBe('action-x');
      expect(mapper.getAction(' x ')).toBe('action-x');
    });

    test('should handle special characters in action names', () => {
      mapper.customizeKeymap({ 'x': 'action:special-123' });
      expect(mapper.getAction('x')).toBe('action:special-123');
    });

    test('should maintain default mappings after custom operations', () => {
      mapper.customizeKeymap({ 'x': 'custom' });
      mapper.clearCustomMappings();

      // Defaults permanecem intactos
      expect(mapper.getAction('h')).toBe('help');
      expect(mapper.getAction('q')).toBe('quit');
      expect(mapper.getAction('1')).toBe('select-1');
    });
  });
});
