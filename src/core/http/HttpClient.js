/**
 * HttpClient - Unified HTTP client with retry logic, timeout, and rate limiting
 *
 * @module src/core/http/HttpClient
 * @description Robust HTTP client for all API operations in the docs-jana CLI.
 * Features:
 * - Exponential backoff retry logic
 * - Configurable timeout
 * - Rate limiting
 * - Request/response interceptors
 * - Automatic error handling
 * - Secure logging (API keys masked)
 * - Request cancellation support
 * - Statistics tracking
 *
 * @example
 * const client = HttpClient.create({
 *   baseUrl: 'https://api.example.com',
 *   headers: { 'X-API-Key': 'your-key' },
 *   logger: loggerInstance
 * });
 *
 * const data = await client.get('/api/v1/resources');
 * const created = await client.post('/api/v1/resources', { name: 'Test' });
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

/**
 * @typedef {Object} HttpClientConfig
 * @property {string} baseUrl - Base URL for all requests (e.g., https://api.example.com)
 * @property {Object} [headers={}] - Default headers for all requests
 * @property {Object} [logger] - Logger instance (optional, uses no-op if not provided)
 * @property {number} [maxRetries=3] - Maximum number of retry attempts
 * @property {number} [timeout=10000] - Request timeout in milliseconds (default 10s)
 * @property {number} [maxRequestsPerSecond=10] - Rate limit (requests per second)
 * @property {Function} [requestInterceptor] - Function to modify request before sending
 * @property {Function} [responseInterceptor] - Function to process response before returning
 */

/**
 * @typedef {Object} RequestOptions
 * @property {string} [method='GET'] - HTTP method
 * @property {Object} [headers={}] - Additional headers (merged with default headers)
 * @property {Object} [body] - Request body (will be JSON serialized)
 * @property {number} [timeout] - Override default timeout for this request
 * @property {AbortSignal} [signal] - AbortSignal for request cancellation
 */

class HttpClient {
  /**
   * Create a new HttpClient instance
   *
   * @param {HttpClientConfig} config - Client configuration
   * @throws {Error} If baseUrl is not provided
   */
  constructor(config) {
    if (!config.baseUrl) {
      throw new Error('HttpClient: baseUrl is required');
    }

    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.defaultHeaders = config.headers || {};
    this.logger = config.logger || this._createNoOpLogger();

    // Retry configuration
    this.maxRetries = config.maxRetries ?? 3;
    this.timeout = config.timeout ?? 10000; // 10 seconds

    // Rate limiting
    this.maxRequestsPerSecond = config.maxRequestsPerSecond ?? 10;
    this.requestTimestamps = [];

    // Interceptors
    this.requestInterceptor = config.requestInterceptor || null;
    this.responseInterceptor = config.responseInterceptor || null;

    // Statistics
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      retriedRequests: 0,
      rateLimitedRequests: 0,
      cancelledRequests: 0,
    };
  }

  /**
   * Factory method to create HttpClient instances
   *
   * @param {HttpClientConfig} config - Client configuration
   * @returns {HttpClient} New HttpClient instance
   *
   * @example
   * const client = HttpClient.create({
   *   baseUrl: 'https://api.example.com',
   *   headers: { 'Authorization': 'Bearer token' }
   * });
   */
  static create(config) {
    return new HttpClient(config);
  }

  /**
   * Create a no-op logger when none is provided
   * @private
   * @returns {Object} Logger that does nothing
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
   * Mask sensitive information in strings for safe logging
   * Shows only last 3 characters
   *
   * @private
   * @param {string} value - Value to mask
   * @returns {string} Masked value (e.g., "***abc")
   */
  _maskSensitiveValue(value) {
    if (!value || value.length <= 3) {
      return '***';
    }
    return '*'.repeat(value.length - 3) + value.slice(-3);
  }

  /**
   * Implement rate limiting: wait if necessary to not exceed maxRequestsPerSecond
   *
   * @private
   * @returns {Promise<void>}
   */
  async _rateLimitCheck() {
    const now = Date.now();
    const oneSecondAgo = now - 1000;

    // Remove old timestamps (older than 1 second)
    this.requestTimestamps = this.requestTimestamps.filter(ts => ts > oneSecondAgo);

    // If rate limit reached, wait
    if (this.requestTimestamps.length >= this.maxRequestsPerSecond) {
      const oldestTimestamp = this.requestTimestamps[0];
      const waitTime = 1000 - (now - oldestTimestamp);

      if (waitTime > 0) {
        this.stats.rateLimitedRequests++;
        this.logger.debug(`[HttpClient] Rate limit reached. Waiting ${waitTime}ms before proceeding.`);
        await this._sleep(waitTime);
      }
    }

    // Register current request timestamp
    this.requestTimestamps.push(Date.now());
  }

  /**
   * Sleep for a period of time
   *
   * @private
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Calculate delay with exponential backoff
   *
   * @private
   * @param {number} attempt - Attempt number (0-indexed)
   * @returns {number} Delay in milliseconds
   */
  _calculateBackoff(attempt) {
    // Exponential backoff: 1s, 2s, 4s, 8s...
    const baseDelay = 1000; // 1 second
    return baseDelay * Math.pow(2, attempt);
  }

  /**
   * Check if error is recoverable and should be retried
   *
   * @private
   * @param {Error} error - Error that occurred
   * @param {number} statusCode - HTTP status code
   * @returns {boolean} True if should retry
   */
  _shouldRetry(error, statusCode) {
    // Retry on rate limit (429)
    if (statusCode === 429) return true;

    // Retry on server errors (5xx)
    if (statusCode >= 500 && statusCode < 600) return true;

    // Retry on network errors
    if (error && error.code) {
      const retryableCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'];
      if (retryableCodes.includes(error.code)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Execute HTTP request with timeout and cancellation support
   *
   * @private
   * @param {string} endpoint - API endpoint (e.g., /api/v1/resources)
   * @param {RequestOptions} options - Request options
   * @returns {Promise<any>} API response
   * @throws {Error} If request fails
   */
  async _executeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    // Merge headers
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...this.defaultHeaders,
      ...options.headers,
    };

    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers,
    };

    // Apply request interceptor if configured
    if (this.requestInterceptor) {
      try {
        await this.requestInterceptor(requestOptions);
      } catch (error) {
        this.logger.error(`[HttpClient] Request interceptor failed: ${error.message}`);
        throw error;
      }
    }

    return new Promise((resolve, reject) => {
      let timedOut = false;
      let requestCompleted = false;
      let cancelled = false;

      // Setup timeout
      const requestTimeout = options.timeout || this.timeout;
      const timeoutId = setTimeout(() => {
        if (!requestCompleted) {
          timedOut = true;
          req.destroy();
          const timeoutError = new Error(`Request timeout after ${requestTimeout}ms`);
          timeoutError.code = 'ETIMEDOUT';
          reject(timeoutError);
        }
      }, requestTimeout);

      // Setup cancellation
      if (options.signal) {
        options.signal.addEventListener('abort', () => {
          if (!requestCompleted) {
            cancelled = true;
            this.stats.cancelledRequests++;
            req.destroy();
            clearTimeout(timeoutId);
            reject(new Error('Request cancelled'));
          }
        });
      }

      const req = protocol.request(requestOptions, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', async () => {
          if (timedOut || requestCompleted || cancelled) return;
          requestCompleted = true;
          clearTimeout(timeoutId);

          // Success (2xx)
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              let responseData;

              if (data.trim().length === 0) {
                responseData = null;
              } else {
                try {
                  responseData = JSON.parse(data);
                } catch (e) {
                  // If not valid JSON, return as string
                  responseData = data;
                }
              }

              // Apply response interceptor if configured
              if (this.responseInterceptor) {
                try {
                  responseData = await this.responseInterceptor(responseData, res);
                } catch (error) {
                  this.logger.error(`[HttpClient] Response interceptor failed: ${error.message}`);
                  reject(error);
                  return;
                }
              }

              resolve(responseData);
            } catch (e) {
              reject(e);
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
        if (timedOut || requestCompleted || cancelled) return;
        requestCompleted = true;
        clearTimeout(timeoutId);
        reject(error);
      });

      // Write body if provided
      if (options.body) {
        req.write(JSON.stringify(options.body));
      }

      req.end();
    });
  }

  /**
   * Execute request with retry logic
   *
   * @private
   * @param {string} endpoint - API endpoint
   * @param {RequestOptions} options - Request options
   * @returns {Promise<any>} API response
   * @throws {Error} If all retry attempts fail
   */
  async _requestWithRetry(endpoint, options = {}) {
    this.stats.totalRequests++;

    let lastError;
    let attempt = 0;

    while (attempt < this.maxRetries) {
      try {
        // Rate limiting check before each attempt
        await this._rateLimitCheck();

        // Log request
        this.logger.debug(`[HttpClient] ${options.method || 'GET'} ${endpoint} (Attempt: ${attempt + 1}/${this.maxRetries})`);

        const result = await this._executeRequest(endpoint, options);

        this.stats.successfulRequests++;
        return result;

      } catch (error) {
        lastError = error;
        const statusCode = error.statusCode || null;

        // Don't retry if request was cancelled
        if (error.message === 'Request cancelled') {
          throw error;
        }

        // Log error
        this.logger.warn(`[HttpClient] Request error: ${error.message} (Status: ${statusCode || 'N/A'})`);

        // If should not retry or exhausted attempts
        if (!this._shouldRetry(error, statusCode) || attempt >= this.maxRetries - 1) {
          this.stats.failedRequests++;
          this.logger.error(`[HttpClient] Request failed after ${attempt + 1} attempt(s): ${error.message}`);
          throw error;
        }

        // Increment retry counter
        this.stats.retriedRequests++;

        // Calculate delay with exponential backoff
        const delay = this._calculateBackoff(attempt);
        this.logger.info(`[HttpClient] Retrying in ${delay}ms... (Attempt ${attempt + 2}/${this.maxRetries})`);
        await this._sleep(delay);

        attempt++;
      }
    }

    // If we reach here, all attempts failed
    this.stats.failedRequests++;
    throw lastError;
  }

  /**
   * Perform GET request
   *
   * @param {string} endpoint - API endpoint
   * @param {Object} [options={}] - Additional request options
   * @returns {Promise<any>} API response
   *
   * @example
   * const data = await client.get('/api/v1/resources');
   * const filtered = await client.get('/api/v1/resources?filter=active');
   */
  async get(endpoint, options = {}) {
    return this._requestWithRetry(endpoint, {
      ...options,
      method: 'GET',
    });
  }

  /**
   * Perform POST request
   *
   * @param {string} endpoint - API endpoint
   * @param {Object} body - Request body
   * @param {Object} [options={}] - Additional request options
   * @returns {Promise<any>} API response
   *
   * @example
   * const created = await client.post('/api/v1/resources', {
   *   name: 'New Resource',
   *   active: true
   * });
   */
  async post(endpoint, body, options = {}) {
    return this._requestWithRetry(endpoint, {
      ...options,
      method: 'POST',
      body,
    });
  }

  /**
   * Perform PUT request
   *
   * @param {string} endpoint - API endpoint
   * @param {Object} body - Request body
   * @param {Object} [options={}] - Additional request options
   * @returns {Promise<any>} API response
   *
   * @example
   * const updated = await client.put('/api/v1/resources/123', {
   *   name: 'Updated Name'
   * });
   */
  async put(endpoint, body, options = {}) {
    return this._requestWithRetry(endpoint, {
      ...options,
      method: 'PUT',
      body,
    });
  }

  /**
   * Perform PATCH request
   *
   * @param {string} endpoint - API endpoint
   * @param {Object} body - Request body
   * @param {Object} [options={}] - Additional request options
   * @returns {Promise<any>} API response
   *
   * @example
   * const patched = await client.patch('/api/v1/resources/123', {
   *   active: false
   * });
   */
  async patch(endpoint, body, options = {}) {
    return this._requestWithRetry(endpoint, {
      ...options,
      method: 'PATCH',
      body,
    });
  }

  /**
   * Perform DELETE request
   *
   * @param {string} endpoint - API endpoint
   * @param {Object} [options={}] - Additional request options
   * @returns {Promise<any>} API response
   *
   * @example
   * await client.delete('/api/v1/resources/123');
   */
  async delete(endpoint, options = {}) {
    return this._requestWithRetry(endpoint, {
      ...options,
      method: 'DELETE',
    });
  }

  /**
   * Test connectivity with the configured base URL
   *
   * @param {string} [testEndpoint='/'] - Endpoint to test (defaults to root)
   * @returns {Promise<Object>} Test result { success: boolean, message?: string, error?: string, suggestion?: string }
   *
   * @example
   * const result = await client.testConnection();
   * if (result.success) {
   *   console.log('Connection successful!');
   * } else {
   *   console.error(`Connection failed: ${result.error}`);
   *   console.log(`Suggestion: ${result.suggestion}`);
   * }
   */
  async testConnection(testEndpoint = '/') {
    this.logger.info('[HttpClient] Testing connectivity...');

    try {
      await this.get(testEndpoint);

      this.logger.info('[HttpClient] Connectivity OK');
      return {
        success: true,
        message: 'Connection successful',
      };
    } catch (error) {
      let errorMessage = error.message;
      let suggestion = '';

      // Provide specific suggestions based on error type
      if (error.statusCode === 401 || error.statusCode === 403) {
        errorMessage = 'Authentication failed';
        suggestion = 'Check if your API credentials are correct';
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Could not connect to server';
        suggestion = 'Check if the URL is correct and the server is running';
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = 'Connection timeout';
        suggestion = 'Check network connectivity and firewall settings';
      } else if (error.code === 'ENOTFOUND') {
        errorMessage = 'Server not found';
        suggestion = 'Check if the URL is correct';
      }

      this.logger.error(`[HttpClient] Connectivity failed: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        suggestion: suggestion,
        originalError: error.message,
      };
    }
  }

  /**
   * Get usage statistics
   *
   * @returns {Object} Statistics { totalRequests, successfulRequests, failedRequests, retriedRequests, rateLimitedRequests, cancelledRequests }
   *
   * @example
   * const stats = client.getStats();
   * console.log(`Total requests: ${stats.totalRequests}`);
   * console.log(`Success rate: ${(stats.successfulRequests / stats.totalRequests * 100).toFixed(2)}%`);
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      retriedRequests: 0,
      rateLimitedRequests: 0,
      cancelledRequests: 0,
    };
    this.logger.debug('[HttpClient] Statistics reset');
  }

  /**
   * Set request interceptor
   *
   * @param {Function} interceptor - Function to modify request options before sending
   *
   * @example
   * client.setRequestInterceptor(async (requestOptions) => {
   *   requestOptions.headers['X-Request-ID'] = generateUUID();
   * });
   */
  setRequestInterceptor(interceptor) {
    this.requestInterceptor = interceptor;
  }

  /**
   * Set response interceptor
   *
   * @param {Function} interceptor - Function to process response before returning
   *
   * @example
   * client.setResponseInterceptor(async (data, response) => {
   *   return data.data || data; // Unwrap nested data
   * });
   */
  setResponseInterceptor(interceptor) {
    this.responseInterceptor = interceptor;
  }
}

module.exports = HttpClient;
