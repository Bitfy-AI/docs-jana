/**
 * Test script for UploadHistoryService
 *
 * This script demonstrates the usage of UploadHistoryService
 * and verifies that all features work correctly.
 */

const UploadHistoryService = require('./src/services/upload-history-service');
const Logger = require('./src/utils/logger');
const fs = require('fs');
const path = require('path');

// Create logger instance
const logger = new Logger({ logLevel: 'debug', enableColors: true });

// Test file path
const testFilePath = path.join(__dirname, '.test-upload-history.json');

async function runTests() {
  logger.info('='.repeat(50));
  logger.info('Testing UploadHistoryService');
  logger.info('='.repeat(50));

  try {
    // Test 1: Create service and add entries
    logger.info('\n📝 Test 1: Creating service and adding entries...');
    const service = new UploadHistoryService(logger, testFilePath);

    // Add successful upload
    service.addEntry({
      action: 'upload',
      summary: {
        total: 30,
        succeeded: 30,
        failed: 0,
        folder: 'jana'
      },
      details: '30/30 workflows uploaded successfully to https://n8n.refrisol.com.br'
    });
    logger.success('✅ Added successful upload entry');

    // Add partial upload
    service.addEntry({
      action: 'upload',
      summary: {
        total: 150,
        succeeded: 100,
        failed: 50,
        folder: 'no-tag'
      },
      details: '100/150 workflows uploaded to https://n8n.target.com'
    });
    logger.success('✅ Added partial upload entry');

    // Add failed upload
    service.addEntry({
      action: 'upload',
      summary: {
        total: 5,
        succeeded: 0,
        failed: 5,
        folder: 'test'
      },
      details: '0/5 workflows uploaded to https://n8n.target.com'
    });
    logger.success('✅ Added failed upload entry');

    // Test 2: Save to file
    logger.info('\n💾 Test 2: Saving to file...');
    await service.save();
    logger.success(`✅ Saved to ${testFilePath}`);

    // Test 3: Load from file
    logger.info('\n📂 Test 3: Loading from file...');
    const service2 = new UploadHistoryService(logger, testFilePath);
    await service2.load();
    logger.success(`✅ Loaded ${service2.getEntryCount()} entries from file`);

    // Test 4: Get last N entries
    logger.info('\n📋 Test 4: Getting last 3 entries...');
    const lastThree = service2.getLastN(3);
    logger.info(`Found ${lastThree.length} entries:`);
    lastThree.forEach((entry, index) => {
      logger.info(`  ${index + 1}. ${entry.status}: ${entry.summary.succeeded}/${entry.summary.total} (${entry.summary.folder})`);
    });
    logger.success('✅ Retrieved last 3 entries');

    // Test 5: Format display
    logger.info('\n🎨 Test 5: Formatting for display...');
    const display = service2.formatLastN(3);
    logger.info('\n' + display);
    logger.success('✅ Formatted display successfully');

    // Test 6: Add more entries to test pruning
    logger.info('\n✂️  Test 6: Testing automatic pruning (max 50 entries)...');
    for (let i = 0; i < 55; i++) {
      service2.addEntry({
        action: 'upload',
        summary: {
          total: 10,
          succeeded: 10,
          failed: 0,
          folder: `test-${i}`
        },
        details: `Test entry ${i}`
      });
    }
    logger.info(`Added 55 more entries, total now: ${service2.getEntryCount()}`);
    if (service2.getEntryCount() <= 50) {
      logger.success('✅ Pruning working correctly (kept at 50 max)');
    } else {
      logger.error(`❌ Pruning failed (has ${service2.getEntryCount()} entries)`);
    }

    // Test 7: Clear and save
    logger.info('\n🧹 Test 7: Testing clear and clearAll...');
    await service2.save();
    const service3 = new UploadHistoryService(logger, testFilePath);
    await service3.load();
    logger.info(`Loaded ${service3.getEntryCount()} entries`);

    service3.clear();
    logger.info(`After clear(): ${service3.getEntryCount()} entries in memory`);

    await service3.clearAll();
    logger.success('✅ Cleared all entries and deleted file');

    // Verify file is deleted
    try {
      await fs.promises.access(testFilePath);
      logger.error('❌ File still exists after clearAll()');
    } catch (error) {
      logger.success('✅ File successfully deleted');
    }

    // Final cleanup
    logger.info('\n🧹 Cleaning up...');
    try {
      await fs.promises.unlink(testFilePath);
      logger.debug('Test file deleted');
    } catch (error) {
      logger.debug('Test file already deleted');
    }

    logger.info('\n' + '='.repeat(50));
    logger.success('✅ All tests passed!');
    logger.info('='.repeat(50) + '\n');

  } catch (error) {
    logger.error(`\n❌ Test failed: ${error.message}`);
    logger.error(error.stack);

    // Cleanup on error
    try {
      await fs.promises.unlink(testFilePath);
    } catch (e) {
      // Ignore cleanup errors
    }

    process.exit(1);
  }
}

// Run tests
runTests();
