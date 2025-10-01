#!/usr/bin/env node

/**
 * Test script for N8N Tag Management Operations
 *
 * This script demonstrates the tag management functionality:
 * - Listing all tags
 * - Creating new tags
 * - Getting or creating tags (idempotent)
 * - Updating workflow tags
 * - Extracting tags from workflow JSON
 *
 * Usage:
 *   node test-tag-operations.js
 *
 * Prerequisites:
 *   - N8N instance must be running
 *   - .env file must be configured with N8N_BASE_URL and N8N_API_KEY
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');

// Import required services
const Logger = require('./src/utils/logger');
const HttpClient = require('./src/utils/http-client');
const ConfigManager = require('./src/utils/config-manager');
const AuthFactory = require('./src/auth/auth-factory');
const WorkflowService = require('./src/services/workflow-service');

async function main() {
  console.log('='.repeat(70));
  console.log('N8N Tag Management Test');
  console.log('='.repeat(70));
  console.log();

  // Initialize services
  const logger = new Logger({ level: 'debug' });
  const configManager = new ConfigManager();

  try {
    // Load N8N configuration
    const config = configManager.loadN8NConfig();
    logger.info(`Connected to N8N: ${config.baseUrl}`);

    // Create authentication strategy
    const authStrategy = AuthFactory.createN8NAuthStrategy(config);

    // Create HTTP client with auth
    const httpClient = new HttpClient(config.baseUrl, authStrategy, logger, {
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
    });

    // Create workflow service
    const workflowService = new WorkflowService(httpClient, authStrategy, logger);

    // Test 1: List all existing tags
    console.log('\n1. LISTING ALL TAGS');
    console.log('-'.repeat(70));
    const existingTags = await workflowService.listTags();
    console.log(`Found ${existingTags.length} existing tags:`);
    existingTags.forEach(tag => {
      console.log(`  - ${tag.name} (ID: ${tag.id})`);
    });

    // Test 2: Create a new tag (if not exists)
    console.log('\n2. CREATING/GETTING TEST TAG');
    console.log('-'.repeat(70));
    const testTagName = 'test-tag-' + Date.now();
    console.log(`Creating tag: ${testTagName}`);
    const testTag = await workflowService.createTag(testTagName);
    console.log(`Created tag: ${testTag.name} (ID: ${testTag.id})`);

    // Test 3: Get or create tag (idempotent operation)
    console.log('\n3. TESTING GET-OR-CREATE (IDEMPOTENT)');
    console.log('-'.repeat(70));

    // First call - should find or create
    console.log('First call to getOrCreateTag("production")...');
    const tag1 = await workflowService.getOrCreateTag('production');
    console.log(`Result: ${tag1.name} (ID: ${tag1.id})`);

    // Second call - should find existing
    console.log('Second call to getOrCreateTag("production")...');
    const tag2 = await workflowService.getOrCreateTag('production');
    console.log(`Result: ${tag2.name} (ID: ${tag2.id})`);

    if (tag1.id === tag2.id) {
      console.log('✓ SUCCESS: Both calls returned the same tag ID (idempotent)');
    } else {
      console.log('✗ FAILURE: Different tag IDs returned!');
    }

    // Test 4: Extract tags from workflow JSON
    console.log('\n4. EXTRACTING TAGS FROM WORKFLOW FILE');
    console.log('-'.repeat(70));

    // Find a workflow JSON file to test with
    const workflowDir = path.join(__dirname, 'n8n-workflows-2025-10-01T13-27-51');
    let workflowFiles = [];

    if (fs.existsSync(workflowDir)) {
      workflowFiles = fs.readdirSync(workflowDir)
        .filter(file => file.endsWith('.json'))
        .slice(0, 3); // Take first 3 files
    }

    if (workflowFiles.length > 0) {
      console.log(`Found ${workflowFiles.length} workflow files to analyze:\n`);

      for (const file of workflowFiles) {
        const filePath = path.join(workflowDir, file);
        const workflowData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        console.log(`Workflow: ${workflowData.name}`);
        console.log(`  ID: ${workflowData.id}`);

        // Extract tag names
        const tagNames = workflowService._extractTagNames(workflowData);
        if (tagNames.length > 0) {
          console.log(`  Tags found: ${tagNames.join(', ')}`);

          // Process tags (get or create)
          console.log('  Processing tags...');
          const tagIds = await workflowService._processWorkflowTags(workflowData);
          console.log(`  Tag IDs: ${tagIds.join(', ')}`);
        } else {
          console.log('  No tags found');
        }
        console.log();
      }
    } else {
      console.log('No workflow files found for testing.');
      console.log('Download some workflows first using: node cli.js n8n:download');
    }

    // Test 5: List all tags again to see what was created
    console.log('\n5. FINAL TAG LIST');
    console.log('-'.repeat(70));
    const finalTags = await workflowService.listTags();
    console.log(`Total tags in N8N: ${finalTags.length}`);
    finalTags.forEach(tag => {
      const isNew = !existingTags.find(t => t.id === tag.id);
      const marker = isNew ? '[NEW]' : '     ';
      console.log(`  ${marker} ${tag.name} (ID: ${tag.id})`);
    });

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('TEST SUMMARY');
    console.log('='.repeat(70));
    console.log(`Tags at start:  ${existingTags.length}`);
    console.log(`Tags at end:    ${finalTags.length}`);
    console.log(`Tags created:   ${finalTags.length - existingTags.length}`);
    console.log('\n✓ All tag operations completed successfully!');
    console.log('='.repeat(70));

  } catch (error) {
    logger.error('Test failed:', error.message);
    console.error('\nError details:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { main };
