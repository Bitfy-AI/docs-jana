/**
 * N8N Download Command
 * Downloads workflows from N8N instance via API
 */

const EnvLoader = require('../utils/env-loader');
EnvLoader.load();

const Logger = require('../utils/logger');
const HttpClient = require('../utils/http-client');
const FileManager = require('../utils/file-manager');
const ConfigManager = require('../utils/config-manager');
const AuthFactory = require('../auth/auth-factory');
const WorkflowService = require('../services/workflow-service');

class N8nDownloadCommand {
  /**
   * Execute the download command
   * @param {string[]} args - Command-line arguments
   */
  static async execute(args) {
    // Pass argv starting from the actual command arguments
    // to prevent ConfigManager from picking up the command name
    const app = new N8nBackupApp(process.argv.slice(0, 2).concat(args));
    app.parseArgs(args);

    if (app.showHelp) {
      app.printHelp();
      return;
    }

    await app.run();
  }
}

/**
 * N8N Backup Application
 */
class N8nBackupApp {
  constructor(argv = process.argv) {
    this.configManager = new ConfigManager(null, argv);
    this.config = null;
    this.logger = null;
    this.workflowService = null;
    this.fileManager = null;
    this.showHelp = false;
    this.tagFilter = null;
    this.outputDir = null;
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
      case '--output':
      case '-o':
        this.outputDir = args[++i];
        break;
      }
    }
  }

  /**
   * Print help message
   */
  printHelp() {
    console.log(`
N8N Download Command - Download workflows from N8N

USAGE:
  docs-jana n8n:download [options]

OPTIONS:
  --tag, -t <tag>       Filter workflows by tag
  --output, -o <dir>    Output directory (default: ./n8n-workflows-TIMESTAMP)
  --help, -h            Show this help message

ENVIRONMENT VARIABLES:
  N8N_URL               N8N instance URL (required)
  N8N_API_KEY           N8N API key (required)
  N8N_USERNAME          N8N username (for basic auth)
  N8N_PASSWORD          N8N password (for basic auth)
  N8N_TAG               Filter workflows by tag (optional)

EXAMPLES:
  # Download all workflows
  docs-jana n8n:download

  # Download workflows with specific tag
  docs-jana n8n:download --tag production

  # Download to specific directory
  docs-jana n8n:download --output ./my-workflows
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
      console.error('   Example:\n');
      console.error('   N8N_URL=https://n8n.example.com');
      console.error('   N8N_API_KEY=your-api-key\n');
      throw error;
    }

    // Map config from ConfigManager schema to expected format
    // ConfigManager uses 'n8nUrl' but our code expects 'baseUrl'
    this.config.baseUrl = this.config.n8nUrl;
    this.config.tagFilter = this.config.tag;

    // Override with command-line args
    if (this.tagFilter) {
      this.config.tagFilter = this.tagFilter;
    }
    if (this.outputDir) {
      this.config.outputDir = this.outputDir;
    }

    const validation = this.configManager.validate();

    if (!validation.valid) {
      console.error('❌ Configuration Error:\n');
      validation.errors.forEach(error => console.error(`   - ${error}`));
      console.error('\n💡 See help for required environment variables:');
      console.error('   docs-jana n8n:download --help\n');
      throw new Error('Invalid configuration');
    }

    // Create logger
    this.logger = new Logger({
      logLevel: this.config.logLevel || 'info',
      enableColors: true
    });

    this.logger.info('🔧 Initializing N8N Backup...');

    // Create dependencies using Factory Pattern
    const authStrategy = AuthFactory.create(this.config);
    const httpClient = new HttpClient(
      this.config.baseUrl,
      authStrategy.getHeaders(),
      {
        maxRetries: this.config.maxRetries || 3,
        timeout: this.config.timeout || 30000
      }
    );

    this.fileManager = new FileManager(this.logger);
    this.workflowService = new WorkflowService(httpClient, authStrategy, this.logger);
  }

  /**
   * Run the backup
   */
  async run() {
    this.initialize();

    this.logger.info(`📥 Downloading workflows from ${this.config.baseUrl}`);

    if (this.config.tagFilter) {
      this.logger.info(`🏷️  Filter by tag: ${this.config.tagFilter}`);
    }

    // Fetch workflows
    const workflows = await this.workflowService.listWorkflows();
    this.logger.info(`✅ Found ${workflows.length} workflows`);

    // Filter by tag if specified
    let filteredWorkflows = workflows;
    if (this.config.tagFilter) {
      filteredWorkflows = this.workflowService.filterByTag(workflows, this.config.tagFilter);
      this.logger.info(`🔍 After filtering: ${filteredWorkflows.length} workflows`);
    }

    if (filteredWorkflows.length === 0) {
      this.logger.warn('⚠️  No workflows to download');
      return;
    }

    // Create output directory
    const outputDir = this.config.outputDir || this.fileManager.createBackupDirectory(process.cwd(), 'n8n-workflows');
    this.logger.info(`📁 Output directory: ${outputDir}`);

    // Download workflows with progress
    for (let i = 0; i < filteredWorkflows.length; i++) {
      const workflow = filteredWorkflows[i];
      this.logger.progress(
        i + 1,
        filteredWorkflows.length,
        `Downloading: ${workflow.name}`
      );

      try {
        const fullWorkflow = await this.workflowService.getWorkflow(workflow.id);
        this.fileManager.saveWorkflow(outputDir, fullWorkflow);
      } catch (error) {
        this.logger.error(`Failed to download workflow ${workflow.name}: ${error.message}`);
      }
    }

    this.logger.success(`\n✅ Download complete! Saved to ${outputDir}`);
    this.logger.info(`📊 Downloaded ${filteredWorkflows.length} workflows`);
  }
}

module.exports = N8nDownloadCommand;
