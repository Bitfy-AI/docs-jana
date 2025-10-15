#!/usr/bin/env node

/**
 * Test script to verify command execution via index.js
 */

require('dotenv').config();

console.log('🧪 Testing Command Execution via executeCommand()...\n');

async function testCommandExecution() {
  const { executeCommand } = require('./index');

  console.log('Test 1: Execute "version" command');
  console.log('─'.repeat(80));

  try {
    const result = await executeCommand({
      command: 'version',
      args: [],
      flags: {},
      env: process.env
    });

    console.log('\n📊 Result:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✅ Command executed successfully!');
    } else {
      console.log('\n❌ Command failed:', result.message);
      if (result.error) {
        console.log('Error details:', result.error);
      }
    }
  } catch (error) {
    console.error('\n❌ Exception during execution:', error.message);
    console.error('Stack:', error.stack);
  }

  console.log('\n' + '─'.repeat(80));

  // Test 2: Try executing a real command (n8n:download)
  console.log('\nTest 2: Execute "n8n:download" command (should fail gracefully without config)');
  console.log('─'.repeat(80));

  try {
    const result = await executeCommand({
      command: 'n8n:download',
      args: ['--help'],
      flags: { verbose: true },
      env: process.env
    });

    console.log('\n📊 Result:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✅ Command executed successfully!');
    } else {
      console.log('\n⚠️  Command failed (expected):', result.message);
      if (result.error) {
        console.log('Error code:', result.error.code);
      }
    }
  } catch (error) {
    console.error('\n❌ Exception during execution:', error.message);
  }

  console.log('\n' + '─'.repeat(80));
  console.log('\n✨ Tests completed!\n');
}

testCommandExecution();
