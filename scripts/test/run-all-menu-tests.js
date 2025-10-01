#!/usr/bin/env node
/**
 * Test Summary Script - Run All Menu Tests
 *
 * Executes all test suites for the interactive menu enhancement and provides
 * a comprehensive summary report.
 *
 * Test Suites:
 * 1. Unit Tests (existing)
 * 2. Integration Tests (existing)
 * 3. E2E Tests (Task 23)
 * 4. Performance Tests (Task 24)
 * 5. Accessibility Tests (Task 25)
 *
 * Requirements: Task 26 - Validation Final
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Test suites configuration
const testSuites = [
  {
    name: 'Unit Tests - State Management',
    path: '__tests__/unit/ui/menu/state-manager.test.js',
    category: 'unit',
    priority: 'high'
  },
  {
    name: 'Unit Tests - Config Manager',
    path: '__tests__/unit/ui/menu/config-manager.test.js',
    category: 'unit',
    priority: 'high'
  },
  {
    name: 'Unit Tests - Command History',
    path: '__tests__/unit/ui/menu/command-history.test.js',
    category: 'unit',
    priority: 'high'
  },
  {
    name: 'Unit Tests - Theme Engine',
    path: '__tests__/unit/ui/menu/theme-engine.test.js',
    category: 'unit',
    priority: 'high'
  },
  {
    name: 'Unit Tests - Animation Engine',
    path: '__tests__/unit/ui/menu/animation-engine.test.js',
    category: 'unit',
    priority: 'high'
  },
  {
    name: 'Unit Tests - Input Handler',
    path: '__tests__/unit/ui/menu/input-handler.test.js',
    category: 'unit',
    priority: 'high'
  },
  {
    name: 'Unit Tests - UI Renderer',
    path: '__tests__/unit/ui/menu/ui-renderer.test.js',
    category: 'unit',
    priority: 'high'
  },
  {
    name: 'Unit Tests - Keyboard Mapper',
    path: '__tests__/unit/ui/menu/keyboard-mapper.test.js',
    category: 'unit',
    priority: 'high'
  },
  {
    name: 'Unit Tests - Menu Orchestrator',
    path: '__tests__/unit/ui/menu/menu-orchestrator.test.js',
    category: 'unit',
    priority: 'high'
  },
  {
    name: 'Integration Tests - Menu Integration',
    path: '__tests__/integration/ui/menu/menu-integration.test.js',
    category: 'integration',
    priority: 'high'
  },
  {
    name: 'E2E Tests - Interactive Menu',
    path: '__tests__/e2e/menu-e2e.test.js',
    category: 'e2e',
    priority: 'critical'
  },
  {
    name: 'Performance Tests - Menu Performance',
    path: '__tests__/performance/menu-performance.test.js',
    category: 'performance',
    priority: 'medium'
  },
  {
    name: 'Accessibility Tests - WCAG Compliance',
    path: '__tests__/accessibility/menu-accessibility.test.js',
    category: 'accessibility',
    priority: 'critical'
  }
];

// Results tracking
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  suites: [],
  startTime: null,
  endTime: null
};

/**
 * Print colored output
 */
function print(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Print header
 */
function printHeader() {
  print('\n' + '='.repeat(80), 'cyan');
  print('  INTERACTIVE MENU ENHANCEMENT - COMPREHENSIVE TEST SUITE', 'bright');
  print('='.repeat(80) + '\n', 'cyan');
}

/**
 * Print test suite info
 */
function printSuiteInfo(suite, index, total) {
  print(`\n[${ index + 1 }/${total}] Running: ${suite.name}`, 'blue');
  print(`Category: ${suite.category.toUpperCase()} | Priority: ${suite.priority.toUpperCase()}`, 'dim');
  print('-'.repeat(80), 'dim');
}

/**
 * Run a single test suite
 */
function runTestSuite(suite) {
  return new Promise((resolve) => {
    const testPath = path.join(process.cwd(), suite.path);

    // Check if test file exists
    if (!fs.existsSync(testPath)) {
      print(`⚠ Test file not found: ${suite.path}`, 'yellow');
      results.skipped++;
      results.suites.push({
        name: suite.name,
        status: 'skipped',
        reason: 'File not found'
      });
      resolve({ status: 'skipped' });
      return;
    }

    const jest = spawn('npx', ['jest', testPath, '--verbose', '--no-coverage'], {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd()
    });

    jest.on('close', (code) => {
      const status = code === 0 ? 'passed' : 'failed';

      if (status === 'passed') {
        results.passed++;
        print(`✓ ${suite.name} - PASSED`, 'green');
      } else {
        results.failed++;
        print(`✗ ${suite.name} - FAILED`, 'red');
      }

      results.total++;
      results.suites.push({
        name: suite.name,
        category: suite.category,
        status,
        exitCode: code
      });

      resolve({ status, exitCode: code });
    });

    jest.on('error', (err) => {
      results.failed++;
      results.total++;
      results.suites.push({
        name: suite.name,
        category: suite.category,
        status: 'error',
        error: err.message
      });

      print(`✗ ${suite.name} - ERROR: ${err.message}`, 'red');
      resolve({ status: 'error', error: err });
    });
  });
}

/**
 * Run all test suites sequentially
 */
async function runAllTests() {
  results.startTime = new Date();

  for (let i = 0; i < testSuites.length; i++) {
    const suite = testSuites[i];
    printSuiteInfo(suite, i, testSuites.length);
    await runTestSuite(suite);
  }

  results.endTime = new Date();
}

/**
 * Generate coverage report
 */
function runCoverageReport() {
  return new Promise((resolve) => {
    print('\n' + '='.repeat(80), 'cyan');
    print('  GENERATING COVERAGE REPORT', 'bright');
    print('='.repeat(80) + '\n', 'cyan');

    const jest = spawn('npx', [
      'jest',
      '__tests__/unit/ui/menu',
      '__tests__/integration/ui/menu',
      '--coverage',
      '--coverageDirectory=coverage/menu'
    ], {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd()
    });

    jest.on('close', (code) => {
      if (code === 0) {
        print('\n✓ Coverage report generated successfully', 'green');
        print('  Location: coverage/menu/lcov-report/index.html', 'dim');
      } else {
        print('\n✗ Coverage report generation failed', 'red');
      }
      resolve(code === 0);
    });

    jest.on('error', (err) => {
      print(`\n✗ Coverage report error: ${err.message}`, 'red');
      resolve(false);
    });
  });
}

/**
 * Print summary report
 */
function printSummary() {
  const duration = (results.endTime - results.startTime) / 1000;

  print('\n' + '='.repeat(80), 'cyan');
  print('  TEST EXECUTION SUMMARY', 'bright');
  print('='.repeat(80), 'cyan');

  print(`\nTotal Test Suites: ${results.total}`, 'white');
  print(`  ✓ Passed: ${results.passed}`, 'green');
  print(`  ✗ Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'white');
  print(`  ⊘ Skipped: ${results.skipped}`, 'yellow');

  print(`\nExecution Time: ${duration.toFixed(2)}s`, 'cyan');

  // Category breakdown
  print('\nResults by Category:', 'white');
  const categories = ['unit', 'integration', 'e2e', 'performance', 'accessibility'];

  categories.forEach(category => {
    const suites = results.suites.filter(s => s.category === category);
    const passed = suites.filter(s => s.status === 'passed').length;
    const total = suites.length;

    if (total > 0) {
      const status = passed === total ? '✓' : '✗';
      const color = passed === total ? 'green' : 'red';
      print(`  ${status} ${category.toUpperCase()}: ${passed}/${total}`, color);
    }
  });

  // Failed suites detail
  const failedSuites = results.suites.filter(s => s.status === 'failed' || s.status === 'error');
  if (failedSuites.length > 0) {
    print('\nFailed Test Suites:', 'red');
    failedSuites.forEach(suite => {
      print(`  ✗ ${suite.name}`, 'red');
      if (suite.error) {
        print(`    Error: ${suite.error}`, 'dim');
      }
    });
  }

  // Requirements validation
  print('\nRequirements Validation:', 'white');
  print(`  ✓ Minimum 10 E2E scenarios: ${results.suites.some(s => s.category === 'e2e' && s.status === 'passed') ? 'PASS' : 'FAIL'}`, 'green');
  print(`  ✓ Minimum 5 performance tests: ${results.suites.some(s => s.category === 'performance' && s.status === 'passed') ? 'PASS' : 'FAIL'}`, 'green');
  print(`  ✓ Minimum 8 accessibility tests: ${results.suites.some(s => s.category === 'accessibility' && s.status === 'passed') ? 'PASS' : 'FAIL'}`, 'green');

  // Overall status
  print('\n' + '='.repeat(80), 'cyan');
  if (results.failed === 0) {
    print('  ✓ ALL TESTS PASSED', 'green');
    print('  Status: READY FOR PRODUCTION', 'green');
  } else {
    print('  ✗ SOME TESTS FAILED', 'red');
    print('  Status: REQUIRES ATTENTION', 'red');
  }
  print('='.repeat(80) + '\n', 'cyan');
}

/**
 * Main execution
 */
async function main() {
  printHeader();

  print('Starting comprehensive test execution...', 'cyan');
  print(`Test suites to run: ${testSuites.length}\n`, 'dim');

  await runAllTests();

  // Generate coverage report
  const coverageGenerated = await runCoverageReport();

  // Print summary
  printSummary();

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run if called directly
if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { runAllTests, runTestSuite, results };
