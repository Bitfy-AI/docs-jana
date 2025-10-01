/**
 * Migration Test Command
 * Wrapper for test-migration.js
 */

const path = require('path');

class TestMigrationCommand {
  static async execute(args) {
    // Delegate to original script
    const scriptPath = path.join(__dirname, '../../legacy/test-migration.js');
    require(scriptPath);
  }
}

module.exports = TestMigrationCommand;
