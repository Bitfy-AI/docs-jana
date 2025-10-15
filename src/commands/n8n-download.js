/**
 * N8N Download Command
 * Downloads workflows from N8N instance via API
 */

const EnvLoader = require('../utils/env-loader');
EnvLoader.load();

const Logger = require('../utils/logger');
const { HttpClientFactory } = require('../core/factories');
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
    this.noTagFilter = false;
    this.useSource = false;
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
      case '--no-tag-filter':
        this.noTagFilter = true;
        break;
      case '--source':
        this.useSource = true;
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
  --source              Download from SOURCE_N8N_URL instead of N8N_URL
  --tag, -t <tag>       Filter workflows by tag
  --no-tag-filter       Ignore N8N_TAG from .env and download all workflows
  --output, -o <dir>    Output directory (default: ./n8n-workflows-TIMESTAMP)
  --help, -h            Show this help message

ENVIRONMENT VARIABLES:
  SOURCE_N8N_URL        Source N8N instance URL (for download)
  SOURCE_N8N_API_KEY    Source N8N API key (for download)
  SOURCE_N8N_TAG        Source N8N tag filter (for download)
  N8N_URL               Fallback N8N instance URL (if SOURCE not set)
  N8N_API_KEY           Fallback N8N API key (if SOURCE not set)
  N8N_USERNAME          N8N username (for basic auth)
  N8N_PASSWORD          N8N password (for basic auth)
  N8N_TAG               Filter workflows by tag (optional)

EXAMPLES:
  # Download all workflows organized by tag
  docs-jana n8n:download --no-tag-filter

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

    // ConfigManager already handles SOURCE/TARGET fallback logic:
    // - If SOURCE_N8N_URL exists, it becomes config.n8nUrl
    // - If SOURCE_N8N_API_KEY exists, it becomes config.apiKey
    // - If SOURCE_N8N_TAG exists, it becomes config.tag
    this.config.tagFilter = this.config.tag;

    // Override with command-line args (highest priority)
    if (this.noTagFilter) {
      this.config.tagFilter = null;
    } else if (this.tagFilter) {
      this.config.tagFilter = this.tagFilter;
    }
    if (this.outputDir) {
      this.config.outputDir = this.outputDir;
    }

    // Log which instance we're using
    if (this.useSource && this.config.sourceN8nUrl) {
      this.logger.debug('Using SOURCE N8N instance from config');
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

    // Use HttpClientFactory to create HttpClient instance
    const httpClient = HttpClientFactory.create({
      baseUrl: this.config.baseUrl,
      headers: authStrategy.getHeaders(),
      maxRetries: this.config.maxRetries || 3,
      timeout: this.config.timeout || 30000
    });

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
      this.logger.info(`🔍 After tag filtering: ${filteredWorkflows.length} workflows`);
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

        // Organize by tag with layer priority
        const tags = fullWorkflow.tags || [];

        // Priority 1: Layer tags (A-F)
        // Priority 2: Filter tag (if specified)
        // Priority 3: First tag
        // Fallback: 'no-tag'
        let targetTag = 'no-tag';

        if (tags.length > 0) {
          // Define layer tag patterns (camadas)
          const layerPattern = /^\([A-F]\)/i;

          // Look for layer tag first (highest priority)
          const layerTag = tags.find(tag => layerPattern.test(tag.name));

          if (layerTag) {
            targetTag = layerTag.name;
          } else if (this.config.tagFilter) {
            // Use filter tag if no layer tag found
            const filterTag = tags.find(tag =>
              tag.name.toLowerCase() === this.config.tagFilter.toLowerCase()
            );
            targetTag = filterTag ? filterTag.name : tags[0].name;
          } else {
            // Use first tag as fallback
            targetTag = tags[0].name;
          }
        }

        // Sanitize tag name to remove invalid characters
        const safeTag = targetTag.replace(/[<>:"/\\|?*]/g, '-');

        // Create tag subfolder
        const targetDir = this.fileManager.ensureDirectory(outputDir, safeTag);

        this.fileManager.saveWorkflow(targetDir, fullWorkflow);
      } catch (error) {
        this.logger.error(`Failed to download workflow ${workflow.name}: ${error.message}`);
      }
    }

    this.logger.success(`\n✅ Download complete! Saved to ${outputDir}`);
    this.logger.info(`📊 Downloaded ${filteredWorkflows.length} workflows`);
  }
}

module.exports = N8nDownloadCommand;
