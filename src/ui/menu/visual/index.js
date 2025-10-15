/**
 * Visual Components - Central exports
 * @module ui/menu/visual
 */

const TerminalDetector = require('./TerminalDetector');
const BorderRenderer = require('./BorderRenderer');
const LayoutManager = require('./LayoutManager');
const IconMapper = require('./IconMapper');
const { FallbackLogger, getGlobalLogger, resetGlobalLogger } = require('./FallbackLogger');

// All visual components
module.exports = {
  TerminalDetector,
  BorderRenderer,
  LayoutManager,
  IconMapper,
  FallbackLogger,
  getGlobalLogger,
  resetGlobalLogger
};
