/**
 * N8N Upload Configuration Schema
 *
 * This schema defines the configuration structure for N8N workflow uploader.
 * It specifies the fields, types, validation rules, and how to load values
 * from environment variables, CLI arguments, and defaults.
 *
 * The schema is used by ConfigManager to:
 * - Parse and validate configuration from multiple sources
 * - Convert types automatically (string, number, boolean, array)
 * - Apply validation rules
 * - Generate usage documentation
 * - Mask sensitive values in output
 *
 * Configuration precedence: CLI arguments > Environment variables > Defaults
 *
 * @module n8n-upload-config-schema
 */

const fs = require('fs');
const path = require('path');
const PlaceholderResolver = require('../utils/placeholder-resolver');

/**
 * N8N Upload Configuration Schema
 *
 * Each field can have the following properties:
 * - type: Data type ('string', 'number', 'boolean', 'array')
 * - required: Whether the field is mandatory
 * - default: Default value if not provided
 * - env: Environment variable name to read from
 * - flag: CLI flag name (e.g., '--input')
 * - positional: Position in CLI arguments (0-based, starting after script name)
 * - description: Human-readable description
 * - secret: Whether to mask value in output (for sensitive data)
 * - validator: Custom validation function that returns error message or null
 */
const n8nUploadConfigSchema = {
  /**
   * N8N instance URL
   *
   * The base URL of the N8N instance to upload to.
   * Example: https://n8n.refrisol.com.br
   *
   * Can be provided via:
   * - Environment variable: N8N_URL (fallback to TARGET_N8N_URL)
   * - CLI argument: First positional argument
   */
  n8nUrl: {
    type: 'string',
    required: true,
    env: 'N8N_URL',
    positional: 0,
    description: 'URL do n8n de destino',
  },

  /**
   * TARGET N8N instance URL (for upload/restore operations)
   *
   * The base URL of the target N8N instance.
   * Takes precedence over N8N_URL for upload operations.
   *
   * Can be provided via:
   * - Environment variable: TARGET_N8N_URL
   */
  targetN8nUrl: {
    type: 'string',
    required: false,
    env: 'TARGET_N8N_URL',
    description: 'URL do n8n de destino (TARGET)',
  },

  /**
   * N8N API Key
   *
   * API key for authenticating with N8N.
   * Alternative to username/password authentication.
   * This is the preferred authentication method.
   *
   * Can be provided via:
   * - Environment variable: N8N_API_KEY (fallback to TARGET_N8N_API_KEY)
   * - CLI argument: Second positional argument
   *
   * Note: Either apiKey OR (username + password) must be provided.
   */
  apiKey: {
    type: 'string',
    required: false,
    env: 'N8N_API_KEY',
    description: 'API Key do n8n',
    secret: true,
  },

  /**
   * TARGET N8N API Key (for upload/restore operations)
   *
   * API key for the target N8N instance.
   * Takes precedence over N8N_API_KEY for upload operations.
   *
   * Can be provided via:
   * - Environment variable: TARGET_N8N_API_KEY
   */
  targetApiKey: {
    type: 'string',
    required: false,
    env: 'TARGET_N8N_API_KEY',
    description: 'API Key do n8n de destino (TARGET)',
    secret: true,
  },

  /**
   * N8N Username
   *
   * Username for authenticating with N8N.
   * Must be used together with password.
   * Alternative to API key authentication.
   *
   * Can be provided via:
   * - Environment variable: N8N_USERNAME
   *
   * Note: Either apiKey OR (username + password) must be provided.
   */
  username: {
    type: 'string',
    required: false,
    env: 'N8N_USERNAME',
    description: 'Usuário do n8n',
  },

  /**
   * N8N Password
   *
   * Password for authenticating with N8N.
   * Must be used together with username.
   * Alternative to API key authentication.
   *
   * Can be provided via:
   * - Environment variable: N8N_PASSWORD
   *
   * Note: Either apiKey OR (username + password) must be provided.
   */
  password: {
    type: 'string',
    required: false,
    env: 'N8N_PASSWORD',
    description: 'Senha do n8n',
    secret: true,
  },

  /**
   * Input Directory
   *
   * Directory containing the workflow JSON files to upload.
   * Must be a valid directory path.
   *
   * Can be provided via:
   * - Environment variable: N8N_INPUT_DIR
   * - CLI flag: --input
   * - CLI argument: Third positional argument
   *
   * Example: ./n8n-workflows-2025-10-01T13-27-51
   */
  inputDir: {
    type: 'string',
    required: false,
    env: 'N8N_INPUT_DIR',
    flag: '--input',
    positional: 2,
    description: 'Diretório contendo os arquivos JSON dos workflows',
    validator: (value) => {
      if (!value) {
        return null; // Allow empty if not provided (will be checked later)
      }

      // Check if value contains placeholders (ex: {timestamp})
      if (PlaceholderResolver.hasPlaceholder(value)) {
        // Validate placeholder format only - skip directory existence check
        const formatValidation = PlaceholderResolver.validateFormat(value);
        if (!formatValidation.valid) {
          return formatValidation.error;
        }

        // Placeholder format is valid - skip directory existence check
        // Directory will be validated at runtime after placeholder resolution
        return null;
      }

      // Standard validation for non-placeholder paths
      // Resolve relative paths
      const resolvedPath = path.isAbsolute(value) ? value : path.resolve(process.cwd(), value);

      // Check if directory exists
      if (!fs.existsSync(resolvedPath)) {
        return `Directory does not exist: ${resolvedPath}`;
      }

      // Check if it's actually a directory
      const stats = fs.statSync(resolvedPath);
      if (!stats.isDirectory()) {
        return `Path is not a directory: ${resolvedPath}`;
      }

      return null;
    },
  },

  /**
   * Dry Run Mode
   *
   * When enabled, performs validation and shows what would be uploaded
   * without actually uploading workflows to the server.
   *
   * Can be provided via:
   * - Environment variable: N8N_DRY_RUN (set to 'true' or '1')
   * - CLI flag: --dry-run
   *
   * Default: false
   */
  dryRun: {
    type: 'boolean',
    required: false,
    default: false,
    env: 'N8N_DRY_RUN',
    flag: '--dry-run',
    description: 'Modo de teste - valida sem fazer upload',
  },

  /**
   * Force Upload
   *
   * When enabled, overwrites existing workflows without confirmation.
   * Use with caution as this will replace workflows with the same ID.
   *
   * Can be provided via:
   * - Environment variable: N8N_FORCE (set to 'true' or '1')
   * - CLI flag: --force
   *
   * Default: false
   */
  force: {
    type: 'boolean',
    required: false,
    default: false,
    env: 'N8N_FORCE',
    flag: '--force',
    description: 'Sobrescreve workflows existentes sem confirmação',
  },

  /**
   * Skip Errors
   *
   * When enabled, continues uploading remaining workflows even if some fail.
   * Failed uploads will be logged but won't stop the entire process.
   *
   * Can be provided via:
   * - Environment variable: N8N_SKIP_ERRORS (set to 'true' or '1')
   * - CLI flag: --skip-errors
   *
   * Default: true
   */
  skipErrors: {
    type: 'boolean',
    required: false,
    default: true,
    env: 'N8N_SKIP_ERRORS',
    flag: '--skip-errors',
    description: 'Continua upload mesmo se alguns workflows falharem',
  },

  /**
   * Log Level
   *
   * Controls the verbosity of log output.
   *
   * Valid values:
   * - 'debug': Detailed debugging information
   * - 'info': General informational messages
   * - 'warn': Warning messages
   * - 'error': Error messages only
   *
   * Can be provided via:
   * - Environment variable: LOG_LEVEL
   * - CLI flag: --log-level
   *
   * Default: 'info'
   *
   * Validation: Must be one of the valid log levels.
   */
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
        : `Log level deve ser um de: ${validLevels.join(', ')}`;
    },
  },
};

module.exports = n8nUploadConfigSchema;
