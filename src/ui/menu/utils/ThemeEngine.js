/**
 * ThemeEngine - Manages color themes and accessibility validation
 *
 * Responsibilities:
 * - Load and manage color themes
 * - Apply semantic colors using chalk
 * - Validate WCAG 2.1 AA contrast ratios
 * - Detect terminal color support
 * - Provide fallback for limited terminals
 */

/**
 * Converts hex color to RGB components
 * @param {string} hex - Hex color code (e.g., "#3b82f6")
 * @returns {{r: number, g: number, b: number}} RGB components
 */
function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  return {
    r: parseInt(normalized.substring(0, 2), 16),
    g: parseInt(normalized.substring(2, 4), 16),
    b: parseInt(normalized.substring(4, 6), 16)
  };
}

/**
 * Calculates relative luminance of a color (WCAG formula)
 * @param {{r: number, g: number, b: number}} rgb - RGB components
 * @returns {number} Relative luminance (0-1)
 */
function getRelativeLuminance(rgb) {
  const { r, g, b } = rgb;
  const [rs, gs, bs] = [r, g, b].map(val => {
    const sRGB = val / 255;
    return sRGB <= 0.03928
      ? sRGB / 12.92
      : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculates WCAG contrast ratio between two colors
 * @param {string} foreground - Foreground hex color
 * @param {string} background - Background hex color
 * @returns {number} Contrast ratio (1-21)
 */
function calculateContrastRatio(foreground, background) {
  const fgRgb = hexToRgb(foreground);
  const bgRgb = hexToRgb(background);

  const fgLuminance = getRelativeLuminance(fgRgb);
  const bgLuminance = getRelativeLuminance(bgRgb);

  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

class ThemeEngine {
  constructor() {
    this.chalk = null; // Will be loaded asynchronously
    this.currentTheme = null;
    this.themes = {};
    this.colorSupport = 0;
    this.initialized = false;
  }

  /**
   * Initializes ThemeEngine with chalk and themes
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Load chalk (ESM module) - use dynamic import workaround
      const chalkModule = await this._loadChalk();
      this.chalk = chalkModule;

      // Detect color support
      this.colorSupport = this.detectColorSupport();

      // Load all themes (CommonJS)
      this.themes = require('../themes/index.js');

      // Load default theme (skip init check to avoid recursion)
      await this.loadTheme('default', true);

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize ThemeEngine:', error.message);
      // Set to fallback mode
      this.colorSupport = 0;
      this.currentTheme = this._createFallbackTheme();
      this.initialized = true; // Mark as initialized even in fallback mode
    }
  }

  /**
   * Loads chalk module (handles ESM/CommonJS compatibility)
   * @returns {Promise<any>} Chalk instance
   * @private
   */
  async _loadChalk() {
    try {
      // Try to load chalk as ESM
      const chalkModule = await import('chalk');
      return chalkModule.default;
    } catch (error) {
      // If dynamic import fails, return null for fallback mode
      console.warn('Chalk not available, using fallback mode');
      return null;
    }
  }

  /**
   * Detects terminal color support level
   * @returns {number} Color level (0=none, 1=basic, 2=256, 3=truecolor)
   */
  detectColorSupport() {
    if (!this.chalk) return 0;

    const level = this.chalk.level;
    // chalk.level: 0=none, 1=basic (16), 2=256 colors, 3=truecolor (16m)
    return level;
  }

  /**
   * Loads a theme by name
   * @param {string} themeName - Name of theme ('default', 'dark', 'light', 'high-contrast')
   * @param {boolean} skipInitCheck - Skip initialization check (internal use)
   * @returns {Promise<void>}
   */
  async loadTheme(themeName, skipInitCheck = false) {
    if (!skipInitCheck && !this.initialized) {
      await this.initialize();
    }

    const theme = this.themes[themeName];
    if (!theme) {
      throw new Error(`Theme '${themeName}' not found. Available themes: ${Object.keys(this.themes).join(', ')}`);
    }

    // Validate contrast ratios for all color combinations
    const validationResults = this._validateThemeContrast(theme);
    if (!validationResults.valid) {
      console.warn(`Theme '${themeName}' has contrast issues:`, validationResults.issues);
    }

    this.currentTheme = theme;
  }

  /**
   * Validates contrast ratios for a theme
   * @param {object} theme - Theme object
   * @returns {{valid: boolean, issues: string[]}}
   * @private
   */
  _validateThemeContrast(theme) {
    const issues = [];
    const minRatio = theme.contrastRatios?.minRatio || 4.5;
    const largeTextRatio = theme.contrastRatios?.largeTextRatio || 3.0;

    // Validate selectedText against selected background (most critical for accessibility)
    if (theme.colors.selectedText && theme.backgrounds.selected !== 'transparent') {
      const ratio = this.validateContrast(theme.colors.selectedText, theme.backgrounds.selected);
      if (ratio < minRatio) {
        issues.push(
          `selectedText on selected background: ${ratio.toFixed(2)}:1 (minimum: ${minRatio}:1)`
        );
      }
    }

    // Note: dimText, accent1, accent2, and border colors are typically used against
    // the terminal background (not the selected background), so we don't validate
    // them here. They should be validated at runtime against the actual terminal background.

    // Note: Other color combinations are validated at runtime when they're actually used
    // against the terminal's background, which we cannot know in advance

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Validates contrast ratio between two colors
   * @param {string} foreground - Foreground hex color
   * @param {string} background - Background hex color
   * @returns {number} Contrast ratio
   */
  validateContrast(foreground, background) {
    return calculateContrastRatio(foreground, background);
  }

  /**
   * Gets a semantic color from the current theme
   * @param {string} type - Color type ('success', 'error', 'warning', 'info', 'selected', 'normal', 'dim')
   * @returns {string} Hex color code
   */
  getSemanticColor(type) {
    if (!this.currentTheme) {
      return '#ffffff'; // fallback
    }

    // Map semantic types to theme colors
    const colorMap = {
      success: this.currentTheme.colors.success,
      error: this.currentTheme.colors.error,
      warning: this.currentTheme.colors.warning,
      info: this.currentTheme.colors.info,
      selected: this.currentTheme.backgrounds.selected,
      normal: this.currentTheme.colors.primary,
      dim: this.currentTheme.colors.muted
    };

    return colorMap[type] || this.currentTheme.colors.primary;
  }

  /**
   * Applies color to text using chalk
   * @param {string} text - Text to colorize
   * @param {string} type - Semantic color type
   * @returns {string} Colorized text
   */
  colorize(text, type) {
    if (!this.chalk || this.colorSupport === 0) {
      return text; // No color support, return plain text
    }

    const color = this.getSemanticColor(type);

    try {
      // Use chalk hex for full color support
      if (this.colorSupport >= 2) {
        return this.chalk.hex(color)(text);
      } else {
        // Fallback to basic colors for limited terminals
        return this._applyBasicColor(text, type);
      }
    } catch (error) {
      console.warn('Failed to colorize text:', error.message);
      return text;
    }
  }

  /**
   * Applies color to border string using chalk
   * @param {string} borderString - Border string to colorize
   * @param {string} type - Border type ('primary', 'secondary', 'accent', 'muted')
   * @returns {string} Colorized border string
   */
  colorizeBorder(borderString, type = 'primary') {
    if (!this.chalk || this.colorSupport === 0) {
      return borderString; // No color support, return plain text
    }

    if (!this.currentTheme) {
      return borderString;
    }

    // Get border color from theme (with fallback to main colors if borders not defined)
    const borders = this.currentTheme.borders || {};
    const borderColor = borders[type] || this.currentTheme.colors[type] || this.currentTheme.colors.primary;

    try {
      // Use chalk hex for full color support
      if (this.colorSupport >= 2) {
        return this.chalk.hex(borderColor)(borderString);
      } else {
        // Fallback to basic colors for limited terminals
        return this._applyBasicBorderColor(borderString, type);
      }
    } catch (error) {
      console.warn('Failed to colorize border:', error.message);
      return borderString;
    }
  }

  /**
   * Applies basic ANSI colors to borders for limited terminals
   * @param {string} borderString - Border string to colorize
   * @param {string} type - Border type
   * @returns {string} Colorized border string
   * @private
   */
  _applyBasicBorderColor(borderString, type) {
    const colorMap = {
      primary: this.chalk.blue,
      secondary: this.chalk.cyan,
      accent: this.chalk.magenta,
      muted: this.chalk.gray
    };

    const colorFunc = colorMap[type] || this.chalk.white;
    return colorFunc(borderString);
  }

  /**
   * Applies basic ANSI colors for limited terminals
   * @param {string} text - Text to colorize
   * @param {string} type - Semantic color type
   * @returns {string} Colorized text
   * @private
   */
  _applyBasicColor(text, type) {
    const colorMap = {
      success: this.chalk.green,
      error: this.chalk.red,
      warning: this.chalk.yellow,
      info: this.chalk.cyan,
      selected: this.chalk.blue,
      normal: this.chalk.white,
      dim: this.chalk.gray
    };

    const colorFunc = colorMap[type] || this.chalk.white;
    return colorFunc(text);
  }

  /**
   * Applies formatting to text
   * @param {string} text - Text to format
   * @param {string} format - Format type ('bold', 'italic', 'underline', 'dim')
   * @returns {string} Formatted text
   */
  format(text, format) {
    if (!this.chalk || this.colorSupport === 0) {
      return text;
    }

    try {
      switch (format) {
      case 'bold':
        return this.chalk.bold(text);
      case 'italic':
        return this.chalk.italic(text);
      case 'underline':
        return this.chalk.underline(text);
      case 'dim':
        return this.chalk.dim(text);
      case 'strikethrough':
        return this.chalk.strikethrough(text);
      default:
        return text;
      }
    } catch (error) {
      console.warn('Failed to format text:', error.message);
      return text;
    }
  }

  /**
   * Creates a fallback theme for environments without color support
   * @returns {object} Fallback theme
   * @private
   */
  _createFallbackTheme() {
    return {
      name: 'fallback',
      colors: {
        primary: '#ffffff',
        success: '#ffffff',
        error: '#ffffff',
        warning: '#ffffff',
        info: '#ffffff',
        highlight: '#ffffff',
        muted: '#ffffff',
        destructive: '#ffffff',
        dimText: '#ffffff',
        accent1: '#ffffff',
        accent2: '#ffffff'
      },
      backgrounds: {
        selected: 'transparent',
        normal: 'transparent'
      },
      borders: {
        primary: '#ffffff',
        secondary: '#ffffff',
        accent: '#ffffff',
        muted: '#ffffff'
      },
      contrastRatios: {
        minRatio: 4.5,
        largeTextRatio: 3.0
      }
    };
  }

  /**
   * Gets current theme name
   * @returns {string} Theme name
   */
  getCurrentThemeName() {
    return this.currentTheme?.name || 'unknown';
  }

  /**
   * Gets list of available themes
   * @returns {string[]} Theme names
   */
  getAvailableThemes() {
    return Object.keys(this.themes);
  }
}

module.exports = ThemeEngine;
