/**
 * @fileoverview Progress bar component usando Ora
 */

const ora = require('ora');

/**
 * Cria spinner/progress
 * @param {string} [text='Carregando...'] - Texto inicial
 * @param {Object} [options={}] - Opções do Ora
 * @returns {Object} Spinner Ora
 */
function createSpinner(text = 'Carregando...', options = {}) {
  return ora({
    text,
    ...options
  });
}

/**
 * Executa operação com spinner
 * @param {string} text - Texto do spinner
 * @param {Function} operation - Função async a executar
 * @returns {Promise<*>} Resultado da operação
 */
async function withSpinner(text, operation) {
  const spinner = createSpinner(text).start();

  try {
    const result = await operation();
    spinner.succeed();
    return result;
  } catch (error) {
    spinner.fail();
    throw error;
  }
}

module.exports = {
  createSpinner,
  withSpinner
};
