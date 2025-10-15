#!/usr/bin/env node

/**
 * Test Script for Phase 1 Orchestration Layer
 *
 * Tests ServiceContainer, CommandOrchestrator, and executeCommand()
 */

const { ServiceContainer, CommandOrchestrator, executeCommand } = require('./index');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function assert(condition, message) {
  if (condition) {
    log(`✅ ${message}`, 'green');
    return true;
  } else {
    log(`❌ ${message}`, 'red');
    return false;
  }
}

// ===== TEST SUITE =====

async function runTests() {
  log('\n🧪 Testing Phase 1 Orchestration Layer\n', 'cyan');

  let passed = 0;
  let failed = 0;

  // ===== TEST 1: ServiceContainer =====
  log('📦 Test 1: ServiceContainer', 'yellow');

  try {
    const container = new ServiceContainer();

    // Test 1.1: Register service
    container.register('testService', (config) => ({ name: 'Test', config }));
    passed += assert(container.has('testService'), 'Can register service');

    // Test 1.2: Resolve service
    const service = container.resolve('testService', { value: 42 });
    passed += assert(service.name === 'Test', 'Can resolve service');
    passed += assert(service.config.value === 42, 'Service receives config');

    // Test 1.3: Caching
    const service2 = container.resolve('testService');
    passed += assert(service === service2, 'Services are cached');

    // Test 1.4: Clear cache
    container.clear();
    const service3 = container.resolve('testService');
    passed += assert(service !== service3, 'Clear removes cache');

    // Test 1.5: Error on unregistered service
    try {
      container.resolve('nonexistent');
      failed += 1;
      log('❌ Should throw error for unregistered service', 'red');
    } catch (error) {
      passed += assert(error.message.includes('not registered'), 'Throws error for unregistered service');
    }

    // Test 1.6: Get registered services
    const services = container.getRegisteredServices();
    passed += assert(services.includes('testService'), 'Can list registered services');

  } catch (error) {
    failed += 1;
    log(`❌ ServiceContainer test failed: ${error.message}`, 'red');
  }

  log('');

  // ===== TEST 2: CommandOrchestrator =====
  log('🎭 Test 2: CommandOrchestrator', 'yellow');

  try {
    const container = new ServiceContainer();
    const orchestrator = new CommandOrchestrator(container);

    // Test 2.1: Constructor validation
    try {
      new CommandOrchestrator(null);
      failed += 1;
      log('❌ Should throw error for invalid container', 'red');
    } catch (error) {
      passed += assert(error.message.includes('ServiceContainer'), 'Validates ServiceContainer instance');
    }

    // Test 2.2: Initialize
    const context = {
      command: 'test',
      args: [],
      flags: { verbose: false }
    };

    orchestrator.initialize(context);
    passed += assert(orchestrator.logger !== null, 'Initializes logger');
    passed += assert(container.has('logger'), 'Registers logger service');
    passed += assert(container.has('httpClient'), 'Registers httpClient service');
    passed += assert(container.has('fileManager'), 'Registers fileManager service');

    // Test 2.3: Cleanup
    orchestrator.cleanup();
    passed += assert(container.getRegisteredServices().length === 0, 'Cleanup clears services');

  } catch (error) {
    failed += 1;
    log(`❌ CommandOrchestrator test failed: ${error.message}`, 'red');
  }

  log('');

  // ===== TEST 3: executeCommand() API =====
  log('🚀 Test 3: executeCommand() API', 'yellow');

  try {
    // Test 3.1: Invalid context
    const result1 = await executeCommand({});
    passed += assert(result1.success === false, 'Rejects invalid context');
    passed += assert(result1.error.code === 'INVALID_CONTEXT', 'Returns INVALID_CONTEXT error');

    // Test 3.2: Unknown command
    const result2 = await executeCommand({ command: 'unknown:command' });
    passed += assert(result2.success === false, 'Rejects unknown command');
    passed += assert(result2.error.code === 'EXECUTION_ERROR', 'Returns EXECUTION_ERROR');

    // Test 3.3: Valid result structure
    passed += assert(typeof result2.success === 'boolean', 'Result has success field');
    passed += assert(typeof result2.message === 'string', 'Result has message field');
    passed += assert(result2.error !== undefined, 'Result has error field (on failure)');

  } catch (error) {
    failed += 1;
    log(`❌ executeCommand test failed: ${error.message}`, 'red');
  }

  log('');

  // ===== SUMMARY =====
  log('📊 Test Summary', 'cyan');
  log(`   ✅ Passed: ${passed}`, 'green');
  log(`   ❌ Failed: ${failed}`, 'red');
  log(`   📈 Total:  ${passed + failed}`, 'yellow');

  if (failed === 0) {
    log('\n🎉 All tests passed!\n', 'green');
    process.exit(0);
  } else {
    log('\n💥 Some tests failed\n', 'red');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  log(`\n💥 Test suite crashed: ${error.message}`, 'red');
  console.error(error.stack);
  process.exit(1);
});
