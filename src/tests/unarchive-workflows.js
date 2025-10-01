#!/usr/bin/env node

/**
 * N8N Workflow Unarchive Tool
 * Unarchives all archived workflows in N8N instance
 */

require('dotenv').config();
const WorkflowService = require('./src/services/workflow-service');
const HttpClient = require('./src/utils/http-client');
const ApiKeyStrategy = require('./src/auth/api-key-strategy');
const Logger = require('./src/utils/logger');

async function main() {
  const logger = new Logger({ level: 'info' });

  logger.section('📦 N8N Workflow Unarchive Tool');

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
    logger.success(`Found ${workflows.length} workflows total`);

    // Find archived workflows
    const archivedWorkflows = workflows.filter(w => w.isArchived === true);

    if (archivedWorkflows.length === 0) {
      logger.success('\n✅ No archived workflows found!');
      return;
    }

    logger.warn(`\n⚠️  Found ${archivedWorkflows.length} archived workflow(s):\n`);

    for (const wf of archivedWorkflows) {
      logger.info(`   📦 ${wf.name} (ID: ${wf.id})`);
    }

    logger.info(`\n🔓 Unarchiving ${archivedWorkflows.length} workflow(s)...\n`);

    let unarchived = 0;
    let failed = 0;

    for (const wf of archivedWorkflows) {
      try {
        logger.info(`Unarchiving: "${wf.name}" (ID: ${wf.id})`);

        // Use the updateWorkflow method from WorkflowService
        // This will properly clean the payload and use PUT
        await workflowService.updateWorkflow(wf.id, {
          name: wf.name,
          nodes: wf.nodes,
          connections: wf.connections,
          settings: wf.settings || {}
        });

        unarchived++;
        logger.success('   ✅ Unarchived successfully');
      } catch (error) {
        failed++;
        logger.error(`   ❌ Failed: ${error.message}`);
      }
    }

    logger.info('\n━'.repeat(50));
    logger.success('\n✅ Unarchive complete!');
    logger.info(`   Unarchived: ${unarchived}`);
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
