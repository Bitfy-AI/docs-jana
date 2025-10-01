/**
 * HTTP Client - Handles HTTP/HTTPS requests with retry logic and exponential backoff
 */

const https = require('https');
const http = require('http');

class HttpClient {
  constructor(baseUrl, defaultHeaders = {}, retryConfig = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.defaultHeaders = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...defaultHeaders,
    };

    // Configuração de retry com valores padrão
    this.retryConfig = {
      maxRetries: retryConfig.maxRetries ?? 3,
      baseDelay: retryConfig.baseDelay ?? 1000, // 1 segundo
      timeout: retryConfig.timeout ?? 30000, // 30 segundos
    };

    // Estatísticas de retry
    this.stats = {
      totalRequests: 0,
      retriedRequests: 0,
      failedRequests: 0,
    };
  }

  /**
   * Retorna as estatísticas de requisições
   * @returns {object} Estatísticas de retry
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Reseta as estatísticas
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      retriedRequests: 0,
      failedRequests: 0,
    };
  }

  /**
   * Calcula o delay com exponential backoff e jitter
   * @param {number} attempt - Número da tentativa atual
   * @returns {number} Delay em milissegundos
   */
  calculateBackoff(attempt) {
    // Exponential backoff: delay = baseDelay * 2^attempt
    const exponentialDelay = this.retryConfig.baseDelay * Math.pow(2, attempt);

    // Adiciona jitter aleatório (0-1000ms) para prevenir thundering herd
    const jitter = Math.random() * 1000;

    return exponentialDelay + jitter;
  }

  /**
   * Verifica se o erro é recuperável e deve ser retentado
   * @param {Error} error - Erro ocorrido
   * @param {number} statusCode - Código de status HTTP
   * @returns {boolean} True se deve retentar
   */
  shouldRetry(error, statusCode) {
    // Retry em rate limit (429)
    if (statusCode === 429) return true;

    // Retry em erros de servidor (5xx)
    if (statusCode >= 500 && statusCode < 600) return true;

    // Retry em erros de rede
    if (error && error.code && ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'].includes(error.code)) {
      return true;
    }

    return false;
  }

  /**
   * Aguarda um período de tempo
   * @param {number} ms - Milissegundos para aguardar
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Makes an HTTP request with retry logic and timeout
   * @param {string} endpoint - API endpoint
   * @param {object} options - Request options (method, headers, body)
   * @returns {Promise<any>} Response data
   */
  async request(endpoint, options = {}) {
    this.stats.totalRequests++;

    let lastError;
    let attempt = 0;

    // FIX: Changed <= to < to ensure maxRetries attempts (not maxRetries+1)
    while (attempt < this.retryConfig.maxRetries) {
      try {
        const result = await this.executeRequest(endpoint, options);
        return result;
      } catch (error) {
        lastError = error;
        const statusCode = this.extractStatusCode(error);

        // Se não deve retentar ou já esgotou as tentativas, lança erro
        if (!this.shouldRetry(error, statusCode) || attempt >= this.retryConfig.maxRetries - 1) {
          this.stats.failedRequests++;
          throw error;
        }

        // Incrementa contador de retry (always increment on retry)
        this.stats.retriedRequests++;

        // Calcula delay com backoff exponencial e jitter
        const delay = this.calculateBackoff(attempt);
        await this.sleep(delay);

        attempt++;
      }
    }

    this.stats.failedRequests++;
    throw lastError;
  }

  /**
   * Executa uma requisição HTTP com timeout
   * @param {string} endpoint - API endpoint
   * @param {object} options - Request options (method, headers, body)
   * @returns {Promise<any>} Response data
   */
  async executeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
    };

    return new Promise((resolve, reject) => {
      // FIX: Track timeout state to prevent race condition
      let timedOut = false;
      let requestCompleted = false;

      const timeoutId = setTimeout(() => {
        if (!requestCompleted) {
          timedOut = true;
          req.destroy();
          const timeoutError = new Error(`Request timeout after ${this.retryConfig.timeout}ms`);
          timeoutError.code = 'ETIMEDOUT';
          reject(timeoutError);
        }
      }, this.retryConfig.timeout);

      const req = protocol.request(requestOptions, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (timedOut || requestCompleted) return;
          requestCompleted = true;
          clearTimeout(timeoutId);

          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              // FIX: Handle empty responses
              if (data.trim().length === 0) {
                resolve(null);
              } else {
                resolve(JSON.parse(data));
              }
            } catch (e) {
              resolve(data);
            }
          } else {
            const error = new Error(`HTTP ${res.statusCode}: ${data}`);
            error.statusCode = res.statusCode;
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

      if (options.body) {
        req.write(JSON.stringify(options.body));
      }

      req.end();
    });
  }

  /**
   * Extrai o código de status HTTP de um erro
   * @param {Error} error - Erro ocorrido
   * @returns {number|null} Código de status ou null
   */
  extractStatusCode(error) {
    if (error.statusCode) {
      return error.statusCode;
    }

    const match = error.message && error.message.match(/HTTP (\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * GET request
   */
  async get(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'GET', headers });
  }

  /**
   * POST request
   */
  async post(endpoint, body, headers = {}) {
    return this.request(endpoint, { method: 'POST', body, headers });
  }

  /**
   * PUT request
   */
  async put(endpoint, body, headers = {}) {
    return this.request(endpoint, { method: 'PUT', body, headers });
  }

  /**
   * PATCH request
   */
  async patch(endpoint, body, headers = {}) {
    return this.request(endpoint, { method: 'PATCH', body, headers });
  }

  /**
   * DELETE request
   */
  async delete(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'DELETE', headers });
  }

  /**
   * Update default headers (useful for authentication)
   */
  setHeaders(headers) {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers };
  }
}

module.exports = HttpClient;