/**
 * N8N Upload Command
 * Uploads workflows to N8N instance via API with preserved IDs
 */

const EnvLoader = require('../utils/env-loader');
EnvLoader.load();

const Logger = require('../utils/logger');
const HttpClient = require('../utils/http-client');
const FileManager = require('../utils/file-manager');
const ConfigManager = require('../utils/config-manager');
const AuthFactory = require('../auth/auth-factory');
const WorkflowService = require('../services/workflow-service');
const IDMappingService = require('../services/id-mapping-service');
const WorkflowIDRemapper = require('../services/workflow-id-remapper');
const UploadHistoryService = require('../services/upload-history-service');
const PlaceholderResolver = require('../utils/placeholder-resolver');
const fs = require('fs');
const path = require('path');

class N8nUploadCommand {
  /**
   * Execute the upload command
   * @param {string[]} args - Command-line arguments
   */
  static async execute(args) {
    // Pass argv starting from the actual command arguments
    // to prevent ConfigManager from picking up the command name
    const app = new N8nUploadApp(process.argv.slice(0, 2).concat(args));
    app.parseArgs(args);

    if (app.showHelp) {
      app.printHelp();
      return;
    }

    await app.run();
  }
}

/**
 * N8N Upload Application
 *
 * Handles uploading N8N workflows from JSON files to a target N8N instance.
 * Implements a three-phase upload process to handle workflow ID remapping:
 *
 * Phase 1: Initial Upload
 *   - Uploads all workflows to N8N
 *   - N8N assigns new IDs to each workflow
 *   - Builds old ID → new ID mapping
 *
 * Phase 2: Reference Remapping
 *   - Identifies workflows with executeWorkflow node references
 *   - Updates references to use new IDs from Phase 1
 *   - Saves ID mapping to _id-mapping.json
 *
 * Phase 3: Re-upload
 *   - Re-uploads workflows with corrected references
 *   - Uses --force mode to overwrite existing workflows
 *
 * @class N8nUploadApp
 */
class N8nUploadApp {
  /**
   * Create a new N8nUploadApp instance
   *
   * @param {string[]} argv - Command-line arguments (default: process.argv)
   */
  constructor(argv = process.argv) {
    // Load config schema for upload
    const uploadConfigSchema = require('../config/n8n-upload-config-schema');
    this.configManager = new ConfigManager(uploadConfigSchema, argv);
    this.config = null;
    this.logger = null;
    this.workflowService = null;
    this.fileManager = null;
    this.uploadHistory = null;
    this.showHelp = false;
    this.inputDir = null;
    this.dryRun = false;
    this.force = false;
    this.skipRemap = false;
    this.syncTags = false;
    this.folderFilter = null;
  }

  /**
   * Parse command-line arguments
   *
   * Supported arguments:
   *   --help, -h          Show help message
   *   --input, -i <dir>   Input directory with workflow JSON files
   *   --folder, -F <name> Filter workflows from specific subfolder
   *   --dry-run           Validate workflows without uploading
   *   --force, -f         Overwrite existing workflows
   *   --skip-remap        Skip ID remapping phase
   *   --sync-tags         Sync tags from source workflows to target N8N
   *
   * @param {string[]} args - Command-line arguments to parse
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
      case '--folder':
      case '-F':
        this.folderFilter = args[++i];
        break;
      case '--dry-run':
        this.dryRun = true;
        break;
      case '--force':
      case '-f':
        this.force = true;
        break;
      case '--skip-remap':
        this.skipRemap = true;
        break;
      case '--sync-tags':
        this.syncTags = true;
        break;
      }
    }
  }

  /**
   * Print help message
   */
  printHelp() {
    console.log(`
N8N Upload Command - Upload workflows to N8N with ID remapping

USAGE:
  docs-jana n8n:upload [options]

OPTIONS:
  --input, -i <dir>     Input directory with workflow JSON files (required)
  --folder, -F <name>   Filter workflows from specific subfolder (optional)
  --dry-run             Validate workflows without uploading
  --force, -f           Overwrite existing workflows
  --skip-remap          Skip ID remapping phase (default: false)
  --sync-tags           Sync tags from source workflows to target N8N (default: false)
  --skip-errors         Continue on errors (default: true)
  --help, -h            Show this help message

ENVIRONMENT VARIABLES:
  TARGET_N8N_URL        Target N8N instance URL (required for upload)
  TARGET_N8N_API_KEY    Target N8N API key (required)
  TARGET_N8N_TAG        Target N8N tag (future: apply to all uploaded workflows)
  N8N_URL               Fallback N8N instance URL (if TARGET not set)
  N8N_API_KEY           Fallback N8N API key (if TARGET not set)
  N8N_USERNAME          N8N username (for basic auth)
  N8N_PASSWORD          N8N password (for basic auth)
  N8N_TAG               Fallback tag (when TARGET_N8N_TAG not set)
  N8N_INPUT_DIR         Input directory path (optional)
  N8N_DRY_RUN           Enable dry-run mode (true/false)
  N8N_FORCE             Force overwrite existing workflows (true/false)
  N8N_SKIP_ERRORS       Continue on errors (true/false, default: true)

WORKFLOW UPLOAD PROCESS:
  Phase 1: Initial Upload
    - Uploads all workflows (N8N assigns new IDs)
    - Builds old ID → new ID mapping
    - Saves mapping to {input-dir}/_id-mapping.json

  Phase 2: Reference Remapping (unless --skip-remap is used)
    - Loads all uploaded workflows from JSON files
    - Updates all executeWorkflow node references with new IDs
    - Validates all references can be resolved

  Phase 3: Re-upload with Corrected References
    - Re-uploads workflows with updated ID references
    - Uses --force to overwrite existing workflows

EXAMPLES:
  # Upload workflows with automatic ID remapping
  docs-jana n8n:upload --input ./n8n-workflows-2025-10-01T13-27-51

  # Upload workflows from specific subfolder only
  docs-jana n8n:upload --input ./workflows --folder jana

  # Test upload without making changes
  docs-jana n8n:upload --input ./workflows --dry-run

  # Upload without ID remapping (if no executeWorkflow nodes exist)
  docs-jana n8n:upload --input ./workflows --skip-remap

  # Force overwrite existing workflows
  docs-jana n8n:upload --input ./workflows --force

  # Upload with specific target URL
  N8N_URL=https://n8n.refrisol.com.br docs-jana n8n:upload --input ./workflows

NOTES:
  - N8N assigns new IDs on upload; old IDs are not preserved
  - executeWorkflow node references are automatically updated with new IDs
  - ID mapping is saved to _id-mapping.json for reference
  - Existing workflows are skipped unless --force is used
  - Use --dry-run to validate before uploading
  - Use --skip-remap if workflows have no executeWorkflow nodes
  - Failed uploads are logged but don't stop the process by default
`);
  }

  /**
   * Initialize the application
   *
   * Performs the following initialization steps:
   * 1. Loads and validates configuration from environment and CLI args
   * 2. Creates Logger instance with configured log level
   * 3. Creates authentication strategy (API key or basic auth)
   * 4. Creates HttpClient with auth headers
   * 5. Creates FileManager and WorkflowService instances
   *
   * @throws {Error} If configuration is invalid or missing required fields
   */
  initialize() {
    // Load and validate configuration
    try {
      this.config = this.configManager.load();
    } catch (error) {
      console.error('❌ Failed to load configuration:', error.message);
      console.error('\n💡 Tip: Make sure you have a .env file with N8N configuration');
      console.error('   Example:\n');
      console.error('   N8N_URL=https://n8n.refrisol.com.br');
      console.error('   N8N_API_KEY=your-api-key\n');
      throw error;
    }

    // Map config from ConfigManager schema to expected format
    // For upload, use TARGET if available, otherwise fallback to N8N_URL
    if (this.config.targetN8nUrl) {
      this.config.baseUrl = this.config.targetN8nUrl;
      if (this.config.targetApiKey) {
        this.config.apiKey = this.config.targetApiKey;
      }
      this.logger?.info('🎯 Using TARGET N8N instance for upload');
    } else {
      this.config.baseUrl = this.config.n8nUrl;
      this.logger?.debug('Using default N8N_URL for upload');
    }

    // Override with command-line args
    if (this.inputDir) {
      this.config.inputDir = this.inputDir;
    }
    if (this.dryRun) {
      this.config.dryRun = this.dryRun;
    }
    if (this.force) {
      this.config.force = this.force;
    }

    // Validate inputDir is provided (required for upload operation)
    if (!this.config.inputDir) {
      console.error('❌ Configuration Error:\n');
      console.error('   - Input directory is required for upload');
      console.error('\n💡 Provide via --input flag or N8N_INPUT_DIR environment variable');
      console.error('   Example: docs-jana n8n:upload --input ./n8n-workflows-2025-10-01\n');
      throw new Error('Invalid configuration');
    }

    const validation = this.configManager.validate();

    if (!validation.valid) {
      console.error('❌ Configuration Error:\n');
      validation.errors.forEach(error => console.error(`   - ${error}`));
      console.error('\n💡 See help for required environment variables:');
      console.error('   docs-jana n8n:upload --help\n');
      throw new Error('Invalid configuration');
    }

    // Create logger
    this.logger = new Logger({
      logLevel: this.config.logLevel || 'info',
      enableColors: true
    });

    this.logger.info('🔧 Initializing N8N Upload...');
    this.logger.info(`🎯 Target N8N: ${this.config.baseUrl}`);

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
    this.uploadHistory = new UploadHistoryService(this.logger);
  }

  /**
   * Valida e resolve inputDir no momento de uso
   *
   * Resolve placeholders (ex: {timestamp}) antes de validar existência do diretório.
   * Garante que o diretório existe e é válido antes de prosseguir.
   *
   * @returns {string} Path resolvido e validado
   * @throws {Error} Se diretório não existir ou placeholder não puder ser resolvido
   */
  validateAndResolveInputDir() {
    let inputDir = this.config.inputDir;

    // Resolve placeholders if present
    if (PlaceholderResolver.hasPlaceholder(inputDir)) {
      const context = {
        baseDir: process.cwd(),
        explicitTimestamp: this.config.explicitTimestamp
      };

      try {
        const resolvedInputDir = PlaceholderResolver.resolve(inputDir, context);
        this.logger.info(`📁 Placeholder resolvido: ${inputDir} → ${resolvedInputDir}`);
        inputDir = resolvedInputDir;
      } catch (error) {
        throw new Error(
          'Failed to resolve placeholder in inputDir\n' +
          `   Original: ${inputDir}\n` +
          `   ${error.message}`
        );
      }
    }

    // Resolve relative paths
    const resolvedPath = path.isAbsolute(inputDir)
      ? inputDir
      : path.resolve(process.cwd(), inputDir);

    // Validate directory exists
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(
        `Directory does not exist: ${resolvedPath}\n` +
        `   Original config: ${this.config.inputDir}\n` +
        '   💡 Tip: Ensure the directory was created by \'n8n:download\' command'
      );
    }

    // Validate it's a directory
    const stats = fs.statSync(resolvedPath);
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: ${resolvedPath}`);
    }

    return resolvedPath;
  }

  /**
   * Read workflow files from input directory
   *
   * Reads all JSON files from the configured input directory and parses them
   * as workflow objects. Supports folder filtering and recursive reading.
   *
   * Skips files that:
   *   - Don't have .json extension
   *   - Start with underscore (e.g., _backup-log.json, _id-mapping.json)
   *   - Are missing required fields (id, name)
   *   - Cannot be parsed as valid JSON
   *
   * Features:
   *   - Folder filtering via --folder flag
   *   - Automatic tag detection from source folder name
   *   - Recursive reading of subdirectories
   *   - Placeholder resolution for dynamic paths
   *
   * @returns {Array<Object>} Array of workflow objects with id, name, nodes, connections, sourceFolder, etc.
   * @throws {Error} If input directory doesn't exist or placeholder cannot be resolved
   */
  readWorkflowFiles() {
    // Validate and resolve inputDir with placeholder support
    let inputDir = this.validateAndResolveInputDir();

    // Apply folder filter if specified
    if (this.folderFilter) {
      inputDir = path.join(inputDir, this.folderFilter);
      this.logger.info(`📂 Filtrando workflows da pasta: ${this.folderFilter}`);
    }

    this.logger.info(`📂 Reading workflows from ${inputDir}`);

    if (!fs.existsSync(inputDir)) {
      throw new Error(`Input directory does not exist: ${inputDir}`);
    }

    const workflows = [];

    // Recursive function to read workflows from directory
    const readDir = (dir, relativePath = '') => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = relativePath ? path.join(relativePath, entry.name) : entry.name;

        if (entry.isDirectory()) {
          // Recursively read subdirectories
          readDir(fullPath, relPath);
        } else if (entry.isFile()) {
          // Skip non-JSON files and backup logs
          if (!entry.name.endsWith('.json') || entry.name.startsWith('_')) {
            continue;
          }

          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const workflow = JSON.parse(content);

            // Validate workflow has required fields
            if (!workflow.id) {
              this.logger.warn(`⚠️  Skipping ${relPath}: missing workflow ID`);
              continue;
            }

            if (!workflow.name) {
              this.logger.warn(`⚠️  Skipping ${relPath}: missing workflow name`);
              continue;
            }

            // Extract source folder from file path
            const sourceFolder = relativePath || this.folderFilter || path.basename(path.dirname(fullPath));

            workflows.push({
              file: entry.name,
              filePath: relPath,
              sourceFolder,
              ...workflow
            });
          } catch (error) {
            this.logger.error(`❌ Failed to read ${relPath}: ${error.message}`);
          }
        }
      }
    };

    // Start recursive reading
    readDir(inputDir);

    this.logger.info(`✅ Found ${workflows.length} valid workflow files`);
    return workflows;
  }

  /**
   * Extract workflow references from workflows
   *
   * Analyzes workflows to find all executeWorkflow and toolWorkflow nodes
   * that reference other workflows. Builds a reference map showing which
   * workflows reference which other workflows.
   *
   * Supported node types:
   *   - n8n-nodes-base.executeWorkflow (standard workflow execution)
   *   - @n8n/n8n-nodes-langchain.toolWorkflow (LangChain workflow tool)
   *
   * @param {Array<Object>} workflows - Workflows to analyze
   * @returns {Object} Reference analysis with:
   *   - references: Map of referenced workflow ID → array of referencing nodes
   *   - referencingWorkflows: Array of workflow IDs that reference others
   *   - referencedIds: Array of workflow IDs that are referenced
   *   - totalReferences: Total number of reference links
   */
  extractWorkflowReferences(workflows) {
    const references = {};
    const referencingWorkflows = new Set();
    const referencedIds = new Set();

    workflows.forEach(workflow => {
      let hasReferences = false;

      workflow.nodes?.forEach(node => {
        // Check for executeWorkflow nodes
        if (node.type === 'n8n-nodes-base.executeWorkflow' && node.parameters?.workflowId) {
          const refId = node.parameters.workflowId.value;
          if (refId) {
            hasReferences = true;
            referencedIds.add(refId);

            if (!references[refId]) {
              references[refId] = [];
            }
            references[refId].push({
              sourceWorkflow: workflow.id,
              sourceWorkflowName: workflow.name,
              nodeName: node.name,
              nodeType: node.type
            });
          }
        }

        // Check for toolWorkflow nodes (LangChain)
        if (node.type === '@n8n/n8n-nodes-langchain.toolWorkflow' && node.parameters?.workflowId) {
          const refId = node.parameters.workflowId.value;
          if (refId) {
            hasReferences = true;
            referencedIds.add(refId);

            if (!references[refId]) {
              references[refId] = [];
            }
            references[refId].push({
              sourceWorkflow: workflow.id,
              sourceWorkflowName: workflow.name,
              nodeName: node.name,
              nodeType: node.type
            });
          }
        }
      });

      if (hasReferences) {
        referencingWorkflows.add(workflow.id);
      }
    });

    return {
      references,
      referencingWorkflows: Array.from(referencingWorkflows),
      referencedIds: Array.from(referencedIds),
      totalReferences: Object.values(references).flat().length
    };
  }

  /**
   * Validate workflows without uploading (dry-run mode)
   *
   * Performs validation checks on workflows without uploading them:
   *   - Checks for required fields (id, name, nodes, connections)
   *   - Detects workflows with executeWorkflow references
   *   - Analyzes workflow reference graph
   *   - Identifies missing referenced workflows
   *
   * Prints detailed validation results and warnings about potential issues.
   *
   * @param {Array<Object>} workflows - Workflows to validate
   */
  validateWorkflows(workflows) {
    this.logger.info('\n🔍 Validating workflows (dry-run mode)...\n');

    let validCount = 0;
    let invalidCount = 0;

    for (const workflow of workflows) {
      const issues = [];

      // Check required fields
      if (!workflow.id) issues.push('Missing ID');
      if (!workflow.name) issues.push('Missing name');
      if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
        issues.push('Missing or invalid nodes array');
      }
      if (!workflow.connections) {
        issues.push('Missing connections object');
      }

      // Check for workflow references in nodes
      const hasWorkflowReferences = workflow.nodes?.some(node =>
        node.type === 'n8n-nodes-base.executeWorkflow' ||
        node.type === '@n8n/n8n-nodes-langchain.toolWorkflow'
      );

      if (issues.length === 0) {
        validCount++;
        this.logger.success(`✅ ${workflow.name} (${workflow.id})`);
        if (hasWorkflowReferences) {
          this.logger.info('   └─ Contains workflow references (elo preserved)');
        }
      } else {
        invalidCount++;
        this.logger.error(`❌ ${workflow.name || workflow.file}`);
        issues.forEach(issue => this.logger.error(`   └─ ${issue}`));
      }
    }

    // Extract and display workflow references
    const refData = this.extractWorkflowReferences(workflows);

    this.logger.info('\n📊 Validation Summary:');
    this.logger.info(`   Valid:   ${validCount}`);
    this.logger.info(`   Invalid: ${invalidCount}`);
    this.logger.info(`   Total:   ${workflows.length}`);

    this.logger.info('\n🔗 Workflow Reference Analysis:');
    this.logger.info(`   Workflows with references: ${refData.referencingWorkflows.length}`);
    this.logger.info(`   Referenced workflow IDs:   ${refData.referencedIds.length}`);
    this.logger.info(`   Total reference links:     ${refData.totalReferences}`);

    // Warn about missing referenced workflows
    const workflowIds = new Set(workflows.map(w => w.id));
    const missingRefs = refData.referencedIds.filter(id => !workflowIds.has(id));

    if (missingRefs.length > 0) {
      this.logger.warn(`\n⚠️  Warning: ${missingRefs.length} referenced workflows are NOT in the upload set:`);
      missingRefs.forEach(id => {
        const refs = refData.references[id];
        this.logger.warn(`   - ${id} (referenced by ${refs.length} node(s))`);
        refs.forEach(ref => {
          this.logger.warn(`     └─ ${ref.sourceWorkflowName}: "${ref.nodeName}"`);
        });
      });
      this.logger.warn('\n   💡 These workflows must exist in the target N8N instance');
      this.logger.warn('      or be uploaded separately to avoid broken references.');
    }
  }

  /**
   * Phase 2 & 3: Remap workflow IDs and re-upload
   *
   * This method performs the ID remapping workflow:
   * 1. Loads the ID mapping from Phase 1
   * 2. Reads all workflow files from the input directory
   * 3. Uses WorkflowIDRemapper to update executeWorkflow node references
   * 4. Re-uploads workflows with corrected references using --force
   *
   * @param {Object} phase1Results - Results from initial upload (contains old→new ID mappings)
   * @returns {Promise<Object>} Remapping results with statistics
   */
  async remapAndReupload(phase1Results) {
    this.logger.info('\n🔄 Phase 2 & 3: ID Remapping & Re-upload');
    this.logger.info('━'.repeat(50));
    this.logger.info(`🎯 Target N8N: ${this.config.baseUrl}`);

    // Build ID mapping from Phase 1 results using IDMappingService
    const idMappingService = new IDMappingService(this.logger);
    const idMapping = {};

    [...phase1Results.created, ...phase1Results.updated].forEach(result => {
      if (result.oldId && result.newId) {
        idMapping[result.oldId] = result.newId;
        idMappingService.addMapping(result.oldId, result.newId, result.name || `workflow-${result.oldId}`);
      }
    });

    if (Object.keys(idMapping).length === 0) {
      this.logger.warn('⚠️  No ID mappings found from Phase 1, skipping remapping');
      return {
        remapped: 0,
        reuploadSucceeded: 0,
        reuploadFailed: 0,
        skipped: true
      };
    }

    // Save ID mapping to file
    const mappingFilePath = path.join(path.resolve(this.config.inputDir), '_id-mapping.json');
    try {
      await idMappingService.saveToFile(mappingFilePath);
      this.logger.success(`✅ ID mapping saved to: ${mappingFilePath}`);
      this.logger.info(`   Mapped ${Object.keys(idMapping).length} workflow IDs\n`);
    } catch (error) {
      this.logger.error(`❌ Failed to save ID mapping: ${error.message}`);
      // Continue anyway, we have the mapping in memory
    }

    // Read workflow files from input directory
    this.logger.info('📂 Loading workflows for remapping...');
    const workflows = this.readWorkflowFiles();

    // Check if any workflows have executeWorkflow nodes
    const workflowsWithReferences = workflows.filter(workflow => {
      return workflow.nodes?.some(node =>
        node.type === 'n8n-nodes-base.executeWorkflow' ||
        node.type === '@n8n/n8n-nodes-langchain.toolWorkflow'
      );
    });

    if (workflowsWithReferences.length === 0) {
      this.logger.info('✅ No workflows contain executeWorkflow nodes, skipping remapping');
      return {
        remapped: 0,
        reuploadSucceeded: 0,
        reuploadFailed: 0,
        skipped: true
      };
    }

    this.logger.info(`   Found ${workflowsWithReferences.length} workflows with executeWorkflow nodes\n`);

    // Remap workflow IDs in all workflows
    this.logger.info('🔧 Remapping workflow ID references...');
    const remapper = new WorkflowIDRemapper(this.logger);
    const remapResults = {
      remapped: 0,
      unresolvedReferences: [],
      reuploadSucceeded: 0,
      reuploadFailed: 0
    };

    const remappedWorkflows = [];

    for (const workflow of workflows) {
      try {
        // Find executeWorkflow nodes to check if remapping is needed
        const workflowNodes = remapper.findExecuteWorkflowNodes(workflow);

        if (workflowNodes.length === 0) {
          continue; // Skip workflows without workflow references
        }

        // Remap the workflow
        const remappedWorkflow = remapper.remapWorkflowReferences(workflow, idMapping);

        // Count remapped references
        const remappedCount = workflowNodes.length;
        remapResults.remapped += remappedCount;

        remappedWorkflows.push(remappedWorkflow);
        this.logger.success(`   ✅ ${workflow.name}: ${remappedCount} references remapped`);

      } catch (error) {
        this.logger.error(`   ❌ Failed to remap ${workflow.name}: ${error.message}`);
        if (this.config.skipErrors) {
          continue;
        } else {
          throw error;
        }
      }
    }

    // Phase 3: Re-upload with corrected references
    if (remappedWorkflows.length === 0) {
      this.logger.info('✅ No workflows need re-uploading\n');
      return remapResults;
    }

    this.logger.info(`\n🔄 Phase 3: Re-uploading ${remappedWorkflows.length} workflows with corrected references...\n`);

    // Re-upload workflows with --force to overwrite
    for (let i = 0; i < remappedWorkflows.length; i++) {
      const workflow = remappedWorkflows[i];
      const workflowName = workflow.name || `workflow-${workflow.id}`;

      try {
        this.logger.progress(i + 1, remappedWorkflows.length, `Re-uploading: ${workflowName}`);

        // Get the new ID from the mapping
        const newId = idMapping[workflow.id];
        if (!newId) {
          throw new Error(`No mapping found for workflow ID ${workflow.id}`);
        }

        // Update workflow with new ID for re-upload
        const workflowToUpload = {
          ...workflow,
          id: newId
        };

        // Re-upload with force=true to overwrite
        const result = await this.workflowService.uploadWorkflow(workflowToUpload, true);

        if (result.status === 'updated' || result.status === 'created') {
          remapResults.reuploadSucceeded++;
        } else if (result.status === 'failed') {
          remapResults.reuploadFailed++;
          this.logger.error(`   ❌ Failed to re-upload ${workflowName}: ${result.error}`);
        }
      } catch (error) {
        remapResults.reuploadFailed++;
        this.logger.error(`   ❌ Error re-uploading ${workflowName}: ${error.message}`);

        if (!this.config.skipErrors) {
          throw error;
        }
      }
    }

    return remapResults;
  }

  /**
   * Compara workflows locais com workflows no N8N target
   * Mostra quais workflows serão criados, atualizados ou são idênticos
   *
   * @param {Array} localWorkflows - Workflows locais a comparar
   * @returns {Promise<Object>} Resultado da comparação
   */
  async compareWorkflowsWithTarget(localWorkflows) {
    this.logger.info('\n🔍 Comparando workflows locais com N8N target...\n');

    try {
      // Busca workflows do target N8N
      const targetWorkflows = await this.workflowService.listWorkflows();

      // Cria mapa de workflows target por nome (para encontrar versões)
      const targetMap = new Map();
      targetWorkflows.forEach(wf => {
        targetMap.set(wf.name, wf);
      });

      const comparison = {
        new: [],
        updated: [],
        identical: [],
        versionChanges: []
      };

      for (const localWf of localWorkflows) {
        const targetWf = targetMap.get(localWf.name);

        if (!targetWf) {
          // Workflow novo
          comparison.new.push({
            name: localWf.name,
            localId: localWf.id,
            version: this.extractVersion(localWf.id)
          });
        } else {
          // Workflow existe no target
          const localVersion = this.extractVersion(localWf.id);
          const targetVersion = this.extractVersion(targetWf.id);

          if (localWf.id === targetWf.id) {
            // IDs idênticos - provavelmente sem mudanças
            comparison.identical.push({
              name: localWf.name,
              id: localWf.id,
              version: localVersion
            });
          } else {
            // IDs diferentes - workflow foi atualizado
            comparison.updated.push({
              name: localWf.name,
              localId: localWf.id,
              targetId: targetWf.id,
              localVersion,
              targetVersion
            });

            if (localVersion && targetVersion && localVersion !== targetVersion) {
              comparison.versionChanges.push({
                name: localWf.name,
                from: targetVersion,
                to: localVersion
              });
            }
          }
        }
      }

      // Exibe resultado da comparação
      this.logger.info('📊 Resultado da Comparação:\n');

      if (comparison.new.length > 0) {
        this.logger.info(`✨ Novos workflows (${comparison.new.length}):`);
        comparison.new.forEach(wf => {
          const versionInfo = wf.version ? ` (${wf.version})` : '';
          this.logger.info(`   + ${wf.name}${versionInfo}`);
        });
        this.logger.info('');
      }

      if (comparison.updated.length > 0) {
        this.logger.warn(`🔄 Workflows com mudanças (${comparison.updated.length}):`);
        comparison.updated.forEach(wf => {
          const localVer = wf.localVersion || wf.localId;
          const targetVer = wf.targetVersion || wf.targetId;
          this.logger.warn(`   ~ ${wf.name}`);
          this.logger.warn(`     Target: ${targetVer}`);
          this.logger.warn(`     Local:  ${localVer}`);
        });
        this.logger.info('');
      }

      if (comparison.identical.length > 0) {
        this.logger.success(`✓ Workflows idênticos (${comparison.identical.length}):`);
        comparison.identical.slice(0, 5).forEach(wf => {
          const versionInfo = wf.version ? ` (${wf.version})` : '';
          this.logger.success(`   = ${wf.name}${versionInfo}`);
        });
        if (comparison.identical.length > 5) {
          this.logger.success(`   ... e mais ${comparison.identical.length - 5} workflows`);
        }
        this.logger.info('');
      }

      if (comparison.versionChanges.length > 0) {
        this.logger.info(`📌 Mudanças de versão detectadas (${comparison.versionChanges.length}):`);
        comparison.versionChanges.forEach(change => {
          this.logger.info(`   ${change.name}: ${change.from} → ${change.to}`);
        });
        this.logger.info('');
      }

      return comparison;
    } catch (error) {
      throw new Error(`Failed to compare workflows: ${error.message}`);
    }
  }

  /**
   * Extrai versão do ID do workflow
   * Suporta padrões como: (AAA-AAA-001), (v1), (v2.0), etc.
   *
   * @param {string} workflowId - ID do workflow
   * @returns {string|null} Versão extraída ou null
   */
  extractVersion(workflowId) {
    if (!workflowId || typeof workflowId !== 'string') {
      return null;
    }

    // Procura por padrões de versão em parênteses
    // Ex: (AAA-AAA-001), (v1), (v2.0), (version-123)
    const versionMatch = workflowId.match(/\(([^)]+)\)/);
    if (versionMatch) {
      return versionMatch[1];
    }

    // Procura por padrões de versão sem parênteses no final
    // Ex: workflow-v1, workflow-v2.0, workflow-001
    const suffixMatch = workflowId.match(/[-_](v?\d+(?:\.\d+)*|[A-Z]{3}-[A-Z]{3}-\d{3})$/i);
    if (suffixMatch) {
      return suffixMatch[1];
    }

    return null;
  }

  /**
   * Run the upload
   */
  async run() {
    this.initialize();

    // Load and display upload history
    try {
      await this.uploadHistory.load();
      const historyDisplay = this.uploadHistory.formatLastN(3);
      if (this.uploadHistory.getEntryCount() > 0) {
        this.logger.info('');
        this.logger.info(historyDisplay);
        this.logger.info('');
      }
    } catch (error) {
      this.logger.debug(`Failed to load upload history: ${error.message}`);
    }

    if (this.config.dryRun) {
      this.logger.info('🧪 DRY-RUN MODE: No changes will be made');
    }

    if (this.config.force) {
      this.logger.warn('⚠️  FORCE MODE: Existing workflows will be overwritten');
    }

    // Read workflow files
    const workflows = this.readWorkflowFiles();

    if (workflows.length === 0) {
      this.logger.warn('⚠️  No workflows to upload');
      return;
    }

    // Dry-run mode: validate and compare
    if (this.config.dryRun) {
      this.validateWorkflows(workflows);

      // Compare workflows with target N8N
      try {
        await this.compareWorkflowsWithTarget(workflows);
      } catch (error) {
        this.logger.warn(`⚠️  Could not compare with target: ${error.message}`);
      }

      this.logger.info('\n✅ Dry-run complete. Use without --dry-run to upload.');
      return;
    }

    // Phase 1: Upload workflows
    this.logger.info('\n🔄 Phase 1: Initial Upload');
    this.logger.info('━'.repeat(50));
    this.logger.info(`🎯 Uploading to: ${this.config.baseUrl}`);
    this.logger.info('');

    const results = await this.workflowService.uploadWorkflows(
      workflows,
      this.config.force,
      this.config.skipErrors
    );

    // Print Phase 1 results summary
    this.logger.info('\n📊 Phase 1 Results:');
    this.logger.success(`   Created:  ${results.created.length}`);
    this.logger.success(`   Updated:  ${results.updated.length}`);
    this.logger.warn(`   Skipped:  ${results.skipped.length}`);
    this.logger.error(`   Failed:   ${results.failed.length}`);
    this.logger.info(`   Total:    ${results.total}`);

    // Print detailed results
    if (results.created.length > 0) {
      this.logger.info('\n✅ Created Workflows:');
      results.created.forEach(r => {
        this.logger.success(`   - ${r.name} (${r.id})`);
      });
    }

    if (results.updated.length > 0) {
      this.logger.info('\n🔄 Updated Workflows:');
      results.updated.forEach(r => {
        this.logger.success(`   - ${r.name} (${r.id})`);
      });
    }

    if (results.skipped.length > 0) {
      this.logger.info('\n⏭️  Skipped Workflows (already exist):');
      results.skipped.forEach(r => {
        this.logger.warn(`   - ${r.name} (${r.id})`);
      });
      this.logger.info('   💡 Use --force to overwrite existing workflows');
    }

    if (results.failed.length > 0) {
      this.logger.info('\n❌ Failed Workflows:');
      results.failed.forEach(r => {
        this.logger.error(`   - ${r.name} (${r.id}): ${r.error}`);
      });
    }

    // Phase 2 & 3: Remap workflow IDs and re-upload (unless --skip-remap)
    let remapResults = null;
    if (!this.skipRemap) {
      try {
        remapResults = await this.remapAndReupload(results);
      } catch (error) {
        this.logger.error(`❌ ID remapping failed: ${error.message}`);
        if (!this.config.skipErrors) {
          throw error;
        }
      }
    } else {
      this.logger.info('\n⏭️  Skipping ID remapping phase (--skip-remap flag set)');
    }

    // Final status with remapping statistics
    this.logger.info('\n' + '═'.repeat(50));
    this.logger.info('📊 FINAL SUMMARY');
    this.logger.info('═'.repeat(50));
    this.logger.info(`🎯 Target N8N: ${this.config.baseUrl}`);

    const successCount = results.created.length + results.updated.length;

    this.logger.info('\nPhase 1 (Initial Upload):');
    this.logger.success(`   Created:  ${results.created.length}`);
    this.logger.success(`   Updated:  ${results.updated.length}`);
    this.logger.warn(`   Skipped:  ${results.skipped.length}`);
    this.logger.error(`   Failed:   ${results.failed.length}`);

    if (remapResults && !remapResults.skipped) {
      this.logger.info('\nPhase 2 & 3 (ID Remapping & Re-upload):');
      this.logger.success(`   References remapped:  ${remapResults.remapped}`);
      this.logger.success(`   Re-upload succeeded:  ${remapResults.reuploadSucceeded}`);
      if (remapResults.reuploadFailed > 0) {
        this.logger.error(`   Re-upload failed:     ${remapResults.reuploadFailed}`);
      }
      if (remapResults.unresolvedReferences.length > 0) {
        this.logger.warn(`   Unresolved references: ${remapResults.unresolvedReferences.length}`);
      }
    }

    // Phase 4: Sync Tags (optional)
    if (this.syncTags) {
      this.logger.info('\n🔄 Phase 4: Syncing Tags');
      this.logger.info('━'.repeat(50));
      const tagResults = await this.syncWorkflowTags(workflows, results);
      this.logger.info('\nPhase 4 (Tag Sync):');
      this.logger.success(`   Tags synced:  ${tagResults.synced}`);
      if (tagResults.failed > 0) {
        this.logger.error(`   Failed:       ${tagResults.failed}`);
      }
    }

    // Overall status
    this.logger.info('');
    if (results.failed.length === 0 && (!remapResults || remapResults.reuploadFailed === 0)) {
      this.logger.success('✅ Upload complete! All workflows uploaded successfully.');
      if (remapResults && remapResults.remapped > 0) {
        this.logger.success(`   ${remapResults.remapped} workflow references were remapped and updated.`);
      }
    } else if (successCount > 0) {
      const totalFailed = results.failed.length + (remapResults ? remapResults.reuploadFailed : 0);
      this.logger.warn(`⚠️  Upload completed with errors. ${successCount} succeeded, ${totalFailed} failed.`);
    } else {
      throw new Error('Upload failed - no workflows were uploaded successfully');
    }

    this.logger.info('═'.repeat(50) + '\n');

    // Add entry to upload history
    try {
      const totalFailed = results.failed.length + (remapResults ? remapResults.reuploadFailed : 0);
      const folderName = this.folderFilter ||
        (workflows[0]?.sourceFolder) ||
        path.basename(this.config.inputDir);

      this.uploadHistory.addEntry({
        action: 'upload',
        summary: {
          total: results.total,
          succeeded: successCount,
          failed: totalFailed,
          folder: folderName
        },
        details: `${successCount}/${results.total} workflows uploaded successfully to ${this.config.baseUrl}`
      });

      await this.uploadHistory.save();
      this.logger.debug('Upload history saved successfully');
    } catch (error) {
      this.logger.debug(`Failed to save upload history: ${error.message}`);
    }
  }

  /**
   * Sync tags from source workflows to target N8N instance
   * Extracts tags from workflow JSON files and links them to uploaded workflows
   *
   * @param {Array} workflows - Array of workflow objects from JSON files
   * @param {Object} uploadResults - Results from Phase 1 upload
   * @returns {Promise<Object>} Tag sync results with synced and failed counts
   */
  async syncWorkflowTags(workflows, uploadResults) {
    const results = {
      synced: 0,
      failed: 0
    };

    // Build mapping of workflow name -> new workflow ID
    const workflowIdMap = new Map();
    [...uploadResults.created, ...uploadResults.updated].forEach(result => {
      workflowIdMap.set(result.name, result.newId || result.oldId);
    });

    this.logger.info(`Found ${workflows.length} workflows to sync tags\n`);

    for (const workflow of workflows) {
      try {
        // Extract tag names from workflow
        const tagNames = this._extractTagNames(workflow);

        if (tagNames.length === 0) {
          this.logger.debug(`No tags in workflow: ${workflow.name}`);
          continue;
        }

        // Get the workflow ID in target N8N
        const targetWorkflowId = workflowIdMap.get(workflow.name);
        if (!targetWorkflowId) {
          this.logger.warn(`⚠️  Workflow not found in upload results: ${workflow.name}`);
          results.failed++;
          continue;
        }

        // Get or create tags and collect their IDs
        const tagIds = [];
        for (const tagName of tagNames) {
          const tag = await this.workflowService.getOrCreateTag(tagName);
          tagIds.push(tag.id);
        }

        // Update workflow with tags
        await this.workflowService.updateWorkflowTags(targetWorkflowId, tagIds);

        this.logger.success(`✅ ${workflow.name}: synced ${tagNames.length} tag(s) [${tagNames.join(', ')}]`);
        results.synced++;

      } catch (error) {
        this.logger.error(`❌ Failed to sync tags for ${workflow.name}: ${error.message}`);
        results.failed++;
      }
    }

    return results;
  }

  /**
   * Extract tag names from workflow object
   * Uses sourceFolder as default tag if no tags are present
   *
   * @param {Object} workflow - Workflow object with tags array and sourceFolder
   * @returns {Array<string>} Array of tag names
   * @private
   */
  _extractTagNames(workflow) {
    const tags = [];

    // Extract tags from workflow.tags array
    if (workflow.tags && Array.isArray(workflow.tags)) {
      const extractedTags = workflow.tags
        .map(tag => {
          if (typeof tag === 'string') return tag;
          if (tag && typeof tag === 'object' && tag.name) return tag.name;
          return null;
        })
        .filter(name => name !== null);

      tags.push(...extractedTags);
    }

    // Use sourceFolder as default tag if no tags exist
    if (tags.length === 0 && workflow.sourceFolder) {
      tags.push(workflow.sourceFolder);
    }

    return tags;
  }
}

module.exports = N8nUploadCommand;
