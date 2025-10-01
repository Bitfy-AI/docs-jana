#!/usr/bin/env node

/**
 * N8N Delete All Workflows Tool
 * Deletes all workflows from N8N instance
 */

require('dotenv').config();
const WorkflowService = require('./src/services/workflow-service');
const HttpClient = require('./src/utils/http-client');
const ApiKeyStrategy = require('./src/auth/api-key-strategy');
const Logger = require('./src/utils/logger');

async function main() {
  const logger = new Logger({ level: 'info' });

  logger.section('🗑️  N8N Delete All Workflows');

  // Check for confirmation flag
  const isConfirmed = process.argv.includes('--confirm');
  if (!isConfirmed) {
    logger.error('⚠️  This will DELETE ALL workflows from N8N!');
    logger.info('   Run with --confirm flag to proceed');
    process.exit(1);
  }

  try {
    // Initialize authentication
    const authStrategy = new ApiKeyStrategy(process.env.N8N_API_KEY);

    // Initialize HTTP client
    const httpClient = new HttpClient(
      process.env.N8N_URL,
      authStrategy.getHeaders(),
      {
        maxRetries: 3,
        baseDelay: 1000,
        timeout: 30000
      }
    );

    // Initialize workflow service
    const workflowService = new WorkflowService(httpClient, authStrategy, logger);

    logger.info(`🎯 Target N8N: ${process.env.N8N_URL}`);
    logger.info('📊 Fetching all workflows...\n');

    // Fetch all workflows
    const workflows = await workflowService.listWorkflows();
    logger.success(`Found ${workflows.length} workflows to delete\n`);

    if (workflows.length === 0) {
      logger.success('✅ No workflows to delete!');
      return;
    }

    logger.warn(`⚠️  Deleting ${workflows.length} workflow(s)...\n`);

    let deleted = 0;
    let failed = 0;

    for (const wf of workflows) {
      try {
        logger.info(`Deleting: "${wf.name}" (ID: ${wf.id})`);
        await workflowService.deleteWorkflow(wf.id);
        deleted++;
        logger.success('   ✅ Deleted');
      } catch (error) {
        failed++;
        logger.error(`   ❌ Failed: ${error.message}`);
      }
    }

    logger.info('\n━'.repeat(50));
    logger.success('\n✅ Delete complete!');
    logger.info(`   Deleted: ${deleted}`);
    if (failed > 0) {
      logger.error(`   Failed: ${failed}`);
    }

  } catch (error) {
    logger.error(`\n❌ Error: ${error.message}`);
    if (error.stack) {
      logger.debug(error.stack);
    }
    process.exit(1);
  }
}

main();
