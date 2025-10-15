/**
 * N8N Configuration Schema
 *
 * This schema defines the configuration structure for N8N workflow downloader.
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
 * @module n8n-config-schema
 */

/**
 * N8N Configuration Schema
 *
 * Each field can have the following properties:
 * - type: Data type ('string', 'number', 'boolean', 'array')
 * - required: Whether the field is mandatory
 * - default: Default value if not provided
 * - env: Environment variable name to read from
 * - flag: CLI flag name (e.g., '--log-level')
 * - positional: Position in CLI arguments (0-based, starting after script name)
 * - description: Human-readable description
 * - secret: Whether to mask value in output (for sensitive data)
 * - validator: Custom validation function that returns error message or null
 */
const n8nConfigSchema = {
  /**
   * N8N instance URL
   *
   * The base URL of the N8N instance to connect to.
   * Example: https://n8n.example.com
   *
   * Can be provided via:
   * - Environment variable: N8N_URL (fallback to SOURCE_N8N_URL)
   * - CLI argument: First positional argument
   */
  n8nUrl: {
    type: 'string',
    required: true,
    env: 'N8N_URL',
    positional: 0,
    description: 'URL do n8n',
  },

  /**
   * SOURCE N8N instance URL (for download/backup operations)
   *
   * The base URL of the source N8N instance.
   * Takes precedence over N8N_URL for download operations.
   *
   * Can be provided via:
   * - Environment variable: SOURCE_N8N_URL
   */
  sourceN8nUrl: {
    type: 'string',
    required: false,
    env: 'SOURCE_N8N_URL',
    description: 'URL do n8n de origem (SOURCE)',
  },

  /**
   * TARGET N8N instance URL (for upload/restore operations)
   *
   * The base URL of the target N8N instance.
   * Used for upload operations.
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
   * - Environment variable: N8N_API_KEY (fallback to SOURCE_N8N_API_KEY)
   * - CLI argument: Second positional argument
   *
   * Note: Either apiKey OR (username + password) must be provided.
   */
  apiKey: {
    type: 'string',
    required: false,
    env: 'N8N_API_KEY',
    positional: 1,
    description: 'API Key do n8n',
    secret: true,
  },

  /**
   * SOURCE N8N API Key (for download/backup operations)
   *
   * API key for the source N8N instance.
   * Takes precedence over N8N_API_KEY for download operations.
   *
   * Can be provided via:
   * - Environment variable: SOURCE_N8N_API_KEY
   */
  sourceApiKey: {
    type: 'string',
    required: false,
    env: 'SOURCE_N8N_API_KEY',
    description: 'API Key do n8n de origem (SOURCE)',
    secret: true,
  },

  /**
   * TARGET N8N API Key (for upload/restore operations)
   *
   * API key for the target N8N instance.
   * Used for upload operations.
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
   * Tag Filter
   *
   * Optional tag to filter workflows by.
   * Only workflows with this tag will be downloaded.
   * If not provided, all workflows will be downloaded.
   *
   * Can be provided via:
   * - Environment variable: N8N_TAG
   * - CLI argument: Third positional argument
   */
  tag: {
    type: 'string',
    required: false,
    env: 'N8N_TAG',
    positional: 2,
    description: 'Tag para filtrar workflows',
  },

  /**
   * SOURCE Tag Filter (for download/backup operations)
   *
   * Optional tag to filter workflows from source N8N instance.
   * Takes precedence over N8N_TAG for download operations.
   *
   * Can be provided via:
   * - Environment variable: SOURCE_N8N_TAG
   */
  sourceTag: {
    type: 'string',
    required: false,
    env: 'SOURCE_N8N_TAG',
    description: 'Tag para filtrar workflows do n8n de origem (SOURCE)',
  },

  /**
   * TARGET Tag Filter (for upload/restore operations)
   *
   * Optional tag to apply to workflows when uploading to target N8N instance.
   * Takes precedence over N8N_TAG for upload operations.
   *
   * Can be provided via:
   * - Environment variable: TARGET_N8N_TAG
   */
  targetTag: {
    type: 'string',
    required: false,
    env: 'TARGET_N8N_TAG',
    description: 'Tag para aplicar em workflows no n8n de destino (TARGET)',
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

module.exports = n8nConfigSchema;
