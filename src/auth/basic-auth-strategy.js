/**
 * Basic Authentication Strategy (Username/Password)
 */

const AuthStrategy = require('./auth-strategy');

class BasicAuthStrategy extends AuthStrategy {
  constructor(username, password) {
    super();
    this.username = username;
    this.password = password;
  }

  getHeaders() {
    const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');
    return {
      'Authorization': `Basic ${auth}`,
    };
  }

  validate() {
    return Boolean(
      this.username &&
      this.password &&
      this.username.trim().length > 0 &&
      this.password.trim().length > 0
    );
  }

  getName() {
    return 'Basic Auth';
  }
}

module.exports = BasicAuthStrategy;