/**
 * BaseCommand - Abstract base class for CLI commands
 *
 * Implements the Template Method pattern where execute() defines the algorithm
 * structure and run() is the customization point for subclasses.
 *
 * Features:
 * - Configuration parsing and validation
 * - Error handling and display
 * - Help text generation
 * - Logging setup
 * - Common initialization patterns
 *
 * @example
 * class MyCommand extends BaseCommand {
 *   constructor(argv) {
 *     const schema = {
 *       url: {
 *         type: 'string',
 *         required: true,
 *         env: 'MY_URL',
 *         flag: '--url',
 *         description: 'Service URL'
 *       }
 *     };
 *     super(schema, argv);
 *   }
 *
 *   getHelpText() {
 *     return {
 *       name: 'my:command',
 *       description: 'My command description',
 *       usage: 'docs-jana my:command [options]',
 *       options: [
 *         { flag: '--url <url>', description: 'Service URL' }
 *       ],
 *       examples: [
 *         { command: 'docs-jana my:command --url https://example.com', description: 'Basic usage' }
 *       ]
 *     };
 *   }
 *
 *   async run(config) {
 *     // Implementation here
 *     this.logger.info('Running command...');
 *   }
 * }
 */

const ConfigManager = require('../utils/config-manager');
const Logger = require('../utils/logger');

/**
 * Abstract base class for all CLI commands
 * @abstract
 */
class BaseCommand {
  /**
   * Create a new command
   * @param {Object} schema - Configuration schema for ConfigManager
   * @param {Array} argv - Command-line arguments (default: process.argv)
   * @param {Object} env - Environment variables (default: process.env)
   */
  constructor(schema, argv = process.argv, env = process.env) {
    if (new.target === BaseCommand) {
      throw new TypeError('Cannot instantiate abstract class BaseCommand directly');
    }

    this.schema = schema;
    this.argv = argv;
    this.env = env;
    this.configManager = null;
    this.config = null;
    this.logger = null;
    this.showHelp = false;
  }

  /**
   * Execute the command - Template Method pattern
   * This method defines the algorithm structure and delegates specific steps to subclasses
   *
   * Algorithm steps:
   * 1. Parse command-line arguments
   * 2. Check for help flag
   * 3. Parse configuration
   * 4. Validate configuration
   * 5. Initialize logger
   * 6. Run command implementation
   *
   * @param {string[]} args - Command-line arguments (without node/script prefix)
   * @returns {Promise<void>}
   */
  async execute(args) {
    try {
      // Step 1: Parse command-line arguments for help flag
      this.parseArgs(args);

      // Step 2: Check for help flag
      if (this.showHelp) {
        this.printHelp();
        return;
      }

      // Step 3: Parse configuration using ConfigManager
      this.config = this.parseConfig(args);

      // Step 4: Validate configuration
      const validation = this.validate(this.config);
      if (!validation.valid) {
        this.printErrors(validation.errors);
        throw new Error('Configuration validation failed');
      }

      // Step 5: Initialize logger
      this.initializeLogger(this.config);

      // Step 6: Run the command implementation (abstract method)
      await this.run(this.config);

    } catch (error) {
      // Handle errors gracefully
      if (this.logger) {
        this.logger.error(`Command execution failed: ${error.message}`);
      } else {
        console.error(`\n❌ Error: ${error.message}\n`);
      }

      // Don't show stack trace for validation errors
      if (error.message !== 'Configuration validation failed') {
        if (this.logger && this.logger.logLevel === 'debug') {
          this.logger.debug(error.stack);
        }
      }

      throw error;
    }
  }

  /**
   * Parse command-line arguments
   * Looks for common flags like --help, -h
   * Subclasses can override to add custom argument parsing
   *
   * @param {string[]} args - Command-line arguments
   */
  parseArgs(args) {
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      switch (arg) {
        case '--help':
        case '-h':
          this.showHelp = true;
          break;
      }
    }
  }

  /**
   * Parse configuration from all sources
   * Uses ConfigManager to load config from environment, CLI args, and defaults
   *
   * @param {string[]} args - Command-line arguments
   * @returns {Object} Parsed configuration
   */
  parseConfig(args) {
    // Create ConfigManager with schema
    // Pass argv starting from the actual command arguments
    // to prevent ConfigManager from picking up the command name
    const adjustedArgv = process.argv.slice(0, 2).concat(args);
    this.configManager = new ConfigManager(this.schema, adjustedArgv, this.env);

    try {
      return this.configManager.load();
    } catch (error) {
      if (error.validationErrors) {
        console.error('\n❌ Failed to load configuration:\n');
        error.validationErrors.forEach(err => console.error(`   - ${err}`));
        console.error('\n💡 Tip: Check your environment variables and command-line arguments');
        console.error('   Use --help to see available options\n');
      } else {
        console.error(`\n❌ Configuration error: ${error.message}\n`);
      }
      throw error;
    }
  }

  /**
   * Validate configuration
   * Uses ConfigManager's validate method and can be extended by subclasses
   *
   * @param {Object} config - Configuration to validate
   * @returns {Object} Validation result { valid: boolean, errors: string[] }
   */
  validate(config) {
    if (!this.configManager) {
      throw new Error('ConfigManager not initialized. Call parseConfig() first.');
    }

    const validation = this.configManager.validate();

    // Subclasses can add additional validation by overriding this method
    // and calling super.validate(config) first
    const customValidation = this.validateCustom(config);

    if (!customValidation.valid) {
      validation.valid = false;
      validation.errors = validation.errors.concat(customValidation.errors);
    }

    return validation;
  }

  /**
   * Custom validation hook for subclasses
   * Override this method to add command-specific validation
   *
   * @param {Object} config - Configuration to validate
   * @returns {Object} Validation result { valid: boolean, errors: string[] }
   */
  validateCustom(config) {
    return { valid: true, errors: [] };
  }

  /**
   * Print validation errors in a user-friendly format
   *
   * @param {string[]} errors - Array of error messages
   */
  printErrors(errors) {
    console.error('\n❌ Configuration Error:\n');
    errors.forEach(error => console.error(`   - ${error}`));
    console.error('\n💡 See help for available options:');
    console.error(`   ${this.getCommandName()} --help\n`);
  }

  /**
   * Initialize logger with configuration
   * Subclasses can override to customize logger setup
   *
   * @param {Object} config - Configuration object
   */
  initializeLogger(config) {
    this.logger = new Logger({
      logLevel: config.logLevel || 'info',
      enableTimestamp: config.enableTimestamp !== false,
      enableColors: true
    });
  }

  /**
   * Print help message
   * Uses getHelpText() to generate help content
   */
  printHelp() {
    const helpText = this.getHelpText();

    console.log(`
${helpText.name} - ${helpText.description}

USAGE:
  ${helpText.usage}
`);

    // Print options
    if (helpText.options && helpText.options.length > 0) {
      console.log('OPTIONS:');
      helpText.options.forEach(opt => {
        console.log(`  ${opt.flag.padEnd(25)} ${opt.description}`);
      });
      console.log('');
    }

    // Print environment variables
    if (helpText.environment && helpText.environment.length > 0) {
      console.log('ENVIRONMENT VARIABLES:');
      helpText.environment.forEach(env => {
        const required = env.required ? '(required)' : '(optional)';
        console.log(`  ${env.name.padEnd(25)} ${env.description} ${required}`);
      });
      console.log('');
    }

    // Print examples
    if (helpText.examples && helpText.examples.length > 0) {
      console.log('EXAMPLES:');
      helpText.examples.forEach(example => {
        console.log(`  # ${example.description}`);
        console.log(`  ${example.command}\n`);
      });
    }

    // Print notes
    if (helpText.notes && helpText.notes.length > 0) {
      console.log('NOTES:');
      helpText.notes.forEach(note => {
        console.log(`  - ${note}`);
      });
      console.log('');
    }
  }

  /**
   * Get help text for the command
   * Subclasses MUST override this method to provide command-specific help
   *
   * @returns {Object} Help text object with structure:
   *   {
   *     name: string,           // Command name (e.g., 'n8n:download')
   *     description: string,     // Brief description
   *     usage: string,          // Usage pattern
   *     options: Array<{flag, description}>,  // Command-line options
   *     environment: Array<{name, description, required}>, // Environment variables
   *     examples: Array<{command, description}>, // Usage examples
   *     notes: Array<string>    // Additional notes (optional)
   *   }
   * @abstract
   */
  getHelpText() {
    throw new Error('Subclasses must implement getHelpText()');
  }

  /**
   * Get the command name for display purposes
   * @returns {string} Command name
   */
  getCommandName() {
    const helpText = this.getHelpText();
    return helpText.name || 'docs-jana';
  }

  /**
   * Run the command implementation
   * Subclasses MUST override this method to implement command logic
   *
   * @param {Object} config - Validated configuration
   * @returns {Promise<void>}
   * @abstract
   */
  async run(config) {
    throw new Error('Subclasses must implement run(config)');
  }

  /**
   * Static factory method to execute a command
   * Convenience method for command entry points
   *
   * @param {Function} CommandClass - Command class to instantiate
   * @param {string[]} args - Command-line arguments
   * @returns {Promise<void>}
   *
   * @example
   * class MyCommand extends BaseCommand { ... }
   *
   * // In command entry point:
   * BaseCommand.executeCommand(MyCommand, process.argv.slice(3));
   */
  static async executeCommand(CommandClass, args) {
    const command = new CommandClass();
    await command.execute(args);
  }
}

module.exports = BaseCommand;
