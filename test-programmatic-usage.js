#!/usr/bin/env node

/**
 * Test Programmatic Usage of index.js
 *
 * This script validates that index.js can be used programmatically
 * by requiring it and calling executeCommand() directly.
 *
 * Task 31: Validates programmatic API usage
 */

console.log('\n🧪 Testing Programmatic Usage of index.js\n');

// Test 1: Require the module
console.log('📦 Test 1: Require module');
try {
  const docsJana = require('./index.js');
  console.log('✅ Module loaded successfully');

  // Verify exports
  if (docsJana.executeCommand) {
    console.log('✅ executeCommand exported');
  } else {
    console.log('❌ executeCommand not exported');
    process.exit(1);
  }

  if (docsJana.ServiceContainer) {
    console.log('✅ ServiceContainer exported');
  } else {
    console.log('❌ ServiceContainer not exported');
    process.exit(1);
  }

  if (docsJana.CommandOrchestrator) {
    console.log('✅ CommandOrchestrator exported');
  } else {
    console.log('❌ CommandOrchestrator not exported');
    process.exit(1);
  }
} catch (error) {
  console.log('❌ Failed to require module:', error.message);
  process.exit(1);
}

console.log();

// Test 2: Execute command programmatically (invalid context)
console.log('🚀 Test 2: Execute with invalid context');
(async () => {
  try {
    const { executeCommand } = require('./index.js');
    const result = await executeCommand({});

    if (result.success === false && result.error?.code === 'INVALID_CONTEXT') {
      console.log('✅ Invalid context handled correctly');
      console.log(`   Message: ${result.message}`);
    } else {
      console.log('❌ Invalid context not handled correctly');
      process.exit(1);
    }
  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
    process.exit(1);
  }

  console.log();

  // Test 3: Execute command programmatically (unknown command)
  console.log('🚀 Test 3: Execute with unknown command');
  try {
    const { executeCommand } = require('./index.js');
    const result = await executeCommand({
      command: 'unknown:command',
      args: [],
      flags: {},
      env: process.env
    });

    if (result.success === false && result.error?.code === 'EXECUTION_ERROR') {
      console.log('✅ Unknown command handled correctly');
      console.log(`   Message: ${result.message}`);
    } else {
      console.log('❌ Unknown command not handled correctly');
      process.exit(1);
    }
  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
    process.exit(1);
  }

  console.log();

  // Test 4: Instantiate ServiceContainer
  console.log('🏗️  Test 4: Instantiate ServiceContainer');
  try {
    const { ServiceContainer } = require('./index.js');
    const container = new ServiceContainer();

    // Register a test service
    container.register('testService', () => ({ name: 'test' }));

    // Resolve the service
    const service = container.resolve('testService');

    if (service.name === 'test') {
      console.log('✅ ServiceContainer instantiated and working');
    } else {
      console.log('❌ ServiceContainer not working correctly');
      process.exit(1);
    }
  } catch (error) {
    console.log('❌ Failed to instantiate ServiceContainer:', error.message);
    process.exit(1);
  }

  console.log();

  // Test 5: Instantiate CommandOrchestrator
  console.log('🎭 Test 5: Instantiate CommandOrchestrator');
  try {
    const { CommandOrchestrator, ServiceContainer } = require('./index.js');
    const container = new ServiceContainer();
    const orchestrator = new CommandOrchestrator(container);

    if (orchestrator.container === container) {
      console.log('✅ CommandOrchestrator instantiated successfully');
    } else {
      console.log('❌ CommandOrchestrator not working correctly');
      process.exit(1);
    }
  } catch (error) {
    console.log('❌ Failed to instantiate CommandOrchestrator:', error.message);
    process.exit(1);
  }

  console.log();

  // Test 6: CommandResult format
  console.log('📋 Test 6: Verify CommandResult format');
  try {
    const { executeCommand } = require('./index.js');
    const result = await executeCommand({
      command: 'invalid',
      args: [],
      flags: {},
      env: process.env
    });

    const hasRequiredFields =
      typeof result.success === 'boolean' &&
      typeof result.message === 'string' &&
      (result.success || (result.error && typeof result.error.code === 'string'));

    if (hasRequiredFields) {
      console.log('✅ CommandResult has correct format');
      console.log('   Fields:', Object.keys(result).join(', '));
    } else {
      console.log('❌ CommandResult format incorrect');
      console.log('   Result:', result);
      process.exit(1);
    }
  } catch (error) {
    console.log('❌ Failed to get CommandResult:', error.message);
    process.exit(1);
  }

  console.log();
  console.log('🎉 All programmatic usage tests passed!\n');
})();
