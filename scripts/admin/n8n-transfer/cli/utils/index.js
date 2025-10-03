/**
 * @fileoverview Exports de utilitários CLI
 */

const { isNonInteractive, getFlag, outputJSON } = require('./non-interactive');

module.exports = {
  // Non-interactive utilities
  isNonInteractive,
  getFlag,
  outputJSON
};
