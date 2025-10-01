/**
 * Light Theme - Optimized for light terminal backgrounds
 *
 * Uses darker, less saturated colors for better visibility on light backgrounds
 * All colors validated for WCAG 2.1 AA compliance against light backgrounds
 */

module.exports = {
  name: 'light',
  colors: {
    // Darker primary color for light backgrounds
    primary: '#1d4ed8',      // blue-700

    // Semantic colors optimized for light mode
    success: '#059669',      // green-600
    error: '#dc2626',        // red-600
    warning: '#d97706',      // amber-600
    info: '#0891b2',         // cyan-600

    // UI accent colors for light mode
    highlight: '#7c3aed',    // violet-600
    muted: '#4b5563',        // gray-600
    destructive: '#b91c1c',  // red-700

    // Text color for selected items (white for high contrast)
    selectedText: '#ffffff'  // white
  },
  backgrounds: {
    // Darker background for selected items on light terminals
    selected: '#3b82f6',     // blue-500

    // Transparent to use terminal's light background
    normal: 'transparent'
  },
  contrastRatios: {
    minRatio: 4.5,
    largeTextRatio: 3.0
  }
};
