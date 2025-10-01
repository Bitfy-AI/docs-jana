/**
 * Outline Download Command
 * Wrapper for download-outline-docs.js
 */

const path = require('path');

class OutlineDownloadCommand {
  static async execute(args) {
    // Delegate to original script
    const scriptPath = path.join(__dirname, '../../download-outline-docs.js');
    require(scriptPath);
  }
}

module.exports = OutlineDownloadCommand;
