/**
 * @fileoverview Test Script for Task 25 - Automatic Report Generation
 *
 * Tests all aspects of report generation including:
 * - Automatic report generation after transfer
 * - Multiple reporters working together
 * - Error handling (one reporter failing doesn't block others)
 * - Report paths returned correctly
 * - TransferSummary contains reports field
 * - No reports when no reporters configured
 *
 * @module tests/test-task-25-reports
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
  }

  async testConnection() {
    return { success: true };
  }

  async getWorkflows() {
    return [...this.workflows];
  }

  async createWorkflow(workflow) {
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
}

/**
 * Mock Deduplicator for testing
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
    return false; // Não detectar duplicatas neste teste
  }

  getReason() {
    return null;
  }
}

/**
 * Mock Reporter for testing
 */
class MockReporter {
  constructor(name, shouldFail = false, reportPath = null) {
    this.name = name;
    this.shouldFail = shouldFail;
    this.reportPath = reportPath || `/tmp/reports/${name}-report.md`;
    this.generateCalls = [];
  }

  getName() {
    return this.name;
  }

  isEnabled() {
    return true;
  }

  enable() {}

  generate(transferSummary) {
    this.generateCalls.push(transferSummary);

    if (this.shouldFail) {
      throw new Error(`Reporter ${this.name} intentionally failed`);
    }

    return this.reportPath;
  }

  getGenerateCalls() {
    return this.generateCalls;
  }
}

/**
 * Mock PluginRegistry for testing
 */
class MockPluginRegistry {
  constructor(deduplicator, validators = [], reporters = []) {
    this.plugins = {
      deduplicator,
      validators,
      reporters
    };
  }

  get(name, type) {
    if (type === 'deduplicator') {
      return this.plugins.deduplicator;
    } else if (type === 'validator') {
      return this.plugins.validators.find(v => v.getName() === name);
    } else if (type === 'reporter') {
      return this.plugins.reporters.find(r => r.getName() === name);
    }
    return null;
  }

  getAll() {
    return [
      this.plugins.deduplicator,
      ...this.plugins.validators,
      ...this.plugins.reporters
    ].filter(Boolean);
  }
}

/**
 * Test Runner
 */
async function runTests() {
  console.log('\n==========================================================');
  console.log('TASK 25: Automatic Report Generation Tests');
  console.log('==========================================================\n');

  const logger = new Logger({ level: 'info' });
  let testsPassed = 0;
  let testsFailed = 0;

  // Mock config
  const mockConfig = {
    SOURCE: { url: 'https://source.n8n.io', apiKey: 'source-key' },
    TARGET: { url: 'https://target.n8n.io', apiKey: 'target-key' }
  };

  // Mock workflows
  const sourceWorkflows = [
    {
      id: 'wf-1',
      name: 'Workflow 1',
      nodes: [{ id: 'node-1', name: 'Start', type: 'n8n-nodes-base.start', position: [0, 0], parameters: {} }],
      connections: {},
      tags: []
    },
    {
      id: 'wf-2',
      name: 'Workflow 2',
      nodes: [{ id: 'node-1', name: 'Start', type: 'n8n-nodes-base.start', position: [0, 0], parameters: {} }],
      connections: {},
      tags: []
    }
  ];

  // ============================================================================
  // TEST 1: Reports are generated automatically after transfer
  // ============================================================================
  try {
    console.log('TEST 1: Reports are generated automatically after transfer');
    console.log('-----------------------------------------------------------');

    const mockSourceClient = new MockHttpClient('SOURCE', sourceWorkflows);
    const mockTargetClient = new MockHttpClient('TARGET', []);
    const mockDeduplicator = new MockDeduplicator();
    const mockReporter1 = new MockReporter('markdown-reporter', false, '/tmp/report-1.md');
    const mockReporter2 = new MockReporter('json-reporter', false, '/tmp/report-2.json');

    const mockPluginRegistry = new MockPluginRegistry(
      mockDeduplicator,
      [],
      [mockReporter1, mockReporter2]
    );

    const manager = new TransferManager(mockConfig, { logger, pluginRegistry: mockPluginRegistry });
    manager.sourceClient = mockSourceClient;
    manager.targetClient = mockTargetClient;

    const summary = await manager.transfer({
      dryRun: false,
      reporters: ['markdown-reporter', 'json-reporter']
    });

    // Verificar que relatórios foram gerados
    if (!summary.reports || summary.reports.length !== 2) {
      throw new Error(`Expected 2 reports, got ${summary.reports ? summary.reports.length : 0}`);
    }

    // Verificar estrutura dos relatórios
    const report1 = summary.reports.find(r => r.reporter === 'markdown-reporter');
    const report2 = summary.reports.find(r => r.reporter === 'json-reporter');

    if (!report1 || report1.path !== '/tmp/report-1.md' || report1.format !== 'markdown') {
      throw new Error('Report 1 structure is invalid');
    }

    if (!report2 || report2.path !== '/tmp/report-2.json' || report2.format !== 'json') {
      throw new Error('Report 2 structure is invalid');
    }

    // Verificar que generate() foi chamado
    if (mockReporter1.getGenerateCalls().length !== 1) {
      throw new Error('Reporter 1 generate() was not called');
    }

    if (mockReporter2.getGenerateCalls().length !== 1) {
      throw new Error('Reporter 2 generate() was not called');
    }

    console.log('✅ PASSED: Reports generated automatically\n');
    testsPassed++;
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    console.error(error.stack);
    console.log('');
    testsFailed++;
  }

  // ============================================================================
  // TEST 2: Error in one reporter doesn't block others
  // ============================================================================
  try {
    console.log('TEST 2: Error in one reporter doesn\'t block others');
    console.log('-----------------------------------------------------');

    const mockSourceClient = new MockHttpClient('SOURCE', sourceWorkflows);
    const mockTargetClient = new MockHttpClient('TARGET', []);
    const mockDeduplicator = new MockDeduplicator();
    const mockReporter1 = new MockReporter('markdown-reporter', false, '/tmp/report-1.md');
    const mockReporter2 = new MockReporter('failing-reporter', true); // Este vai falhar
    const mockReporter3 = new MockReporter('csv-reporter', false, '/tmp/report-3.csv');

    const mockPluginRegistry = new MockPluginRegistry(
      mockDeduplicator,
      [],
      [mockReporter1, mockReporter2, mockReporter3]
    );

    const manager = new TransferManager(mockConfig, { logger, pluginRegistry: mockPluginRegistry });
    manager.sourceClient = mockSourceClient;
    manager.targetClient = mockTargetClient;

    const summary = await manager.transfer({
      dryRun: false,
      reporters: ['markdown-reporter', 'failing-reporter', 'csv-reporter']
    });

    // Verificar que apenas 2 relatórios foram gerados (o failing-reporter falhou)
    if (!summary.reports || summary.reports.length !== 2) {
      throw new Error(`Expected 2 reports (1 failed), got ${summary.reports ? summary.reports.length : 0}`);
    }

    // Verificar que os reporters corretos foram bem-sucedidos
    const report1 = summary.reports.find(r => r.reporter === 'markdown-reporter');
    const report3 = summary.reports.find(r => r.reporter === 'csv-reporter');
    const report2 = summary.reports.find(r => r.reporter === 'failing-reporter');

    if (!report1) {
      throw new Error('Markdown reporter should have succeeded');
    }

    if (!report3) {
      throw new Error('CSV reporter should have succeeded');
    }

    if (report2) {
      throw new Error('Failing reporter should not be in reports array');
    }

    console.log('✅ PASSED: Error handling works correctly\n');
    testsPassed++;
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    console.error(error.stack);
    console.log('');
    testsFailed++;
  }

  // ============================================================================
  // TEST 3: No reports when no reporters configured
  // ============================================================================
  try {
    console.log('TEST 3: No reports when no reporters configured');
    console.log('------------------------------------------------');

    const mockSourceClient = new MockHttpClient('SOURCE', sourceWorkflows);
    const mockTargetClient = new MockHttpClient('TARGET', []);
    const mockDeduplicator = new MockDeduplicator();

    const mockPluginRegistry = new MockPluginRegistry(
      mockDeduplicator,
      [],
      [] // Sem reporters
    );

    const manager = new TransferManager(mockConfig, { logger, pluginRegistry: mockPluginRegistry });
    manager.sourceClient = mockSourceClient;
    manager.targetClient = mockTargetClient;

    const summary = await manager.transfer({
      dryRun: false,
      reporters: [] // Sem reporters
    });

    // Verificar que nenhum relatório foi gerado
    if (summary.reports && summary.reports.length > 0) {
      throw new Error(`Expected 0 reports, got ${summary.reports.length}`);
    }

    console.log('✅ PASSED: No reports when no reporters configured\n');
    testsPassed++;
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    console.error(error.stack);
    console.log('');
    testsFailed++;
  }

  // ============================================================================
  // TEST 4: Report format detection works correctly
  // ============================================================================
  try {
    console.log('TEST 4: Report format detection works correctly');
    console.log('------------------------------------------------');

    const mockSourceClient = new MockHttpClient('SOURCE', sourceWorkflows);
    const mockTargetClient = new MockHttpClient('TARGET', []);
    const mockDeduplicator = new MockDeduplicator();
    const mockReporter1 = new MockReporter('markdown-reporter', false, '/tmp/report.md');
    const mockReporter2 = new MockReporter('json-reporter', false, '/tmp/report.json');
    const mockReporter3 = new MockReporter('csv-reporter', false, '/tmp/report.csv');
    const mockReporter4 = new MockReporter('custom-reporter', false, '/tmp/report.custom');

    const mockPluginRegistry = new MockPluginRegistry(
      mockDeduplicator,
      [],
      [mockReporter1, mockReporter2, mockReporter3, mockReporter4]
    );

    const manager = new TransferManager(mockConfig, { logger, pluginRegistry: mockPluginRegistry });
    manager.sourceClient = mockSourceClient;
    manager.targetClient = mockTargetClient;

    const summary = await manager.transfer({
      dryRun: false,
      reporters: ['markdown-reporter', 'json-reporter', 'csv-reporter', 'custom-reporter']
    });

    // Verificar formatos detectados
    const markdownReport = summary.reports.find(r => r.reporter === 'markdown-reporter');
    const jsonReport = summary.reports.find(r => r.reporter === 'json-reporter');
    const csvReport = summary.reports.find(r => r.reporter === 'csv-reporter');
    const customReport = summary.reports.find(r => r.reporter === 'custom-reporter');

    if (markdownReport.format !== 'markdown') {
      throw new Error(`Expected markdown format, got ${markdownReport.format}`);
    }

    if (jsonReport.format !== 'json') {
      throw new Error(`Expected json format, got ${jsonReport.format}`);
    }

    if (csvReport.format !== 'csv') {
      throw new Error(`Expected csv format, got ${csvReport.format}`);
    }

    if (customReport.format !== 'unknown') {
      throw new Error(`Expected unknown format, got ${customReport.format}`);
    }

    console.log('✅ PASSED: Report format detection works correctly\n');
    testsPassed++;
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    console.error(error.stack);
    console.log('');
    testsFailed++;
  }

  // ============================================================================
  // TEST 5: TransferSummary passed to reporters is complete
  // ============================================================================
  try {
    console.log('TEST 5: TransferSummary passed to reporters is complete');
    console.log('--------------------------------------------------------');

    const mockSourceClient = new MockHttpClient('SOURCE', sourceWorkflows);
    const mockTargetClient = new MockHttpClient('TARGET', []);
    const mockDeduplicator = new MockDeduplicator();
    const mockReporter = new MockReporter('markdown-reporter', false, '/tmp/report.md');

    const mockPluginRegistry = new MockPluginRegistry(
      mockDeduplicator,
      [],
      [mockReporter]
    );

    const manager = new TransferManager(mockConfig, { logger, pluginRegistry: mockPluginRegistry });
    manager.sourceClient = mockSourceClient;
    manager.targetClient = mockTargetClient;

    await manager.transfer({
      dryRun: false,
      reporters: ['markdown-reporter']
    });

    // Verificar que generate() recebeu summary completo
    const generateCalls = mockReporter.getGenerateCalls();

    if (generateCalls.length !== 1) {
      throw new Error('Reporter generate() should be called exactly once');
    }

    const receivedSummary = generateCalls[0];

    // Verificar campos obrigatórios
    if (typeof receivedSummary.total !== 'number') {
      throw new Error('Summary missing total');
    }

    if (typeof receivedSummary.transferred !== 'number') {
      throw new Error('Summary missing transferred');
    }

    if (typeof receivedSummary.skipped !== 'number') {
      throw new Error('Summary missing skipped');
    }

    if (typeof receivedSummary.failed !== 'number') {
      throw new Error('Summary missing failed');
    }

    if (typeof receivedSummary.duration !== 'number') {
      throw new Error('Summary missing duration');
    }

    if (!Array.isArray(receivedSummary.workflows)) {
      throw new Error('Summary missing workflows array');
    }

    console.log('✅ PASSED: TransferSummary is complete\n');
    testsPassed++;
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    console.error(error.stack);
    console.log('');
    testsFailed++;
  }

  // ==========================================================================
  // TEST SUMMARY
  // ==========================================================================
  console.log('\n==========================================================');
  console.log('TEST SUMMARY');
  console.log('==========================================================');
  console.log(`Total tests: ${testsPassed + testsFailed}`);
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log('==========================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

// Execute tests
if (require.main === module) {
  runTests().catch(error => {
    console.error('Fatal error running tests:', error);
    process.exit(1);
  });
}

module.exports = { runTests };
