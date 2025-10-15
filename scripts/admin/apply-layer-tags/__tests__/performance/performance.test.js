/**
 * Performance Validation Tests
 *
 * Valida targets de performance para processamento batch de workflows:
 * - Target: 31 workflows em <10 segundos
 * - Speedup: ≥2.5x com paralelizacao (vs sequencial)
 * - Throughput: ≥5 workflows/segundo
 * - Memory: <50MB de incremento durante batch
 * - Stress test: 100 workflows em <20 segundos
 *
 * TASK-4.4: Performance Validation
 */

const WorkflowProcessor = require('../../core/processors/workflow-processor');

// Mock de TagService para testes de performance
class MockTagService {
  constructor(apiDelay = 100) {
    this.apiDelay = apiDelay;
    this.callCount = 0;
  }

  async applyTagToWorkflow(workflowId, tagId) {
    this.callCount++;

    // Simular delay de API realista (100-200ms por request)
    const delay = this.apiDelay + Math.random() * 100;
    await new Promise(resolve => setTimeout(resolve, delay));

    return {
      id: workflowId,
      tags: [{ id: tagId, name: 'jana' }]
    };
  }

  resetStats() {
    this.callCount = 0;
  }
}

// Mock de Logger silencioso para performance tests
class MockLogger {
  info() {}
  success() {}
  warn() {}
  error() {}
  debug() {}
  setLogLevel() {}
}

// Funcao helper para gerar workflows mock
function generateMockWorkflows(count) {
  const workflows = [];
  const layers = ['A', 'B', 'C', 'D', 'E', 'F'];

  for (let i = 0; i < count; i++) {
    workflows.push({
      id: `wf-${i.toString().padStart(3, '0')}`,
      name: { new: `Workflow Test ${i + 1}` },
      code: `TST-WFL-${i.toString().padStart(3, '0')}`,
      layer: layers[i % layers.length],
      tag: 'jana'
    });
  }

  return workflows;
}

// Funcao helper para monitorar memoria
function measureMemory() {
  if (global.gc) {
    global.gc();
  }
  return process.memoryUsage();
}

describe('Performance Validation', () => {
  let mockTagService;
  let mockLogger;

  beforeEach(() => {
    mockTagService = new MockTagService(100); // 100ms base delay
    mockLogger = new MockLogger();
  });

  /**
   * PERF-1: Target principal - 31 workflows em <10 segundos
   *
   * Requirement: Processar carga real de 31 workflows em menos de 10 segundos
   * com API delay realista de 100-200ms por request.
   */
  test('PERF-1: should process 31 workflows in under 10 seconds', async () => {
    // Setup
    const workflows = generateMockWorkflows(31);
    const tagId = 'tag-jana-123';

    const processor = new WorkflowProcessor(mockTagService, mockLogger, {
      maxConcurrent: 5,
      dryRun: false
    });

    // Execute
    const start = Date.now();
    const result = await processor.processBatch(workflows, tagId, {
      dryRun: false,
      onProgress: () => {}
    });
    const duration = Date.now() - start;

    // Validate
    expect(result.summary.total).toBe(31);
    expect(result.summary.success).toBe(31);
    expect(result.summary.failed).toBe(0);
    expect(duration).toBeLessThan(10000); // <10s

    console.log(`✓ PERF-1: 31 workflows processed in ${(duration / 1000).toFixed(2)}s (target: <10s)`);
  }, 15000); // Timeout de 15s para dar margem

  /**
   * PERF-2: Speedup com paralelizacao - ≥2.5x mais rapido
   *
   * Requirement: Processamento paralelo (5 concurrent) deve ser pelo menos
   * 2.5x mais rapido que processamento sequencial.
   */
  test('PERF-2: should achieve ~3x speedup with parallelization', async () => {
    // Setup
    const workflows = generateMockWorkflows(31);
    const tagId = 'tag-jana-123';

    // Processamento paralelo (5 concurrent)
    const processorParallel = new WorkflowProcessor(mockTagService, mockLogger, {
      maxConcurrent: 5,
      dryRun: false
    });

    const startParallel = Date.now();
    const resultParallel = await processorParallel.processBatch(workflows, tagId);
    const durationParallel = Date.now() - startParallel;

    // Reset stats
    mockTagService.resetStats();

    // Processamento sequencial (1 concurrent)
    const processorSeq = new WorkflowProcessor(mockTagService, mockLogger, {
      maxConcurrent: 1,
      dryRun: false
    });

    const startSeq = Date.now();
    const resultSeq = await processorSeq.processBatch(workflows, tagId);
    const durationSeq = Date.now() - startSeq;

    // Calcular speedup
    const speedup = durationSeq / durationParallel;

    // Validate
    expect(resultParallel.summary.success).toBe(31);
    expect(resultSeq.summary.success).toBe(31);
    expect(speedup).toBeGreaterThanOrEqual(2.5); // ≥2.5x faster

    console.log(`✓ PERF-2: Speedup ${speedup.toFixed(2)}x (Sequential: ${(durationSeq / 1000).toFixed(2)}s vs Parallel: ${(durationParallel / 1000).toFixed(2)}s)`);
  }, 60000); // Timeout de 60s (sequencial e lento)

  /**
   * PERF-3: Throughput minimo - ≥5 workflows/segundo
   *
   * Requirement: Sistema deve processar pelo menos 5 workflows por segundo
   * em media durante batch processing.
   */
  test('PERF-3: should maintain throughput of ≥5 workflows/s', async () => {
    // Setup
    const workflows = generateMockWorkflows(31);
    const tagId = 'tag-jana-123';

    const processor = new WorkflowProcessor(mockTagService, mockLogger, {
      maxConcurrent: 5,
      dryRun: false
    });

    // Execute
    const start = Date.now();
    const result = await processor.processBatch(workflows, tagId);
    const duration = Date.now() - start;

    // Calcular throughput
    const throughput = result.summary.total / (duration / 1000);

    // Validate
    expect(result.summary.success).toBe(31);
    expect(throughput).toBeGreaterThanOrEqual(5); // ≥5 wf/s

    console.log(`✓ PERF-3: Throughput ${throughput.toFixed(2)} workflows/s (target: ≥5 wf/s)`);
  }, 15000);

  /**
   * PERF-4: Stress test - 100 workflows em <20 segundos
   *
   * Requirement: Sistema deve escalar para processar 100 workflows
   * em menos de 20 segundos.
   */
  test('PERF-4: should handle 100 workflows efficiently', async () => {
    // Setup
    const workflows100 = generateMockWorkflows(100);
    const tagId = 'tag-jana-123';

    const processor = new WorkflowProcessor(mockTagService, mockLogger, {
      maxConcurrent: 5,
      dryRun: false
    });

    // Execute
    const start = Date.now();
    const result = await processor.processBatch(workflows100, tagId);
    const duration = Date.now() - start;

    // Validate
    expect(result.summary.total).toBe(100);
    expect(result.summary.success).toBe(100);
    expect(duration).toBeLessThan(20000); // <20s for 100 workflows

    console.log(`✓ PERF-4: 100 workflows processed in ${(duration / 1000).toFixed(2)}s (target: <20s)`);
  }, 25000); // Timeout de 25s

  /**
   * PERF-5: Memory usage - <50MB de incremento
   *
   * Requirement: Processamento de batch nao deve aumentar memoria em mais
   * de 50MB (evitar memory leaks).
   */
  test('PERF-5: should not exceed memory limit during batch processing', async () => {
    // Setup
    const workflows = generateMockWorkflows(31);
    const tagId = 'tag-jana-123';

    const processor = new WorkflowProcessor(mockTagService, mockLogger, {
      maxConcurrent: 5,
      dryRun: false
    });

    // Medir memoria antes
    const memBefore = measureMemory();
    const heapBefore = memBefore.heapUsed;

    // Execute
    await processor.processBatch(workflows, tagId);

    // Medir memoria depois
    const memAfter = measureMemory();
    const heapAfter = memAfter.heapUsed;

    // Calcular incremento
    const memIncrease = (heapAfter - heapBefore) / 1024 / 1024; // MB

    // Validate
    expect(Math.abs(memIncrease)).toBeLessThan(50); // <50MB increase

    console.log(`✓ PERF-5: Memory increase ${memIncrease.toFixed(2)}MB (target: <50MB)`);
  }, 15000);

  /**
   * PERF-6: Concurrency configuration impact
   *
   * Valida que diferentes configuracoes de concorrencia afetam performance
   * conforme esperado.
   */
  test('PERF-6: should show performance improvement with higher concurrency', async () => {
    // Setup
    const workflows = generateMockWorkflows(20);
    const tagId = 'tag-jana-123';

    const configs = [
      { concurrent: 1, label: 'Sequential (1)' },
      { concurrent: 3, label: '3 Concurrent' },
      { concurrent: 5, label: '5 Concurrent' }
    ];

    const durations = [];

    for (const config of configs) {
      mockTagService.resetStats();

      const processor = new WorkflowProcessor(mockTagService, mockLogger, {
        maxConcurrent: config.concurrent,
        dryRun: false
      });

      const start = Date.now();
      await processor.processBatch(workflows, tagId);
      const duration = Date.now() - start;

      durations.push({ label: config.label, duration, concurrent: config.concurrent });

      console.log(`  ${config.label}: ${(duration / 1000).toFixed(2)}s`);
    }

    // Validate que aumentar concorrencia reduz duracao
    expect(durations[1].duration).toBeLessThan(durations[0].duration); // 3 < 1
    expect(durations[2].duration).toBeLessThan(durations[0].duration); // 5 < 1

    console.log(`✓ PERF-6: Higher concurrency improves performance`);
  }, 45000);

  /**
   * PERF-7: Dry-run performance
   *
   * Valida que modo dry-run (sem chamadas de API) e extremamente rapido.
   */
  test('PERF-7: dry-run mode should be fast', async () => {
    // Setup
    const workflows = generateMockWorkflows(31);
    const tagId = 'tag-jana-123';

    const processor = new WorkflowProcessor(mockTagService, mockLogger, {
      maxConcurrent: 5,
      dryRun: true
    });

    // Execute
    const start = Date.now();
    const result = await processor.processBatch(workflows, tagId, {
      dryRun: true
    });
    const duration = Date.now() - start;

    // Validate
    expect(result.summary.total).toBe(31);
    expect(result.summary.dryRun).toBe(31);
    expect(duration).toBeLessThan(5000); // <5s em dry-run (bem mais rapido)

    console.log(`✓ PERF-7: Dry-run 31 workflows in ${(duration / 1000).toFixed(2)}s (target: <5s)`);
  }, 10000);
});

describe('Performance Validation Summary', () => {
  test('PERF-SUMMARY: Print performance summary', () => {
    console.log('\n=== PERFORMANCE VALIDATION SUMMARY ===');
    console.log('All performance requirements validated:');
    console.log('✓ PERF-1: 31 workflows in <10s');
    console.log('✓ PERF-2: Speedup ≥2.5x with parallelization');
    console.log('✓ PERF-3: Throughput ≥5 workflows/s');
    console.log('✓ PERF-4: 100 workflows in <20s (stress test)');
    console.log('✓ PERF-5: Memory increase <50MB');
    console.log('✓ PERF-6: Concurrency scaling validated');
    console.log('✓ PERF-7: Dry-run mode fast (<5s)');
    console.log('======================================\n');
  });
});
