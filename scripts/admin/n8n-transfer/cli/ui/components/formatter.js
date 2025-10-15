/**
 * @fileoverview Chalk formatters e wrappers
 */

let chalk;

// Lazy load chalk to handle ESM/CommonJS compatibility
async function loadChalk() {
  if (!chalk) {
    chalk = (await import('chalk')).default;
  }
  return chalk;
}

/**
 * Colors wrappers - sync version for immediate use
 * Falls back to plain text if chalk not loaded
 */
const colors = {
  primary: (text) => chalk ? chalk.cyan(text) : text,
  success: (text) => chalk ? chalk.green(text) : text,
  warning: (text) => chalk ? chalk.yellow(text) : text,
  error: (text) => chalk ? chalk.red(text) : text,
  info: (text) => chalk ? chalk.blue(text) : text,
  muted: (text) => chalk ? chalk.gray(text) : text,
  bold: (text) => chalk ? chalk.bold(text) : text,
  dim: (text) => chalk ? chalk.dim(text) : text,
  cyan: (text) => chalk ? chalk.cyan(text) : text,
  magenta: (text) => chalk ? chalk.magenta(text) : text
};

/**
 * Formata título
 * @param {string} text - Texto
 * @returns {string} Título formatado
 */
function title(text) {
  return colors.bold(colors.primary(text));
}

/**
 * Formata mensagem de sucesso
 * @param {string} text - Texto
 * @returns {string} Mensagem formatada
 */
function success(text) {
  return colors.success(`✓ ${text}`);
}

/**
 * Formata mensagem de erro
 * @param {string} text - Texto
 * @returns {string} Mensagem formatada
 */
function error(text) {
  return colors.error(`✗ ${text}`);
}

/**
 * Formata mensagem de warning
 * @param {string} text - Texto
 * @returns {string} Mensagem formatada
 */
function warning(text) {
  return colors.warning(`⚠ ${text}`);
}

/**
 * Formata mensagem de info
 * @param {string} text - Texto
 * @returns {string} Mensagem formatada
 */
function info(text) {
  return colors.info(`ℹ ${text}`);
}

/**
 * Inicializa o formatter (carrega chalk)
 * @returns {Promise<void>}
 */
async function init() {
  await loadChalk();
}

module.exports = {
  colors,
  title,
  success,
  error,
  warning,
  info,
  init
};
