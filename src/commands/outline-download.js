/**
 * Outline Download Command
 *
 * Thin wrapper command that orchestrates downloading documentation from Outline.
 * Delegates business logic to OutlineService via OutlineAuthFactory.
 *
 * @module commands/outline-download
 */

const path = require('path');
const OutlineAuthFactory = require('../auth/outline-auth-factory');
const ConfigManager = require('../utils/config-manager');
const outlineConfigSchema = require('../config/outline-config-schema');

/**
 * Outline Download Command
 *
 * Downloads all documentation from an Outline instance, preserving hierarchical structure.
 * Uses configuration from CLI args, environment variables, or defaults.
 */
class OutlineDownloadCommand {
  /**
   * Execute the download command
   *
   * @param {string[]} args - Command-line arguments
   * @returns {Promise<void>}
   */
  static async execute(args) {
    const command = new OutlineDownloadCommand(args);
    await command.run();
  }

  /**
   * Creates command instance
   *
   * @param {string[]} args - Command-line arguments
   */
  constructor(args) {
    this.configManager = new ConfigManager(outlineConfigSchema, process.argv.slice(0, 2).concat(args));
  }

  /**
   * Run the download process
   *
   * Orchestrates the complete download workflow:
   * 1. Load and validate configuration
   * 2. Create OutlineService via factory
   * 3. Execute download
   * 4. Report results
   *
   * @returns {Promise<void>}
   * @throws {Error} If configuration is invalid or download fails
   */
  async run() {
    // Load and validate configuration
    const config = this.configManager.load();
    const validation = this.configManager.validate();

    if (!validation.valid) {
      console.error('Configuration Error:');
      validation.errors.forEach(err => console.error(`  - ${err}`));
      process.exit(1);
    }

    // Create service with all dependencies
    const outlineService = OutlineAuthFactory.create({
      apiToken: config.apiToken,
      baseUrl: config.url,
      delay: config.delay,
      verbose: config.verbose,
      logLevel: config.logLevel,
      maxRetries: config.maxRetries,
      timeout: config.timeout
    });

    // Execute download
    const results = await outlineService.downloadAllDocuments(
      config.outputDir,
      config.collections
    );

    // Report results
    this._reportResults(results);
  }

  /**
   * Report download results and exit with appropriate code
   *
   * @private
   * @param {object} results - Download results from OutlineService
   * @param {number} results.success - Number of successful downloads
   * @param {number} results.failed - Number of failed downloads
   * @param {number} results.totalDocs - Total documents processed
   */
  _reportResults(results) {
    if (results.failed === 0) {
      console.log('\n✅ All documents downloaded successfully!');
      process.exit(0);
    } else if (results.success > 0) {
      console.log('\n⚠️  Download completed with some failures.');
      process.exit(2);
    } else {
      console.error('\n❌ Download failed - no documents were downloaded.');
      process.exit(1);
    }
  }
}

module.exports = OutlineDownloadCommand;
