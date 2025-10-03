#!/usr/bin/env node

/**
 * Apply Layer Tags - Entry Point
 *
 * Script principal para aplicacao de tags de layer em workflows n8n.
 *
 * Integra CLI Interface e TagLayerOrchestrator para executar fluxo completo:
 * 1. Parse de argumentos da linha de comando
 * 2. Validacao de opcoes
 * 3. Exibicao de help se solicitado
 * 4. Execucao do orquestrador
 * 5. Exibicao de sumario final
 *
 * Usage:
 *   node scripts/admin/apply-layer-tags/index.js [options]
 *
 * Examples:
 *   node scripts/admin/apply-layer-tags/index.js --dry-run
 *   node scripts/admin/apply-layer-tags/index.js --verbose
 *   node scripts/admin/apply-layer-tags/index.js --help
 *
 * @module apply-layer-tags
 */

const CLIInterface = require('./cli/cli-interface');
const TagLayerOrchestrator = require('./core/orchestrator');
const Logger = require('../../../src/utils/logger');
const config = require('./config/config');

/**
 * Funcao principal
 *
 * Coordena execucao completa:
 * - Parse de argumentos
 * - Validacao de opcoes
 * - Execucao do orchestrator
 * - Exibicao de resultados
 * - Exit code apropriado
 */
async function main() {
  const cli = new CLIInterface();

  try {
    // Parse argumentos
    const options = cli.parseArguments();

    // Help: exibir ajuda e sair
    if (options.help) {
      cli.printHelp();
      process.exit(0);
    }

    // Validar argumentos
    const validation = cli.validateArguments(options);
    if (!validation.valid) {
      cli.printError('Argumentos invalidos:');
      validation.errors.forEach(error => {
        console.error(`  - ${error}`);
      });
      console.error('');
      console.error('Use --help para ver opcoes disponiveis.');
      process.exit(1);
    }

    // Banner inicial
    cli.printBanner(options);

    // Logger
    const logLevel = options.verbose ? 'debug' : (options.quiet ? 'error' : 'info');
    const logger = new Logger({ logLevel });

    // Criar orchestrator
    const orchestrator = new TagLayerOrchestrator({
      logger
      // Outros componentes podem ser injetados aqui para testes
    });

    // Executar fluxo completo
    const result = await orchestrator.execute({
      dryRun: options.dryRun,
      verbose: options.verbose,
      quiet: options.quiet,
      tagName: 'jana' // Tag padrao conforme requisitos
    });

    // Sumario final
    cli.printSummary(result);

    // Exit code baseado em sucesso
    process.exit(result.success ? 0 : 1);

  } catch (error) {
    // Erro fatal nao capturado
    cli.printError('Erro fatal durante execucao', error);

    // Exibir stack trace se verbose
    if (cli.args.includes('--verbose') || cli.args.includes('-v')) {
      console.error('');
      console.error('Stack trace completo:');
      console.error(error.stack);
    }

    process.exit(1);
  }
}

/**
 * Graceful shutdown handler (Ctrl+C)
 *
 * Captura SIGINT e encerra gracefully, salvando estado se possivel.
 */
process.on('SIGINT', () => {
  console.log('');
  console.log('');
  console.log('\x1b[33m⚠️  Execucao interrompida pelo usuario (Ctrl+C)\x1b[0m');
  console.log('');
  console.log('Estado parcial pode ter sido salvo.');
  console.log('');
  process.exit(130); // 128 + SIGINT (2)
});

/**
 * Unhandled rejection handler
 *
 * Captura promises rejeitadas nao tratadas.
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
