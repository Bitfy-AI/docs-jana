#!/usr/bin/env node

/**
 * Docs-Jana CLI - Unified Command-Line Interface
 *
 * A modern, unified CLI for managing documentation workflows:
 * - Download workflows from N8N
 * - Upload workflows to N8N
 * - Download documentation from Outline
 * - Generate documentation from sticky notes
 * - Run tests and migrations
 *
 * Architecture:
 * - Command pattern for extensibility
 * - Dependency injection for testability
 * - Factory pattern for service creation
 * - Clean separation of concerns
 */

const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

// ===== CLI METADATA =====
const CLI_VERSION = '2.0.0';
const CLI_NAME = 'docs-jana';

// ===== COMMAND REGISTRY =====
const COMMANDS = {
  'n8n:download': {
    description: 'Download workflows from N8N',
    handler: () => require('./src/commands/n8n-download'),
    aliases: ['n8n:backup', 'download:n8n']
  },
  'outline:download': {
    description: 'Download documentation from Outline',
    handler: () => require('./src/commands/outline-download'),
    aliases: ['download:outline']
  },
  // TODO: Implement these commands without legacy dependencies
  // 'n8n:upload': {
  //   description: 'Upload workflows to N8N',
  //   handler: () => require('./src/commands/n8n-upload'),
  //   aliases: ['upload:n8n']
  // },
  // 'docs:generate': {
  //   description: 'Generate markdown docs from workflow sticky notes',
  //   handler: () => require('./src/commands/docs-generate'),
  //   aliases: ['generate', 'generate:docs']
  // },
  // 'test:migration': {
  //   description: 'Run migration tests',
  //   handler: () => require('./src/commands/test-migration'),
  //   aliases: ['test:migrate']
  // },
  // 'test:outline': {
  //   description: 'Run Outline integration tests',
  //   handler: () => require('./src/commands/test-outline'),
  //   aliases: []
  // },
  'help': {
    description: 'Show this help message',
    handler: null,
    aliases: ['-h', '--help']
  },
  'version': {
    description: 'Show version information',
    handler: null,
    aliases: ['-v', '--version']
  }
};

// ===== HELPER FUNCTIONS =====

/**
 * Find command by name or alias
 * @param {string} input - Command name or alias
 * @returns {string|null} Canonical command name
 */
function findCommand(input) {
  // Check exact match
  if (COMMANDS[input]) {
    return input;
  }

  // Check aliases
  for (const [name, meta] of Object.entries(COMMANDS)) {
    if (meta.aliases.includes(input)) {
      return name;
    }
  }

  return null;
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                        📚 Docs-Jana CLI v${CLI_VERSION}                        ║
║           Unified tool for documentation and workflow management          ║
╚═══════════════════════════════════════════════════════════════════════════╝

USAGE:
  ${CLI_NAME} <command> [options]

COMMANDS:

  N8N Workflows:
    n8n:download          Download workflows from N8N instance
                          Aliases: n8n:backup, download:n8n

  Outline Documentation:
    outline:download      Download documentation from Outline
                          Aliases: download:outline

  Utility:
    help                  Show this help message
                          Aliases: -h, --help

    version               Show version information
                          Aliases: -v, --version

EXAMPLES:

  # Download N8N workflows with filtering
  ${CLI_NAME} n8n:download --tag production --output ./workflows

  # Download Outline documentation
  ${CLI_NAME} outline:download --output ./docs

  # Download specific Outline collections
  ${CLI_NAME} outline:download --collections "Engineering,Product"

GLOBAL OPTIONS:
  --help, -h            Show command-specific help
  --verbose, -v         Enable verbose logging
  --config <file>       Use specific config file

CONFIGURATION:
  Create a .env file in the project root with your configuration:

    # N8N Configuration
    N8N_URL=https://n8n.example.com
    N8N_API_KEY=your-api-key
    N8N_TAG=production

    # Outline Configuration
    OUTLINE_URL=https://outline.example.com
    OUTLINE_API_TOKEN=your-api-token

  See command-specific help for detailed options:
    ${CLI_NAME} n8n:download --help
    ${CLI_NAME} outline:download --help

MORE INFO:
  Documentation: https://github.com/jana-team/docs-jana
  Issues: https://github.com/jana-team/docs-jana/issues

`);
}

/**
 * Print version information
 */
function printVersion() {
  console.log(`
${CLI_NAME} version ${CLI_VERSION}

Platform: ${process.platform}
Node.js: ${process.version}
Architecture: ${process.arch}

Copyright (c) 2025 Jana Team
License: MIT
`);
}

/**
 * Print error message and exit
 * @param {string} message - Error message
 * @param {number} exitCode - Exit code (default: 1)
 */
function printError(message, exitCode = 1) {
  console.error(`\n❌ Error: ${message}\n`);
  console.error(`Run '${CLI_NAME} help' for usage information.\n`);
  process.exit(exitCode);
}

// ===== MAIN CLI LOGIC =====

/**
 * Main CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);

  // No arguments - show help
  if (args.length === 0) {
    printHelp();
    return;
  }

  const commandInput = args[0];

  // Find command
  const commandName = findCommand(commandInput);

  if (!commandName) {
    printError(`Unknown command: ${commandInput}`);
  }

  // Handle special commands
  switch (commandName) {
  case 'help':
    printHelp();
    return;

  case 'version':
    printVersion();
    return;
  }

  // Execute command
  const command = COMMANDS[commandName];

  try {
    console.log(`\n🚀 Executing: ${commandName}\n`);

    // Load command handler dynamically
    const CommandHandler = command.handler();
    const commandArgs = args.slice(1); // Remove command name

    // Execute command
    await CommandHandler.execute(commandArgs);

    console.log('\n✅ Command completed successfully\n');
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Command failed: ${error.message}\n`);

    if (process.env.DEBUG || args.includes('--verbose') || args.includes('-v')) {
      console.error('Stack trace:');
      console.error(error.stack);
    }

    process.exit(1);
  }
}

// ===== ERROR HANDLING =====

// FIX: Track shutdown state to prevent duplicate shutdown calls
let isShuttingDown = false;

/**
 * Graceful shutdown handler
 * Gives 100ms for resource cleanup before exiting
 * @param {string} reason - Reason for shutdown
 * @param {number} exitCode - Exit code (default: 1)
 */
function gracefulShutdown(reason, exitCode = 1) {
  // FIX: Prevent duplicate shutdown calls
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  console.error(`\n❌ ${reason}`);

  // FIX: Give 100ms for cleanup (flush logs, close connections, etc.)
  setTimeout(() => {
    process.exit(exitCode);
  }, 100);
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  if (process.env.DEBUG) {
    console.error('Stack trace:', error.stack);
  }
  gracefulShutdown(`Uncaught Exception: ${error.message}`, 1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  if (process.env.DEBUG) {
    console.error('Promise:', promise);
  }
  gracefulShutdown(`Unhandled Promise Rejection: ${reason}`, 1);
});

// FIX: Handle SIGINT (Ctrl+C) and SIGTERM for graceful shutdown
process.on('SIGINT', () => {
  gracefulShutdown('Received SIGINT (Ctrl+C), shutting down gracefully...', 0);
});

process.on('SIGTERM', () => {
  gracefulShutdown('Received SIGTERM, shutting down gracefully...', 0);
});

// ===== RUN CLI =====

if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { main, COMMANDS, findCommand };
