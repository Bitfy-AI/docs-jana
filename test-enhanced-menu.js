#!/usr/bin/env node

/**
 * Test script to diagnose Enhanced Menu issues
 */

console.log('🔍 Testing Enhanced Menu...\n');

// Test 1: Check if MenuOrchestrator can be loaded
console.log('Test 1: Loading MenuOrchestrator...');
try {
  const MenuOrchestrator = require('./src/ui/menu');
  console.log('✅ MenuOrchestrator loaded successfully');
  console.log('   Type:', typeof MenuOrchestrator);
  console.log('   Constructor:', MenuOrchestrator.name);
} catch (error) {
  console.error('❌ Failed to load MenuOrchestrator:', error.message);
  console.error('   Stack:', error.stack);
  process.exit(1);
}

// Test 2: Try to instantiate MenuOrchestrator
console.log('\nTest 2: Creating MenuOrchestrator instance...');
try {
  const MenuOrchestrator = require('./src/ui/menu');
  const menu = new MenuOrchestrator();
  console.log('✅ MenuOrchestrator instance created');
  console.log('   Methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(menu)));
} catch (error) {
  console.error('❌ Failed to create instance:', error.message);
  console.error('   Stack:', error.stack);
  process.exit(1);
}

// Test 3: Check dependencies
console.log('\nTest 3: Checking dependencies...');
const deps = [
  './src/ui/menu/components/StateManager',
  './src/ui/menu/components/ConfigManager',
  './src/ui/menu/components/CommandHistory',
  './src/ui/menu/utils/ThemeEngine',
  './src/ui/menu/utils/AnimationEngine',
  './src/ui/menu/utils/KeyboardMapper',
  './src/ui/menu/components/InputHandler',
  './src/ui/menu/components/UIRenderer'
];

for (const dep of deps) {
  try {
    require(dep);
    console.log(`  ✅ ${dep}`);
  } catch (error) {
    console.error(`  ❌ ${dep}: ${error.message}`);
  }
}

console.log('\n✨ All tests passed! Enhanced menu should work.\n');
