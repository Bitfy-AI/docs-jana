/**
 * ConfigManager - Generic schema-based configuration manager
 * Handles configuration from environment variables, CLI arguments, and defaults
 *
 * Features:
 * - Schema-based configuration with type conversion and validation
 * - Automatic CLI argument parsing based on schema flags
 * - Environment variable loading based on schema
 * - Type conversion (string, number, boolean, array)
 * - Custom validators per field
 * - Help text generation from schema
 * - Sensitive value masking in output
 * - Precedence: CLI > Environment > Defaults
 *
 * @example
 * const schema = {
 *   apiKey: {
 *     type: 'string',
 *     required: false,
 *     env: 'API_TOKEN',
 *     flag: '--api-key',
 *     description: 'API token',
 *     secret: true
 *   },
 *   port: {
 *     type: 'number',
 *     required: false,
 *     default: 3000,
 *     flag: '--port',
 *     description: 'Server port',
 *     validator: (value) => value > 0 && value < 65536 ? null : 'Port must be between 1 and 65535'
 *   }
 * };
 *
 * const configManager = new ConfigManager(schema, process.argv, process.env);
 * const config = configManager.load();
 */

const n8nConfigSchema = require('../config/n8n-config-schema');

class ConfigManager {
  /**
   * Create a ConfigManager
   * @param {Object} schema - Configuration schema (optional, for backward compatibility)
   * @param {Array} argv - Process arguments (default: process.argv)
   * @param {Object} env - Environment variables (default: process.env)
   */
  constructor(schema = null, argv = process.argv, env = process.env) {
    this.argv = argv;
    this.env = env;
    this.config = null;

    // For backward compatibility with N8N script (no schema provided)
    if (!schema) {
      this.schema = n8nConfigSchema;
    } else {
      this.schema = schema;
    }
  }

  /**
   * Load configuration from all sources with proper precedence
   * Order: CLI arguments > Environment variables > Defaults
   * @returns {Object} Loaded configuration
   */
  load() {
    const config = {};

    // Step 1: Apply defaults
    for (const [key, field] of Object.entries(this.schema)) {
      if (field.default !== undefined) {
        config[key] = field.default;
      }
    }

    // Step 2: Apply environment variables
    const envConfig = this.parseEnvironment();
    Object.assign(config, envConfig);

    // Step 3: Apply CLI arguments (highest priority)
    const cliConfig = this.parseArguments();
    Object.assign(config, cliConfig);

    // Step 4: Apply SOURCE/TARGET fallback logic for N8N
    if (this._isN8nSchema()) {
      // If sourceN8nUrl is set, use it as primary n8nUrl for downloads
      if (config.sourceN8nUrl) {
        config.n8nUrl = config.sourceN8nUrl;
      }
      // If sourceApiKey is set, use it as primary apiKey for downloads
      if (config.sourceApiKey) {
        config.apiKey = config.sourceApiKey;
      }
      // If sourceTag is set, use it as primary tag for downloads
      if (config.sourceTag) {
        config.tag = config.sourceTag;
      }

      // If targetN8nUrl is set for upload operations, keep both available
      // The upload command will choose which to use based on its logic
      // targetTag is available as config.targetTag for upload operations
    }

    // Step 5: Type conversion and validation
    this.config = this.validateAndTransform(config);

    return this.config;
  }

  /**
   * Parse environment variables based on schema
   * @returns {Object} Configuration from environment
   */
  parseEnvironment() {
    const config = {};

    for (const [key, field] of Object.entries(this.schema)) {
      if (field.env && this.env[field.env]) {
        config[key] = this.env[field.env];
      }
    }

    return config;
  }

  /**
   * Parse CLI arguments based on schema
   * Supports both flag-based (--flag value) and positional arguments
   * @returns {Object} Configuration from CLI
   */
  parseArguments() {
    const config = {};

    // Parse flag-based arguments
    for (const [key, field] of Object.entries(this.schema)) {
      if (field.flag) {
        const flagIndex = this.argv.indexOf(field.flag);
        if (flagIndex !== -1 && flagIndex + 1 < this.argv.length) {
          config[key] = this.argv[flagIndex + 1];
        }
      }
    }

    // Parse positional arguments (for backward compatibility)
    // Positional args start at index 2 (0 = node, 1 = script)
    const positionalFields = Object.entries(this.schema)
      .filter(([_, field]) => field.positional !== undefined)
      .sort((a, b) => a[1].positional - b[1].positional);

    for (const [key, field] of positionalFields) {
      const argIndex = 2 + field.positional;
      if (argIndex < this.argv.length) {
        const value = this.argv[argIndex];
        // Only use positional if it's not a flag
        if (!value.startsWith('--')) {
          config[key] = value;
        }
      }
    }

    return config;
  }

  /**
   * Validate and transform configuration based on schema
   * @param {Object} config - Raw configuration
   * @returns {Object} Validated and transformed configuration
   * @throws {Error} If validation fails
   */
  validateAndTransform(config) {
    const transformed = {};
    const errors = [];

    for (const [key, field] of Object.entries(this.schema)) {
      const value = config[key];

      // Check required fields
      if (field.required && (value === undefined || value === null || value === '')) {
        errors.push(`Campo obrigatório ausente: ${key} (${field.description || key})`);
        continue;
      }

      // Skip transformation if value is undefined and not required
      if (value === undefined || value === null) {
        transformed[key] = value;
        continue;
      }

      // Type conversion
      try {
        transformed[key] = this._convertType(value, field.type);
      } catch (error) {
        errors.push(`Erro de conversão de tipo para ${key}: ${error.message}`);
        continue;
      }

      // Custom validation
      if (field.validator) {
        const validationError = field.validator(transformed[key]);
        if (validationError) {
          errors.push(`Validação falhou para ${key}: ${validationError}`);
        }
      }
    }

    if (errors.length > 0) {
      console.error('❌ Erros de validação:', errors);
      const error = new Error('Erros de validação de configuração');
      error.validationErrors = errors;
      throw error;
    }

    return transformed;
  }

  /**
   * Convert value to specified type
   * @private
   * @param {*} value - Value to convert
   * @param {string} type - Target type
   * @returns {*} Converted value
   */
  _convertType(value, type) {
    if (value === undefined || value === null) {
      return value;
    }

    switch (type) {
    case 'string':
      return String(value);

    case 'number': {
      const num = Number(value);
      if (isNaN(num)) {
        throw new Error(`Não foi possível converter "${value}" para número`);
      }
      return num;
    }

    case 'boolean':
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const lower = value.toLowerCase();
        if (lower === 'true' || lower === '1' || lower === 'yes') return true;
        if (lower === 'false' || lower === '0' || lower === 'no') return false;
      }
      throw new Error(`Não foi possível converter "${value}" para boolean`);

    case 'array': {
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') {
        // Support comma-separated values
        return value.split(',').map(v => v.trim()).filter(v => v.length > 0);
      }
      throw new Error(`Não foi possível converter "${value}" para array`);
    }

    default:
      return value;
    }
  }

  /**
   * Validate required configuration
   * For backward compatibility with N8N script
   * @returns {Object} Validation result { valid: boolean, errors: string[] }
   */
  validate() {
    const errors = [];

    if (!this.config) {
      try {
        this.config = this.load();
      } catch (error) {
        if (error.validationErrors) {
          return { valid: false, errors: error.validationErrors };
        }
        return { valid: false, errors: [error.message] };
      }
    }

    // Para compatibilidade retroativa com N8N: validação especial para autenticação
    // Nota: Removida comparação === pois compara referências de objetos, não estrutura
    // A comparação this.schema === this._createN8nSchema() sempre retornava false
    // porque _createN8nSchema() cria um novo objeto a cada chamada
    if (this._isN8nSchema()) {
      if (!this.config.n8nUrl) {
        errors.push('URL do n8n não fornecida (N8N_URL ou primeiro argumento)');
      }

      if (!this.config.apiKey && (!this.config.username || !this.config.password)) {
        errors.push('Credenciais não fornecidas (N8N_API_KEY ou N8N_USERNAME + N8N_PASSWORD)');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if current schema is N8N schema
   * @private
   */
  _isN8nSchema() {
    return this.schema.n8nUrl !== undefined &&
           this.schema.apiKey !== undefined &&
           this.schema.username !== undefined;
  }

  /**
   * Print usage instructions generated from schema
   */
  printUsage() {
    console.log('\n📖 USO:');

    // Generate usage line
    const positionalArgs = Object.entries(this.schema)
      .filter(([_, field]) => field.positional !== undefined)
      .sort((a, b) => a[1].positional - b[1].positional)
      .map(([key, field]) => field.required ? `<${key.toUpperCase()}>` : `[${key.toUpperCase()}]`);

    if (positionalArgs.length > 0) {
      console.log(`  node ${this._getScriptName()} ${positionalArgs.join(' ')}`);
    }

    // List flags
    const flagFields = Object.entries(this.schema)
      .filter(([_, field]) => field.flag);

    if (flagFields.length > 0) {
      console.log('\n📖 OPÇÕES:');
      for (const [, field] of flagFields) {
        const required = field.required ? '(obrigatório)' : '(opcional)';
        const defaultValue = field.default !== undefined ? ` [padrão: ${field.default}]` : '';
        console.log(`  ${field.flag.padEnd(20)} ${field.description} ${required}${defaultValue}`);
      }
    }

    // List environment variables
    const envFields = Object.entries(this.schema)
      .filter(([_, field]) => field.env);

    if (envFields.length > 0) {
      console.log('\n📖 VARIÁVEIS DE AMBIENTE:');
      for (const [, field] of envFields) {
        const required = field.required ? '(obrigatório)' : '(opcional)';
        const defaultValue = field.default !== undefined ? ` [padrão: ${field.default}]` : '';
        console.log(`  ${field.env.padEnd(20)} ${field.description} ${required}${defaultValue}`);
      }
    }

    // Special notes for N8N schema
    if (this._isN8nSchema()) {
      console.log('\n  * Forneça API_KEY ou USERNAME+PASSWORD');
      console.log('\n📖 EXEMPLOS:');
      console.log('  # Baixar todos');
      console.log('  node download-n8n-workflows.js https://n8n.com n8n_api_xxxxx');
      console.log('\n  # Baixar com filtro de tag');
      console.log('  node download-n8n-workflows.js https://n8n.com n8n_api_xxxxx producao');
      console.log('\n  # Via variáveis de ambiente');
      console.log('  N8N_URL=https://n8n.com N8N_API_KEY=xxx N8N_TAG=prod node download-n8n-workflows.js\n');
    } else {
      console.log('');
    }
  }

  /**
   * Get script name from argv
   * @private
   */
  _getScriptName() {
    if (this.argv.length > 1) {
      const scriptPath = this.argv[1];
      return scriptPath.split(/[\\/]/).pop();
    }
    return 'script.js';
  }

  /**
   * Print configuration summary with sensitive value masking
   */
  printSummary() {
    if (!this.config) {
      this.config = this.load();
    }

    console.log('\n⚙️  CONFIGURAÇÃO:');

    for (const [key, value] of Object.entries(this.config)) {
      if (value === undefined || value === null) {
        continue;
      }

      const field = this.schema[key];
      const isSecret = field && field.secret;

      let displayValue;
      if (isSecret && value) {
        displayValue = this.maskSensitiveData(value);
      } else if (typeof value === 'object') {
        displayValue = JSON.stringify(value);
      } else {
        displayValue = value;
      }

      console.log(`   ${key}: ${displayValue}`);
    }

    console.log('');
  }

  /**
   * Mask sensitive data for safe display
   * @param {string} value - Value to mask
   * @returns {string} Masked value
   */
  maskSensitiveData(value) {
    if (!value) return value;

    const str = String(value);
    if (str.length <= 4) {
      return '****';
    }

    // Show first 2 and last 2 characters, mask the rest
    const visibleChars = 2;
    const maskedLength = Math.min(str.length - (visibleChars * 2), 20);
    return str.substring(0, visibleChars) +
           '*'.repeat(maskedLength) +
           str.substring(str.length - visibleChars);
  }

  /**
   * Get loaded configuration
   * @returns {Object} Current configuration
   */
  getConfig() {
    if (!this.config) {
      this.config = this.load();
    }
    return this.config;
  }

}

module.exports = ConfigManager;
