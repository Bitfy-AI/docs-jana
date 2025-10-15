/**
 * @fileoverview Help renderer - formata help de comandos
 * @module n8n-transfer/cli/utils/help-renderer
 *
 * @description
 * Sistema de renderização de help contextual para comandos CLI.
 * Suporta help geral (lista todos comandos) e help específico (detalhe de um comando).
 *
 * @example
 * const { renderCommandHelp, renderGeneralHelp } = require('./help-renderer');
 * console.log(renderCommandHelp('configure'));
 * console.log(renderGeneralHelp());
 */

const fs = require('fs');
const path = require('path');
const { title, info, colors } = require('../ui/components');

/**
 * Carrega dados de help do arquivo i18n
 * @returns {Object} Dados de help
 */
function loadHelpData() {
  const i18nPath = path.join(__dirname, '../i18n/pt-BR.json');
  const data = JSON.parse(fs.readFileSync(i18nPath, 'utf-8'));
  return data.help || {};
}

/**
 * Renderiza help de um comando específico
 *
 * @param {string} commandName - Nome do comando (configure|transfer|validate|list-plugins)
 * @returns {string} Help formatado com descrição, uso, flags e exemplos
 *
 * @example
 * renderCommandHelp('configure')
 * // => "📖 Help: configure\n\nDescrição:\n  Configura URLs e API keys..."
 */
function renderCommandHelp(commandName) {
  const allHelpData = loadHelpData();
  const helpData = allHelpData[commandName];

  if (!helpData || typeof helpData !== 'object') {
    return colors.error(`Help não encontrado para comando: ${commandName}`);
  }

  let output = '';

  // Título
  output += title(`📖 Help: ${commandName}`) + '\n\n';

  // Descrição
  if (helpData.description) {
    output += colors.bold('Descrição:\n');
    output += `  ${helpData.description}\n\n`;
  }

  // Uso
  if (helpData.usage) {
    output += colors.bold('Uso:\n');
    output += `  ${helpData.usage}\n\n`;
  }

  // Flags
  if (helpData.flags) {
    output += colors.bold('Flags:\n');
    for (const [flag, desc] of Object.entries(helpData.flags)) {
      output += `  --${flag.padEnd(20)} ${desc}\n`;
    }
    output += '\n';
  }

  // Exemplos
  if (helpData.examples && helpData.examples.length > 0) {
    output += colors.bold('Exemplos:\n');
    helpData.examples.forEach(ex => {
      output += `  ${colors.cyan(ex)}\n`;
    });
    output += '\n';
  }

  return output;
}

/**
 * Renderiza help geral (lista todos comandos disponíveis)
 *
 * @returns {string} Help geral formatado com lista de comandos
 *
 * @example
 * renderGeneralHelp()
 * // => "📖 N8N Transfer System - Help\n\nComandos Disponíveis:..."
 */
function renderGeneralHelp() {
  let output = '';

  output += title('📖 N8N Transfer System - Help') + '\n\n';

  output += colors.bold('Comandos Disponíveis:\n\n');

  const commands = [
    { name: 'configure', desc: 'Configura SOURCE e TARGET' },
    { name: 'transfer', desc: 'Transfere workflows' },
    { name: 'validate', desc: 'Valida workflows' },
    { name: 'list-plugins', desc: 'Lista plugins disponíveis' },
    { name: 'help', desc: 'Exibe esta mensagem' }
  ];

  commands.forEach(cmd => {
    output += `  ${colors.cyan(cmd.name.padEnd(15))} ${cmd.desc}\n`;
  });

  output += '\n';
  output += colors.bold('Para help de comando específico:\n');
  output += '  npm run <command> -- --help\n';
  output += '  ou: node cli/commands/<command>.js --help\n\n';

  output += colors.bold('Exemplos:\n');
  output += `  ${colors.cyan('npm run configure -- --help')}\n`;
  output += `  ${colors.cyan('npm run transfer -- --help')}\n\n`;

  return output;
}

module.exports = {
  renderCommandHelp,
  renderGeneralHelp
};
