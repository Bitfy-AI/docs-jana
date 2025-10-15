/**
 * @fileoverview Select/choice prompt component
 */

const inquirer = require('inquirer');

/**
 * Select single option
 * @param {string} message - Mensagem
 * @param {Array<{name: string, value: *}>} choices - Opções
 * @param {Object} [options={}] - Opções
 * @param {*} [options.default] - Valor padrão
 * @returns {Promise<*>} Valor selecionado
 */
async function select(message, choices, options = {}) {
  const { default: defaultValue } = options;

  const answers = await inquirer.prompt([{
    type: 'list',
    name: 'value',
    message,
    choices,
    default: defaultValue
  }]);

  return answers.value;
}

module.exports = {
  select
};
