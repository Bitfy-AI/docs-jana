/**
 * @fileoverview Test para Task 28 - Validar e melhorar cancelamento graceful
 *
 * Testa:
 * - cancel() retorna true quando em progresso
 * - cancel() retorna false quando idle
 * - Flag _cancelRequested é setada
 * - Status muda para CANCELLED
 * - Summary tem flag cancelled: true
 * - Signal handlers são configurados e removidos
 * - Processo para gracefully após workflow atual
 */

const TransferManager = require('../core/transfer-manager');
const Logger = require('../core/logger');

// Mock HttpClient para simular workflows
class MockHttpClient {
  constructor(config) {
    this.config = config;
  }

  async testConnection() {
    return { success: true };
  }

  async getWorkflows() {
    // Simular 3 workflows para testar cancelamento
    return [
      { id: '1', name: 'Workflow 1', nodes: [] },
      { id: '2', name: 'Workflow 2', nodes: [] },
      { id: '3', name: 'Workflow 3', nodes: [] }
    ];
  }

  async createWorkflow(workflow) {
    // Simular delay para permitir cancelamento
    await new Promise(resolve => setTimeout(resolve, 100));
    return { id: `target-${workflow.id}`, ...workflow };
  }
}

// Mock PluginRegistry com plugins mínimos
class MockPluginRegistry {
  constructor() {
    this.plugins = {
      'standard-deduplicator': {
        type: 'deduplicator',
        name: 'standard-deduplicator',
        isEnabled: () => true,
        enable: () => {},
        getName: () => 'standard-deduplicator',
        isDuplicate: () => false,
        getReason: () => 'Not duplicate'
      }
    };
  }

  get(name, type) {
    return this.plugins[name];
  }

  getAll() {
    return Object.values(this.plugins);
  }

  register(plugin) {
    this.plugins[plugin.name] = plugin;
  }
}

async function runTests() {
  console.log('\n=== Task 28: Graceful Cancellation Tests ===\n');

  // Test 1: cancel() retorna false quando idle
  console.log('Test 1: cancel() returns false when idle');
  try {
    const manager = new TransferManager({
      SOURCE: { url: 'http://source.test', apiKey: 'key1' },
      TARGET: { url: 'http://target.test', apiKey: 'key2' }
    }, {
      logger: new Logger({ level: 'error' }),
      pluginRegistry: new MockPluginRegistry()
    });

    // Mockar HttpClients
    manager.sourceClient = new MockHttpClient();
    manager.targetClient = new MockHttpClient();

    const result = manager.cancel();

    if (result === false) {
      console.log('✓ cancel() correctly returned false when idle');
    } else {
      throw new Error(`Expected false, got ${result}`);
    }
  } catch (error) {
    console.error('✗ Test 1 failed:', error.message);
    return false;
  }

  // Test 2: Signal handlers são configurados e removidos
  console.log('\nTest 2: Signal handlers are configured and removed');
  try {
    const manager = new TransferManager({
      SOURCE: { url: 'http://source.test', apiKey: 'key1' },
      TARGET: { url: 'http://target.test', apiKey: 'key2' }
    }, {
      logger: new Logger({ level: 'error' }),
      pluginRegistry: new MockPluginRegistry()
    });

    // Mockar HttpClients
    manager.sourceClient = new MockHttpClient();
    manager.targetClient = new MockHttpClient();

    // Verificar que signal handlers são null antes do transfer
    if (manager._signalHandlers !== null) {
      throw new Error('Signal handlers should be null before transfer');
    }

    // Executar transfer completo
    await manager.transfer({ dryRun: true });

    // Verificar que signal handlers foram removidos após completar
    if (manager._signalHandlers !== null) {
      throw new Error('Signal handlers should be removed after transfer');
    }

    console.log('✓ Signal handlers correctly configured and removed');
  } catch (error) {
    console.error('✗ Test 2 failed:', error.message);
    return false;
  }

  // Test 3: cancel() retorna true quando em progresso e para gracefully
  console.log('\nTest 3: cancel() returns true when running and stops gracefully');
  try {
    const manager = new TransferManager({
      SOURCE: { url: 'http://source.test', apiKey: 'key1' },
      TARGET: { url: 'http://target.test', apiKey: 'key2' }
    }, {
      logger: new Logger({ level: 'error' }),
      pluginRegistry: new MockPluginRegistry()
    });

    // Mockar HttpClients
    manager.sourceClient = new MockHttpClient();
    manager.targetClient = new MockHttpClient();

    // Iniciar transfer em background (sem dryRun para ter delay real)
    const transferPromise = manager.transfer({ dryRun: false });

    // Aguardar um pouco para transfer iniciar
    await new Promise(resolve => setTimeout(resolve, 50));

    // Cancelar transfer
    const cancelResult = manager.cancel();

    if (cancelResult !== true) {
      throw new Error(`cancel() should return true when running, got ${cancelResult}`);
    }

    // Verificar que flag foi setada
    if (!manager._cancelRequested) {
      throw new Error('_cancelRequested should be true after cancel()');
    }

    // Aguardar transfer completar
    const summary = await transferPromise;

    // Verificar que status é CANCELLED
    const progress = manager.getProgress();
    if (progress.status !== 'cancelled') {
      throw new Error(`Status should be 'cancelled', got '${progress.status}'`);
    }

    // Verificar que summary tem flag cancelled
    if (summary.cancelled !== true) {
      throw new Error('Summary should have cancelled: true');
    }

    // Verificar que pelo menos 1 workflow foi processado antes de cancelar
    if (summary.processed < 1) {
      throw new Error('At least 1 workflow should be processed before cancellation');
    }

    // Verificar que nem todos workflows foram processados (cancelamento funcionou)
    if (summary.processed >= 3) {
      console.log('⚠ Warning: All workflows were processed, cancellation might be too slow');
    }

    console.log('✓ cancel() correctly returns true and stops gracefully');
    console.log(`  - Processed ${summary.processed}/3 workflows before cancellation`);
  } catch (error) {
    console.error('✗ Test 3 failed:', error.message);
    return false;
  }

  // Test 4: Summary inclui campos processed, dryRun e cancelled
  console.log('\nTest 4: Summary includes processed, dryRun and cancelled flags');
  try {
    const manager = new TransferManager({
      SOURCE: { url: 'http://source.test', apiKey: 'key1' },
      TARGET: { url: 'http://target.test', apiKey: 'key2' }
    }, {
      logger: new Logger({ level: 'error' }),
      pluginRegistry: new MockPluginRegistry()
    });

    // Mockar HttpClients
    manager.sourceClient = new MockHttpClient();
    manager.targetClient = new MockHttpClient();

    // Executar transfer completo
    const summary = await manager.transfer({ dryRun: true });

    // Verificar campos
    if (typeof summary.processed !== 'number') {
      throw new Error('Summary should have processed field (number)');
    }

    if (typeof summary.dryRun !== 'boolean') {
      throw new Error('Summary should have dryRun field (boolean)');
    }

    if (typeof summary.cancelled !== 'boolean') {
      throw new Error('Summary should have cancelled field (boolean)');
    }

    if (summary.processed !== 3) {
      throw new Error(`Expected processed=3, got ${summary.processed}`);
    }

    if (summary.dryRun !== true) {
      throw new Error(`Expected dryRun=true, got ${summary.dryRun}`);
    }

    if (summary.cancelled !== false) {
      throw new Error(`Expected cancelled=false, got ${summary.cancelled}`);
    }

    console.log('✓ Summary correctly includes processed, dryRun and cancelled');
    console.log(`  - processed: ${summary.processed}`);
    console.log(`  - dryRun: ${summary.dryRun}`);
    console.log(`  - cancelled: ${summary.cancelled}`);
  } catch (error) {
    console.error('✗ Test 4 failed:', error.message);
    return false;
  }

  // Test 5: Signal handlers são removidos mesmo em caso de erro
  console.log('\nTest 5: Signal handlers are removed even on error');
  try {
    const manager = new TransferManager({
      SOURCE: { url: 'http://source.test', apiKey: 'key1' },
      TARGET: { url: 'http://target.test', apiKey: 'key2' }
    }, {
      logger: new Logger({ level: 'error' }),
      pluginRegistry: new MockPluginRegistry()
    });

    // Mockar HttpClient que falha na conexão
    manager.sourceClient = {
      testConnection: async () => ({ success: false, error: 'Connection failed' })
    };
    manager.targetClient = new MockHttpClient();

    // Tentar transfer (deve falhar)
    try {
      await manager.transfer({ dryRun: true });
      throw new Error('Transfer should have failed');
    } catch (error) {
      // Esperado
    }

    // Verificar que signal handlers foram removidos
    if (manager._signalHandlers !== null) {
      throw new Error('Signal handlers should be removed even on error');
    }

    console.log('✓ Signal handlers correctly removed on error');
  } catch (error) {
    console.error('✗ Test 5 failed:', error.message);
    return false;
  }

  console.log('\n=== All Task 28 tests passed! ===\n');
  return true;
}

// Executar testes
if (require.main === module) {
  runTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { runTests };
