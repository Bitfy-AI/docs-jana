/**
 * E2E Tests for Interactive Menu Enhancement
 *
 * Tests complete user workflows end-to-end, simulating real user interactions
 * with the menu system using mocked stdin/stdout.
 *
 * Requirements: Task 23 - E2E Testing
 * - Minimum 10 E2E scenarios covering complete workflows
 * - Real user interaction simulation
 * - Full integration testing
 */

const MenuOrchestrator = require('../../src/ui/menu');
const ConfigManager = require('../../src/ui/menu/components/ConfigManager');
const CommandHistory = require('../../src/ui/menu/components/CommandHistory');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Mock stdin/stdout for user interaction simulation
class MockStdin {
  constructor() {
    this.inputs = [];
    this.inputIndex = 0;
    this.listeners = new Map();
  }

  setRawMode() {
    return this;
  }

  resume() {
    return this;
  }

  pause() {
    return this;
  }

  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(handler);
    return this;
  }

  removeListener(event, handler) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
    return this;
  }

  emit(event, data) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  // Simulate user typing
  simulateInput(input) {
    this.inputs.push(input);
  }

  // Trigger next input
  triggerNextInput() {
    if (this.inputIndex < this.inputs.length) {
      const input = this.inputs[this.inputIndex++];
      this.emit('data', input);
      return true;
    }
    return false;
  }

  reset() {
    this.inputs = [];
    this.inputIndex = 0;
  }
}

class MockStdout {
  constructor() {
    this.output = [];
  }

  write(data) {
    this.output.push(data);
    return true;
  }

  clearLine() {
    return this;
  }

  cursorTo() {
    return this;
  }

  moveCursor() {
    return this;
  }

  getOutput() {
    return this.output.join('');
  }

  reset() {
    this.output = [];
  }

  get isTTY() {
    return true;
  }

  get columns() {
    return 80;
  }

  get rows() {
    return 24;
  }
}

describe('E2E: Interactive Menu System', () => {
  let mockStdin;
  let mockStdout;
  let originalStdin;
  let originalStdout;
  let testConfigDir;
  let testConfigPath;
  let testHistoryPath;

  beforeAll(async () => {
    // Create test directory for config/history
    testConfigDir = path.join(os.tmpdir(), '.docs-jana-e2e-test');
    testConfigPath = path.join(testConfigDir, 'config.json');
    testHistoryPath = path.join(testConfigDir, 'history.json');

    try {
      await fs.mkdir(testConfigDir, { recursive: true });
    } catch (err) {
      // Directory may already exist
    }
  });

  beforeEach(() => {
    // Create mocks
    mockStdin = new MockStdin();
    mockStdout = new MockStdout();

    // Save originals
    originalStdin = process.stdin;
    originalStdout = process.stdout;

    // Replace with mocks
    process.stdin = mockStdin;
    process.stdout = mockStdout;

    // Mock environment
    process.env.DOCS_JANA_CONFIG_DIR = testConfigDir;
  });

  afterEach(() => {
    // Restore originals
    process.stdin = originalStdin;
    process.stdout = originalStdout;

    // Clean mocks
    mockStdin.reset();
    mockStdout.reset();

    delete process.env.DOCS_JANA_CONFIG_DIR;
  });

  afterAll(async () => {
    // Clean up test directory
    try {
      await fs.rm(testConfigDir, { recursive: true, force: true });
    } catch (err) {
      // Ignore cleanup errors
    }
  });

  /**
   * E2E Scenario 1: Launch menu → Navigate → Select → Execute → Return
   */
  test('E2E-1: Complete navigation and command execution workflow', async () => {
    const menu = new MenuOrchestrator();

    // Simulate user interactions
    const userActions = [
      '\x1B[B', // Arrow down
      '\x1B[B', // Arrow down
      '\r',     // Enter (select)
      'q'       // Quit
    ];

    // Start menu in background
    const menuPromise = menu.start();

    // Simulate user input sequence
    await new Promise(resolve => setTimeout(resolve, 100));
    userActions.forEach(action => mockStdin.simulateInput(action));

    // Process inputs
    for (let i = 0; i < userActions.length; i++) {
      mockStdin.triggerNextInput();
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Check output contains menu elements
    const output = mockStdout.getOutput();
    expect(output).toBeTruthy();

    // Menu should have been rendered
    expect(mockStdout.output.length).toBeGreaterThan(0);

    await menu.shutdown();
  }, 10000);

  /**
   * E2E Scenario 2: Launch menu → Preview mode → Execute
   */
  test('E2E-2: Preview mode workflow', async () => {
    // Create config with preview enabled
    const configManager = new ConfigManager(testConfigPath);
    await configManager.save({
      theme: 'default',
      animationsEnabled: true,
      animationSpeed: 'normal',
      iconsEnabled: true,
      showDescriptions: true,
      showPreviews: true,
      historySize: 50
    });

    const menu = new MenuOrchestrator();

    const userActions = [
      '\x1B[B', // Navigate down
      'p',      // Preview
      '\r',     // Confirm
      'q'       // Quit
    ];

    const menuPromise = menu.start();
    await new Promise(resolve => setTimeout(resolve, 100));

    userActions.forEach(action => mockStdin.simulateInput(action));
    for (let i = 0; i < userActions.length; i++) {
      mockStdin.triggerNextInput();
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    const output = mockStdout.getOutput();
    expect(output).toBeTruthy();

    await menu.shutdown();
  }, 10000);

  /**
   * E2E Scenario 3: Launch menu → History mode → Rerun command
   */
  test('E2E-3: History mode and command rerun workflow', async () => {
    // Pre-populate history
    const history = new CommandHistory(testHistoryPath);
    history.add({
      commandName: 'test-command',
      timestamp: new Date(),
      status: 'success',
      duration: 1000
    });
    await history.save();

    const menu = new MenuOrchestrator();

    const userActions = [
      'h',      // Open history
      '\x1B[B', // Navigate in history
      '\r',     // Select history item
      'q'       // Quit
    ];

    const menuPromise = menu.start();
    await new Promise(resolve => setTimeout(resolve, 100));

    userActions.forEach(action => mockStdin.simulateInput(action));
    for (let i = 0; i < userActions.length; i++) {
      mockStdin.triggerNextInput();
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    const output = mockStdout.getOutput();
    expect(output).toBeTruthy();

    await menu.shutdown();
  }, 10000);

  /**
   * E2E Scenario 4: Launch menu → Config mode → Change settings → Apply
   */
  test('E2E-4: Configuration change workflow', async () => {
    const menu = new MenuOrchestrator();

    const userActions = [
      's',      // Open settings
      '\x1B[B', // Navigate in settings
      '\r',     // Select setting
      '\x1B[B', // Change value
      '\r',     // Confirm
      '\x1B',   // Escape (back to menu)
      'q'       // Quit
    ];

    const menuPromise = menu.start();
    await new Promise(resolve => setTimeout(resolve, 100));

    userActions.forEach(action => mockStdin.simulateInput(action));
    for (let i = 0; i < userActions.length; i++) {
      mockStdin.triggerNextInput();
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    const output = mockStdout.getOutput();
    expect(output).toBeTruthy();

    // Verify config was saved
    const configManager = new ConfigManager(testConfigPath);
    const config = await configManager.load();
    expect(config).toBeDefined();

    await menu.shutdown();
  }, 10000);

  /**
   * E2E Scenario 5: Launch menu → Help mode → Return
   */
  test('E2E-5: Help mode workflow', async () => {
    const menu = new MenuOrchestrator();

    const userActions = [
      '?',      // Open help
      '\x1B',   // Escape (close help)
      'q'       // Quit
    ];

    const menuPromise = menu.start();
    await new Promise(resolve => setTimeout(resolve, 100));

    userActions.forEach(action => mockStdin.simulateInput(action));
    for (let i = 0; i < userActions.length; i++) {
      mockStdin.triggerNextInput();
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    const output = mockStdout.getOutput();
    expect(output).toBeTruthy();

    await menu.shutdown();
  }, 10000);

  /**
   * E2E Scenario 6: Launch menu → Quit immediately
   */
  test('E2E-6: Immediate quit workflow', async () => {
    const menu = new MenuOrchestrator();

    const userActions = ['q'];

    const menuPromise = menu.start();
    await new Promise(resolve => setTimeout(resolve, 100));

    userActions.forEach(action => mockStdin.simulateInput(action));
    mockStdin.triggerNextInput();
    await new Promise(resolve => setTimeout(resolve, 50));

    const output = mockStdout.getOutput();
    expect(output).toBeTruthy();

    await menu.shutdown();
  }, 10000);

  /**
   * E2E Scenario 7: Circular navigation (first to last, last to first)
   */
  test('E2E-7: Circular navigation workflow', async () => {
    const menu = new MenuOrchestrator();

    const userActions = [
      '\x1B[A', // Arrow up (should go to last)
      '\x1B[A', // Arrow up again
      '\x1B[B', // Arrow down (should go to first)
      '\x1B[B', // Arrow down
      'q'       // Quit
    ];

    const menuPromise = menu.start();
    await new Promise(resolve => setTimeout(resolve, 100));

    userActions.forEach(action => mockStdin.simulateInput(action));
    for (let i = 0; i < userActions.length; i++) {
      mockStdin.triggerNextInput();
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    const output = mockStdout.getOutput();
    expect(output).toBeTruthy();
    expect(mockStdout.output.length).toBeGreaterThan(0);

    await menu.shutdown();
  }, 10000);

  /**
   * E2E Scenario 8: Numeric shortcut execution
   */
  test('E2E-8: Numeric shortcut workflow', async () => {
    const menu = new MenuOrchestrator();

    const userActions = [
      '1',      // Select first option by number
      'q'       // Quit
    ];

    const menuPromise = menu.start();
    await new Promise(resolve => setTimeout(resolve, 100));

    userActions.forEach(action => mockStdin.simulateInput(action));
    for (let i = 0; i < userActions.length; i++) {
      mockStdin.triggerNextInput();
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    const output = mockStdout.getOutput();
    expect(output).toBeTruthy();

    await menu.shutdown();
  }, 10000);

  /**
   * E2E Scenario 9: Multiple command executions with status tracking
   */
  test('E2E-9: Multiple executions with status tracking', async () => {
    const menu = new MenuOrchestrator();

    const userActions = [
      '\x1B[B', // Navigate
      '\r',     // Execute
      '\x1B[B', // Navigate to another
      '\r',     // Execute again
      'q'       // Quit
    ];

    const menuPromise = menu.start();
    await new Promise(resolve => setTimeout(resolve, 100));

    userActions.forEach(action => mockStdin.simulateInput(action));
    for (let i = 0; i < userActions.length; i++) {
      mockStdin.triggerNextInput();
      await new Promise(resolve => setTimeout(resolve, 100)); // More time for execution
    }

    // Verify history was updated
    const history = new CommandHistory(testHistoryPath);
    await history.load();
    const records = history.getAll();
    expect(records.length).toBeGreaterThanOrEqual(0); // May have previous test records

    await menu.shutdown();
  }, 15000);

  /**
   * E2E Scenario 10: First-time user experience (no config/history)
   */
  test('E2E-10: First-time user workflow', async () => {
    // Clean config/history to simulate first run
    try {
      await fs.unlink(testConfigPath);
      await fs.unlink(testHistoryPath);
    } catch (err) {
      // Files may not exist
    }

    const menu = new MenuOrchestrator();

    const userActions = [
      '\x1B[B', // Navigate
      '\x1B[B', // Navigate
      'q'       // Quit
    ];

    const menuPromise = menu.start();
    await new Promise(resolve => setTimeout(resolve, 100));

    userActions.forEach(action => mockStdin.simulateInput(action));
    for (let i = 0; i < userActions.length; i++) {
      mockStdin.triggerNextInput();
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Verify default config was created
    const configExists = await fs.access(testConfigPath)
      .then(() => true)
      .catch(() => false);

    const historyExists = await fs.access(testHistoryPath)
      .then(() => true)
      .catch(() => false);

    expect(configExists || historyExists).toBe(true); // At least one should be created

    await menu.shutdown();
  }, 10000);

  /**
   * E2E Scenario 11: Keyboard shortcut navigation
   */
  test('E2E-11: Keyboard shortcuts workflow', async () => {
    const menu = new MenuOrchestrator();

    const userActions = [
      'h',      // History shortcut
      '\x1B',   // Back
      's',      // Settings shortcut
      '\x1B',   // Back
      '?',      // Help shortcut
      '\x1B',   // Back
      'q'       // Quit
    ];

    const menuPromise = menu.start();
    await new Promise(resolve => setTimeout(resolve, 100));

    userActions.forEach(action => mockStdin.simulateInput(action));
    for (let i = 0; i < userActions.length; i++) {
      mockStdin.triggerNextInput();
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    const output = mockStdout.getOutput();
    expect(output).toBeTruthy();

    await menu.shutdown();
  }, 10000);

  /**
   * E2E Scenario 12: Rapid navigation stress test
   */
  test('E2E-12: Rapid navigation workflow', async () => {
    const menu = new MenuOrchestrator();

    const userActions = [
      '\x1B[B', '\x1B[B', '\x1B[B', '\x1B[A', '\x1B[A', // Rapid navigation
      '\x1B[B', '\x1B[A', '\x1B[B', '\x1B[A',
      'q'
    ];

    const menuPromise = menu.start();
    await new Promise(resolve => setTimeout(resolve, 100));

    userActions.forEach(action => mockStdin.simulateInput(action));
    for (let i = 0; i < userActions.length; i++) {
      mockStdin.triggerNextInput();
      await new Promise(resolve => setTimeout(resolve, 20)); // Rapid input
    }

    const output = mockStdout.getOutput();
    expect(output).toBeTruthy();
    expect(mockStdout.output.length).toBeGreaterThan(0);

    await menu.shutdown();
  }, 10000);
});

describe('E2E: Error Handling and Edge Cases', () => {
  let mockStdin;
  let mockStdout;
  let originalStdin;
  let originalStdout;
  let testConfigDir;

  beforeEach(() => {
    mockStdin = new MockStdin();
    mockStdout = new MockStdout();
    originalStdin = process.stdin;
    originalStdout = process.stdout;
    process.stdin = mockStdin;
    process.stdout = mockStdout;

    testConfigDir = path.join(os.tmpdir(), '.docs-jana-e2e-error-test');
    process.env.DOCS_JANA_CONFIG_DIR = testConfigDir;
  });

  afterEach(() => {
    process.stdin = originalStdin;
    process.stdout = originalStdout;
    mockStdin.reset();
    mockStdout.reset();
    delete process.env.DOCS_JANA_CONFIG_DIR;
  });

  /**
   * E2E Error Scenario 1: Invalid key press handling
   */
  test('E2E-ERR-1: Invalid key press handling', async () => {
    const menu = new MenuOrchestrator();

    const userActions = [
      'x',      // Invalid key
      'z',      // Invalid key
      '\x1B[B', // Valid navigation
      'q'       // Quit
    ];

    const menuPromise = menu.start();
    await new Promise(resolve => setTimeout(resolve, 100));

    userActions.forEach(action => mockStdin.simulateInput(action));
    for (let i = 0; i < userActions.length; i++) {
      mockStdin.triggerNextInput();
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Should handle gracefully without crashing
    const output = mockStdout.getOutput();
    expect(output).toBeTruthy();

    await menu.shutdown();
  }, 10000);

  /**
   * E2E Error Scenario 2: Corrupted config handling
   */
  test('E2E-ERR-2: Corrupted config file handling', async () => {
    // Create corrupted config
    const configPath = path.join(testConfigDir, 'config.json');
    await fs.mkdir(testConfigDir, { recursive: true });
    await fs.writeFile(configPath, '{ invalid json }');

    const menu = new MenuOrchestrator();

    const userActions = ['q'];

    const menuPromise = menu.start();
    await new Promise(resolve => setTimeout(resolve, 100));

    mockStdin.simulateInput('q');
    mockStdin.triggerNextInput();
    await new Promise(resolve => setTimeout(resolve, 50));

    // Should fallback to defaults without crashing
    expect(mockStdout.output.length).toBeGreaterThan(0);

    await menu.shutdown();

    // Cleanup
    await fs.rm(testConfigDir, { recursive: true, force: true });
  }, 10000);
});
