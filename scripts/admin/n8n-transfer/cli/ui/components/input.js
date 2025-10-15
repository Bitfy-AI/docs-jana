/**
 * @fileoverview Input prompt component
 */

const inquirer = require('inquirer');

/**
 * Prompt de input text
 * @param {string} message - Mensagem do prompt
 * @param {Object} [options={}] - Opções
 * @param {*} [options.default] - Valor padrão
 * @param {Function} [options.validate] - Função de validação
 * @param {boolean} [options.password=false] - Se é senha (mask)
 * @returns {Promise<string>} Valor digitado
 */
async function input(message, options = {}) {
  const { default: defaultValue, validate, password = false } = options;

  const answers = await inquirer.prompt([{
    type: password ? 'password' : 'input',
    name: 'value',
    message,
    default: defaultValue,
    validate
  }]);

  return answers.value;
}

/**
 * Input com validação de URL
 * @param {string} message - Mensagem
 * @param {Object} [options={}] - Opções
 * @returns {Promise<string>} URL válida
 */
async function inputUrl(message, options = {}) {
  return input(message, {
    ...options,
    validate: (value) => {
      if (!value) return 'URL é obrigatória';

      try {
        new URL(value);
        return true;
      } catch {
        return 'Formato de URL inválido';
      }
    }
  });
}

/**
 * Input para número
 * @param {string} message - Mensagem
 * @param {Object} [options={}] - Opções
 * @param {number} [options.min] - Valor mínimo
 * @param {number} [options.max] - Valor máximo
 * @returns {Promise<number>} Número válido
 */
async function inputNumber(message, options = {}) {
  const { min, max, default: defaultValue } = options;

  const value = await input(message, {
    default: defaultValue,
    validate: (val) => {
      const num = parseInt(val, 10);
      if (isNaN(num)) return 'Por favor insira um número válido';
      if (min !== undefined && num < min) return `Valor mínimo é ${min}`;
      if (max !== undefined && num > max) return `Valor máximo é ${max}`;
      return true;
    }
  });

  return parseInt(value, 10);
}

module.exports = {
  input,
  inputUrl,
  inputNumber
};
