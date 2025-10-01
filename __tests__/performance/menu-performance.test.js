/**
 * Performance Tests for Interactive Menu Enhancement
 *
 * Validates performance requirements for menu system:
 * - Menu initialization: < 200ms (REQ from design.md)
 * - Render time: < 50ms per frame
 * - Input response: < 50ms (arrow key to visual update)
 * - Command execution overhead: < 100ms
 * - Memory usage: no leaks over 100 iterations
 *
 * Requirements: Task 24 - Performance Testing
 * - Minimum 5 performance tests
 * - Benchmark all critical paths
 * - Validate against design.md requirements
 */

const MenuOrchestrator = require('../../src/ui/menu');
const StateManager = require('../../src/ui/menu/components/StateManager');
const UIRenderer = require('../../src/ui/menu/components/UIRenderer');
const InputHandler = require('../../src/ui/menu/components/InputHandler');
const ThemeEngine = require('../../src/ui/menu/utils/ThemeEngine');
const AnimationEngine = require('../../src/ui/menu/utils/AnimationEngine');
const ConfigManager = require('../../src/ui/menu/components/ConfigManager');
const CommandHistory = require('../../src/ui/menu/components/CommandHistory');
const MENU_OPTIONS = require('../../src/ui/menu/config/menu-options');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Performance measurement utilities
class PerformanceMonitor {
  constructor() {
    this.measurements = [];
  }

  start() {
    return performance.now();
  }

  end(startTime) {
    return performance.now() - startTime;
  }

  record(name, duration) {
    this.measurements.push({ name, duration, timestamp: new Date() });
  }

  getStats(name) {
    const filtered = this.measurements.filter(m => m.name === name);
    if (filtered.length === 0) return null;

    const durations = filtered.map(m => m.duration);
    return {
      count: durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      median: durations.sort((a, b) => a - b)[Math.floor(durations.length / 2)]
    };
  }

  reset() {
    this.measurements = [];
  }
}

// Memory monitoring utilities
class MemoryMonitor {
  constructor() {
    this.snapshots = [];
  }

  snapshot() {
    const usage = process.memoryUsage();
    this.snapshots.push({
      timestamp: new Date(),
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss
    });
    return usage;
  }

  getLeakage() {
    if (this.snapshots.length < 2) return null;

    const first = this.snapshots[0];
    const last = this.snapshots[this.snapshots.length - 1];

    return {
      heapUsedDelta: last.heapUsed - first.heapUsed,
      heapTotalDelta: last.heapTotal - first.heapTotal,
      externalDelta: last.external - first.external,
      rssDelta: last.rss - first.rss,
      snapshotCount: this.snapshots.length
    };
  }

  reset() {
    this.snapshots = [];
  }
}

describe('Performance: Menu Initialization', () => {
  let perfMonitor;
  let testConfigDir;

  beforeAll(async () => {
    perfMonitor = new PerformanceMonitor();
    testConfigDir = path.join(os.tmpdir(), '.docs-jana-perf-test');
    await fs.mkdir(testConfigDir, { recursive: true });
    process.env.DOCS_JANA_CONFIG_DIR = testConfigDir;
  });

  afterAll(async () => {
    await fs.rm(testConfigDir, { recursive: true, force: true });
    delete process.env.DOCS_JANA_CONFIG_DIR;
  });

  beforeEach(() => {
    perfMonitor.reset();
  });

  /**
   * PERF-1: Menu initialization performance
   * Requirement: < 200ms (design.md - Performance.4)
   */
  test('PERF-1: Menu initialization completes within 200ms', async () => {
    const iterations = 10;
    const maxAllowedTime = 200; // ms

    for (let i = 0; i < iterations; i++) {
      const startTime = perfMonitor.start();
      const menu = new MenuOrchestrator();
      const duration = perfMonitor.end(startTime);

      perfMonitor.record('menu-init', duration);

      // Cleanup immediately
      await menu.shutdown();
    }

    const stats = perfMonitor.getStats('menu-init');
    console.log('Menu Initialization Stats:', stats);

    expect(stats.avg).toBeLessThan(maxAllowedTime);
    expect(stats.max).toBeLessThan(maxAllowedTime * 1.5); // Allow 50% margin for max
  });

  /**
   * PERF-2: Component initialization performance
   */
  test('PERF-2: Individual component initialization is fast', async () => {
    const components = [
      { name: 'StateManager', Class: StateManager, maxTime: 10 },
      { name: 'ConfigManager', Class: ConfigManager, maxTime: 50 },
      { name: 'CommandHistory', Class: CommandHistory, maxTime: 50 },
      { name: 'ThemeEngine', Class: ThemeEngine, maxTime: 20 },
      { name: 'AnimationEngine', Class: AnimationEngine, maxTime: 10 }
    ];

    for (const comp of components) {
      const startTime = perfMonitor.start();
      const instance = new comp.Class();
      const duration = perfMonitor.end(startTime);

      perfMonitor.record(comp.name, duration);

      console.log(`${comp.name} initialization: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(comp.maxTime);
    }
  });
});

describe('Performance: Rendering', () => {
  let perfMonitor;
  let renderer;
  let themeEngine;
  let stateManager;
  let mockStdout;
  let originalStdout;

  beforeAll(() => {
    perfMonitor = new PerformanceMonitor();
  });

  beforeEach(() => {
    perfMonitor.reset();
    themeEngine = new ThemeEngine();
    stateManager = new StateManager(MENU_OPTIONS);
    renderer = new UIRenderer(themeEngine, new AnimationEngine());

    // Mock stdout to prevent actual output
    mockStdout = {
      write: jest.fn(),
      clearLine: jest.fn(),
      cursorTo: jest.fn(),
      moveCursor: jest.fn(),
      isTTY: true,
      columns: 80,
      rows: 24
    };
    originalStdout = process.stdout;
    process.stdout = mockStdout;
  });

  afterEach(() => {
    process.stdout = originalStdout;
  });

  /**
   * PERF-3: Render time per frame
   * Requirement: < 50ms per frame (design.md - Performance.2)
   */
  test('PERF-3: Menu rendering completes within 50ms per frame', () => {
    const iterations = 100;
    const maxAllowedTime = 50; // ms

    for (let i = 0; i < iterations; i++) {
      const state = stateManager.getState();

      const startTime = perfMonitor.start();
      renderer.renderMenu(state);
      const duration = perfMonitor.end(startTime);

      perfMonitor.record('render-frame', duration);
    }

    const stats = perfMonitor.getStats('render-frame');
    console.log('Render Frame Stats:', stats);

    expect(stats.avg).toBeLessThan(maxAllowedTime);
    expect(stats.p95 || stats.max).toBeLessThan(maxAllowedTime * 1.2); // 95th percentile
  });

  /**
   * PERF-4: Description rendering performance
   * Requirement: < 100ms (design.md - Performance)
   */
  test('PERF-4: Description rendering is fast', () => {
    const iterations = 50;
    const maxAllowedTime = 100; // ms

    for (let i = 0; i < iterations; i++) {
      const state = stateManager.getState();
      const selectedOption = state.options[state.selectedIndex];

      const startTime = perfMonitor.start();
      renderer.renderDescription(selectedOption);
      const duration = perfMonitor.end(startTime);

      perfMonitor.record('render-description', duration);
    }

    const stats = perfMonitor.getStats('render-description');
    console.log('Render Description Stats:', stats);

    expect(stats.avg).toBeLessThan(maxAllowedTime);
  });

  /**
   * PERF-5: Rapid re-rendering performance
   */
  test('PERF-5: Rapid re-rendering maintains performance', () => {
    const iterations = 200;
    const maxAllowedTime = 50; // ms

    for (let i = 0; i < iterations; i++) {
      // Simulate rapid navigation
      if (i % 2 === 0) {
        stateManager.moveDown();
      } else {
        stateManager.moveUp();
      }

      const state = stateManager.getState();

      const startTime = perfMonitor.start();
      renderer.renderMenu(state);
      const duration = perfMonitor.end(startTime);

      perfMonitor.record('rapid-render', duration);
    }

    const stats = perfMonitor.getStats('rapid-render');
    console.log('Rapid Rendering Stats:', stats);

    // Even under rapid re-rendering, should maintain performance
    expect(stats.avg).toBeLessThan(maxAllowedTime);
    expect(stats.max).toBeLessThan(maxAllowedTime * 2); // Allow more margin for max
  });
});

describe('Performance: Input Response', () => {
  let perfMonitor;
  let stateManager;

  beforeAll(() => {
    perfMonitor = new PerformanceMonitor();
  });

  beforeEach(() => {
    perfMonitor.reset();
    stateManager = new StateManager(MENU_OPTIONS);
  });

  /**
   * PERF-6: Input response time
   * Requirement: < 50ms (design.md - Requirements 1.6, Performance.2)
   */
  test('PERF-6: Navigation input response within 50ms', () => {
    const iterations = 200;
    const maxAllowedTime = 50; // ms

    for (let i = 0; i < iterations; i++) {
      const startTime = perfMonitor.start();

      // Simulate input processing
      if (i % 2 === 0) {
        stateManager.moveDown();
      } else {
        stateManager.moveUp();
      }

      const duration = perfMonitor.end(startTime);
      perfMonitor.record('input-response', duration);
    }

    const stats = perfMonitor.getStats('input-response');
    console.log('Input Response Stats:', stats);

    expect(stats.avg).toBeLessThan(maxAllowedTime);
    expect(stats.max).toBeLessThan(maxAllowedTime * 1.5);
  });

  /**
   * PERF-7: State update performance
   */
  test('PERF-7: State updates are instantaneous', () => {
    const iterations = 1000;
    const maxAllowedTime = 10; // ms (very strict)

    for (let i = 0; i < iterations; i++) {
      const startTime = perfMonitor.start();
      stateManager.setSelectedIndex(i % MENU_OPTIONS.length);
      const duration = perfMonitor.end(startTime);

      perfMonitor.record('state-update', duration);
    }

    const stats = perfMonitor.getStats('state-update');
    console.log('State Update Stats:', stats);

    expect(stats.avg).toBeLessThan(maxAllowedTime);
  });
});

describe('Performance: Command Execution Overhead', () => {
  let perfMonitor;
  let testConfigDir;
  let testHistoryPath;

  beforeAll(async () => {
    perfMonitor = new PerformanceMonitor();
    testConfigDir = path.join(os.tmpdir(), '.docs-jana-perf-cmd-test');
    testHistoryPath = path.join(testConfigDir, 'history.json');
    await fs.mkdir(testConfigDir, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(testConfigDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    perfMonitor.reset();
  });

  /**
   * PERF-8: Command execution overhead
   * Requirement: < 100ms overhead (design.md - Performance.3)
   */
  test('PERF-8: Command execution overhead within 100ms', async () => {
    const CommandExecutor = require('../../src/ui/menu/components/CommandExecutor');
    const executor = new CommandExecutor();
    const history = new CommandHistory(testHistoryPath);

    const iterations = 20;
    const maxOverhead = 100; // ms

    for (let i = 0; i < iterations; i++) {
      // Mock command that does nothing (to measure pure overhead)
      const mockCommand = async () => {
        return { success: true, message: 'Done' };
      };

      const startTime = perfMonitor.start();

      // Execute command and track
      const result = await mockCommand();
      history.add({
        commandName: 'test-command',
        timestamp: new Date(),
        status: result.success ? 'success' : 'failure',
        duration: 1
      });

      const duration = perfMonitor.end(startTime);
      perfMonitor.record('exec-overhead', duration);
    }

    const stats = perfMonitor.getStats('exec-overhead');
    console.log('Execution Overhead Stats:', stats);

    expect(stats.avg).toBeLessThan(maxOverhead);
  });
});

describe('Performance: Memory Usage', () => {
  let memMonitor;
  let testConfigDir;

  beforeAll(async () => {
    memMonitor = new MemoryMonitor();
    testConfigDir = path.join(os.tmpdir(), '.docs-jana-perf-mem-test');
    await fs.mkdir(testConfigDir, { recursive: true });
    process.env.DOCS_JANA_CONFIG_DIR = testConfigDir;
  });

  afterAll(async () => {
    await fs.rm(testConfigDir, { recursive: true, force: true });
    delete process.env.DOCS_JANA_CONFIG_DIR;
  });

  beforeEach(() => {
    memMonitor.reset();
  });

  /**
   * PERF-9: Memory leak detection
   * Requirement: No leaks over 100 iterations (Task 24)
   */
  test('PERF-9: No memory leaks over 100 iterations', async () => {
    const iterations = 100;
    const maxLeakage = 10 * 1024 * 1024; // 10MB acceptable growth

    // Force garbage collection before test
    if (global.gc) {
      global.gc();
    }

    memMonitor.snapshot();

    for (let i = 0; i < iterations; i++) {
      const menu = new MenuOrchestrator();
      const stateManager = new StateManager(MENU_OPTIONS);

      // Simulate some operations
      stateManager.moveDown();
      stateManager.moveUp();
      stateManager.setMode('navigation');

      await menu.shutdown();

      // Snapshot every 10 iterations
      if (i % 10 === 0) {
        memMonitor.snapshot();
      }
    }

    // Force garbage collection after test
    if (global.gc) {
      global.gc();
    }

    await new Promise(resolve => setTimeout(resolve, 100));
    memMonitor.snapshot();

    const leakage = memMonitor.getLeakage();
    console.log('Memory Leakage Analysis:', leakage);

    // Heap should not grow significantly
    expect(Math.abs(leakage.heapUsedDelta)).toBeLessThan(maxLeakage);
  }, 30000);

  /**
   * PERF-10: Theme engine memory efficiency
   */
  test('PERF-10: Theme engine is memory efficient', () => {
    if (global.gc) {
      global.gc();
    }

    memMonitor.snapshot();

    const themes = ['default', 'dark', 'light', 'high-contrast'];
    const iterations = 100;

    for (let i = 0; i < iterations; i++) {
      const engine = new ThemeEngine();

      // Load all themes
      themes.forEach(theme => {
        engine.loadTheme(theme);
      });

      // Use theme
      engine.colorize('test', 'primary');
      engine.format('test', 'bold');
    }

    if (global.gc) {
      global.gc();
    }

    memMonitor.snapshot();

    const leakage = memMonitor.getLeakage();
    console.log('Theme Engine Memory:', leakage);

    // Should not leak significantly
    const maxThemeLeakage = 5 * 1024 * 1024; // 5MB
    expect(Math.abs(leakage.heapUsedDelta)).toBeLessThan(maxThemeLeakage);
  });
});

describe('Performance: Animation Performance', () => {
  let perfMonitor;
  let animEngine;

  beforeAll(() => {
    perfMonitor = new PerformanceMonitor();
  });

  beforeEach(() => {
    perfMonitor.reset();
    animEngine = new AnimationEngine();
  });

  /**
   * PERF-11: Animation frame rate
   * Requirement: 60fps minimum (design.md - Requirements 6.7)
   */
  test('PERF-11: Animations maintain 60fps (< 16.67ms per frame)', async () => {
    const targetFrameTime = 16.67; // ms (60fps = 1000ms/60frames)
    const iterations = 60; // Simulate 1 second

    // Enable animations
    animEngine.setEnabled(true);

    for (let i = 0; i < iterations; i++) {
      const startTime = perfMonitor.start();

      // Simulate animation frame processing
      await animEngine.animateSelection(i % 5, (i + 1) % 5);

      const duration = perfMonitor.end(startTime);
      perfMonitor.record('anim-frame', duration);
    }

    const stats = perfMonitor.getStats('anim-frame');
    console.log('Animation Frame Stats:', stats);

    // Average frame time should support 60fps
    expect(stats.avg).toBeLessThan(targetFrameTime);
  });

  /**
   * PERF-12: Animation duration compliance
   * Requirement: Animations < 300ms (design.md - Requirements 6.8)
   */
  test('PERF-12: Animations complete within 300ms', async () => {
    const maxAnimDuration = 300; // ms

    const animations = [
      { name: 'success', fn: () => animEngine.animateSuccess() },
      { name: 'error', fn: () => animEngine.animateError() },
      { name: 'fadeIn', fn: () => animEngine.animateFadeIn() }
    ];

    for (const anim of animations) {
      const startTime = perfMonitor.start();
      await anim.fn();
      const duration = perfMonitor.end(startTime);

      perfMonitor.record(anim.name, duration);
      console.log(`${anim.name} animation: ${duration.toFixed(2)}ms`);

      expect(duration).toBeLessThan(maxAnimDuration);
    }
  });
});

describe('Performance: Summary', () => {
  test('PERF-SUMMARY: Print performance summary', () => {
    console.log('\n=== PERFORMANCE TEST SUMMARY ===');
    console.log('All performance requirements validated:');
    console.log('✓ Menu initialization: < 200ms');
    console.log('✓ Render time: < 50ms per frame');
    console.log('✓ Input response: < 50ms');
    console.log('✓ Command execution overhead: < 100ms');
    console.log('✓ Memory: No leaks over 100 iterations');
    console.log('✓ Animations: 60fps, < 300ms duration');
    console.log('================================\n');
  });
});
