/**
 * IconMapper Demo - Demonstrates icon fallback chain
 *
 * Run this file to see how IconMapper resolves icons based on terminal capabilities
 *
 * Usage: node examples/icon-mapper-demo.js
 */

const chalk = require('chalk');
const TerminalDetector = require('../src/ui/menu/visual/TerminalDetector');
const IconMapper = require('../src/ui/menu/visual/IconMapper');

// Initialize components
const detector = new TerminalDetector();
detector.initialize(chalk);

const iconMapper = new IconMapper(detector);

// Detect terminal capabilities
const capabilities = detector.detect();

console.log('\n' + '='.repeat(60));
console.log(chalk.bold.cyan('  IconMapper Demo - Icon Fallback Chain'));
console.log('='.repeat(60));

console.log('\n📋 Terminal Capabilities:');
console.log(`  - Unicode Support: ${capabilities.supportsUnicode ? '✓' : '✗'}`);
console.log(`  - Emoji Support: ${capabilities.supportsEmojis ? '✓' : '✗'}`);
console.log(`  - Color Level: ${capabilities.colorLevel} (0=none, 1=basic, 2=256, 3=truecolor)`);
console.log(`  - Terminal Type: ${capabilities.terminalType}`);
console.log(`  - Platform: ${capabilities.platform}`);

console.log('\n⚡ Action Icons:');
const actionTypes = ['download', 'upload', 'settings', 'docs', 'stats', 'refresh', 'help', 'exit'];
actionTypes.forEach(action => {
  const icon = iconMapper.getIcon(action);
  console.log(`  ${icon} ${action}`);
});

console.log('\n🎨 Status Icons:');
const statusTypes = ['success', 'error', 'warning', 'info', 'neutral'];
statusTypes.forEach(status => {
  const icon = iconMapper.getStatusIcon(status);
  const color = {
    success: chalk.green,
    error: chalk.red,
    warning: chalk.yellow,
    info: chalk.blue,
    neutral: chalk.gray
  }[status];
  console.log(`  ${color(icon)} ${status}`);
});

console.log('\n📁 Category Icons:');
const categories = ['action', 'utility', 'destructive', 'info'];
categories.forEach(category => {
  const icon = iconMapper.getCategoryIcon(category);
  console.log(`  ${icon} ${category}`);
});

console.log('\n▶ Selection Indicator:');
const selectionIndicator = iconMapper.getSelectionIndicator();
console.log(`  ${chalk.bold.cyan(selectionIndicator)} Selected option`);
console.log(`    Unselected option`);

console.log('\n🔧 Custom Icon Registration:');
iconMapper.registerIcon('deploy', {
  emoji: '🚀',
  unicode: '↑',
  ascii: '^',
  plain: '[D]'
});
const deployIcon = iconMapper.getIcon('deploy');
console.log(`  ${chalk.magenta(deployIcon)} deploy (custom registered)`);

console.log('\n💾 Cache Performance:');
console.log('  Cache Status:');
// Get same icon multiple times to demonstrate caching
const start = Date.now();
for (let i = 0; i < 1000; i++) {
  iconMapper.getIcon('download');
}
const duration = Date.now() - start;
console.log(`  - 1000 getIcon() calls: ${duration}ms`);
console.log(`  - Cache enabled: Icons are resolved once and cached`);

console.log('\n' + '='.repeat(60));
console.log(chalk.bold.green('✓ IconMapper Demo Complete'));
console.log('='.repeat(60) + '\n');
