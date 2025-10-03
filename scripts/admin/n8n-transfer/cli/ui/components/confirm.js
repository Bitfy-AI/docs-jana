/**
 * @fileoverview Confirmação (yes/no)
 */

const inquirer = require('inquirer');

/**
 * Confirmação sim/não
 * @param {string} message - Mensagem
 * @param {Object} [options={}] - Opções
 * @param {boolean} [options.default=false] - Valor padrão
 * @returns {Promise<boolean>} true se sim, false se não
 */
async function confirm(message, options = {}) {
  const { default: defaultValue = false } = options;

  const answers = await inquirer.prompt([{
    type: 'confirm',
    name: 'value',
    message,
    default: defaultValue
  }]);

  return answers.value;
}

module.exports = {
  confirm
};
