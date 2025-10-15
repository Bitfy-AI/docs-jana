/**
 * Light Theme - Optimized for light terminal backgrounds
 *
 * Uses darker, less saturated colors for better visibility on light backgrounds
 * All colors validated for WCAG 2.1 AA compliance against light backgrounds
 */

module.exports = {
  name: 'light',
  colors: {
    // Darker primary color for light backgrounds (WCAG AA compliant)
    primary: '#1e40af',      // blue-800 - darker for ≥4.5:1 on white

    // Semantic colors optimized for light mode (WCAG AA compliant on white)
    success: '#047857',      // green-700 - darker for WCAG AA
    error: '#b91c1c',        // red-700 - darker for WCAG AA
    warning: '#b45309',      // amber-700 - darker for WCAG AA
    info: '#0e7490',         // cyan-700 - darker for WCAG AA

    // UI accent colors for light mode
    highlight: '#6d28d9',    // violet-700 - darker for WCAG AA
    muted: '#374151',        // gray-700 - darker for WCAG AA
    destructive: '#991b1b',  // red-800 - darker for WCAG AA

    // Text color for selected items (white for high contrast)
    selectedText: '#ffffff', // white

    // New color fields optimized for light backgrounds
    dimText: '#374151',      // gray-700 - darker for WCAG AA compliance
    accent1: '#db2777',      // pink-600 - darker accent for light mode
    accent2: '#0f766e'       // teal-700 - darker teal for WCAG AA compliance
  },
  backgrounds: {
    // Darker background for selected items on light terminals
    selected: '#2563eb',     // blue-600 - ensures 4.5:1 contrast with white text

    // Transparent to use terminal's light background
    normal: 'transparent'
  },
  borders: {
    // Border colors optimized for light backgrounds (≥3:1 contrast)
    primary: '#2563eb',      // blue-600 - darker primary borders
    secondary: '#0891b2',    // cyan-600 - darker secondary borders
    accent: '#7c3aed',       // violet-600 - darker accent borders
    muted: '#6b7280'         // gray-500 - darker for ≥3:1 contrast on white
  },
  contrastRatios: {
    minRatio: 4.5,
    largeTextRatio: 3.0
  }
};
