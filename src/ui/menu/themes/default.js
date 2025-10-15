/**
 * Default Theme - Balanced colors for general use
 *
 * Color palette based on Tailwind CSS color system
 * All colors validated for WCAG 2.1 AA compliance (4.5:1 contrast ratio)
 */

module.exports = {
  name: 'default',
  colors: {
    // Primary color for menu items and interactive elements
    primary: '#3b82f6',      // blue-500

    // Semantic colors for command feedback
    success: '#10b981',      // green-500
    error: '#ef4444',        // red-500
    warning: '#f59e0b',      // amber-500
    info: '#06b6d4',         // cyan-500

    // UI accent colors
    highlight: '#8b5cf6',    // violet-500
    muted: '#9ca3af',        // gray-400 - lighter for WCAG AA compliance
    destructive: '#f87171',  // red-400 - lighter for WCAG AA compliance

    // Text color for selected items (white for high contrast on colored backgrounds)
    selectedText: '#ffffff', // white

    // New color fields for enhanced visual hierarchy (optimized for terminal backgrounds)
    dimText: '#9ca3af',      // gray-400 - lighter for WCAG AA compliance (≥4.5:1)
    accent1: '#ec4899',      // pink-500 - additional accent color
    accent2: '#06b6d4'       // cyan-500 - additional accent color
  },
  backgrounds: {
    // Background for selected menu item (darker for better contrast with white text)
    selected: '#2563eb',     // blue-600 - ensures 4.5:1 contrast with white text

    // Background for normal menu items (transparent = terminal background)
    normal: 'transparent'
  },
  borders: {
    // Border colors for decorative elements (used against terminal backgrounds)
    primary: '#3b82f6',      // blue-500 - vibrant primary borders
    secondary: '#06b6d4',    // cyan-500 - secondary borders
    accent: '#8b5cf6',       // violet-500 - accent borders
    muted: '#6b7280'         // gray-500 - subtle borders
  },
  contrastRatios: {
    // WCAG 2.1 Level AA minimum for normal text
    minRatio: 4.5,

    // WCAG 2.1 Level AA minimum for large text (18pt+)
    largeTextRatio: 3.0
  }
};
