/**
 * BorderRenderer - Renders decorative borders with fallbacks
 *
 * Responsibilities:
 * - Render decorative borders using Unicode or ASCII characters
 * - Apply automatic fallbacks based on terminal capabilities
 * - Provide different border styles (single, double, bold, rounded)
 * - Calculate and adjust border width dynamically
 * - Support boxed text rendering with padding and alignment
 *
 * @module ui/menu/visual/BorderRenderer
 */

/**
 * @typedef {'single' | 'double' | 'bold' | 'rounded' | 'ascii'} BorderStyle
 * Border style preset options:
 * - 'single': Single-line Unicode box-drawing (─ │ ┌ ┐)
 * - 'double': Double-line Unicode box-drawing (═ ║ ╔ ╗)
 * - 'bold': Bold/heavy Unicode box-drawing (━ ┃ ┏ ┓)
 * - 'rounded': Rounded corner Unicode box-drawing (─ │ ╭ ╮)
 * - 'ascii': ASCII fallback (- | + +)
 */

/**
 * @typedef {Object} BorderBoxOptions
 * @property {BorderStyle} [style='single'] - Border style preset
 * @property {number} [padding=1] - Internal padding in spaces
 * @property {'left' | 'center' | 'right'} [align='left'] - Text alignment
 * @property {string} [color=null] - Border color (theme color name)
 */

class BorderRenderer {
  /**
   * Creates a BorderRenderer instance
   *
   * @param {TerminalDetector} terminalDetector - Terminal capability detector
   * @param {object} visualConstants - Visual design constants (BORDER_CHARS, etc)
   * @param {object} [themeEngine=null] - Optional theme engine for color application
   *
   * @example
   * const detector = new TerminalDetector();
   * const renderer = new BorderRenderer(detector, VisualConstants);
   */
  constructor(terminalDetector, visualConstants, themeEngine = null) {
    if (!terminalDetector) {
      throw new TypeError('BorderRenderer requires a TerminalDetector instance');
    }
    if (!visualConstants) {
      throw new TypeError('BorderRenderer requires visualConstants object');
    }

    this.terminalDetector = terminalDetector;
    this.visualConstants = visualConstants;
    this.themeEngine = themeEngine;

    // Cache for resolved charsets to avoid repeated capability checks
    this.charsetCache = new Map();
  }

  /**
   * Gets the appropriate border character set for current terminal
   *
   * Automatically detects terminal capabilities and applies fallbacks:
   * 1. If Unicode supported → use Unicode charset for requested style
   * 2. If Unicode not supported → use ASCII charset
   * 3. If style is 'ascii' → always use ASCII charset
   *
   * @param {BorderStyle} style - Border style preset
   * @returns {BorderCharSet} Character set for the border style
   *
   * @example
   * // Terminal with Unicode support
   * const charset = renderer.getCharSet('double');
   * // Returns: { topLeft: '╔', horizontal: '═', ... }
   *
   * @example
   * // Terminal without Unicode support
   * const charset = renderer.getCharSet('double');
   * // Returns: { topLeft: '+', horizontal: '=', ... }
   */
  getCharSet(style = 'single') {
    // Check cache first
    const cacheKey = `${style}_${this.terminalDetector.supportsUnicode()}`;
    if (this.charsetCache.has(cacheKey)) {
      return this.charsetCache.get(cacheKey);
    }

    let charset;
    const { BORDER_CHARS } = this.visualConstants;

    // Force ASCII if explicitly requested
    if (style === 'ascii') {
      charset = BORDER_CHARS.ascii.single;
      this._logFallback('ASCII style explicitly requested');
    }
    // Use Unicode if terminal supports it
    else if (this.terminalDetector.supportsUnicode()) {
      // Map style to charset, fallback to single if style not found
      const validStyles = ['single', 'double', 'bold', 'rounded'];
      const effectiveStyle = validStyles.includes(style) ? style : 'single';
      charset = BORDER_CHARS.unicode[effectiveStyle];
    }
    // Fallback to ASCII for terminals without Unicode support
    else {
      // Map Unicode style to ASCII equivalent
      const asciiStyleMap = {
        'single': 'single',
        'double': 'double',  // Uses '=' for horizontal
        'bold': 'single',    // Falls back to single ASCII
        'rounded': 'single'  // Falls back to single ASCII
      };
      const asciiStyle = asciiStyleMap[style] || 'single';
      charset = BORDER_CHARS.ascii[asciiStyle];
      this._logFallback(`Unicode not supported, falling back to ASCII for style '${style}'`);
    }

    // Validate charset has required properties
    if (!this._validateCharSet(charset)) {
      // Ultimate fallback: simple text characters
      charset = {
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
      };
      this._logFallback('Invalid charset detected, using simple text fallback');
    }

    // Cache result
    this.charsetCache.set(cacheKey, charset);

    return charset;
  }

  /**
   * Renders a top border line
   *
   * Format: topLeft + horizontal (repeated) + topRight
   *
   * @param {number} width - Border width in columns
   * @param {BorderStyle} [style='single'] - Border style preset
   * @returns {string} Formatted top border string
   *
   * @example
   * // Unicode terminal, width 25
   * const border = renderer.renderTopBorder(25, 'double');
   * // Returns: "╔═══════════════════════╗"
   *
   * @example
   * // ASCII terminal, width 25
   * const border = renderer.renderTopBorder(25, 'double');
   * // Returns: "+=======================+"
   */
  renderTopBorder(width, style = 'single') {
    const charset = this.getCharSet(style);

    // Width must be at least 2 (for corners)
    const effectiveWidth = Math.max(2, width);
    const horizontalLength = effectiveWidth - 2; // Subtract corners

    const border = charset.topLeft +
                   charset.horizontal.repeat(horizontalLength) +
                   charset.topRight;

    return border;
  }

  /**
   * Renders a bottom border line
   *
   * Format: bottomLeft + horizontal (repeated) + bottomRight
   *
   * @param {number} width - Border width in columns
   * @param {BorderStyle} [style='single'] - Border style preset
   * @returns {string} Formatted bottom border string
   *
   * @example
   * // Unicode terminal
   * const border = renderer.renderBottomBorder(25, 'single');
   * // Returns: "└─────────────────────┘"
   */
  renderBottomBorder(width, style = 'single') {
    const charset = this.getCharSet(style);

    // Width must be at least 2 (for corners)
    const effectiveWidth = Math.max(2, width);
    const horizontalLength = effectiveWidth - 2; // Subtract corners

    const border = charset.bottomLeft +
                   charset.horizontal.repeat(horizontalLength) +
                   charset.bottomRight;

    return border;
  }

  /**
   * Renders a separator line (horizontal divider)
   *
   * Format: teeRight + horizontal (repeated) + teeLeft
   * Used to separate sections within a bordered area.
   *
   * @param {number} width - Separator width in columns
   * @param {BorderStyle} [style='single'] - Border style preset
   * @returns {string} Formatted separator string
   *
   * @example
   * // Unicode terminal
   * const separator = renderer.renderSeparator(25, 'single');
   * // Returns: "├─────────────────────┤"
   *
   * @example
   * // ASCII terminal
   * const separator = renderer.renderSeparator(25, 'single');
   * // Returns: "+---------------------+"
   */
  renderSeparator(width, style = 'single') {
    const charset = this.getCharSet(style);

    // Width must be at least 2 (for connectors)
    const effectiveWidth = Math.max(2, width);
    const horizontalLength = effectiveWidth - 2; // Subtract connectors

    const separator = charset.teeRight +
                      charset.horizontal.repeat(horizontalLength) +
                      charset.teeLeft;

    return separator;
  }

  /**
   * Renders text enclosed in a complete border box
   *
   * Features:
   * - Automatic width calculation based on text and padding
   * - Text alignment (left, center, right)
   * - Multi-line text support
   * - Optional color application via ThemeEngine
   *
   * @param {string|string[]} text - Text content (string or array of lines)
   * @param {BorderBoxOptions} [options={}] - Box styling options
   * @returns {string} Complete boxed text with borders
   *
   * @example
   * // Simple box with default options
   * const box = renderer.renderBox('Hello, World!');
   * // ┌───────────────┐
   * // │ Hello, World! │
   * // └───────────────┘
   *
   * @example
   * // Box with padding and center alignment
   * const box = renderer.renderBox('Title', {
   *   style: 'double',
   *   padding: 2,
   *   align: 'center'
   * });
   * // ╔═══════════╗
   * // ║           ║
   * // ║   Title   ║
   * // ║           ║
   * // ╚═══════════╝
   *
   * @example
   * // Multi-line box
   * const box = renderer.renderBox(['Line 1', 'Line 2', 'Line 3'], {
   *   style: 'rounded',
   *   padding: 1
   * });
   */
  renderBox(text, options = {}) {
    // Default options
    const {
      style = 'single',
      padding = 1,
      align = 'left',
      color = null
    } = options;

    // Convert text to array of lines
    const lines = Array.isArray(text) ? text : [text];

    // Calculate maximum line length
    const maxLineLength = Math.max(...lines.map(line => line.length));

    // Calculate box width: maxLineLength + 2*padding + 2 (for vertical borders)
    const contentWidth = maxLineLength + (padding * 2);
    const boxWidth = contentWidth + 2; // Add vertical borders

    const charset = this.getCharSet(style);

    // Build output array
    const output = [];

    // Top border
    output.push(this.renderTopBorder(boxWidth, style));

    // Vertical padding (top)
    if (padding > 0) {
      const emptyLine = charset.vertical +
                       ' '.repeat(contentWidth) +
                       charset.vertical;
      output.push(emptyLine);
    }

    // Content lines
    for (const line of lines) {
      const paddedLine = this._renderSideBorders(line, contentWidth, charset, padding, align);
      output.push(paddedLine);
    }

    // Vertical padding (bottom)
    if (padding > 0) {
      const emptyLine = charset.vertical +
                       ' '.repeat(contentWidth) +
                       charset.vertical;
      output.push(emptyLine);
    }

    // Bottom border
    output.push(this.renderBottomBorder(boxWidth, style));

    // Join lines
    let result = output.join('\n');

    // Apply color if requested and ThemeEngine is available
    if (color && this.themeEngine) {
      result = this._applyColor(result, color);
    }

    return result;
  }

  /**
   * Renders a single line with side borders and padding
   *
   * Helper method for renderBox to handle individual content lines.
   *
   * @param {string} text - Text content for the line
   * @param {number} contentWidth - Total content width (excluding borders)
   * @param {BorderCharSet} charset - Character set to use
   * @param {number} padding - Horizontal padding
   * @param {'left' | 'center' | 'right'} align - Text alignment
   * @returns {string} Formatted line with side borders
   * @private
   */
  _renderSideBorders(text, contentWidth, charset, padding, align) {
    // Calculate available text width (content width minus padding on both sides)
    const textWidth = contentWidth - (padding * 2);

    // Truncate text if it exceeds available width
    let displayText = text;
    if (displayText.length > textWidth) {
      displayText = displayText.substring(0, textWidth);
    }

    // Apply alignment
    let alignedText;
    const remainingSpace = textWidth - displayText.length;

    switch (align) {
      case 'center':
        const leftPad = Math.floor(remainingSpace / 2);
        const rightPad = remainingSpace - leftPad;
        alignedText = ' '.repeat(leftPad) + displayText + ' '.repeat(rightPad);
        break;

      case 'right':
        alignedText = ' '.repeat(remainingSpace) + displayText;
        break;

      case 'left':
      default:
        alignedText = displayText + ' '.repeat(remainingSpace);
        break;
    }

    // Build line: vertical | padding | aligned text | padding | vertical
    const line = charset.vertical +
                 ' '.repeat(padding) +
                 alignedText +
                 ' '.repeat(padding) +
                 charset.vertical;

    return line;
  }

  /**
   * Applies color to text using ThemeEngine
   *
   * @param {string} text - Text to colorize
   * @param {string} color - Color name from theme (e.g., 'primary', 'success')
   * @returns {string} Colorized text
   * @private
   */
  _applyColor(text, color) {
    if (!this.themeEngine) {
      return text;
    }

    try {
      // Check if ThemeEngine has a colorize method
      if (typeof this.themeEngine.colorize === 'function') {
        return this.themeEngine.colorize(text, color);
      }

      // Check if ThemeEngine has a colorizeBorder method
      if (typeof this.themeEngine.colorizeBorder === 'function') {
        return this.themeEngine.colorizeBorder(text, color);
      }

      // Fallback: return text as-is
      return text;
    } catch (error) {
      this._logFallback(`Failed to apply color '${color}': ${error.message}`);
      return text;
    }
  }

  /**
   * Validates that a charset has all required properties
   *
   * @param {object} charset - Character set to validate
   * @returns {boolean} True if charset is valid
   * @private
   */
  _validateCharSet(charset) {
    const requiredProps = [
      'topLeft', 'topRight', 'bottomLeft', 'bottomRight',
      'horizontal', 'vertical', 'cross',
      'teeLeft', 'teeRight', 'teeTop', 'teeBottom'
    ];

    return requiredProps.every(prop =>
      charset && typeof charset[prop] === 'string' && charset[prop].length > 0
    );
  }

  /**
   * Logs a warning when fallback is activated
   *
   * @param {string} message - Fallback warning message
   * @private
   */
  _logFallback(message) {
    // Only log in debug mode or if logger is available
    if (process.env.DEBUG || process.env.VERBOSE) {
      console.warn(`[BorderRenderer] Fallback: ${message}`);
    }
  }

  /**
   * Clears the charset cache
   * Useful when terminal capabilities might have changed
   */
  clearCache() {
    this.charsetCache.clear();
  }
}

module.exports = BorderRenderer;
