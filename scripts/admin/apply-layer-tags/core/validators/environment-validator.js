/**
 * Environment Validator
 *
 * Valida presenca e formato de variaveis de ambiente necessarias,
 * existencia de arquivos criticos e conectividade com a API n8n.
 *
 * @module validators/environment-validator
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const { API_CONFIG, PATHS } = require('../../config/config');

/**
 * Resultado da validacao de ambiente
 * @typedef {Object} ValidationResult
 * @property {boolean} success - Se validacao foi bem-sucedida
 * @property {string[]} errors - Lista de erros encontrados
 * @property {Object} [data] - Dados validados (se sucesso)
 */

/**
 * Sanitiza URL para log, removendo credenciais
 * @param {string} url - URL para sanitizar
 * @returns {string} URL sanitizada
 */
function sanitizeUrl(url) {
  try {
    const parsed = new URL(url);
    // Remove credenciais da URL
    parsed.username = '';
    parsed.password = '';
    // Remove query params que podem conter tokens
    parsed.search = '';
    return parsed.toString();
  } catch (error) {
    return '[URL invalida]';
  }
}

/**
 * Valida formato de URL
 * @param {string} url - URL para validar
 * @returns {boolean} True se URL valida
 */
function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (error) {
    return false;
  }
}

/**
 * Testa conectividade com a API n8n
 * @param {string} url - URL da API
 * @param {string} apiKey - API Key
 * @returns {Promise<boolean>} True se conectado com sucesso
 */
async function testApiConnectivity(url, apiKey) {
  return new Promise((resolve, reject) => {
    const apiUrl = new URL(url);
    const client = apiUrl.protocol === 'https:' ? https : http;

    const options = {
      hostname: apiUrl.hostname,
      port: apiUrl.port || (apiUrl.protocol === 'https:' ? 443 : 80),
      path: '/api/v1/workflows?limit=1',
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': apiKey
      },
      timeout: 5000
    };

    const req = client.request(options, (res) => {
      if (res.statusCode === 200) {
        // 200 = sucesso, autenticacao valida
        resolve(true);
      } else if (res.statusCode === 401) {
        // 401 = API key invalida
        reject(new Error('Autenticacao falhou: SOURCE_N8N_API_KEY invalida'));
      } else {
        reject(new Error(`API retornou status ${res.statusCode}`));
      }
    });

    req.on('error', (error) => {
      reject(new Error(`Failed to connect to API: ${error.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('API connection timeout'));
    });

    req.end();
  });
}

/**
 * Valida ambiente completo
 *
 * Verifica:
 * - Presenca de arquivo .env
 * - SOURCE_N8N_URL (formato URL)
 * - SOURCE_N8N_API_KEY (nao vazio)
 * - Existencia de rename-mapping-atualizado.json
 * - Conectividade com API n8n
 *
 * @returns {Promise<ValidationResult>} Resultado da validacao
 *
 * @example
 * const result = await validateEnvironment();
 * if (!result.success) {
 *   console.error('Validation errors:', result.errors);
 *   process.exit(1);
 * }
 */
async function validateEnvironment() {
  const errors = [];

  // 1. Validar presenca de .env
  const envPath = path.join(PATHS.projectRoot, '.env');
  if (!fs.existsSync(envPath)) {
    errors.push('Arquivo .env nao encontrado na raiz do projeto');
  }

  // 2. Validar SOURCE_N8N_URL
  if (!API_CONFIG.url) {
    errors.push('SOURCE_N8N_URL nao esta definida no .env');
  } else if (!isValidUrl(API_CONFIG.url)) {
    errors.push(`SOURCE_N8N_URL possui formato invalido: ${sanitizeUrl(API_CONFIG.url)}`);
  }

  // 3. Validar SOURCE_N8N_API_KEY
  if (!API_CONFIG.apiKey) {
    errors.push('SOURCE_N8N_API_KEY nao esta definida no .env');
  } else if (API_CONFIG.apiKey.trim().length === 0) {
    errors.push('SOURCE_N8N_API_KEY esta vazia');
  }

  // 4. Validar existencia de rename-mapping-atualizado.json
  if (!fs.existsSync(PATHS.mappingFile)) {
    errors.push(`Arquivo de mapeamento nao encontrado: ${PATHS.mappingFile}`);
  }

  // Se ja houver erros, retornar sem testar conectividade
  if (errors.length > 0) {
    return {
      success: false,
      errors
    };
  }

  // 5. Testar conectividade com API n8n
  try {
    await testApiConnectivity(API_CONFIG.url, API_CONFIG.apiKey);
  } catch (error) {
    errors.push(`Falha ao conectar com API n8n: ${error.message}`);
    return {
      success: false,
      errors
    };
  }

  // Validacao bem-sucedida
  return {
    success: true,
    errors: [],
    data: {
      url: API_CONFIG.url,
      apiKey: '***' // Nao expor credenciais
    }
  };
}

module.exports = {
  validateEnvironment,
  isValidUrl,
  testApiConnectivity,
  sanitizeUrl
};
