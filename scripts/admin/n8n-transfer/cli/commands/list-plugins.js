/**
 * @fileoverview List-plugins command
 *
 * Comando para listar plugins disponíveis no sistema n8n-transfer.
 * Suporta filtragem por tipo e exibição em formato interativo ou JSON.
 *
 * @module n8n-transfer/cli/commands/list-plugins
 * @author docs-jana
 * @version 1.0.0
 */

const path = require('path');
const { t } = require('../i18n');
const { title, info, createTable } = require('../ui/components');
const PluginRegistry = require('../../core/plugin-registry');
const { isNonInteractive, getFlag, outputJSON } = require('../utils/non-interactive');

/**
 * Lista todos os plugins disponíveis no sistema
 *
 * Funcionalidades:
 * - Auto-discovery de plugins no diretório /plugins
 * - Filtragem por tipo (--type=deduplicator|validator|reporter)
 * - Modo interativo com tabelas formatadas
 * - Modo não-interativo com output JSON
 * - Agrupamento por tipo
 * - Informações sobre criação de custom plugins
 *
 * @async
 * @function listPlugins
 * @returns {Promise<void>}
 *
 * @example
 * // Modo interativo - lista todos os plugins
 * await listPlugins();
 *
 * @example
 * // Modo interativo - filtra por tipo
 * // node script.js --type=validator
 * await listPlugins();
 *
 * @example
 * // Modo não-interativo - output JSON
 * // node script.js --non-interactive
 * await listPlugins();
 */
async function listPlugins() {
  const nonInteractive = isNonInteractive();
  const filterType = getFlag('type'); // deduplicator|validator|reporter

  // Validar tipo se especificado
  const validTypes = ['deduplicator', 'validator', 'reporter'];
  if (filterType && !validTypes.includes(filterType)) {
    if (nonInteractive) {
      outputJSON({
        success: false,
        error: `Tipo inválido: ${filterType}. Use: ${validTypes.join(', ')}`
      });
    } else {
      console.error(`\n❌ Erro: Tipo inválido "${filterType}"`);
      console.error(`\nTipos válidos: ${validTypes.join(', ')}\n`);
    }
    process.exit(1);
  }

  // Criar plugin registry e auto-discover
  const registry = new PluginRegistry();

  const pluginsBaseDir = path.join(__dirname, '../../plugins');
  const pluginTypes = ['deduplicators', 'validators', 'reporters'];

  try {
    // Descobrir plugins em cada subdiretório
    for (const type of pluginTypes) {
      const typeDir = path.join(pluginsBaseDir, type);
      try {
        registry.discover(typeDir);
      } catch (error) {
        // Se diretório não existir, apenas continuar
        if (error.message.includes('não encontrado') || error.message.includes('not found')) {
          continue;
        }
        throw error;
      }
    }
  } catch (error) {
    if (nonInteractive) {
      outputJSON({
        success: false,
        error: `Falha ao descobrir plugins: ${error.message}`
      });
    } else {
      console.error(`\n❌ Erro ao descobrir plugins: ${error.message}\n`);
    }
    process.exit(1);
  }

  // Listar plugins
  let plugins = registry.getAll();

  // Filtrar por tipo se especificado
  if (filterType) {
    plugins = registry.listByType(filterType);
  }

  if (nonInteractive) {
    // Output JSON
    const pluginData = plugins.map(p => ({
      name: p.getName(),
      version: p.getVersion(),
      type: p.getType(),
      description: p.getDescription(),
      enabled: p.isEnabled(),
      builtIn: true
    }));

    outputJSON({
      success: true,
      total: pluginData.length,
      plugins: pluginData
    });

    process.exit(0);
  }

  // Modo interativo
  console.log(title('📦 Plugins Disponíveis'));
  console.log('');

  if (filterType) {
    console.log(info(`Filtro: tipo = ${filterType}`));
    console.log('');
  }

  // Agrupar por tipo
  const byType = {
    deduplicator: [],
    validator: [],
    reporter: []
  };

  plugins.forEach(p => {
    byType[p.getType()].push(p);
  });

  // Exibir cada tipo
  for (const [type, typePlugins] of Object.entries(byType)) {
    if (typePlugins.length === 0) continue;

    console.log(`\n${t(`plugins.types.${type}`)} (${typePlugins.length}):`);
    console.log('');

    const rows = typePlugins.map(p => [
      p.getName(),
      p.getVersion(),
      p.getDescription() || 'N/A',
      t('plugins.builtIn'),
      p.isEnabled() ? '✓' : '✗'
    ]);

    console.log(createTable({
      head: ['Name', 'Version', 'Description', 'Type', 'Enabled'],
      rows
    }));
  }

  // Informação sobre criar custom plugins
  console.log('');
  console.log(info('💡 Como criar custom plugins:'));
  console.log('');
  console.log('  1. Consulte a documentação em scripts/admin/n8n-transfer/plugins/PLUGIN_DEVELOPMENT.md');
  console.log('  2. Crie seu plugin estendendo BasePlugin');
  console.log('  3. Registre via manager.registerPlugin(plugin)');
  console.log('');

  process.exit(0);
}

module.exports = listPlugins;
