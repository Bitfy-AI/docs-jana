/**
 * N8N Validate Command
 * Validates workflows for duplicate internal IDs without downloading
 */

const EnvLoader = require('../utils/env-loader');
EnvLoader.load();

const Logger = require('../utils/logger');
const { HttpClientFactory } = require('../core/factories');
const ConfigManager = require('../utils/config-manager');
const AuthFactory = require('../auth/auth-factory');
const WorkflowService = require('../services/workflow-service');
const WorkflowValidator = require('../services/validation-wrapper');

class N8nValidateCommand {
  /**
   * Execute the validate command
   * @param {string[]} args - Command-line arguments
   */
  static async execute(args) {
    const app = new N8nValidateApp(process.argv.slice(0, 2).concat(args));
    app.parseArgs(args);

    if (app.showHelp) {
      app.printHelp();
      return;
    }

    await app.run();
  }
}

/**
 * N8N Validate Application
 *
 * Validates workflows directly from N8N instance without downloading.
 * Checks for duplicate internal IDs and generates detailed reports.
 *
 * @class N8nValidateApp
 */
class N8nValidateApp {
  constructor(argv = process.argv) {
    this.configManager = new ConfigManager(null, argv);
    this.config = null;
    this.logger = null;
    this.workflowService = null;
    this.workflowValidator = null;
    this.showHelp = false;
    this.tagFilter = null;
    this.useSource = false;
    this.outputReport = null;
  }

  /**
   * Parse command-line arguments
   */
  parseArgs(args) {
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      switch (arg) {
      case '--help':
      case '-h':
        this.showHelp = true;
        break;
      case '--tag':
      case '-t':
        this.tagFilter = args[++i];
        break;
      case '--source':
        this.useSource = true;
        break;
      case '--output':
      case '-o':
        this.outputReport = args[++i];
        break;
      }
    }
  }

  /**
   * Print help message
   */
  printHelp() {
    console.log(`
N8N Validate Command - Validate workflows for duplicate internal IDs

USAGE:
  docs-jana n8n:validate [options]

OPTIONS:
  --source              Validate SOURCE_N8N_URL instead of N8N_URL
  --tag, -t <tag>       Filter workflows by tag before validation
  --output, -o <file>   Save validation report to JSON file
  --help, -h            Show this help message

ENVIRONMENT VARIABLES:
  SOURCE_N8N_URL        Source N8N instance URL (for --source flag)
  SOURCE_N8N_API_KEY    Source N8N API key (for --source flag)
  N8N_URL               N8N instance URL (default)
  N8N_API_KEY           N8N API key (default)
  N8N_USERNAME          N8N username (for basic auth)
  N8N_PASSWORD          N8N password (for basic auth)
  N8N_TAG               Default tag filter (optional)

VALIDATION CHECKS:
  - Duplicate internal IDs detection
  - ID pattern matching (e.g., (AAA-BBB-001))
  - Workflow reference analysis
  - Suggestion generation for duplicates

EXAMPLES:
  # Validate all workflows in default N8N instance
  docs-jana n8n:validate

  # Validate only workflows with specific tag
  docs-jana n8n:validate --tag production

  # Validate SOURCE N8N instance
  docs-jana n8n:validate --source

  # Save validation report to file
  docs-jana n8n:validate --output ./validation-report.json

  # Validate specific tag and save report
  docs-jana n8n:validate --tag jana --output ./jana-validation.json

NOTES:
  - Faster than n8n:download since it doesn't download workflow files
  - Uses same validation engine as n8n:download
  - Reports saved to .jana/logs/validation.log by default
  - Exit code 0 = no duplicates, 1 = duplicates found
`);
  }

  /**
   * Initialize the application
   */
  initialize() {
    // Load and validate configuration
    try {
      this.config = this.configManager.load();
    } catch (error) {
      console.error('❌ Failed to load configuration:', error.message);
      console.error('\n💡 Tip: Make sure you have a .env file with N8N configuration');
      throw error;
    }

    // Map config
    this.config.baseUrl = this.config.n8nUrl;

    // Use SOURCE if requested
    if (this.useSource && this.config.sourceN8nUrl) {
      this.config.baseUrl = this.config.sourceN8nUrl;
      if (this.config.sourceApiKey) {
        this.config.apiKey = this.config.sourceApiKey;
      }
    }

    // Override with command-line args
    if (this.tagFilter) {
      this.config.tagFilter = this.tagFilter;
    }

    const validation = this.configManager.validate();

    if (!validation.valid) {
      console.error('❌ Configuration Error:\n');
      validation.errors.forEach(error => console.error(`   - ${error}`));
      throw new Error('Invalid configuration');
    }

    // Create logger
    this.logger = new Logger({
      logLevel: this.config.logLevel || 'info',
      enableColors: true
    });

    this.logger.info('🔧 Initializing N8N Workflow Validator...');

    // Create dependencies
    const authStrategy = AuthFactory.create(this.config);

    const httpClient = HttpClientFactory.create({
      baseUrl: this.config.baseUrl,
      headers: authStrategy.getHeaders(),
      maxRetries: this.config.maxRetries || 3,
      timeout: this.config.timeout || 30000
    });

    this.workflowService = new WorkflowService(httpClient, authStrategy, this.logger);
    this.workflowValidator = new WorkflowValidator(this.logger);
  }

  /**
   * Run the validation
   */
  async run() {
    this.initialize();

    this.logger.info(`📥 Fetching workflows from ${this.config.baseUrl}`);

    if (this.config.tagFilter) {
      this.logger.info(`🏷️  Filter by tag: ${this.config.tagFilter}`);
    }

    try {
      // Fetch workflows
      const workflows = await this.workflowService.listWorkflows();
      this.logger.info(`✅ Found ${workflows.length} workflows`);

      // Filter by tag if specified
      let filteredWorkflows = workflows;
      if (this.config.tagFilter) {
        filteredWorkflows = this.workflowService.filterByTag(workflows, this.config.tagFilter);
        this.logger.info(`🔍 After tag filtering: ${filteredWorkflows.length} workflows`);
      }

      if (filteredWorkflows.length === 0) {
        this.logger.warn('⚠️  No workflows to validate');
        return;
      }

      // Run validation
      this.logger.info('\n🔍 Running validation checks...\n');

      const validationResult = this.workflowValidator.validate(filteredWorkflows, {
        skipValidation: false,
        strict: false // Don't throw, just report
      });

      // Display results
      this.logger.info('\n' + '═'.repeat(50));
      this.logger.info('📊 VALIDATION RESULTS');
      this.logger.info('═'.repeat(50));

      if (validationResult.valid) {
        this.logger.success('\n✅ VALIDATION PASSED!');
        this.logger.success('   No duplicate internal IDs found.\n');
        this.logger.info(`   Total workflows validated: ${filteredWorkflows.length}`);
        this.logger.info(`   Validation duration: ${validationResult.duration}ms`);
      } else {
        this.logger.error('\n❌ VALIDATION FAILED!');
        this.logger.error(`   Found ${validationResult.duplicates.length} duplicate ID(s)\n`);

        // Display formatted messages
        if (validationResult.messages) {
          validationResult.messages.forEach(msg => {
            if (msg.includes('❌') || msg.includes('📍')) {
              this.logger.error(msg);
            } else if (msg.includes('→ Sugestão')) {
              this.logger.info(msg);
            } else if (msg.includes('💡')) {
              this.logger.warn(msg);
            } else {
              this.logger.info(msg);
            }
          });
        }

        this.logger.info('');
        this.logger.info(`   Total workflows: ${filteredWorkflows.length}`);
        this.logger.info(`   Workflows with duplicates: ${validationResult.duplicates.reduce((sum, dup) => sum + dup.n8nIDs.length, 0)}`);
        this.logger.info(`   Validation duration: ${validationResult.duration}ms`);

        if (validationResult.logPath) {
          this.logger.info(`\n📄 Detailed report saved to: ${validationResult.logPath}`);
        }
      }

      // Save custom output report if requested
      if (this.outputReport) {
        const fs = require('fs');
        const path = require('path');

        const reportPath = path.resolve(this.outputReport);
        const reportDir = path.dirname(reportPath);

        if (!fs.existsSync(reportDir)) {
          fs.mkdirSync(reportDir, { recursive: true });
        }

        const report = {
          timestamp: new Date().toISOString(),
          n8nInstance: this.config.baseUrl,
          tagFilter: this.config.tagFilter || null,
          totalWorkflows: filteredWorkflows.length,
          valid: validationResult.valid,
          duplicatesFound: validationResult.duplicates.length,
          duplicates: validationResult.duplicates,
          duration: validationResult.duration
        };

        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
        this.logger.info(`📁 Custom report saved to: ${reportPath}`);
      }

      this.logger.info('═'.repeat(50) + '\n');

      // Exit with appropriate code
      if (!validationResult.valid) {
        process.exit(1);
      }

    } catch (error) {
      this.logger.error(`\n❌ Validation failed: ${error.message}\n`);
      throw error;
    }
  }
}

module.exports = N8nValidateCommand;
