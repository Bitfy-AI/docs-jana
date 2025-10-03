/**
 * CLI Interface - Interface de Linha de Comando
 *
 * Responsavel por:
 * - Parse de argumentos da linha de comando
 * - Validacao de flags e opcoes
 * - Exibicao de help message
 * - Banner inicial
 * - Sumario final com cores
 *
 * Flags suportadas:
 * --dry-run, -d    : Modo simulacao (nao aplica tags)
 * --verbose, -v    : Logs detalhados
 * --quiet, -q      : Sem progress bar
 * --help, -h       : Exibe ajuda
 * --mapping <path> : Caminho alternativo do mapping
 * --output <dir>   : Diretorio de output customizado
 *
 * @module cli/cli-interface
 */

class CLIInterface {
  /**
   * Cria instancia da CLI Interface
   *
   * @example
   * const cli = new CLIInterface();
   * const options = cli.parseArguments();
   */
  constructor() {
    this.args = process.argv.slice(2);
  }

  /**
   * Parse de argumentos da linha de comando
   *
   * Parseia argumentos e retorna objeto com opcoes normalizadas.
   * Flags booleanas podem ser usadas em formato longo (--flag) ou curto (-f).
   *
   * @returns {Object} Opcoes parseadas
   * @returns {boolean} options.dryRun - Modo dry-run ativo
   * @returns {boolean} options.verbose - Modo verbose ativo
   * @returns {boolean} options.quiet - Modo quiet ativo
   * @returns {boolean} options.help - Flag de ajuda
   * @returns {string|null} options.mapping - Caminho customizado do mapping
   * @returns {string|null} options.output - Diretorio de output customizado
   *
   * @example
   * const cli = new CLIInterface();
   * const options = cli.parseArguments();
   * // { dryRun: true, verbose: false, quiet: false, help: false, mapping: null, output: null }
   */
  parseArguments() {
    const options = {
      dryRun: false,
      verbose: false,
      quiet: false,
      help: false,
      mapping: null,
      output: null
    };

    for (let i = 0; i < this.args.length; i++) {
      const arg = this.args[i];

      switch (arg) {
        // Dry-run mode
        case '--dry-run':
        case '-d':
          options.dryRun = true;
          break;

        // Verbose mode
        case '--verbose':
        case '-v':
          options.verbose = true;
          break;

        // Quiet mode
        case '--quiet':
        case '-q':
          options.quiet = true;
          break;

        // Help
        case '--help':
        case '-h':
          options.help = true;
          break;

        // Mapping file path
        case '--mapping':
          if (i + 1 < this.args.length) {
            options.mapping = this.args[i + 1];
            i++; // Skip next arg
          } else {
            throw new Error('--mapping requer um argumento <path>');
          }
          break;

        // Output directory
        case '--output':
          if (i + 1 < this.args.length) {
            options.output = this.args[i + 1];
            i++; // Skip next arg
          } else {
            throw new Error('--output requer um argumento <dir>');
          }
          break;

        // Flag desconhecida
        default:
          if (arg.startsWith('-')) {
            throw new Error(`Flag desconhecida: ${arg}. Use --help para ver opcoes disponiveis.`);
          }
          break;
      }
    }

    return options;
  }

  /**
   * Valida argumentos parseados
   *
   * Verifica conflitos e combinacoes invalidas de flags.
   *
   * @param {Object} options - Opcoes parseadas
   * @returns {Object} Resultado da validacao { valid: boolean, errors: string[] }
   *
   * @example
   * const validation = cli.validateArguments(options);
   * if (!validation.valid) {
   *   validation.errors.forEach(error => console.error(error));
   * }
   */
  validateArguments(options) {
    const errors = [];

    // Conflito: --verbose e --quiet
    if (options.verbose && options.quiet) {
      errors.push('Conflito: --verbose e --quiet nao podem ser usados juntos');
    }

    // Validar caminho do mapping se fornecido
    if (options.mapping) {
      const fs = require('fs');
      if (!fs.existsSync(options.mapping)) {
        errors.push(`Arquivo de mapping nao encontrado: ${options.mapping}`);
      }
    }

    // Validar diretorio de output se fornecido
    if (options.output) {
      const fs = require('fs');
      const path = require('path');
      const parentDir = path.dirname(options.output);
      if (!fs.existsSync(parentDir)) {
        errors.push(`Diretorio pai nao existe: ${parentDir}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Exibe mensagem de ajuda (help)
   *
   * Formata e exibe documentacao completa de uso no console.
   *
   * @example
   * cli.printHelp();
   */
  printHelp() {
    const helpText = `
\x1b[1m\x1b[36mApply Layer Tags - N8N Workflow Tagger\x1b[0m

\x1b[1mUSAGE:\x1b[0m
  node scripts/admin/apply-layer-tags/index.js [options]

\x1b[1mOPTIONS:\x1b[0m
  \x1b[33m--dry-run\x1b[0m, \x1b[33m-d\x1b[0m        Simulate tag application (no API calls)
  \x1b[33m--verbose\x1b[0m, \x1b[33m-v\x1b[0m        Enable verbose logging
  \x1b[33m--quiet\x1b[0m, \x1b[33m-q\x1b[0m          Disable progress bar
  \x1b[33m--mapping\x1b[0m <path>   Custom mapping file path
  \x1b[33m--output\x1b[0m <dir>     Custom output directory
  \x1b[33m--help\x1b[0m, \x1b[33m-h\x1b[0m           Show this help message

\x1b[1mEXAMPLES:\x1b[0m
  \x1b[32m# Dry run (recommended first)\x1b[0m
  node scripts/admin/apply-layer-tags/index.js --dry-run

  \x1b[32m# Apply tags (production mode)\x1b[0m
  node scripts/admin/apply-layer-tags/index.js

  \x1b[32m# Verbose mode with dry-run\x1b[0m
  node scripts/admin/apply-layer-tags/index.js --dry-run --verbose

  \x1b[32m# Quiet mode (no progress bar)\x1b[0m
  node scripts/admin/apply-layer-tags/index.js --quiet

  \x1b[32m# Custom mapping file\x1b[0m
  node scripts/admin/apply-layer-tags/index.js --mapping ./custom-mapping.json

\x1b[1mENVIRONMENT VARIABLES:\x1b[0m
  \x1b[33mSOURCE_N8N_URL\x1b[0m       Source N8N instance URL (required)
  \x1b[33mSOURCE_N8N_API_KEY\x1b[0m   Source N8N API key (required)

\x1b[1mNOTES:\x1b[0m
  - It's recommended to run with --dry-run first to validate operations
  - The script processes workflows in parallel (max 5 concurrent requests)
  - Retry is automatic on network errors and 5xx responses (max 3 attempts)
  - A report is generated after execution in Markdown format

\x1b[1mDOCUMENTATION:\x1b[0m
  For detailed information, see:
  .claude/specs/tag-layer-implementation/requirements.md
  .claude/specs/tag-layer-implementation/tasks.md

`;

    console.log(helpText);
  }

  /**
   * Exibe banner inicial
   *
   * Banner visual exibido ao iniciar o script.
   *
   * @param {Object} options - Opcoes de execucao
   *
   * @example
   * cli.printBanner({ dryRun: true, verbose: false });
   */
  printBanner(options = {}) {
    const mode = options.dryRun ? '\x1b[33mDRY-RUN MODE\x1b[0m' : '\x1b[32mPRODUCTION MODE\x1b[0m';
    const verbosity = options.verbose ? 'Verbose' : (options.quiet ? 'Quiet' : 'Normal');

    console.log('\x1b[1m\x1b[36m');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                                                            ║');
    console.log('║           Apply Layer Tags - N8N Workflow Tagger          ║');
    console.log('║                                                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\x1b[0m');
    console.log(`Mode: ${mode}`);
    console.log(`Verbosity: \x1b[36m${verbosity}\x1b[0m`);
    console.log('');
  }

  /**
   * Exibe sumario final
   *
   * Formata e exibe resultado da execucao com cores no console.
   * Usa ANSI color codes para melhor legibilidade.
   *
   * @param {Object} result - Resultado da execucao (de Orchestrator)
   * @param {boolean} result.success - Se execucao foi bem-sucedida
   * @param {Object} result.summary - Sumario de resultados
   * @param {Object} result.performance - Metricas de performance
   * @param {string} result.reportPath - Caminho do relatorio gerado
   *
   * @example
   * cli.printSummary({
   *   success: true,
   *   summary: { total: 31, success: 31, failed: 0, skipped: 0 },
   *   performance: { totalDuration: 5800, averageDuration: 187 },
   *   reportPath: './output/apply-tags-report-2025-10-02-193000.md'
   * });
   */
  printSummary(result) {
    const { success, summary, performance, reportPath } = result;

    console.log('');
    console.log('\x1b[1m\x1b[36m');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                     EXECUTION SUMMARY                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\x1b[0m');

    // Status geral
    if (success) {
      console.log(`\x1b[1m\x1b[32mStatus: SUCCESS ✓\x1b[0m`);
    } else {
      console.log(`\x1b[1m\x1b[31mStatus: FAILED ✗\x1b[0m`);
    }
    console.log('');

    // Estatisticas
    console.log('\x1b[1mResults:\x1b[0m');
    console.log(`  Total workflows:     \x1b[1m${summary.total}\x1b[0m`);
    console.log(`  \x1b[32mSuccess:\x1b[0m             ${summary.success}`);

    if (summary.failed > 0) {
      console.log(`  \x1b[31mFailed:\x1b[0m              ${summary.failed}`);
    } else {
      console.log(`  Failed:              ${summary.failed}`);
    }

    if (summary.skipped > 0) {
      console.log(`  \x1b[33mSkipped:\x1b[0m             ${summary.skipped}`);
    } else {
      console.log(`  Skipped:             ${summary.skipped}`);
    }

    if (summary.dryRun > 0) {
      console.log(`  \x1b[33mDry-run:\x1b[0m             ${summary.dryRun}`);
    }
    console.log('');

    // Performance
    console.log('\x1b[1mPerformance:\x1b[0m');
    const totalSeconds = (performance.totalDuration / 1000).toFixed(2);
    const avgMs = performance.averageDuration.toFixed(0);
    const throughput = summary.total > 0
      ? (summary.total / (performance.totalDuration / 1000)).toFixed(2)
      : '0.00';

    console.log(`  Total duration:      \x1b[1m${totalSeconds}s\x1b[0m`);
    console.log(`  Average per workflow: ${avgMs}ms`);
    console.log(`  Throughput:          ${throughput} workflows/s`);
    console.log('');

    // Relatorio
    if (reportPath) {
      console.log('\x1b[1mReport:\x1b[0m');
      console.log(`  \x1b[36m${reportPath}\x1b[0m`);
      console.log('');
    }

    // Mensagem final
    if (success) {
      console.log('\x1b[32m✓ Execution completed successfully!\x1b[0m');
    } else {
      console.log('\x1b[31m✗ Execution completed with errors. Check report for details.\x1b[0m');
    }
    console.log('');
  }

  /**
   * Exibe mensagem de erro formatada
   *
   * @param {string} message - Mensagem de erro
   * @param {Error} [error] - Objeto de erro opcional
   *
   * @example
   * cli.printError('Falha ao conectar com API', error);
   */
  printError(message, error = null) {
    console.error('');
    console.error('\x1b[1m\x1b[31m╔════════════════════════════════════════════════════════════╗\x1b[0m');
    console.error('\x1b[1m\x1b[31m║                          ERROR                             ║\x1b[0m');
    console.error('\x1b[1m\x1b[31m╚════════════════════════════════════════════════════════════╝\x1b[0m');
    console.error('');
    console.error(`\x1b[31m${message}\x1b[0m`);

    if (error) {
      console.error('');
      console.error('\x1b[2mDetails:\x1b[0m');
      console.error(`  ${error.message}`);

      if (error.stack) {
        console.error('');
        console.error('\x1b[2mStack trace:\x1b[0m');
        console.error(`  ${error.stack}`);
      }
    }
    console.error('');
  }

  /**
   * Exibe aviso formatado
   *
   * @param {string} message - Mensagem de aviso
   *
   * @example
   * cli.printWarning('Recomendamos executar com --dry-run primeiro');
   */
  printWarning(message) {
    console.log('');
    console.log('\x1b[33m⚠️  WARNING:\x1b[0m');
    console.log(`\x1b[33m${message}\x1b[0m`);
    console.log('');
  }
}

module.exports = CLIInterface;
