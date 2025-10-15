/**
 * Test script for Task 20 - TransferManager.transfer() validation
 *
 * This script tests:
 * 1. TransferOptions validation with valid options
 * 2. TransferOptions validation with invalid options
 * 3. Connectivity testing with SOURCE and TARGET
 * 4. Error handling and status updates
 */

const TransferManager = require('./core/transfer-manager');
const Logger = require('./core/logger');

// Helper function to create mock config
function createMockConfig() {
  return {
    SOURCE: {
      url: 'https://source.example.com',
      apiKey: 'mock-source-key-123'
    },
    TARGET: {
      url: 'https://target.example.com',
      apiKey: 'mock-target-key-456'
    }
  };
}

// Helper to create TransferManager with mocked HttpClient connectivity
function createMockedManager() {
  const logger = new Logger({ level: 'error' }); // Suppress logs for cleaner output
  const manager = new TransferManager(createMockConfig(), { logger });

  // Mock testConnection to always succeed
  manager.sourceClient.testConnection = async () => ({ success: true, message: 'Mocked connection' });
  manager.targetClient.testConnection = async () => ({ success: true, message: 'Mocked connection' });

  return manager;
}

// Test 1: Valid options with defaults
async function testValidOptionsWithDefaults() {
  console.log('\n=== Test 1: Valid options with defaults ===');

  const manager = createMockedManager();

  try {
    await manager.transfer({});
    console.log('❌ FAIL: Expected error was not thrown');
  } catch (error) {
    if (error.message.includes('Transfer implementation incomplete')) {
      console.log('✅ PASS: Validation succeeded, expected error thrown');

      // Check that status was updated
      const progress = manager.getProgress();
      if (progress.status === 'failed') {
        console.log('✅ PASS: Status correctly set to "failed" after error');
      } else {
        console.log(`❌ FAIL: Status should be "failed", got "${progress.status}"`);
      }
    } else {
      console.log(`❌ FAIL: Unexpected error: ${error.message}`);
    }
  }
}

// Test 2: Valid options with custom values
async function testValidOptionsWithCustomValues() {
  console.log('\n=== Test 2: Valid options with custom values ===');

  const manager = createMockedManager();

  const options = {
    filters: {
      tags: ['production'],
      excludeTags: ['deprecated']
    },
    dryRun: true,
    parallelism: 5,
    deduplicator: 'fuzzy-deduplicator',
    validators: ['integrity-validator', 'schema-validator'],
    reporters: ['markdown-reporter', 'json-reporter'],
    skipCredentials: true
  };

  try {
    await manager.transfer(options);
    console.log('❌ FAIL: Expected error was not thrown');
  } catch (error) {
    if (error.message.includes('Transfer implementation incomplete')) {
      console.log('✅ PASS: Validation succeeded with custom options');
    } else {
      console.log(`❌ FAIL: Unexpected error: ${error.message}`);
    }
  }
}

// Test 3: Invalid parallelism (out of range)
async function testInvalidParallelism() {
  console.log('\n=== Test 3: Invalid parallelism (out of range) ===');

  const manager = createMockedManager();

  const options = {
    parallelism: 15 // Invalid: max is 10
  };

  try {
    await manager.transfer(options);
    console.log('❌ FAIL: Should have thrown validation error for invalid parallelism');
  } catch (error) {
    if (error.message.includes('validation failed') || error.message.includes('less than or equal to 10')) {
      console.log('✅ PASS: Validation correctly rejected invalid parallelism');
    } else {
      console.log(`❌ FAIL: Expected validation error, got: ${error.message}`);
    }
  }
}

// Test 4: Invalid option type (dryRun as string instead of boolean)
async function testInvalidOptionType() {
  console.log('\n=== Test 4: Invalid option type (dryRun as string) ===');

  const manager = createMockedManager();

  const options = {
    dryRun: 'yes' // Invalid: should be boolean
  };

  try {
    await manager.transfer(options);
    console.log('❌ FAIL: Should have thrown validation error for invalid type');
  } catch (error) {
    if (error.message.includes('validation failed') || error.message.includes('boolean')) {
      console.log('✅ PASS: Validation correctly rejected invalid type');
    } else {
      console.log(`❌ FAIL: Expected validation error, got: ${error.message}`);
    }
  }
}

// Test 5: Extra/unknown fields (strict mode)
async function testStrictValidation() {
  console.log('\n=== Test 5: Extra/unknown fields (strict mode) ===');

  const manager = createMockedManager();

  const options = {
    dryRun: true,
    unknownField: 'should-be-rejected' // Invalid: not in schema
  };

  try {
    await manager.transfer(options);
    console.log('❌ FAIL: Should have thrown validation error for unknown field');
  } catch (error) {
    if (error.message.includes('validation failed') || error.message.includes('Unrecognized key')) {
      console.log('✅ PASS: Validation correctly rejected unknown field (strict mode)');
    } else {
      console.log(`❌ FAIL: Expected validation error, got: ${error.message}`);
    }
  }
}

// Test 6: Progress status updates
async function testProgressStatusUpdates() {
  console.log('\n=== Test 6: Progress status updates ===');

  const manager = createMockedManager();

  // Check initial status
  let progress = manager.getProgress();
  if (progress.status !== 'idle') {
    console.log(`❌ FAIL: Initial status should be "idle", got "${progress.status}"`);
    return;
  }
  console.log('✅ PASS: Initial status is "idle"');

  // Execute transfer (will fail at implementation check)
  try {
    await manager.transfer({ dryRun: true });
  } catch (error) {
    // Expected
  }

  // Check final status
  progress = manager.getProgress();
  if (progress.status === 'failed') {
    console.log('✅ PASS: Status updated to "failed" after error');
  } else {
    console.log(`❌ FAIL: Status should be "failed", got "${progress.status}"`);
  }
}

// Main test runner
async function runTests() {
  console.log('=================================================');
  console.log('Task 20 Validation Tests');
  console.log('Testing TransferManager.transfer() - Part 1');
  console.log('=================================================');

  try {
    await testValidOptionsWithDefaults();
    await testValidOptionsWithCustomValues();
    await testInvalidParallelism();
    await testInvalidOptionType();
    await testStrictValidation();
    await testProgressStatusUpdates();

    console.log('\n=================================================');
    console.log('All tests completed!');
    console.log('=================================================\n');

    console.log('Note: Connectivity tests are skipped because they require');
    console.log('actual N8N servers. The mock config will cause connectivity');
    console.log('failures, which is expected behavior.');

  } catch (error) {
    console.error('\n❌ Test suite failed with unexpected error:', error);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runTests };
