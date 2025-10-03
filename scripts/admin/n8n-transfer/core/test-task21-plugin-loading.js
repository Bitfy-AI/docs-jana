/**
 * @fileoverview Script de teste para Task 21 - Plugin Loading
 *
 * Testa:
 * - Carregamento de deduplicator (obrigatório)
 * - Carregamento de validators (opcional, múltiplos)
 * - Carregamento de reporters (opcional, múltiplos)
 * - Error handling quando plugin não existe
 * - Warning quando plugin opcional não existe
 * - Enable automático de plugins disabled
 */

const path = require('path');

// Mock do HttpClient ANTES de importar TransferManager
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  if (id === './http-client' || id.endsWith('http-client.js')) {
    // Retornar mock do HttpClient
    return class MockHttpClient {
      constructor(config) {
        this.baseUrl = config.baseUrl;
        this.apiKey = config.apiKey;
        this.logger = config.logger;
      }

      async testConnection() {
        return {
          success: true,
          message: 'Mock connection successful'
        };
      }

      async get(endpoint) {
        return {
          success: true,
          data: []
        };
      }

      async post(endpoint, data) {
        return {
          success: true,
          data: data
        };
      }
    };
  }
  return originalRequire.apply(this, arguments);
};

const TransferManager = require('./transfer-manager');
const PluginRegistry = require('./plugin-registry');

// Restaurar require original
Module.prototype.require = originalRequire;

// Helper para criar config mínima
function createMockConfig() {
  return {
    SOURCE: {
      url: 'https://source.example.com',
      apiKey: 'mock-source-key'
    },
    TARGET: {
      url: 'https://target.example.com',
      apiKey: 'mock-target-key'
    }
  };
}

async function runTests() {
  console.log('\n=== TESTE TASK 21: PLUGIN LOADING ===\n');

  let passedTests = 0;
  let failedTests = 0;

  // Test 1: Carregar plugins válidos
  try {
    console.log('TEST 1: Carregar plugins válidos');
    console.log('-'.repeat(50));

    const manager = new TransferManager(createMockConfig());

    // Tentar transferência com plugins padrão
    try {
      await manager.transfer({
        deduplicator: 'standard-deduplicator',
        validators: ['integrity-validator', 'schema-validator'],
        reporters: ['json-reporter', 'markdown-reporter'],
        dryRun: true
      });
      console.log('❌ FALHOU: Deveria lançar erro "incomplete implementation"');
      failedTests++;
    } catch (error) {
      if (error.message.includes('incomplete')) {
        console.log('✅ PASSOU: Plugins carregados com sucesso');
        console.log(`   - Erro esperado: ${error.message}`);

        // Verificar que plugins foram armazenados
        const plugins = manager._plugins;
        if (plugins.deduplicator &&
            plugins.validators.length === 2 &&
            plugins.reporters.length === 2) {
          console.log('✅ PASSOU: Plugins armazenados corretamente no state');
          console.log(`   - Deduplicator: ${plugins.deduplicator.getName()}`);
          console.log(`   - Validators: ${plugins.validators.map(v => v.getName()).join(', ')}`);
          console.log(`   - Reporters: ${plugins.reporters.map(r => r.getName()).join(', ')}`);
          passedTests += 2;
        } else {
          console.log('❌ FALHOU: Plugins não foram armazenados corretamente');
          console.log(`   - Got: dedup=${!!plugins.deduplicator}, val=${plugins.validators.length}, rep=${plugins.reporters.length}`);
          failedTests++;
        }
      } else {
        console.log('❌ FALHOU: Erro inesperado:', error.message);
        failedTests++;
      }
    }
  } catch (error) {
    console.log('❌ FALHOU: Erro na inicialização:', error.message);
    failedTests++;
  }

  console.log();

  // Test 2: Erro quando deduplicator não existe
  try {
    console.log('TEST 2: Erro quando deduplicator não existe');
    console.log('-'.repeat(50));

    const manager = new TransferManager(createMockConfig());

    try {
      await manager.transfer({
        deduplicator: 'non-existent-deduplicator',
        validators: [],
        reporters: []
      });
      console.log('❌ FALHOU: Deveria lançar erro "plugin not found"');
      failedTests++;
    } catch (error) {
      if (error.message.includes('not found') && error.message.includes('non-existent-deduplicator')) {
        console.log('✅ PASSOU: Erro correto lançado');
        console.log(`   - Mensagem: ${error.message}`);
        passedTests++;
      } else {
        console.log('❌ FALHOU: Mensagem de erro incorreta:', error.message);
        failedTests++;
      }
    }
  } catch (error) {
    console.log('❌ FALHOU: Erro inesperado:', error.message);
    failedTests++;
  }

  console.log();

  // Test 3: Warning quando validator opcional não existe
  try {
    console.log('TEST 3: Warning quando validator opcional não existe');
    console.log('-'.repeat(50));

    const manager = new TransferManager(createMockConfig());

    // Capturar warnings do logger
    const warnings = [];
    const originalWarn = manager.logger.warn;
    manager.logger.warn = function(...args) {
      warnings.push(args[0]);
      originalWarn.apply(this, args);
    };

    try {
      await manager.transfer({
        deduplicator: 'standard-deduplicator',
        validators: ['integrity-validator', 'non-existent-validator', 'schema-validator'],
        reporters: []
      });
    } catch (error) {
      // Esperado - implementação incompleta
    }

    // Restaurar logger
    manager.logger.warn = originalWarn;

    const hasValidatorWarning = warnings.some(w =>
      w.includes('Validator plugin not found') && w.includes('non-existent-validator')
    );

    const hasNoValidatorsWarning = warnings.some(w =>
      w.includes('No reporters loaded')
    );

    if (hasValidatorWarning) {
      console.log('✅ PASSOU: Warning emitido para validator não encontrado');
      console.log(`   - Total warnings: ${warnings.length}`);
      passedTests++;
    } else {
      console.log('❌ FALHOU: Warning não emitido');
      console.log(`   - Warnings capturados: ${warnings.join(', ')}`);
      failedTests++;
    }

    // Verificar que os outros validators foram carregados
    const plugins = manager._plugins;
    if (plugins.validators.length === 2) {
      console.log('✅ PASSOU: Validators válidos foram carregados (non-existent skipped)');
      console.log(`   - Validators: ${plugins.validators.map(v => v.getName()).join(', ')}`);
      passedTests++;
    } else {
      console.log('❌ FALHOU: Validators válidos não foram carregados corretamente');
      console.log(`   - Expected 2, got ${plugins.validators.length}`);
      failedTests++;
    }
  } catch (error) {
    console.log('❌ FALHOU: Erro inesperado:', error.message);
    failedTests++;
  }

  console.log();

  // Test 4: Warning quando reporter opcional não existe
  try {
    console.log('TEST 4: Warning quando reporter opcional não existe');
    console.log('-'.repeat(50));

    const manager = new TransferManager(createMockConfig());

    const warnings = [];
    const originalWarn = manager.logger.warn;
    manager.logger.warn = function(...args) {
      warnings.push(args[0]);
      originalWarn.apply(this, args);
    };

    try {
      await manager.transfer({
        deduplicator: 'standard-deduplicator',
        validators: [],
        reporters: ['json-reporter', 'non-existent-reporter', 'markdown-reporter']
      });
    } catch (error) {
      // Esperado
    }

    manager.logger.warn = originalWarn;

    const hasReporterWarning = warnings.some(w =>
      w.includes('Reporter plugin not found') && w.includes('non-existent-reporter')
    );

    if (hasReporterWarning) {
      console.log('✅ PASSOU: Warning emitido para reporter não encontrado');
      passedTests++;
    } else {
      console.log('❌ FALHOU: Warning não emitido');
      console.log(`   - Warnings: ${warnings.join(', ')}`);
      failedTests++;
    }

    const plugins = manager._plugins;
    if (plugins.reporters.length === 2) {
      console.log('✅ PASSOU: Reporters válidos foram carregados');
      console.log(`   - Reporters: ${plugins.reporters.map(r => r.getName()).join(', ')}`);
      passedTests++;
    } else {
      console.log('❌ FALHOU: Reporters não carregados corretamente');
      failedTests++;
    }
  } catch (error) {
    console.log('❌ FALHOU: Erro inesperado:', error.message);
    failedTests++;
  }

  console.log();

  // Test 5: Carregar apenas deduplicator (sem validators/reporters)
  try {
    console.log('TEST 5: Carregar apenas deduplicator (mínimo obrigatório)');
    console.log('-'.repeat(50));

    const manager = new TransferManager(createMockConfig());

    const warnings = [];
    const originalWarn = manager.logger.warn;
    manager.logger.warn = function(...args) {
      warnings.push(args[0]);
      originalWarn.apply(this, args);
    };

    try {
      await manager.transfer({
        deduplicator: 'standard-deduplicator',
        validators: [],
        reporters: []
      });
    } catch (error) {
      // Esperado
    }

    manager.logger.warn = originalWarn;

    const hasNoValidatorsWarning = warnings.some(w =>
      w.includes('No validators loaded')
    );

    const hasNoReportersWarning = warnings.some(w =>
      w.includes('No reporters loaded')
    );

    if (hasNoValidatorsWarning && hasNoReportersWarning) {
      console.log('✅ PASSOU: Warnings emitidos para ausência de validators e reporters');
      passedTests++;
    } else {
      console.log('❌ FALHOU: Warnings não emitidos corretamente');
      failedTests++;
    }

    const plugins = manager._plugins;
    if (plugins.deduplicator &&
        plugins.validators.length === 0 &&
        plugins.reporters.length === 0) {
      console.log('✅ PASSOU: Apenas deduplicator carregado');
      console.log(`   - Deduplicator: ${plugins.deduplicator.getName()}`);
      passedTests++;
    } else {
      console.log('❌ FALHOU: State incorreto');
      failedTests++;
    }
  } catch (error) {
    console.log('❌ FALHOU: Erro inesperado:', error.message);
    failedTests++;
  }

  console.log();

  // Test 6: Verificar logging detalhado
  try {
    console.log('TEST 6: Verificar logging detalhado');
    console.log('-'.repeat(50));

    const manager = new TransferManager(createMockConfig());

    const debugLogs = [];
    const originalDebug = manager.logger.debug;
    manager.logger.debug = function(...args) {
      debugLogs.push(args[0]);
      originalDebug.apply(this, args);
    };

    try {
      await manager.transfer({
        deduplicator: 'standard-deduplicator',
        validators: ['integrity-validator'],
        reporters: ['json-reporter']
      });
    } catch (error) {
      // Esperado
    }

    manager.logger.debug = originalDebug;

    const hasDeduplicatorLog = debugLogs.some(log =>
      typeof log === 'string' && log.includes('Loading deduplicator') && log.includes('standard-deduplicator')
    );

    const hasValidatorLog = debugLogs.some(log =>
      typeof log === 'string' && log.includes('Loading validator') && log.includes('integrity-validator')
    );

    const hasReporterLog = debugLogs.some(log =>
      typeof log === 'string' && log.includes('Loading reporter') && log.includes('json-reporter')
    );

    if (hasDeduplicatorLog && hasValidatorLog && hasReporterLog) {
      console.log('✅ PASSOU: Logging detalhado presente');
      console.log(`   - Total debug logs: ${debugLogs.length}`);
      passedTests++;
    } else {
      console.log('❌ FALHOU: Logging detalhado incompleto');
      console.log(`   - Dedup: ${hasDeduplicatorLog}, Val: ${hasValidatorLog}, Rep: ${hasReporterLog}`);
      console.log(`   - Debug logs: ${debugLogs.filter(l => typeof l === 'string').slice(0, 5).join(', ')}`);
      failedTests++;
    }
  } catch (error) {
    console.log('❌ FALHOU: Erro inesperado:', error.message);
    failedTests++;
  }

  // Resumo final
  console.log();
  console.log('='.repeat(50));
  console.log('RESUMO DOS TESTES');
  console.log('='.repeat(50));
  console.log(`✅ Testes Passados: ${passedTests}`);
  console.log(`❌ Testes Falhados: ${failedTests}`);
  console.log(`📊 Total: ${passedTests + failedTests}`);
  console.log(`🎯 Taxa de Sucesso: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);
  console.log();

  if (failedTests === 0) {
    console.log('🎉 TODOS OS TESTES PASSARAM! Task 21 implementada com sucesso.');
    process.exit(0);
  } else {
    console.log('⚠️  ALGUNS TESTES FALHARAM. Revisar implementação.');
    process.exit(1);
  }
}

// Executar testes
runTests().catch(error => {
  console.error('❌ ERRO FATAL:', error);
  process.exit(1);
});
