#!/usr/bin/env node

/**
 * Performance Test for Orchestration Layer
 *
 * Validates that orchestration overhead is < 50ms
 * Task 33: Performance validation
 */

const { executeCommand } = require('./index.js');

console.log('\n⚡ Performance Test: Orchestration Overhead\n');

async function measureOverhead() {
  const iterations = 100;
  const times = [];

  console.log(`Running ${iterations} iterations...\n`);

  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();

    // Execute invalid command (fast path - no actual work)
    await executeCommand({
      command: 'test:perf',
      args: [],
      flags: {},
      env: process.env
    });

    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;
    times.push(durationMs);
  }

  // Calculate statistics
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  const median = times.sort((a, b) => a - b)[Math.floor(times.length / 2)];

  console.log('📊 Results:');
  console.log(`   Average:  ${avg.toFixed(2)}ms`);
  console.log(`   Median:   ${median.toFixed(2)}ms`);
  console.log(`   Min:      ${min.toFixed(2)}ms`);
  console.log(`   Max:      ${max.toFixed(2)}ms`);
  console.log();

  // Check acceptance criteria: overhead < 50ms
  const threshold = 50;
  if (avg < threshold) {
    console.log(`✅ PASS: Average overhead (${avg.toFixed(2)}ms) < ${threshold}ms`);
    console.log();
    return true;
  } else {
    console.log(`❌ FAIL: Average overhead (${avg.toFixed(2)}ms) >= ${threshold}ms`);
    console.log();
    return false;
  }
}

// Run the test
measureOverhead().then(passed => {
  if (passed) {
    console.log('🎉 Performance test passed!\n');
    process.exit(0);
  } else {
    console.log('⚠️  Performance test failed\n');
    process.exit(1);
  }
});
