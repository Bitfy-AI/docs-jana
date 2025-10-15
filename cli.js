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

// const path = require('path');
// const fs = require('fs');

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
  'n8n:upload': {
    description: 'Upload workflows to N8N',
    handler: () => require('./src/commands/n8n-upload'),
    aliases: ['upload:n8n', 'n8n:restore']
  },
  'n8n:configure-target': {
    description: 'Configure target N8N instance for uploads',
    handler: () => require('./src/commands/n8n-configure-target'),
    aliases: ['n8n:config', 'config:n8n']
  },
  'outline:download': {
    description: 'Download documentation from Outline',
    handler: () => require('./src/commands/outline-download'),
    aliases: ['download:outline']
  },
  // TODO: Implement these commands without legacy dependencies
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
  try {
    // Try to use enhanced visual components
    const { TerminalDetector, BorderRenderer } = require('./src/ui/menu/visual');
    const visualConstants = require('./src/ui/menu/config/visual-constants');
    const ThemeEngine = require('./src/ui/menu/utils/ThemeEngine');
    const defaultTheme = require('./src/ui/menu/themes/default');

    // Initialize visual components
    const detector = new TerminalDetector();
    const capabilities = detector.detect();
    const themeEngine = new ThemeEngine(defaultTheme);
    const borderRenderer = new BorderRenderer(detector, visualConstants, themeEngine);

    // Detect if non-interactive mode (CI, piped output)
    const isNonInteractive = !capabilities.isInteractive || process.env.CI === 'true';

    if (isNonInteractive) {
      // Fallback to plain text help
      printHelpPlain();
      return;
    }

    // Use BorderRenderer for modern visual help
    const width = Math.min(capabilities.width, 90); // Max 90 columns for readability

    // Header with borders
    console.log('\n');
    console.log(borderRenderer.renderBox([
      `JANA WORKFLOWS v${CLI_VERSION}`,
      'Unified tool for documentation and workflow management'
    ], {
      style: 'double',
      padding: 1,
      align: 'center',
      color: 'primary'
    }));

    console.log('');

    // Usage section
    console.log(themeEngine.applyTheme('USAGE:', 'highlight'));
    console.log(`  ${CLI_NAME} <command> [options]`);
    console.log('');

    // Commands section with separator
    console.log(borderRenderer.renderSeparator(width, 'single'));
    console.log('');
    console.log(themeEngine.applyTheme('COMMANDS:', 'highlight'));
    console.log('');

    console.log(themeEngine.applyTheme('  N8N Workflows:', 'info'));
    console.log(`    ${themeEngine.applyTheme('n8n:download', 'primary')}          Download workflows from N8N instance`);
    console.log(`                          ${themeEngine.applyTheme('Aliases:', 'dimText')} n8n:backup, download:n8n`);
    console.log('');
    console.log(`    ${themeEngine.applyTheme('n8n:upload', 'primary')}            Upload workflows to N8N with preserved IDs`);
    console.log(`                          ${themeEngine.applyTheme('Aliases:', 'dimText')} upload:n8n, n8n:restore`);
    console.log('');

    console.log(themeEngine.applyTheme('  Outline Documentation:', 'info'));
    console.log(`    ${themeEngine.applyTheme('outline:download', 'primary')}      Download documentation from Outline`);
    console.log(`                          ${themeEngine.applyTheme('Aliases:', 'dimText')} download:outline`);
    console.log('');

    console.log(themeEngine.applyTheme('  Utility:', 'info'));
    console.log(`    ${themeEngine.applyTheme('help', 'primary')}                  Show this help message`);
    console.log(`                          ${themeEngine.applyTheme('Aliases:', 'dimText')} -h, --help`);
    console.log('');
    console.log(`    ${themeEngine.applyTheme('version', 'primary')}               Show version information`);
    console.log(`                          ${themeEngine.applyTheme('Aliases:', 'dimText')} -v, --version`);
    console.log('');

    // Examples section with separator
    console.log(borderRenderer.renderSeparator(width, 'single'));
    console.log('');
    console.log(themeEngine.applyTheme('EXAMPLES:', 'highlight'));
    console.log('');

    console.log(`  ${themeEngine.applyTheme('# Download N8N workflows with filtering', 'muted')}`);
    console.log(`  ${CLI_NAME} n8n:download --tag production --output ./workflows`);
    console.log('');
    console.log(`  ${themeEngine.applyTheme('# Upload N8N workflows with preserved IDs', 'muted')}`);
    console.log(`  ${CLI_NAME} n8n:upload --input ./n8n-workflows-2025-10-01T13-27-51`);
    console.log('');
    console.log(`  ${themeEngine.applyTheme('# Test upload without making changes', 'muted')}`);
    console.log(`  ${CLI_NAME} n8n:upload --input ./workflows --dry-run`);
    console.log('');
    console.log(`  ${themeEngine.applyTheme('# Download Outline documentation', 'muted')}`);
    console.log(`  ${CLI_NAME} outline:download --output ./docs`);
    console.log('');

    // Global options section with separator
    console.log(borderRenderer.renderSeparator(width, 'single'));
    console.log('');
    console.log(themeEngine.applyTheme('GLOBAL OPTIONS:', 'highlight'));
    console.log(`  ${themeEngine.applyTheme('--help, -h', 'primary')}            Show command-specific help`);
    console.log(`  ${themeEngine.applyTheme('--verbose, -v', 'primary')}         Enable verbose logging`);
    console.log(`  ${themeEngine.applyTheme('--config <file>', 'primary')}       Use specific config file`);
    console.log(`  ${themeEngine.applyTheme('--interactive, -i', 'primary')}     Force interactive menu mode`);
    console.log(`  ${themeEngine.applyTheme('--no-interactive', 'primary')}      Disable interactive menu`);
    console.log('');

    // Configuration section with box
    console.log(borderRenderer.renderBox([
      'CONFIGURATION:',
      'Create a .env file in the project root:',
      '',
      '  # N8N Configuration',
      '  N8N_URL=https://n8n.example.com',
      '  N8N_API_KEY=your-api-key',
      '',
      '  # Outline Configuration',
      '  OUTLINE_URL=https://outline.example.com',
      '  OUTLINE_API_TOKEN=your-api-token'
    ], {
      style: 'single',
      padding: 1,
      align: 'left',
      color: 'muted'
    }));

    console.log('');

    // Footer
    console.log(themeEngine.applyTheme('MORE INFO:', 'highlight'));
    console.log(`  Documentation: ${themeEngine.applyTheme('https://github.com/jana-team/docs-jana', 'info')}`);
    console.log(`  Issues: ${themeEngine.applyTheme('https://github.com/jana-team/docs-jana/issues', 'info')}`);
    console.log('');

  } catch (error) {
    // Fallback to plain text if visual components fail
    if (process.env.DEBUG) {
      console.error(`Visual help failed: ${error.message}, falling back to plain text`);
    }
    printHelpPlain();
  }
}

/**
 * Print plain text help (fallback for non-interactive mode or errors)
 */
function printHelpPlain() {
  console.log(`
Docs-Jana CLI v${CLI_VERSION}
Unified tool for documentation and workflow management

USAGE:
  ${CLI_NAME} <command> [options]

COMMANDS:

  N8N Workflows:
    n8n:download          Download workflows from N8N instance
                          Aliases: n8n:backup, download:n8n

    n8n:upload            Upload workflows to N8N instance with preserved IDs
                          Aliases: upload:n8n, n8n:restore

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

  # Upload N8N workflows with preserved IDs
  ${CLI_NAME} n8n:upload --input ./n8n-workflows-2025-10-01T13-27-51

  # Test upload without making changes
  ${CLI_NAME} n8n:upload --input ./workflows --dry-run

  # Download Outline documentation
  ${CLI_NAME} outline:download --output ./docs

  # Download specific Outline collections
  ${CLI_NAME} outline:download --collections "Engineering,Product"

GLOBAL OPTIONS:
  --help, -h            Show command-specific help
  --verbose, -v         Enable verbose logging
  --config <file>       Use specific config file
  --interactive, -i     Force interactive menu mode
  --no-interactive      Disable interactive menu (use direct command mode)

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
    ${CLI_NAME} n8n:upload --help
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
  console.error(`\n[ERROR] ${message}\n`);
  console.error(`Run '${CLI_NAME} help' for usage information.\n`);
  process.exit(exitCode);
}

// ===== MAIN CLI LOGIC =====

/**
 * Check if enhanced menu should be used
 * @returns {boolean}
 */
function shouldUseEnhancedMenu() {
  // Feature flag check - allow explicit disable only
  if (process.env.USE_ENHANCED_MENU === 'false') {
    return false;
  }

  // Default to TRUE (use enhanced menu)
  // Git Bash on Windows often has undefined process.stdin.isTTY
  // so we default to true and let showEnhancedMenu() handle errors
  return true;
}

/**
 * Show enhanced interactive menu (new implementation)
 */
async function showEnhancedMenu() {
  try {
    const MenuOrchestrator = require('./src/ui/menu');
    const menuOrchestrator = new MenuOrchestrator();

    // Show menu and wait for selection
    const result = await menuOrchestrator.show();

    // Handle result
    if (result.action === 'exit' || result.action === 'cancelled') {
      console.log('\nAté logo!\n');
      process.exit(0);
    }

    if (result.action === 'executed') {
      // Command was executed through menu
      if (result.success) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    }

    // Return selected command if menu only selected (didn't execute)
    return result.option?.command || null;

  } catch (error) {
    // If enhanced menu fails, fall back to legacy menu
    console.error(`\n[AVISO] Enhanced menu failed: ${error.message}`);
    console.error('Falling back to legacy menu...\n');
    return showLegacyMenu();
  }
}

/**
 * Show legacy interactive menu (fallback)
 */
async function showLegacyMenu() {
  const readline = require('readline');
  const fs = require('fs');
  const path = require('path');

  // Detecta ambiente
  const isProduction = (process.env.NODE_ENV || process.env.JANA_ENV || '').toLowerCase() === 'production';

  // Lê N8N configurado atual do .env
  let currentN8n = 'Nenhum configurado';
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const urlMatch = envContent.match(/TARGET_N8N_URL=(.+)/);
      if (urlMatch) {
        currentN8n = urlMatch[1].trim();
      }
    }
  } catch (error) {
    // Ignora erros ao ler .env
  }

  const menuOptions = [
    { key: '1', command: 'n8n:configure-target', label: `Configurar N8N Destino (atual: ${currentN8n})` },
    { key: '2', command: 'n8n:download', label: 'Baixar Workflows do N8N Source (salva em: n8n/workflows/)', visible: !isProduction },
    { key: '3', command: 'n8n:compare', label: 'Comparar Workflows (Local vs N8N Target)' },
    { key: '4', command: 'n8n:dry-run', label: 'Simular Envio (Dry Run - não modifica nada)' },
    { key: '5', command: 'n8n:upload', label: 'Enviar Workflows para N8N (ATENÇÃO: modifica workflows!)' },
    { key: '6', command: 'outline:download', label: 'Baixar Documentação do Outline', visible: !isProduction },
    { key: '7', command: 'history', label: 'Ver Histórico' },
    { key: '0', command: 'exit', label: 'Sair' }
  ].filter(opt => opt.visible !== false);

  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                        JANA WORKFLOWS v${CLI_VERSION}                         ║
║           Unified tool for documentation and workflow management          ║
╚═══════════════════════════════════════════════════════════════════════════╝

MENU PRINCIPAL - Selecione uma opção:
`);

  menuOptions.forEach(option => {
    console.log(`  [${option.key}] ${option.label}`);
  });

  console.log('');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('Digite o número da opção e pressione Enter: ', (answer) => {
      rl.close();

      const selected = menuOptions.find(opt => opt.key === answer.trim());

      if (!selected) {
        console.log('\n[ERRO] Opção inválida! Tente novamente.\n');
        resolve(null);
        return;
      }

      if (selected.command === 'exit') {
        console.log('\nAté logo!\n');
        process.exit(0);
      }

      resolve(selected.command);
    });
  });
}

/**
 * Show interactive menu (routes to enhanced or legacy)
 */
async function showInteractiveMenu() {
  if (shouldUseEnhancedMenu()) {
    return showEnhancedMenu();
  } else {
    return showLegacyMenu();
  }
}

/**
 * Parse command line arguments into structured format
 *
 * @param {string[]} argv - Process arguments
 * @returns {Object} Parsed context
 */
function parseArguments(argv) {
  const args = argv.slice(2);
  const command = args[0];
  const remainingArgs = args.slice(1);

  // Parse flags
  const flags = {};
  if (remainingArgs.includes('--verbose') || remainingArgs.includes('-v')) {
    flags.verbose = true;
  }
  if (remainingArgs.includes('--debug')) {
    flags.debug = true;
  }
  if (remainingArgs.includes('--dry-run')) {
    flags.dryRun = true;
  }

  return {
    command,
    args: remainingArgs,
    flags,
    env: process.env
  };
}

/**
 * Main CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);

  // Check for --interactive or -i flag
  const hasInteractiveFlag = args.includes('--interactive') || args.includes('-i');
  const hasNoInteractiveFlag = args.includes('--no-interactive');

  // Remove interactive flags from args for command parsing
  const filteredArgs = args.filter(arg =>
    arg !== '--interactive' &&
    arg !== '-i' &&
    arg !== '--no-interactive'
  );

  // Show interactive menu if:
  // 1. No arguments provided, OR
  // 2. --interactive/-i flag is present (even with command), OR
  // 3. Only flags provided (no command)
  const shouldShowMenu =
    (args.length === 0) ||
    (hasInteractiveFlag && !hasNoInteractiveFlag) ||
    (filteredArgs.length === 0 && !hasNoInteractiveFlag);

  if (shouldShowMenu) {
    const selectedCommand = await showInteractiveMenu();

    if (!selectedCommand) {
      return main(); // Try again
    }

    // Handle special commands in menu
    if (selectedCommand === 'help') {
      printHelp();
      return;
    }

    if (selectedCommand === 'version') {
      printVersion();
      return;
    }

    // Execute selected command via orchestration layer
    const { executeCommand } = require('./index');

    console.log(`\n[EXECUTANDO] ${selectedCommand}\n`);

    const result = await executeCommand({
      command: selectedCommand,
      args: [],
      flags: {},
      env: process.env
    });

    if (result.success) {
      console.log(`\n[SUCESSO] ${result.message}\n`);
      process.exit(0);
    } else {
      console.error(`\n[ERRO] ${result.message}\n`);
      if (result.error && process.env.DEBUG) {
        console.error('Error details:', result.error);
      }
      process.exit(1);
    }
  }

  // Direct command mode - use filteredArgs
  const commandInput = filteredArgs[0];

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

  // Execute command via orchestration layer
  const { executeCommand } = require('./index');
  const context = parseArguments(process.argv);
  context.command = commandName; // Override with canonical command name

  console.log(`\n[EXECUTANDO] ${commandName}\n`);

  const result = await executeCommand(context);

  if (result.success) {
    console.log(`\n[SUCESSO] ${result.message}\n`);
    process.exit(0);
  } else {
    console.error(`\n[ERRO] ${result.message}\n`);
    if (result.error && (process.env.DEBUG || context.flags.verbose)) {
      console.error('Error details:', result.error);
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

  console.error(`\n[ERRO] ${reason}`);

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

module.exports = { main, COMMANDS, findCommand, printHelp, printVersion };
