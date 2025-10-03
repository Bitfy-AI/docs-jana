/**
 * @fileoverview Utilitários para modo não-interativo (CI/CD, automação)
 */

/**
 * Verifica se está rodando em modo não-interativo
 * @returns {boolean} True se modo não-interativo
 */
function isNonInteractive() {
  return process.env.NON_INTERACTIVE === 'true' || process.argv.includes('--non-interactive');
}

/**
 * Obtém valor de flag da linha de comando
 * @param {string} flagName - Nome da flag (ex: 'filters.tags')
 * @returns {string|null} Valor da flag ou null
 *
 * @example
 * // node script.js --filters.tags=production,staging
 * getFlag('filters.tags') // => 'production,staging'
 */
function getFlag(flagName) {
  const arg = process.argv.find(a => a.startsWith(`--${flagName}=`));
  if (!arg) return null;

  return arg.split('=')[1];
}

/**
 * Envia output JSON para stdout (modo não-interativo)
 * @param {Object} data - Dados a enviar
 */
function outputJSON(data) {
  console.log(JSON.stringify(data, null, 2));
}

/**
 * Exit codes para CLI
 */
const EXIT_CODES = {
  SUCCESS: 0,
  PARTIAL_FAILURE: 1,
  TOTAL_FAILURE: 2
};

/**
 * Determina exit code baseado no resultado da transferência
 * @param {Object} result - Resultado da transferência
 * @param {number} result.transferred - Número de workflows transferidos com sucesso
 * @param {number} result.failed - Número de workflows que falharam
 * @returns {number} Exit code apropriado
 */
function getExitCode(result) {
  if (result.failed === 0) {
    return EXIT_CODES.SUCCESS;
  }

  if (result.transferred > 0 && result.failed > 0) {
    return EXIT_CODES.PARTIAL_FAILURE;
  }

  return EXIT_CODES.TOTAL_FAILURE;
}

module.exports = {
  isNonInteractive,
  getFlag,
  outputJSON,
  EXIT_CODES,
  getExitCode
};
