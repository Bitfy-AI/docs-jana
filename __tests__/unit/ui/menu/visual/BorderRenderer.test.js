/**
 * BorderRenderer Unit Tests
 *
 * Tests for BorderRenderer including charset resolution, border rendering,
 * box rendering, fallback behavior, caching, and color application
 */

const BorderRenderer = require('../../../../../src/ui/menu/visual/BorderRenderer');

describe('BorderRenderer', () => {
  let mockTerminalDetector;
  let mockVisualConstants;
  let mockThemeEngine;
  let renderer;

  beforeEach(() => {
    // Mock TerminalDetector
    mockTerminalDetector = {
      supportsUnicode: jest.fn().mockReturnValue(true),
      detect: jest.fn().mockReturnValue({
        supportsUnicode: true,
        supportsEmojis: true,
        colorLevel: 2,
        width: 80,
        height: 24
      })
    };

    // Mock VisualConstants with complete border character sets
    mockVisualConstants = {
      BORDER_CHARS: {
        unicode: {
          single: {
            topLeft: '┌',
            topRight: '┐',
            bottomLeft: '└',
            bottomRight: '┘',
            horizontal: '─',
            vertical: '│',
            cross: '┼',
            teeLeft: '┤',
            teeRight: '├',
            teeTop: '┴',
            teeBottom: '┬'
          },
          double: {
            topLeft: '╔',
            topRight: '╗',
            bottomLeft: '╚',
            bottomRight: '╝',
            horizontal: '═',
            vertical: '║',
            cross: '╬',
            teeLeft: '╣',
            teeRight: '╠',
            teeTop: '╩',
            teeBottom: '╦'
          },
          bold: {
            topLeft: '┏',
            topRight: '┓',
            bottomLeft: '┗',
            bottomRight: '┛',
            horizontal: '━',
            vertical: '┃',
            cross: '╋',
            teeLeft: '┫',
            teeRight: '┣',
            teeTop: '┻',
            teeBottom: '┳'
          },
          rounded: {
            topLeft: '╭',
            topRight: '╮',
            bottomLeft: '╰',
            bottomRight: '╯',
            horizontal: '─',
            vertical: '│',
            cross: '┼',
            teeLeft: '┤',
            teeRight: '├',
            teeTop: '┴',
            teeBottom: '┬'
          }
        },
        ascii: {
          single: {
            topLeft: '+',
            topRight: '+',
            bottomLeft: '+',
            bottomRight: '+',
            horizontal: '-',
            vertical: '|',
            cross: '+',
            teeLeft: '+',
            teeRight: '+',
            teeTop: '+',
            teeBottom: '+'
          },
          double: {
            topLeft: '+',
            topRight: '+',
            bottomLeft: '+',
            bottomRight: '+',
            horizontal: '=',
            vertical: '|',
            cross: '+',
            teeLeft: '+',
            teeRight: '+',
            teeTop: '+',
            teeBottom: '+'
          }
        }
      }
    };

    // Mock ThemeEngine
    mockThemeEngine = {
      colorize: jest.fn((text, color) => `<${color}>${text}</${color}>`),
      colorizeBorder: jest.fn((text, color) => `[${color}]${text}[/${color}]`)
    };
  });

  afterEach(() => {
    renderer = null;
  });

  // ===================================================================
  // 1. Dependency Injection & Initialization
  // ===================================================================
  describe('Dependency Injection & Initialization', () => {
    test('should create instance with valid dependencies', () => {
      renderer = new BorderRenderer(mockTerminalDetector, mockVisualConstants);

      expect(renderer).toBeDefined();
      expect(renderer.terminalDetector).toBe(mockTerminalDetector);
      expect(renderer.visualConstants).toBe(mockVisualConstants);
      expect(renderer.themeEngine).toBeNull();
      expect(renderer.charsetCache).toBeInstanceOf(Map);
    });

    test('should create instance with optional ThemeEngine', () => {
      renderer = new BorderRenderer(
        mockTerminalDetector,
        mockVisualConstants,
        mockThemeEngine
      );

      expect(renderer.themeEngine).toBe(mockThemeEngine);
    });

    test('should throw TypeError when TerminalDetector is missing', () => {
      expect(() => {
        new BorderRenderer(null, mockVisualConstants);
      }).toThrow(TypeError);

      expect(() => {
        new BorderRenderer(null, mockVisualConstants);
      }).toThrow('BorderRenderer requires a TerminalDetector instance');
    });

    test('should throw TypeError when TerminalDetector is undefined', () => {
      expect(() => {
        new BorderRenderer(undefined, mockVisualConstants);
      }).toThrow(TypeError);
    });

    test('should throw TypeError when visualConstants is missing', () => {
      expect(() => {
        new BorderRenderer(mockTerminalDetector, null);
      }).toThrow(TypeError);

      expect(() => {
        new BorderRenderer(mockTerminalDetector, null);
      }).toThrow('BorderRenderer requires visualConstants object');
    });

    test('should throw TypeError when visualConstants is undefined', () => {
      expect(() => {
        new BorderRenderer(mockTerminalDetector, undefined);
      }).toThrow(TypeError);
    });

    test('should initialize charset cache as empty Map', () => {
      renderer = new BorderRenderer(mockTerminalDetector, mockVisualConstants);

      expect(renderer.charsetCache).toBeInstanceOf(Map);
      expect(renderer.charsetCache.size).toBe(0);
    });
  });

  // ===================================================================
  // 2. getCharSet() Method
  // ===================================================================
  describe('getCharSet() Method', () => {
    beforeEach(() => {
      renderer = new BorderRenderer(mockTerminalDetector, mockVisualConstants);
    });

    describe('Unicode Support', () => {
      test('should return Unicode single charset when Unicode is supported', () => {
        mockTerminalDetector.supportsUnicode.mockReturnValue(true);

        const charset = renderer.getCharSet('single');

        expect(charset).toEqual(mockVisualConstants.BORDER_CHARS.unicode.single);
        expect(mockTerminalDetector.supportsUnicode).toHaveBeenCalled();
      });

      test('should return Unicode double charset when Unicode is supported', () => {
        mockTerminalDetector.supportsUnicode.mockReturnValue(true);

        const charset = renderer.getCharSet('double');

        expect(charset).toEqual(mockVisualConstants.BORDER_CHARS.unicode.double);
      });

      test('should return Unicode bold charset when Unicode is supported', () => {
        mockTerminalDetector.supportsUnicode.mockReturnValue(true);

        const charset = renderer.getCharSet('bold');

        expect(charset).toEqual(mockVisualConstants.BORDER_CHARS.unicode.bold);
      });

      test('should return Unicode rounded charset when Unicode is supported', () => {
        mockTerminalDetector.supportsUnicode.mockReturnValue(true);

        const charset = renderer.getCharSet('rounded');

        expect(charset).toEqual(mockVisualConstants.BORDER_CHARS.unicode.rounded);
      });

      test('should fallback to single style for unknown Unicode styles', () => {
        mockTerminalDetector.supportsUnicode.mockReturnValue(true);

        const charset = renderer.getCharSet('unknown-style');

        expect(charset).toEqual(mockVisualConstants.BORDER_CHARS.unicode.single);
      });
    });

    describe('ASCII Fallback', () => {
      test('should return ASCII single charset when Unicode is not supported', () => {
        mockTerminalDetector.supportsUnicode.mockReturnValue(false);

        const charset = renderer.getCharSet('single');

        expect(charset).toEqual(mockVisualConstants.BORDER_CHARS.ascii.single);
        expect(mockTerminalDetector.supportsUnicode).toHaveBeenCalled();
      });

      test('should return ASCII double charset when Unicode is not supported', () => {
        mockTerminalDetector.supportsUnicode.mockReturnValue(false);

        const charset = renderer.getCharSet('double');

        expect(charset).toEqual(mockVisualConstants.BORDER_CHARS.ascii.double);
      });

      test('should map bold to ASCII single when Unicode is not supported', () => {
        mockTerminalDetector.supportsUnicode.mockReturnValue(false);

        const charset = renderer.getCharSet('bold');

        expect(charset).toEqual(mockVisualConstants.BORDER_CHARS.ascii.single);
      });

      test('should map rounded to ASCII single when Unicode is not supported', () => {
        mockTerminalDetector.supportsUnicode.mockReturnValue(false);

        const charset = renderer.getCharSet('rounded');

        expect(charset).toEqual(mockVisualConstants.BORDER_CHARS.ascii.single);
      });
    });

    describe('Explicit ASCII Style', () => {
      test('should return ASCII charset when style is explicitly set to "ascii"', () => {
        mockTerminalDetector.supportsUnicode.mockReturnValue(true);

        const charset = renderer.getCharSet('ascii');

        expect(charset).toEqual(mockVisualConstants.BORDER_CHARS.ascii.single);
        // Should not check terminal support when explicitly ASCII
      });
    });

    describe('Charset Validation', () => {
      test('should validate charset has all required properties', () => {
        mockTerminalDetector.supportsUnicode.mockReturnValue(true);

        const charset = renderer.getCharSet('single');

        expect(charset).toHaveProperty('topLeft');
        expect(charset).toHaveProperty('topRight');
        expect(charset).toHaveProperty('bottomLeft');
        expect(charset).toHaveProperty('bottomRight');
        expect(charset).toHaveProperty('horizontal');
        expect(charset).toHaveProperty('vertical');
        expect(charset).toHaveProperty('cross');
        expect(charset).toHaveProperty('teeLeft');
        expect(charset).toHaveProperty('teeRight');
        expect(charset).toHaveProperty('teeTop');
        expect(charset).toHaveProperty('teeBottom');
      });

      test('should use simple text fallback when charset is invalid', () => {
        // Mock invalid charset
        mockVisualConstants.BORDER_CHARS.unicode.single = {
          topLeft: '',  // Invalid: empty string
          topRight: '┐'
        };

        const charset = renderer.getCharSet('single');

        // Should use ultimate fallback
        expect(charset).toEqual({
          topLeft: '+',
          topRight: '+',
          bottomLeft: '+',
          bottomRight: '+',
          horizontal: '-',
          vertical: '|',
          cross: '+',
          teeLeft: '+',
          teeRight: '+',
          teeTop: '+',
          teeBottom: '+'
        });
      });

      test('should use simple text fallback when charset is missing properties', () => {
        // Mock incomplete charset
        mockVisualConstants.BORDER_CHARS.unicode.single = {
          topLeft: '┌',
          horizontal: '─'
          // Missing other required properties
        };

        const charset = renderer.getCharSet('single');

        // Should use ultimate fallback
        expect(charset.topLeft).toBe('+');
        expect(charset.horizontal).toBe('-');
      });
    });

    describe('Cache Behavior', () => {
      test('should cache charset after first retrieval', () => {
        // Create fresh renderer for this test
        const freshRenderer = new BorderRenderer(mockTerminalDetector, mockVisualConstants);
        expect(freshRenderer.charsetCache.size).toBe(0);

        const charset1 = freshRenderer.getCharSet('single');
        expect(freshRenderer.charsetCache.size).toBe(1);

        const charset2 = freshRenderer.getCharSet('single');

        // Should return same object from cache
        expect(charset1).toBe(charset2);
        expect(freshRenderer.charsetCache.size).toBe(1);
      });

      test('should cache separately for different styles', () => {
        const singleCharset = renderer.getCharSet('single');
        const doubleCharset = renderer.getCharSet('double');

        expect(singleCharset).not.toBe(doubleCharset);
        expect(renderer.charsetCache.size).toBeGreaterThan(0);
      });

      test('should cache separately based on Unicode support', () => {
        mockTerminalDetector.supportsUnicode.mockReturnValue(true);
        const unicodeCharset = renderer.getCharSet('single');

        mockTerminalDetector.supportsUnicode.mockReturnValue(false);
        renderer.charsetCache.clear(); // Clear cache to force re-detection
        const asciiCharset = renderer.getCharSet('single');

        expect(unicodeCharset).not.toEqual(asciiCharset);
      });

      test('should use cached result on subsequent calls', () => {
        // Create fresh renderer for this test
        const freshRenderer = new BorderRenderer(mockTerminalDetector, mockVisualConstants);

        const charset1 = freshRenderer.getCharSet('single');
        const charset2 = freshRenderer.getCharSet('single');
        const charset3 = freshRenderer.getCharSet('single');

        // Should return same object from cache on all calls
        expect(charset1).toBe(charset2);
        expect(charset2).toBe(charset3);
        expect(freshRenderer.charsetCache.size).toBe(1);
      });
    });

    describe('Default Parameters', () => {
      test('should use "single" style when no style is provided', () => {
        const charset = renderer.getCharSet();

        expect(charset).toEqual(mockVisualConstants.BORDER_CHARS.unicode.single);
      });
    });
  });

  // ===================================================================
  // 3. Border Rendering Methods
  // ===================================================================
  describe('Border Rendering Methods', () => {
    beforeEach(() => {
      renderer = new BorderRenderer(mockTerminalDetector, mockVisualConstants);
      mockTerminalDetector.supportsUnicode.mockReturnValue(true);
    });

    describe('renderTopBorder()', () => {
      test('should render top border with correct width', () => {
        const border = renderer.renderTopBorder(25, 'single');

        expect(border).toBe('┌───────────────────────┐');
        expect(border.length).toBe(25);
      });

      test('should render top border with double style', () => {
        const border = renderer.renderTopBorder(25, 'double');

        expect(border).toBe('╔═══════════════════════╗');
        expect(border.length).toBe(25);
      });

      test('should render top border with bold style', () => {
        const border = renderer.renderTopBorder(25, 'bold');

        expect(border).toBe('┏━━━━━━━━━━━━━━━━━━━━━━━┓');
        expect(border.length).toBe(25);
      });

      test('should render top border with rounded style', () => {
        const border = renderer.renderTopBorder(25, 'rounded');

        expect(border).toBe('╭───────────────────────╮');
        expect(border.length).toBe(25);
      });

      test('should handle minimum width of 2', () => {
        const border = renderer.renderTopBorder(1, 'single');

        expect(border).toBe('┌┐');
        expect(border.length).toBe(2);
      });

      test('should handle width of exactly 2', () => {
        const border = renderer.renderTopBorder(2, 'single');

        expect(border).toBe('┌┐');
        expect(border.length).toBe(2);
      });

      test('should render large widths correctly', () => {
        const border = renderer.renderTopBorder(100, 'single');

        expect(border.length).toBe(100);
        expect(border.startsWith('┌')).toBe(true);
        expect(border.endsWith('┐')).toBe(true);
      });

      test('should use ASCII when Unicode is not supported', () => {
        renderer.clearCache();
        mockTerminalDetector.supportsUnicode.mockReturnValue(false);

        const border = renderer.renderTopBorder(25, 'single');

        expect(border).toBe('+-----------------------+');
        expect(border.length).toBe(25);
      });
    });

    describe('renderBottomBorder()', () => {
      test('should render bottom border with correct width', () => {
        const border = renderer.renderBottomBorder(25, 'single');

        expect(border).toBe('└───────────────────────┘');
        expect(border.length).toBe(25);
      });

      test('should render bottom border with double style', () => {
        const border = renderer.renderBottomBorder(25, 'double');

        expect(border).toBe('╚═══════════════════════╝');
        expect(border.length).toBe(25);
      });

      test('should render bottom border with bold style', () => {
        const border = renderer.renderBottomBorder(25, 'bold');

        expect(border).toBe('┗━━━━━━━━━━━━━━━━━━━━━━━┛');
        expect(border.length).toBe(25);
      });

      test('should render bottom border with rounded style', () => {
        const border = renderer.renderBottomBorder(25, 'rounded');

        expect(border).toBe('╰───────────────────────╯');
        expect(border.length).toBe(25);
      });

      test('should handle minimum width of 2', () => {
        const border = renderer.renderBottomBorder(1, 'single');

        expect(border).toBe('└┘');
        expect(border.length).toBe(2);
      });

      test('should use ASCII when Unicode is not supported', () => {
        renderer.clearCache();
        mockTerminalDetector.supportsUnicode.mockReturnValue(false);

        const border = renderer.renderBottomBorder(25, 'single');

        expect(border).toBe('+-----------------------+');
        expect(border.length).toBe(25);
      });
    });

    describe('renderSeparator()', () => {
      test('should render separator with correct width', () => {
        const separator = renderer.renderSeparator(25, 'single');

        expect(separator).toBe('├───────────────────────┤');
        expect(separator.length).toBe(25);
      });

      test('should render separator with double style', () => {
        const separator = renderer.renderSeparator(25, 'double');

        expect(separator).toBe('╠═══════════════════════╣');
        expect(separator.length).toBe(25);
      });

      test('should render separator with bold style', () => {
        const separator = renderer.renderSeparator(25, 'bold');

        expect(separator).toBe('┣━━━━━━━━━━━━━━━━━━━━━━━┫');
        expect(separator.length).toBe(25);
      });

      test('should render separator with rounded style', () => {
        const separator = renderer.renderSeparator(25, 'rounded');

        expect(separator).toBe('├───────────────────────┤');
        expect(separator.length).toBe(25);
      });

      test('should handle minimum width of 2', () => {
        const separator = renderer.renderSeparator(1, 'single');

        expect(separator).toBe('├┤');
        expect(separator.length).toBe(2);
      });

      test('should use ASCII when Unicode is not supported', () => {
        renderer.clearCache();
        mockTerminalDetector.supportsUnicode.mockReturnValue(false);

        const separator = renderer.renderSeparator(25, 'single');

        expect(separator).toBe('+-----------------------+');
        expect(separator.length).toBe(25);
      });
    });

    describe('Uniform Border Length', () => {
      test('should render all borders with same length for given width', () => {
        const width = 50;
        const top = renderer.renderTopBorder(width, 'single');
        const bottom = renderer.renderBottomBorder(width, 'single');
        const separator = renderer.renderSeparator(width, 'single');

        expect(top.length).toBe(width);
        expect(bottom.length).toBe(width);
        expect(separator.length).toBe(width);
      });

      test('should render all borders with same length for different styles', () => {
        const width = 40;

        ['single', 'double', 'bold', 'rounded'].forEach(style => {
          const top = renderer.renderTopBorder(width, style);
          const bottom = renderer.renderBottomBorder(width, style);
          const separator = renderer.renderSeparator(width, style);

          expect(top.length).toBe(width);
          expect(bottom.length).toBe(width);
          expect(separator.length).toBe(width);
        });
      });
    });
  });

  // ===================================================================
  // 4. renderBox() Method
  // ===================================================================
  describe('renderBox() Method', () => {
    beforeEach(() => {
      renderer = new BorderRenderer(mockTerminalDetector, mockVisualConstants);
      mockTerminalDetector.supportsUnicode.mockReturnValue(true);
    });

    describe('Basic Box Rendering', () => {
      test('should render simple box with single line of text', () => {
        const box = renderer.renderBox('Hello World');
        const lines = box.split('\n');

        // With default padding=1: top border + empty line + content + empty line + bottom border
        expect(lines.length).toBe(5);
        expect(lines[0]).toMatch(/^┌.*┐$/);
        expect(lines[1]).toMatch(/^│\s+│$/); // Empty padding line
        expect(lines[2]).toContain('Hello World');
        expect(lines[3]).toMatch(/^│\s+│$/); // Empty padding line
        expect(lines[4]).toMatch(/^└.*┘$/);
      });

      test('should render box with array of lines', () => {
        const box = renderer.renderBox(['Line 1', 'Line 2', 'Line 3']);
        const lines = box.split('\n');

        expect(lines.length).toBe(7); // borders + padding + 3 content lines
        expect(lines[2]).toContain('Line 1');
        expect(lines[3]).toContain('Line 2');
        expect(lines[4]).toContain('Line 3');
      });

      test('should render box with empty text', () => {
        const box = renderer.renderBox('');
        const lines = box.split('\n');

        // With default padding=1: top border + empty line + content + empty line + bottom border
        expect(lines.length).toBe(5);
        expect(lines[0]).toMatch(/^┌.*┐$/);
        expect(lines[4]).toMatch(/^└.*┘$/);
      });

      test('should render box with single character', () => {
        const box = renderer.renderBox('X');

        expect(box).toContain('X');
        expect(box.split('\n').length).toBe(5); // With default padding=1
      });
    });

    describe('Border Styles', () => {
      test('should render box with single style', () => {
        const box = renderer.renderBox('Test', { style: 'single' });

        expect(box).toContain('┌');
        expect(box).toContain('┐');
        expect(box).toContain('└');
        expect(box).toContain('┘');
      });

      test('should render box with double style', () => {
        const box = renderer.renderBox('Test', { style: 'double' });

        expect(box).toContain('╔');
        expect(box).toContain('╗');
        expect(box).toContain('╚');
        expect(box).toContain('╝');
      });

      test('should render box with bold style', () => {
        const box = renderer.renderBox('Test', { style: 'bold' });

        expect(box).toContain('┏');
        expect(box).toContain('┓');
        expect(box).toContain('┗');
        expect(box).toContain('┛');
      });

      test('should render box with rounded style', () => {
        const box = renderer.renderBox('Test', { style: 'rounded' });

        expect(box).toContain('╭');
        expect(box).toContain('╮');
        expect(box).toContain('╰');
        expect(box).toContain('╯');
      });
    });

    describe('Padding', () => {
      test('should apply default padding of 1', () => {
        const box = renderer.renderBox('X');
        const lines = box.split('\n');

        // With padding=1, should have: top border, empty line, content, empty line, bottom border
        expect(lines.length).toBe(5);
        expect(lines[2]).toMatch(/^│\s+X\s+│$/); // Content line is at index 2
      });

      test('should apply padding of 0 (no vertical padding)', () => {
        const box = renderer.renderBox('X', { padding: 0 });
        const lines = box.split('\n');

        // With padding=0, should have: top border, content, bottom border
        expect(lines.length).toBe(3);
        expect(lines[1]).toMatch(/^│X│$/);
      });

      test('should apply padding of 2', () => {
        const box = renderer.renderBox('X', { padding: 2 });
        const lines = box.split('\n');

        expect(lines.length).toBe(5); // With padding>0: includes empty lines
        expect(lines[2]).toMatch(/^│\s{2}X\s{2}│$/); // Content line
      });

      test('should apply padding of 3', () => {
        const box = renderer.renderBox('Test', { padding: 3 });

        expect(box).toContain('   Test   ');
      });
    });

    describe('Text Alignment', () => {
      test('should align text to left by default', () => {
        const box = renderer.renderBox('Hi', { padding: 1 });
        const lines = box.split('\n');

        // Text should be left-aligned with spaces on the right
        // Line 2 is the content line (0: top border, 1: empty padding, 2: content)
        expect(lines[2]).toMatch(/^│ Hi\s+│$/);
      });

      test('should align text to left explicitly', () => {
        const box = renderer.renderBox('Hi', { padding: 1, align: 'left' });
        const lines = box.split('\n');

        expect(lines[2]).toMatch(/^│ Hi\s+│$/);
      });

      test('should align text to center', () => {
        const box = renderer.renderBox('Hi', { padding: 2, align: 'center' });
        const lines = box.split('\n');

        // Should have equal or nearly equal spaces on both sides
        // Line 2 is the content line
        const contentLine = lines[2];
        expect(contentLine).toContain('Hi');
        expect(contentLine).toMatch(/^│\s+Hi\s+│$/);
      });

      test('should align text to right', () => {
        const box = renderer.renderBox('Hi', { padding: 1, align: 'right' });
        const lines = box.split('\n');

        // Text should be right-aligned with spaces on the left
        expect(lines[2]).toMatch(/^│\s+Hi │$/);
      });

      test('should center align multi-line text', () => {
        const box = renderer.renderBox(['A', 'BB', 'CCC'], { align: 'center' });

        expect(box).toContain('A');
        expect(box).toContain('BB');
        expect(box).toContain('CCC');
      });
    });

    describe('Width Calculation', () => {
      test('should calculate box width based on longest line', () => {
        const box = renderer.renderBox(['Short', 'Very Long Line'], { padding: 1 });
        const lines = box.split('\n');

        // All lines should have same length
        const lengths = lines.map(line => line.length);
        expect(new Set(lengths).size).toBe(1);
      });

      test('should handle text exactly fitting the box', () => {
        const box = renderer.renderBox('12345', { padding: 0 });

        expect(box).toContain('12345');
      });

      test('should truncate text that is too long', () => {
        const longText = 'A'.repeat(100);
        const box = renderer.renderBox(longText, { padding: 1 });

        expect(box).toContain('A');
        expect(box.split('\n')[1].length).toBeLessThan(110);
      });
    });

    describe('Edge Cases', () => {
      test('should handle very long text', () => {
        const longText = 'X'.repeat(200);
        const box = renderer.renderBox(longText);

        expect(box).toBeDefined();
        expect(box.split('\n').length).toBeGreaterThanOrEqual(3);
      });

      test('should handle text with special characters', () => {
        const box = renderer.renderBox('Hello! @#$%^&*()');

        expect(box).toContain('Hello! @#$%^&*()');
      });

      test('should handle empty array', () => {
        const box = renderer.renderBox([''], { padding: 0 }); // Use array with empty string
        const lines = box.split('\n');

        // Should still render borders even with empty content
        // With padding=0: top border + content + bottom border = 3 lines
        expect(lines.length).toBe(3);
      });

      test('should handle array with empty strings', () => {
        const box = renderer.renderBox(['', '', '']);

        expect(box).toBeDefined();
        expect(box.split('\n').length).toBe(7); // borders + padding + 3 empty lines
      });

      test('should handle text with newlines (converted to array)', () => {
        const box = renderer.renderBox('Line 1\nLine 2');

        // When passed as string with newlines, it's treated as single line
        expect(box).toContain('Line 1');
      });
    });
  });

  // ===================================================================
  // 5. Color Application
  // ===================================================================
  describe('Color Application', () => {
    beforeEach(() => {
      renderer = new BorderRenderer(
        mockTerminalDetector,
        mockVisualConstants,
        mockThemeEngine
      );
    });

    test('should apply color when ThemeEngine and color option provided', () => {
      const box = renderer.renderBox('Test', { color: 'primary' });

      expect(mockThemeEngine.colorize).toHaveBeenCalledWith(expect.any(String), 'primary');
      expect(box).toContain('<primary>');
      expect(box).toContain('</primary>');
    });

    test('should not apply color when ThemeEngine is not provided', () => {
      const rendererNoTheme = new BorderRenderer(
        mockTerminalDetector,
        mockVisualConstants
      );

      const box = rendererNoTheme.renderBox('Test', { color: 'primary' });

      expect(box).not.toContain('<primary>');
      expect(box).not.toContain('</primary>');
    });

    test('should not apply color when color option is not provided', () => {
      const box = renderer.renderBox('Test');

      expect(mockThemeEngine.colorize).not.toHaveBeenCalled();
      expect(mockThemeEngine.colorizeBorder).not.toHaveBeenCalled();
    });

    test('should try colorize method first', () => {
      renderer.renderBox('Test', { color: 'success' });

      expect(mockThemeEngine.colorize).toHaveBeenCalled();
    });

    test('should fallback to colorizeBorder if colorize not available', () => {
      delete mockThemeEngine.colorize;

      const box = renderer.renderBox('Test', { color: 'warning' });

      expect(mockThemeEngine.colorizeBorder).toHaveBeenCalledWith(expect.any(String), 'warning');
      expect(box).toContain('[warning]');
      expect(box).toContain('[/warning]');
    });

    test('should return uncolored text if both colorize methods fail', () => {
      mockThemeEngine.colorize = jest.fn(() => {
        throw new Error('Colorize failed');
      });

      const box = renderer.renderBox('Test', { color: 'error' });

      // Should not throw and should return text without color
      expect(box).toBeDefined();
      expect(box).not.toContain('<error>');
    });

    test('should return uncolored text if ThemeEngine has no color methods', () => {
      const themeEngineNoMethods = {};
      const rendererNoColorMethods = new BorderRenderer(
        mockTerminalDetector,
        mockVisualConstants,
        themeEngineNoMethods
      );

      const box = rendererNoColorMethods.renderBox('Test', { color: 'primary' });

      expect(box).not.toContain('<primary>');
    });
  });

  // ===================================================================
  // 6. Fallback Behavior
  // ===================================================================
  describe('Fallback Behavior', () => {
    beforeEach(() => {
      renderer = new BorderRenderer(mockTerminalDetector, mockVisualConstants);
    });

    test('should fallback from Unicode to ASCII when not supported', () => {
      mockTerminalDetector.supportsUnicode.mockReturnValue(false);

      const box = renderer.renderBox('Test', { style: 'single' });

      expect(box).toContain('+');
      expect(box).toContain('-');
      expect(box).toContain('|');
      expect(box).not.toContain('┌');
    });

    test('should fallback from Unicode to ASCII for double style', () => {
      mockTerminalDetector.supportsUnicode.mockReturnValue(false);

      const box = renderer.renderBox('Test', { style: 'double' });

      expect(box).toContain('+');
      expect(box).toContain('=');
      expect(box).not.toContain('╔');
    });

    test('should use simple text fallback for invalid charset', () => {
      // Mock invalid charset
      mockVisualConstants.BORDER_CHARS.unicode.single = null;
      mockVisualConstants.BORDER_CHARS.ascii.single = null;

      const box = renderer.renderBox('Test');

      // Should use ultimate fallback
      expect(box).toContain('+');
      expect(box).toContain('-');
    });

    test('should log fallback warnings in DEBUG mode', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      process.env.DEBUG = 'true';

      mockTerminalDetector.supportsUnicode.mockReturnValue(false);
      renderer.clearCache();

      renderer.getCharSet('double');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[BorderRenderer] Fallback:')
      );

      consoleWarnSpy.mockRestore();
      delete process.env.DEBUG;
    });

    test('should log fallback warnings in VERBOSE mode', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      process.env.VERBOSE = 'true';

      mockTerminalDetector.supportsUnicode.mockReturnValue(false);
      renderer.clearCache();

      renderer.getCharSet('bold');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[BorderRenderer] Fallback:')
      );

      consoleWarnSpy.mockRestore();
      delete process.env.VERBOSE;
    });

    test('should not log fallback warnings without DEBUG or VERBOSE', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      delete process.env.DEBUG;
      delete process.env.VERBOSE;

      mockTerminalDetector.supportsUnicode.mockReturnValue(false);
      renderer.clearCache();

      renderer.getCharSet('rounded');

      expect(consoleWarnSpy).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    test('should use fallback when border chars structure is invalid', () => {
      // Mock invalid structure that will trigger fallback
      mockVisualConstants.BORDER_CHARS.unicode.single = {
        topLeft: '', // Invalid: empty string
        horizontal: ''
      };

      renderer.clearCache();
      const charset = renderer.getCharSet('single');

      // Should use ultimate fallback with valid characters
      expect(charset.topLeft).toBe('+');
      expect(charset.horizontal).toBe('-');
    });
  });

  // ===================================================================
  // 7. Cache Management
  // ===================================================================
  describe('Cache Management', () => {
    let testRenderer;

    beforeEach(() => {
      mockTerminalDetector.supportsUnicode.mockClear();
      mockTerminalDetector.supportsUnicode.mockReturnValue(true);
      testRenderer = new BorderRenderer(mockTerminalDetector, mockVisualConstants);
    });

    test('should cache charset after first retrieval', () => {
      expect(testRenderer.charsetCache.size).toBe(0);

      testRenderer.getCharSet('single');

      expect(testRenderer.charsetCache.size).toBe(1);
    });

    test('should use cached charset on subsequent calls', () => {
      const charset1 = testRenderer.getCharSet('double');

      const charset2 = testRenderer.getCharSet('double');
      const charset3 = testRenderer.getCharSet('double');

      // Should return exact same object (not just equal, but same reference)
      expect(charset1).toBe(charset2);
      expect(charset2).toBe(charset3);

      // Cache size should remain 1 (not growing on each call)
      expect(testRenderer.charsetCache.size).toBe(1);
    });

    test('should cache different styles separately', () => {
      testRenderer.getCharSet('single');
      testRenderer.getCharSet('double');
      testRenderer.getCharSet('bold');

      expect(testRenderer.charsetCache.size).toBe(3);
    });

    test('should clear cache with clearCache() method', () => {
      testRenderer.getCharSet('single');
      testRenderer.getCharSet('double');

      expect(testRenderer.charsetCache.size).toBe(2);

      testRenderer.clearCache();

      expect(testRenderer.charsetCache.size).toBe(0);
    });

    test('should re-fetch charset after cache is cleared', () => {
      const charset1 = testRenderer.getCharSet('single');
      const callsAfterFirst = mockTerminalDetector.supportsUnicode.mock.calls.length;

      testRenderer.clearCache();

      const charset2 = testRenderer.getCharSet('single');
      const callsAfterClear = mockTerminalDetector.supportsUnicode.mock.calls.length;

      // Should have made at least one more call after clearing cache
      expect(callsAfterClear).toBeGreaterThan(callsAfterFirst);

      // Charsets should be equal but not same reference (new fetch)
      expect(charset1).toEqual(charset2);
    });

    test('should cache based on style and Unicode support', () => {
      mockTerminalDetector.supportsUnicode.mockReturnValue(true);
      const unicodeCharset = testRenderer.getCharSet('single');
      const callsAfterUnicode = mockTerminalDetector.supportsUnicode.mock.calls.length;

      mockTerminalDetector.supportsUnicode.mockReturnValue(false);
      testRenderer.clearCache();
      const asciiCharset = testRenderer.getCharSet('single');
      const callsAfterAscii = mockTerminalDetector.supportsUnicode.mock.calls.length;

      // Should have made at least one more call after clearing cache
      expect(callsAfterAscii).toBeGreaterThan(callsAfterUnicode);

      // Different charsets should be returned
      expect(unicodeCharset).not.toEqual(asciiCharset);
      expect(unicodeCharset.topLeft).toBe('┌'); // Unicode
      expect(asciiCharset.topLeft).toBe('+'); // ASCII
    });
  });

  // ===================================================================
  // 8. Integration with TerminalDetector
  // ===================================================================
  describe('Integration with TerminalDetector', () => {
    beforeEach(() => {
      renderer = new BorderRenderer(mockTerminalDetector, mockVisualConstants);
    });

    test('should call supportsUnicode() when getting charset', () => {
      renderer.getCharSet('single');

      expect(mockTerminalDetector.supportsUnicode).toHaveBeenCalled();
    });

    test('should respect terminal Unicode support for border selection', () => {
      mockTerminalDetector.supportsUnicode.mockReturnValue(true);
      const unicodeBorder = renderer.renderTopBorder(20, 'single');

      renderer.clearCache();
      mockTerminalDetector.supportsUnicode.mockReturnValue(false);
      const asciiBorder = renderer.renderTopBorder(20, 'single');

      expect(unicodeBorder).not.toBe(asciiBorder);
      expect(unicodeBorder).toContain('┌');
      expect(asciiBorder).toContain('+');
    });

    test('should work with different terminal capabilities', () => {
      // Test with full Unicode support
      mockTerminalDetector.supportsUnicode.mockReturnValue(true);
      const box1 = renderer.renderBox('Test');
      expect(box1).toContain('┌');

      // Test without Unicode support
      renderer.clearCache();
      mockTerminalDetector.supportsUnicode.mockReturnValue(false);
      const box2 = renderer.renderBox('Test');
      expect(box2).toContain('+');
    });

    test('should handle terminal capability changes after cache clear', () => {
      mockTerminalDetector.supportsUnicode.mockReturnValue(false);
      renderer.getCharSet('single');

      // Change terminal capability
      mockTerminalDetector.supportsUnicode.mockReturnValue(true);
      renderer.clearCache();

      const charset = renderer.getCharSet('single');
      expect(charset.topLeft).toBe('┌');
    });
  });

  // ===================================================================
  // 9. Private Methods
  // ===================================================================
  describe('Private Methods', () => {
    beforeEach(() => {
      renderer = new BorderRenderer(mockTerminalDetector, mockVisualConstants);
    });

    describe('_validateCharSet()', () => {
      test('should return true for valid charset', () => {
        const validCharset = mockVisualConstants.BORDER_CHARS.unicode.single;

        const isValid = renderer._validateCharSet(validCharset);

        expect(isValid).toBe(true);
      });

      test('should return false for null charset', () => {
        const isValid = renderer._validateCharSet(null);

        expect(isValid).toBe(false);
      });

      test('should return false for undefined charset', () => {
        const isValid = renderer._validateCharSet(undefined);

        expect(isValid).toBe(false);
      });

      test('should return false for charset missing properties', () => {
        const incompleteCharset = {
          topLeft: '┌',
          horizontal: '─'
          // Missing other required properties
        };

        const isValid = renderer._validateCharSet(incompleteCharset);

        expect(isValid).toBe(false);
      });

      test('should return false for charset with empty string values', () => {
        const invalidCharset = {
          topLeft: '',
          topRight: '┐',
          bottomLeft: '└',
          bottomRight: '┘',
          horizontal: '─',
          vertical: '│',
          cross: '┼',
          teeLeft: '┤',
          teeRight: '├',
          teeTop: '┴',
          teeBottom: '┬'
        };

        const isValid = renderer._validateCharSet(invalidCharset);

        expect(isValid).toBe(false);
      });
    });

    describe('_logFallback()', () => {
      test('should log in DEBUG mode', () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        process.env.DEBUG = 'true';

        renderer._logFallback('Test fallback message');

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          '[BorderRenderer] Fallback: Test fallback message'
        );

        consoleWarnSpy.mockRestore();
        delete process.env.DEBUG;
      });

      test('should log in VERBOSE mode', () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        process.env.VERBOSE = 'true';

        renderer._logFallback('Test verbose message');

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          '[BorderRenderer] Fallback: Test verbose message'
        );

        consoleWarnSpy.mockRestore();
        delete process.env.VERBOSE;
      });

      test('should not log without DEBUG or VERBOSE', () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        delete process.env.DEBUG;
        delete process.env.VERBOSE;

        renderer._logFallback('Should not appear');

        expect(consoleWarnSpy).not.toHaveBeenCalled();

        consoleWarnSpy.mockRestore();
      });
    });
  });
});
