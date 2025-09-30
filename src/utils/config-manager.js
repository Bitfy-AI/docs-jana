/**
 * Config Manager - Handles configuration from environment and CLI arguments
 */

class ConfigManager {
  constructor(argv = process.argv, env = process.env) {
    this.argv = argv;
    this.env = env;
  }

  /**
   * Load configuration from environment and CLI
   * @returns {object} Configuration object
   */
  load() {
    return {
      n8nUrl: this.getN8nUrl(),
      apiKey: this.getApiKey(),
      username: this.getUsername(),
      password: this.getPassword(),
      tag: this.getTag(),
      logLevel: this.getLogLevel(),
    };
  }

  /**
   * Get n8n URL
   * Priority: CLI arg > Environment variable
   */
  getN8nUrl() {
    return this.argv[2] || this.env.N8N_URL || null;
  }

  /**
   * Get API Key
   * Priority: CLI arg > Environment variable
   */
  getApiKey() {
    return this.argv[3] || this.env.N8N_API_KEY || null;
  }

  /**
   * Get username
   * From environment only
   */
  getUsername() {
    return this.env.N8N_USERNAME || null;
  }

  /**
   * Get password
   * From environment only
   */
  getPassword() {
    return this.env.N8N_PASSWORD || null;
  }

  /**
   * Get tag filter
   * Priority: CLI arg > Environment variable
   */
  getTag() {
    return this.argv[4] || this.env.N8N_TAG || null;
  }

  /**
   * Get log level
   * From environment only
   */
  getLogLevel() {
    return this.env.LOG_LEVEL || 'info';
  }

  /**
   * Validate required configuration
   * @returns {object} Validation result { valid: boolean, errors: string[] }
   */
  validate() {
    const errors = [];
    const config = this.load();

    if (!config.n8nUrl) {
      errors.push('URL do n8n não fornecida (N8N_URL ou primeiro argumento)');
    }

    if (!config.apiKey && (!config.username || !config.password)) {
      errors.push('Credenciais não fornecidas (N8N_API_KEY ou N8N_USERNAME + N8N_PASSWORD)');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Print usage instructions
   */
  printUsage() {
    console.log('\n📖 USO:');
    console.log('  node download-n8n-workflows.js <N8N_URL> <API_KEY> [TAG]');
    console.log('\n📖 VARIÁVEIS DE AMBIENTE:');
    console.log('  N8N_URL      - URL do n8n (obrigatório)');
    console.log('  N8N_API_KEY  - API Key do n8n (obrigatório*)');
    console.log('  N8N_USERNAME - Usuário do n8n (obrigatório*)');
    console.log('  N8N_PASSWORD - Senha do n8n (obrigatório*)');
    console.log('  N8N_TAG      - Tag para filtrar workflows (opcional)');
    console.log('  LOG_LEVEL    - Nível de log: debug, info, warn, error (padrão: info)');
    console.log('\n  * Forneça API_KEY ou USERNAME+PASSWORD');
    console.log('\n📖 EXEMPLOS:');
    console.log('  # Baixar todos');
    console.log('  node download-n8n-workflows.js https://n8n.com n8n_api_xxxxx');
    console.log('\n  # Baixar com filtro de tag');
    console.log('  node download-n8n-workflows.js https://n8n.com n8n_api_xxxxx producao');
    console.log('\n  # Via variáveis de ambiente');
    console.log('  N8N_URL=https://n8n.com N8N_API_KEY=xxx N8N_TAG=prod node download-n8n-workflows.js\n');
  }

  /**
   * Print configuration summary
   */
  printSummary() {
    const config = this.load();
    console.log('\n⚙️  CONFIGURAÇÃO:');
    console.log(`   URL: ${config.n8nUrl}`);
    console.log(`   Auth: ${config.apiKey ? 'API Key' : 'Username/Password'}`);
    if (config.tag) {
      console.log(`   Tag: ${config.tag}`);
    }
    console.log('');
  }
}

module.exports = ConfigManager;