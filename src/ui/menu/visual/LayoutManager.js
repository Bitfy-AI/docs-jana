/**
 * LayoutManager - Manages responsive layout calculations
 *
 * Responsibilities:
 * - Determine layout mode based on terminal width (expanded, standard, compact)
 * - Calculate content width considering margins
 * - Provide padding and spacing values for different layout modes
 * - Text manipulation utilities (truncate, wrap, center)
 * - Cache layout calculations for performance
 * - React to terminal resize events
 *
 * @module ui/menu/visual/LayoutManager
 */

const stringWidth = require('string-width');

/**
 * @typedef {'expanded' | 'standard' | 'compact'} LayoutMode
 */

/**
 * @typedef {Object} LayoutConfig
 * @property {LayoutMode} mode - Current layout mode
 * @property {number} contentWidth - Available content width in columns
 * @property {number} terminalWidth - Total terminal width in columns
 * @property {number} horizontalPadding - Horizontal padding in spaces
 * @property {Object} verticalSpacing - Vertical spacing map
 * @property {number} verticalSpacing.beforeHeader - Lines before header
 * @property {number} verticalSpacing.afterHeader - Lines after header
 * @property {number} verticalSpacing.betweenOptions - Lines between options
 * @property {number} verticalSpacing.beforeFooter - Lines before footer
 */

class LayoutManager {
  /**
   * Creates a new LayoutManager instance
   *
   * @param {TerminalDetector} terminalDetector - Terminal capability detector
   * @param {Object} visualConstants - Visual design constants (LAYOUT, SPACING, TYPOGRAPHY)
   *
   * @example
   * const layoutManager = new LayoutManager(terminalDetector, visualConstants);
   * const mode = layoutManager.getLayoutMode(); // 'standard'
   * const width = layoutManager.getContentWidth(); // 76 (80 - 2*2 margins)
   */
  constructor(terminalDetector, visualConstants) {
    if (!terminalDetector) {
      throw new TypeError('LayoutManager requires a TerminalDetector instance');
    }
    if (!visualConstants) {
      throw new TypeError('LayoutManager requires visual constants');
    }

    this.terminalDetector = terminalDetector;
    this.constants = visualConstants;

    // Cache for layout calculations
    this.layoutCache = null;
    this.cachedWidth = null;

    // Set up resize listener to invalidate cache
    this._setupResizeListener();
  }

  /**
   * Sets up listener for terminal resize events
   * Invalidates cache when terminal width changes
   * @private
   */
  _setupResizeListener() {
    this.resizeCleanup = this.terminalDetector.onResize(() => {
      this.invalidateCache();
    });
  }

  /**
   * Determines current layout mode based on terminal width
   *
   * Layout modes:
   * - 'expanded': Terminal width >= 100 columns (full descriptions, extra padding)
   * - 'standard': Terminal width >= 80 columns (normal layout)
   * - 'compact': Terminal width < 80 columns (truncated, minimal padding)
   *
   * @returns {LayoutMode} Current layout mode
   *
   * @example
   * const mode = layoutManager.getLayoutMode();
   * if (mode === 'compact') {
   *   // Use abbreviated labels
   * }
   */
  getLayoutMode() {
    const { width } = this.terminalDetector.getDimensions();
    const { breakpoints } = this.constants.LAYOUT;

    if (width >= breakpoints.expanded) {
      return 'expanded';
    } else if (width >= breakpoints.standard) {
      return 'standard';
    } else {
      return 'compact';
    }
  }

  /**
   * Calculates available content width considering margins
   *
   * Formula: contentWidth = terminalWidth - (2 * horizontalMargin)
   *
   * Ensures content fits within terminal boundaries with consistent margins.
   *
   * @returns {number} Available content width in columns
   *
   * @example
   * // Terminal width: 80, margins: 2
   * const contentWidth = layoutManager.getContentWidth(); // 76
   *
   * @example
   * // Use content width to render borders
   * const border = '─'.repeat(layoutManager.getContentWidth());
   */
  getContentWidth() {
    const { width } = this.terminalDetector.getDimensions();
    const { margins } = this.constants.LAYOUT;

    // Calculate: terminal width - left margin - right margin
    const contentWidth = width - (margins.horizontal * 2);

    // Ensure minimum width
    return Math.max(contentWidth, 20); // Minimum 20 columns for usability
  }

  /**
   * Gets horizontal padding for a specific layout mode
   *
   * Padding is internal spacing within components (e.g., inside borders).
   * Different from margins which are external spacing.
   *
   * @param {LayoutMode} [mode] - Layout mode (defaults to current mode)
   * @returns {number} Padding in spaces
   *
   * @example
   * const padding = layoutManager.getHorizontalPadding('expanded'); // 4
   * const paddedText = ' '.repeat(padding) + text + ' '.repeat(padding);
   */
  getHorizontalPadding(mode) {
    const layoutMode = mode || this.getLayoutMode();
    const { padding } = this.constants.LAYOUT;

    // Return padding for the specified mode
    return padding[layoutMode]?.horizontal || padding.standard.horizontal;
  }

  /**
   * Gets vertical spacing (blank lines) for a specific section type
   *
   * Defines how many blank lines appear before/after different menu sections.
   *
   * @param {string} sectionType - Section type: 'beforeHeader', 'afterHeader', 'betweenOptions', 'beforeFooter', etc.
   * @returns {number} Number of blank lines
   *
   * @example
   * const spacing = layoutManager.getVerticalSpacing('afterHeader'); // 1
   * output += '\n'.repeat(spacing);
   *
   * @example
   * // Available section types
   * const sections = [
   *   'beforeHeader',
   *   'afterHeader',
   *   'betweenOptions',
   *   'beforeDescription',
   *   'afterDescription',
   *   'beforeFooter'
   * ];
   */
  getVerticalSpacing(sectionType) {
    const { SPACING } = this.constants;

    // Return spacing for the specified section, default to 0
    return SPACING[sectionType] || 0;
  }

  /**
   * Truncates text to fit within a maximum width
   *
   * Uses string-width to correctly handle Unicode characters (emojis, wide chars).
   * Adds ellipsis when text is truncated.
   *
   * @param {string} text - Text to truncate
   * @param {number} maxWidth - Maximum width in columns
   * @param {string} [ellipsis='...'] - Ellipsis string to append
   * @returns {string} Truncated text with ellipsis if needed
   *
   * @example
   * const text = 'This is a very long description that needs truncating';
   * const truncated = layoutManager.truncateText(text, 20);
   * // Result: "This is a very lo..."
   *
   * @example
   * // Handle Unicode correctly
   * const emoji = '📁 Important file 📄 with content';
   * const truncated = layoutManager.truncateText(emoji, 15);
   * // Correctly counts emoji width
   */
  truncateText(text, maxWidth, ellipsis = '...') {
    if (!text || typeof text !== 'string') {
      return '';
    }

    // Get actual display width (handles Unicode)
    const textWidth = stringWidth(text);

    // No truncation needed
    if (textWidth <= maxWidth) {
      return text;
    }

    // Calculate available width for text (reserve space for ellipsis)
    const ellipsisWidth = stringWidth(ellipsis);
    const availableWidth = maxWidth - ellipsisWidth;

    if (availableWidth <= 0) {
      // Max width too small, return just ellipsis
      return ellipsis.substring(0, maxWidth);
    }

    // Truncate character by character to respect visual width
    let truncated = '';
    let currentWidth = 0;

    for (const char of text) {
      const charWidth = stringWidth(char);
      if (currentWidth + charWidth > availableWidth) {
        break;
      }
      truncated += char;
      currentWidth += charWidth;
    }

    return truncated + ellipsis;
  }

  /**
   * Wraps text to fit within a maximum width using intelligent word-wrapping
   *
   * Breaks on word boundaries when possible. Handles long words by breaking them.
   * Uses string-width for correct Unicode character width calculation.
   *
   * @param {string} text - Text to wrap
   * @param {number} maxWidth - Maximum width per line in columns
   * @returns {string[]} Array of wrapped lines
   *
   * @example
   * const text = 'This is a long sentence that needs to be wrapped across multiple lines';
   * const lines = layoutManager.wrapText(text, 20);
   * // Result: [
   * //   'This is a long',
   * //   'sentence that needs',
   * //   'to be wrapped across',
   * //   'multiple lines'
   * // ]
   *
   * @example
   * // Handle words longer than maxWidth
   * const longWord = 'Supercalifragilisticexpialidocious';
   * const lines = layoutManager.wrapText(longWord, 15);
   * // Result: [
   * //   'Supercalifragil',
   * //   'isticexpialidoc',
   * //   'ious'
   * // ]
   */
  wrapText(text, maxWidth) {
    if (!text || typeof text !== 'string') {
      return [];
    }

    // If text fits, return as single line
    if (stringWidth(text) <= maxWidth) {
      return [text];
    }

    const lines = [];
    const words = text.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      const wordWidth = stringWidth(word);

      // Word is longer than maxWidth - need to break it
      if (wordWidth > maxWidth) {
        // Flush current line if not empty
        if (currentLine) {
          lines.push(currentLine.trim());
          currentLine = '';
        }

        // Break the long word into chunks
        let remainingWord = word;
        while (stringWidth(remainingWord) > maxWidth) {
          let chunk = '';
          let chunkWidth = 0;

          for (const char of remainingWord) {
            const charWidth = stringWidth(char);
            if (chunkWidth + charWidth > maxWidth) {
              break;
            }
            chunk += char;
            chunkWidth += charWidth;
          }

          lines.push(chunk);
          remainingWord = remainingWord.substring(chunk.length);
        }

        // Add remaining part to current line
        if (remainingWord) {
          currentLine = remainingWord + ' ';
        }
        continue;
      }

      // Try adding word to current line
      const testLine = currentLine + word + ' ';
      const testWidth = stringWidth(testLine);

      if (testWidth <= maxWidth) {
        // Word fits on current line
        currentLine = testLine;
      } else {
        // Word doesn't fit, start new line
        if (currentLine) {
          lines.push(currentLine.trim());
        }
        currentLine = word + ' ';
      }
    }

    // Add last line if not empty
    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }

    return lines;
  }

  /**
   * Centers text within a specified width
   *
   * Adds equal padding on both sides. If width is odd, adds extra space to the right.
   * Uses string-width for correct Unicode character width calculation.
   *
   * @param {string} text - Text to center
   * @param {number} width - Total width for centering
   * @returns {string} Centered text with padding
   *
   * @example
   * const centered = layoutManager.centerText('Hello', 20);
   * // Result: "       Hello        " (7 spaces left, 8 spaces right)
   *
   * @example
   * // Unicode handling
   * const centered = layoutManager.centerText('📁 Files', 20);
   * // Correctly accounts for emoji width
   */
  centerText(text, width) {
    if (!text || typeof text !== 'string') {
      return ' '.repeat(width);
    }

    const textWidth = stringWidth(text);

    // Text is already wider than available width
    if (textWidth >= width) {
      return text;
    }

    // Calculate padding
    const totalPadding = width - textWidth;
    const leftPadding = Math.floor(totalPadding / 2);
    const rightPadding = totalPadding - leftPadding;

    return ' '.repeat(leftPadding) + text + ' '.repeat(rightPadding);
  }

  /**
   * Gets complete layout configuration object
   *
   * Returns cached configuration if available and terminal width hasn't changed.
   * This is the primary method to use when rendering the entire menu.
   *
   * @returns {LayoutConfig} Complete layout configuration
   *
   * @example
   * const config = layoutManager.getLayoutConfig();
   * console.log(config);
   * // {
   * //   mode: 'standard',
   * //   contentWidth: 76,
   * //   terminalWidth: 80,
   * //   horizontalPadding: 2,
   * //   verticalSpacing: {
   * //     beforeHeader: 1,
   * //     afterHeader: 1,
   * //     betweenOptions: 0,
   * //     beforeFooter: 1
   * //   }
   * // }
   *
   * @example
   * // Use cached config for rendering
   * const config = layoutManager.getLayoutConfig();
   * const border = '─'.repeat(config.contentWidth);
   * const padding = ' '.repeat(config.horizontalPadding);
   */
  getLayoutConfig() {
    const currentWidth = this.terminalDetector.getDimensions().width;

    // Return cached config if width hasn't changed
    if (this.layoutCache && this.cachedWidth === currentWidth) {
      return this.layoutCache;
    }

    // Calculate new layout config
    const mode = this.getLayoutMode();
    const config = {
      mode,
      contentWidth: this.getContentWidth(),
      terminalWidth: currentWidth,
      horizontalPadding: this.getHorizontalPadding(mode),
      verticalSpacing: this._buildVerticalSpacingConfig()
    };

    // Cache the configuration
    this.layoutCache = config;
    this.cachedWidth = currentWidth;

    return config;
  }

  /**
   * Builds vertical spacing configuration object
   * Extracted to reduce complexity in getLayoutConfig()
   * @returns {Object} Vertical spacing configuration
   * @private
   */
  _buildVerticalSpacingConfig() {
    const spacingSections = [
      'beforeHeader',
      'afterHeader',
      'betweenOptions',
      'beforeDescription',
      'afterDescription',
      'beforeFooter'
    ];

    const config = {};
    for (const section of spacingSections) {
      config[section] = this.getVerticalSpacing(section);
    }

    return config;
  }

  /**
   * Manually invalidates the layout cache
   *
   * Useful when terminal state might have changed externally or when
   * forcing a recalculation is needed.
   *
   * Automatically called by the resize listener.
   *
   * @example
   * // Force recalculation
   * layoutManager.invalidateCache();
   * const freshConfig = layoutManager.getLayoutConfig();
   */
  invalidateCache() {
    this.layoutCache = null;
    this.cachedWidth = null;
  }

  /**
   * Cleans up resources (removes resize listener)
   *
   * Call this when LayoutManager is no longer needed to prevent memory leaks.
   *
   * @example
   * // Cleanup when done
   * layoutManager.cleanup();
   */
  cleanup() {
    if (this.resizeCleanup) {
      this.resizeCleanup();
      this.resizeCleanup = null;
    }
  }
}

module.exports = LayoutManager;
