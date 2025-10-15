/**
 * LayoutManager Unit Tests
 *
 * Tests for responsive layout management including layout mode detection,
 * content width calculations, text manipulation utilities, and cache behavior
 */

const LayoutManager = require('../../../../../src/ui/menu/visual/LayoutManager');
const stringWidth = require('string-width');

describe('LayoutManager', () => {
  let layoutManager;
  let mockTerminalDetector;
  let mockVisualConstants;

  beforeEach(() => {
    // Mock TerminalDetector
    mockTerminalDetector = {
      getDimensions: jest.fn(() => ({ width: 80, height: 24 })),
      onResize: jest.fn((callback) => {
        // Store callback for testing and return cleanup function
        mockTerminalDetector._resizeCallback = callback;
        return () => {
          mockTerminalDetector._resizeCallback = null;
        };
      }),
      _resizeCallback: null
    };

    // Mock VisualConstants
    mockVisualConstants = {
      LAYOUT: {
        breakpoints: {
          expanded: 100,
          standard: 80,
          compact: 60
        },
        margins: {
          horizontal: 2
        },
        padding: {
          expanded: { horizontal: 4, vertical: 1 },
          standard: { horizontal: 2, vertical: 1 },
          compact: { horizontal: 1, vertical: 0 }
        }
      },
      SPACING: {
        beforeHeader: 1,
        afterHeader: 1,
        betweenOptions: 0,
        beforeDescription: 1,
        afterDescription: 1,
        beforeFooter: 1
      },
      TYPOGRAPHY: {
        maxDescriptionLength: {
          expanded: 120,
          standard: 80,
          compact: 60
        },
        ellipsis: '...',
        indentation: 2
      }
    };
  });

  afterEach(() => {
    if (layoutManager && layoutManager.cleanup) {
      layoutManager.cleanup();
    }
    layoutManager = null;
  });

  describe('Dependency Injection & Initialization', () => {
    test('should throw TypeError if TerminalDetector is not provided', () => {
      expect(() => {
        new LayoutManager(null, mockVisualConstants);
      }).toThrow(TypeError);
      expect(() => {
        new LayoutManager(null, mockVisualConstants);
      }).toThrow('LayoutManager requires a TerminalDetector instance');
    });

    test('should throw TypeError if visual constants are not provided', () => {
      expect(() => {
        new LayoutManager(mockTerminalDetector, null);
      }).toThrow(TypeError);
      expect(() => {
        new LayoutManager(mockTerminalDetector, null);
      }).toThrow('LayoutManager requires visual constants');
    });

    test('should initialize with valid dependencies', () => {
      layoutManager = new LayoutManager(mockTerminalDetector, mockVisualConstants);

      expect(layoutManager.terminalDetector).toBe(mockTerminalDetector);
      expect(layoutManager.constants).toBe(mockVisualConstants);
      expect(layoutManager.layoutCache).toBeNull();
      expect(layoutManager.cachedWidth).toBeNull();
    });

    test('should setup resize listener during initialization', () => {
      layoutManager = new LayoutManager(mockTerminalDetector, mockVisualConstants);

      expect(mockTerminalDetector.onResize).toHaveBeenCalled();
      expect(mockTerminalDetector.onResize).toHaveBeenCalledWith(expect.any(Function));
      expect(layoutManager.resizeCleanup).toBeDefined();
    });
  });

  describe('Layout Mode Detection', () => {
    test('should return "expanded" for width >= 100', () => {
      mockTerminalDetector.getDimensions.mockReturnValue({ width: 100, height: 24 });
      layoutManager = new LayoutManager(mockTerminalDetector, mockVisualConstants);

      expect(layoutManager.getLayoutMode()).toBe('expanded');
    });

    test('should return "expanded" for width = 120', () => {
      mockTerminalDetector.getDimensions.mockReturnValue({ width: 120, height: 24 });
      layoutManager = new LayoutManager(mockTerminalDetector, mockVisualConstants);

      expect(layoutManager.getLayoutMode()).toBe('expanded');
    });

    test('should return "standard" for width = 80', () => {
      mockTerminalDetector.getDimensions.mockReturnValue({ width: 80, height: 24 });
      layoutManager = new LayoutManager(mockTerminalDetector, mockVisualConstants);

      expect(layoutManager.getLayoutMode()).toBe('standard');
    });

    test('should return "standard" for width = 99', () => {
      mockTerminalDetector.getDimensions.mockReturnValue({ width: 99, height: 24 });
      layoutManager = new LayoutManager(mockTerminalDetector, mockVisualConstants);

      expect(layoutManager.getLayoutMode()).toBe('standard');
    });

    test('should return "standard" for width between 80 and 100', () => {
      mockTerminalDetector.getDimensions.mockReturnValue({ width: 90, height: 24 });
      layoutManager = new LayoutManager(mockTerminalDetector, mockVisualConstants);

      expect(layoutManager.getLayoutMode()).toBe('standard');
    });

    test('should return "compact" for width = 79', () => {
      mockTerminalDetector.getDimensions.mockReturnValue({ width: 79, height: 24 });
      layoutManager = new LayoutManager(mockTerminalDetector, mockVisualConstants);

      expect(layoutManager.getLayoutMode()).toBe('compact');
    });

    test('should return "compact" for width = 60', () => {
      mockTerminalDetector.getDimensions.mockReturnValue({ width: 60, height: 24 });
      layoutManager = new LayoutManager(mockTerminalDetector, mockVisualConstants);

      expect(layoutManager.getLayoutMode()).toBe('compact');
    });

    test('should return "compact" for width < 80', () => {
      mockTerminalDetector.getDimensions.mockReturnValue({ width: 70, height: 24 });
      layoutManager = new LayoutManager(mockTerminalDetector, mockVisualConstants);

      expect(layoutManager.getLayoutMode()).toBe('compact');
    });
  });

  describe('Layout Calculations - getContentWidth()', () => {
    test('should calculate content width correctly (width - 2*margins)', () => {
      mockTerminalDetector.getDimensions.mockReturnValue({ width: 80, height: 24 });
      layoutManager = new LayoutManager(mockTerminalDetector, mockVisualConstants);

      // 80 - (2 * 2) = 76
      expect(layoutManager.getContentWidth()).toBe(76);
    });

    test('should calculate content width for expanded mode (120 columns)', () => {
      mockTerminalDetector.getDimensions.mockReturnValue({ width: 120, height: 24 });
      layoutManager = new LayoutManager(mockTerminalDetector, mockVisualConstants);

      // 120 - (2 * 2) = 116
      expect(layoutManager.getContentWidth()).toBe(116);
    });

    test('should calculate content width for compact mode (60 columns)', () => {
      mockTerminalDetector.getDimensions.mockReturnValue({ width: 60, height: 24 });
      layoutManager = new LayoutManager(mockTerminalDetector, mockVisualConstants);

      // 60 - (2 * 2) = 56
      expect(layoutManager.getContentWidth()).toBe(56);
    });

    test('should enforce minimum width of 20 columns', () => {
      mockTerminalDetector.getDimensions.mockReturnValue({ width: 15, height: 24 });
      layoutManager = new LayoutManager(mockTerminalDetector, mockVisualConstants);

      // 15 - (2 * 2) = 11, but minimum is 20
      expect(layoutManager.getContentWidth()).toBe(20);
    });

    test('should enforce minimum width when margins are very large', () => {
      mockVisualConstants.LAYOUT.margins.horizontal = 10;
      mockTerminalDetector.getDimensions.mockReturnValue({ width: 30, height: 24 });
      layoutManager = new LayoutManager(mockTerminalDetector, mockVisualConstants);

      // 30 - (2 * 10) = 10, but minimum is 20
      expect(layoutManager.getContentWidth()).toBe(20);
    });
  });

  describe('Layout Calculations - getHorizontalPadding()', () => {
    beforeEach(() => {
      layoutManager = new LayoutManager(mockTerminalDetector, mockVisualConstants);
    });

    test('should return correct padding for expanded mode', () => {
      expect(layoutManager.getHorizontalPadding('expanded')).toBe(4);
    });

    test('should return correct padding for standard mode', () => {
      expect(layoutManager.getHorizontalPadding('standard')).toBe(2);
    });

    test('should return correct padding for compact mode', () => {
      expect(layoutManager.getHorizontalPadding('compact')).toBe(1);
    });

    test('should use current layout mode if mode parameter not provided', () => {
      mockTerminalDetector.getDimensions.mockReturnValue({ width: 100, height: 24 });
      layoutManager = new LayoutManager(mockTerminalDetector, mockVisualConstants);

      // Should detect expanded mode and use its padding
      expect(layoutManager.getHorizontalPadding()).toBe(4);
    });

    test('should fallback to standard padding if mode is invalid', () => {
      expect(layoutManager.getHorizontalPadding('invalid_mode')).toBe(2);
    });
  });

  describe('Layout Calculations - getVerticalSpacing()', () => {
    beforeEach(() => {
      layoutManager = new LayoutManager(mockTerminalDetector, mockVisualConstants);
    });

    test('should return correct spacing for beforeHeader', () => {
      expect(layoutManager.getVerticalSpacing('beforeHeader')).toBe(1);
    });

    test('should return correct spacing for afterHeader', () => {
      expect(layoutManager.getVerticalSpacing('afterHeader')).toBe(1);
    });

    test('should return correct spacing for betweenOptions', () => {
      expect(layoutManager.getVerticalSpacing('betweenOptions')).toBe(0);
    });

    test('should return correct spacing for beforeDescription', () => {
      expect(layoutManager.getVerticalSpacing('beforeDescription')).toBe(1);
    });

    test('should return correct spacing for afterDescription', () => {
      expect(layoutManager.getVerticalSpacing('afterDescription')).toBe(1);
    });

    test('should return correct spacing for beforeFooter', () => {
      expect(layoutManager.getVerticalSpacing('beforeFooter')).toBe(1);
    });

    test('should return 0 for unknown section type', () => {
      expect(layoutManager.getVerticalSpacing('unknownSection')).toBe(0);
    });
  });

  describe('Layout Calculations - getLayoutConfig()', () => {
    test('should return complete layout configuration', () => {
      mockTerminalDetector.getDimensions.mockReturnValue({ width: 80, height: 24 });
      layoutManager = new LayoutManager(mockTerminalDetector, mockVisualConstants);

      const config = layoutManager.getLayoutConfig();

      expect(config).toEqual({
        mode: 'standard',
        contentWidth: 76,
        terminalWidth: 80,
        horizontalPadding: 2,
        verticalSpacing: {
          beforeHeader: 1,
          afterHeader: 1,
          betweenOptions: 0,
          beforeDescription: 1,
          afterDescription: 1,
          beforeFooter: 1
        }
      });
    });

    test('should return layout config for expanded mode', () => {
      mockTerminalDetector.getDimensions.mockReturnValue({ width: 120, height: 40 });
      layoutManager = new LayoutManager(mockTerminalDetector, mockVisualConstants);

      const config = layoutManager.getLayoutConfig();

      expect(config.mode).toBe('expanded');
      expect(config.contentWidth).toBe(116);
      expect(config.terminalWidth).toBe(120);
      expect(config.horizontalPadding).toBe(4);
    });

    test('should return layout config for compact mode', () => {
      mockTerminalDetector.getDimensions.mockReturnValue({ width: 60, height: 24 });
      layoutManager = new LayoutManager(mockTerminalDetector, mockVisualConstants);

      const config = layoutManager.getLayoutConfig();

      expect(config.mode).toBe('compact');
      expect(config.contentWidth).toBe(56);
      expect(config.terminalWidth).toBe(60);
      expect(config.horizontalPadding).toBe(1);
    });
  });

  describe('Text Manipulation - truncateText()', () => {
    beforeEach(() => {
      layoutManager = new LayoutManager(mockTerminalDetector, mockVisualConstants);
    });

    test('should not truncate text shorter than maxWidth', () => {
      const text = 'Short text';
      const result = layoutManager.truncateText(text, 20);

      expect(result).toBe('Short text');
    });

    test('should truncate text longer than maxWidth with default ellipsis', () => {
      const text = 'This is a very long text that needs truncation';
      const result = layoutManager.truncateText(text, 20);

      expect(stringWidth(result)).toBeLessThanOrEqual(20);
      expect(result).toMatch(/\.\.\.$/);
    });

    test('should truncate text with custom ellipsis', () => {
      const text = 'This is a very long text';
      const result = layoutManager.truncateText(text, 15, '…');

      expect(stringWidth(result)).toBeLessThanOrEqual(15);
      expect(result).toMatch(/…$/);
    });

    test('should handle empty text', () => {
      expect(layoutManager.truncateText('', 20)).toBe('');
      expect(layoutManager.truncateText(null, 20)).toBe('');
      expect(layoutManager.truncateText(undefined, 20)).toBe('');
    });

    test('should handle non-string input', () => {
      expect(layoutManager.truncateText(123, 20)).toBe('');
      expect(layoutManager.truncateText({}, 20)).toBe('');
    });

    test('should handle maxWidth smaller than ellipsis', () => {
      const text = 'Long text';
      const result = layoutManager.truncateText(text, 2);

      // Should return truncated ellipsis when maxWidth is very small
      expect(result.length).toBeLessThanOrEqual(2);
    });

    test('should correctly count Unicode characters', () => {
      const text = '📁 Important file 📄 with content';
      const result = layoutManager.truncateText(text, 15);

      expect(stringWidth(result)).toBeLessThanOrEqual(15);
    });

    test('should correctly handle emojis in truncation', () => {
      const text = '🚀 Launch 🎉 Party 🎊 Time';
      const result = layoutManager.truncateText(text, 10);

      expect(stringWidth(result)).toBeLessThanOrEqual(10);
      expect(result).toMatch(/\.\.\.$/);
    });

    test('should preserve text when exactly at maxWidth', () => {
      const text = 'Exactly twenty chars';
      const result = layoutManager.truncateText(text, stringWidth(text));

      expect(result).toBe(text);
    });
  });

  describe('Text Manipulation - wrapText()', () => {
    beforeEach(() => {
      layoutManager = new LayoutManager(mockTerminalDetector, mockVisualConstants);
    });

    test('should not wrap text that fits within maxWidth', () => {
      const text = 'Short text';
      const lines = layoutManager.wrapText(text, 20);

      expect(lines).toEqual(['Short text']);
    });

    test('should wrap text on word boundaries', () => {
      const text = 'This is a long sentence that needs to be wrapped across multiple lines';
      const lines = layoutManager.wrapText(text, 20);

      expect(lines.length).toBeGreaterThan(1);
      lines.forEach(line => {
        expect(stringWidth(line)).toBeLessThanOrEqual(20);
      });
    });

    test('should break long words that exceed maxWidth', () => {
      const text = 'Supercalifragilisticexpialidocious';
      const lines = layoutManager.wrapText(text, 15);

      expect(lines.length).toBeGreaterThan(1);
      lines.forEach(line => {
        expect(stringWidth(line)).toBeLessThanOrEqual(15);
      });
    });

    test('should handle text with multiple long words', () => {
      const text = 'Supercalifragilisticexpialidocious and Antidisestablishmentarianism';
      const lines = layoutManager.wrapText(text, 15);

      expect(lines.length).toBeGreaterThan(2);
      lines.forEach(line => {
        expect(stringWidth(line)).toBeLessThanOrEqual(15);
      });
    });

    test('should handle empty text', () => {
      expect(layoutManager.wrapText('', 20)).toEqual([]);
      expect(layoutManager.wrapText(null, 20)).toEqual([]);
      expect(layoutManager.wrapText(undefined, 20)).toEqual([]);
    });

    test('should handle non-string input', () => {
      expect(layoutManager.wrapText(123, 20)).toEqual([]);
      expect(layoutManager.wrapText({}, 20)).toEqual([]);
    });

    test('should preserve spaces between words', () => {
      const text = 'Word1 Word2 Word3';
      const lines = layoutManager.wrapText(text, 50);

      expect(lines).toEqual(['Word1 Word2 Word3']);
    });

    test('should correctly wrap text with Unicode characters', () => {
      const text = '📁 Files 📄 Documents 📊 Data 📈 Charts';
      const lines = layoutManager.wrapText(text, 15);

      lines.forEach(line => {
        expect(stringWidth(line)).toBeLessThanOrEqual(15);
      });
    });

    test('should handle text with no spaces (one very long word)', () => {
      const text = 'VeryLongWordWithoutAnySpaces';
      const lines = layoutManager.wrapText(text, 10);

      expect(lines.length).toBeGreaterThan(1);
      lines.forEach(line => {
        expect(stringWidth(line)).toBeLessThanOrEqual(10);
      });
    });

    test('should handle mixed short and long words', () => {
      const text = 'Short Supercalifragilisticexpialidocious word';
      const lines = layoutManager.wrapText(text, 15);

      expect(lines.length).toBeGreaterThan(1);
      lines.forEach(line => {
        expect(stringWidth(line)).toBeLessThanOrEqual(15);
      });
    });
  });

  describe('Text Manipulation - centerText()', () => {
    beforeEach(() => {
      layoutManager = new LayoutManager(mockTerminalDetector, mockVisualConstants);
    });

    test('should center text with equal padding on both sides', () => {
      const text = 'Hello';
      const width = 20;
      const result = layoutManager.centerText(text, width);

      expect(stringWidth(result)).toBe(width);
      expect(result).toMatch(/^\s+Hello\s+$/);
    });

    test('should add extra padding to right when width is odd', () => {
      const text = 'Hi';
      const width = 11;
      const result = layoutManager.centerText(text, width);

      expect(stringWidth(result)).toBe(width);
      // Text is 2 chars, width is 11, so padding is 9
      // Left padding: floor(9/2) = 4
      // Right padding: 9 - 4 = 5
      const leftPadding = result.indexOf('Hi');
      const rightPadding = result.length - leftPadding - 2;
      expect(rightPadding).toBe(leftPadding + 1);
    });

    test('should handle text wider than available width', () => {
      const text = 'This is too long';
      const width = 10;
      const result = layoutManager.centerText(text, width);

      // Should return text as-is without truncation
      expect(result).toBe(text);
    });

    test('should handle empty text', () => {
      const result = layoutManager.centerText('', 20);

      expect(result).toBe(' '.repeat(20));
    });

    test('should handle null/undefined text', () => {
      expect(layoutManager.centerText(null, 20)).toBe(' '.repeat(20));
      expect(layoutManager.centerText(undefined, 20)).toBe(' '.repeat(20));
    });

    test('should correctly center Unicode characters', () => {
      const text = '📁 Files';
      const width = 20;
      const result = layoutManager.centerText(text, width);

      expect(stringWidth(result)).toBe(width);
    });

    test('should correctly center emojis', () => {
      const text = '🎉';
      const width = 10;
      const result = layoutManager.centerText(text, width);

      expect(stringWidth(result)).toBe(width);
    });

    test('should handle text that exactly matches width', () => {
      const text = 'Exactly20Characters!';
      const width = stringWidth(text);
      const result = layoutManager.centerText(text, width);

      expect(result).toBe(text);
    });
  });

  describe('Cache Behavior', () => {
    test('should cache layout config on first call', () => {
      mockTerminalDetector.getDimensions.mockReturnValue({ width: 80, height: 24 });
      layoutManager = new LayoutManager(mockTerminalDetector, mockVisualConstants);

      const config1 = layoutManager.getLayoutConfig();

      expect(layoutManager.layoutCache).toBe(config1);
      expect(layoutManager.cachedWidth).toBe(80);
    });

    test('should reuse cached config when width has not changed', () => {
      mockTerminalDetector.getDimensions.mockReturnValue({ width: 80, height: 24 });
      layoutManager = new LayoutManager(mockTerminalDetector, mockVisualConstants);

      const config1 = layoutManager.getLayoutConfig();
      const config2 = layoutManager.getLayoutConfig();

      // Should return the exact same object reference (cached)
      expect(config1).toBe(config2);
    });

    test('should call getDimensions for cache validation on each call', () => {
      mockTerminalDetector.getDimensions.mockReturnValue({ width: 80, height: 24 });
      layoutManager = new LayoutManager(mockTerminalDetector, mockVisualConstants);

      const getDimensionsCallsBefore = mockTerminalDetector.getDimensions.mock.calls.length;

      layoutManager.getLayoutConfig();
      layoutManager.getLayoutConfig();
      layoutManager.getLayoutConfig();

      const getDimensionsCallsAfter = mockTerminalDetector.getDimensions.mock.calls.length;

      // getDimensions is called to check if width changed, but cache prevents recalculation
      expect(getDimensionsCallsAfter).toBeGreaterThan(getDimensionsCallsBefore);
    });

    test('should invalidate cache when width changes', () => {
      // Start with width 80
      mockTerminalDetector.getDimensions.mockReturnValue({ width: 80, height: 24 });
      layoutManager = new LayoutManager(mockTerminalDetector, mockVisualConstants);

      const config1 = layoutManager.getLayoutConfig();
      expect(config1.mode).toBe('standard');

      // Change width to 120
      mockTerminalDetector.getDimensions.mockReturnValue({ width: 120, height: 24 });
      const config2 = layoutManager.getLayoutConfig();

      // Should be different objects (cache was invalidated)
      expect(config1).not.toBe(config2);
      expect(config1.mode).toBe('standard');
      expect(config2.mode).toBe('expanded');
    });

    test('should manually invalidate cache', () => {
      mockTerminalDetector.getDimensions.mockReturnValue({ width: 80, height: 24 });
      layoutManager = new LayoutManager(mockTerminalDetector, mockVisualConstants);

      layoutManager.getLayoutConfig();
      expect(layoutManager.layoutCache).not.toBeNull();

      layoutManager.invalidateCache();

      expect(layoutManager.layoutCache).toBeNull();
      expect(layoutManager.cachedWidth).toBeNull();
    });

    test('should recalculate after manual cache invalidation', () => {
      mockTerminalDetector.getDimensions.mockReturnValue({ width: 80, height: 24 });
      layoutManager = new LayoutManager(mockTerminalDetector, mockVisualConstants);

      const config1 = layoutManager.getLayoutConfig();
      layoutManager.invalidateCache();
      const config2 = layoutManager.getLayoutConfig();

      // Should be different object instances
      expect(config1).not.toBe(config2);
      // But values should be the same
      expect(config1.mode).toBe(config2.mode);
      expect(config1.contentWidth).toBe(config2.contentWidth);
    });
  });

  describe('Resize Integration', () => {
    test('should register resize callback with TerminalDetector', () => {
      layoutManager = new LayoutManager(mockTerminalDetector, mockVisualConstants);

      expect(mockTerminalDetector.onResize).toHaveBeenCalled();
      expect(mockTerminalDetector._resizeCallback).toBeDefined();
    });

    test('should invalidate cache when resize callback is triggered', () => {
      layoutManager = new LayoutManager(mockTerminalDetector, mockVisualConstants);

      // Create cache
      layoutManager.getLayoutConfig();
      expect(layoutManager.layoutCache).not.toBeNull();

      // Trigger resize callback
      mockTerminalDetector._resizeCallback();

      expect(layoutManager.layoutCache).toBeNull();
      expect(layoutManager.cachedWidth).toBeNull();
    });

    test('should recalculate layout after resize', () => {
      mockTerminalDetector.getDimensions.mockReturnValue({ width: 80, height: 24 });
      layoutManager = new LayoutManager(mockTerminalDetector, mockVisualConstants);

      const config1 = layoutManager.getLayoutConfig();
      expect(config1.mode).toBe('standard');

      // Simulate resize
      mockTerminalDetector.getDimensions.mockReturnValue({ width: 120, height: 40 });
      mockTerminalDetector._resizeCallback();

      const config2 = layoutManager.getLayoutConfig();
      expect(config2.mode).toBe('expanded');
      expect(config2.terminalWidth).toBe(120);
    });

    test('should cleanup resize listener on cleanup()', () => {
      layoutManager = new LayoutManager(mockTerminalDetector, mockVisualConstants);

      const cleanupFn = layoutManager.resizeCleanup;
      expect(cleanupFn).toBeDefined();

      layoutManager.cleanup();

      expect(layoutManager.resizeCleanup).toBeNull();
      expect(mockTerminalDetector._resizeCallback).toBeNull();
    });

    test('should handle cleanup when resizeCleanup is not set', () => {
      layoutManager = new LayoutManager(mockTerminalDetector, mockVisualConstants);
      layoutManager.resizeCleanup = null;

      // Should not throw error
      expect(() => layoutManager.cleanup()).not.toThrow();
    });
  });
});
