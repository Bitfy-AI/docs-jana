/**
 * N8N Upload Command
 * Wrapper for upload-n8n-workflows.js
 */

const path = require('path');

class N8nUploadCommand {
  static async execute(args) {
    // Delegate to original script
    const scriptPath = path.join(__dirname, '../../upload-n8n-workflows.js');
    const originalScript = require(scriptPath);

    // The original script runs immediately, so we just need to load it
    // In the future, refactor to export a function we can call
  }
}

module.exports = N8nUploadCommand;
