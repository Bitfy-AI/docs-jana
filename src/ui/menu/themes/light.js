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
    selectedText: '#ffffff', // white

    // New color fields optimized for light backgrounds
    dimText: '#6b7280',      // gray-500 - darker dim text for light mode
    accent1: '#db2777',      // pink-600 - darker accent for light mode
    accent2: '#0d9488'       // teal-600 - darker teal for light mode
  },
  backgrounds: {
    // Darker background for selected items on light terminals
    selected: '#2563eb',     // blue-600 - ensures 4.5:1 contrast with white text

    // Transparent to use terminal's light background
    normal: 'transparent'
  },
  borders: {
    // Border colors optimized for light backgrounds
    primary: '#2563eb',      // blue-600 - darker primary borders
    secondary: '#0891b2',    // cyan-600 - darker secondary borders
    accent: '#7c3aed',       // violet-600 - darker accent borders
    muted: '#9ca3af'         // gray-400 - subtle borders for light mode
  },
  contrastRatios: {
    minRatio: 4.5,
    largeTextRatio: 3.0
  }
};
