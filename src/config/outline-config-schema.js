/**
 * Configuration Schema for Outline Documentation Download Script
 *
 * This schema defines all configuration options for the download-outline-docs.js script.
 * It will be used by ConfigManager to:
 * - Parse CLI arguments
 * - Load environment variables
 * - Apply defaults
 * - Validate configuration
 * - Generate help text
 *
 * Schema format for each field:
 * {
 *   type: 'string' | 'number' | 'boolean' | 'array',
 *   required: boolean,
 *   default: any,
 *   env: string (environment variable name),
 *   flag: string (CLI flag name),
 *   positional: number (position in CLI args, starting at 0),
 *   description: string (help text),
 *   secret: boolean (mask in logs),
 *   validator: function (custom validation, returns null if valid or error message)
 * }
 */

const outlineConfigSchema = {
  url: {
    type: 'string',
    required: true,
    env: 'OUTLINE_URL',
    flag: '--url',
    positional: 0,
    description: 'URL da API do Outline (ex: https://outline.example.com)',
    validator: (value) => {
      if (!value) return 'URL é obrigatória';
      if (!value.startsWith('http://') && !value.startsWith('https://')) {
        return 'URL deve começar com http:// ou https://';
      }
      return null;
    },
  },

  apiToken: {
    type: 'string',
    required: true,
    env: 'OUTLINE_API_TOKEN',
    flag: '--api-key',
    positional: 1,
    description: 'Token de API do Outline',
    secret: true,
    validator: (value) => {
      if (!value) return 'API Token é obrigatório';
      if (value.length < 10) return 'API Token parece inválido (muito curto)';
      return null;
    },
  },

  outputDir: {
    type: 'string',
    required: false,
    default: './docs',
    env: 'OUTLINE_OUTPUT_DIR',
    flag: '--output',
    description: 'Diretório de saída para os documentos',
  },

  delay: {
    type: 'number',
    required: false,
    default: 200,
    env: 'OUTLINE_DELAY',
    flag: '--delay',
    description: 'Delay em milissegundos entre requisições (rate limiting)',
    validator: (value) => {
      if (value < 0) return 'Delay não pode ser negativo';
      if (value > 10000) return 'Delay muito alto (máximo 10000ms)';
      return null;
    },
  },

  collections: {
    type: 'array',
    required: false,
    default: [],
    env: 'OUTLINE_COLLECTIONS',
    flag: '--collections',
    description: 'IDs de collections para filtrar (separados por vírgula)',
  },

  verbose: {
    type: 'boolean',
    required: false,
    default: false,
    env: 'OUTLINE_VERBOSE',
    flag: '--verbose',
    description: 'Ativar logs detalhados (debug)',
  },

  logLevel: {
    type: 'string',
    required: false,
    default: 'info',
    env: 'LOG_LEVEL',
    flag: '--log-level',
    description: 'Nível de log: debug, info, warn, error',
    validator: (value) => {
      const validLevels = ['debug', 'info', 'warn', 'error'];
      return validLevels.includes(value)
        ? null
        : `Nível de log deve ser um de: ${validLevels.join(', ')}`;
    },
  },

  maxRetries: {
    type: 'number',
    required: false,
    default: 3,
    env: 'OUTLINE_MAX_RETRIES',
    flag: '--max-retries',
    description: 'Número máximo de tentativas em caso de erro',
    validator: (value) => {
      if (value < 0) return 'Número de tentativas não pode ser negativo';
      if (value > 10) return 'Número de tentativas muito alto (máximo 10)';
      return null;
    },
  },

  timeout: {
    type: 'number',
    required: false,
    default: 30000,
    env: 'OUTLINE_TIMEOUT',
    flag: '--timeout',
    description: 'Timeout em milissegundos para requisições HTTP',
    validator: (value) => {
      if (value < 1000) return 'Timeout muito baixo (mínimo 1000ms)';
      if (value > 300000) return 'Timeout muito alto (máximo 300000ms)';
      return null;
    },
  },
};

module.exports = outlineConfigSchema;
