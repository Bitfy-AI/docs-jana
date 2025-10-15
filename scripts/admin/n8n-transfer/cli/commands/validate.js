/**
 * @fileoverview Validation command - Valida workflows sem transferir
 */

const { t } = require('../i18n');
const { title, success, error, info, warning, createTable } = require('../ui/components');
const { multiSelect, confirm, input } = require('../ui/components');
const { withSpinner } = require('../ui/components');
const TransferManager = require('../../core/transfer-manager');
const { isNonInteractive, getFlag, outputJSON } = require('../utils/non-interactive');

/**
 * Executa validação de workflows
 * @returns {Promise<void>}
 */
async function validate() {
  // Check for help flag
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    const { renderCommandHelp } = require('../utils/help-renderer');
    console.log(renderCommandHelp('validate'));
    process.exit(0);
  }

  const nonInteractive = isNonInteractive();

  if (nonInteractive) {
    // Modo não-interativo
    const options = {
      filters: {},
      validators: (getFlag('validators') || 'integrity-validator,schema-validator').split(',')
    };

    if (getFlag('filters.tags')) {
      options.filters.tags = getFlag('filters.tags').split(',');
    }

    const manager = new TransferManager('.env');

    try {
      const result = await manager.validate(options);

      outputJSON({
        success: true,
        result: {
          total: result.total,
          valid: result.valid,
          invalid: result.invalid,
          errors: result.errors,
          warnings: result.warnings,
          issues: result.issues
        }
      });

      process.exit(result.errors > 0 ? 1 : 0);
    } catch (err) {
      outputJSON({
        success: false,
        error: err.message
      });
      process.exit(2);
    }
  }

  // Modo interativo
  console.log(title(t('prompts.validateWizard.title')));
  console.log('');

  const options = {
    filters: {},
    validators: []
  };

  // Escolher validators
  options.validators = await multiSelect('Selecione validators:', [
    { name: 'Integrity Validator', value: 'integrity-validator', checked: true },
    { name: 'Schema Validator', value: 'schema-validator', checked: true }
  ]);

  if (options.validators.length === 0) {
    console.log(error('Nenhum validator selecionado. Operação cancelada.'));
    process.exit(0);
  }

  // Filtros (opcional)
  const useFilters = await confirm('Aplicar filtros?');

  if (useFilters) {
    const filterByTags = await confirm('Filtrar por tags?');
    if (filterByTags) {
      const tags = await input('Tags a incluir (separadas por vírgula):');
      options.filters.tags = tags.split(',').map(t => t.trim());
    }
  }

  // Executar validação
  console.log('');

  let result;
  try {
    result = await withSpinner('Validando workflows...', async () => {
      const manager = new TransferManager('.env');
      return await manager.validate(options);
    });
  } catch (err) {
    console.log(error(`Validação falhou: ${err.message}`));
    process.exit(1);
  }

  // Exibir resumo
  console.log('');
  console.log(success(t('messages.validationComplete', {
    valid: result.valid,
    invalid: result.invalid
  })));

  console.log('');
  console.log(info(`Total de erros: ${result.errors}`));
  console.log(info(`Total de warnings: ${result.warnings}`));

  // Exibir issues se houver
  if (result.issues.length > 0) {
    console.log('');
    console.log(warning('Issues encontrados:'));
    console.log('');

    // Criar tabela de issues
    const rows = result.issues.flatMap(issue =>
      issue.issues.map(i => [
        issue.workflow,
        i.validator,
        i.severity,
        i.message
      ])
    );

    if (rows.length > 0) {
      console.log(createTable({
        head: ['Workflow', 'Validator', 'Severity', 'Message'],
        rows: rows.slice(0, 20) // Limitar a 20 primeiras
      }));

      if (rows.length > 20) {
        console.log('');
        console.log(info(`... e mais ${rows.length - 20} issues`));
      }
    }
  }

  // Gerar relatório (opcional)
  const generateReport = await confirm('Gerar relatório de validação?');

  if (generateReport) {
    const fs = require('fs');
    const path = require('path');

    const reportPath = path.join(process.cwd(), 'validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));

    console.log('');
    console.log(success(`Relatório salvo em: ${reportPath}`));
  }

  process.exit(result.errors > 0 ? 1 : 0);
}

module.exports = validate;
