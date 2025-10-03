/**
 * @fileoverview Transfer Wizard - 5 etapas
 *
 * Wizard interativo para transferência de workflows do SOURCE para TARGET
 * com suporte a filtros, validações, dry-run e relatórios.
 *
 * @module cli/commands/transfer
 * @requires ../i18n
 * @requires ../ui/components
 * @requires ../ui/progress-bar
 * @requires ../../core/transfer-manager
 */

const { t } = require('../i18n');
const { title, success, error, info, createTable, input } = require('../ui/components');
const { select, confirm, multiSelect, inputNumber } = require('../ui/components');
const { createSpinner } = require('../ui/components');
const TransferManager = require('../../core/transfer-manager');
const ProgressBar = require('../ui/progress-bar');

/**
 * Comando transfer - Wizard interativo de transferência de workflows
 *
 * Executa wizard em 5 etapas:
 * 1. Escolher Modo (all/selective/dryrun)
 * 2. Configurar Filtros (se modo selective)
 * 3. Escolher Plugins (deduplicator, validators, reporters)
 * 4. Preview de workflows a transferir
 * 5. Confirmação e execução
 *
 * @async
 * @function transfer
 * @throws {Error} Se configuração inválida ou erro na transferência
 * @returns {Promise<void>}
 *
 * @example
 * // Executar wizard
 * await transfer();
 */
async function transfer() {
  // Check for help flag
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    const { renderCommandHelp } = require('../utils/help-renderer');
    console.log(renderCommandHelp('transfer'));
    process.exit(0);
  }

  console.log(title(t('prompts.transferWizard.title')));
  console.log('');

  const options = {
    filters: {},
    dryRun: false,
    parallelism: 3,
    deduplicator: 'standard-deduplicator',
    validators: ['integrity-validator'],
    reporters: ['markdown-reporter']
  };

  // ETAPA 1: Modo
  console.log('📍 Etapa 1/5: Escolher Modo');
  const mode = await select('Selecione o modo:', [
    { name: 'Transferir todos workflows', value: 'all' },
    { name: 'Transferência seletiva (com filtros)', value: 'selective' },
    { name: 'Dry-run (simulação)', value: 'dryrun' }
  ]);

  if (mode === 'dryrun') {
    options.dryRun = true;
  }

  // ETAPA 2: Filtros (se selective)
  if (mode === 'selective') {
    console.log('');
    console.log('📍 Etapa 2/5: Configurar Filtros');

    const filterByTags = await confirm('Filtrar por tags?');
    if (filterByTags) {
      const tags = await input('Tags a incluir (separadas por vírgula):');
      options.filters.tags = tags.split(',').map(t => t.trim());
    }

    const filterByExcludeTags = await confirm('Excluir tags específicas?');
    if (filterByExcludeTags) {
      const excludeTags = await input('Tags a excluir (separadas por vírgula):');
      options.filters.excludeTags = excludeTags.split(',').map(t => t.trim());
    }
  }

  // ETAPA 3: Plugins
  console.log('');
  console.log('📍 Etapa 3/5: Escolher Plugins');

  options.deduplicator = await select('Deduplicator:', [
    { name: 'Standard (nome + tags exatos)', value: 'standard-deduplicator' },
    { name: 'Fuzzy (similaridade)', value: 'fuzzy-deduplicator' }
  ]);

  options.validators = await multiSelect('Validators:', [
    { name: 'Integrity Validator', value: 'integrity-validator', checked: true },
    { name: 'Schema Validator', value: 'schema-validator', checked: false }
  ]);

  options.reporters = await multiSelect('Reporters:', [
    { name: 'Markdown', value: 'markdown-reporter', checked: true },
    { name: 'JSON', value: 'json-reporter', checked: false },
    { name: 'CSV', value: 'csv-reporter', checked: false }
  ]);

  // ETAPA 4: Preview
  console.log('');
  console.log('📍 Etapa 4/5: Preview');

  const spinner = createSpinner('Carregando workflows do SOURCE...').start();

  let manager;
  let sourceWorkflows;

  try {
    manager = new TransferManager('.env');
    const sourceClient = manager.sourceHttpClient;
    sourceWorkflows = await sourceClient.getWorkflows();
    spinner.succeed();
  } catch (err) {
    spinner.fail();
    console.log(error(`Erro ao carregar workflows: ${err.message}`));
    process.exit(1);
  }

  console.log(info(`Total de workflows encontrados: ${sourceWorkflows.length}`));

  // ETAPA 5: Confirmação
  console.log('');
  console.log('📍 Etapa 5/5: Confirmação');

  const confirmTransfer = await confirm('Confirmar transferência?', { default: true });

  if (!confirmTransfer) {
    console.log(error('Transferência cancelada'));
    process.exit(0);
  }

  // Executar transferência
  console.log('');
  console.log(info('Iniciando transferência...'));
  console.log('');

  const progressBar = new ProgressBar(sourceWorkflows.length);

  // Hook progress do TransferManager
  const originalGetProgress = manager.getProgress.bind(manager);
  manager.getProgress = function() {
    const progress = originalGetProgress();
    if (progress.processed > 0) {
      progressBar.increment(0, `${progress.processed}/${progress.total} workflows`);
    }
    return progress;
  };

  let result;
  try {
    result = await manager.transfer(options);
    progressBar.stop();
  } catch (err) {
    progressBar.stop();
    console.log(error(`Transferência falhou: ${err.message}`));
    process.exit(1);
  }

  // Resumo
  console.log('');
  console.log(success(t('messages.transferComplete', {
    transferred: result.transferred,
    skipped: result.skipped,
    failed: result.failed
  })));

  if (result.dryRun) {
    console.log(info(t('messages.dryRunComplete')));
  }

  if (result.reports && result.reports.length > 0) {
    console.log('');
    console.log('📊 Relatórios gerados:');
    result.reports.forEach(r => {
      console.log(`  ${success(r.reporter)}: ${r.path}`);
    });
  }
}

module.exports = transfer;
