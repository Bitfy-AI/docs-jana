#!/usr/bin/env node

/**
 * Test script to verify CLI falls back gracefully to legacy menu
 * when enhanced menu cannot be displayed
 */

const { spawn } = require('child_process');

console.log('🧪 Testing CLI Fallback Behavior...\n');

// Simulate non-TTY environment (pipes disable TTY)
const cli = spawn('node', ['cli.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: __dirname
});

let output = '';

cli.stdout.on('data', (data) => {
  output += data.toString();
});

cli.stderr.on('data', (data) => {
  output += data.toString();
});

cli.on('close', (code) => {
  console.log('CLI Output:');
  console.log('─'.repeat(80));
  console.log(output);
  console.log('─'.repeat(80));

  // Verify fallback to legacy menu
  if (output.includes('📋 MENU PRINCIPAL')) {
    console.log('\n✅ SUCCESS: CLI fell back to legacy menu correctly!');
  } else if (output.includes('Enhanced menu failed')) {
    console.log('\n✅ SUCCESS: Enhanced menu error handled gracefully!');
  } else {
    console.log('\n❌ ERROR: Unexpected output');
  }

  // Send Ctrl+C to close
  cli.kill('SIGINT');
});

// Wait 2 seconds then kill
setTimeout(() => {
  cli.kill('SIGINT');
}, 2000);
