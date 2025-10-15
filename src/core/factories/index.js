/**
 * Core Factories Module - Entry Point
 *
 * @module src/core/factories
 * @description Central export point for all factory-related components.
 * Provides access to FactoryRegistry and individual factory implementations.
 *
 * @example
 * // Import FactoryRegistry
 * const { FactoryRegistry } = require('./core/factories');
 * const registry = FactoryRegistry.getInstance();
 *
 * @example
 * // Import specific factories
 * const { HttpClientFactory, LoggerFactory } = require('./core/factories');
 * const httpClient = HttpClientFactory.create(config);
 */

const FactoryRegistry = require('./factory-registry');
const HttpClientFactory = require('./http-client-factory');
const LoggerFactory = require('./logger-factory');

module.exports = {
  FactoryRegistry,
  HttpClientFactory,
  LoggerFactory,
  // Additional factories will be added as implemented:
  // ConfigFactory,
  // ServiceFactory
};
