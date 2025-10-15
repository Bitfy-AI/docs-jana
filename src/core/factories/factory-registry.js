/**
 * FactoryRegistry - Central registry for all factories
 * Implements Singleton + Registry patterns
 *
 * @class FactoryRegistry
 * @description Manages registration and retrieval of factory instances.
 * All factories must implement a create(config) method.
 *
 * @example
 * const registry = FactoryRegistry.getInstance();
 * registry.register('http', HttpClientFactory);
 * const factory = registry.get('http');
 * const client = factory.create(config);
 */
class FactoryRegistry {
  /**
   * Private constructor (Singleton pattern)
   * @private
   */
  constructor() {
    if (FactoryRegistry.instance) {
      return FactoryRegistry.instance;
    }

    /**
     * Map of registered factories
     * @type {Map<string, Object>}
     * @private
     */
    this.factories = new Map();

    FactoryRegistry.instance = this;
  }

  /**
   * Get singleton instance
   * @returns {FactoryRegistry} The singleton instance
   * @static
   */
  static getInstance() {
    if (!FactoryRegistry.instance) {
      FactoryRegistry.instance = new FactoryRegistry();
    }
    return FactoryRegistry.instance;
  }

  /**
   * Register a factory
   * @param {string} name - Factory name (unique identifier)
   * @param {Object} factoryClass - Factory class with create() method
   * @throws {Error} If factory doesn't implement create() method
   * @throws {TypeError} If name is not a string or is empty
   * @example
   * registry.register('http', HttpClientFactory);
   */
  register(name, factoryClass) {
    // Validate name
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new TypeError('Factory name must be a non-empty string');
    }

    // Validate factory interface
    if (!factoryClass || typeof factoryClass.create !== 'function') {
      throw new Error(`Factory "${name}" must have a create() method`);
    }

    // Warn if overwriting existing factory
    if (this.has(name)) {
      console.warn(`[FactoryRegistry] Overwriting existing factory: ${name}`);
    }

    this.factories.set(name, factoryClass);
  }

  /**
   * Get registered factory
   * @param {string} name - Factory name
   * @returns {Object} Factory class
   * @throws {Error} If factory not found
   * @example
   * const httpFactory = registry.get('http');
   */
  get(name) {
    if (!this.has(name)) {
      throw new Error(`Factory "${name}" not found. Available: ${this.list().join(', ') || 'none'}`);
    }
    return this.factories.get(name);
  }

  /**
   * Check if factory exists
   * @param {string} name - Factory name
   * @returns {boolean} True if factory is registered
   * @example
   * if (registry.has('http')) {
   *   // Use http factory
   * }
   */
  has(name) {
    return this.factories.has(name);
  }

  /**
   * Unregister factory
   * @param {string} name - Factory name
   * @returns {boolean} True if factory was removed, false if not found
   * @example
   * registry.unregister('http');
   */
  unregister(name) {
    return this.factories.delete(name);
  }

  /**
   * Get all registered factory names
   * @returns {Array<string>} Array of factory names
   * @example
   * const factories = registry.list();
   * console.log('Available factories:', factories);
   */
  list() {
    return Array.from(this.factories.keys());
  }

  /**
   * Clear all registered factories
   * @private
   * @description Used for testing purposes only
   */
  clear() {
    this.factories.clear();
  }

  /**
   * Get number of registered factories
   * @returns {number} Count of registered factories
   */
  get size() {
    return this.factories.size;
  }
}

// Singleton instance holder
FactoryRegistry.instance = null;

module.exports = FactoryRegistry;
