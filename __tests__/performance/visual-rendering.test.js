/**
 * Performance Tests for Visual Rendering Components
 *
 * Tests Phase 6: Testing and QA
 * - Task 21.1: Performance tests for rendering operations
 * - Task 21.2: Performance tests for caching mechanisms
 *
 * Performance Targets (from requirements):
 * - Menu rendering: < 100ms (Requirement 11.1)
 * - Navigation (selection change): < 50ms (Requirement 11.2)
 * - Resize re-rendering: < 200ms (Requirement 11.5)
 * - Theme switch: < 150ms (Requirement 11.1)
 * - Cache hit vs miss: significant difference (Requirement 11.3)
 */

const { TerminalDetector, BorderRenderer, LayoutManager, IconMapper } = require('../../src/ui/menu/visual');
const visualConstants = require('../../src/ui/menu/config/visual-constants');
const ThemeEngine = require('../../src/ui/menu/utils/ThemeEngine');
const defaultTheme = require('../../src/ui/menu/themes/default');

describe('Visual Rendering Performance Tests', () => {
  let detector;
  let borderRenderer;
  let layoutManager;
  let iconMapper;
  let themeEngine;

  beforeEach(() => {
    // Initialize components
    detector = new TerminalDetector();
    themeEngine = new ThemeEngine(defaultTheme);
    borderRenderer = new BorderRenderer(detector, visualConstants, themeEngine);
    layoutManager = new LayoutManager(detector, visualConstants);
    iconMapper = new IconMapper(detector);

    // Warmup: pre-compile functions to eliminate JIT cold-start
    for (let i = 0; i < 5; i++) {
      borderRenderer.renderTopBorder(80, 'single');
      layoutManager.getLayoutMode();
      iconMapper.getIcon('download');
    }
  });

  afterEach(() => {
    // Cleanup caches where available
    if (borderRenderer.clearCache) borderRenderer.clearCache();
    if (iconMapper.clearCache) iconMapper.clearCache();
  });

  describe('Task 21.1: Rendering Performance', () => {
    test('should render complete menu in < 100ms', () => {
      const iterations = 10;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();

        // Simulate complete menu rendering
        const header = borderRenderer.renderBox(['DOCS-JANA CLI', 'v2.0.0'], {
          style: 'double',
          padding: 1,
          align: 'center'
        });

        const separator = borderRenderer.renderSeparator(80, 'single');

        const options = [];
        for (let j = 0; j < 10; j++) {
          const icon = iconMapper.getIcon('download');
          const label = layoutManager.truncateText(`Option ${j}`, 50);
          options.push(`${icon} ${label}`);
        }

        const footer = borderRenderer.renderSeparator(80, 'single');

        times.push(performance.now() - start);
      }

      const avgTime = times.reduce((a, b) => a + b) / times.length;
      const maxTime = Math.max(...times);

      // Target: < 100ms average
      expect(avgTime).toBeLessThan(100);
      console.log(`  ℹ Menu rendering: ${avgTime.toFixed(2)}ms avg, ${maxTime.toFixed(2)}ms max`);
    });

    test('should handle navigation (selection change) in < 50ms', () => {
      const iterations = 20;
      const times = [];

      // Simulate menu state
      const options = Array.from({ length: 10 }, (_, i) => ({
        label: `Option ${i}`,
        actionType: 'download'
      }));

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();

        // Simulate selection change: clear previous highlight, apply new highlight
        const selectedIndex = i % 10;
        const icon = iconMapper.getSelectionIndicator();
        const label = layoutManager.truncateText(options[selectedIndex].label, 50);
        const highlightedOption = themeEngine.colorize(`${icon} ${label}`, 'selectedText');

        times.push(performance.now() - start);
      }

      const avgTime = times.reduce((a, b) => a + b) / times.length;
      const maxTime = Math.max(...times);

      // Target: < 50ms average
      expect(avgTime).toBeLessThan(50);
      console.log(`  ℹ Navigation: ${avgTime.toFixed(2)}ms avg, ${maxTime.toFixed(2)}ms max`);
    });

    test('should handle resize re-rendering in < 200ms', () => {
      const iterations = 10;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();

        // Simulate terminal resize
        const newWidth = 60 + (i * 10); // 60, 70, 80, ... 140

        // Clear caches (simulating resize event)
        if (borderRenderer.clearCache) borderRenderer.clearCache();
        if (iconMapper.clearCache) iconMapper.clearCache();

        // Re-render with new width
        const layoutMode = layoutManager.getLayoutMode();
        const contentWidth = layoutManager.getContentWidth();
        const header = borderRenderer.renderTopBorder(contentWidth, 'double');
        const separator = borderRenderer.renderSeparator(contentWidth, 'single');

        times.push(performance.now() - start);
      }

      const avgTime = times.reduce((a, b) => a + b) / times.length;
      const maxTime = Math.max(...times);

      // Target: < 200ms average
      expect(avgTime).toBeLessThan(200);
      console.log(`  ℹ Resize re-rendering: ${avgTime.toFixed(2)}ms avg, ${maxTime.toFixed(2)}ms max`);
    });

    test('should handle theme switch in < 150ms', () => {
      const darkTheme = require('../../src/ui/menu/themes/dark');
      const lightTheme = require('../../src/ui/menu/themes/light');

      const iterations = 10;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();

        // Simulate theme switch
        const newTheme = i % 2 === 0 ? darkTheme : lightTheme;
        const newThemeEngine = new ThemeEngine(newTheme);

        // Re-apply theme to rendered content
        const text = 'Sample text';
        const coloredText = newThemeEngine.colorize(text, 'primary');

        // Re-create border renderer with new theme
        const newBorderRenderer = new BorderRenderer(detector, visualConstants, newThemeEngine);
        const border = newBorderRenderer.renderTopBorder(80, 'single');

        times.push(performance.now() - start);
      }

      const avgTime = times.reduce((a, b) => a + b) / times.length;
      const maxTime = Math.max(...times);

      // Target: < 150ms average
      expect(avgTime).toBeLessThan(150);
      console.log(`  ℹ Theme switch: ${avgTime.toFixed(2)}ms avg, ${maxTime.toFixed(2)}ms max`);
    });
  });

  describe('Task 21.2: Cache Performance', () => {
    test('should demonstrate significant cache hit performance improvement for BorderRenderer', () => {
      const iterations = 100;

      // Measure cache miss (first render)
      borderRenderer.clearCache();
      const missStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        borderRenderer.renderTopBorder(80, 'single');
        borderRenderer.clearCache(); // Force miss every time
      }
      const missTime = performance.now() - missStart;

      // Measure cache hit (subsequent renders)
      borderRenderer.clearCache();
      borderRenderer.renderTopBorder(80, 'single'); // Prime cache
      const hitStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        borderRenderer.renderTopBorder(80, 'single'); // Cache hit
      }
      const hitTime = performance.now() - hitStart;

      const speedup = missTime / hitTime;

      // Cache hits should be significantly faster
      expect(hitTime).toBeLessThan(missTime);
      expect(speedup).toBeGreaterThan(1.5); // At least 1.5x faster

      console.log(`  ℹ BorderRenderer cache: ${missTime.toFixed(2)}ms (miss) vs ${hitTime.toFixed(2)}ms (hit), ${speedup.toFixed(2)}x speedup`);
    });

    test.skip('should demonstrate significant cache hit performance improvement for LayoutManager', () => {
      // SKIP: LayoutManager doesn't expose clearCache method for testing
      // Cache is managed internally and invalidated on resize
    });

    test('should demonstrate significant cache hit performance improvement for IconMapper', () => {
      const iterations = 100;
      const actionTypes = ['download', 'upload', 'settings', 'docs', 'stats'];

      // Measure cache miss
      if (iconMapper.clearCache) iconMapper.clearCache();
      const missStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        actionTypes.forEach(type => {
          iconMapper.getIcon(type);
        });
        if (iconMapper.clearCache) iconMapper.clearCache(); // Force miss
      }
      const missTime = performance.now() - missStart;

      // Measure cache hit
      if (iconMapper.clearCache) iconMapper.clearCache();
      actionTypes.forEach(type => iconMapper.getIcon(type)); // Prime cache
      const hitStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        actionTypes.forEach(type => {
          iconMapper.getIcon(type);
        });
      }
      const hitTime = performance.now() - hitStart;

      const speedup = missTime / hitTime;

      // Cache hits should be significantly faster
      expect(hitTime).toBeLessThan(missTime);
      expect(speedup).toBeGreaterThan(1.5);

      console.log(`  ℹ IconMapper cache: ${missTime.toFixed(2)}ms (miss) vs ${hitTime.toFixed(2)}ms (hit), ${speedup.toFixed(2)}x speedup`);
    });

    test('should validate cache invalidation works correctly for BorderRenderer', () => {
      // Render with style 'single'
      const border1 = borderRenderer.renderTopBorder(80, 'single');

      // Change style (should use cache for 'single', compute for 'double')
      const startDouble = performance.now();
      const border2 = borderRenderer.renderTopBorder(80, 'double');
      const doubleTime = performance.now() - startDouble;

      // Re-render 'single' (should be cached)
      const startSingle = performance.now();
      const border3 = borderRenderer.renderTopBorder(80, 'single');
      const singleTime = performance.now() - startSingle;

      // Cached render should be faster
      expect(singleTime).toBeLessThan(doubleTime);

      // Clear cache
      borderRenderer.clearCache();

      // Re-render 'single' after cache clear (should be slower)
      const startSingleNoCache = performance.now();
      const border4 = borderRenderer.renderTopBorder(80, 'single');
      const singleNoCacheTime = performance.now() - startSingleNoCache;

      // Non-cached should be slower than cached
      expect(singleNoCacheTime).toBeGreaterThan(singleTime);

      console.log(`  ℹ Cache invalidation: cached ${singleTime.toFixed(4)}ms vs non-cached ${singleNoCacheTime.toFixed(4)}ms`);
    });

    test('should measure overall caching effectiveness', () => {
      const iterations = 50;

      // Scenario: Typical menu usage (render header, options, footer repeatedly)
      const typicalMenuOperations = () => {
        borderRenderer.renderTopBorder(80, 'double');
        borderRenderer.renderSeparator(80, 'single');
        layoutManager.getLayoutMode();
        layoutManager.getContentWidth();
        for (let i = 0; i < 5; i++) {
          iconMapper.getIcon('download');
          layoutManager.truncateText('Sample text', 50);
        }
        borderRenderer.renderBottomBorder(80, 'double');
      };

      // Measure without cache
      const noCacheStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        borderRenderer.clearCache();
        // layoutManager has no clearCache method
        if (iconMapper.clearCache) iconMapper.clearCache();
        typicalMenuOperations();
      }
      const noCacheTime = performance.now() - noCacheStart;

      // Measure with cache
      borderRenderer.clearCache();
      // layoutManager has no clearCache method
      if (iconMapper.clearCache) iconMapper.clearCache();
      typicalMenuOperations(); // Prime cache
      const cacheStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        typicalMenuOperations();
      }
      const cacheTime = performance.now() - cacheStart;

      const speedup = noCacheTime / cacheTime;

      // Overall cache should provide significant speedup
      expect(cacheTime).toBeLessThan(noCacheTime);
      expect(speedup).toBeGreaterThan(2); // At least 2x faster with cache

      console.log(`  ℹ Overall caching: ${noCacheTime.toFixed(2)}ms (no cache) vs ${cacheTime.toFixed(2)}ms (cached), ${speedup.toFixed(2)}x speedup`);
    });
  });

  describe('Performance Regression Detection', () => {
    test('should detect if rendering performance regresses beyond acceptable threshold', () => {
      // Baseline expectations (from current implementation)
      const baselineMenuRender = 10; // ms
      const baselineNavigation = 5; // ms

      // Measure current performance
      const menuStart = performance.now();
      borderRenderer.renderBox(['Header'], { style: 'double' });
      borderRenderer.renderSeparator(80, 'single');
      for (let i = 0; i < 10; i++) {
        iconMapper.getIcon('download');
      }
      const menuTime = performance.now() - menuStart;

      const navStart = performance.now();
      iconMapper.getSelectionIndicator();
      themeEngine.colorize('text', 'selectedText');
      const navTime = performance.now() - navStart;

      // Allow 100% deviation (2x baseline) before failing
      const maxMenuTime = baselineMenuRender * 2;
      const maxNavTime = baselineNavigation * 2;

      expect(menuTime).toBeLessThan(maxMenuTime);
      expect(navTime).toBeLessThan(maxNavTime);

      console.log(`  ℹ Regression check: menu ${menuTime.toFixed(2)}ms (< ${maxMenuTime}ms), nav ${navTime.toFixed(2)}ms (< ${maxNavTime}ms)`);
    });
  });
});
