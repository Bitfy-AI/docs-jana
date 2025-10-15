/**
 * @fileoverview WCAG 2.1 AA Contrast Accessibility Tests for Visual Components
 * @module visual-contrast.test
 *
 * Tests that all theme colors meet WCAG 2.1 AA accessibility standards:
 * - Ratio ≥ 4.5:1 for normal text (Requirement 12.3)
 * - Ratio ≥ 3:1 for large text (18pt+)
 * - Border colors have sufficient contrast against backgrounds
 *
 * Reference: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
 */

const defaultTheme = require('../../src/ui/menu/themes/default');
const darkTheme = require('../../src/ui/menu/themes/dark');
const lightTheme = require('../../src/ui/menu/themes/light');
const highContrastTheme = require('../../src/ui/menu/themes/high-contrast');

/**
 * Calculate relative luminance of a color
 * Formula from WCAG 2.1: https://www.w3.org/WAI/GL/wiki/Relative_luminance
 *
 * @param {string} hexColor - Hex color string (e.g., '#FFFFFF')
 * @returns {number} Relative luminance (0-1)
 */
function getRelativeLuminance(hexColor) {
  // Remove '#' prefix
  const hex = hexColor.replace('#', '');

  // Parse RGB components
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  // Apply gamma correction
  const rs = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const gs = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const bs = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  // Calculate relative luminance
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 * Formula from WCAG 2.1: (L1 + 0.05) / (L2 + 0.05)
 * where L1 is lighter color and L2 is darker color
 *
 * @param {string} color1 - First hex color
 * @param {string} color2 - Second hex color
 * @returns {number} Contrast ratio (1-21)
 */
function getContrastRatio(color1, color2) {
  const lum1 = getRelativeLuminance(color1);
  const lum2 = getRelativeLuminance(color2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Test suite for a specific theme
 * @param {string} themeName - Name of the theme
 * @param {Object} theme - Theme object
 */
function testThemeContrast(themeName, theme) {
  describe(`${themeName} Theme - WCAG 2.1 AA Compliance`, () => {
    // Light theme is designed for light backgrounds (#FFFFFF), others for dark backgrounds (#000000)
    const background = themeName === 'Light' ? '#FFFFFF' : '#000000';
    const selectedBackground = theme.backgrounds?.selected || background;

    describe('Text Colors vs Primary Background', () => {
      test('primary text should have ratio ≥ 4.5:1', () => {
        const ratio = getContrastRatio(theme.colors.primary, background);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
        console.log(`  ℹ ${themeName} primary text: ${ratio.toFixed(2)}:1`);
      });

      test('success text should have ratio ≥ 4.5:1', () => {
        const ratio = getContrastRatio(theme.colors.success, background);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
        console.log(`  ℹ ${themeName} success text: ${ratio.toFixed(2)}:1`);
      });

      test('error text should have ratio ≥ 4.5:1', () => {
        const ratio = getContrastRatio(theme.colors.error, background);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
        console.log(`  ℹ ${themeName} error text: ${ratio.toFixed(2)}:1`);
      });

      test('warning text should have ratio ≥ 4.5:1', () => {
        const ratio = getContrastRatio(theme.colors.warning, background);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
        console.log(`  ℹ ${themeName} warning text: ${ratio.toFixed(2)}:1`);
      });

      test('info text should have ratio ≥ 4.5:1', () => {
        const ratio = getContrastRatio(theme.colors.info, background);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
        console.log(`  ℹ ${themeName} info text: ${ratio.toFixed(2)}:1`);
      });

      test('highlight text should have ratio ≥ 4.5:1', () => {
        const ratio = getContrastRatio(theme.colors.highlight, background);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
        console.log(`  ℹ ${themeName} highlight text: ${ratio.toFixed(2)}:1`);
      });

      test('muted text should have ratio ≥ 4.5:1', () => {
        const ratio = getContrastRatio(theme.colors.muted, background);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
        console.log(`  ℹ ${themeName} muted text: ${ratio.toFixed(2)}:1`);
      });

      if (theme.colors.dimText) {
        test('dimText should have ratio ≥ 4.5:1', () => {
          const ratio = getContrastRatio(theme.colors.dimText, background);
          expect(ratio).toBeGreaterThanOrEqual(4.5);
          console.log(`  ℹ ${themeName} dimText: ${ratio.toFixed(2)}:1`);
        });
      }

      if (theme.colors.accent1) {
        test('accent1 should have ratio ≥ 4.5:1', () => {
          const ratio = getContrastRatio(theme.colors.accent1, background);
          expect(ratio).toBeGreaterThanOrEqual(4.5);
          console.log(`  ℹ ${themeName} accent1: ${ratio.toFixed(2)}:1`);
        });
      }

      if (theme.colors.accent2) {
        test('accent2 should have ratio ≥ 4.5:1', () => {
          const ratio = getContrastRatio(theme.colors.accent2, background);
          expect(ratio).toBeGreaterThanOrEqual(4.5);
          console.log(`  ℹ ${themeName} accent2: ${ratio.toFixed(2)}:1`);
        });
      }
    });

    describe('Text Colors vs Selected Background', () => {
      if (theme.colors.selectedText && selectedBackground !== background) {
        test('selectedText should have ratio ≥ 4.5:1 against selected background', () => {
          const ratio = getContrastRatio(theme.colors.selectedText, selectedBackground);
          expect(ratio).toBeGreaterThanOrEqual(4.5);
          console.log(`  ℹ ${themeName} selectedText vs selected bg: ${ratio.toFixed(2)}:1`);
        });
      }
    });

    describe('Border Colors vs Backgrounds', () => {
      if (theme.borders) {
        test('primary border should have ratio ≥ 3:1 (large text standard)', () => {
          const ratio = getContrastRatio(theme.borders.primary, background);
          expect(ratio).toBeGreaterThanOrEqual(3.0);
          console.log(`  ℹ ${themeName} primary border: ${ratio.toFixed(2)}:1`);
        });

        test('secondary border should have ratio ≥ 3:1', () => {
          const ratio = getContrastRatio(theme.borders.secondary, background);
          expect(ratio).toBeGreaterThanOrEqual(3.0);
          console.log(`  ℹ ${themeName} secondary border: ${ratio.toFixed(2)}:1`);
        });

        test('accent border should have ratio ≥ 3:1', () => {
          const ratio = getContrastRatio(theme.borders.accent, background);
          expect(ratio).toBeGreaterThanOrEqual(3.0);
          console.log(`  ℹ ${themeName} accent border: ${ratio.toFixed(2)}:1`);
        });

        test('muted border should have ratio ≥ 3:1', () => {
          const ratio = getContrastRatio(theme.borders.muted, background);
          expect(ratio).toBeGreaterThanOrEqual(3.0);
          console.log(`  ℹ ${themeName} muted border: ${ratio.toFixed(2)}:1`);
        });
      }
    });

    describe('Destructive Actions', () => {
      test('destructive text should have ratio ≥ 4.5:1', () => {
        const ratio = getContrastRatio(theme.colors.destructive, background);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
        console.log(`  ℹ ${themeName} destructive text: ${ratio.toFixed(2)}:1`);
      });
    });
  });
}

// Run tests for all themes
describe('WCAG 2.1 AA Contrast Validation', () => {
  testThemeContrast('Default', defaultTheme);
  testThemeContrast('Dark', darkTheme);
  testThemeContrast('Light', lightTheme);
  testThemeContrast('High-Contrast', highContrastTheme);

  describe('Cross-Theme Validation', () => {
    test('high-contrast theme should have the highest average contrast ratio', () => {
      const themes = [
        { name: 'Default', theme: defaultTheme },
        { name: 'Dark', theme: darkTheme },
        { name: 'Light', theme: lightTheme },
        { name: 'High-Contrast', theme: highContrastTheme }
      ];

      const averageRatios = themes.map(({ name, theme }) => {
        // Light theme uses white background, others use black
        const bg = name === 'Light' ? '#FFFFFF' : '#000000';
        const ratios = [
          getContrastRatio(theme.colors.primary, bg),
          getContrastRatio(theme.colors.success, bg),
          getContrastRatio(theme.colors.error, bg),
          getContrastRatio(theme.colors.warning, bg),
          getContrastRatio(theme.colors.info, bg)
        ];

        const avg = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
        return { name, avg };
      });

      // Find theme with highest average
      const highest = averageRatios.reduce((max, curr) =>
        curr.avg > max.avg ? curr : max
      );

      console.log('\n  ℹ Average contrast ratios by theme:');
      averageRatios.forEach(({ name, avg }) => {
        console.log(`    - ${name}: ${avg.toFixed(2)}:1`);
      });

      expect(highest.name).toBe('High-Contrast');
    });

    test('all themes should have at least 80% of colors meeting WCAG AA', () => {
      const themes = [
        { name: 'Default', theme: defaultTheme },
        { name: 'Dark', theme: darkTheme },
        { name: 'Light', theme: lightTheme },
        { name: 'High-Contrast', theme: highContrastTheme }
      ];

      themes.forEach(({ name, theme }) => {
        // Light theme uses white background, others use black
        const bg = name === 'Light' ? '#FFFFFF' : '#000000';
        const colorKeys = ['primary', 'success', 'error', 'warning', 'info', 'highlight', 'muted', 'destructive'];

        let totalColors = 0;
        let compliantColors = 0;

        colorKeys.forEach(key => {
          if (theme.colors[key]) {
            totalColors++;
            const ratio = getContrastRatio(theme.colors[key], bg);
            if (ratio >= 4.5) {
              compliantColors++;
            }
          }
        });

        const complianceRate = (compliantColors / totalColors) * 100;
        console.log(`  ℹ ${name} theme: ${compliantColors}/${totalColors} colors compliant (${complianceRate.toFixed(1)}%)`);

        expect(complianceRate).toBeGreaterThanOrEqual(80);
      });
    });
  });

  describe('Utility Functions', () => {
    test('getRelativeLuminance should return 1.0 for white', () => {
      const lum = getRelativeLuminance('#FFFFFF');
      expect(lum).toBeCloseTo(1.0, 2);
    });

    test('getRelativeLuminance should return 0.0 for black', () => {
      const lum = getRelativeLuminance('#000000');
      expect(lum).toBeCloseTo(0.0, 2);
    });

    test('getContrastRatio should return 21:1 for white vs black', () => {
      const ratio = getContrastRatio('#FFFFFF', '#000000');
      expect(ratio).toBeCloseTo(21, 0);
    });

    test('getContrastRatio should return 1:1 for identical colors', () => {
      const ratio = getContrastRatio('#808080', '#808080');
      expect(ratio).toBeCloseTo(1.0, 1);
    });

    test('getContrastRatio should be symmetric', () => {
      const ratio1 = getContrastRatio('#FF0000', '#00FF00');
      const ratio2 = getContrastRatio('#00FF00', '#FF0000');
      expect(ratio1).toBeCloseTo(ratio2, 2);
    });
  });
});
