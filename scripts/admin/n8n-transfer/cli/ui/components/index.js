/**
 * @fileoverview Exports de todos os componentes UI
 */

const { input, inputUrl, inputNumber } = require('./input');
const { select } = require('./select');
const { confirm } = require('./confirm');
const { multiSelect } = require('./multi-select');
const { createSpinner, withSpinner } = require('./progress');
const { createTable } = require('./table');
const { colors, title, success, error, warning, info, init: initFormatter } = require('./formatter');

module.exports = {
  // Input
  input,
  inputUrl,
  inputNumber,

  // Select
  select,
  confirm,
  multiSelect,

  // Progress
  createSpinner,
  withSpinner,

  // Table
  createTable,

  // Formatter
  colors,
  title,
  success,
  error,
  warning,
  info,
  initFormatter
};
