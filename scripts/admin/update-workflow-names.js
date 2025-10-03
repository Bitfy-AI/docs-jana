/**
 * Update Workflow Names Script
 *
 * Atualiza os nomes dos workflows na instância de origem (SOURCE)
 * usando o mapeamento definido em rename-mapping-atualizado.json
 *
 * ATENÇÃO: Este script modifica workflows na instância SOURCE n8n!
 *
 * Uso:
 *   node scripts/admin/update-workflow-names.js [--dry-run] [--verbose]
 *
 * Flags:
 *   --dry-run    Simula a atualização sem modificar nada
 *   --verbose    Exibe logs detalhados
 *   --help       Mostra esta ajuda
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Importar utilitários
const Logger = require('../../src/utils/logger');
const HttpClient = require('../../src/utils/http-client');
const AuthFactory = require('../../src/auth/auth-factory');

class WorkflowNameUpdater {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.verbose = options.verbose || false;

    // Configurar logger
    this.logger = new Logger({
      logLevel: this.verbose ? 'debug' : 'info',
      enableColors: true
    });

    // Validar variáveis de ambiente
    this.validateEnvironment();

    // Configurar cliente HTTP
    this.setupHttpClient();

    // Estatísticas
    this.stats = {
      total: 0,
      success: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };
  }

  /**
   * Valida variáveis de ambiente necessárias
   */
  validateEnvironment() {
    const required = ['SOURCE_N8N_URL', 'SOURCE_N8N_API_KEY'];
    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(', ')}\n` +
        'Please set them in your .env file.'
      );
    }

    this.sourceUrl = process.env.SOURCE_N8N_URL;
    this.apiKey = process.env.SOURCE_N8N_API_KEY;

    this.logger.info('✅ Environment validated');
    this.logger.debug(`SOURCE URL: ${this.sourceUrl}`);
  }

  /**
   * Configura cliente HTTP para API do n8n
   */
  setupHttpClient() {
    const authStrategy = AuthFactory.create({
      apiKey: this.apiKey,
      authMethod: 'api-key'
    });

    this.httpClient = new HttpClient(
      this.sourceUrl,
      authStrategy.getHeaders(),
      {
        maxRetries: 3,
        timeout: 30000
      }
    );

    this.logger.debug('HTTP Client configured');
  }

  /**
   * Carrega o arquivo de mapeamento
   */
  loadMapping() {
    const mappingPath = path.resolve(process.cwd(), 'rename-mapping-atualizado.json');

    if (!fs.existsSync(mappingPath)) {
      throw new Error(`Mapping file not found: ${mappingPath}`);
    }

    const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf-8'));
    this.logger.info(`📄 Loaded mapping with ${mapping.length} workflows`);

    return mapping;
  }

  /**
   * Testa conexão com a API
   */
  async testConnection() {
    try {
      const response = await this.httpClient.get('/api/v1/workflows?limit=1');
      this.logger.success('✅ API connection successful');
      return true;
    } catch (error) {
      this.logger.error('❌ API connection failed:', error.message);
      throw new Error('Cannot connect to SOURCE n8n API. Check credentials.');
    }
  }

  /**
   * Busca workflow por ID
   */
  async getWorkflow(workflowId) {
    try {
      const workflow = await this.httpClient.get(`/api/v1/workflows/${workflowId}`);
      return workflow;
    } catch (error) {
      this.logger.error(`Failed to fetch workflow ${workflowId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Atualiza nome do workflow
   */
  async updateWorkflowName(workflowId, newName) {
    try {
      const response = await this.httpClient.patch(`/api/v1/workflows/${workflowId}`, {
        name: newName
      });
      return response;
    } catch (error) {
      this.logger.error(`Failed to update workflow ${workflowId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Processa um workflow individual
   */
  async processWorkflow(mapping, index, total) {
    const { id, name, code } = mapping;
    const oldName = name.old;
    const newName = name.new;

    this.logger.progress(index + 1, total, `Processing: ${oldName}`);

    // Se old === new, pular
    if (oldName === newName) {
      this.logger.debug(`  ⏭️  SKIP: Name unchanged (${code})`);
      this.stats.skipped++;
      return { status: 'skipped', reason: 'Name unchanged' };
    }

    // Buscar workflow atual
    const workflow = await this.getWorkflow(id);

    if (!workflow) {
      this.logger.error(`  ❌ FAILED: Workflow not found (${code})`);
      this.stats.failed++;
      this.stats.errors.push({
        id,
        code,
        oldName,
        error: 'Workflow not found'
      });
      return { status: 'failed', reason: 'Workflow not found' };
    }

    // Verificar se o nome atual corresponde ao esperado
    if (workflow.name !== oldName) {
      this.logger.warn(`  ⚠️  WARNING: Current name "${workflow.name}" differs from expected "${oldName}"`);
      // Continuar mesmo assim
    }

    // Modo dry-run
    if (this.dryRun) {
      this.logger.info(`  🔍 DRY-RUN: Would update "${oldName}" → "${newName}"`);
      this.stats.success++;
      return { status: 'dry-run', oldName, newName };
    }

    // Atualizar nome
    try {
      await this.updateWorkflowName(id, newName);
      this.logger.success(`  ✅ UPDATED: "${oldName}" → "${newName}" (${code})`);
      this.stats.success++;
      return { status: 'success', oldName, newName };
    } catch (error) {
      this.logger.error(`  ❌ FAILED: ${error.message}`);
      this.stats.failed++;
      this.stats.errors.push({
        id,
        code,
        oldName,
        newName,
        error: error.message
      });
      return { status: 'failed', error: error.message };
    }
  }

  /**
   * Executa atualização em massa
   */
  async run() {
    const startTime = Date.now();

    this.logger.info('\n🚀 Starting Workflow Name Update');
    this.logger.info('═══════════════════════════════════════\n');

    if (this.dryRun) {
      this.logger.warn('⚠️  DRY-RUN MODE: No changes will be made\n');
    }

    // 1. Carregar mapeamento
    const mapping = this.loadMapping();
    this.stats.total = mapping.length;

    // 2. Testar conexão
    await this.testConnection();

    // 3. Processar cada workflow
    this.logger.info(`\n📝 Processing ${mapping.length} workflows...\n`);

    const results = [];
    for (let i = 0; i < mapping.length; i++) {
      const result = await this.processWorkflow(mapping[i], i, mapping.length);
      results.push(result);

      // Pequeno delay para evitar rate limiting
      await this.sleep(100);
    }

    // 4. Exibir sumário
    this.printSummary(startTime);

    // 5. Salvar log de erros se houver
    if (this.stats.errors.length > 0) {
      this.saveErrorLog();
    }

    return {
      success: this.stats.failed === 0,
      stats: this.stats,
      results
    };
  }

  /**
   * Exibe sumário da execução
   */
  printSummary(startTime) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    this.logger.info('\n═══════════════════════════════════════');
    this.logger.info('📊 SUMMARY');
    this.logger.info('═══════════════════════════════════════\n');

    this.logger.info(`Total workflows:     ${this.stats.total}`);
    this.logger.success(`✅ Successfully updated: ${this.stats.success}`);
    this.logger.warn(`⏭️  Skipped (unchanged): ${this.stats.skipped}`);
    this.logger.error(`❌ Failed:              ${this.stats.failed}`);
    this.logger.info(`⏱️  Duration:            ${duration}s\n`);

    if (this.stats.failed > 0) {
      this.logger.error(`⚠️  ${this.stats.failed} workflows failed to update. See error log.`);
    }

    if (this.dryRun) {
      this.logger.warn('\n⚠️  This was a DRY-RUN. No changes were made.');
      this.logger.info('   Run without --dry-run to apply changes.\n');
    } else {
      this.logger.success('\n✅ Workflow names updated successfully!\n');
    }
  }

  /**
   * Salva log de erros
   */
  saveErrorLog() {
    const logPath = path.resolve(process.cwd(), 'update-workflow-names-errors.log');
    const logContent = JSON.stringify(this.stats.errors, null, 2);

    fs.writeFileSync(logPath, logContent, 'utf-8');
    this.logger.info(`📄 Error log saved to: ${logPath}`);
  }

  /**
   * Delay helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// CLI EXECUTION
// ============================================================================

function printHelp() {
  console.log(`
Update Workflow Names Script

Updates workflow names in SOURCE n8n instance using rename-mapping-atualizado.json

USAGE:
  node scripts/admin/update-workflow-names.js [options]

OPTIONS:
  --dry-run     Simulate updates without making changes
  --verbose     Enable verbose logging
  --help        Show this help message

ENVIRONMENT VARIABLES (required):
  SOURCE_N8N_URL       Source n8n instance URL
  SOURCE_N8N_API_KEY   Source n8n API key

EXAMPLES:
  # Test run (no changes)
  node scripts/admin/update-workflow-names.js --dry-run

  # Update with verbose logs
  node scripts/admin/update-workflow-names.js --verbose

  # Actual update
  node scripts/admin/update-workflow-names.js

SAFETY:
  - Always run with --dry-run first
  - Backs up error log automatically
  - Uses rate limiting to avoid API overload
`);
}

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const options = {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose')
  };

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  try {
    const updater = new WorkflowNameUpdater(options);
    const result = await updater.run();

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

module.exports = WorkflowNameUpdater;
