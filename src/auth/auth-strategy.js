/**
 * Authentication Strategy Interface
 * Base class for different authentication methods
 */

class AuthStrategy {
  /**
   * Get authentication headers
   * @returns {object} Headers object
   */
  getHeaders() {
    throw new Error('getHeaders() must be implemented by subclass');
  }

  /**
   * Validate credentials
   * @returns {boolean} True if credentials are valid
   */
  validate() {
    throw new Error('validate() must be implemented by subclass');
  }

  /**
   * Get strategy name
   * @returns {string} Strategy name
   */
  getName() {
    return this.constructor.name;
  }
}

module.exports = AuthStrategy;