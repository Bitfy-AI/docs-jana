#!/usr/bin/env node

/**
 * Test script to run enhanced menu directly
 */

require('dotenv').config();

console.log('🚀 Testing Enhanced Menu Integration...\n');

async function testEnhancedMenu() {
  try {
    console.log('Loading MenuOrchestrator...');
    const MenuOrchestrator = require('./src/ui/menu');

    console.log('Creating instance...');
    const menuOrchestrator = new MenuOrchestrator();

    console.log('Showing menu...\n');
    console.log('─'.repeat(80));

    const result = await menuOrchestrator.show();

    console.log('\n' + '─'.repeat(80));
    console.log('\n✅ Menu returned result:', result);

  } catch (error) {
    console.error('\n❌ Enhanced menu failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testEnhancedMenu();
