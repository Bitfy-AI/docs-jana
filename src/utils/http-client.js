/**
 * HTTP Client - Handles HTTP/HTTPS requests
 */

const https = require('https');
const http = require('http');

class HttpClient {
  constructor(baseUrl, defaultHeaders = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.defaultHeaders = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...defaultHeaders,
    };
  }

  /**
   * Makes an HTTP request
   * @param {string} endpoint - API endpoint
   * @param {object} options - Request options (method, headers, body)
   * @returns {Promise<any>} Response data
   */
  async request(endpoint, options = {}) {
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
      const req = protocol.request(requestOptions, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              resolve(data);
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', reject);

      if (options.body) {
        req.write(JSON.stringify(options.body));
      }

      req.end();
    });
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