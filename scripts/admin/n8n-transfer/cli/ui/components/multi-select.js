/**
 * @fileoverview Seleção múltipla (checkbox)
 */

const inquirer = require('inquirer');

/**
 * Seleção múltipla (checkbox)
 * @param {string} message - Mensagem
 * @param {Array<{name: string, value: *, checked?: boolean}>} choices - Opções
 * @param {Object} [options={}] - Opções
 * @returns {Promise<Array>} Valores selecionados
 */
async function multiSelect(message, choices, options = {}) {
  const answers = await inquirer.prompt([{
    type: 'checkbox',
    name: 'values',
    message,
    choices
  }]);

  return answers.values;
}

module.exports = {
  multiSelect
};
