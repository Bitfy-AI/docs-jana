/**
 * Authentication Factory - Factory Pattern
 * Creates appropriate authentication strategy based on credentials
 */

const ApiKeyStrategy = require('./api-key-strategy');
const BasicAuthStrategy = require('./basic-auth-strategy');

class AuthFactory {
  /**
   * Create authentication strategy based on available credentials
   * @param {object} credentials - Credentials object
   * @returns {AuthStrategy} Authentication strategy instance
   */
  static create(credentials) {
    const { apiKey, username, password } = credentials;

    // Priority: API Key > Basic Auth
    if (apiKey) {
      const strategy = new ApiKeyStrategy(apiKey);
      if (strategy.validate()) {
        return strategy;
      }
    }

    if (username && password) {
      const strategy = new BasicAuthStrategy(username, password);
      if (strategy.validate()) {
        return strategy;
      }
    }

    throw new Error(
      'Credenciais inválidas. Forneça N8N_API_KEY ou N8N_USERNAME + N8N_PASSWORD'
    );
  }

  /**
   * Validate if credentials are sufficient
   * @param {object} credentials - Credentials object
   * @returns {boolean} True if credentials are valid
   */
  static validate(credentials) {
    try {
      this.create(credentials);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = AuthFactory;