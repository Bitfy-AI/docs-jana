/**
 * Visual Design Constants
 * Design tokens for the CLI UX enhancement
 * @module ui/menu/config/visual-constants
 */

/**
 * @typedef {Object} BorderCharSet
 * @property {string} topLeft - Top-left corner character
 * @property {string} topRight - Top-right corner character
 * @property {string} bottomLeft - Bottom-left corner character
 * @property {string} bottomRight - Bottom-right corner character
 * @property {string} horizontal - Horizontal line character
 * @property {string} vertical - Vertical line character
 * @property {string} cross - Cross junction character
 * @property {string} teeLeft - T junction pointing left
 * @property {string} teeRight - T junction pointing right
 * @property {string} teeTop - T junction pointing up
 * @property {string} teeBottom - T junction pointing down
 */

/**
 * @typedef {Object} LayoutConfig
 * @property {Object} breakpoints - Terminal width breakpoints for responsive layout
 * @property {number} breakpoints.expanded - Minimum width for expanded layout (100 columns)
 * @property {number} breakpoints.standard - Minimum width for standard layout (80 columns)
 * @property {number} breakpoints.compact - Minimum width for compact layout (60 columns)
 * @property {number} minWidth - Minimum supported terminal width (60 columns)
 * @property {Object} margins - Horizontal margins by layout mode
 * @property {number} margins.horizontal - Default horizontal margin (2 spaces)
 * @property {Object} padding - Padding configuration by section and mode
 */

/**
 * @typedef {Object} SpacingConfig
 * @property {number} beforeHeader - Number of blank lines before header
 * @property {number} afterHeader - Number of blank lines after header
 * @property {number} betweenOptions - Number of blank lines between options
 * @property {number} beforeDescription - Number of blank lines before description
 * @property {number} afterDescription - Number of blank lines after description
 * @property {number} beforeFooter - Number of blank lines before footer
 */

/**
 * @typedef {Object} TypographyConfig
 * @property {Object} maxDescriptionLength - Maximum description length by layout mode
 * @property {number} maxDescriptionLength.expanded - Max length in expanded mode (120 chars)
 * @property {number} maxDescriptionLength.standard - Max length in standard mode (80 chars)
 * @property {number} maxDescriptionLength.compact - Max length in compact mode (60 chars)
 * @property {string} ellipsis - Ellipsis string for truncated text
 * @property {number} indentation - Indentation for option text (2 spaces)
 */

/**
 * Border Character Sets
 *
 * Provides Unicode box-drawing characters for modern terminals and ASCII fallbacks
 * for terminals with limited Unicode support.
 *
 * @type {Object}
 * @property {Object} unicode - Unicode box-drawing character sets
 * @property {Object} ascii - ASCII fallback character sets
 *
 * @example
 * // Using Unicode single border
 * const { single } = BORDER_CHARS.unicode;
 * const topBorder = single.topLeft + single.horizontal.repeat(20) + single.topRight;
 * // Result: "┌────────────────────┐"
 *
 * @example
 * // Using ASCII fallback
 * const { single } = BORDER_CHARS.ascii;
 * const topBorder = single.topLeft + single.horizontal.repeat(20) + single.topRight;
 * // Result: "+-----------------+"
 */
const BORDER_CHARS = {
  // Unicode box-drawing characters
  unicode: {
    /**
     * Single-line box-drawing characters
     * @type {BorderCharSet}
     */
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
    /**
     * Double-line box-drawing characters
     * @type {BorderCharSet}
     */
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
    /**
     * Bold/heavy box-drawing characters
     * @type {BorderCharSet}
     */
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
    /**
     * Rounded corner box-drawing characters
     * @type {BorderCharSet}
     */
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
  // ASCII fallback characters
  ascii: {
    /**
     * Simple ASCII single-line characters
     * @type {BorderCharSet}
     */
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
    /**
     * ASCII double-line characters using equals sign
     * @type {BorderCharSet}
     */
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
};

/**
 * Layout Configuration
 *
 * Defines responsive breakpoints and spacing for different terminal widths.
 * Layout modes: expanded (≥100), standard (≥80), compact (<80)
 *
 * @type {LayoutConfig}
 *
 * @example
 * // Determine layout mode based on terminal width
 * const terminalWidth = process.stdout.columns;
 * let mode = 'compact';
 * if (terminalWidth >= LAYOUT.breakpoints.expanded) mode = 'expanded';
 * else if (terminalWidth >= LAYOUT.breakpoints.standard) mode = 'standard';
 *
 * @example
 * // Calculate content width with margins
 * const contentWidth = terminalWidth - (LAYOUT.margins.horizontal * 2);
 */
const LAYOUT = {
  breakpoints: {
    expanded: 100,    // Terminal width >= 100 columns → expanded layout
    standard: 80,     // Terminal width >= 80 columns → standard layout
    compact: 60       // Terminal width >= 60 columns → compact layout
  },
  minWidth: 60,       // Minimum supported terminal width
  margins: {
    horizontal: 2     // Horizontal margin (left/right) in spaces
  },
  padding: {
    /**
     * Padding for expanded layout mode (≥100 columns)
     */
    expanded: {
      vertical: 1,
      horizontal: 4
    },
    /**
     * Padding for standard layout mode (≥80 columns)
     */
    standard: {
      vertical: 1,
      horizontal: 2
    },
    /**
     * Padding for compact layout mode (<80 columns)
     */
    compact: {
      vertical: 0,
      horizontal: 1
    },
    /**
     * Section-specific padding
     */
    header: {
      vertical: 1,
      horizontal: 2
    },
    options: {
      vertical: 0,
      horizontal: 2
    },
    footer: {
      vertical: 1,
      horizontal: 2
    }
  }
};

/**
 * Spacing Configuration
 *
 * Defines vertical spacing (blank lines) between different sections
 * of the menu interface.
 *
 * @type {SpacingConfig}
 *
 * @example
 * // Add spacing before header
 * output += '\n'.repeat(SPACING.beforeHeader);
 * output += renderHeader();
 * output += '\n'.repeat(SPACING.afterHeader);
 */
const SPACING = {
  beforeHeader: 1,      // Blank lines before header section
  afterHeader: 1,       // Blank lines after header section
  betweenOptions: 0,    // Blank lines between individual options
  beforeDescription: 1, // Blank lines before option description
  afterDescription: 1,  // Blank lines after option description
  beforeFooter: 1       // Blank lines before footer section
};

/**
 * Typography Configuration
 *
 * Defines text-related settings including maximum description lengths
 * for different layout modes and indentation values.
 *
 * @type {TypographyConfig}
 *
 * @example
 * // Truncate description based on layout mode
 * const mode = 'standard';
 * const maxLength = TYPOGRAPHY.maxDescriptionLength[mode];
 * if (description.length > maxLength) {
 *   description = description.substring(0, maxLength - TYPOGRAPHY.ellipsis.length)
 *                 + TYPOGRAPHY.ellipsis;
 * }
 *
 * @example
 * // Apply indentation to option
 * const indentedOption = ' '.repeat(TYPOGRAPHY.indentation) + optionText;
 */
const TYPOGRAPHY = {
  maxDescriptionLength: {
    expanded: 120,  // Maximum description length in expanded mode
    standard: 80,   // Maximum description length in standard mode
    compact: 60     // Maximum description length in compact mode
  },
  ellipsis: '...',  // Ellipsis string for truncated text
  indentation: 2    // Number of spaces for option indentation
};

/**
 * Export all design tokens
 *
 * These constants are used by BorderRenderer, LayoutManager, and other
 * visual components to ensure consistent design across the CLI interface.
 */
module.exports = {
  BORDER_CHARS,
  LAYOUT,
  SPACING,
  TYPOGRAPHY
};
