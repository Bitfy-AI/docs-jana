/**
 * @fileoverview CLI wrapper para comando transfer com suporte a modo não-interativo
 */

const path = require('path');
const { isNonInteractive, getFlag, getExitCode, outputJSON } = require('../utils/non-interactive');

/**
 * Comando de transferência com suporte não-interativo
 * @returns {Promise<void>}
 */
async function transfer() {
  const nonInteractive = isNonInteractive();

  if (nonInteractive) {
    // Modo não-interativo: usar defaults e flags
    const options = {
      filters: {},
      dryRun: getFlag('dry-run') || false,
      parallelism: parseInt(getFlag('parallelism')) || 3,
      deduplicator: getFlag('deduplicator') || 'standard-deduplicator',
      validators: [],
      reporters: []
    };

    // Validators (default: integrity-validator)
    const validatorsFlag = getFlag('validators');
    if (validatorsFlag) {
      options.validators = typeof validatorsFlag === 'string'
        ? validatorsFlag.split(',').map(v => v.trim())
        : ['integrity-validator'];
    } else {
      options.validators = ['integrity-validator'];
    }

    // Reporters (default: markdown-reporter)
    const reportersFlag = getFlag('reporters');
    if (reportersFlag) {
      options.reporters = typeof reportersFlag === 'string'
        ? reportersFlag.split(',').map(r => r.trim())
        : ['markdown-reporter'];
    } else {
      options.reporters = ['markdown-reporter'];
    }

    // Filtros via flags
    const tagsFlag = getFlag('filters.tags');
    if (tagsFlag && typeof tagsFlag === 'string') {
      options.filters.tags = tagsFlag.split(',').map(t => t.trim());
    }

    const excludeTagsFlag = getFlag('filters.excludeTags');
    if (excludeTagsFlag && typeof excludeTagsFlag === 'string') {
      options.filters.excludeTags = excludeTagsFlag.split(',').map(t => t.trim());
    }

    // Verificar se .env existe
    const envPath = path.join(process.cwd(), '.env');
    const fs = require('fs');
    if (!fs.existsSync(envPath)) {
      outputJSON({
        success: false,
        error: 'Missing .env file. Run configure command first.',
        hint: 'Run: docs-jana configure --non-interactive --source-url=... --source-api-key=... --target-url=... --target-api-key=...'
      });
      process.exit(2);
    }

    // Executar transferência
    try {
      const TransferManager = require('../../scripts/admin/n8n-transfer/core/transfer-manager');
      const manager = new TransferManager('.env');

      const result = await manager.transfer(options);

      outputJSON({
        success: true,
        result: {
          total: result.total,
          transferred: result.transferred,
          skipped: result.skipped,
          failed: result.failed,
          duration: result.duration,
          dryRun: result.dryRun,
          reports: result.reports || []
        }
      });

      process.exit(getExitCode(result));
    } catch (err) {
      outputJSON({
        success: false,
        error: err.message,
        stack: process.env.DEBUG ? err.stack : undefined
      });
      process.exit(2);
    }
  }

  // Modo interativo: delegar para wizard existente
  try {
    const transferWizard = require('../../scripts/admin/n8n-transfer/cli/commands/transfer');
    await transferWizard();
  } catch (err) {
    console.error(`❌ Erro: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { transfer };

// Se executado diretamente
if (require.main === module) {
  transfer();
}
