/**
 * Entry point for the interactive menu system
 *
 * Exports MenuOrchestrator as default and individual components for testing/extensibility
 */

const MenuOrchestrator = require('./components/MenuOrchestrator');

// Individual components (for testing and advanced usage)
const StateManager = require('./components/StateManager');
const ConfigManager = require('./components/ConfigManager');
const CommandHistory = require('./components/CommandHistory');
const ThemeEngine = require('./utils/ThemeEngine');
const AnimationEngine = require('./utils/AnimationEngine');
const KeyboardMapper = require('./utils/KeyboardMapper');
const InputHandler = require('./components/InputHandler');
const UIRenderer = require('./components/UIRenderer');

// Default export: MenuOrchestrator
module.exports = MenuOrchestrator;

// Named exports: Individual components
module.exports.MenuOrchestrator = MenuOrchestrator;
module.exports.StateManager = StateManager;
module.exports.ConfigManager = ConfigManager;
module.exports.CommandHistory = CommandHistory;
module.exports.ThemeEngine = ThemeEngine;
module.exports.AnimationEngine = AnimationEngine;
module.exports.KeyboardMapper = KeyboardMapper;
module.exports.InputHandler = InputHandler;
module.exports.UIRenderer = UIRenderer;
