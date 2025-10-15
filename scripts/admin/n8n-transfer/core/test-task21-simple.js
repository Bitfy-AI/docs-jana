/**
 * @fileoverview Teste simplificado para Task 21 - Plugin Loading
 *
 * Testa a implementação de _loadPlugins() registrando plugins manualmente
 */

const path = require('path');

// Mock do HttpClient
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  if (id === './http-client' || id.endsWith('http-client.js')) {
    return class MockHttpClient {
      constructor(config) {
        this.baseUrl = config.baseUrl;
        this.apiKey = config.apiKey;
        this.logger = config.logger;
      }

      async testConnection() {
        return { success: true, message: 'Mock OK' };
      }
    };
  }
  return originalRequire.apply(this, arguments);
};

const TransferManager = require('./transfer-manager');
const PluginRegistry = require('./plugin-registry');
const { BasePlugin } = require('../plugins/index.js');

// Restaurar require
Module.prototype.require = originalRequire;

// Plugins Mock
class MockDeduplicator extends BasePlugin {
  constructor() {
    super('mock-dedup', '1.0.0', 'deduplicator');
  }
  async isDuplicate() { return false; }
}

class MockValidator extends BasePlugin {
  constructor(name) {
    super(name || 'mock-validator', '1.0.0', 'validator');
  }
  async validate() { return { valid: true, issues: [] }; }
}

class MockReporter extends BasePlugin {
  constructor(name) {
    super(name || 'mock-reporter', '1.0.0', 'reporter');
  }
  async generate() { return 'Mock Report'; }
}

async function runTests() {
  console.log('\n=== TESTE TASK 21: PLUGIN LOADING (SIMPLIFIED) ===\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Carregar plugins válidos
  try {
    console.log('TEST 1: Carregar plugins válidos');
    console.log('-'.repeat(50));

    // Criar registry e registrar plugins
    const registry = new PluginRegistry();
    registry.register(new MockDeduplicator());
    registry.register(new MockValidator('validator-1'));
    registry.register(new MockValidator('validator-2'));
    registry.register(new MockReporter('reporter-1'));
    registry.register(new MockReporter('reporter-2'));

    console.log(`✓ Registry criado com ${registry.getAll().length} plugins`);

    // Criar manager com registry injetado
    const manager = new TransferManager({
      SOURCE: { url: 'http://source.test', apiKey: 'key1' },
      TARGET: { url: 'http://target.test', apiKey: 'key2' }
    }, { pluginRegistry: registry });

    try {
      await manager.transfer({
        deduplicator: 'mock-dedup',
        validators: ['validator-1', 'validator-2'],
        reporters: ['reporter-1', 'reporter-2']
      });
    } catch (error) {
      if (error.message.includes('incomplete')) {
        console.log('✅ PASSOU: Plugins carregados com sucesso');

        // Verificar state
        const plugins = manager._plugins;
        if (plugins.deduplicator &&
            plugins.deduplicator.getName() === 'mock-dedup' &&
            plugins.validators.length === 2 &&
            plugins.reporters.length === 2) {
          console.log('✅ PASSOU: Plugins armazenados corretamente');
          console.log(`   - Deduplicator: ${plugins.deduplicator.getName()}`);
          console.log(`   - Validators: ${plugins.validators.map(v => v.getName()).join(', ')}`);
          console.log(`   - Reporters: ${plugins.reporters.map(r => r.getName()).join(', ')}`);
          passed += 2;
        } else {
          console.log('❌ FALHOU: State incorreto');
          console.log(`   - Dedup: ${!!plugins.deduplicator} (${plugins.deduplicator?.getName()})`);
          console.log(`   - Validators: ${plugins.validators.length}`);
          console.log(`   - Reporters: ${plugins.reporters.length}`);
          failed++;
        }
      } else {
        console.log('❌ FALHOU: Erro inesperado:', error.message);
        failed++;
      }
    }
  } catch (error) {
    console.log('❌ FALHOU: Erro na inicialização:', error.message);
    console.log(error.stack);
    failed++;
  }

  console.log();

  // Test 2: Erro quando deduplicator não existe
  try {
    console.log('TEST 2: Erro quando deduplicator não existe');
    console.log('-'.repeat(50));

    const registry = new PluginRegistry();
    const manager = new TransferManager({
      SOURCE: { url: 'http://source.test', apiKey: 'key1' },
      TARGET: { url: 'http://target.test', apiKey: 'key2' }
    }, { pluginRegistry: registry });

    try {
      await manager.transfer({
        deduplicator: 'non-existent',
        validators: [],
        reporters: []
      });
      console.log('❌ FALHOU: Deveria lançar erro');
      failed++;
    } catch (error) {
      if (error.message.includes('not found') && error.message.includes('non-existent')) {
        console.log('✅ PASSOU: Erro correto lançado');
        console.log(`   - Mensagem: ${error.message}`);
        passed++;
      } else {
        console.log('❌ FALHOU: Mensagem incorreta:', error.message);
        failed++;
      }
    }
  } catch (error) {
    console.log('❌ FALHOU: Erro inesperado:', error.message);
    failed++;
  }

  console.log();

  // Test 3: Warning quando validator não existe
  try {
    console.log('TEST 3: Warning quando validator opcional não existe');
    console.log('-'.repeat(50));

    const registry = new PluginRegistry();
    registry.register(new MockDeduplicator());
    registry.register(new MockValidator('validator-1'));
    // Não registrar validator-2 e validator-3

    const manager = new TransferManager({
      SOURCE: { url: 'http://source.test', apiKey: 'key1' },
      TARGET: { url: 'http://target.test', apiKey: 'key2' }
    }, { pluginRegistry: registry });

    // Capturar warnings
    const warnings = [];
    const originalWarn = manager.logger.warn;
    manager.logger.warn = function(...args) {
      warnings.push(args[0]);
      originalWarn.apply(this, args);
    };

    try {
      await manager.transfer({
        deduplicator: 'mock-dedup',
        validators: ['validator-1', 'non-existent-1', 'non-existent-2'],
        reporters: []
      });
    } catch (error) {
      // Esperado
    }

    manager.logger.warn = originalWarn;

    const hasValidatorWarning = warnings.some(w =>
      typeof w === 'string' && w.includes('Validator plugin not found')
    );

    if (hasValidatorWarning) {
      console.log('✅ PASSOU: Warning emitido para validator não encontrado');
      console.log(`   - Total warnings: ${warnings.length}`);
      passed++;
    } else {
      console.log('❌ FALHOU: Warning não emitido');
      console.log(`   - Warnings: ${warnings.slice(0, 3).join(', ')}`);
      failed++;
    }

    // Verificar que apenas validator-1 foi carregado
    const plugins = manager._plugins;
    if (plugins.validators.length === 1 && plugins.validators[0].getName() === 'validator-1') {
      console.log('✅ PASSOU: Apenas validator válido foi carregado');
      passed++;
    } else {
      console.log('❌ FALHOU: Validators incorretos');
      console.log(`   - Expected 1, got ${plugins.validators.length}`);
      failed++;
    }
  } catch (error) {
    console.log('❌ FALHOU: Erro inesperado:', error.message);
    failed++;
  }

  console.log();

  // Test 4: Warning quando reporter não existe
  try {
    console.log('TEST 4: Warning quando reporter opcional não existe');
    console.log('-'.repeat(50));

    const registry = new PluginRegistry();
    registry.register(new MockDeduplicator());
    registry.register(new MockReporter('reporter-1'));

    const manager = new TransferManager({
      SOURCE: { url: 'http://source.test', apiKey: 'key1' },
      TARGET: { url: 'http://target.test', apiKey: 'key2' }
    }, { pluginRegistry: registry });

    const warnings = [];
    const originalWarn = manager.logger.warn;
    manager.logger.warn = function(...args) {
      warnings.push(args[0]);
      originalWarn.apply(this, args);
    };

    try {
      await manager.transfer({
        deduplicator: 'mock-dedup',
        validators: [],
        reporters: ['reporter-1', 'non-existent']
      });
    } catch (error) {
      // Esperado
    }

    manager.logger.warn = originalWarn;

    const hasReporterWarning = warnings.some(w =>
      typeof w === 'string' && w.includes('Reporter plugin not found')
    );

    if (hasReporterWarning) {
      console.log('✅ PASSOU: Warning emitido para reporter não encontrado');
      passed++;
    } else {
      console.log('❌ FALHOU: Warning não emitido');
      failed++;
    }

    const plugins = manager._plugins;
    if (plugins.reporters.length === 1) {
      console.log('✅ PASSOU: Apenas reporter válido foi carregado');
      passed++;
    } else {
      console.log('❌ FALHOU: Reporters incorretos');
      failed++;
    }
  } catch (error) {
    console.log('❌ FALHOU: Erro inesperado:', error.message);
    failed++;
  }

  console.log();

  // Test 5: Warnings para ausência de validators/reporters
  try {
    console.log('TEST 5: Warnings quando sem validators/reporters');
    console.log('-'.repeat(50));

    const registry = new PluginRegistry();
    registry.register(new MockDeduplicator());

    const manager = new TransferManager({
      SOURCE: { url: 'http://source.test', apiKey: 'key1' },
      TARGET: { url: 'http://target.test', apiKey: 'key2' }
    }, { pluginRegistry: registry });

    const warnings = [];
    const originalWarn = manager.logger.warn;
    manager.logger.warn = function(...args) {
      warnings.push(args[0]);
      originalWarn.apply(this, args);
    };

    try {
      await manager.transfer({
        deduplicator: 'mock-dedup',
        validators: [],
        reporters: []
      });
    } catch (error) {
      // Esperado
    }

    manager.logger.warn = originalWarn;

    const hasNoValidatorsWarning = warnings.some(w =>
      typeof w === 'string' && w.includes('No validators loaded')
    );

    const hasNoReportersWarning = warnings.some(w =>
      typeof w === 'string' && w.includes('No reporters loaded')
    );

    if (hasNoValidatorsWarning && hasNoReportersWarning) {
      console.log('✅ PASSOU: Warnings emitidos para ausência de plugins');
      passed++;
    } else {
      console.log('❌ FALHOU: Warnings não emitidos');
      console.log(`   - NoValidators: ${hasNoValidatorsWarning}, NoReporters: ${hasNoReportersWarning}`);
      failed++;
    }
  } catch (error) {
    console.log('❌ FALHOU: Erro inesperado:', error.message);
    failed++;
  }

  console.log();

  // Test 6: Logging detalhado
  try {
    console.log('TEST 6: Verificar logging detalhado');
    console.log('-'.repeat(50));

    const registry = new PluginRegistry();
    registry.register(new MockDeduplicator());
    registry.register(new MockValidator('val-1'));
    registry.register(new MockReporter('rep-1'));

    const manager = new TransferManager({
      SOURCE: { url: 'http://source.test', apiKey: 'key1' },
      TARGET: { url: 'http://target.test', apiKey: 'key2' }
    }, { pluginRegistry: registry });

    const debugLogs = [];
    const originalDebug = manager.logger.debug;
    manager.logger.debug = function(...args) {
      debugLogs.push(args[0]);
      originalDebug.apply(this, args);
    };

    try {
      await manager.transfer({
        deduplicator: 'mock-dedup',
        validators: ['val-1'],
        reporters: ['rep-1']
      });
    } catch (error) {
      // Esperado
    }

    manager.logger.debug = originalDebug;

    const hasDeduplicatorLog = debugLogs.some(log =>
      typeof log === 'string' && log.includes('Loading deduplicator') && log.includes('mock-dedup')
    );

    const hasValidatorLog = debugLogs.some(log =>
      typeof log === 'string' && log.includes('Loading validator') && log.includes('val-1')
    );

    const hasReporterLog = debugLogs.some(log =>
      typeof log === 'string' && log.includes('Loading reporter') && log.includes('rep-1')
    );

    if (hasDeduplicatorLog && hasValidatorLog && hasReporterLog) {
      console.log('✅ PASSOU: Logging detalhado presente');
      console.log(`   - Total debug logs: ${debugLogs.length}`);
      passed++;
    } else {
      console.log('❌ FALHOU: Logging detalhado incompleto');
      console.log(`   - Dedup: ${hasDeduplicatorLog}, Val: ${hasValidatorLog}, Rep: ${hasReporterLog}`);
      failed++;
    }
  } catch (error) {
    console.log('❌ FALHOU: Erro inesperado:', error.message);
    failed++;
  }

  // Resumo
  console.log();
  console.log('='.repeat(50));
  console.log('RESUMO');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${passed + failed}`);
  console.log(`🎯 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log();

  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED! Task 21 implemented successfully.');
    process.exit(0);
  } else {
    console.log('⚠️  SOME TESTS FAILED. Review implementation.');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('❌ FATAL ERROR:', error);
  console.error(error.stack);
  process.exit(1);
});
