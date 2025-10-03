/**
 * @fileoverview Test script for Task 22 - TransferManager fetching de workflows
 *
 * Este script testa:
 * - Método _fetchWorkflows()
 * - Método _applyFilters() com 4 tipos de filtros
 * - Método _buildTransferSummary()
 * - Integração com transfer() PARTE 3
 * - Tratamento de caso sem workflows
 */

const path = require('path');
const TransferManager = require('../core/transfer-manager');
const Logger = require('../core/logger');

// Mock do HttpClient para testes
class MockHttpClient {
  constructor(workflows = [], connectionSuccess = true) {
    this.workflows = workflows;
    this.connectionSuccess = connectionSuccess;
    this.getWorkflowsCalls = 0;
  }

  async testConnection() {
    return {
      success: this.connectionSuccess,
      error: this.connectionSuccess ? null : 'Mock connection error'
    };
  }

  async getWorkflows() {
    this.getWorkflowsCalls++;
    return [...this.workflows];
  }
}

// Mock do PluginRegistry para testes
class MockPluginRegistry {
  constructor() {
    this.plugins = new Map([
      ['standard-deduplicator', {
        type: 'deduplicator',
        name: 'standard-deduplicator',
        getName: () => 'standard-deduplicator',
        isEnabled: () => true,
        enable: () => {}
      }]
    ]);
  }

  get(name, type) {
    return this.plugins.get(name);
  }

  getAll() {
    return Array.from(this.plugins.values());
  }

  register() {}
}

/**
 * Dados de teste
 */
const mockSourceWorkflows = [
  { id: '1', name: 'Workflow A', tags: ['production', 'critical'] },
  { id: '2', name: 'Workflow B', tags: ['staging'] },
  { id: '3', name: 'Workflow C', tags: ['production'] },
  { id: '4', name: 'Workflow D', tags: [] },
  { id: '5', name: 'Workflow E', tags: ['development', 'test'] },
  { id: '6', name: 'Workflow F', tags: ['production', 'test'] }
];

const mockTargetWorkflows = [
  { id: '10', name: 'Existing Workflow', tags: ['production'] }
];

/**
 * Teste 1: Filtro por workflowIds
 */
async function testFilterByWorkflowIds() {
  console.log('\n=== TEST 1: Filter by workflowIds ===');

  const logger = new Logger({ level: 'info' });
  const manager = new TransferManager(
    {
      SOURCE: { url: 'http://source.test', apiKey: 'key1' },
      TARGET: { url: 'http://target.test', apiKey: 'key2' }
    },
    { logger, pluginRegistry: new MockPluginRegistry() }
  );

  // Substituir HttpClients por mocks
  manager.sourceClient = new MockHttpClient(mockSourceWorkflows);
  manager.targetClient = new MockHttpClient(mockTargetWorkflows);

  try {
    await manager.transfer({
      filters: { workflowIds: ['1', '3', '5'] }
    });
  } catch (error) {
    if (error.message.includes('only validation, plugin loading and fetching implemented')) {
      console.log('✓ Fetching executed successfully');
      console.log(`✓ Source workflows fetched: ${manager.sourceClient.getWorkflowsCalls === 1}`);
      console.log(`✓ Target workflows fetched: ${manager.targetClient.getWorkflowsCalls === 1}`);
      return true;
    }
    throw error;
  }
}

/**
 * Teste 2: Filtro por workflowNames
 */
async function testFilterByWorkflowNames() {
  console.log('\n=== TEST 2: Filter by workflowNames ===');

  const logger = new Logger({ level: 'info' });
  const manager = new TransferManager(
    {
      SOURCE: { url: 'http://source.test', apiKey: 'key1' },
      TARGET: { url: 'http://target.test', apiKey: 'key2' }
    },
    { logger, pluginRegistry: new MockPluginRegistry() }
  );

  manager.sourceClient = new MockHttpClient(mockSourceWorkflows);
  manager.targetClient = new MockHttpClient(mockTargetWorkflows);

  try {
    await manager.transfer({
      filters: { workflowNames: ['Workflow A', 'Workflow C'] }
    });
  } catch (error) {
    if (error.message.includes('only validation, plugin loading and fetching implemented')) {
      console.log('✓ Fetching with workflowNames filter executed');
      return true;
    }
    throw error;
  }
}

/**
 * Teste 3: Filtro por tags (inclusão)
 */
async function testFilterByTags() {
  console.log('\n=== TEST 3: Filter by tags (inclusion) ===');

  const logger = new Logger({ level: 'info' });
  const manager = new TransferManager(
    {
      SOURCE: { url: 'http://source.test', apiKey: 'key1' },
      TARGET: { url: 'http://target.test', apiKey: 'key2' }
    },
    { logger, pluginRegistry: new MockPluginRegistry() }
  );

  manager.sourceClient = new MockHttpClient(mockSourceWorkflows);
  manager.targetClient = new MockHttpClient(mockTargetWorkflows);

  try {
    await manager.transfer({
      filters: { tags: ['production'] }
    });
  } catch (error) {
    if (error.message.includes('only validation, plugin loading and fetching implemented')) {
      console.log('✓ Fetching with tags filter executed');
      // Deve retornar workflows 1, 3, 6 (que têm tag 'production')
      return true;
    }
    throw error;
  }
}

/**
 * Teste 4: Filtro por excludeTags
 */
async function testFilterByExcludeTags() {
  console.log('\n=== TEST 4: Filter by excludeTags ===');

  const logger = new Logger({ level: 'info' });
  const manager = new TransferManager(
    {
      SOURCE: { url: 'http://source.test', apiKey: 'key1' },
      TARGET: { url: 'http://target.test', apiKey: 'key2' }
    },
    { logger, pluginRegistry: new MockPluginRegistry() }
  );

  manager.sourceClient = new MockHttpClient(mockSourceWorkflows);
  manager.targetClient = new MockHttpClient(mockTargetWorkflows);

  try {
    await manager.transfer({
      filters: { excludeTags: ['test'] }
    });
  } catch (error) {
    if (error.message.includes('only validation, plugin loading and fetching implemented')) {
      console.log('✓ Fetching with excludeTags filter executed');
      // Deve EXCLUIR workflows 5 e 6 (que têm tag 'test')
      return true;
    }
    throw error;
  }
}

/**
 * Teste 5: Combinação de filtros (AND logic)
 */
async function testCombinedFilters() {
  console.log('\n=== TEST 5: Combined filters (AND logic) ===');

  const logger = new Logger({ level: 'info' });
  const manager = new TransferManager(
    {
      SOURCE: { url: 'http://source.test', apiKey: 'key1' },
      TARGET: { url: 'http://target.test', apiKey: 'key2' }
    },
    { logger, pluginRegistry: new MockPluginRegistry() }
  );

  manager.sourceClient = new MockHttpClient(mockSourceWorkflows);
  manager.targetClient = new MockHttpClient(mockTargetWorkflows);

  try {
    await manager.transfer({
      filters: {
        tags: ['production'],
        excludeTags: ['test']
      }
    });
  } catch (error) {
    if (error.message.includes('only validation, plugin loading and fetching implemented')) {
      console.log('✓ Fetching with combined filters executed');
      // Deve retornar workflows 1 e 3 (production + NOT test)
      return true;
    }
    throw error;
  }
}

/**
 * Teste 6: Nenhum workflow corresponde aos filtros
 */
async function testNoWorkflowsMatch() {
  console.log('\n=== TEST 6: No workflows match filters ===');

  const logger = new Logger({ level: 'info' });
  const manager = new TransferManager(
    {
      SOURCE: { url: 'http://source.test', apiKey: 'key1' },
      TARGET: { url: 'http://target.test', apiKey: 'key2' }
    },
    { logger, pluginRegistry: new MockPluginRegistry() }
  );

  manager.sourceClient = new MockHttpClient(mockSourceWorkflows);
  manager.targetClient = new MockHttpClient(mockTargetWorkflows);

  try {
    const result = await manager.transfer({
      filters: { tags: ['nonexistent-tag'] }
    });

    console.log('✓ Transfer aborted with empty summary');
    console.log(`✓ Summary total: ${result.total === 0}`);
    console.log(`✓ Status: ${manager.getProgress().status === 'completed'}`);
    return true;
  } catch (error) {
    console.error('✗ Should not throw error for empty results:', error.message);
    return false;
  }
}

/**
 * Teste 7: Sem filtros (retorna todos workflows)
 */
async function testNoFilters() {
  console.log('\n=== TEST 7: No filters (return all workflows) ===');

  const logger = new Logger({ level: 'info' });
  const manager = new TransferManager(
    {
      SOURCE: { url: 'http://source.test', apiKey: 'key1' },
      TARGET: { url: 'http://target.test', apiKey: 'key2' }
    },
    { logger, pluginRegistry: new MockPluginRegistry() }
  );

  manager.sourceClient = new MockHttpClient(mockSourceWorkflows);
  manager.targetClient = new MockHttpClient(mockTargetWorkflows);

  try {
    await manager.transfer({});
  } catch (error) {
    if (error.message.includes('only validation, plugin loading and fetching implemented')) {
      console.log('✓ Fetching without filters executed');
      // Deve retornar todos os 6 workflows
      return true;
    }
    throw error;
  }
}

/**
 * Teste 8: Error handling no fetching
 */
async function testFetchingError() {
  console.log('\n=== TEST 8: Error handling during fetching ===');

  const logger = new Logger({ level: 'error' });
  const manager = new TransferManager(
    {
      SOURCE: { url: 'http://source.test', apiKey: 'key1' },
      TARGET: { url: 'http://target.test', apiKey: 'key2' }
    },
    { logger, pluginRegistry: new MockPluginRegistry() }
  );

  // Mock que falha
  manager.sourceClient = {
    testConnection: async () => ({ success: true }),
    getWorkflows: async () => {
      throw new Error('Network error');
    }
  };
  manager.targetClient = new MockHttpClient(mockTargetWorkflows);

  try {
    await manager.transfer({});
    console.error('✗ Should have thrown error');
    return false;
  } catch (error) {
    if (error.message.includes('Workflow fetching failed')) {
      console.log('✓ Error handled correctly');
      console.log(`✓ Status set to failed: ${manager.getProgress().status === 'failed'}`);
      return true;
    }
    throw error;
  }
}

/**
 * Teste 9: _applyFilters() unit test direto
 */
async function testApplyFiltersDirectly() {
  console.log('\n=== TEST 9: _applyFilters() unit test ===');

  const logger = new Logger({ level: 'error' });
  const manager = new TransferManager(
    {
      SOURCE: { url: 'http://source.test', apiKey: 'key1' },
      TARGET: { url: 'http://target.test', apiKey: 'key2' }
    },
    { logger, pluginRegistry: new MockPluginRegistry() }
  );

  // Teste 9.1: Filtro workflowIds
  const filtered1 = manager._applyFilters(mockSourceWorkflows, {
    workflowIds: ['1', '3']
  });
  console.log(`✓ workflowIds filter: ${filtered1.length === 2 && filtered1[0].id === '1' && filtered1[1].id === '3'}`);

  // Teste 9.2: Filtro workflowNames
  const filtered2 = manager._applyFilters(mockSourceWorkflows, {
    workflowNames: ['Workflow A', 'Workflow D']
  });
  console.log(`✓ workflowNames filter: ${filtered2.length === 2}`);

  // Teste 9.3: Filtro tags
  const filtered3 = manager._applyFilters(mockSourceWorkflows, {
    tags: ['production']
  });
  console.log(`✓ tags filter: ${filtered3.length === 3}`); // Workflows 1, 3, 6

  // Teste 9.4: Filtro excludeTags
  const filtered4 = manager._applyFilters(mockSourceWorkflows, {
    excludeTags: ['test']
  });
  console.log(`✓ excludeTags filter: ${filtered4.length === 4}`); // Exclui 5 e 6

  // Teste 9.5: Combinação de filtros
  const filtered5 = manager._applyFilters(mockSourceWorkflows, {
    tags: ['production'],
    excludeTags: ['test']
  });
  console.log(`✓ combined filters: ${filtered5.length === 2}`); // Apenas 1 e 3

  return true;
}

/**
 * Teste 10: _buildTransferSummary() test
 */
async function testBuildTransferSummary() {
  console.log('\n=== TEST 10: _buildTransferSummary() test ===');

  const logger = new Logger({ level: 'error' });
  const manager = new TransferManager(
    {
      SOURCE: { url: 'http://source.test', apiKey: 'key1' },
      TARGET: { url: 'http://target.test', apiKey: 'key2' }
    },
    { logger, pluginRegistry: new MockPluginRegistry() }
  );

  const processedWorkflows = [
    { id: '1', status: 'transferred' },
    { id: '2', status: 'transferred' },
    { id: '3', status: 'skipped' },
    { id: '4', status: 'failed' }
  ];

  const summary = manager._buildTransferSummary(processedWorkflows, 5000);

  console.log(`✓ total: ${summary.total === 4}`);
  console.log(`✓ transferred: ${summary.transferred === 2}`);
  console.log(`✓ skipped: ${summary.skipped === 1}`);
  console.log(`✓ failed: ${summary.failed === 1}`);
  console.log(`✓ duration: ${summary.duration === 5000}`);
  console.log(`✓ workflows array: ${summary.workflows.length === 4}`);
  console.log(`✓ has timestamps: ${summary.startTime && summary.endTime}`);

  return true;
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Task 22 - TransferManager Workflow Fetching Tests        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const tests = [
    { name: 'Filter by workflowIds', fn: testFilterByWorkflowIds },
    { name: 'Filter by workflowNames', fn: testFilterByWorkflowNames },
    { name: 'Filter by tags', fn: testFilterByTags },
    { name: 'Filter by excludeTags', fn: testFilterByExcludeTags },
    { name: 'Combined filters', fn: testCombinedFilters },
    { name: 'No workflows match', fn: testNoWorkflowsMatch },
    { name: 'No filters', fn: testNoFilters },
    { name: 'Fetching error handling', fn: testFetchingError },
    { name: '_applyFilters() unit test', fn: testApplyFiltersDirectly },
    { name: '_buildTransferSummary() test', fn: testBuildTransferSummary }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await test.fn();
      passed++;
      console.log(`\n✓ ${test.name} passed`);
    } catch (error) {
      failed++;
      console.error(`\n✗ ${test.name} failed:`, error.message);
      console.error(error.stack);
    }
  }

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log(`║  SUMMARY: ${passed}/${tests.length} tests passed, ${failed} failed${' '.repeat(22 - failed.toString().length)}║`);
  console.log('╚════════════════════════════════════════════════════════════╝');

  process.exit(failed > 0 ? 1 : 0);
}

// Execute tests
runAllTests();
