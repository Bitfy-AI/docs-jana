#!/usr/bin/env node

/**
 * CLI DE EXEMPLO - IMPORTAÇÃO DE WORKFLOWS N8N
 *
 * Demonstra como usar o docs-jana para importar workflows
 */

// const path = require('path');
const fs = require('fs');

// Importa componentes do projeto principal
// const WorkflowService = require('../../src/services/workflow-service');
const WorkflowUploadService = require('../../src/services/workflow-upload-service');
const HttpClient = require('../../src/utils/http-client');
const Logger = require('../../src/utils/logger');
const FileManager = require('../../src/utils/file-manager');
const ConfigManager = require('../../src/utils/config-manager');
const AuthFactory = require('../../src/auth/auth-factory');

// Cores no console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Parse argumentos
const command = process.argv[2];
const args = process.argv.slice(3);

// Função para carregar configuração
function loadConfig() {
  try {
    const config = ConfigManager.loadN8NConfig();
    log('✅ Configuração carregada', 'green');
    return config;
  } catch (error) {
    log('❌ Erro ao carregar configuração: ' + error.message, 'red');
    log('💡 Certifique-se de ter um arquivo .env configurado', 'yellow');
    process.exit(1);
  }
}

// Comandos disponíveis
async function importWorkflows(workflowsPath) {
  log('\n🚀 Iniciando importação de workflows...', 'cyan');

  // 1. Carregar configuração
  const config = loadConfig();

  // 2. Verificar se o diretório existe
  if (!fs.existsSync(workflowsPath)) {
    log(`❌ Diretório não encontrado: ${workflowsPath}`, 'red');
    process.exit(1);
  }

  // 3. Criar dependências
  const logger = new Logger();
  const authStrategy = AuthFactory.createN8NAuth(config);
  const httpClient = new HttpClient(config.baseUrl, authStrategy, logger);
  const fileManager = new FileManager(logger);

  // 4. Criar serviço de upload
  const uploadService = new WorkflowUploadService(httpClient, fileManager, logger);

  try {
    // 5. Executar upload
    log(`📂 Lendo workflows de: ${workflowsPath}`, 'blue');

    const result = await uploadService.uploadWorkflows({
      inputPath: workflowsPath,
      dryRun: false,
      syncTags: true,
      force: false
    });

    // 6. Mostrar resultados
    log('\n✅ Importação concluída!', 'green');
    log(`📊 Workflows importados: ${result.uploaded}/${result.total}`, 'cyan');

    if (result.failed > 0) {
      log(`⚠️  Falhas: ${result.failed}`, 'yellow');
    }

  } catch (error) {
    log('\n❌ Erro durante importação:', 'red');
    log(error.message, 'red');
    process.exit(1);
  }
}

async function testConnection() {
  log('\n🔍 Testando conexão com N8N...', 'cyan');

  const config = loadConfig();
  const logger = new Logger();
  const authStrategy = AuthFactory.createN8NAuth(config);
  const httpClient = new HttpClient(config.baseUrl, authStrategy, logger);

  try {
    const response = await httpClient.get('/workflows');
    log('✅ Conexão bem-sucedida!', 'green');
    log(`📊 Workflows encontrados: ${response.data?.length || 0}`, 'cyan');
  } catch (error) {
    log('❌ Falha na conexão:', 'red');
    log(error.message, 'red');
    process.exit(1);
  }
}

function showHelp() {
  log('\n📖 CLI de Exemplo - Importação de Workflows N8N', 'cyan');
  log('='.repeat(50), 'blue');
  log('\nComandos:', 'yellow');
  log('  import <caminho>  - Importa workflows de um diretório');
  log('  test              - Testa conexão com N8N');
  log('  help              - Mostra esta ajuda');
  log('\nExemplos:', 'yellow');
  log('  node import-cli.js import ./workflows');
  log('  node import-cli.js test');
  log('');
}

// Router principal
(async () => {
  switch (command) {
  case 'import': {
    const workflowsPath = args[0] || './workflows';
    await importWorkflows(workflowsPath);
    break;
  }

  case 'test':
    await testConnection();
    break;

  case 'help':
  case undefined:
    showHelp();
    break;

  default:
    log(`❌ Comando desconhecido: ${command}`, 'red');
    showHelp();
    process.exit(1);
  }
})();
