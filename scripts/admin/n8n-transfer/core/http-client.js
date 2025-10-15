/**
 * HttpClient - Cliente HTTP robusto para N8N API com retry logic, timeout e rate limiting
 *
 * @module scripts/admin/n8n-transfer/core/http-client
 * @description Cliente HTTP especializado para operações de transferência de workflows N8N.
 * Implementa retry com backoff exponencial, timeout configurável, rate limiting e logging seguro.
 *
 * @example
 * const client = new HttpClient({
 *   baseUrl: 'https://n8n.example.com',
 *   apiKey: 'your-api-key',
 *   logger: loggerInstance
 * });
 *
 * // Buscar todos os workflows
 * const workflows = await client.getWorkflows();
 *
 * // Criar novo workflow
 * const created = await client.createWorkflow(workflowData);
 */

const https = require('https');
const http = require('http');

/**
 * @typedef {Object} HttpClientConfig
 * @property {string} baseUrl - URL base da instância N8N (ex: https://n8n.example.com)
 * @property {string} apiKey - API Key para autenticação
 * @property {Object} [logger] - Instância de logger (opcional)
 * @property {number} [maxRetries=3] - Número máximo de tentativas de retry
 * @property {number} [timeout=10000] - Timeout em ms (default 10s)
 * @property {number} [maxRequestsPerSecond=10] - Rate limit máximo (requests/segundo)
 */

/**
 * @typedef {Object} Workflow
 * @property {string} id - ID único do workflow
 * @property {string} name - Nome do workflow
 * @property {boolean} active - Se o workflow está ativo
 * @property {Array<Object>} nodes - Nós do workflow
 * @property {Array<Object>} connections - Conexões entre nós
 * @property {Array<string>} [tags] - Tags associadas ao workflow
 */

class HttpClient {
  /**
   * Cria uma nova instância do HttpClient
   *
   * @param {HttpClientConfig} config - Configuração do cliente HTTP
   * @throws {Error} Se baseUrl ou apiKey não forem fornecidos
   */
  constructor(config) {
    if (!config.baseUrl) {
      throw new Error('HttpClient: baseUrl é obrigatório');
    }
    if (!config.apiKey) {
      throw new Error('HttpClient: apiKey é obrigatório');
    }

    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = config.apiKey;
    this.logger = config.logger || this._createNoOpLogger();

    // Configuração de retry
    this.maxRetries = config.maxRetries ?? 3;
    this.timeout = config.timeout ?? 10000; // 10 segundos

    // Rate limiting configuration
    this.maxRequestsPerSecond = config.maxRequestsPerSecond ?? 10;
    this.requestQueue = [];
    this.requestTimestamps = [];

    // Estatísticas
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      retriedRequests: 0,
      rateLimitedRequests: 0,
    };
  }

  /**
   * Cria um logger no-op (sem operação) quando nenhum logger é fornecido
   * @private
   * @returns {Object} Logger que não faz nada
   */
  _createNoOpLogger() {
    const noop = () => {};
    return {
      debug: noop,
      info: noop,
      warn: noop,
      error: noop,
    };
  }

  /**
   * Mascara API key para logging seguro (mostra apenas últimos 3 caracteres)
   *
   * @private
   * @param {string} apiKey - API key a ser mascarada
   * @returns {string} API key mascarada (ex: "***abc")
   */
  _maskApiKey(apiKey) {
    if (!apiKey || apiKey.length <= 3) {
      return '***';
    }
    return '*'.repeat(apiKey.length - 3) + apiKey.slice(-3);
  }

  /**
   * Implementa rate limiting: aguarda se necessário para não exceder maxRequestsPerSecond
   *
   * @private
   * @returns {Promise<void>}
   */
  async _rateLimitCheck() {
    const now = Date.now();
    const oneSecondAgo = now - 1000;

    // Remove timestamps antigos (mais de 1 segundo)
    this.requestTimestamps = this.requestTimestamps.filter(ts => ts > oneSecondAgo);

    // Se já atingiu o limite de requisições por segundo, aguarda
    if (this.requestTimestamps.length >= this.maxRequestsPerSecond) {
      const oldestTimestamp = this.requestTimestamps[0];
      const waitTime = 1000 - (now - oldestTimestamp);

      if (waitTime > 0) {
        this.stats.rateLimitedRequests++;
        this.logger.debug(`Rate limit atingido. Aguardando ${waitTime}ms antes de prosseguir.`);
        await this._sleep(waitTime);
      }
    }

    // Registra timestamp da requisição atual
    this.requestTimestamps.push(Date.now());
  }

  /**
   * Aguarda um período de tempo
   *
   * @private
   * @param {number} ms - Milissegundos para aguardar
   * @returns {Promise<void>}
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Calcula delay com backoff exponencial
   *
   * @private
   * @param {number} attempt - Número da tentativa (0-indexed)
   * @returns {number} Delay em milissegundos
   */
  _calculateBackoff(attempt) {
    // Backoff exponencial: 1s, 2s, 4s, 8s...
    const baseDelay = 1000; // 1 segundo
    return baseDelay * Math.pow(2, attempt);
  }

  /**
   * Verifica se erro é recuperável e deve ser retentado
   *
   * @private
   * @param {Error} error - Erro ocorrido
   * @param {number} statusCode - Código de status HTTP
   * @returns {boolean} True se deve retentar
   */
  _shouldRetry(error, statusCode) {
    // Retry em rate limit (429)
    if (statusCode === 429) return true;

    // Retry em erros de servidor (5xx)
    if (statusCode >= 500 && statusCode < 600) return true;

    // Retry em erros de rede
    if (error && error.code) {
      const retryableCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'];
      if (retryableCodes.includes(error.code)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Executa requisição HTTP com timeout
   *
   * @private
   * @param {string} endpoint - Endpoint da API (ex: /api/v1/workflows)
   * @param {Object} options - Opções da requisição
   * @param {string} [options.method='GET'] - Método HTTP
   * @param {Object} [options.headers={}] - Headers adicionais
   * @param {Object} [options.body] - Body da requisição (será serializado como JSON)
   * @returns {Promise<any>} Resposta da API
   * @throws {Error} Se requisição falhar
   */
  async _executeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': this.apiKey,
        ...options.headers,
      },
    };

    return new Promise((resolve, reject) => {
      let timedOut = false;
      let requestCompleted = false;

      // Setup timeout
      const timeoutId = setTimeout(() => {
        if (!requestCompleted) {
          timedOut = true;
          req.destroy();
          const timeoutError = new Error(`Request timeout após ${this.timeout}ms`);
          timeoutError.code = 'ETIMEDOUT';
          reject(timeoutError);
        }
      }, this.timeout);

      const req = protocol.request(requestOptions, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (timedOut || requestCompleted) return;
          requestCompleted = true;
          clearTimeout(timeoutId);

          // Success (2xx)
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              if (data.trim().length === 0) {
                resolve(null);
              } else {
                resolve(JSON.parse(data));
              }
            } catch (e) {
              // Se não for JSON válido, retorna string
              resolve(data);
            }
          } else {
            // Error response
            const error = new Error(`HTTP ${res.statusCode}: ${data}`);
            error.statusCode = res.statusCode;
            error.responseBody = data;
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        if (timedOut || requestCompleted) return;
        requestCompleted = true;
        clearTimeout(timeoutId);
        reject(error);
      });

      // Write body se fornecido
      if (options.body) {
        req.write(JSON.stringify(options.body));
      }

      req.end();
    });
  }

  /**
   * Executa requisição com retry logic
   *
   * @private
   * @param {string} endpoint - Endpoint da API
   * @param {Object} options - Opções da requisição
   * @returns {Promise<any>} Resposta da API
   * @throws {Error} Se todas as tentativas falharem
   */
  async _requestWithRetry(endpoint, options = {}) {
    this.stats.totalRequests++;

    let lastError;
    let attempt = 0;

    while (attempt < this.maxRetries) {
      try {
        // Rate limiting check antes de cada tentativa
        await this._rateLimitCheck();

        // Log da requisição (mascarando API key)
        const maskedKey = this._maskApiKey(this.apiKey);
        this.logger.debug(`[HttpClient] ${options.method || 'GET'} ${endpoint} (API Key: ${maskedKey}, Tentativa: ${attempt + 1}/${this.maxRetries})`);

        const result = await this._executeRequest(endpoint, options);

        this.stats.successfulRequests++;
        return result;

      } catch (error) {
        lastError = error;
        const statusCode = error.statusCode || null;

        // Log do erro
        this.logger.warn(`[HttpClient] Erro na requisição: ${error.message} (Status: ${statusCode || 'N/A'})`);

        // Se não deve retentar ou já esgotou tentativas
        if (!this._shouldRetry(error, statusCode) || attempt >= this.maxRetries - 1) {
          this.stats.failedRequests++;
          this.logger.error(`[HttpClient] Requisição falhou após ${attempt + 1} tentativa(s): ${error.message}`);
          throw error;
        }

        // Incrementa contador de retry
        this.stats.retriedRequests++;

        // Calcula delay com backoff exponencial
        const delay = this._calculateBackoff(attempt);
        this.logger.info(`[HttpClient] Retentando em ${delay}ms... (Tentativa ${attempt + 2}/${this.maxRetries})`);
        await this._sleep(delay);

        attempt++;
      }
    }

    // Se chegou aqui, todas as tentativas falharam
    this.stats.failedRequests++;
    throw lastError;
  }

  /**
   * Busca todos os workflows da instância N8N
   *
   * @returns {Promise<Array<Workflow>>} Lista de workflows
   * @throws {Error} Se requisição falhar
   *
   * @example
   * const workflows = await client.getWorkflows();
   * console.log(`Encontrados ${workflows.length} workflows`);
   */
  async getWorkflows() {
    this.logger.info('[HttpClient] Buscando workflows...');
    const response = await this._requestWithRetry('/api/v1/workflows', {
      method: 'GET',
    });

    // N8N API retorna { data: [...workflows] }
    const workflows = response.data || response || [];
    this.logger.info(`[HttpClient] ${workflows.length} workflows encontrados`);
    return workflows;
  }

  /**
   * Busca um workflow específico por ID
   *
   * @param {string} workflowId - ID do workflow
   * @returns {Promise<Workflow>} Dados do workflow
   * @throws {Error} Se workflow não for encontrado ou requisição falhar
   *
   * @example
   * const workflow = await client.getWorkflow('123');
   * console.log(`Workflow: ${workflow.name}`);
   */
  async getWorkflow(workflowId) {
    if (!workflowId) {
      throw new Error('HttpClient.getWorkflow: workflowId é obrigatório');
    }

    this.logger.debug(`[HttpClient] Buscando workflow ID: ${workflowId}`);
    const workflow = await this._requestWithRetry(`/api/v1/workflows/${workflowId}`, {
      method: 'GET',
    });

    this.logger.debug(`[HttpClient] Workflow encontrado: ${workflow.name}`);
    return workflow;
  }

  /**
   * Cria um novo workflow na instância N8N
   *
   * @param {Workflow} workflowData - Dados do workflow a ser criado
   * @returns {Promise<Workflow>} Workflow criado (com ID gerado)
   * @throws {Error} Se criação falhar ou dados forem inválidos
   *
   * @example
   * const newWorkflow = await client.createWorkflow({
   *   name: 'Meu Workflow',
   *   nodes: [...],
   *   connections: {...},
   *   active: false
   * });
   * console.log(`Workflow criado com ID: ${newWorkflow.id}`);
   */
  async createWorkflow(workflowData) {
    if (!workflowData || !workflowData.name) {
      throw new Error('HttpClient.createWorkflow: workflowData.name é obrigatório');
    }
    if (!workflowData.nodes || !Array.isArray(workflowData.nodes)) {
      throw new Error('HttpClient.createWorkflow: workflowData.nodes deve ser um array');
    }

    this.logger.info(`[HttpClient] Criando workflow: ${workflowData.name}`);
    const createdWorkflow = await this._requestWithRetry('/api/v1/workflows', {
      method: 'POST',
      body: workflowData,
    });

    this.logger.info(`[HttpClient] Workflow criado com sucesso: ${createdWorkflow.name} (ID: ${createdWorkflow.id})`);
    return createdWorkflow;
  }

  /**
   * Testa conectividade com a instância N8N
   *
   * @returns {Promise<Object>} Resultado do teste { success: boolean, version?: string, error?: string }
   *
   * @example
   * const result = await client.testConnection();
   * if (result.success) {
   *   console.log(`Conectado! Versão N8N: ${result.version}`);
   * } else {
   *   console.error(`Falha na conexão: ${result.error}`);
   * }
   */
  async testConnection() {
    this.logger.info('[HttpClient] Testando conectividade com N8N...');

    try {
      // Tenta buscar workflows como teste de conectividade
      await this._requestWithRetry('/api/v1/workflows', {
        method: 'GET',
      });

      this.logger.info('[HttpClient] Conectividade OK');
      return {
        success: true,
        message: 'Conexão bem-sucedida',
      };
    } catch (error) {
      let errorMessage = error.message;
      let suggestion = '';

      // Fornece sugestões específicas baseadas no tipo de erro
      if (error.statusCode === 401 || error.statusCode === 403) {
        errorMessage = 'Falha na autenticação';
        suggestion = 'Verifique se a API key está correta';
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Não foi possível conectar ao servidor';
        suggestion = 'Verifique se a URL está correta e o servidor está rodando';
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = 'Timeout na conexão';
        suggestion = 'Verifique a conectividade de rede e firewall';
      } else if (error.code === 'ENOTFOUND') {
        errorMessage = 'Servidor não encontrado';
        suggestion = 'Verifique se a URL está correta';
      }

      this.logger.error(`[HttpClient] Falha na conectividade: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        suggestion: suggestion,
        originalError: error.message,
      };
    }
  }

  /**
   * Retorna estatísticas de uso do cliente HTTP
   *
   * @returns {Object} Estatísticas { totalRequests, successfulRequests, failedRequests, retriedRequests, rateLimitedRequests }
   *
   * @example
   * const stats = client.getStats();
   * console.log(`Total de requisições: ${stats.totalRequests}`);
   * console.log(`Taxa de sucesso: ${(stats.successfulRequests / stats.totalRequests * 100).toFixed(2)}%`);
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Reseta estatísticas do cliente HTTP
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      retriedRequests: 0,
      rateLimitedRequests: 0,
    };
    this.logger.debug('[HttpClient] Estatísticas resetadas');
  }
}

module.exports = HttpClient;
