/**
 * N8N Verify Command
 * Verifies migration integrity after upload using MigrationVerifier
 */

const EnvLoader = require('../utils/env-loader');
EnvLoader.load();

const Logger = require('../utils/logger');
const { HttpClientFactory } = require('../core/factories');
const ConfigManager = require('../utils/config-manager');
const AuthFactory = require('../auth/auth-factory');
const WorkflowService = require('../services/workflow-service');
const IDMappingService = require('../services/id-mapping-service');
const MigrationVerifier = require('../services/migration-verifier');
const fs = require('fs');
const path = require('path');

class N8nVerifyCommand {
  /**
   * Execute the verify command
   * @param {string[]} args - Command-line arguments
   */
  static async execute(args) {
    const app = new N8nVerifyApp(process.argv.slice(0, 2).concat(args));
    app.parseArgs(args);

    if (app.showHelp) {
      app.printHelp();
      return;
    }

    await app.run();
  }
}

/**
 * N8N Verify Application
 *
 * Verifies migration integrity after workflows have been uploaded to N8N.
 * Uses MigrationVerifier service to ensure ZERO broken links and complete migration.
 *
 * @class N8nVerifyApp
 */
class N8nVerifyApp {
  constructor(argv = process.argv) {
    // Use upload config schema since we're verifying uploaded workflows
    const uploadConfigSchema = require('../config/n8n-upload-config-schema');
    this.configManager = new ConfigManager(uploadConfigSchema, argv);
    this.config = null;
    this.logger = null;
    this.workflowService = null;
    this.idMappingService = null;
    this.migrationVerifier = null;
    this.showHelp = false;
    this.inputDir = null;
    this.mappingFile = null;
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
      case '--input':
      case '-i':
        this.inputDir = args[++i];
        break;
      case '--mapping':
      case '-m':
        this.mappingFile = args[++i];
        break;
      }
    }
  }

  /**
   * Print help message
   */
  printHelp() {
    console.log(`
N8N Verify Command - Verify migration integrity after upload

USAGE:
  docs-jana n8n:verify [options]

OPTIONS:
  --input, -i <dir>     Input directory with original workflow files (required)
  --mapping, -m <file>  ID mapping file (default: {input}/_id-mapping.json)
  --help, -h            Show this help message

ENVIRONMENT VARIABLES:
  TARGET_N8N_URL        Target N8N instance URL (required)
  TARGET_N8N_API_KEY    Target N8N API key (required)
  N8N_URL               Fallback N8N instance URL (if TARGET not set)
  N8N_API_KEY           Fallback N8N API key (if TARGET not set)

VERIFICATION CHECKS:
  1. Workflow Count      - All original workflows were created
  2. Workflow Creation   - No workflows missing
  3. Reference Integrity - All executeWorkflow references are valid
  4. Nodes Integrity     - Node counts match between original and created

EXAMPLES:
  # Verify migration using default mapping file
  docs-jana n8n:verify --input ./n8n/workflows

  # Verify with custom mapping file
  docs-jana n8n:verify --input ./workflows --mapping ./custom-mapping.json

NOTES:
  - Run this command AFTER completing n8n:upload
  - Requires _id-mapping.json from upload process
  - Reports any broken references or missing workflows
  - Exit code 0 = success, 1 = verification failed
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

    // Use TARGET N8N instance for verification
    if (this.config.targetN8nUrl) {
      this.config.baseUrl = this.config.targetN8nUrl;
      if (this.config.targetApiKey) {
        this.config.apiKey = this.config.targetApiKey;
      }
    } else {
      this.config.baseUrl = this.config.n8nUrl;
    }

    // Override with command-line args
    if (this.inputDir) {
      this.config.inputDir = this.inputDir;
    }

    // Validate inputDir is provided
    if (!this.config.inputDir) {
      console.error('❌ Configuration Error:\n');
      console.error('   - Input directory is required for verification');
      console.error('\n💡 Provide via --input flag or N8N_INPUT_DIR environment variable');
      throw new Error('Invalid configuration');
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

    this.logger.info('🔧 Initializing N8N Migration Verifier...');
    this.logger.info(`🎯 Target N8N: ${this.config.baseUrl}`);

    // Create dependencies
    const authStrategy = AuthFactory.create(this.config);

    const httpClient = HttpClientFactory.create({
      baseUrl: this.config.baseUrl,
      headers: authStrategy.getHeaders(),
      maxRetries: this.config.maxRetries || 3,
      timeout: this.config.timeout || 30000
    });

    this.workflowService = new WorkflowService(httpClient, authStrategy, this.logger);
    this.idMappingService = new IDMappingService(this.logger);
    this.migrationVerifier = new MigrationVerifier(
      this.workflowService,
      this.idMappingService,
      this.logger
    );
  }

  /**
   * Read original workflow files
   */
  readWorkflowFiles() {
    const inputDir = path.resolve(this.config.inputDir);
    this.logger.info(`📂 Reading original workflows from ${inputDir}`);

    if (!fs.existsSync(inputDir)) {
      throw new Error(`Input directory does not exist: ${inputDir}`);
    }

    const workflows = [];

    const readDir = (dir, relativePath = '') => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = relativePath ? path.join(relativePath, entry.name) : entry.name;

        if (entry.isDirectory()) {
          readDir(fullPath, relPath);
        } else if (entry.isFile() && entry.name.endsWith('.json') && !entry.name.startsWith('_')) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const workflow = JSON.parse(content);

            if (workflow.id && workflow.name) {
              workflows.push(workflow);
            }
          } catch (error) {
            this.logger.warn(`⚠️  Failed to read ${relPath}: ${error.message}`);
          }
        }
      }
    };

    readDir(inputDir);

    this.logger.info(`✅ Loaded ${workflows.length} original workflow files`);
    return workflows;
  }

  /**
   * Load ID mapping file
   */
  async loadIDMapping() {
    const mappingPath = this.mappingFile ||
      path.join(path.resolve(this.config.inputDir), '_id-mapping.json');

    this.logger.info(`📥 Loading ID mapping from ${mappingPath}`);

    if (!fs.existsSync(mappingPath)) {
      throw new Error(
        `ID mapping file not found: ${mappingPath}\n` +
        '💡 Tip: Run n8n:upload first to generate the mapping file'
      );
    }

    try {
      await this.idMappingService.loadFromFile(mappingPath);
      this.logger.success(`✅ Loaded ${this.idMappingService.getMappingCount()} ID mappings`);
    } catch (error) {
      throw new Error(`Failed to load ID mapping: ${error.message}`);
    }
  }

  /**
   * Run the verification
   */
  async run() {
    this.initialize();

    this.logger.info('\n🔍 Starting Migration Verification...\n');
    this.logger.info('━'.repeat(50));

    try {
      // Step 1: Read original workflows
      const originalWorkflows = this.readWorkflowFiles();

      if (originalWorkflows.length === 0) {
        this.logger.warn('⚠️  No workflows found in input directory');
        return;
      }

      // Step 2: Load ID mapping
      await this.loadIDMapping();

      // Step 3: Run verification
      this.logger.info('\n🔬 Running verification checks...\n');

      const results = await this.migrationVerifier.verify(originalWorkflows);

      // Step 4: Display results
      this.logger.info('\n' + '═'.repeat(50));
      this.logger.info('📊 VERIFICATION RESULTS');
      this.logger.info('═'.repeat(50));

      if (results.passed) {
        this.logger.success('\n✅ MIGRATION VERIFIED SUCCESSFULLY!');
        this.logger.success('   All workflows migrated with ZERO broken links.\n');
        this.logger.info(`   Total workflows: ${originalWorkflows.length}`);
        this.logger.info(`   All checks passed: ${results.summary.passedChecks}/${results.summary.totalChecks}`);
      } else {
        this.logger.error('\n❌ MIGRATION VERIFICATION FAILED!');
        this.logger.error(`   ${results.summary.failedChecks}/${results.summary.totalChecks} checks failed\n`);

        // Display issues summary
        const { issuesBySeverity } = results.summary;
        this.logger.error('   Issues found:');
        if (issuesBySeverity.critical > 0) {
          this.logger.error(`     - Critical: ${issuesBySeverity.critical}`);
        }
        if (issuesBySeverity.high > 0) {
          this.logger.error(`     - High: ${issuesBySeverity.high}`);
        }
        if (issuesBySeverity.medium > 0) {
          this.logger.warn(`     - Medium: ${issuesBySeverity.medium}`);
        }
        if (issuesBySeverity.low > 0) {
          this.logger.info(`     - Low: ${issuesBySeverity.low}`);
        }

        this.logger.info('');

        // Show first 10 issues
        if (results.issues.length > 0) {
          this.logger.warn('   First 10 issues:');
          results.issues.slice(0, 10).forEach((issue, i) => {
            this.logger.warn(`     ${i + 1}. [${issue.severity}] ${issue.message}`);
          });

          if (results.issues.length > 10) {
            this.logger.warn(`     ... and ${results.issues.length - 10} more issues`);
          }
        }
      }

      this.logger.info('═'.repeat(50) + '\n');

      // Exit with appropriate code
      if (!results.passed) {
        process.exit(1);
      }

    } catch (error) {
      this.logger.error(`\n❌ Verification failed: ${error.message}\n`);
      throw error;
    }
  }
}

module.exports = N8nVerifyCommand;
