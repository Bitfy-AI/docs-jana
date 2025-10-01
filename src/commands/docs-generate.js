/**
 * Documentation Generation Command
 * Wrapper for generate-docs.js
 */

const path = require('path');

class DocsGenerateCommand {
  static async execute(args) {
    // Delegate to original script
    const scriptPath = path.join(__dirname, '../../generate-docs.js');
    require(scriptPath);
  }
}

module.exports = DocsGenerateCommand;
