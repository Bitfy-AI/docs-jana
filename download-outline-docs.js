#!/usr/bin/env node

/**
 * Outline Documentation Downloader
 * Downloads markdown documents from Outline preserving full hierarchy
 *
 * This script uses the service layer architecture with dependency injection
 * for clean separation of concerns and testability.
 */

const path = require('path');
const OutlineAuthFactory = require('./src/auth/outline-auth-factory');
const Logger = require('./src/utils/logger');
require('dotenv').config();

// ===== COMMAND-LINE ARGUMENT PARSING =====
const args = process.argv.slice(2);
const config = {
  outputDir: null,
  delay: 200,
  collections: null,
  help: false,
  verbose: false,
};

// Parse command-line arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  switch (arg) {
    case '--help':
    case '-h':
      config.help = true;
      break;
    case '--output':
    case '-o':
      config.outputDir = args[++i];
      if (!config.outputDir) {
        console.error('Error: --output requires a directory path');
        process.exit(1);
      }
      break;
    case '--delay':
    case '-d':
      config.delay = parseInt(args[++i], 10);
      if (isNaN(config.delay) || config.delay < 0) {
        console.error('Error: --delay must be a positive number');
        process.exit(1);
      }
      break;
    case '--collections':
    case '-c':
      config.collections = args[++i];
      if (!config.collections) {
        console.error('Error: --collections requires a comma-separated list of IDs');
        process.exit(1);
      }
      config.collections = config.collections.split(',').map(s => s.trim());
      break;
    case '--verbose':
    case '-v':
      config.verbose = true;
      break;
    default:
      if (arg.startsWith('-')) {
        console.error(`Error: Unknown option: ${arg}`);
        console.error('Use --help to see available options');
        process.exit(1);
      }
  }
}

// Show help if requested
if (config.help) {
  console.log(`
Outline Documentation Downloader
Downloads markdown documents from Outline preserving full hierarchy

USAGE:
  node download-outline-docs.js [OPTIONS]

OPTIONS:
  -h, --help              Show this help message and exit
  -o, --output <dir>      Output directory for downloaded docs (default: ./docs)
  -d, --delay <ms>        Delay between API requests in milliseconds (default: 200)
  -c, --collections <ids> Comma-separated list of collection IDs to download
                          If not specified, all collections will be downloaded
  -v, --verbose           Enable verbose logging for detailed output

EXAMPLES:
  # Download all collections to default directory
  node download-outline-docs.js

  # Download to custom directory with custom delay
  node download-outline-docs.js --output ./my-docs --delay 500

  # Download specific collections only
  node download-outline-docs.js --collections "abc123,def456"

  # Verbose mode with custom settings
  node download-outline-docs.js -v -o ./docs -d 300

  # Show this help message
  node download-outline-docs.js --help

ENVIRONMENT VARIABLES:
  OUTLINE_URL           Your Outline instance URL (required)
  OUTLINE_API_TOKEN     Your Outline API token (required)

  These should be set in a .env file in the project root.

EXIT CODES:
  0   Success - all documents downloaded successfully
  1   Error - configuration error, API error, or fatal failures
  2   Partial success - some documents failed to download
`);
  process.exit(0);
}

// ===== MAIN EXECUTION =====
(async () => {
  try {
    // Validate environment variables
    const outlineUrl = process.env.OUTLINE_URL?.replace(/\/$/, '');
    const apiToken = process.env.OUTLINE_API_TOKEN;

    if (!outlineUrl || !apiToken) {
      console.error('Error: OUTLINE_URL and OUTLINE_API_TOKEN must be set in .env file');
      process.exit(1);
    }

    // Set output directory
    const outputDir = config.outputDir
      ? path.resolve(config.outputDir)
      : path.join(__dirname, 'docs');

    // Create logger
    const logger = new Logger({
      logLevel: config.verbose ? 'debug' : 'info',
      enableTimestamp: false
    });

    // Log configuration
    logger.info('Configuration:');
    logger.info(`  Output directory: ${outputDir}`);
    logger.info(`  API delay: ${config.delay}ms`);
    if (config.collections) {
      logger.info(`  Filter collections: ${config.collections.join(', ')}`);
    }
    logger.info('');

    // Create OutlineService using factory
    const outlineService = OutlineAuthFactory.create({
      apiToken,
      baseUrl: outlineUrl,
      delay: config.delay,
      verbose: config.verbose,
      logLevel: config.verbose ? 'debug' : 'info',
      maxRetries: 3,
      timeout: 30000
    });

    // Download all documents
    const results = await outlineService.downloadAllDocuments(
      outputDir,
      config.collections || []
    );

    // Determine exit code based on results
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
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    if (config.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
})();
