/**
 * CLI Interface Enhanced - Interface de Linha de Comando com UX Melhorada
 *
 * Melhorias de UX implementadas:
 * 1. ✨ Modo interativo com confirmações
 * 2. 🌐 Suporte a PT-BR e EN
 * 3. ✅ Pre-flight checks visuais
 * 4. 🎨 Status indicators coloridos
 * 5. 📊 Progress feedback em tempo real
 * 6. 🔒 Confirmação obrigatória para modo produção
 * 7. 💡 Sugestões contextuais
 * 8. 📋 Resumo pré-execução
 *
 * @module cli/cli-interface-enhanced
 */

const readline = require('readline');

class CLIInterfaceEnhanced {
  constructor() {
    this.args = process.argv.slice(2);
    this.lang = 'pt-br'; // Default: português
    this.translations = this._loadTranslations();
    this.rl = null;
  }

  /**
   * Traduções PT-BR e EN
   */
  _loadTranslations() {
    return {
      'pt-br': {
        // Banner
        title: 'Aplicar Tags de Camadas - Gerenciador de Workflows N8N',
        mode: 'Modo',
        verbosity: 'Verbosidade',
        dryRunMode: 'SIMULAÇÃO (DRY-RUN)',
        productionMode: 'PRODUÇÃO',

        // Pre-flight checks
        preflightTitle: 'Verificações Pré-execução',
        checkingEnv: 'Verificando variáveis de ambiente',
        checkingConnection: 'Testando conectividade com API N8N',
        checkingMapping: 'Validando arquivo de mapeamento',
        checkingPermissions: 'Verificando permissões de escrita',
        checkPassed: 'PASSOU',
        checkFailed: 'FALHOU',

        // Confirmation
        confirmTitle: 'CONFIRMAÇÃO NECESSÁRIA',
        confirmWarning: 'Você está prestes a aplicar tags em MODO PRODUÇÃO.',
        confirmImpact: 'Isso irá MODIFICAR {count} workflows no N8N de origem.',
        confirmQuestion: 'Deseja prosseguir?',
        confirmYes: 'Sim, executar agora',
        confirmNo: 'Não, cancelar',
        confirmRetry: 'Executar em modo simulação primeiro',

        // Suggestions
        suggestDryRun: '💡 Dica: Execute primeiro com --dry-run para validar as operações',
        suggestVerbose: '💡 Dica: Use --verbose para ver logs detalhados',
        suggestBackup: '⚠️  IMPORTANTE: Certifique-se de ter um backup antes de executar',

        // Summary
        summaryTitle: 'RESUMO DA EXECUÇÃO',
        status: 'Status',
        success: 'SUCESSO',
        failed: 'FALHOU',
        results: 'Resultados',
        totalWorkflows: 'Total de workflows',
        successCount: 'Sucesso',
        failedCount: 'Falhou',
        skippedCount: 'Pulado',
        dryRunCount: 'Simulado',
        performance: 'Performance',
        totalDuration: 'Duração total',
        avgDuration: 'Média por workflow',
        throughput: 'Throughput',
        report: 'Relatório',

        // Messages
        executionCancelled: 'Execução cancelada pelo usuário',
        executionCompleted: 'Execução concluída com sucesso!',
        executionFailed: 'Execução concluída com erros. Verifique o relatório para detalhes.',

        // Errors
        invalidArgs: 'Argumentos inválidos',
        useHelp: 'Use --help para ver opções disponíveis',
        fatalError: 'Erro fatal durante execução',

        // Progress
        processing: 'Processando',
        complete: 'Completo',

        // Help
        usage: 'USO',
        options: 'OPÇÕES',
        examples: 'EXEMPLOS',
        envVars: 'VARIÁVEIS DE AMBIENTE',
        notes: 'NOTAS',
        documentation: 'DOCUMENTAÇÃO'
      },
      'en': {
        // Banner
        title: 'Apply Layer Tags - N8N Workflow Manager',
        mode: 'Mode',
        verbosity: 'Verbosity',
        dryRunMode: 'DRY-RUN MODE',
        productionMode: 'PRODUCTION MODE',

        // Pre-flight checks
        preflightTitle: 'Pre-flight Checks',
        checkingEnv: 'Checking environment variables',
        checkingConnection: 'Testing N8N API connectivity',
        checkingMapping: 'Validating mapping file',
        checkingPermissions: 'Checking write permissions',
        checkPassed: 'PASSED',
        checkFailed: 'FAILED',

        // Confirmation
        confirmTitle: 'CONFIRMATION REQUIRED',
        confirmWarning: 'You are about to apply tags in PRODUCTION MODE.',
        confirmImpact: 'This will MODIFY {count} workflows in the source N8N instance.',
        confirmQuestion: 'Do you want to proceed?',
        confirmYes: 'Yes, execute now',
        confirmNo: 'No, cancel',
        confirmRetry: 'Run in dry-run mode first',

        // Suggestions
        suggestDryRun: '💡 Tip: Run with --dry-run first to validate operations',
        suggestVerbose: '💡 Tip: Use --verbose for detailed logs',
        suggestBackup: '⚠️  IMPORTANT: Make sure you have a backup before executing',

        // Summary
        summaryTitle: 'EXECUTION SUMMARY',
        status: 'Status',
        success: 'SUCCESS',
        failed: 'FAILED',
        results: 'Results',
        totalWorkflows: 'Total workflows',
        successCount: 'Success',
        failedCount: 'Failed',
        skippedCount: 'Skipped',
        dryRunCount: 'Dry-run',
        performance: 'Performance',
        totalDuration: 'Total duration',
        avgDuration: 'Average per workflow',
        throughput: 'Throughput',
        report: 'Report',

        // Messages
        executionCancelled: 'Execution cancelled by user',
        executionCompleted: 'Execution completed successfully!',
        executionFailed: 'Execution completed with errors. Check report for details.',

        // Errors
        invalidArgs: 'Invalid arguments',
        useHelp: 'Use --help to see available options',
        fatalError: 'Fatal error during execution',

        // Progress
        processing: 'Processing',
        complete: 'Complete',

        // Help
        usage: 'USAGE',
        options: 'OPTIONS',
        examples: 'EXAMPLES',
        envVars: 'ENVIRONMENT VARIABLES',
        notes: 'NOTES',
        documentation: 'DOCUMENTATION'
      }
    };
  }

  /**
   * Retorna tradução para chave
   */
  t(key) {
    return this.translations[this.lang][key] || key;
  }

  /**
   * Parse de argumentos com suporte a --lang
   */
  parseArguments() {
    const options = {
      dryRun: false,
      verbose: false,
      quiet: false,
      help: false,
      mapping: null,
      output: null,
      interactive: true, // Default: modo interativo
      lang: 'pt-br',
      skipConfirm: false
    };

    for (let i = 0; i < this.args.length; i++) {
      const arg = this.args[i];

      switch (arg) {
        case '--dry-run':
        case '-d':
          options.dryRun = true;
          break;

        case '--verbose':
        case '-v':
          options.verbose = true;
          break;

        case '--quiet':
        case '-q':
          options.quiet = true;
          options.interactive = false; // Quiet mode desabilita interativo
          break;

        case '--help':
        case '-h':
          options.help = true;
          break;

        case '--mapping':
          if (i + 1 < this.args.length) {
            options.mapping = this.args[i + 1];
            i++;
          } else {
            throw new Error('--mapping requer um argumento <path>');
          }
          break;

        case '--output':
          if (i + 1 < this.args.length) {
            options.output = this.args[i + 1];
            i++;
          } else {
            throw new Error('--output requer um argumento <dir>');
          }
          break;

        case '--lang':
          if (i + 1 < this.args.length) {
            const langValue = this.args[i + 1].toLowerCase();
            if (langValue === 'pt-br' || langValue === 'pt' || langValue === 'português') {
              options.lang = 'pt-br';
            } else if (langValue === 'en' || langValue === 'english') {
              options.lang = 'en';
            } else {
              throw new Error(`Idioma não suportado: ${langValue}. Use 'pt-br' ou 'en'.`);
            }
            i++;
          } else {
            throw new Error('--lang requer um argumento (pt-br ou en)');
          }
          break;

        case '--no-interactive':
        case '-y':
          options.interactive = false;
          options.skipConfirm = true;
          break;

        default:
          if (arg.startsWith('-')) {
            throw new Error(`Flag desconhecida: ${arg}. Use --help para ver opções disponíveis.`);
          }
          break;
      }
    }

    // Atualizar idioma da instância
    this.lang = options.lang;

    return options;
  }

  /**
   * Validação de argumentos (igual ao original)
   */
  validateArguments(options) {
    const errors = [];

    if (options.verbose && options.quiet) {
      errors.push('Conflito: --verbose e --quiet não podem ser usados juntos');
    }

    if (options.mapping) {
      const fs = require('fs');
      if (!fs.existsSync(options.mapping)) {
        errors.push(`Arquivo de mapeamento não encontrado: ${options.mapping}`);
      }
    }

    if (options.output) {
      const fs = require('fs');
      const path = require('path');
      const parentDir = path.dirname(options.output);
      if (!fs.existsSync(parentDir)) {
        errors.push(`Diretório pai não existe: ${parentDir}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * ✨ NOVO: Pre-flight checks visuais
   */
  async runPreflightChecks(orchestrator) {
    console.log('');
    console.log(`\x1b[1m\x1b[36m${this.t('preflightTitle')}\x1b[0m`);
    console.log('─'.repeat(60));
    console.log('');

    const checks = [
      {
        name: this.t('checkingEnv'),
        fn: async () => {
          const result = await orchestrator.validateEnvironment();
          return result.success;
        }
      },
      {
        name: this.t('checkingConnection'),
        fn: async () => {
          return await orchestrator.testConnection();
        }
      },
      {
        name: this.t('checkingMapping'),
        fn: async () => {
          const result = await orchestrator.loadMapping();
          return result.success;
        }
      }
    ];

    let allPassed = true;

    for (const check of checks) {
      process.stdout.write(`  ${check.name}... `);

      try {
        const passed = await check.fn();

        if (passed) {
          console.log(`\x1b[32m✓ ${this.t('checkPassed')}\x1b[0m`);
        } else {
          console.log(`\x1b[31m✗ ${this.t('checkFailed')}\x1b[0m`);
          allPassed = false;
        }
      } catch (error) {
        console.log(`\x1b[31m✗ ${this.t('checkFailed')}\x1b[0m`);
        console.log(`    \x1b[2m${error.message}\x1b[0m`);
        allPassed = false;
      }
    }

    console.log('');

    return allPassed;
  }

  /**
   * ✨ NOVO: Confirmação interativa com preview
   */
  async confirmExecution(workflowCount, options) {
    // Pular confirmação em dry-run ou se --no-interactive/-y
    if (options.dryRun || options.skipConfirm) {
      return true;
    }

    console.log('');
    console.log(`\x1b[1m\x1b[33m╔${'═'.repeat(58)}╗\x1b[0m`);
    console.log(`\x1b[1m\x1b[33m║${' '.repeat(58)}║\x1b[0m`);
    console.log(`\x1b[1m\x1b[33m║${this._centerText(this.t('confirmTitle'), 58)}║\x1b[0m`);
    console.log(`\x1b[1m\x1b[33m║${' '.repeat(58)}║\x1b[0m`);
    console.log(`\x1b[1m\x1b[33m╚${'═'.repeat(58)}╝\x1b[0m`);
    console.log('');
    console.log(`\x1b[33m${this.t('confirmWarning')}\x1b[0m`);
    console.log(`\x1b[33m${this.t('confirmImpact').replace('{count}', workflowCount)}\x1b[0m`);
    console.log('');
    console.log(`\x1b[2m${this.t('suggestBackup')}\x1b[0m`);
    console.log('');

    // Usar readline para prompt interativo
    return await this._promptYesNo(this.t('confirmQuestion'));
  }

  /**
   * Helper: Centralizar texto
   */
  _centerText(text, width) {
    const padding = Math.floor((width - text.length) / 2);
    return ' '.repeat(padding) + text + ' '.repeat(width - padding - text.length);
  }

  /**
   * Helper: Prompt yes/no
   */
  async _promptYesNo(question) {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      this.rl.question(`\x1b[1m${question} (s/n): \x1b[0m`, (answer) => {
        this.rl.close();
        this.rl = null;

        const normalized = answer.trim().toLowerCase();
        resolve(normalized === 's' || normalized === 'sim' || normalized === 'y' || normalized === 'yes');
      });
    });
  }

  /**
   * ✨ NOVO: Sugestões contextuais
   */
  printSuggestions(options) {
    if (!options.dryRun && !options.quiet) {
      console.log('');
      console.log(`\x1b[33m${this.t('suggestDryRun')}\x1b[0m`);
    }

    if (!options.verbose && !options.quiet) {
      console.log(`\x1b[2m${this.t('suggestVerbose')}\x1b[0m`);
    }

    console.log('');
  }

  /**
   * ✨ MELHORADO: Banner com mais informações
   */
  printBanner(options = {}) {
    const mode = options.dryRun
      ? `\x1b[33m${this.t('dryRunMode')}\x1b[0m`
      : `\x1b[32m${this.t('productionMode')}\x1b[0m`;

    const verbosity = options.verbose ? 'Verbose' : (options.quiet ? 'Quiet' : 'Normal');

    console.log('\x1b[1m\x1b[36m');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                                                            ║');
    console.log(`║${this._centerText(this.t('title'), 60)}║`);
    console.log('║                                                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\x1b[0m');
    console.log(`${this.t('mode')}: ${mode}`);
    console.log(`${this.t('verbosity')}: \x1b[36m${verbosity}\x1b[0m`);
    console.log(`Idioma: \x1b[36m${this.lang.toUpperCase()}\x1b[0m`);
    console.log('');
  }

  /**
   * ✨ MELHORADO: Sumário com emojis e cores
   */
  printSummary(result) {
    const { success, summary, performance, reportPath } = result;

    console.log('');
    console.log('\x1b[1m\x1b[36m');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log(`║${this._centerText(this.t('summaryTitle'), 60)}║`);
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\x1b[0m');

    // Status com emoji
    if (success) {
      console.log(`\x1b[1m\x1b[32m✓ ${this.t('status')}: ${this.t('success')}\x1b[0m`);
    } else {
      console.log(`\x1b[1m\x1b[31m✗ ${this.t('status')}: ${this.t('failed')}\x1b[0m`);
    }
    console.log('');

    // Estatísticas com ícones
    console.log(`\x1b[1m📊 ${this.t('results')}:\x1b[0m`);
    console.log(`  ${this.t('totalWorkflows')}:     \x1b[1m${summary.total}\x1b[0m`);
    console.log(`  \x1b[32m✓ ${this.t('successCount')}:\x1b[0m             ${summary.success}`);

    if (summary.failed > 0) {
      console.log(`  \x1b[31m✗ ${this.t('failedCount')}:\x1b[0m              ${summary.failed}`);
    } else {
      console.log(`  ✓ ${this.t('failedCount')}:              ${summary.failed}`);
    }

    if (summary.skipped > 0) {
      console.log(`  \x1b[33m⊘ ${this.t('skippedCount')}:\x1b[0m             ${summary.skipped}`);
    }

    if (summary.dryRun > 0) {
      console.log(`  \x1b[33m⚠ ${this.t('dryRunCount')}:\x1b[0m             ${summary.dryRun}`);
    }
    console.log('');

    // Performance com ícones
    console.log(`\x1b[1m⚡ ${this.t('performance')}:\x1b[0m`);
    const totalSeconds = (performance.totalDuration / 1000).toFixed(2);
    const avgMs = performance.averageDuration.toFixed(0);
    const throughput = summary.total > 0
      ? (summary.total / (performance.totalDuration / 1000)).toFixed(2)
      : '0.00';

    console.log(`  ${this.t('totalDuration')}:      \x1b[1m${totalSeconds}s\x1b[0m`);
    console.log(`  ${this.t('avgDuration')}: ${avgMs}ms`);
    console.log(`  ${this.t('throughput')}:          ${throughput} workflows/s`);
    console.log('');

    // Relatório
    if (reportPath) {
      console.log(`\x1b[1m📄 ${this.t('report')}:\x1b[0m`);
      console.log(`  \x1b[36m${reportPath}\x1b[0m`);
      console.log('');
    }

    // Mensagem final
    if (success) {
      console.log(`\x1b[32m✓ ${this.t('executionCompleted')}\x1b[0m`);
    } else {
      console.log(`\x1b[31m✗ ${this.t('executionFailed')}\x1b[0m`);
    }
    console.log('');
  }

  /**
   * Help com suporte a idiomas
   */
  printHelp() {
    const helpText = `
\x1b[1m\x1b[36m${this.t('title')}\x1b[0m

\x1b[1m${this.t('usage')}:\x1b[0m
  node scripts/admin/apply-layer-tags/index.js [options]

\x1b[1m${this.t('options')}:\x1b[0m
  \x1b[33m--dry-run\x1b[0m, \x1b[33m-d\x1b[0m        ${this.lang === 'pt-br' ? 'Simular aplicação de tags (sem chamadas API)' : 'Simulate tag application (no API calls)'}
  \x1b[33m--verbose\x1b[0m, \x1b[33m-v\x1b[0m        ${this.lang === 'pt-br' ? 'Ativar logs detalhados' : 'Enable verbose logging'}
  \x1b[33m--quiet\x1b[0m, \x1b[33m-q\x1b[0m          ${this.lang === 'pt-br' ? 'Desabilitar barra de progresso' : 'Disable progress bar'}
  \x1b[33m--lang\x1b[0m <pt-br|en>  ${this.lang === 'pt-br' ? 'Idioma da interface (padrão: pt-br)' : 'Interface language (default: pt-br)'}
  \x1b[33m--no-interactive\x1b[0m    ${this.lang === 'pt-br' ? 'Desabilitar confirmações (modo CI/CD)' : 'Disable confirmations (CI/CD mode)'}
  \x1b[33m--mapping\x1b[0m <path>   ${this.lang === 'pt-br' ? 'Caminho customizado do arquivo de mapeamento' : 'Custom mapping file path'}
  \x1b[33m--output\x1b[0m <dir>     ${this.lang === 'pt-br' ? 'Diretório de saída customizado' : 'Custom output directory'}
  \x1b[33m--help\x1b[0m, \x1b[33m-h\x1b[0m           ${this.lang === 'pt-br' ? 'Mostrar esta mensagem de ajuda' : 'Show this help message'}

\x1b[1m${this.t('examples')}:\x1b[0m
  \x1b[32m# ${this.lang === 'pt-br' ? 'Simulação (recomendado primeiro)' : 'Dry run (recommended first)'}\x1b[0m
  node scripts/admin/apply-layer-tags/index.js --dry-run

  \x1b[32m# ${this.lang === 'pt-br' ? 'Aplicar tags (modo produção)' : 'Apply tags (production mode)'}\x1b[0m
  node scripts/admin/apply-layer-tags/index.js

  \x1b[32m# ${this.lang === 'pt-br' ? 'Modo verbose com dry-run' : 'Verbose mode with dry-run'}\x1b[0m
  node scripts/admin/apply-layer-tags/index.js --dry-run --verbose

  \x1b[32m# ${this.lang === 'pt-br' ? 'Interface em inglês' : 'English interface'}\x1b[0m
  node scripts/admin/apply-layer-tags/index.js --lang en

  \x1b[32m# ${this.lang === 'pt-br' ? 'Modo não-interativo (CI/CD)' : 'Non-interactive mode (CI/CD)'}\x1b[0m
  node scripts/admin/apply-layer-tags/index.js --dry-run --no-interactive

\x1b[1m${this.t('envVars')}:\x1b[0m
  \x1b[33mSOURCE_N8N_URL\x1b[0m       ${this.lang === 'pt-br' ? 'URL da instância N8N de origem (obrigatória)' : 'Source N8N instance URL (required)'}
  \x1b[33mSOURCE_N8N_API_KEY\x1b[0m   ${this.lang === 'pt-br' ? 'Chave de API do N8N de origem (obrigatória)' : 'Source N8N API key (required)'}

\x1b[1m${this.t('notes')}:\x1b[0m
  ${this.lang === 'pt-br' ? '- Recomenda-se executar com --dry-run primeiro para validar operações' : '- It\'s recommended to run with --dry-run first to validate operations'}
  ${this.lang === 'pt-br' ? '- O script processa workflows em paralelo (máx 5 requisições simultâneas)' : '- The script processes workflows in parallel (max 5 concurrent requests)'}
  ${this.lang === 'pt-br' ? '- Retry automático em erros de rede e respostas 5xx (máx 3 tentativas)' : '- Retry is automatic on network errors and 5xx responses (max 3 attempts)'}
  ${this.lang === 'pt-br' ? '- Um relatório é gerado após execução em formato Markdown' : '- A report is generated after execution in Markdown format'}

\x1b[1m${this.t('documentation')}:\x1b[0m
  ${this.lang === 'pt-br' ? 'Para informações detalhadas, veja:' : 'For detailed information, see:'}
  scripts/admin/apply-layer-tags/README.md
  .claude/specs/tag-layer-implementation/requirements.md

`;

    console.log(helpText);
  }

  /**
   * Mensagem de erro melhorada
   */
  printError(message, error = null) {
    console.error('');
    console.error('\x1b[1m\x1b[31m╔════════════════════════════════════════════════════════════╗\x1b[0m');
    console.error('\x1b[1m\x1b[31m║                          ERROR                             ║\x1b[0m');
    console.error('\x1b[1m\x1b[31m╚════════════════════════════════════════════════════════════╝\x1b[0m');
    console.error('');
    console.error(`\x1b[31m✗ ${message}\x1b[0m`);

    if (error) {
      console.error('');
      console.error('\x1b[2mDetalhes:\x1b[0m');
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
   * Warning melhorado
   */
  printWarning(message) {
    console.log('');
    console.log('\x1b[33m⚠️  WARNING:\x1b[0m');
    console.log(`\x1b[33m${message}\x1b[0m`);
    console.log('');
  }

  /**
   * Cleanup de readline se necessário
   */
  cleanup() {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }
}

module.exports = CLIInterfaceEnhanced;
