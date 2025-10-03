/**
 * @fileoverview Test Script for Task 24 - Dry-run Mode Validation
 *
 * Tests all aspects of dry-run functionality including:
 * - Dry-run does NOT call createWorkflow()
 * - All workflows marked with simulated: true
 * - Transferred counter is correct (counts simulated transfers)
 * - Final dry-run message is displayed
 * - TransferSummary has dryRun: true flag
 * - No actual workflows created on TARGET
 *
 * @module tests/test-task-24-dry-run
 */

const path = require('path');
const TransferManager = require('../core/transfer-manager');
const Logger = require('../core/logger');

/**
 * Mock HttpClient for testing without real N8N instances
 */
class MockHttpClient {
  constructor(name, workflows = []) {
    this.name = name;
    this.workflows = workflows;
    this.createdWorkflows = [];
    this.createWorkflowCallCount = 0;
  }

  async testConnection() {
    return { success: true };
  }

  async getWorkflows() {
    return [...this.workflows];
  }

  async createWorkflow(workflow) {
    this.createWorkflowCallCount++;
    const created = {
      ...workflow,
      id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    this.createdWorkflows.push(created);
    return created;
  }

  getCreatedWorkflows() {
    return this.createdWorkflows;
  }

  getCreateWorkflowCallCount() {
    return this.createWorkflowCallCount;
  }
}

/**
 * Mock Deduplicator that never marks anything as duplicate
 */
class MockDeduplicator {
  getName() {
    return 'mock-deduplicator';
  }

  isEnabled() {
    return true;
  }

  enable() {}

  isDuplicate() {
    return false; // Never mark as duplicate for these tests
  }

  getReason() {
    return null;
  }
}

/**
 * Mock Validator that passes all workflows
 */
class MockValidator {
  constructor(name = 'mock-validator') {
    this.name = name;
  }

  getName() {
    return this.name;
  }

  isEnabled() {
    return true;
  }

  enable() {}

  validate() {
    return {
      valid: true,
      errors: [],
      warnings: []
    };
  }
}

/**
 * Mock PluginRegistry for testing
 */
class MockPluginRegistry {
  constructor(plugins = {}) {
    this.plugins = plugins;
  }

  get(name, type) {
    return this.plugins[name] || null;
  }

  getAll() {
    return Object.values(this.plugins);
  }
}

/**
 * Test 1: Dry-run não deve chamar createWorkflow()
 */
async function testDryRunDoesNotCallCreateWorkflow() {
  console.log('\n=== TEST 1: Dry-run should NOT call createWorkflow() ===\n');

  const sourceWorkflows = [
    { id: '1', name: 'Workflow 1', nodes: [], connections: {}, tags: [] },
    { id: '2', name: 'Workflow 2', nodes: [], connections: {}, tags: [] },
    { id: '3', name: 'Workflow 3', nodes: [], connections: {}, tags: [] }
  ];

  const sourceClient = new MockHttpClient('SOURCE', sourceWorkflows);
  const targetClient = new MockHttpClient('TARGET', []);

  const mockPlugins = {
    'standard-deduplicator': new MockDeduplicator(),
    'integrity-validator': new MockValidator('integrity-validator')
  };

  const config = {
    SOURCE: { url: 'http://source.test', apiKey: 'source-key' },
    TARGET: { url: 'http://target.test', apiKey: 'target-key' }
  };

  const logger = new Logger({ level: 'info' });
  const pluginRegistry = new MockPluginRegistry(mockPlugins);

  const manager = new TransferManager(config, { logger, pluginRegistry });

  // Injetar mock clients
  manager.sourceClient = sourceClient;
  manager.targetClient = targetClient;

  // Execute dry-run
  const result = await manager.transfer({
    dryRun: true,
    deduplicator: 'standard-deduplicator',
    validators: ['integrity-validator'],
    reporters: []
  });

  // ASSERTIONS
  console.log('✓ Checking that createWorkflow was NOT called...');
  if (targetClient.getCreateWorkflowCallCount() !== 0) {
    console.error(`✗ FAIL: createWorkflow was called ${targetClient.getCreateWorkflowCallCount()} times (expected 0)`);
    return false;
  }
  console.log('✓ PASS: createWorkflow was never called');

  console.log('\n✓ Checking that no workflows were actually created...');
  if (targetClient.getCreatedWorkflows().length !== 0) {
    console.error(`✗ FAIL: ${targetClient.getCreatedWorkflows().length} workflows were created (expected 0)`);
    return false;
  }
  console.log('✓ PASS: No workflows created on TARGET');

  console.log('\n✓ Checking transferred count...');
  if (result.transferred !== 3) {
    console.error(`✗ FAIL: transferred count is ${result.transferred} (expected 3)`);
    return false;
  }
  console.log('✓ PASS: transferred count is correct (3)');

  console.log('\n✓ Checking dryRun flag in TransferSummary...');
  if (result.dryRun !== true) {
    console.error(`✗ FAIL: dryRun flag is ${result.dryRun} (expected true)`);
    return false;
  }
  console.log('✓ PASS: dryRun flag is true in TransferSummary');

  console.log('\n✅ TEST 1 PASSED: Dry-run correctly prevented createWorkflow() calls');
  return true;
}

/**
 * Test 2: Todos workflows devem ter simulated: true em dry-run
 */
async function testAllWorkflowsMarkedAsSimulated() {
  console.log('\n=== TEST 2: All workflows should have simulated: true ===\n');

  const sourceWorkflows = [
    { id: '1', name: 'Workflow 1', nodes: [], connections: {}, tags: [] },
    { id: '2', name: 'Workflow 2', nodes: [], connections: {}, tags: [] }
  ];

  const sourceClient = new MockHttpClient('SOURCE', sourceWorkflows);
  const targetClient = new MockHttpClient('TARGET', []);

  const mockPlugins = {
    'standard-deduplicator': new MockDeduplicator(),
    'integrity-validator': new MockValidator('integrity-validator')
  };

  const config = {
    SOURCE: { url: 'http://source.test', apiKey: 'source-key' },
    TARGET: { url: 'http://target.test', apiKey: 'target-key' }
  };

  const logger = new Logger({ level: 'info' });
  const pluginRegistry = new MockPluginRegistry(mockPlugins);

  const manager = new TransferManager(config, { logger, pluginRegistry });
  manager.sourceClient = sourceClient;
  manager.targetClient = targetClient;

  const result = await manager.transfer({
    dryRun: true,
    deduplicator: 'standard-deduplicator',
    validators: ['integrity-validator'],
    reporters: []
  });

  // ASSERTIONS
  console.log('✓ Checking all transferred workflows have simulated: true...');
  const transferredWorkflows = result.workflows.filter(w => w.status === 'transferred');

  if (transferredWorkflows.length !== 2) {
    console.error(`✗ FAIL: Expected 2 transferred workflows, got ${transferredWorkflows.length}`);
    return false;
  }

  for (const workflow of transferredWorkflows) {
    if (workflow.simulated !== true) {
      console.error(`✗ FAIL: Workflow "${workflow.name}" does not have simulated: true`);
      return false;
    }
    if (workflow.targetId !== 'simulated') {
      console.error(`✗ FAIL: Workflow "${workflow.name}" targetId is "${workflow.targetId}" (expected "simulated")`);
      return false;
    }
  }

  console.log('✓ PASS: All transferred workflows have simulated: true and targetId: "simulated"');

  console.log('\n✅ TEST 2 PASSED: All workflows correctly marked as simulated');
  return true;
}

/**
 * Test 3: Contadores de progresso devem estar corretos em dry-run
 */
async function testProgressCountersCorrect() {
  console.log('\n=== TEST 3: Progress counters should be correct ===\n');

  const sourceWorkflows = [
    { id: '1', name: 'Workflow 1', nodes: [], connections: {}, tags: [] },
    { id: '2', name: 'Workflow 2', nodes: [], connections: {}, tags: [] },
    { id: '3', name: 'Workflow 3', nodes: [], connections: {}, tags: [] },
    { id: '4', name: 'Workflow 4', nodes: [], connections: {}, tags: [] },
    { id: '5', name: 'Workflow 5', nodes: [], connections: {}, tags: [] }
  ];

  const sourceClient = new MockHttpClient('SOURCE', sourceWorkflows);
  const targetClient = new MockHttpClient('TARGET', []);

  // Mock deduplicator that marks workflow 3 as duplicate
  class CustomDeduplicator extends MockDeduplicator {
    isDuplicate(workflow) {
      return workflow.id === '3';
    }
    getReason() {
      return 'Duplicate detected';
    }
  }

  const mockPlugins = {
    'standard-deduplicator': new CustomDeduplicator(),
    'integrity-validator': new MockValidator('integrity-validator')
  };

  const config = {
    SOURCE: { url: 'http://source.test', apiKey: 'source-key' },
    TARGET: { url: 'http://target.test', apiKey: 'target-key' }
  };

  const logger = new Logger({ level: 'info' });
  const pluginRegistry = new MockPluginRegistry(mockPlugins);

  const manager = new TransferManager(config, { logger, pluginRegistry });
  manager.sourceClient = sourceClient;
  manager.targetClient = targetClient;

  const result = await manager.transfer({
    dryRun: true,
    deduplicator: 'standard-deduplicator',
    validators: ['integrity-validator'],
    reporters: []
  });

  // ASSERTIONS
  console.log('✓ Checking progress counters...');
  console.log(`  Total: ${result.total} (expected 5)`);
  console.log(`  Transferred: ${result.transferred} (expected 4)`);
  console.log(`  Skipped: ${result.skipped} (expected 1)`);
  console.log(`  Failed: ${result.failed} (expected 0)`);

  if (result.total !== 5) {
    console.error(`✗ FAIL: total is ${result.total} (expected 5)`);
    return false;
  }
  if (result.transferred !== 4) {
    console.error(`✗ FAIL: transferred is ${result.transferred} (expected 4)`);
    return false;
  }
  if (result.skipped !== 1) {
    console.error(`✗ FAIL: skipped is ${result.skipped} (expected 1)`);
    return false;
  }
  if (result.failed !== 0) {
    console.error(`✗ FAIL: failed is ${result.failed} (expected 0)`);
    return false;
  }

  console.log('✓ PASS: All progress counters are correct');

  console.log('\n✅ TEST 3 PASSED: Progress counters correctly track dry-run simulation');
  return true;
}

/**
 * Test 4: TransferSummary deve conter flag dryRun
 */
async function testTransferSummaryHasDryRunFlag() {
  console.log('\n=== TEST 4: TransferSummary should have dryRun flag ===\n');

  const sourceWorkflows = [
    { id: '1', name: 'Workflow 1', nodes: [], connections: {}, tags: [] }
  ];

  const sourceClient = new MockHttpClient('SOURCE', sourceWorkflows);
  const targetClient = new MockHttpClient('TARGET', []);

  const mockPlugins = {
    'standard-deduplicator': new MockDeduplicator(),
    'integrity-validator': new MockValidator('integrity-validator')
  };

  const config = {
    SOURCE: { url: 'http://source.test', apiKey: 'source-key' },
    TARGET: { url: 'http://target.test', apiKey: 'target-key' }
  };

  const logger = new Logger({ level: 'info' });
  const pluginRegistry = new MockPluginRegistry(mockPlugins);

  const manager = new TransferManager(config, { logger, pluginRegistry });
  manager.sourceClient = sourceClient;
  manager.targetClient = targetClient;

  // Test dry-run = true
  console.log('✓ Testing with dryRun: true...');
  const dryRunResult = await manager.transfer({
    dryRun: true,
    deduplicator: 'standard-deduplicator',
    validators: ['integrity-validator'],
    reporters: []
  });

  if (dryRunResult.dryRun !== true) {
    console.error(`✗ FAIL: dryRun flag is ${dryRunResult.dryRun} (expected true)`);
    return false;
  }
  console.log('✓ PASS: dryRun: true correctly set in summary');

  // Reset
  targetClient.createdWorkflows = [];
  targetClient.createWorkflowCallCount = 0;

  // Test dry-run = false
  console.log('\n✓ Testing with dryRun: false...');
  const realTransferResult = await manager.transfer({
    dryRun: false,
    deduplicator: 'standard-deduplicator',
    validators: ['integrity-validator'],
    reporters: []
  });

  if (realTransferResult.dryRun !== false) {
    console.error(`✗ FAIL: dryRun flag is ${realTransferResult.dryRun} (expected false)`);
    return false;
  }
  console.log('✓ PASS: dryRun: false correctly set in summary');

  // Verify real transfer actually created workflow
  if (targetClient.getCreateWorkflowCallCount() !== 1) {
    console.error(`✗ FAIL: Real transfer did not call createWorkflow (expected 1 call, got ${targetClient.getCreateWorkflowCallCount()})`);
    return false;
  }
  console.log('✓ PASS: Real transfer (dryRun: false) correctly called createWorkflow()');

  console.log('\n✅ TEST 4 PASSED: dryRun flag correctly reflects transfer mode');
  return true;
}

/**
 * Test 5: Validar que mensagem final é exibida (via log capture)
 */
async function testFinalDryRunMessage() {
  console.log('\n=== TEST 5: Final dry-run message should be displayed ===\n');

  const sourceWorkflows = [
    { id: '1', name: 'Workflow 1', nodes: [], connections: {}, tags: [] }
  ];

  const sourceClient = new MockHttpClient('SOURCE', sourceWorkflows);
  const targetClient = new MockHttpClient('TARGET', []);

  const mockPlugins = {
    'standard-deduplicator': new MockDeduplicator(),
    'integrity-validator': new MockValidator('integrity-validator')
  };

  const config = {
    SOURCE: { url: 'http://source.test', apiKey: 'source-key' },
    TARGET: { url: 'http://target.test', apiKey: 'target-key' }
  };

  // Create logger with custom log capture
  const capturedLogs = [];
  const logger = new Logger({ level: 'info' });
  const originalInfo = logger.info.bind(logger);
  logger.info = function(...args) {
    capturedLogs.push(args[0]);
    originalInfo(...args);
  };

  const pluginRegistry = new MockPluginRegistry(mockPlugins);

  const manager = new TransferManager(config, { logger, pluginRegistry });
  manager.sourceClient = sourceClient;
  manager.targetClient = targetClient;

  await manager.transfer({
    dryRun: true,
    deduplicator: 'standard-deduplicator',
    validators: ['integrity-validator'],
    reporters: []
  });

  // ASSERTIONS
  console.log('✓ Checking for dry-run completion message...');

  const hasDryRunMessage = capturedLogs.some(log =>
    typeof log === 'string' && log.includes('DRY-RUN MODE COMPLETED')
  );

  if (!hasDryRunMessage) {
    console.error('✗ FAIL: Dry-run completion message not found in logs');
    console.error('Captured logs:', capturedLogs);
    return false;
  }

  console.log('✓ PASS: Dry-run completion message found in logs');

  const hasSimulationMessage = capturedLogs.some(log =>
    typeof log === 'string' && log.includes('No workflows were actually transferred')
  );

  if (!hasSimulationMessage) {
    console.error('✗ FAIL: Simulation explanation message not found in logs');
    return false;
  }

  console.log('✓ PASS: Simulation explanation message found in logs');

  console.log('\n✅ TEST 5 PASSED: Final dry-run message is correctly displayed');
  return true;
}

/**
 * Test Suite Runner
 */
async function runTestSuite() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║       TASK 24: DRY-RUN MODE COMPREHENSIVE TESTS         ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  const tests = [
    { name: 'Test 1: No createWorkflow() calls', fn: testDryRunDoesNotCallCreateWorkflow },
    { name: 'Test 2: All workflows marked as simulated', fn: testAllWorkflowsMarkedAsSimulated },
    { name: 'Test 3: Progress counters correct', fn: testProgressCountersCorrect },
    { name: 'Test 4: TransferSummary has dryRun flag', fn: testTransferSummaryHasDryRunFlag },
    { name: 'Test 5: Final dry-run message displayed', fn: testFinalDryRunMessage }
  ];

  const results = [];

  for (const test of tests) {
    try {
      const passed = await test.fn();
      results.push({ name: test.name, passed });
    } catch (error) {
      console.error(`\n✗ ${test.name} threw an error:`, error.message);
      console.error(error.stack);
      results.push({ name: test.name, passed: false });
    }
  }

  // Summary
  console.log('\n\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                    TEST SUMMARY                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: ${result.name}`);
  });

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed (${results.length} total)`);

  if (failed > 0) {
    console.log('\n❌ SOME TESTS FAILED\n');
    process.exit(1);
  } else {
    console.log('\n✅ ALL TESTS PASSED\n');
    console.log('Task 24 validation complete. Dry-run mode is working correctly!\n');
    process.exit(0);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runTestSuite().catch(error => {
    console.error('Fatal error running test suite:', error);
    process.exit(1);
  });
}

module.exports = {
  testDryRunDoesNotCallCreateWorkflow,
  testAllWorkflowsMarkedAsSimulated,
  testProgressCountersCorrect,
  testTransferSummaryHasDryRunFlag,
  testFinalDryRunMessage,
  runTestSuite
};
