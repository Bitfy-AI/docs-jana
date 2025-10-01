/**
 * Outline Integration Test Command
 * Wrapper for test-outline-integration.js
 */

const path = require('path');

class TestOutlineCommand {
  static async execute(args) {
    // Delegate to original script
    const scriptPath = path.join(__dirname, '../../test-outline-integration.js');
    require(scriptPath);
  }
}

module.exports = TestOutlineCommand;
