/**
 * Visual Components - Central exports
 * @module ui/menu/visual
 */

const TerminalDetector = require('./TerminalDetector');
const BorderRenderer = require('./BorderRenderer');
const LayoutManager = require('./LayoutManager');

// Components will be exported here as they are implemented
module.exports = {
  TerminalDetector,
  BorderRenderer,
  LayoutManager
  // IconMapper: require('./IconMapper'),
};
