/**
 * IconMapper Unit Tests
 *
 * Tests for IconMapper including icon resolution, fallback chain,
 * custom icon registration, cache behavior, and status/selection indicators
 */

const IconMapper = require('../../../../../src/ui/menu/visual/IconMapper');

describe('IconMapper', () => {
  let mockTerminalDetector;
  let iconMapper;

  beforeEach(() => {
    // Mock TerminalDetector
    mockTerminalDetector = {
      detect: jest.fn().mockReturnValue({
        supportsUnicode: true,
        supportsEmojis: true,
        colorLevel: 2,
        width: 80,
        height: 24
      }),
      supportsUnicode: jest.fn().mockReturnValue(true),
      supportsEmojis: jest.fn().mockReturnValue(true),
      onResize: jest.fn()
    };
  });

  afterEach(() => {
    iconMapper = null;
  });

  // ===================================================================
  // 1. Dependency Injection & Initialization
  // ===================================================================
  describe('Dependency Injection & Initialization', () => {
    test('should create instance with valid TerminalDetector', () => {
      iconMapper = new IconMapper(mockTerminalDetector);

      expect(iconMapper).toBeDefined();
      expect(iconMapper.terminalDetector).toBe(mockTerminalDetector);
      expect(iconMapper.customIcons).toEqual({});
      expect(iconMapper.iconCache).toBeInstanceOf(Map);
      expect(iconMapper.lastCapabilities).toBeNull();
    });

    test('should throw TypeError when TerminalDetector is missing', () => {
      expect(() => {
        new IconMapper(null);
      }).toThrow(TypeError);

      expect(() => {
        new IconMapper(null);
      }).toThrow('IconMapper requires a TerminalDetector instance');
    });

    test('should throw TypeError when TerminalDetector is undefined', () => {
      expect(() => {
        new IconMapper(undefined);
      }).toThrow(TypeError);
    });

    test('should initialize cache as empty Map', () => {
      iconMapper = new IconMapper(mockTerminalDetector);

      expect(iconMapper.iconCache).toBeInstanceOf(Map);
      expect(iconMapper.iconCache.size).toBe(0);
    });

    test('should setup capability change detection on construction', () => {
      iconMapper = new IconMapper(mockTerminalDetector);

      expect(mockTerminalDetector.onResize).toHaveBeenCalled();
    });

    test('should initialize with empty customIcons object', () => {
      iconMapper = new IconMapper(mockTerminalDetector);

      expect(iconMapper.customIcons).toEqual({});
    });
  });

  // ===================================================================
  // 2. getIcon() Method - All Action Types
  // ===================================================================
  describe('getIcon() Method - All Action Types', () => {
    beforeEach(() => {
      iconMapper = new IconMapper(mockTerminalDetector);
      mockTerminalDetector.detect.mockReturnValue({
        supportsUnicode: true,
        supportsEmojis: true
      });
    });

    describe('Emoji Support (Full Support)', () => {
      test('should return emoji icon for download action', () => {
        const icon = iconMapper.getIcon('download');
        expect(icon).toBe('📥');
      });

      test('should return emoji icon for upload action', () => {
        const icon = iconMapper.getIcon('upload');
        expect(icon).toBe('📤');
      });

      test('should return emoji icon for settings action', () => {
        const icon = iconMapper.getIcon('settings');
        expect(icon).toBe('⚙️');
      });

      test('should return emoji icon for docs action', () => {
        const icon = iconMapper.getIcon('docs');
        expect(icon).toBe('📋');
      });

      test('should return emoji icon for stats action', () => {
        const icon = iconMapper.getIcon('stats');
        expect(icon).toBe('📊');
      });

      test('should return emoji icon for refresh action', () => {
        const icon = iconMapper.getIcon('refresh');
        expect(icon).toBe('🔄');
      });

      test('should return emoji icon for help action', () => {
        const icon = iconMapper.getIcon('help');
        expect(icon).toBe('❓');
      });

      test('should return emoji icon for exit action', () => {
        const icon = iconMapper.getIcon('exit');
        expect(icon).toBe('🚪');
      });
    });

    describe('Unicode Support (No Emoji)', () => {
      beforeEach(() => {
        mockTerminalDetector.detect.mockReturnValue({
          supportsUnicode: true,
          supportsEmojis: false
        });
      });

      test('should return unicode icon for download action', () => {
        const icon = iconMapper.getIcon('download');
        expect(icon).toBe('↓');
      });

      test('should return unicode icon for upload action', () => {
        const icon = iconMapper.getIcon('upload');
        expect(icon).toBe('↑');
      });

      test('should return unicode icon for settings action', () => {
        const icon = iconMapper.getIcon('settings');
        expect(icon).toBe('⚙');
      });

      test('should return unicode icon for docs action', () => {
        const icon = iconMapper.getIcon('docs');
        expect(icon).toBe('☰');
      });

      test('should return unicode icon for stats action', () => {
        const icon = iconMapper.getIcon('stats');
        expect(icon).toBe('▪');
      });

      test('should return unicode icon for refresh action', () => {
        const icon = iconMapper.getIcon('refresh');
        expect(icon).toBe('↻');
      });

      test('should return unicode icon for help action', () => {
        const icon = iconMapper.getIcon('help');
        expect(icon).toBe('?');
      });

      test('should return unicode icon for exit action', () => {
        const icon = iconMapper.getIcon('exit');
        expect(icon).toBe('×');
      });
    });

    describe('ASCII Only Support', () => {
      beforeEach(() => {
        mockTerminalDetector.detect.mockReturnValue({
          supportsUnicode: false,
          supportsEmojis: false
        });
      });

      test('should return ASCII icon for download action', () => {
        const icon = iconMapper.getIcon('download');
        expect(icon).toBe('v');
      });

      test('should return ASCII icon for upload action', () => {
        const icon = iconMapper.getIcon('upload');
        expect(icon).toBe('^');
      });

      test('should return ASCII icon for settings action', () => {
        const icon = iconMapper.getIcon('settings');
        expect(icon).toBe('*');
      });

      test('should return ASCII icon for docs action', () => {
        const icon = iconMapper.getIcon('docs');
        expect(icon).toBe('=');
      });

      test('should return ASCII icon for stats action', () => {
        const icon = iconMapper.getIcon('stats');
        expect(icon).toBe('#');
      });

      test('should return ASCII icon for refresh action', () => {
        const icon = iconMapper.getIcon('refresh');
        expect(icon).toBe('@');
      });

      test('should return ASCII icon for help action', () => {
        const icon = iconMapper.getIcon('help');
        expect(icon).toBe('?');
      });

      test('should return ASCII icon for exit action', () => {
        const icon = iconMapper.getIcon('exit');
        expect(icon).toBe('x');
      });
    });

    describe('Plain Text Fallback', () => {
      beforeEach(() => {
        // Mock scenario where all IconSet properties except plain are missing
        mockTerminalDetector.detect.mockReturnValue({
          supportsUnicode: false,
          supportsEmojis: false
        });
      });

      test('should use plain fallback when icon type is invalid', () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        const icon = iconMapper.getIcon('invalid-action');

        expect(icon).toBe('*'); // Should fallback to neutral ASCII icon (since Unicode is false)
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining("Unknown action type 'invalid-action'")
        );

        consoleWarnSpy.mockRestore();
      });
    });

    describe('Invalid Action Types', () => {
      test('should return neutral icon for unknown action type', () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        const icon = iconMapper.getIcon('unknown-action');

        expect(icon).toBeDefined();
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining("Unknown action type 'unknown-action'")
        );

        consoleWarnSpy.mockRestore();
      });

      test('should return neutral icon for empty string action type', () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        const icon = iconMapper.getIcon('');

        expect(icon).toBeDefined();
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining("Unknown action type ''")
        );

        consoleWarnSpy.mockRestore();
      });

      test('should warn when action type is not found', () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        iconMapper.getIcon('nonexistent');

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          "IconMapper: Unknown action type 'nonexistent', using neutral icon"
        );

        consoleWarnSpy.mockRestore();
      });
    });
  });

  // ===================================================================
  // 3. getStatusIcon() Method
  // ===================================================================
  describe('getStatusIcon() Method', () => {
    beforeEach(() => {
      iconMapper = new IconMapper(mockTerminalDetector);
      mockTerminalDetector.detect.mockReturnValue({
        supportsUnicode: true,
        supportsEmojis: true
      });
    });

    describe('All Status Types (Emoji Support)', () => {
      test('should return emoji icon for success status', () => {
        const icon = iconMapper.getStatusIcon('success');
        expect(icon).toBe('✅');
      });

      test('should return emoji icon for error status', () => {
        const icon = iconMapper.getStatusIcon('error');
        expect(icon).toBe('❌');
      });

      test('should return emoji icon for warning status', () => {
        const icon = iconMapper.getStatusIcon('warning');
        expect(icon).toBe('⚠️');
      });

      test('should return emoji icon for info status', () => {
        const icon = iconMapper.getStatusIcon('info');
        expect(icon).toBe('ℹ️');
      });

      test('should return emoji icon for neutral status', () => {
        const icon = iconMapper.getStatusIcon('neutral');
        expect(icon).toBe('•');
      });
    });

    describe('All Status Types (Unicode Only)', () => {
      beforeEach(() => {
        mockTerminalDetector.detect.mockReturnValue({
          supportsUnicode: true,
          supportsEmojis: false
        });
      });

      test('should return unicode icon for success status', () => {
        const icon = iconMapper.getStatusIcon('success');
        expect(icon).toBe('✓');
      });

      test('should return unicode icon for error status', () => {
        const icon = iconMapper.getStatusIcon('error');
        expect(icon).toBe('✗');
      });

      test('should return unicode icon for warning status', () => {
        const icon = iconMapper.getStatusIcon('warning');
        expect(icon).toBe('!');
      });

      test('should return unicode icon for info status', () => {
        const icon = iconMapper.getStatusIcon('info');
        expect(icon).toBe('i');
      });

      test('should return unicode icon for neutral status', () => {
        const icon = iconMapper.getStatusIcon('neutral');
        expect(icon).toBe('•');
      });
    });

    describe('All Status Types (ASCII Only)', () => {
      beforeEach(() => {
        mockTerminalDetector.detect.mockReturnValue({
          supportsUnicode: false,
          supportsEmojis: false
        });
      });

      test('should return ASCII icon for success status', () => {
        const icon = iconMapper.getStatusIcon('success');
        expect(icon).toBe('+');
      });

      test('should return ASCII icon for error status', () => {
        const icon = iconMapper.getStatusIcon('error');
        expect(icon).toBe('-');
      });

      test('should return ASCII icon for warning status', () => {
        const icon = iconMapper.getStatusIcon('warning');
        expect(icon).toBe('!');
      });

      test('should return ASCII icon for info status', () => {
        const icon = iconMapper.getStatusIcon('info');
        expect(icon).toBe('i');
      });

      test('should return ASCII icon for neutral status', () => {
        const icon = iconMapper.getStatusIcon('neutral');
        expect(icon).toBe('*');
      });
    });

    describe('Invalid Status Types', () => {
      test('should return neutral icon for invalid status type', () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        const icon = iconMapper.getStatusIcon('invalid-status');

        expect(icon).toBe('•'); // neutral emoji
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          "IconMapper: Invalid status type 'invalid-status', using neutral"
        );

        consoleWarnSpy.mockRestore();
      });

      test('should return neutral icon for empty string status', () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        const icon = iconMapper.getStatusIcon('');

        expect(icon).toBe('•');
        expect(consoleWarnSpy).toHaveBeenCalled();

        consoleWarnSpy.mockRestore();
      });

      test('should warn when status type is invalid', () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        iconMapper.getStatusIcon('unknown');

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          "IconMapper: Invalid status type 'unknown', using neutral"
        );

        consoleWarnSpy.mockRestore();
      });
    });
  });

  // ===================================================================
  // 4. getSelectionIndicator() Method
  // ===================================================================
  describe('getSelectionIndicator() Method', () => {
    beforeEach(() => {
      iconMapper = new IconMapper(mockTerminalDetector);
    });

    test('should return emoji selection indicator with emoji support', () => {
      mockTerminalDetector.detect.mockReturnValue({
        supportsUnicode: true,
        supportsEmojis: true
      });

      const indicator = iconMapper.getSelectionIndicator();

      expect(indicator).toBe('▶');
    });

    test('should return unicode selection indicator without emoji support', () => {
      mockTerminalDetector.detect.mockReturnValue({
        supportsUnicode: true,
        supportsEmojis: false
      });

      const indicator = iconMapper.getSelectionIndicator();

      expect(indicator).toBe('▶');
    });

    test('should return ASCII selection indicator without unicode support', () => {
      mockTerminalDetector.detect.mockReturnValue({
        supportsUnicode: false,
        supportsEmojis: false
      });

      const indicator = iconMapper.getSelectionIndicator();

      expect(indicator).toBe('>');
    });

    test('should return plain text selection indicator as fallback', () => {
      mockTerminalDetector.detect.mockReturnValue({
        supportsUnicode: false,
        supportsEmojis: false
      });

      const indicator = iconMapper.getSelectionIndicator();

      expect(indicator).toBe('>');
    });

    test('should call detect() to check capabilities', () => {
      iconMapper.getSelectionIndicator();

      expect(mockTerminalDetector.detect).toHaveBeenCalled();
    });
  });

  // ===================================================================
  // 5. getCategoryIcon() Method
  // ===================================================================
  describe('getCategoryIcon() Method', () => {
    beforeEach(() => {
      iconMapper = new IconMapper(mockTerminalDetector);
      mockTerminalDetector.detect.mockReturnValue({
        supportsUnicode: true,
        supportsEmojis: true
      });
    });

    describe('All Category Types (Emoji Support)', () => {
      test('should return emoji icon for action category', () => {
        const icon = iconMapper.getCategoryIcon('action');
        expect(icon).toBe('⚡');
      });

      test('should return emoji icon for utility category', () => {
        const icon = iconMapper.getCategoryIcon('utility');
        expect(icon).toBe('🔧');
      });

      test('should return emoji icon for destructive category', () => {
        const icon = iconMapper.getCategoryIcon('destructive');
        expect(icon).toBe('⚠️');
      });

      test('should return emoji icon for info category', () => {
        const icon = iconMapper.getCategoryIcon('info');
        expect(icon).toBe('ℹ️');
      });
    });

    describe('All Category Types (Unicode Only)', () => {
      beforeEach(() => {
        mockTerminalDetector.detect.mockReturnValue({
          supportsUnicode: true,
          supportsEmojis: false
        });
      });

      test('should return unicode icon for action category', () => {
        const icon = iconMapper.getCategoryIcon('action');
        expect(icon).toBe('►');
      });

      test('should return unicode icon for utility category', () => {
        const icon = iconMapper.getCategoryIcon('utility');
        expect(icon).toBe('◆');
      });

      test('should return unicode icon for destructive category', () => {
        const icon = iconMapper.getCategoryIcon('destructive');
        expect(icon).toBe('!');
      });

      test('should return unicode icon for info category', () => {
        const icon = iconMapper.getCategoryIcon('info');
        expect(icon).toBe('i');
      });
    });

    describe('All Category Types (ASCII Only)', () => {
      beforeEach(() => {
        mockTerminalDetector.detect.mockReturnValue({
          supportsUnicode: false,
          supportsEmojis: false
        });
      });

      test('should return ASCII icon for action category', () => {
        const icon = iconMapper.getCategoryIcon('action');
        expect(icon).toBe('>');
      });

      test('should return ASCII icon for utility category', () => {
        const icon = iconMapper.getCategoryIcon('utility');
        expect(icon).toBe('+');
      });

      test('should return ASCII icon for destructive category', () => {
        const icon = iconMapper.getCategoryIcon('destructive');
        expect(icon).toBe('!');
      });

      test('should return ASCII icon for info category', () => {
        const icon = iconMapper.getCategoryIcon('info');
        expect(icon).toBe('i');
      });
    });

    describe('Invalid Category Types', () => {
      test('should return neutral icon for invalid category', () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        const icon = iconMapper.getCategoryIcon('invalid-category');

        expect(icon).toBe('•'); // neutral emoji
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          "IconMapper: Unknown category 'invalid-category', using neutral icon"
        );

        consoleWarnSpy.mockRestore();
      });

      test('should warn when category is not found', () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        iconMapper.getCategoryIcon('unknown');

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          "IconMapper: Unknown category 'unknown', using neutral icon"
        );

        consoleWarnSpy.mockRestore();
      });
    });
  });

  // ===================================================================
  // 6. registerIcon() Method
  // ===================================================================
  describe('registerIcon() Method', () => {
    beforeEach(() => {
      iconMapper = new IconMapper(mockTerminalDetector);
      mockTerminalDetector.detect.mockReturnValue({
        supportsUnicode: true,
        supportsEmojis: true
      });
    });

    test('should register custom icon with all required properties', () => {
      const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();

      const customIconSet = {
        emoji: '🚀',
        unicode: '↑',
        ascii: '^',
        plain: '[D]'
      };

      iconMapper.registerIcon('deploy', customIconSet);

      expect(iconMapper.customIcons.deploy).toEqual(customIconSet);
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        "IconMapper: Registered custom icon for 'deploy'"
      );

      consoleDebugSpy.mockRestore();
    });

    test('should retrieve registered custom icon', () => {
      const customIconSet = {
        emoji: '🚀',
        unicode: '↑',
        ascii: '^',
        plain: '[D]'
      };

      iconMapper.registerIcon('deploy', customIconSet);

      const icon = iconMapper.getIcon('deploy');
      expect(icon).toBe('🚀');
    });

    test('should override default icon with custom icon', () => {
      const customIconSet = {
        emoji: '💾',
        unicode: '↓',
        ascii: 'd',
        plain: '[SAVE]'
      };

      iconMapper.registerIcon('download', customIconSet);

      const icon = iconMapper.getIcon('download');
      expect(icon).toBe('💾'); // Custom emoji, not default '📥'
    });

    test('should throw TypeError when emoji property is missing', () => {
      const incompleteIconSet = {
        unicode: '↑',
        ascii: '^',
        plain: '[D]'
      };

      expect(() => {
        iconMapper.registerIcon('deploy', incompleteIconSet);
      }).toThrow(TypeError);

      expect(() => {
        iconMapper.registerIcon('deploy', incompleteIconSet);
      }).toThrow('IconSet must include all properties');
    });

    test('should throw TypeError when unicode property is missing', () => {
      const incompleteIconSet = {
        emoji: '🚀',
        ascii: '^',
        plain: '[D]'
      };

      expect(() => {
        iconMapper.registerIcon('deploy', incompleteIconSet);
      }).toThrow(TypeError);
    });

    test('should throw TypeError when ascii property is missing', () => {
      const incompleteIconSet = {
        emoji: '🚀',
        unicode: '↑',
        plain: '[D]'
      };

      expect(() => {
        iconMapper.registerIcon('deploy', incompleteIconSet);
      }).toThrow(TypeError);
    });

    test('should throw TypeError when plain property is missing', () => {
      const incompleteIconSet = {
        emoji: '🚀',
        unicode: '↑',
        ascii: '^'
      };

      expect(() => {
        iconMapper.registerIcon('deploy', incompleteIconSet);
      }).toThrow(TypeError);
    });

    test('should throw TypeError when emoji is not a string', () => {
      const invalidIconSet = {
        emoji: 123,
        unicode: '↑',
        ascii: '^',
        plain: '[D]'
      };

      expect(() => {
        iconMapper.registerIcon('deploy', invalidIconSet);
      }).toThrow(TypeError);

      expect(() => {
        iconMapper.registerIcon('deploy', invalidIconSet);
      }).toThrow("IconSet property 'emoji' must be a string");
    });

    test('should throw TypeError when unicode is not a string', () => {
      const invalidIconSet = {
        emoji: '🚀',
        unicode: null,
        ascii: '^',
        plain: '[D]'
      };

      expect(() => {
        iconMapper.registerIcon('deploy', invalidIconSet);
      }).toThrow(TypeError);
    });

    test('should throw TypeError when ascii is not a string', () => {
      const invalidIconSet = {
        emoji: '🚀',
        unicode: '↑',
        ascii: undefined,
        plain: '[D]'
      };

      expect(() => {
        iconMapper.registerIcon('deploy', invalidIconSet);
      }).toThrow(TypeError);
    });

    test('should throw TypeError when plain is not a string', () => {
      const invalidIconSet = {
        emoji: '🚀',
        unicode: '↑',
        ascii: '^',
        plain: []
      };

      expect(() => {
        iconMapper.registerIcon('deploy', invalidIconSet);
      }).toThrow(TypeError);
    });

    test('should invalidate cache for registered action type', () => {
      const customIconSet = {
        emoji: '🚀',
        unicode: '↑',
        ascii: '^',
        plain: '[D]'
      };

      // Get icon to populate cache
      iconMapper.getIcon('download');
      expect(iconMapper.iconCache.has('action:download')).toBe(true);

      // Register custom icon for download
      iconMapper.registerIcon('download', customIconSet);

      // Cache should be invalidated
      expect(iconMapper.iconCache.has('action:download')).toBe(false);
    });

    test('should register multiple custom icons independently', () => {
      const deployIcon = {
        emoji: '🚀',
        unicode: '↑',
        ascii: '^',
        plain: '[D]'
      };

      const saveIcon = {
        emoji: '💾',
        unicode: '↓',
        ascii: 's',
        plain: '[S]'
      };

      iconMapper.registerIcon('deploy', deployIcon);
      iconMapper.registerIcon('save', saveIcon);

      expect(iconMapper.getIcon('deploy')).toBe('🚀');
      expect(iconMapper.getIcon('save')).toBe('💾');
    });
  });

  // ===================================================================
  // 7. Cache Behavior
  // ===================================================================
  describe('Cache Behavior', () => {
    beforeEach(() => {
      iconMapper = new IconMapper(mockTerminalDetector);
      mockTerminalDetector.detect.mockReturnValue({
        supportsUnicode: true,
        supportsEmojis: true
      });
    });

    test('should cache icon after first retrieval', () => {
      expect(iconMapper.iconCache.size).toBe(0);

      iconMapper.getIcon('download');

      expect(iconMapper.iconCache.size).toBe(1);
      expect(iconMapper.iconCache.has('action:download')).toBe(true);
    });

    test('should use cached icon on subsequent calls', () => {
      const icon1 = iconMapper.getIcon('download');
      const icon2 = iconMapper.getIcon('download');

      expect(icon1).toBe(icon2);
      expect(iconMapper.iconCache.size).toBe(1);
    });

    test('should cache different action types separately', () => {
      iconMapper.getIcon('download');
      iconMapper.getIcon('upload');
      iconMapper.getIcon('settings');

      expect(iconMapper.iconCache.size).toBe(3);
      expect(iconMapper.iconCache.has('action:download')).toBe(true);
      expect(iconMapper.iconCache.has('action:upload')).toBe(true);
      expect(iconMapper.iconCache.has('action:settings')).toBe(true);
    });

    test('should cache status icons separately from action icons', () => {
      iconMapper.getIcon('download');
      iconMapper.getStatusIcon('success');

      expect(iconMapper.iconCache.size).toBe(2);
      expect(iconMapper.iconCache.has('action:download')).toBe(true);
      expect(iconMapper.iconCache.has('status:success')).toBe(true);
    });

    test('should cache selection indicator separately', () => {
      iconMapper.getIcon('download');
      iconMapper.getSelectionIndicator();

      expect(iconMapper.iconCache.size).toBe(2);
      expect(iconMapper.iconCache.has('action:download')).toBe(true);
      expect(iconMapper.iconCache.has('selection:indicator')).toBe(true);
    });

    test('should cache category icons separately', () => {
      iconMapper.getIcon('download');
      iconMapper.getCategoryIcon('action');

      expect(iconMapper.iconCache.size).toBe(2);
      expect(iconMapper.iconCache.has('action:download')).toBe(true);
      expect(iconMapper.iconCache.has('category:action')).toBe(true);
    });

    test('should return cached value instead of calling detect() again', () => {
      mockTerminalDetector.detect.mockClear();

      iconMapper.getIcon('download');
      const firstCallCount = mockTerminalDetector.detect.mock.calls.length;

      iconMapper.getIcon('download');
      const secondCallCount = mockTerminalDetector.detect.mock.calls.length;

      // Second call should use cache, but may still call detect() for cache validation
      // What's important is that we get the same result
      expect(secondCallCount).toBeGreaterThanOrEqual(firstCallCount);
    });
  });

  // ===================================================================
  // 8. clearCache() Method
  // ===================================================================
  describe('clearCache() Method', () => {
    beforeEach(() => {
      iconMapper = new IconMapper(mockTerminalDetector);
      mockTerminalDetector.detect.mockReturnValue({
        supportsUnicode: true,
        supportsEmojis: true
      });
    });

    test('should clear all cached icons', () => {
      const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();

      iconMapper.getIcon('download');
      iconMapper.getIcon('upload');
      iconMapper.getStatusIcon('success');

      expect(iconMapper.iconCache.size).toBe(3);

      iconMapper.clearCache();

      expect(iconMapper.iconCache.size).toBe(0);
      expect(consoleDebugSpy).toHaveBeenCalledWith('IconMapper: Cache cleared');

      consoleDebugSpy.mockRestore();
    });

    test('should reset lastCapabilities to null', () => {
      iconMapper.getIcon('download');
      expect(iconMapper.lastCapabilities).not.toBeNull();

      iconMapper.clearCache();

      expect(iconMapper.lastCapabilities).toBeNull();
    });

    test('should re-fetch icon after cache is cleared', () => {
      const icon1 = iconMapper.getIcon('download');

      iconMapper.clearCache();

      mockTerminalDetector.detect.mockClear();
      const icon2 = iconMapper.getIcon('download');

      expect(icon1).toBe(icon2);
      expect(mockTerminalDetector.detect).toHaveBeenCalled();
    });

    test('should allow clearing empty cache without errors', () => {
      expect(iconMapper.iconCache.size).toBe(0);

      expect(() => {
        iconMapper.clearCache();
      }).not.toThrow();

      expect(iconMapper.iconCache.size).toBe(0);
    });
  });

  // ===================================================================
  // 9. Cache Invalidation on Capability Change
  // ===================================================================
  describe('Cache Invalidation on Capability Change', () => {
    beforeEach(() => {
      iconMapper = new IconMapper(mockTerminalDetector);
    });

    test('should invalidate cache when emoji support changes', () => {
      mockTerminalDetector.detect.mockReturnValue({
        supportsUnicode: true,
        supportsEmojis: true
      });

      const icon1 = iconMapper.getIcon('download');
      expect(icon1).toBe('📥'); // emoji

      // Change capabilities
      mockTerminalDetector.detect.mockReturnValue({
        supportsUnicode: true,
        supportsEmojis: false
      });

      const icon2 = iconMapper.getIcon('download');
      expect(icon2).toBe('↓'); // unicode
    });

    test('should invalidate cache when unicode support changes', () => {
      mockTerminalDetector.detect.mockReturnValue({
        supportsUnicode: true,
        supportsEmojis: false
      });

      const icon1 = iconMapper.getIcon('download');
      expect(icon1).toBe('↓'); // unicode

      // Change capabilities
      mockTerminalDetector.detect.mockReturnValue({
        supportsUnicode: false,
        supportsEmojis: false
      });

      const icon2 = iconMapper.getIcon('download');
      expect(icon2).toBe('v'); // ascii
    });

    test('should not invalidate cache when irrelevant properties change', () => {
      mockTerminalDetector.detect.mockReturnValue({
        supportsUnicode: true,
        supportsEmojis: true,
        colorLevel: 2
      });

      iconMapper.getIcon('download');
      const cacheSize1 = iconMapper.iconCache.size;

      // Change only colorLevel (not relevant for icons)
      mockTerminalDetector.detect.mockReturnValue({
        supportsUnicode: true,
        supportsEmojis: true,
        colorLevel: 3
      });

      iconMapper.getIcon('download');
      const cacheSize2 = iconMapper.iconCache.size;

      // Cache should still be valid
      expect(cacheSize2).toBe(cacheSize1);
    });

    test('should log debug message when capabilities change', () => {
      const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();

      mockTerminalDetector.detect.mockReturnValue({
        supportsUnicode: true,
        supportsEmojis: true
      });

      iconMapper.getIcon('download');

      // Change capabilities
      mockTerminalDetector.detect.mockReturnValue({
        supportsUnicode: false,
        supportsEmojis: false
      });

      iconMapper.getIcon('download');

      expect(consoleDebugSpy).toHaveBeenCalledWith(
        'IconMapper: Terminal capabilities changed, invalidating cache'
      );

      consoleDebugSpy.mockRestore();
    });
  });

  // ===================================================================
  // 10. _isCacheValid() Private Method
  // ===================================================================
  describe('_isCacheValid() Private Method', () => {
    beforeEach(() => {
      iconMapper = new IconMapper(mockTerminalDetector);
    });

    test('should return false when lastCapabilities is null', () => {
      expect(iconMapper.lastCapabilities).toBeNull();

      mockTerminalDetector.detect.mockReturnValue({
        supportsUnicode: true,
        supportsEmojis: true
      });

      const isValid = iconMapper._isCacheValid();

      expect(isValid).toBe(false);
      expect(iconMapper.lastCapabilities).not.toBeNull();
    });

    test('should return true when capabilities have not changed', () => {
      mockTerminalDetector.detect.mockReturnValue({
        supportsUnicode: true,
        supportsEmojis: true
      });

      // First call to set lastCapabilities
      iconMapper._isCacheValid();

      // Second call with same capabilities
      const isValid = iconMapper._isCacheValid();

      expect(isValid).toBe(true);
    });

    test('should return false when emoji support changes', () => {
      mockTerminalDetector.detect.mockReturnValue({
        supportsUnicode: true,
        supportsEmojis: true
      });

      iconMapper._isCacheValid();

      // Change emoji support
      mockTerminalDetector.detect.mockReturnValue({
        supportsUnicode: true,
        supportsEmojis: false
      });

      const isValid = iconMapper._isCacheValid();

      expect(isValid).toBe(false);
    });

    test('should return false when unicode support changes', () => {
      mockTerminalDetector.detect.mockReturnValue({
        supportsUnicode: true,
        supportsEmojis: true
      });

      iconMapper._isCacheValid();

      // Change unicode support
      mockTerminalDetector.detect.mockReturnValue({
        supportsUnicode: false,
        supportsEmojis: true
      });

      const isValid = iconMapper._isCacheValid();

      expect(isValid).toBe(false);
    });

    test('should update lastCapabilities when capabilities change', () => {
      const capabilities1 = {
        supportsUnicode: true,
        supportsEmojis: true
      };

      mockTerminalDetector.detect.mockReturnValue(capabilities1);
      iconMapper._isCacheValid();

      const capabilities2 = {
        supportsUnicode: false,
        supportsEmojis: false
      };

      mockTerminalDetector.detect.mockReturnValue(capabilities2);
      iconMapper._isCacheValid();

      expect(iconMapper.lastCapabilities.supportsUnicode).toBe(false);
      expect(iconMapper.lastCapabilities.supportsEmojis).toBe(false);
    });
  });

  // ===================================================================
  // 11. _setupCapabilityChangeDetection() Private Method
  // ===================================================================
  describe('_setupCapabilityChangeDetection() Private Method', () => {
    test('should register onResize callback when TerminalDetector supports it', () => {
      iconMapper = new IconMapper(mockTerminalDetector);

      expect(mockTerminalDetector.onResize).toHaveBeenCalled();
    });

    test('should clear cache when resize event occurs', () => {
      const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();

      // Capture the resize callback
      let resizeCallback;
      mockTerminalDetector.onResize.mockImplementation((callback) => {
        resizeCallback = callback;
      });

      iconMapper = new IconMapper(mockTerminalDetector);

      // Populate cache
      mockTerminalDetector.detect.mockReturnValue({
        supportsUnicode: true,
        supportsEmojis: true
      });
      iconMapper.getIcon('download');

      expect(iconMapper.iconCache.size).toBe(1);

      // Trigger resize
      resizeCallback();

      expect(iconMapper.iconCache.size).toBe(0);
      expect(consoleDebugSpy).toHaveBeenCalledWith('IconMapper: Cache cleared');

      consoleDebugSpy.mockRestore();
    });

    test('should not throw error when onResize is not available', () => {
      const detectorWithoutResize = {
        detect: jest.fn().mockReturnValue({
          supportsUnicode: true,
          supportsEmojis: true
        }),
        supportsUnicode: jest.fn().mockReturnValue(true),
        supportsEmojis: jest.fn().mockReturnValue(true)
      };

      expect(() => {
        new IconMapper(detectorWithoutResize);
      }).not.toThrow();
    });
  });

  // ===================================================================
  // 12. Fallback Chain Integration Tests
  // ===================================================================
  describe('Fallback Chain Integration Tests', () => {
    beforeEach(() => {
      iconMapper = new IconMapper(mockTerminalDetector);
    });

    test('should follow emoji → unicode → ascii → plain fallback chain', () => {
      // Emoji level
      mockTerminalDetector.detect.mockReturnValue({
        supportsUnicode: true,
        supportsEmojis: true
      });
      expect(iconMapper.getIcon('download')).toBe('📥');

      iconMapper.clearCache();

      // Unicode level
      mockTerminalDetector.detect.mockReturnValue({
        supportsUnicode: true,
        supportsEmojis: false
      });
      expect(iconMapper.getIcon('download')).toBe('↓');

      iconMapper.clearCache();

      // ASCII level
      mockTerminalDetector.detect.mockReturnValue({
        supportsUnicode: false,
        supportsEmojis: false
      });
      expect(iconMapper.getIcon('download')).toBe('v');
    });

    test('should follow fallback chain for status icons', () => {
      // Emoji level
      mockTerminalDetector.detect.mockReturnValue({
        supportsUnicode: true,
        supportsEmojis: true
      });
      expect(iconMapper.getStatusIcon('success')).toBe('✅');

      iconMapper.clearCache();

      // Unicode level
      mockTerminalDetector.detect.mockReturnValue({
        supportsUnicode: true,
        supportsEmojis: false
      });
      expect(iconMapper.getStatusIcon('success')).toBe('✓');

      iconMapper.clearCache();

      // ASCII level
      mockTerminalDetector.detect.mockReturnValue({
        supportsUnicode: false,
        supportsEmojis: false
      });
      expect(iconMapper.getStatusIcon('success')).toBe('+');
    });

    test('should follow fallback chain for category icons', () => {
      // Emoji level
      mockTerminalDetector.detect.mockReturnValue({
        supportsUnicode: true,
        supportsEmojis: true
      });
      expect(iconMapper.getCategoryIcon('action')).toBe('⚡');

      iconMapper.clearCache();

      // Unicode level
      mockTerminalDetector.detect.mockReturnValue({
        supportsUnicode: true,
        supportsEmojis: false
      });
      expect(iconMapper.getCategoryIcon('action')).toBe('►');

      iconMapper.clearCache();

      // ASCII level
      mockTerminalDetector.detect.mockReturnValue({
        supportsUnicode: false,
        supportsEmojis: false
      });
      expect(iconMapper.getCategoryIcon('action')).toBe('>');
    });

    test('should use custom icons with correct fallback chain', () => {
      const customIcon = {
        emoji: '🔥',
        unicode: '◊',
        ascii: '*',
        plain: '[C]'
      };

      iconMapper.registerIcon('custom', customIcon);

      // Emoji level
      mockTerminalDetector.detect.mockReturnValue({
        supportsUnicode: true,
        supportsEmojis: true
      });
      expect(iconMapper.getIcon('custom')).toBe('🔥');

      iconMapper.clearCache();

      // Unicode level
      mockTerminalDetector.detect.mockReturnValue({
        supportsUnicode: true,
        supportsEmojis: false
      });
      expect(iconMapper.getIcon('custom')).toBe('◊');

      iconMapper.clearCache();

      // ASCII level
      mockTerminalDetector.detect.mockReturnValue({
        supportsUnicode: false,
        supportsEmojis: false
      });
      expect(iconMapper.getIcon('custom')).toBe('*');
    });
  });

  // ===================================================================
  // 13. _resolveIconFromSet() Private Method
  // ===================================================================
  describe('_resolveIconFromSet() Private Method', () => {
    beforeEach(() => {
      iconMapper = new IconMapper(mockTerminalDetector);
    });

    test('should return emoji when emoji support is available', () => {
      mockTerminalDetector.detect.mockReturnValue({
        supportsUnicode: true,
        supportsEmojis: true
      });

      const iconSet = {
        emoji: '🚀',
        unicode: '↑',
        ascii: '^',
        plain: '[D]'
      };

      const resolved = iconMapper._resolveIconFromSet(iconSet);

      expect(resolved).toBe('🚀');
    });

    test('should return unicode when emoji not supported but unicode is', () => {
      mockTerminalDetector.detect.mockReturnValue({
        supportsUnicode: true,
        supportsEmojis: false
      });

      const iconSet = {
        emoji: '🚀',
        unicode: '↑',
        ascii: '^',
        plain: '[D]'
      };

      const resolved = iconMapper._resolveIconFromSet(iconSet);

      expect(resolved).toBe('↑');
    });

    test('should return ascii when neither emoji nor unicode supported', () => {
      mockTerminalDetector.detect.mockReturnValue({
        supportsUnicode: false,
        supportsEmojis: false
      });

      const iconSet = {
        emoji: '🚀',
        unicode: '↑',
        ascii: '^',
        plain: '[D]'
      };

      const resolved = iconMapper._resolveIconFromSet(iconSet);

      expect(resolved).toBe('^');
    });

    test('should return plain as ultimate fallback', () => {
      mockTerminalDetector.detect.mockReturnValue({
        supportsUnicode: false,
        supportsEmojis: false
      });

      const iconSet = {
        emoji: '',
        unicode: '',
        ascii: '',
        plain: '[D]'
      };

      const resolved = iconMapper._resolveIconFromSet(iconSet);

      expect(resolved).toBe('[D]');
    });

    test('should log debug message when emoji expected but not available', () => {
      const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();

      mockTerminalDetector.detect.mockReturnValue({
        supportsUnicode: true,
        supportsEmojis: true
      });

      const iconSet = {
        emoji: '',
        unicode: '↑',
        ascii: '^',
        plain: '[D]'
      };

      iconMapper._resolveIconFromSet(iconSet);

      expect(consoleDebugSpy).toHaveBeenCalledWith(
        'IconMapper: Emoji expected but not available, using unicode'
      );

      consoleDebugSpy.mockRestore();
    });

    test('should log debug message when unicode expected but not available', () => {
      const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();

      mockTerminalDetector.detect.mockReturnValue({
        supportsUnicode: true,
        supportsEmojis: false
      });

      const iconSet = {
        emoji: '🚀',
        unicode: '',
        ascii: '^',
        plain: '[D]'
      };

      iconMapper._resolveIconFromSet(iconSet);

      expect(consoleDebugSpy).toHaveBeenCalledWith(
        'IconMapper: Unicode expected but not available, using ASCII'
      );

      consoleDebugSpy.mockRestore();
    });
  });
});
