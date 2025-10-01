/**
 * Token Bearer Authentication Strategy
 */

const AuthStrategy = require('./auth-strategy');

class TokenStrategy extends AuthStrategy {
  constructor(token) {
    super();
    this.token = token;
  }

  getHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
    };
  }

  validate() {
    return Boolean(this.token && this.token.trim().length > 0);
  }

  getName() {
    return 'TokenStrategy';
  }
}

module.exports = TokenStrategy;
