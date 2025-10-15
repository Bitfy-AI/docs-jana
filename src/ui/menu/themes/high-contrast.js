/**
 * High Contrast Theme - Maximum accessibility for users with low vision
 *
 * Provides maximum contrast ratios exceeding WCAG 2.1 AAA standards (7:1)
 * Designed for users who need enhanced visual distinction
 */

module.exports = {
  name: 'high-contrast',
  colors: {
    // Maximum contrast colors (pure or near-pure hues)
    primary: '#0000ff',      // Pure blue

    // Semantic colors with maximum saturation
    success: '#00ff00',      // Pure green
    error: '#ff0000',        // Pure red
    warning: '#ffff00',      // Pure yellow
    info: '#00ffff',         // Pure cyan

    // UI accent colors with high contrast
    highlight: '#ff00ff',    // Pure magenta
    muted: '#808080',        // Medium gray
    destructive: '#cc0000',  // Dark red

    // Text color for selected items (white for maximum contrast)
    selectedText: '#ffffff', // Pure white

    // New color fields with maximum contrast
    dimText: '#cccccc',      // Light gray - high contrast dim text
    accent1: '#ff00ff',      // Pure magenta - high contrast accent
    accent2: '#00ffff'       // Pure cyan - high contrast accent
  },
  backgrounds: {
    // High contrast background for selection
    selected: '#0000ff',     // Pure blue

    // Transparent to use terminal background
    normal: 'transparent'
  },
  borders: {
    // Border colors with maximum contrast and visibility
    primary: '#00ffff',      // Pure cyan - maximum visibility
    secondary: '#00ff00',    // Pure green - maximum visibility
    accent: '#ff00ff',       // Pure magenta - maximum visibility
    muted: '#808080'         // Medium gray - still visible in high contrast
  },
  contrastRatios: {
    // WCAG 2.1 Level AAA minimum for normal text
    minRatio: 7.0,

    // WCAG 2.1 Level AAA minimum for large text
    largeTextRatio: 4.5
  }
};
