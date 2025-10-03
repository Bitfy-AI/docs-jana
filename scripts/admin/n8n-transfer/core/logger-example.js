/**
 * Logger Usage Examples
 *
 * Este arquivo demonstra os diversos usos do Logger implementado.
 * Execute com: node scripts/admin/n8n-transfer/core/logger-example.js
 */

const Logger = require('./logger');
const path = require('path');

console.log('='.repeat(80));
console.log('LOGGER USAGE EXAMPLES - N8N Transfer System');
console.log('='.repeat(80));
console.log();

// =============================================================================
// Example 1: Logger básico (apenas console, nível INFO)
// =============================================================================
console.log('--- Example 1: Logger básico (console only, level INFO) ---');
const basicLogger = new Logger({
  level: 'INFO',
  enableFileLogging: false, // Desabilitar arquivo para este exemplo
  enableConsoleLogging: true,
});

basicLogger.debug('Esta mensagem NÃO será exibida (nível DEBUG < INFO)');
basicLogger.info('Transferência iniciada');
basicLogger.warn('Aviso: SOURCE e TARGET são a mesma instância');
basicLogger.error('Erro crítico na conexão');

console.log();

// =============================================================================
// Example 2: Logger com metadados
// =============================================================================
console.log('--- Example 2: Logger com metadados ---');
const metadataLogger = new Logger({
  level: 'DEBUG',
  enableFileLogging: false,
});

metadataLogger.info('Workflow transferido com sucesso', {
  workflowId: 'wf-12345',
  workflowName: 'Customer Onboarding',
  nodes: 15,
  connections: 20,
});

metadataLogger.error('Falha na requisição HTTP', {
  url: 'https://n8n.example.com/api/workflows',
  statusCode: 500,
  error: 'Internal Server Error',
});

console.log();

// =============================================================================
// Example 3: Mascaramento de dados sensíveis
// =============================================================================
console.log('--- Example 3: Mascaramento automático de dados sensíveis ---');
const securityLogger = new Logger({
  level: 'INFO',
  enableFileLogging: false,
});

securityLogger.info('Conectando ao SOURCE N8N com API key: n8n_api_1234567890abcdefghijklmnopqrstuvwxyz');
securityLogger.info('Bearer token detectado: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c');
securityLogger.warn('Credenciais detectadas no workflow', {
  credentials: {
    name: 'Gmail OAuth2',
    type: 'gmailOAuth2',
    apiKey: 'sk_test_1234567890abcdefghijklmnopqrstuvwxyz',
  },
});

console.log();

// =============================================================================
// Example 4: Logger com arquivo e DEBUG habilitado
// =============================================================================
console.log('--- Example 4: Logger com arquivo (./logs/transfer.log) ---');
const fileLogger = new Logger({
  level: 'DEBUG',
  enableFileLogging: true,
  enableConsoleLogging: true,
  logFilePath: path.join(__dirname, '..', 'logs', 'transfer.log'),
});

fileLogger.debug('Debug: Iniciando verificação de conectividade');
fileLogger.info('Conectado ao SOURCE N8N');
fileLogger.info('Conectado ao TARGET N8N');
fileLogger.debug('Carregando plugins: StandardDeduplicator, IntegrityValidator');
fileLogger.info('Transferindo 10 workflows');
fileLogger.warn('Workflow duplicado detectado: "Customer Onboarding"');
fileLogger.info('Transferência concluída', {
  total: 10,
  transferred: 8,
  skipped: 2,
  failed: 0,
});

console.log(`\nLogs salvos em: ${fileLogger.logFilePath}`);
console.log();

// =============================================================================
// Example 5: Graceful shutdown
// =============================================================================
console.log('--- Example 5: Fechando logger gracefully ---');
(async () => {
  fileLogger.info('Finalizando operações...');
  await fileLogger.close();
  console.log('Logger fechado com sucesso.');
  console.log();
  console.log('='.repeat(80));
  console.log('FIM DOS EXEMPLOS');
  console.log('='.repeat(80));
})();
