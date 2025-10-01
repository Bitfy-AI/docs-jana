#!/usr/bin/env node

/**
 * N8N Duplicate Workflow Cleanup Tool
 * Identifies and optionally removes duplicate workflows from N8N instance
 */

require('dotenv').config();
const WorkflowService = require('./src/services/workflow-service');
const HttpClient = require('./src/utils/http-client');
const ApiKeyStrategy = require('./src/auth/api-key-strategy');
const Logger = require('./src/utils/logger');

async function main() {
  const logger = new Logger({ level: 'info' });

  logger.section('🧹 N8N Duplicate Workflow Cleanup');

  // Check for dry-run flag
  const isDryRun = process.argv.includes('--dry-run');
  if (isDryRun) {
    logger.warn('⚠️  DRY-RUN MODE: No workflows will be deleted');
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
    logger.success(`Found ${workflows.length} workflows total`);

    // Group workflows by name
    const workflowsByName = new Map();
    for (const workflow of workflows) {
      if (!workflowsByName.has(workflow.name)) {
        workflowsByName.set(workflow.name, []);
      }
      workflowsByName.get(workflow.name).push(workflow);
    }

    // Find duplicates (workflows with same name)
    const duplicates = [];
    for (const [name, workflows] of workflowsByName.entries()) {
      if (workflows.length > 1) {
        duplicates.push({
          name,
          count: workflows.length,
          workflows: workflows.sort((a, b) => {
            // Sort by updatedAt (most recent first)
            const dateA = new Date(a.updatedAt || a.createdAt);
            const dateB = new Date(b.updatedAt || b.createdAt);
            return dateB - dateA;
          })
        });
      }
    }

    if (duplicates.length === 0) {
      logger.success('\n✅ No duplicates found! All workflows have unique names.');
      return;
    }

    // Display duplicates
    logger.warn(`\n⚠️  Found ${duplicates.length} workflow(s) with duplicates:\n`);

    let totalDuplicates = 0;
    for (const dup of duplicates) {
      const duplicateCount = dup.count - 1;
      totalDuplicates += duplicateCount;

      logger.warn(`📋 "${dup.name}" (${dup.count} copies, ${duplicateCount} to remove)`);

      for (let i = 0; i < dup.workflows.length; i++) {
        const wf = dup.workflows[i];
        const isKeep = i === 0;
        const action = isKeep ? '✅ KEEP' : '❌ DELETE';
        const date = new Date(wf.updatedAt || wf.createdAt).toISOString();

        logger.info(`   ${action} [${i + 1}] ID: ${wf.id} | Updated: ${date} | Active: ${wf.active ? 'Yes' : 'No'}`);
      }
      logger.info('');
    }

    logger.info('📊 Summary:');
    logger.info(`   Total workflows: ${workflows.length}`);
    logger.info(`   Unique workflows: ${workflowsByName.size}`);
    logger.warn(`   Duplicates to remove: ${totalDuplicates}\n`);

    // Delete duplicates (keep the most recent version)
    if (!isDryRun) {
      logger.info('🗑️  Starting cleanup...\n');

      let deleted = 0;
      let failed = 0;

      for (const dup of duplicates) {
        // Keep the first one (most recent), delete the rest
        for (let i = 1; i < dup.workflows.length; i++) {
          const wf = dup.workflows[i];
          try {
            logger.info(`Deleting duplicate: "${dup.name}" (ID: ${wf.id})`);
            await workflowService.deleteWorkflow(wf.id);
            deleted++;
            logger.success('   ✅ Deleted successfully');
          } catch (error) {
            failed++;
            logger.error(`   ❌ Failed: ${error.message}`);
          }
        }
        logger.info('');
      }

      logger.info('━'.repeat(50));
      logger.success('\n✅ Cleanup complete!');
      logger.info(`   Deleted: ${deleted}`);
      if (failed > 0) {
        logger.error(`   Failed: ${failed}`);
      }

    } else {
      logger.info('━'.repeat(50));
      logger.warn('\n⚠️  DRY-RUN MODE: No changes were made');
      logger.info(`   Run without --dry-run flag to delete ${totalDuplicates} duplicate(s)`);
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
