/**
 * API Key Authentication Strategy
 */

const AuthStrategy = require('./auth-strategy');

class ApiKeyStrategy extends AuthStrategy {
  constructor(apiKey) {
    super();
    this.apiKey = apiKey;
  }

  getHeaders() {
    return {
      'X-N8N-API-KEY': this.apiKey,
    };
  }

  validate() {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  getName() {
    return 'API Key';
  }
}

module.exports = ApiKeyStrategy;