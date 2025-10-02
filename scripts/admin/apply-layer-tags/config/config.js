/**
 * Configuracao Centralizada - Tag Layer Implementation
 *
 * Centraliza todas as configuracoes, constantes e paths do projeto.
 *
 * @module config
 */

require('dotenv').config();
const path = require('path');

/**
 * Validacao de variaveis de ambiente obrigatorias
 *
 * IMPORTANTE: Esta funcao deve ser chamada explicitamente pelo codigo
 * que usa este modulo, nao e executada automaticamente.
 *
 * @throws {Error} Se variaveis obrigatorias estiverem ausentes
 *
 * @example
 * const { validateRequiredEnvVars } = require('./config/config');
 * validateRequiredEnvVars(); // Valida antes de usar configuracoes
 */
function validateRequiredEnvVars() {
  if (!process.env.SOURCE_N8N_URL) {
    throw new Error('Missing required environment variable: SOURCE_N8N_URL');
  }

  if (!process.env.SOURCE_N8N_API_KEY) {
    throw new Error('Missing required environment variable: SOURCE_N8N_API_KEY');
  }
}

// NOTA: Validacao NAO executada automaticamente ao carregar modulo.
// Deve ser chamada explicitamente pelo orchestrator ou CLI.

/**
 * Configuracoes de retry e timeout
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 segundo
  timeout: 5000,    // 5 segundos
  maxTimeout: 60000 // Timeout maximo apos aumentos: 60 segundos
};

/**
 * Configuracoes de concorrencia
 */
const CONCURRENCY_CONFIG = {
  maxConcurrent: 5 // Maximo de requisicoes simultaneas
};

/**
 * Paths do projeto
 */
const PROJECT_ROOT = path.resolve(__dirname, '../../../..');
const PATHS = {
  projectRoot: PROJECT_ROOT,
  mappingFile: path.join(PROJECT_ROOT, 'rename-mapping-atualizado.json'),
  outputDir: path.join(PROJECT_ROOT, 'scripts/admin/apply-layer-tags/output'),
  logsDir: path.join(PROJECT_ROOT, 'scripts/admin/apply-layer-tags/logs')
};

/**
 * Credenciais da API n8n
 */
const API_CONFIG = {
  url: process.env.SOURCE_N8N_URL,
  apiKey: process.env.SOURCE_N8N_API_KEY
};

/**
 * Layers arquiteturais disponiveis
 */
const LAYERS = {
  A: 'Pontes - Integracoes entre componentes',
  B: 'Adaptadores - Normalizacao de dados',
  C: 'Fabricas - Criacao de componentes',
  D: 'Agentes - Processamento inteligente',
  E: 'Calendario - Funcionalidades de agenda',
  F: 'Logs - Registro de eventos'
};

/**
 * Layer padrao para workflows sem layer definida
 *
 * Workflows que nao possuem layer definida receberao automaticamente
 * a layer "F" (Logs/Diversos) como fallback.
 */
const DEFAULT_LAYER = 'F';

/**
 * Configuracoes de cache
 */
const CACHE_CONFIG = {
  tagCacheTTL: 30000 // Cache de tags: 30 segundos
};

module.exports = {
  RETRY_CONFIG,
  CONCURRENCY_CONFIG,
  PATHS,
  API_CONFIG,
  LAYERS,
  DEFAULT_LAYER,
  CACHE_CONFIG,
  validateRequiredEnvVars
};
