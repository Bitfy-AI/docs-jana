#!/usr/bin/env node

/**
 * Apply Layer Tags - Entry Point (Enhanced UX)
 *
 * Versão melhorada com UX significativamente aprimorada:
 * - ✨ Modo interativo com confirmações
 * - 🌐 Suporte PT-BR e EN
 * - ✅ Pre-flight checks visuais
 * - 🎨 Status indicators coloridos
 * - 🔒 Confirmação obrigatória para modo produção
 * - 💡 Sugestões contextuais
 * - 📊 Progress feedback em tempo real
 *
 * Usage:
 *   node scripts/admin/apply-layer-tags/index-enhanced.js [options]
 *
 * Examples:
 *   # Modo interativo em português (padrão)
 *   node scripts/admin/apply-layer-tags/index-enhanced.js --dry-run
 *
 *   # Modo interativo em inglês
 *   node scripts/admin/apply-layer-tags/index-enhanced.js --lang en
 *
 *   # Modo não-interativo (CI/CD)
 *   node scripts/admin/apply-layer-tags/index-enhanced.js --dry-run --no-interactive
 *
 * @module apply-layer-tags-enhanced
 */

const CLIInterfaceEnhanced = require('./cli/cli-interface-enhanced');
const TagLayerOrchestrator = require('./core/orchestrator');
const Logger = require('../../../src/utils/logger');

/**
 * Função principal com UX melhorada
 */
async function main() {
  const cli = new CLIInterfaceEnhanced();

  try {
    // 1. Parse argumentos
    const options = cli.parseArguments();

    // 2. Help: exibir ajuda e sair
    if (options.help) {
      cli.printHelp();
      process.exit(0);
    }

    // 3. Validar argumentos
    const validation = cli.validateArguments(options);
    if (!validation.valid) {
      cli.printError(cli.t('invalidArgs'));
      validation.errors.forEach(error => {
        console.error(`  - ${error}`);
      });
      console.error('');
      console.error(cli.t('useHelp'));
      process.exit(1);
    }

    // 4. Banner inicial
    cli.printBanner(options);

    // 5. Sugestões contextuais (apenas em modo interativo)
    if (options.interactive && !options.dryRun) {
      cli.printSuggestions(options);
    }

    // 6. Logger
    const logLevel = options.verbose ? 'debug' : (options.quiet ? 'error' : 'info');
    const logger = new Logger({ logLevel });

    // 7. Criar orchestrator
    const orchestrator = new TagLayerOrchestrator({
      logger
    });

    // 8. ✨ NOVO: Pre-flight checks visuais
    if (options.interactive) {
      logger.info('Executando verificações pré-execução...');
      const checksPassed = await cli.runPreflightChecks(orchestrator);

      if (!checksPassed) {
        cli.printError('Falha nas verificações pré-execução. Corrija os erros e tente novamente.');
        process.exit(1);
      }

      logger.success('Todas as verificações passaram ✓');
    }

    // 9. ✨ NOVO: Confirmação interativa (apenas em modo produção)
    if (options.interactive && !options.dryRun) {
      // Obter número de workflows do mapping carregado
      const mappingResult = await orchestrator.loadMapping();
      const workflowCount = mappingResult.success ? mappingResult.data.length : 0;

      const confirmed = await cli.confirmExecution(workflowCount, options);

      if (!confirmed) {
        console.log('');
        console.log(`\x1b[33m${cli.t('executionCancelled')}\x1b[0m`);
        console.log('');
        console.log(`\x1b[2m${cli.t('suggestDryRun')}\x1b[0m`);
        console.log('');
        process.exit(0);
      }

      console.log('');
      logger.info('Confirmação recebida. Iniciando execução...');
      console.log('');
    }

    // 10. Executar fluxo completo
    const result = await orchestrator.execute({
      dryRun: options.dryRun,
      verbose: options.verbose,
      quiet: options.quiet,
      tagName: 'jana'
    });

    // 11. Sumário final melhorado
    cli.printSummary(result);

    // 12. Exit code baseado em sucesso
    process.exit(result.success ? 0 : 1);

  } catch (error) {
    // Erro fatal não capturado
    cli.printError(cli.t('fatalError'), error);

    // Exibir stack trace se verbose
    if (cli.args.includes('--verbose') || cli.args.includes('-v')) {
      console.error('');
      console.error('Stack trace completo:');
      console.error(error.stack);
    }

    // Cleanup
    cli.cleanup();

    process.exit(1);
  } finally {
    // Garantir cleanup de readline
    cli.cleanup();
  }
}

/**
 * ✨ MELHORADO: Graceful shutdown com mensagens localizadas
 */
process.on('SIGINT', () => {
  console.log('');
  console.log('');
  console.log('\x1b[33m⚠️  Execução interrompida pelo usuário (Ctrl+C)\x1b[0m');
  console.log('');
  console.log('Estado parcial pode ter sido salvo.');
  console.log('Verifique o diretório de output para relatórios parciais.');
  console.log('');
  process.exit(130); // 128 + SIGINT (2)
});

/**
 * Unhandled rejection handler
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('');
  console.error('\x1b[31m✗ Unhandled Promise Rejection:\x1b[0m');
  console.error(reason);
  console.error('');
  process.exit(1);
});

// Executar se invocado diretamente
if (require.main === module) {
  main();
}

module.exports = { main };
