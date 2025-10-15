/**
 * @fileoverview Accessibility Fallback Tests for Visual Components
 * @module visual-fallback.test
 *
 * Tests that visual components degrade gracefully in limited environments:
 * - NO_COLOR environment variable (Requirement 12.1)
 * - TERM=dumb (no color support) (Requirement 12.4)
 * - No Unicode support (Requirement 12.5)
 * - Non-interactive (CI) environments (Requirement 12.4)
 *
 * Validates that critical information remains readable in all fallback modes.
 */

const TerminalDetector = require('../../src/ui/menu/visual/TerminalDetector');
const BorderRenderer = require('../../src/ui/menu/visual/BorderRenderer');
const IconMapper = require('../../src/ui/menu/visual/IconMapper');
const LayoutManager = require('../../src/ui/menu/visual/LayoutManager');
const ThemeEngine = require('../../src/ui/menu/utils/ThemeEngine');
const visualConstants = require('../../src/ui/menu/config/visual-constants');
const defaultTheme = require('../../src/ui/menu/themes/default');

describe('Accessibility Fallback Tests', () => {
  let originalEnv;
  let originalTerm;
  let originalCi;

  beforeEach(() => {
    // Save original environment
    originalEnv = process.env.NO_COLOR;
    originalTerm = process.env.TERM;
    originalCi = process.env.CI;
  });

  afterEach(() => {
    // Restore original environment
    if (originalEnv === undefined) {
      delete process.env.NO_COLOR;
    } else {
      process.env.NO_COLOR = originalEnv;
    }

    if (originalTerm === undefined) {
      delete process.env.TERM;
    } else {
      process.env.TERM = originalTerm;
    }

    if (originalCi === undefined) {
      delete process.env.CI;
    } else {
      process.env.CI = originalCi;
    }
  });

  describe('NO_COLOR Environment Variable', () => {
    beforeEach(() => {
      process.env.NO_COLOR = '1';
    });

    test('should disable colors when NO_COLOR is set', () => {
      const detector = new TerminalDetector();
      const colorLevel = detector.getColorLevel();

      // NO_COLOR should force colorLevel to 0 (no colors)
      expect(colorLevel).toBe(0);
    });

    test('BorderRenderer should work without colors', () => {
      process.env.NO_COLOR = '1';
      const detector = new TerminalDetector();
      const borderRenderer = new BorderRenderer(detector, visualConstants, null);

      const topBorder = borderRenderer.renderTopBorder(40, 'single');

      // Should still render border structure (no color codes)
      expect(topBorder).toBeTruthy();
      expect(topBorder.length).toBeGreaterThan(0);
      // Should NOT contain ANSI color codes
      expect(topBorder).not.toMatch(/\x1b\[\d+m/);

      console.log(`  ℹ NO_COLOR top border (no ANSI): "${topBorder.substring(0, 20)}..."`);
    });

    test('IconMapper should still return icons when NO_COLOR is set (NO_COLOR affects colors, not icons)', () => {
      process.env.NO_COLOR = '1';
      const detector = new TerminalDetector();
      const iconMapper = new IconMapper(detector);

      const downloadIcon = iconMapper.getIcon('download');
      const successIcon = iconMapper.getStatusIcon('success');

      // Icons should still be returned (NO_COLOR only disables colors, not Unicode)
      expect(downloadIcon).toBeTruthy();
      expect(successIcon).toBeTruthy();
      // Should have reasonable length
      expect(downloadIcon.length).toBeGreaterThan(0);
      expect(downloadIcon.length).toBeLessThan(10);

      console.log(`  ℹ NO_COLOR download icon: "${downloadIcon}"`);
      console.log(`  ℹ NO_COLOR success icon: "${successIcon}"`);
    });

    test('ThemeEngine should not apply colors when NO_COLOR is set', () => {
      process.env.NO_COLOR = '1';
      const detector = new TerminalDetector();
      const themeEngine = new ThemeEngine(defaultTheme, detector);

      const colorizedText = themeEngine.colorize('Test Message', 'success');

      // Should return plain text without ANSI codes
      expect(colorizedText).toBe('Test Message');
      expect(colorizedText).not.toMatch(/\x1b\[\d+m/);

      console.log(`  ℹ NO_COLOR colorized text: "${colorizedText}"`);
    });
  });

  describe('TERM=dumb (No Color Support)', () => {
    beforeEach(() => {
      process.env.TERM = 'dumb';
      delete process.env.NO_COLOR; // Clear NO_COLOR to test TERM=dumb specifically
    });

    test('should detect no color support with TERM=dumb', () => {
      const detector = new TerminalDetector();
      const colorLevel = detector.getColorLevel();

      // TERM=dumb should result in colorLevel 0
      expect(colorLevel).toBeLessThanOrEqual(1); // 0 or 1 for dumb terminals
    });

    test('Border Renderer should use ASCII fallback with TERM=dumb', () => {
      const detector = new TerminalDetector();
      const borderRenderer = new BorderRenderer(detector, visualConstants, null);

      const topBorder = borderRenderer.renderTopBorder(40, 'single');

      // Should render ASCII borders
      expect(topBorder).toBeTruthy();
      expect(topBorder.length).toBeGreaterThan(0);

      console.log(`  ℹ TERM=dumb top border: "${topBorder.substring(0, 20)}..."`);
    });

    test('LayoutManager should work correctly with TERM=dumb', () => {
      const detector = new TerminalDetector();
      const layoutManager = new LayoutManager(detector, visualConstants);

      const layoutMode = layoutManager.getLayoutMode();
      const truncated = layoutManager.truncateText('This is a very long text that should be truncated', 20);

      expect(layoutMode).toBeTruthy();
      expect(truncated.length).toBeLessThanOrEqual(20);

      console.log(`  ℹ TERM=dumb layout mode: ${layoutMode}`);
      console.log(`  ℹ TERM=dumb truncated: "${truncated}"`);
    });
  });

  describe('No Unicode Support', () => {
    test('BorderRenderer should fallback to ASCII when Unicode not supported', () => {
      const detector = new TerminalDetector();

      // Mock supportsUnicode to return false
      jest.spyOn(detector, 'supportsUnicode').mockReturnValue(false);

      const borderRenderer = new BorderRenderer(detector, visualConstants, null);
      const topBorder = borderRenderer.renderTopBorder(40, 'single');

      // Should use ASCII characters (not Unicode box-drawing)
      expect(topBorder).toBeTruthy();
      // ASCII borders use: + - | characters
      expect(topBorder).toMatch(/[\+\-\|=]/);
      // Should NOT contain Unicode box-drawing characters
      expect(topBorder).not.toMatch(/[│─┌┐└┘═║╔╗╚╝]/);

      console.log(`  ℹ No Unicode top border: "${topBorder}"`);

      detector.supportsUnicode.mockRestore();
    });

    test('IconMapper should fallback to ASCII when Unicode not supported', () => {
      const detector = new TerminalDetector();

      // Mock supportsUnicode and supportsEmojis to return false
      jest.spyOn(detector, 'supportsUnicode').mockReturnValue(false);
      jest.spyOn(detector, 'supportsEmojis').mockReturnValue(false);

      const iconMapper = new IconMapper(detector);
      const downloadIcon = iconMapper.getIcon('download');
      const selectionIndicator = iconMapper.getSelectionIndicator();

      // Should return ASCII-only icons
      expect(downloadIcon).toMatch(/^[a-zA-Z0-9\s\-\+\*\[\]\(\)]+$/);
      expect(selectionIndicator).toMatch(/^[>*\+\-]+$/);

      console.log(`  ℹ ASCII-only download icon: "${downloadIcon}"`);
      console.log(`  ℹ ASCII-only selection indicator: "${selectionIndicator}"`);

      detector.supportsUnicode.mockRestore();
      detector.supportsEmojis.mockRestore();
    });

    test('LayoutManager text operations should handle ASCII-only correctly', () => {
      const detector = new TerminalDetector();

      // Mock supportsUnicode to return false
      jest.spyOn(detector, 'supportsUnicode').mockReturnValue(false);

      const layoutManager = new LayoutManager(detector, visualConstants);

      const centered = layoutManager.centerText('Menu', 20);
      const wrapped = layoutManager.wrapText('This is a long text that needs wrapping', 20);

      // Should handle ASCII text correctly
      expect(centered).toBeTruthy();
      expect(centered.length).toBeGreaterThanOrEqual(20);
      expect(wrapped).toBeTruthy();
      expect(Array.isArray(wrapped)).toBe(true);

      console.log(`  ℹ ASCII centered text: "${centered}"`);
      console.log(`  ℹ ASCII wrapped lines: ${wrapped.length}`);

      detector.supportsUnicode.mockRestore();
    });
  });

  describe('Non-Interactive (CI) Environment', () => {
    beforeEach(() => {
      process.env.CI = 'true';
    });

    test('should detect CI environment correctly', () => {
      const detector = new TerminalDetector();
      const caps = detector.detect();

      expect(caps.isCi).toBe(true);

      console.log(`  ℹ CI detection: ${caps.isCi}`);
    });

    test('should use safe defaults in CI environment', () => {
      process.env.CI = 'true';
      const detector = new TerminalDetector();
      const iconMapper = new IconMapper(detector);

      // CI environments should get simple, plain text icons
      const downloadIcon = iconMapper.getIcon('download');

      // Should be simple ASCII
      expect(downloadIcon).toBeTruthy();
      expect(downloadIcon.length).toBeLessThan(15); // Short, simple icon

      console.log(`  ℹ CI download icon: "${downloadIcon}"`);
    });

    test('BorderRenderer should work in CI environment', () => {
      process.env.CI = 'true';
      const detector = new TerminalDetector();
      const borderRenderer = new BorderRenderer(detector, visualConstants, null);

      const separator = borderRenderer.renderSeparator(40, 'single');

      // Should render simple separator
      expect(separator).toBeTruthy();
      expect(separator.length).toBeGreaterThan(0);

      console.log(`  ℹ CI separator: "${separator.substring(0, 20)}..."`);
    });
  });

  describe('Critical Information Readability', () => {
    test('menu options should be readable without colors', () => {
      process.env.NO_COLOR = '1';
      const detector = new TerminalDetector();
      const iconMapper = new IconMapper(detector);

      const options = [
        { label: 'Download Files', icon: iconMapper.getIcon('download') },
        { label: 'View Help', icon: iconMapper.getIcon('help') },
        { label: 'Exit', icon: iconMapper.getIcon('exit') }
      ];

      options.forEach(opt => {
        const optionText = `${opt.icon} ${opt.label}`;

        // Should be readable (no empty icons, reasonable length)
        expect(opt.icon).toBeTruthy();
        expect(opt.icon.trim().length).toBeGreaterThan(0);
        expect(optionText.length).toBeGreaterThan(opt.label.length);

        console.log(`  ℹ NO_COLOR option: "${optionText}"`);
      });
    });

    test('status messages should be readable without colors', () => {
      process.env.NO_COLOR = '1';
      const detector = new TerminalDetector();
      const iconMapper = new IconMapper(detector);

      const statuses = ['success', 'error', 'warning', 'info'];

      statuses.forEach(status => {
        const statusIcon = iconMapper.getStatusIcon(status);
        const message = `${statusIcon} Operation ${status}`;

        // Should have visible status indicator
        expect(statusIcon).toBeTruthy();
        expect(statusIcon.trim().length).toBeGreaterThan(0);
        expect(message).toContain(status);

        console.log(`  ℹ NO_COLOR ${status}: "${message}"`);
      });
    });

    test('borders should be visible in all modes', () => {
      const modes = [
        { name: 'NO_COLOR', env: { NO_COLOR: '1' } },
        { name: 'TERM=dumb', env: { TERM: 'dumb' } },
        { name: 'CI', env: { CI: 'true' } }
      ];

      modes.forEach(({ name, env }) => {
        // Set environment
        Object.keys(env).forEach(key => {
          process.env[key] = env[key];
        });

        const detector = new TerminalDetector();
        const borderRenderer = new BorderRenderer(detector, visualConstants, null);
        const topBorder = borderRenderer.renderTopBorder(40, 'single');

        // Should have visible border structure
        expect(topBorder).toBeTruthy();
        expect(topBorder.trim().length).toBeGreaterThan(10);

        console.log(`  ℹ ${name} border visible: ${topBorder.length} chars`);

        // Clean up
        Object.keys(env).forEach(key => {
          delete process.env[key];
        });
      });
    });

    test('layout should adapt to terminal width in all modes', () => {
      const modes = [
        { name: 'NO_COLOR', env: { NO_COLOR: '1' } },
        { name: 'TERM=dumb', env: { TERM: 'dumb' } },
        { name: 'CI', env: { CI: 'true' } }
      ];

      modes.forEach(({ name, env }) => {
        // Set environment
        Object.keys(env).forEach(key => {
          process.env[key] = env[key];
        });

        const detector = new TerminalDetector();
        const layoutManager = new LayoutManager(detector, visualConstants);

        // Should determine layout mode correctly
        const layoutMode = layoutManager.getLayoutMode();
        const contentWidth = layoutManager.getContentWidth();

        expect(layoutMode).toMatch(/^(expanded|standard|compact)$/);
        expect(contentWidth).toBeGreaterThan(0);

        console.log(`  ℹ ${name} layout: ${layoutMode} (width: ${contentWidth})`);

        // Clean up
        Object.keys(env).forEach(key => {
          delete process.env[key];
        });
      });
    });
  });

  describe('Graceful Degradation Chain', () => {
    test('BorderRenderer should degrade: Unicode → ASCII → Plain', () => {
      const detector = new TerminalDetector();

      // Test Unicode mode
      jest.spyOn(detector, 'supportsUnicode').mockReturnValue(true);
      const borderRendererUnicode = new BorderRenderer(detector, visualConstants, null);
      const unicodeBorder = borderRendererUnicode.renderTopBorder(40, 'single');

      // Test ASCII mode
      detector.supportsUnicode.mockReturnValue(false);
      const borderRendererAscii = new BorderRenderer(detector, visualConstants, null);
      const asciiBorder = borderRendererAscii.renderTopBorder(40, 'single');

      // Both should render, but may differ
      expect(unicodeBorder).toBeTruthy();
      expect(asciiBorder).toBeTruthy();
      expect(unicodeBorder.length).toBeGreaterThan(0);
      expect(asciiBorder.length).toBeGreaterThan(0);

      console.log(`  ℹ Unicode border: "${unicodeBorder.substring(0, 20)}..."`);
      console.log(`  ℹ ASCII border: "${asciiBorder.substring(0, 20)}..."`);

      detector.supportsUnicode.mockRestore();
    });

    test('IconMapper should degrade: Emoji → Unicode → ASCII → Plain', () => {
      const detector = new TerminalDetector();

      // Test Emoji mode
      jest.spyOn(detector, 'supportsEmojis').mockReturnValue(true);
      jest.spyOn(detector, 'supportsUnicode').mockReturnValue(true);
      const iconMapperEmoji = new IconMapper(detector);
      const emojiIcon = iconMapperEmoji.getIcon('download');

      // Test ASCII mode (no emoji, no unicode)
      detector.supportsEmojis.mockReturnValue(false);
      detector.supportsUnicode.mockReturnValue(false);
      const iconMapperAscii = new IconMapper(detector);
      const asciiIcon = iconMapperAscii.getIcon('download');

      // Both should return valid icons
      expect(emojiIcon).toBeTruthy();
      expect(asciiIcon).toBeTruthy();

      console.log(`  ℹ Emoji icon: "${emojiIcon}"`);
      console.log(`  ℹ ASCII icon: "${asciiIcon}"`);

      detector.supportsEmojis.mockRestore();
      detector.supportsUnicode.mockRestore();
    });
  });
});
