/**
 * @fileoverview Helpers para modo não-interativo
 */

/**
 * Verifica se está em modo não-interativo
 * @returns {boolean}
 */
function isNonInteractive() {
  return process.argv.includes('--non-interactive');
}

/**
 * Obtém valor de flag CLI
 * @param {string} flag - Nome da flag (ex: 'dry-run')
 * @returns {string|boolean|null} Valor da flag
 */
function getFlag(flag) {
  const fullFlag = `--${flag}`;
  const index = process.argv.indexOf(fullFlag);

  if (index === -1) return null;

  // Boolean flag (presente = true)
  if (index === process.argv.length - 1) return true;

  // Value flag (--flag=value ou --flag value)
  const nextArg = process.argv[index + 1];

  if (fullFlag.includes('=')) {
    return fullFlag.split('=')[1];
  }

  if (nextArg && !nextArg.startsWith('--')) {
    return nextArg;
  }

  return true;
}

/**
 * Exit codes específicos
 */
const EXIT_CODES = {
  SUCCESS: 0,
  PARTIAL_FAILURE: 1,
  TOTAL_FAILURE: 2
};

/**
 * Determina exit code baseado em resultado
 * @param {Object} result - Resultado da operação
 * @returns {number} Exit code
 */
function getExitCode(result) {
  if (result.failed === 0) return EXIT_CODES.SUCCESS;
  if (result.transferred > 0) return EXIT_CODES.PARTIAL_FAILURE;
  return EXIT_CODES.TOTAL_FAILURE;
}

/**
 * Output estruturado JSON
 * @param {Object} data - Dados a outputar
 */
function outputJSON(data) {
  console.log(JSON.stringify(data, null, 2));
}

module.exports = {
  isNonInteractive,
  getFlag,
  EXIT_CODES,
  getExitCode,
  outputJSON
};
