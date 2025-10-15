/**
 * Dark Theme - Optimized for dark terminal backgrounds
 *
 * Uses brighter, more saturated colors for better visibility on dark backgrounds
 * All colors validated for WCAG 2.1 AA compliance against dark backgrounds
 */

module.exports = {
  name: 'dark',
  colors: {
    // Brighter primary color for dark backgrounds
    primary: '#60a5fa',      // blue-400

    // Semantic colors optimized for dark mode
    success: '#34d399',      // green-400
    error: '#f87171',        // red-400
    warning: '#fbbf24',      // amber-400
    info: '#22d3ee',         // cyan-400

    // UI accent colors for dark mode
    highlight: '#a78bfa',    // violet-400
    muted: '#9ca3af',        // gray-400
    destructive: '#f87171',  // red-400

    // Text color for selected items (white for high contrast)
    selectedText: '#ffffff'  // white
  },
  backgrounds: {
    // Brighter background for selected items on dark terminals
    selected: '#1e40af',     // blue-800

    // Transparent to use terminal's dark background
    normal: 'transparent'
  },
  contrastRatios: {
    minRatio: 4.5,
    largeTextRatio: 3.0
  }
};
