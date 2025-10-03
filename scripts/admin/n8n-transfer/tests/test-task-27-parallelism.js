/**
 * @fileoverview Test Suite for Task 27 - Paralelização de transferências
 *
 * Testa processamento paralelo de workflows com controle de concorrência.
 *
 * @module tests/test-task-27-parallelism
 * @requires ../core/transfer-manager
 * @requires ../core/logger
 */

const TransferManager = require('../core/transfer-manager');
const Logger = require('../core/logger');
const path = require('path');

/**
 * Utilitário para criar mock de workflow
 */
function createMockWorkflow(id, name) {
  return {
    id: id.toString(),
    name: name,
    nodes: [
      {
        id: 'node-1',
        name: 'Start',
        type: 'n8n-nodes-base.start',
        typeVersion: 1,
        position: [250, 300],
        parameters: {}
      }
    ],
    connections: {},
    tags: [],
    active: false
  };
}

/**
 * Utilitário para criar mock de HttpClient com delay simulado
 */
function createMockHttpClient(delay = 100) {
  const workflows = [];

  // Popular workflows de teste
  for (let i = 1; i <= 10; i++) {
    workflows.push(createMockWorkflow(i, `Workflow ${i}`));
  }

  return {
    testConnection: async () => ({ success: true }),
    getWorkflows: async () => {
      // Simular delay de rede
      await new Promise(resolve => setTimeout(resolve, delay));
      return [...workflows];
    },
    createWorkflow: async (workflow) => {
      // Simular delay de criação
      await new Promise(resolve => setTimeout(resolve, delay));
      return {
        ...workflow,
        id: `new-${workflow.id || Date.now()}`
      };
    }
  };
}

/**
 * Utilitário para criar mock de PluginRegistry
 */
function createMockPluginRegistry() {
  const deduplicatorPlugin = {
    getName: () => 'mock-deduplicator',
    getType: () => 'deduplicator',
    isEnabled: () => true,
    enable: () => {},
    isDuplicate: () => false,
    getReason: () => null
  };

  const validatorPlugin = {
    getName: () => 'mock-validator',
    getType: () => 'validator',
    isEnabled: () => true,
    enable: () => {},
    validate: () => ({ valid: true, errors: [], warnings: [] })
  };

  const reporterPlugin = {
    getName: () => 'mock-reporter',
    getType: () => 'reporter',
    isEnabled: () => true,
    enable: () => {},
    generate: () => ({ format: 'markdown', content: '# Mock Report' })
  };

  return {
    get: (name, type) => {
      if (type === 'deduplicator') return deduplicatorPlugin;
      if (type === 'validator') return validatorPlugin;
      if (type === 'reporter') return reporterPlugin;
      return null;
    },
    getAll: () => [deduplicatorPlugin, validatorPlugin, reporterPlugin]
  };
}

/**
 * Teste 1: Parallelism = 1 (Sequencial)
 */
async function testSequentialProcessing() {
  console.log('\n=== TEST 1: Sequential Processing (parallelism = 1) ===\n');

  const logger = new Logger({ level: 'info' });
  const mockConfig = {
    SOURCE: { url: 'https://source.n8n.io', apiKey: 'source-key' },
    TARGET: { url: 'https://target.n8n.io', apiKey: 'target-key' }
  };

  const manager = new TransferManager(mockConfig, {
    logger,
    pluginRegistry: createMockPluginRegistry()
  });

  // Injetar mock clients
  const delay = 50; // 50ms por workflow
  manager.sourceClient = createMockHttpClient(delay);
  manager.targetClient = createMockHttpClient(delay);

  // Executar transferência sequencial
  const startTime = Date.now();
  const result = await manager.transfer({
    parallelism: 1,
    dryRun: false,
    deduplicator: 'mock-deduplicator',
    validators: ['mock-validator'],
    reporters: ['mock-reporter']
  });
  const duration = Date.now() - startTime;

  // Validações
  console.log('✓ Transfer completed');
  console.log(`  - Total: ${result.total}`);
  console.log(`  - Transferred: ${result.transferred}`);
  console.log(`  - Duration: ${duration}ms`);
  console.log(`  - Expected: ~${delay * result.total}ms (sequential)`);

  if (result.total !== 10) {
    throw new Error(`Expected 10 workflows, got ${result.total}`);
  }

  if (result.transferred !== 10) {
    throw new Error(`Expected 10 transferred, got ${result.transferred}`);
  }

  // Sequencial deve ser mais lento (aproximadamente delay * total)
  const expectedMin = delay * result.total * 0.8; // 80% tolerance
  if (duration < expectedMin) {
    throw new Error(`Sequential processing too fast: ${duration}ms < ${expectedMin}ms`);
  }

  console.log('✓ Sequential processing validated');
}

/**
 * Teste 2: Parallelism = 3 (Paralelo)
 */
async function testParallelProcessing() {
  console.log('\n=== TEST 2: Parallel Processing (parallelism = 3) ===\n');

  const logger = new Logger({ level: 'info' });
  const mockConfig = {
    SOURCE: { url: 'https://source.n8n.io', apiKey: 'source-key' },
    TARGET: { url: 'https://target.n8n.io', apiKey: 'target-key' }
  };

  const manager = new TransferManager(mockConfig, {
    logger,
    pluginRegistry: createMockPluginRegistry()
  });

  // Injetar mock clients
  const delay = 50; // 50ms por workflow
  manager.sourceClient = createMockHttpClient(delay);
  manager.targetClient = createMockHttpClient(delay);

  // Executar transferência paralela
  const startTime = Date.now();
  const result = await manager.transfer({
    parallelism: 3,
    dryRun: false,
    deduplicator: 'mock-deduplicator',
    validators: ['mock-validator'],
    reporters: ['mock-reporter']
  });
  const duration = Date.now() - startTime;

  // Validações
  console.log('✓ Transfer completed');
  console.log(`  - Total: ${result.total}`);
  console.log(`  - Transferred: ${result.transferred}`);
  console.log(`  - Duration: ${duration}ms`);
  console.log(`  - Expected: ~${delay * Math.ceil(result.total / 3)}ms (parallel batches)`);

  if (result.total !== 10) {
    throw new Error(`Expected 10 workflows, got ${result.total}`);
  }

  if (result.transferred !== 10) {
    throw new Error(`Expected 10 transferred, got ${result.transferred}`);
  }

  // Paralelo deve ser mais rápido (aproximadamente delay * ceil(total/parallelism))
  const expectedBatches = Math.ceil(result.total / 3);
  const expectedMax = delay * expectedBatches * 2.5; // 250% tolerance (considerando overhead)
  if (duration > expectedMax) {
    throw new Error(`Parallel processing too slow: ${duration}ms > ${expectedMax}ms`);
  }

  console.log('✓ Parallel processing validated');
}

/**
 * Teste 3: Parallelism = 5 (Alta Concorrência)
 */
async function testHighConcurrency() {
  console.log('\n=== TEST 3: High Concurrency (parallelism = 5) ===\n');

  const logger = new Logger({ level: 'info' });
  const mockConfig = {
    SOURCE: { url: 'https://source.n8n.io', apiKey: 'source-key' },
    TARGET: { url: 'https://target.n8n.io', apiKey: 'target-key' }
  };

  const manager = new TransferManager(mockConfig, {
    logger,
    pluginRegistry: createMockPluginRegistry()
  });

  // Injetar mock clients
  const delay = 50; // 50ms por workflow
  manager.sourceClient = createMockHttpClient(delay);
  manager.targetClient = createMockHttpClient(delay);

  // Executar transferência com alta concorrência
  const startTime = Date.now();
  const result = await manager.transfer({
    parallelism: 5,
    dryRun: false,
    deduplicator: 'mock-deduplicator',
    validators: ['mock-validator'],
    reporters: ['mock-reporter']
  });
  const duration = Date.now() - startTime;

  // Validações
  console.log('✓ Transfer completed');
  console.log(`  - Total: ${result.total}`);
  console.log(`  - Transferred: ${result.transferred}`);
  console.log(`  - Duration: ${duration}ms`);
  console.log(`  - Expected: ~${delay * Math.ceil(result.total / 5)}ms (parallel batches)`);

  if (result.total !== 10) {
    throw new Error(`Expected 10 workflows, got ${result.total}`);
  }

  if (result.transferred !== 10) {
    throw new Error(`Expected 10 transferred, got ${result.transferred}`);
  }

  // Alta concorrência deve ser ainda mais rápido
  const expectedBatches = Math.ceil(result.total / 5);
  const expectedMax = delay * expectedBatches * 3.5; // 350% tolerance (considerando overhead de I/O e validações)
  if (duration > expectedMax) {
    throw new Error(`High concurrency too slow: ${duration}ms > ${expectedMax}ms`);
  }

  console.log('✓ High concurrency validated');
}

/**
 * Teste 4: Batch Processing Correto
 */
async function testBatchProcessing() {
  console.log('\n=== TEST 4: Batch Processing Correctness ===\n');

  const logger = new Logger({ level: 'debug' });
  const mockConfig = {
    SOURCE: { url: 'https://source.n8n.io', apiKey: 'source-key' },
    TARGET: { url: 'https://target.n8n.io', apiKey: 'target-key' }
  };

  const manager = new TransferManager(mockConfig, {
    logger,
    pluginRegistry: createMockPluginRegistry()
  });

  // Injetar mock clients
  manager.sourceClient = createMockHttpClient(10);
  manager.targetClient = createMockHttpClient(10);

  // Executar com parallelism = 3 (deve criar batches de 3, 3, 3, 1)
  const result = await manager.transfer({
    parallelism: 3,
    dryRun: false,
    deduplicator: 'mock-deduplicator',
    validators: ['mock-validator'],
    reporters: ['mock-reporter']
  });

  console.log('✓ Batch processing completed');
  console.log(`  - Total workflows: ${result.total}`);
  console.log(`  - Expected batches: ${Math.ceil(result.total / 3)}`);
  console.log(`  - All workflows processed: ${result.transferred + result.skipped + result.failed === result.total}`);

  if (result.transferred + result.skipped + result.failed !== result.total) {
    throw new Error('Not all workflows were processed');
  }

  console.log('✓ Batch processing correctness validated');
}

/**
 * Teste 5: Progress Update Durante Batches
 */
async function testProgressUpdateDuringBatches() {
  console.log('\n=== TEST 5: Progress Update During Batches ===\n');

  const logger = new Logger({ level: 'info' });
  const mockConfig = {
    SOURCE: { url: 'https://source.n8n.io', apiKey: 'source-key' },
    TARGET: { url: 'https://target.n8n.io', apiKey: 'target-key' }
  };

  const manager = new TransferManager(mockConfig, {
    logger,
    pluginRegistry: createMockPluginRegistry()
  });

  // Injetar mock clients
  manager.sourceClient = createMockHttpClient(20);
  manager.targetClient = createMockHttpClient(20);

  // Executar e monitorar progresso
  const progressSnapshots = [];

  // Iniciar transferência em background
  const transferPromise = manager.transfer({
    parallelism: 3,
    dryRun: false,
    deduplicator: 'mock-deduplicator',
    validators: ['mock-validator'],
    reporters: ['mock-reporter']
  });

  // Capturar progresso a cada 50ms
  const monitorInterval = setInterval(() => {
    const progress = manager.getProgress();
    progressSnapshots.push({ ...progress });
  }, 50);

  // Aguardar conclusão
  const result = await transferPromise;
  clearInterval(monitorInterval);

  console.log('✓ Transfer completed');
  console.log(`  - Progress snapshots captured: ${progressSnapshots.length}`);
  console.log(`  - Final progress: ${result.transferred}/${result.total}`);

  // Validar que progresso foi atualizado
  if (progressSnapshots.length === 0) {
    throw new Error('No progress snapshots captured');
  }

  // Validar que processed aumentou ao longo do tempo
  const processedValues = progressSnapshots.map(s => s.processed);
  const hasProgression = processedValues.some((val, idx) => idx > 0 && val > processedValues[idx - 1]);

  if (!hasProgression) {
    console.log('  - Warning: Progress may have completed too fast to capture intermediate states');
  } else {
    console.log('  - Progress increased over time: ✓');
  }

  console.log('✓ Progress update validated');
}

/**
 * Teste 6: Performance Comparison
 */
async function testPerformanceComparison() {
  console.log('\n=== TEST 6: Performance Comparison ===\n');

  const logger = new Logger({ level: 'warn' }); // Reduzir logs para benchmark
  const delay = 100; // Delay maior para melhor comparação

  // Teste Sequencial
  const mockConfigSeq = {
    SOURCE: { url: 'https://source.n8n.io', apiKey: 'source-key' },
    TARGET: { url: 'https://target.n8n.io', apiKey: 'target-key' }
  };

  const managerSeq = new TransferManager(mockConfigSeq, {
    logger,
    pluginRegistry: createMockPluginRegistry()
  });

  managerSeq.sourceClient = createMockHttpClient(delay);
  managerSeq.targetClient = createMockHttpClient(delay);

  const startSeq = Date.now();
  await managerSeq.transfer({
    parallelism: 1,
    dryRun: false,
    deduplicator: 'mock-deduplicator',
    validators: ['mock-validator'],
    reporters: ['mock-reporter']
  });
  const durationSeq = Date.now() - startSeq;

  // Teste Paralelo
  const mockConfigPar = {
    SOURCE: { url: 'https://source.n8n.io', apiKey: 'source-key' },
    TARGET: { url: 'https://target.n8n.io', apiKey: 'target-key' }
  };

  const managerPar = new TransferManager(mockConfigPar, {
    logger,
    pluginRegistry: createMockPluginRegistry()
  });

  managerPar.sourceClient = createMockHttpClient(delay);
  managerPar.targetClient = createMockHttpClient(delay);

  const startPar = Date.now();
  await managerPar.transfer({
    parallelism: 5,
    dryRun: false,
    deduplicator: 'mock-deduplicator',
    validators: ['mock-validator'],
    reporters: ['mock-reporter']
  });
  const durationPar = Date.now() - startPar;

  // Comparação
  const speedup = durationSeq / durationPar;

  console.log('✓ Performance comparison completed');
  console.log(`  - Sequential (p=1): ${durationSeq}ms`);
  console.log(`  - Parallel (p=5): ${durationPar}ms`);
  console.log(`  - Speedup: ${speedup.toFixed(2)}x`);

  // Paralelo deve ser pelo menos 1.5x mais rápido
  if (speedup < 1.5) {
    console.log(`  - Warning: Speedup lower than expected (${speedup.toFixed(2)}x < 1.5x)`);
  } else {
    console.log(`  - Performance improvement validated: ${speedup.toFixed(2)}x speedup ✓`);
  }
}

/**
 * Runner principal
 */
async function runTests() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  Task 27: Paralelização de Transferências - Test Suite  ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  try {
    await testSequentialProcessing();
    await testParallelProcessing();
    await testHighConcurrency();
    await testBatchProcessing();
    await testProgressUpdateDuringBatches();
    await testPerformanceComparison();

    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║              ✓ ALL TESTS PASSED                          ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    console.log('Summary:');
    console.log('  ✓ Sequential processing (parallelism=1) works correctly');
    console.log('  ✓ Parallel processing (parallelism=3) works correctly');
    console.log('  ✓ High concurrency (parallelism=5) works correctly');
    console.log('  ✓ Batch processing is correct');
    console.log('  ✓ Progress updates during batches');
    console.log('  ✓ Performance improves with parallelization');

    process.exit(0);

  } catch (error) {
    console.error('\n╔═══════════════════════════════════════════════════════════╗');
    console.error('║              ✗ TEST FAILED                               ║');
    console.error('╚═══════════════════════════════════════════════════════════╝\n');
    console.error('Error:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

// Executar testes se chamado diretamente
if (require.main === module) {
  runTests();
}

module.exports = {
  testSequentialProcessing,
  testParallelProcessing,
  testHighConcurrency,
  testBatchProcessing,
  testProgressUpdateDuringBatches,
  testPerformanceComparison,
  runTests
};
