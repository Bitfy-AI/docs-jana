/**
 * @fileoverview Help command
 * @module n8n-transfer/cli/commands/help
 *
 * @description
 * Comando principal de help que exibe documentação de comandos.
 * Pode exibir help geral (todos comandos) ou help específico de um comando.
 *
 * @example
 * // Help geral
 * const help = require('./help');
 * help(); // ou help([])
 *
 * @example
 * // Help de comando específico
 * help(['configure']);
 */

const { renderGeneralHelp, renderCommandHelp } = require('../utils/help-renderer');

/**
 * Comando help
 *
 * Exibe documentação de comandos disponíveis no sistema.
 * - Sem argumentos: exibe help geral (lista todos comandos)
 * - Com argumento: exibe help específico do comando
 *
 * @param {string[]} [args=[]] - Argumentos (comando específico)
 * @returns {void}
 *
 * @example
 * // Help geral
 * help();
 * help([]);
 *
 * @example
 * // Help de comando específico
 * help(['configure']);
 * help(['transfer']);
 */
function help(args = []) {
  const commandName = args[0];

  if (commandName) {
    // Help de comando específico
    console.log(renderCommandHelp(commandName));
  } else {
    // Help geral
    console.log(renderGeneralHelp());
  }

  process.exit(0);
}

module.exports = help;
