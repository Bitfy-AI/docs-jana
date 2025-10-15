/**
 * @fileoverview Test Task 26 - TransferManager.validate() Standalone Validation
 *
 * Este teste valida:
 * - Validação sem transferir (apenas SOURCE, não TARGET)
 * - Filtros funcionam corretamente
 * - Múltiplos validators são executados
 * - Conta correta de errors/warnings
 * - Issues por workflow
 * - Não chama TARGET (apenas SOURCE)
 *
 * @module tests/test-task-26-validate
 */

const path = require('path');
const TransferManager = require('../core/transfer-manager');
const Logger = require('../core/logger');

// Mock data
const mockWorkflows = [
  {
    id: '1',
    name: 'Valid Workflow 1',
    nodes: [
      { id: 'node-1', name: 'Start', type: 'n8n-nodes-base.start', typeVersion: 1, position: [0, 0], parameters: {} }
    ],
    connections: {},
    tags: ['production'],
    active: true
  },
  {
    id: '2',
    name: 'Valid Workflow 2',
    nodes: [
      { id: 'node-1', name: 'Start', type: 'n8n-nodes-base.start', typeVersion: 1, position: [0, 0], parameters: {} }
    ],
    connections: {},
    tags: ['staging'],
    active: false
  },
  {
    id: '3',
    name: 'Invalid Workflow - No Nodes',
    nodes: [],
    connections: {},
    tags: ['production'],
    active: false
  },
  {
    id: '4',
    name: 'Workflow with Warning',
    nodes: [
      { id: 'node-1', name: 'Start', type: 'n8n-nodes-base.start', typeVersion: 1, position: [0, 0], parameters: {} }
    ],
    connections: {},
    tags: [],
    active: true,
    _hasWarning: true // Flag para simular warning
  }
];

// Mock validator que retorna erros/warnings baseado no workflow
class MockValidator {
  constructor(name) {
    this.name = name;
    this.enabled = true;
  }

  getName() {
    return this.name;
  }

  isEnabled() {
    return this.enabled;
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  validate(workflow) {
    const result = {
      valid: true,
      errors: [],
      warnings: []
    };

    // Detectar workflows inválidos (sem nodes)
    if (!workflow.nodes || workflow.nodes.length === 0) {
      result.valid = false;
      result.errors.push('Workflow must have at least one node');
    }

    // Detectar workflows com warnings (simulado via flag)
    if (workflow._hasWarning) {
      result.warnings.push('Workflow contains deprecated configuration');
    }

    return result;
  }
}

// Mock PluginRegistry
class MockPluginRegistry {
  constructor() {
    this.plugins = {
      'integrity-validator': new MockValidator('integrity-validator'),
      'schema-validator': new MockValidator('schema-validator')
    };
  }

  get(name, type) {
    if (type === 'validator') {
      return this.plugins[name] || null;
    }
    return null;
  }

  getAll() {
    return Object.values(this.plugins);
  }
}

// Mock HttpClient para SOURCE
class MockSourceHttpClient {
  constructor() {
    this.getWorkflowsCalled = 0;
    this.testConnectionCalled = 0;
  }

  async testConnection() {
    this.testConnectionCalled++;
    return { success: true };
  }

  async getWorkflows() {
    this.getWorkflowsCalled++;
    return mockWorkflows;
  }
}

// Mock HttpClient para TARGET (não deve ser chamado)
class MockTargetHttpClient {
  constructor() {
    this.testConnectionCalled = 0;
    this.getWorkflowsCalled = 0;
    this.createWorkflowCalled = 0;
  }

  async testConnection() {
    this.testConnectionCalled++;
    throw new Error('TARGET should not be called during validate()');
  }

  async getWorkflows() {
    this.getWorkflowsCalled++;
    throw new Error('TARGET should not be called during validate()');
  }

  async createWorkflow() {
    this.createWorkflowCalled++;
    throw new Error('TARGET should not be called during validate()');
  }
}

/**
 * Executa teste do método validate()
 */
async function runTest() {
  console.log('='.repeat(80));
  console.log('TEST: TransferManager.validate() - Task 26');
  console.log('='.repeat(80));

  try {
    // Setup
    const logger = new Logger({ level: 'info' });
    const mockSourceClient = new MockSourceHttpClient();
    const mockTargetClient = new MockTargetHttpClient();
    const mockPluginRegistry = new MockPluginRegistry();

    const config = {
      SOURCE: { url: 'https://source.n8n.io', apiKey: 'source-key' },
      TARGET: { url: 'https://target.n8n.io', apiKey: 'target-key' }
    };

    const manager = new TransferManager(config, { logger, pluginRegistry: mockPluginRegistry });

    // Injetar mocks
    manager.sourceClient = mockSourceClient;
    manager.targetClient = mockTargetClient;

    console.log('\n1️⃣  TEST: Validar todos workflows (sem filtros)');
    console.log('-'.repeat(80));
    const result1 = await manager.validate();

    console.log('✓ Resultado:', {
      total: result1.total,
      valid: result1.valid,
      invalid: result1.invalid,
      errors: result1.errors,
      warnings: result1.warnings,
      validators: result1.validators
    });

    // Asserções
    if (result1.total !== 4) throw new Error(`Expected total=4, got ${result1.total}`);
    // Note: Workflows com warnings (mas sem errors) também aparecem em 'invalid' porque têm issues
    // Valid = workflows SEM nenhum issue (nem error nem warning)
    // Invalid = workflows COM issues (errors OU warnings)
    if (result1.valid !== 2) throw new Error(`Expected valid=2, got ${result1.valid}`);
    if (result1.invalid !== 2) throw new Error(`Expected invalid=2, got ${result1.invalid}`);
    if (result1.errors !== 1) throw new Error(`Expected errors=1, got ${result1.errors}`);
    if (result1.warnings !== 1) throw new Error(`Expected warnings=1, got ${result1.warnings}`);
    if (result1.validators.length !== 1) throw new Error(`Expected 1 validator, got ${result1.validators.length}`);
    if (mockSourceClient.getWorkflowsCalled !== 1) throw new Error('SOURCE.getWorkflows() should be called once');
    if (mockTargetClient.getWorkflowsCalled !== 0) throw new Error('TARGET.getWorkflows() should NOT be called');

    console.log('✅ PASSOU: Validação sem filtros OK\n');

    // Reset counters
    mockSourceClient.getWorkflowsCalled = 0;

    console.log('\n2️⃣  TEST: Validar com filtro de tags');
    console.log('-'.repeat(80));
    const result2 = await manager.validate({
      filters: { tags: ['production'] }
    });

    console.log('✓ Resultado:', {
      total: result2.total,
      valid: result2.valid,
      invalid: result2.invalid
    });

    // Asserções
    if (result2.total !== 2) throw new Error(`Expected total=2 (workflows com tag 'production'), got ${result2.total}`);
    if (result2.valid !== 1) throw new Error(`Expected valid=1, got ${result2.valid}`);
    if (result2.invalid !== 1) throw new Error(`Expected invalid=1, got ${result2.invalid}`);

    console.log('✅ PASSOU: Filtro de tags OK\n');

    // Reset counters
    mockSourceClient.getWorkflowsCalled = 0;

    console.log('\n3️⃣  TEST: Validar com múltiplos validators');
    console.log('-'.repeat(80));
    const result3 = await manager.validate({
      validators: ['integrity-validator', 'schema-validator']
    });

    console.log('✓ Resultado:', {
      validators: result3.validators
    });

    // Asserções
    if (result3.validators.length !== 2) throw new Error(`Expected 2 validators, got ${result3.validators.length}`);
    if (!result3.validators.includes('integrity-validator')) throw new Error('Expected integrity-validator');
    if (!result3.validators.includes('schema-validator')) throw new Error('Expected schema-validator');

    console.log('✅ PASSOU: Múltiplos validators OK\n');

    // Reset counters
    mockSourceClient.getWorkflowsCalled = 0;

    console.log('\n4️⃣  TEST: Validar issues por workflow');
    console.log('-'.repeat(80));
    const result4 = await manager.validate();

    console.log('✓ Issues encontrados:', result4.issues.length);

    // Asserções - devemos ter 2 workflows com issues: 1 com error + 1 com warning
    if (result4.issues.length !== 2) throw new Error(`Expected 2 workflows with issues, got ${result4.issues.length}`);

    // Encontrar workflow com error
    const issueWithError = result4.issues.find(i => i.workflow === 'Invalid Workflow - No Nodes');
    if (!issueWithError) {
      throw new Error('Expected to find workflow "Invalid Workflow - No Nodes"');
    }

    console.log('✓ Issue details (error):', {
      workflow: issueWithError.workflow,
      workflowId: issueWithError.workflowId,
      issuesCount: issueWithError.issues.length
    });

    if (issueWithError.workflowId !== '3') {
      throw new Error(`Expected workflowId '3', got '${issueWithError.workflowId}'`);
    }

    if (issueWithError.issues.length !== 1) {
      throw new Error(`Expected 1 issue, got ${issueWithError.issues.length}`);
    }

    const validationError = issueWithError.issues[0];
    if (validationError.severity !== 'error') {
      throw new Error(`Expected severity='error', got '${validationError.severity}'`);
    }

    if (validationError.phase !== 'standalone') {
      throw new Error(`Expected phase='standalone', got '${validationError.phase}'`);
    }

    // Encontrar workflow com warning
    const issueWithWarning = result4.issues.find(i => i.workflow === 'Workflow with Warning');
    if (!issueWithWarning) {
      throw new Error('Expected to find workflow "Workflow with Warning"');
    }

    console.log('✓ Issue details (warning):', {
      workflow: issueWithWarning.workflow,
      workflowId: issueWithWarning.workflowId,
      issuesCount: issueWithWarning.issues.length
    });

    if (issueWithWarning.issues.length !== 1) {
      throw new Error(`Expected 1 issue (warning), got ${issueWithWarning.issues.length}`);
    }

    const validationWarning = issueWithWarning.issues[0];
    if (validationWarning.severity !== 'warning') {
      throw new Error(`Expected severity='warning', got '${validationWarning.severity}'`);
    }

    console.log('✅ PASSOU: Issues por workflow OK\n');

    console.log('\n5️⃣  TEST: Validar que TARGET não é chamado');
    console.log('-'.repeat(80));

    if (mockTargetClient.testConnectionCalled !== 0) {
      throw new Error('TARGET.testConnection() should NOT be called during validate()');
    }

    if (mockTargetClient.getWorkflowsCalled !== 0) {
      throw new Error('TARGET.getWorkflows() should NOT be called during validate()');
    }

    if (mockTargetClient.createWorkflowCalled !== 0) {
      throw new Error('TARGET.createWorkflow() should NOT be called during validate()');
    }

    console.log('✅ PASSOU: TARGET não foi chamado\n');

    // Final summary
    console.log('='.repeat(80));
    console.log('✅ TODOS OS TESTES PASSARAM!');
    console.log('='.repeat(80));
    console.log('\nTask 26 - TransferManager.validate() standalone: ✅ COMPLETO');
    console.log('\nEntregáveis:');
    console.log('  ✅ Método validate() implementado');
    console.log('  ✅ ValidationResult typedef criado');
    console.log('  ✅ Suporte a severidade (error vs warning)');
    console.log('  ✅ Apenas testa SOURCE (não TARGET)');
    console.log('  ✅ Teste abrangente criado');
    console.log('  ✅ JSDoc completo com exemplos');

    return true;

  } catch (error) {
    console.error('\n❌ TESTE FALHOU:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Executar teste
if (require.main === module) {
  runTest()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Erro crítico:', error);
      process.exit(1);
    });
}

module.exports = { runTest };
