/**
 * Theme Index - Exports all available themes
 *
 * Provides centralized access to all color themes for the interactive menu
 */

const defaultTheme = require('./default.js');
const darkTheme = require('./dark.js');
const lightTheme = require('./light.js');
const highContrastTheme = require('./high-contrast.js');

module.exports = {
  default: defaultTheme,
  dark: darkTheme,
  light: lightTheme,
  'high-contrast': highContrastTheme
};
