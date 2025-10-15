#!/usr/bin/env node

/**
 * @module docs-jana
 * @description Docs-Jana - Main Entry Point & Orchestration Layer
 *
 * This module provides the orchestration layer for the CLI.
 * It implements Service Locator pattern for dependency management
 * and command orchestration.
 *
 * Architecture:
 * - ServiceContainer: Manages service instances with lazy loading
 * - CommandOrchestrator: Coordinates command execution lifecycle
 * - executeCommand(): Public API for running commands
 *
 * @example
 * const { executeCommand } = require('docs-jana');
 *
 * const result = await executeCommand({
 *   command: 'n8n:download',
 *   args: ['--output', './workflows'],
 *   flags: { verbose: true }
 * });
 */

// ===== TYPE DEFINITIONS =====

/**
 * Command context for execution
 *
 * @typedef {Object} CommandContext
 * @property {string} command - Command name (e.g., 'n8n:download')
 * @property {string[]} [args] - Command arguments
 * @property {CommandFlags} [flags] - Command flags
 * @property {Object} [env] - Environment variables
 */

/**
 * Command flags
 *
 * @typedef {Object} CommandFlags
 * @property {boolean} [verbose] - Enable verbose logging
 * @property {boolean} [debug] - Enable debug mode
 * @property {boolean} [dryRun] - Dry run mode (no changes)
 * @property {boolean} [force] - Force operation
 * @property {string} [output] - Output directory path
 * @property {string} [input] - Input directory path
 * @property {string} [tag] - Tag filter for workflows
 * @property {string} [folder] - Folder filter
 * @property {boolean} [syncTags] - Sync tags during upload
 * @property {boolean} [skipRemap] - Skip ID remapping
 * @property {string} [collections] - Collections filter (comma-separated)
 * @property {number} [delay] - Delay between requests (ms)
 * @property {string} [config] - Config file path
 */

/**
 * Command execution result
 *
 * @typedef {Object} CommandResult
 * @property {boolean} success - Whether command succeeded
 * @property {string} message - Result message
 * @property {any} [data] - Result data (if success)
 * @property {CommandError} [error] - Error details (if failed)
 */

/**
 * Command error details
 *
 * @typedef {Object} CommandError
 * @property {string} code - Error code (e.g., 'INVALID_CONTEXT', 'EXECUTION_ERROR')
 * @property {string} message - Error message
 * @property {string} [stack] - Stack trace (only if DEBUG mode enabled)
 */

// ===== SERVICE CONTAINER =====

/**
 * ServiceContainer - Service Locator Pattern Implementation
 *
 * Manages service instances with lazy instantiation and caching.
 * Provides centralized dependency management for the CLI.
 *
 * @class ServiceContainer
 */
class ServiceContainer {
  constructor() {
    /**
     * Registry of service factories
     * @type {Map<string, Function>}
     */
    this.factories = new Map();

    /**
     * Cache of instantiated services
     * @type {Map<string, any>}
     */
    this.instances = new Map();
  }

  /**
   * Register a service factory
   *
   * @param {string} name - Service name
   * @param {Function} factory - Factory function that creates service instance
   * @throws {Error} If name or factory is invalid
   *
   * @example
   * container.register('logger', (config) => new Logger(config));
   */
  register(name, factory) {
    if (!name || typeof name !== 'string') {
      throw new Error('Service name must be a non-empty string');
    }

    if (typeof factory !== 'function') {
      throw new Error('Service factory must be a function');
    }

    this.factories.set(name, factory);
  }

  /**
   * Resolve a service instance (lazy instantiation with caching)
   *
   * @param {string} name - Service name
   * @param {Object} config - Configuration to pass to factory
   * @returns {any} Service instance
   * @throws {Error} If service not registered
   *
   * @example
   * const logger = container.resolve('logger', { level: 'info' });
   */
  resolve(name, config = {}) {
    // Check if service is registered
    if (!this.factories.has(name)) {
      throw new Error(`Service '${name}' is not registered`);
    }

    // Return cached instance if available
    if (this.instances.has(name)) {
      return this.instances.get(name);
    }

    // Instantiate and cache
    const factory = this.factories.get(name);
    const instance = factory(config);
    this.instances.set(name, instance);

    return instance;
  }

  /**
   * Clear all cached instances (cleanup)
   *
   * Useful for releasing resources and testing.
   */
  clear() {
    this.instances.clear();
  }

  /**
   * Check if a service is registered
   *
   * @param {string} name - Service name
   * @returns {boolean}
   */
  has(name) {
    return this.factories.has(name);
  }

  /**
   * Get list of registered service names
   *
   * @returns {string[]}
   */
  getRegisteredServices() {
    return Array.from(this.factories.keys());
  }
}

// ===== COMMAND ORCHESTRATOR =====

/**
 * CommandOrchestrator - Coordinates command execution lifecycle
 *
 * Manages the full lifecycle of command execution:
 * 1. Initialize: Setup logger and register services
 * 2. Load Configuration: Load env and config files
 * 3. Resolve Command: Map command name to handler
 * 4. Execute: Run command with dependencies
 * 5. Cleanup: Release resources
 *
 * @class CommandOrchestrator
 */
class CommandOrchestrator {
  /**
   * @param {ServiceContainer} serviceContainer - Service container instance
   */
  constructor(serviceContainer) {
    if (!(serviceContainer instanceof ServiceContainer)) {
      throw new Error('ServiceContainer instance required');
    }

    this.container = serviceContainer;
    this.logger = null;
  }

  /**
   * Initialize orchestrator (setup logger and register services)
   *
   * @param {Object} context - Command context
   * @param {Object} context.flags - Command flags
   * @param {boolean} [context.flags.verbose] - Enable verbose logging
   */
  initialize(context) {
    // Create logger based on verbose flag
    const Logger = require('./src/utils/logger');
    const logLevel = context.flags?.verbose ? 'debug' : 'info';
    this.logger = new Logger(logLevel);

    // Register core services
    this.registerServices();

    this.logger.debug('CommandOrchestrator initialized');
  }

  /**
   * Register service factories in container
   * @private
   */
  registerServices() {
    const HttpClient = require('./src/utils/http-client');
    const FileManager = require('./src/utils/file-manager');
    const ConfigManager = require('./src/utils/config-manager');
    const AuthFactory = require('./src/auth/auth-factory');

    // Register Logger
    this.container.register('logger', () => this.logger);

    // Register HttpClient factory
    this.container.register('httpClient', (config) => {
      const authStrategy = AuthFactory.createN8NAuth(config);
      return new HttpClient(config.baseUrl, authStrategy, this.logger);
    });

    // Register FileManager
    this.container.register('fileManager', () => {
      return new FileManager(this.logger);
    });

    // Register ConfigManager
    this.container.register('configManager', () => ConfigManager);

    this.logger.debug(`Registered ${this.container.getRegisteredServices().length} services`);
  }

  /**
   * Load configuration
   *
   * @param {Object} context - Command context
   * @returns {Object} Configuration object
   */
  loadConfiguration(context) {
    const ConfigManager = this.container.resolve('configManager');

    // Construct argv-compatible array: ['node', 'script', 'command', ...args]
    const argv = ['node', 'cli.js', context.command, ...(context.args || [])];

    // Load based on command type
    if (context.command.startsWith('n8n:')) {
      const n8nConfigSchema = require('./src/config/n8n-config-schema');
      const configManager = new ConfigManager(n8nConfigSchema, argv, context.env);
      return configManager.load();
    }

    if (context.command.startsWith('outline:')) {
      const outlineConfigSchema = require('./src/config/outline-config-schema');
      const configManager = new ConfigManager(outlineConfigSchema, argv, context.env);
      return configManager.load();
    }

    return {};
  }

  /**
   * Resolve command handler
   *
   * @param {string} commandName - Command name (e.g., 'n8n:download')
   * @returns {Object} Command handler module
   * @throws {Error} If command not found
   */
  resolveCommandHandler(commandName) {
    const commandMap = {
      'n8n:download': './src/commands/n8n-download',
      'n8n:upload': './src/commands/n8n-upload',
      'n8n:configure-target': './src/commands/n8n-configure-target',
      'n8n:compare': './src/commands/n8n-compare',
      'n8n:dry-run': './src/commands/n8n-dry-run',
      'outline:download': './src/commands/outline-download'
    };

    const commandPath = commandMap[commandName];

    if (!commandPath) {
      throw new Error(`Unknown command: ${commandName}`);
    }

    return require(commandPath);
  }

  /**
   * Run command
   *
   * @param {Object} context - Command context
   * @param {string} context.command - Command name
   * @param {string[]} context.args - Command arguments
   * @returns {Promise<any>} Command result
   */
  async run(context) {
    this.logger.info(`Executing command: ${context.command}`);

    // Load configuration
    const config = this.loadConfiguration(context);
    this.logger.debug('Configuration loaded');

    // Resolve command handler
    const CommandHandler = this.resolveCommandHandler(context.command);
    this.logger.debug(`Command handler resolved: ${context.command}`);

    // Execute command
    const result = await CommandHandler.execute(context.args, config, this.container);
    this.logger.debug('Command execution completed');

    return result;
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.logger) {
      this.logger.debug('Cleaning up resources...');
    }

    this.container.clear();

    if (this.logger) {
      this.logger.debug('Cleanup completed');
    }
  }
}

// ===== PUBLIC API =====

/**
 * Execute a command with full orchestration
 *
 * This is the main entry point for programmatic command execution.
 * Handles the complete lifecycle: initialize → run → cleanup
 *
 * @param {CommandContext} context - Command context
 * @returns {Promise<CommandResult>} Command result
 *
 * @example
 * const result = await executeCommand({
 *   command: 'n8n:download',
 *   args: ['--output', './workflows'],
 *   flags: { verbose: true }
 * });
 *
 * @example
 * // Successful result
 * {
 *   success: true,
 *   message: "Command 'n8n:download' completed successfully",
 *   data: { workflows: 45 }
 * }
 *
 * @example
 * // Error result
 * {
 *   success: false,
 *   message: "Configuration Error: N8N_BASE_URL is required",
 *   error: {
 *     code: "EXECUTION_ERROR",
 *     message: "Configuration Error: N8N_BASE_URL is required"
 *   }
 * }
 */
async function executeCommand(context) {
  // Validate context
  if (!context || !context.command) {
    return {
      success: false,
      message: 'Invalid context: command is required',
      error: {
        code: 'INVALID_CONTEXT',
        message: 'Command is required in context object'
      }
    };
  }

  // Initialize defaults
  const ctx = {
    command: context.command,
    args: context.args || [],
    flags: context.flags || {},
    env: context.env || process.env
  };

  const container = new ServiceContainer();
  const orchestrator = new CommandOrchestrator(container);

  try {
    // Initialize
    orchestrator.initialize(ctx);

    // Run command
    const result = await orchestrator.run(ctx);

    // Return success
    return {
      success: true,
      message: `Command '${ctx.command}' completed successfully`,
      data: result
    };

  } catch (error) {
    // Return error
    const errorResult = {
      success: false,
      message: error.message || 'Command execution failed',
      error: {
        code: error.code || 'EXECUTION_ERROR',
        message: error.message
      }
    };

    // Include stack trace only in DEBUG mode
    if (process.env.DEBUG) {
      errorResult.error.stack = error.stack;
    }

    return errorResult;

  } finally {
    // Always cleanup
    orchestrator.cleanup();
  }
}

// ===== EXPORTS =====

module.exports = {
  ServiceContainer,
  CommandOrchestrator,
  executeCommand
};
