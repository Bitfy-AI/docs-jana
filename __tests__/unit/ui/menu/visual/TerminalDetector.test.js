/**
 * TerminalDetector Unit Tests
 *
 * Tests for terminal capability detection including Unicode support,
 * emoji support, color levels, dimensions, and resize handling
 */

const TerminalDetector = require('../../../../../src/ui/menu/visual/TerminalDetector');

describe('TerminalDetector', () => {
  let detector;
  let originalEnv;
  let originalPlatform;

  beforeEach(() => {
    detector = new TerminalDetector();
    // Save original environment
    originalEnv = { ...process.env };
    originalPlatform = process.platform;
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      writable: true,
      configurable: true
    });
    detector = null;
  });

  describe('Core Functionality', () => {
    test('should detect and return TerminalCapabilities object', () => {
      const capabilities = detector.detect();

      expect(capabilities).toBeDefined();
      expect(typeof capabilities).toBe('object');
      expect(capabilities).toHaveProperty('supportsUnicode');
      expect(capabilities).toHaveProperty('supportsEmojis');
      expect(capabilities).toHaveProperty('colorLevel');
      expect(capabilities).toHaveProperty('width');
      expect(capabilities).toHaveProperty('height');
      expect(capabilities).toHaveProperty('platform');
      expect(capabilities).toHaveProperty('isCi');
      expect(capabilities).toHaveProperty('terminalType');
    });

    test('should return correct data types for all capabilities', () => {
      const capabilities = detector.detect();

      expect(typeof capabilities.supportsUnicode).toBe('boolean');
      expect(typeof capabilities.supportsEmojis).toBe('boolean');
      expect(typeof capabilities.colorLevel).toBe('number');
      expect(typeof capabilities.width).toBe('number');
      expect(typeof capabilities.height).toBe('number');
      expect(typeof capabilities.platform).toBe('string');
      expect(typeof capabilities.isCi).toBe('boolean');
      expect(typeof capabilities.terminalType).toBe('string');
    });

    test('should validate colorLevel is within valid range', () => {
      const capabilities = detector.detect();

      expect(capabilities.colorLevel).toBeGreaterThanOrEqual(0);
      expect(capabilities.colorLevel).toBeLessThanOrEqual(3);
    });
  });

  describe('Unicode Support Detection', () => {
    test('should return true for TERM=xterm-256color', () => {
      process.env.TERM = 'xterm-256color';

      const result = detector.supportsUnicode();

      expect(result).toBe(true);
    });

    test('should return false for TERM=dumb', () => {
      process.env.TERM = 'dumb';

      const result = detector.supportsUnicode();

      expect(result).toBe(false);
    });

    test('should return true for LANG=en_US.UTF-8', () => {
      delete process.env.TERM;
      process.env.LANG = 'en_US.UTF-8';

      const result = detector.supportsUnicode();

      expect(result).toBe(true);
    });

    test('should return false when NO_UNICODE=1', () => {
      process.env.NO_UNICODE = '1';
      process.env.TERM = 'xterm-256color';

      const result = detector.supportsUnicode();

      expect(result).toBe(false);
    });

    test('should return false when NO_UNICODE=true', () => {
      process.env.NO_UNICODE = 'true';
      process.env.TERM = 'xterm-256color';

      const result = detector.supportsUnicode();

      expect(result).toBe(false);
    });

    test('should return true for macOS platform by default', () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true,
        configurable: true
      });
      delete process.env.TERM;
      delete process.env.LANG;

      const result = detector.supportsUnicode();

      expect(result).toBe(true);
    });

    test('should return true for linux platform by default', () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        writable: true,
        configurable: true
      });
      delete process.env.TERM;
      delete process.env.LANG;

      const result = detector.supportsUnicode();

      expect(result).toBe(true);
    });

    test('should return true for Windows Terminal', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true,
        configurable: true
      });
      process.env.WT_SESSION = 'some-session-id';

      const result = detector.supportsUnicode();

      expect(result).toBe(true);
    });

    test('should return false for legacy Windows CMD', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true,
        configurable: true
      });
      delete process.env.WT_SESSION;
      delete process.env.TERM;
      delete process.env.TERM_PROGRAM;
      delete process.env.WSL_DISTRO_NAME;
      delete process.env.LANG;

      const result = detector.supportsUnicode();

      expect(result).toBe(false);
    });

    test('should return false in CI environment', () => {
      process.env.CI = 'true';
      process.env.TERM = 'xterm-256color';

      const result = detector.supportsUnicode();

      expect(result).toBe(false);
    });
  });

  describe('Emoji Support Detection', () => {
    test('should return true for macOS with Unicode support', () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true,
        configurable: true
      });
      process.env.TERM = 'xterm-256color';

      const result = detector.supportsEmojis();

      expect(result).toBe(true);
    });

    test('should return true for Windows Terminal', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true,
        configurable: true
      });
      process.env.WT_SESSION = 'some-session';
      process.env.TERM = 'xterm-256color';

      const result = detector.supportsEmojis();

      expect(result).toBe(true);
    });

    test('should return true for Linux gnome-terminal', () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        writable: true,
        configurable: true
      });
      process.env.TERM = 'xterm-256color';
      process.env.TERM_PROGRAM = 'gnome-terminal';

      const result = detector.supportsEmojis();

      expect(result).toBe(true);
    });

    test('should return false when NO_EMOJI=1', () => {
      process.env.NO_EMOJI = '1';
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true,
        configurable: true
      });

      const result = detector.supportsEmojis();

      expect(result).toBe(false);
    });

    test('should return false without Unicode support', () => {
      process.env.TERM = 'dumb';
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true,
        configurable: true
      });

      const result = detector.supportsEmojis();

      expect(result).toBe(false);
    });

    test('should return false in CI environment', () => {
      process.env.CI = 'true';
      process.env.TERM = 'xterm-256color';
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true,
        configurable: true
      });

      const result = detector.supportsEmojis();

      expect(result).toBe(false);
    });

    test('should return true for VSCode terminal on Windows', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true,
        configurable: true
      });
      process.env.TERM = 'xterm-256color';
      process.env.TERM_PROGRAM = 'vscode';

      const result = detector.supportsEmojis();

      expect(result).toBe(true);
    });
  });

  describe('Color Level Detection', () => {
    test('should return 0 when NO_COLOR is set', () => {
      process.env.NO_COLOR = '1';

      const result = detector.getColorLevel();

      expect(result).toBe(0);
    });

    test('should return 3 for TERM=xterm-truecolor', () => {
      delete process.env.NO_COLOR;
      process.env.TERM = 'xterm-truecolor';

      const result = detector.getColorLevel();

      expect(result).toBe(3);
    });

    test('should return 2 for TERM=xterm-256color', () => {
      delete process.env.NO_COLOR;
      process.env.TERM = 'xterm-256color';

      const result = detector.getColorLevel();

      expect(result).toBe(2);
    });

    test('should return 1 for TERM=xterm', () => {
      delete process.env.NO_COLOR;
      process.env.TERM = 'xterm';

      const result = detector.getColorLevel();

      expect(result).toBe(1);
    });

    test('should return 0 for TERM=dumb', () => {
      delete process.env.NO_COLOR;
      process.env.TERM = 'dumb';

      const result = detector.getColorLevel();

      expect(result).toBe(0);
    });

    test('should use chalk.level when initialized', () => {
      const mockChalk = { level: 2 };
      detector.initialize(mockChalk);

      const result = detector.getColorLevel();

      expect(result).toBe(2);
    });

    test('should return 3 for Windows Terminal', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true,
        configurable: true
      });
      delete process.env.TERM;
      process.env.WT_SESSION = 'some-session';

      const result = detector.getColorLevel();

      expect(result).toBe(3);
    });

    test('should return 1 for legacy Windows platforms', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true,
        configurable: true
      });
      delete process.env.TERM;
      delete process.env.WT_SESSION;

      const result = detector.getColorLevel();

      expect(result).toBe(1);
    });
  });

  describe('Dimensions Detection', () => {
    test('should return dimensions from getWindowSize', () => {
      const mockGetWindowSize = jest.fn(() => [120, 40]);
      process.stdout.getWindowSize = mockGetWindowSize;

      const dimensions = detector.getDimensions();

      expect(dimensions.width).toBe(120);
      expect(dimensions.height).toBe(40);
      expect(mockGetWindowSize).toHaveBeenCalled();
    });

    test('should fallback to process.stdout.columns and rows', () => {
      delete process.stdout.getWindowSize;
      process.stdout.columns = 100;
      process.stdout.rows = 30;

      const dimensions = detector.getDimensions();

      expect(dimensions.width).toBe(100);
      expect(dimensions.height).toBe(30);
    });

    test('should use default dimensions when unavailable', () => {
      delete process.stdout.getWindowSize;
      delete process.stdout.columns;
      delete process.stdout.rows;

      const dimensions = detector.getDimensions();

      expect(dimensions.width).toBe(80);
      expect(dimensions.height).toBe(24);
    });

    test('should use fallback when getWindowSize returns 0', () => {
      process.stdout.getWindowSize = jest.fn(() => [0, 0]);

      const dimensions = detector.getDimensions();

      expect(dimensions.width).toBe(80);
      expect(dimensions.height).toBe(24);
    });

    test('should handle getWindowSize errors gracefully', () => {
      process.stdout.getWindowSize = jest.fn(() => {
        throw new Error('Mock error');
      });

      const dimensions = detector.getDimensions();

      expect(dimensions.width).toBe(80);
      expect(dimensions.height).toBe(24);
    });
  });

  describe('Resize Handling', () => {
    let mockCallback;
    let cleanupFn;

    beforeEach(() => {
      mockCallback = jest.fn();
      // Mock getWindowSize
      process.stdout.getWindowSize = jest.fn(() => [120, 40]);
    });

    afterEach(() => {
      // Cleanup if cleanup function exists
      if (cleanupFn) {
        cleanupFn();
        cleanupFn = null;
      }
    });

    test('should register resize callback', () => {
      cleanupFn = detector.onResize(mockCallback);

      expect(detector.resizeCallbacks).toContain(mockCallback);
      expect(detector.resizeCallbacks.length).toBe(1);
    });

    test('should throw error if callback is not a function', () => {
      expect(() => {
        detector.onResize('not a function');
      }).toThrow(TypeError);
      expect(() => {
        detector.onResize('not a function');
      }).toThrow('onResize callback must be a function');
    });

    test('should call callback after resize event', (done) => {
      // Set initial width
      detector.lastWidth = 80;
      process.stdout.getWindowSize = jest.fn(() => [120, 40]);

      cleanupFn = detector.onResize((dimensions) => {
        try {
          expect(dimensions.width).toBe(120);
          expect(dimensions.height).toBe(40);
          done();
        } catch (error) {
          done(error);
        }
      });

      // Trigger resize
      process.stdout.emit('resize');
    }, 15000);

    test('should debounce resize events (200ms)', (done) => {
      detector.lastWidth = 80;
      let callCount = 0;

      cleanupFn = detector.onResize(() => {
        callCount++;
      });

      // Emit multiple resize events rapidly
      process.stdout.emit('resize');
      process.stdout.emit('resize');
      process.stdout.emit('resize');

      // Should only be called once after debounce period
      setTimeout(() => {
        expect(callCount).toBe(1);
        done();
      }, 250);
    });

    test('should only trigger callback when width changes', (done) => {
      const initialWidth = 120;
      detector.lastWidth = initialWidth;
      process.stdout.getWindowSize = jest.fn(() => [initialWidth, 50]);

      cleanupFn = detector.onResize(mockCallback);

      // Trigger resize with same width
      process.stdout.emit('resize');

      setTimeout(() => {
        expect(mockCallback).not.toHaveBeenCalled();
        done();
      }, 250);
    });

    test('should invalidate cache when width changes', (done) => {
      detector.lastWidth = 80;
      detector.cachedCapabilities = { some: 'cached data' };
      process.stdout.getWindowSize = jest.fn(() => [120, 40]);

      cleanupFn = detector.onResize(() => {
        expect(detector.cachedCapabilities).toBeNull();
        done();
      });

      process.stdout.emit('resize');
    });

    test('should handle callback errors gracefully', (done) => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      detector.lastWidth = 80;

      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });

      cleanupFn = detector.onResize(errorCallback);

      process.stdout.emit('resize');

      setTimeout(() => {
        expect(errorCallback).toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error in resize callback:',
          expect.any(Error)
        );
        consoleErrorSpy.mockRestore();
        done();
      }, 250);
    });

    test('should cleanup resize listener when all callbacks removed', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      const cleanup1 = detector.onResize(callback1);
      const cleanup2 = detector.onResize(callback2);

      expect(detector.resizeCallbacks.length).toBe(2);

      cleanup1();
      expect(detector.resizeCallbacks.length).toBe(1);

      cleanup2();
      expect(detector.resizeCallbacks.length).toBe(0);
      expect(detector._resizeHandler).toBeNull();
    });

    test('should return cleanup function that removes specific callback', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      const cleanup1 = detector.onResize(callback1);
      detector.onResize(callback2);

      expect(detector.resizeCallbacks.length).toBe(2);

      cleanup1();

      expect(detector.resizeCallbacks.length).toBe(1);
      expect(detector.resizeCallbacks).toContain(callback2);
      expect(detector.resizeCallbacks).not.toContain(callback1);
    });
  });

  describe('Cache Behavior', () => {
    test('should cache detect() result and return same object', () => {
      const cacheDetector = new TerminalDetector();
      const mockGetWindowSize = jest.fn(() => [120, 40]);
      process.stdout.getWindowSize = mockGetWindowSize;

      const result1 = cacheDetector.detect();
      const result2 = cacheDetector.detect();

      // Should return exact same cached object
      expect(result1).toBe(result2);
      expect(result1.width).toBe(120);
      expect(result2.width).toBe(120);
    });

    test('should invalidate cache when width changes', () => {
      const cacheDetector = new TerminalDetector();
      let width = 80;
      const mockGetWindowSize = jest.fn(() => [width, 40]);
      process.stdout.getWindowSize = mockGetWindowSize;

      const result1 = cacheDetector.detect();

      // Change width
      width = 120;

      const result2 = cacheDetector.detect();

      // Should be different objects (cache was invalidated)
      expect(result1).not.toBe(result2);
      expect(result1.width).toBe(80);
      expect(result2.width).toBe(120);
    });

    test('should re-detect after manual cache invalidation', () => {
      const cacheDetector = new TerminalDetector();
      const mockGetWindowSize = jest.fn(() => [120, 40]);
      process.stdout.getWindowSize = mockGetWindowSize;

      const result1 = cacheDetector.detect();

      cacheDetector.invalidateCache();

      const result2 = cacheDetector.detect();

      // Should be different objects (cache was cleared)
      expect(result1).not.toBe(result2);
      // But values should be the same
      expect(result1.width).toBe(result2.width);
      expect(result1.height).toBe(result2.height);
    });

    test('should use cached result for multiple calls with same width', () => {
      const cacheDetector = new TerminalDetector();
      const mockGetWindowSize = jest.fn(() => [120, 40]);
      process.stdout.getWindowSize = mockGetWindowSize;

      const result1 = cacheDetector.detect();
      const result2 = cacheDetector.detect();
      const result3 = cacheDetector.detect();

      // All should be the exact same cached object
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
      expect(result1).toBe(result3);
    });
  });

  describe('CI Environment Detection', () => {
    test('should detect CI=true', () => {
      process.env.CI = 'true';

      const capabilities = detector.detect();

      expect(capabilities.isCi).toBe(true);
    });

    test('should detect GITHUB_ACTIONS', () => {
      process.env.GITHUB_ACTIONS = 'true';

      const capabilities = detector.detect();

      expect(capabilities.isCi).toBe(true);
    });

    test('should detect TRAVIS', () => {
      process.env.TRAVIS = 'true';

      const capabilities = detector.detect();

      expect(capabilities.isCi).toBe(true);
    });

    test('should detect CIRCLECI', () => {
      process.env.CIRCLECI = 'true';

      const capabilities = detector.detect();

      expect(capabilities.isCi).toBe(true);
    });

    test('should return false when not in CI', () => {
      delete process.env.CI;
      delete process.env.GITHUB_ACTIONS;
      delete process.env.TRAVIS;
      delete process.env.CIRCLECI;

      const capabilities = detector.detect();

      expect(capabilities.isCi).toBe(false);
    });
  });

  describe('Platform Detection', () => {
    test('should detect macOS platform', () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true,
        configurable: true
      });

      const capabilities = detector.detect();

      expect(capabilities.platform).toBe('darwin');
    });

    test('should detect Windows platform', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true,
        configurable: true
      });

      const capabilities = detector.detect();

      expect(capabilities.platform).toBe('win32');
    });

    test('should detect Linux platform', () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        writable: true,
        configurable: true
      });

      const capabilities = detector.detect();

      expect(capabilities.platform).toBe('linux');
    });
  });

  describe('Terminal Type Detection', () => {
    test('should detect xterm-256color', () => {
      process.env.TERM = 'xterm-256color';

      const capabilities = detector.detect();

      expect(capabilities.terminalType).toBe('xterm-256color');
    });

    test('should detect screen terminal', () => {
      process.env.TERM = 'screen';

      const capabilities = detector.detect();

      expect(capabilities.terminalType).toBe('screen');
    });

    test('should return unknown when TERM is not set', () => {
      delete process.env.TERM;

      const capabilities = detector.detect();

      expect(capabilities.terminalType).toBe('unknown');
    });
  });

  describe('Initialize Method', () => {
    test('should initialize with chalk instance', () => {
      const mockChalk = { level: 3 };

      detector.initialize(mockChalk);

      expect(detector.chalk).toBe(mockChalk);
    });

    test('should use chalk level for color detection after initialization', () => {
      const mockChalk = { level: 3 };
      detector.initialize(mockChalk);

      const colorLevel = detector.getColorLevel();

      expect(colorLevel).toBe(3);
    });
  });
});
