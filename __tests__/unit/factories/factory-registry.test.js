/**
 * Unit tests for FactoryRegistry
 */

const FactoryRegistry = require('../../../src/core/factories/factory-registry');

describe('FactoryRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = FactoryRegistry.getInstance();
    registry.clear(); // Reset for each test
  });

  describe('Singleton Pattern', () => {
    test('getInstance returns same instance', () => {
      const instance1 = FactoryRegistry.getInstance();
      const instance2 = FactoryRegistry.getInstance();
      expect(instance1).toBe(instance2);
    });

    test('new FactoryRegistry returns singleton', () => {
      const instance1 = FactoryRegistry.getInstance();
      const instance2 = new FactoryRegistry();
      expect(instance1).toBe(instance2);
    });
  });

  describe('register', () => {
    test('registers factory successfully', () => {
      const mockFactory = { create: jest.fn() };
      registry.register('test', mockFactory);
      expect(registry.has('test')).toBe(true);
    });

    test('throws error if factory missing create method', () => {
      const invalidFactory = {};
      expect(() => registry.register('test', invalidFactory))
        .toThrow('must have a create() method');
    });

    test('throws error if name is empty', () => {
      const mockFactory = { create: jest.fn() };
      expect(() => registry.register('', mockFactory))
        .toThrow('non-empty string');
    });

    test('warns when overwriting existing factory', () => {
      const spy = jest.spyOn(console, 'warn').mockImplementation();
      const mockFactory = { create: jest.fn() };

      registry.register('test', mockFactory);
      registry.register('test', mockFactory);

      expect(spy).toHaveBeenCalledWith(expect.stringContaining('Overwriting'));
      spy.mockRestore();
    });
  });

  describe('get', () => {
    test('returns registered factory', () => {
      const mockFactory = { create: jest.fn() };
      registry.register('test', mockFactory);
      expect(registry.get('test')).toBe(mockFactory);
    });

    test('throws error for non-existent factory', () => {
      expect(() => registry.get('nonexistent'))
        .toThrow('not found');
    });
  });

  describe('has', () => {
    test('returns true for existing factory', () => {
      const mockFactory = { create: jest.fn() };
      registry.register('test', mockFactory);
      expect(registry.has('test')).toBe(true);
    });

    test('returns false for non-existent factory', () => {
      expect(registry.has('nonexistent')).toBe(false);
    });
  });

  describe('unregister', () => {
    test('removes factory successfully', () => {
      const mockFactory = { create: jest.fn() };
      registry.register('test', mockFactory);

      const result = registry.unregister('test');
      expect(result).toBe(true);
      expect(registry.has('test')).toBe(false);
    });

    test('returns false for non-existent factory', () => {
      const result = registry.unregister('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('list', () => {
    test('returns empty array initially', () => {
      expect(registry.list()).toEqual([]);
    });

    test('returns all registered factory names', () => {
      const factory1 = { create: jest.fn() };
      const factory2 = { create: jest.fn() };

      registry.register('test1', factory1);
      registry.register('test2', factory2);

      const names = registry.list();
      expect(names).toContain('test1');
      expect(names).toContain('test2');
      expect(names.length).toBe(2);
    });
  });

  describe('size', () => {
    test('returns 0 initially', () => {
      expect(registry.size).toBe(0);
    });

    test('returns correct count after registrations', () => {
      const mockFactory = { create: jest.fn() };

      registry.register('test1', mockFactory);
      expect(registry.size).toBe(1);

      registry.register('test2', mockFactory);
      expect(registry.size).toBe(2);
    });
  });

  describe('clear', () => {
    test('removes all factories', () => {
      const mockFactory = { create: jest.fn() };

      registry.register('test1', mockFactory);
      registry.register('test2', mockFactory);

      registry.clear();
      expect(registry.size).toBe(0);
      expect(registry.list()).toEqual([]);
    });
  });
});
