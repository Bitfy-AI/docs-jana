#!/usr/bin/env node

/**
 * N8N Workflow Backup Tool
 * Downloads all workflows (or filtered by tag) from n8n via API
 *
 * Architecture:
 * - Factory Pattern: AuthFactory creates appropriate auth strategy
 * - Service Layer: WorkflowService handles business logic
 * - Utilities: Logger, HttpClient, FileManager, ConfigManager
 */

// Load .env file if it exists
const EnvLoader = require('./src/utils/env-loader');
EnvLoader.load();

const Logger = require('./src/utils/logger');
const HttpClient = require('./src/utils/http-client');
const FileManager = require('./src/utils/file-manager');
const ConfigManager = require('./src/utils/config-manager');
const AuthFactory = require('./src/auth/auth-factory');
const WorkflowService = require('./src/services/workflow-service');

/**
 * Main application class
 */
class N8nBackupApp {
  constructor() {
    this.configManager = new ConfigManager();
    this.config = null;
    this.logger = null;
    this.workflowService = null;
    this.fileManager = null;
  }

  /**
   * Initialize the application
   */
  initialize() {
    // Load and validate configuration
    this.config = this.configManager.load();
    const validation = this.configManager.validate();

    if (!validation.valid) {
      console.error('❌ ERRO DE CONFIGURAÇÃO:\n');
      validation.errors.forEach(error => console.error(`   - ${error}`));
      this.configManager.printUsage();
      process.exit(1);
    }

    // Initialize logger
    this.logger = new Logger({ logLevel: this.config.logLevel });

    // Print configuration summary
    this.logger.info('🚀 N8N Workflow Backup Tool\n');
    this.configManager.printSummary();

    // Create authentication strategy using Factory Pattern
    const authStrategy = AuthFactory.create({
      apiKey: this.config.apiKey,
      username: this.config.username,
      password: this.config.password,
    });

    this.logger.debug(`Using authentication strategy: ${authStrategy.getName()}`);

    // Initialize services
    const httpClient = new HttpClient(this.config.n8nUrl);
    this.workflowService = new WorkflowService(httpClient, authStrategy, this.logger);
    this.fileManager = new FileManager(this.logger);
  }

  /**
   * Run the backup process
   */
  async run() {
    try {
      // Step 1: List all workflows
      this.logger.section('Buscando workflows do n8n...');
      let workflows = await this.workflowService.listWorkflows();
      this.logger.success(`Encontrados ${workflows.length} workflows\n`);

      // Step 2: Filter by tag if specified
      if (this.config.tag) {
        workflows = this.workflowService.filterByTag(workflows, this.config.tag);
        this.logger.tag(this.config.tag);
        this.logger.success(`Filtrados ${workflows.length} workflows\n`);
      }

      // Check if we have workflows to download
      if (workflows.length === 0) {
        this.logger.warn('Nenhum workflow encontrado para download');
        return;
      }

      // Step 3: Create backup directory
      const backupDir = this.fileManager.createBackupDirectory();

      // Step 4: Download workflows
      this.logger.section('Baixando workflows...\n');
      const downloadResults = await this.workflowService.downloadWorkflows(workflows);

      // Step 5: Save workflows to files
      this.logger.section('\nSalvando arquivos...');
      const savedFiles = this.fileManager.saveWorkflows(
        backupDir,
        downloadResults.success
      );

      // Step 6: Save backup log
      const logData = {
        n8nUrl: this.config.n8nUrl,
        tag: this.config.tag || 'all',
        totalWorkflows: workflows.length,
        successCount: downloadResults.success.length,
        failedCount: downloadResults.failed.length,
        success: savedFiles,
        failed: downloadResults.failed,
      };

      this.fileManager.saveLog(backupDir, logData);

      // Step 7: Print summary
      this.printSummary(backupDir, logData);

      // Exit with appropriate code
      process.exit(downloadResults.failed.length > 0 ? 1 : 0);

    } catch (error) {
      this.logger.error(`Erro fatal: ${error.message}`);
      if (this.config.logLevel === 'debug') {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }

  /**
   * Print backup summary
   */
  printSummary(backupDir, logData) {
    const dirSize = this.fileManager.getDirectorySize(backupDir);

    this.logger.summary({
      '✅ Sucesso': logData.successCount,
      '❌ Falhas': logData.failedCount,
      '📁 Local': backupDir,
      '💾 Tamanho': this.fileManager.formatBytes(dirSize),
    });

    // Show failed workflows if any
    if (logData.failed.length > 0) {
      this.logger.warn('Workflows com falha:');
      logData.failed.forEach(f => {
        this.logger.error(`   - ${f.name} (${f.id}): ${f.error}`);
      });
      console.log('');
    }
  }
}

/**
 * Application entry point
 */
async function main() {
  const app = new N8nBackupApp();
  app.initialize();
  await app.run();
}

// Run the application
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Erro não tratado:', error);
    process.exit(1);
  });
}

module.exports = N8nBackupApp;