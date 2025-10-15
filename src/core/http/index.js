/**
 * HTTP Client Module - Entry point
 *
 * Exports unified HTTP clients for use across the docs-jana CLI.
 *
 * @module src/core/http
 *
 * @example
 * // Use generic HttpClient
 * const { HttpClient } = require('./core/http');
 * const client = HttpClient.create({
 *   baseUrl: 'https://api.example.com',
 *   headers: { 'Authorization': 'Bearer token' }
 * });
 *
 * @example
 * // Use N8N-specific client
 * const { N8NHttpClient } = require('./core/http');
 * const n8nClient = N8NHttpClient.create({
 *   baseUrl: 'https://n8n.example.com',
 *   apiKey: 'your-api-key'
 * });
 */

const HttpClient = require('./HttpClient');
const N8NHttpClient = require('./N8NHttpClient');

module.exports = {
  HttpClient,
  N8NHttpClient,
};
