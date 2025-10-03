/**
 * @fileoverview Sistema de internacionalização (i18n)
 * Suporta PT-BR (padrão) e EN-US
 */

const fs = require('fs');
const path = require('path');

// Cache de strings carregadas
let currentLocale = null;
let strings = null;

/**
 * Carrega strings do idioma especificado
 * @param {string} locale - Código do idioma (pt-BR ou en-US)
 * @returns {Object} Strings do idioma
 */
function loadStrings(locale) {
  const filePath = path.join(__dirname, `${locale}.json`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Locale file not found: ${filePath}`);
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

/**
 * Inicializa i18n com locale especificado ou padrão
 * @param {string} [locale] - Locale a usar (default: pt-BR ou env LANGUAGE)
 */
function init(locale) {
  // Ordem de prioridade: parâmetro > env var > default pt-BR
  currentLocale = locale || process.env.LANGUAGE || 'pt-BR';

  try {
    strings = loadStrings(currentLocale);
  } catch (error) {
    // Fallback para pt-BR se locale especificado não existir
    console.warn(`Locale ${currentLocale} not found. Falling back to pt-BR`);
    currentLocale = 'pt-BR';
    strings = loadStrings(currentLocale);
  }
}

/**
 * Obtém string traduzida por path
 * @param {string} key - Path da string (ex: 'errors.configNotFound')
 * @param {Object} [params] - Parâmetros para substituição {{param}}
 * @returns {string} String traduzida
 *
 * @example
 * t('errors.configNotFound', { path: '.env' })
 * // => "Arquivo de configuração não encontrado: .env"
 */
function t(key, params = {}) {
  if (!strings) {
    init(); // Lazy init
  }

  // Navegar pelo objeto usando dot notation
  const keys = key.split('.');
  let value = strings;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return key; // Fallback: retorna a key se não encontrar
    }
  }

  // Se value não for string, retornar key
  if (typeof value !== 'string') {
    return key;
  }

  // Substituir parâmetros {{param}}
  let result = value;
  for (const [param, val] of Object.entries(params)) {
    result = result.replace(new RegExp(`{{${param}}}`, 'g'), val);
  }

  return result;
}

/**
 * Obtém locale atual
 * @returns {string} Locale atual
 */
function getLocale() {
  if (!currentLocale) {
    init();
  }
  return currentLocale;
}

/**
 * Troca locale em runtime
 * @param {string} locale - Novo locale
 */
function setLocale(locale) {
  init(locale);
}

module.exports = {
  init,
  t,
  getLocale,
  setLocale
};
