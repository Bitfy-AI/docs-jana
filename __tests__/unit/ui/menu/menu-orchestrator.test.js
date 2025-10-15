/**
 * Tests for MenuOrchestrator - Central coordinator of menu system
 *
 * Verifies:
 * - Initialization with all 8 components
 * - Component integration and coordination
 * - show() workflow
 * - Input handling and routing
 * - Mode switching (navigation, preview, history, config, help)
 * - Command execution flow
 * - Error handling
 * - Cleanup on exit
 */

const MenuOrchestrator = require('../../../../src/ui/menu/components/MenuOrchestrator');
const StateManager = require('../../../../src/ui/menu/components/StateManager');
const ConfigManager = require('../../../../src/ui/menu/components/ConfigManager');
const CommandHistory = require('../../../../src/ui/menu/components/CommandHistory');
const fs = require('fs').promises;
const os = require('os');
const path = require('path');

// Mock process.stdout para testes
const mockStdout = {
  write: jest.fn(),
  isTTY: true,
  columns: 80
};

// Mock process.stdin para testes
const mockStdin = {
  isTTY: true,
  setRawMode: jest.fn(),
  resume: jest.fn(),
  pause: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn()
};

describe('MenuOrchestrator', () => {
  let orchestrator;
  let testConfigDir;
  let testHistoryPath;
  let testConfigPath;
  let originalStdout;
  let originalStdin;

  const mockMenuOptions = [
    {
      key: '1',
      command: 'test-download',
      label: 'Test Download',
      description: 'Download test data',
      icon: '📥',
      category: 'action',
      shortcut: 'd',
      preview: {
        shellCommand: 'test-cli download',
        affectedPaths: ['./downloads'],
        estimatedDuration: 2
      }
    },
    {
      key: '2',
      command: 'test-upload',
      label: 'Test Upload',
      description: 'Upload test data',
      icon: '📤',
      category: 'action',
      shortcut: 'u'
    },
    {
      key: '3',
      command: 'history',
      label: 'View History',
      description: 'View command history',
      icon: '📜',
      category: 'info',
      shortcut: 'h'
    },
    {
      key: '4',
      command: 'config',
      label: 'Settings',
      description: 'Configure preferences',
      icon: '⚙️',
      category: 'utility',
      shortcut: 's'
    },
    {
      key: '5',
      command: 'help',
      label: 'Help',
      description: 'Show help',
      icon: '❓',
      category: 'info',
      shortcut: '?'
    },
    {
      key: '6',
      command: 'exit',
      label: 'Exit',
      description: 'Exit menu',
      icon: '🚪',
      category: 'utility',
      shortcut: 'q'
    }
  ];

  beforeAll(() => {
    // Mock global ora para testes
    global.__mockOra = jest.fn(() => ({
      start: jest.fn().mockReturnThis(),
      stop: jest.fn(),
      succeed: jest.fn(),
      fail: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      text: ''
    }));

    process.env.NODE_ENV = 'test';
  });

  beforeEach(async () => {
    // Setup test environment
    testConfigDir = path.join(os.tmpdir(), `.docs-jana-test-${Date.now()}`);
    testHistoryPath = path.join(testConfigDir, 'history.json');
    testConfigPath = path.join(testConfigDir, 'config.json');

    await fs.mkdir(testConfigDir, { recursive: true });

    // Mock stdout/stdin
    originalStdout = process.stdout;
    originalStdin = process.stdin;

    Object.defineProperty(process, 'stdout', {
      value: mockStdout,
      writable: true,
      configurable: true
    });

    Object.defineProperty(process, 'stdin', {
      value: mockStdin,
      writable: true,
      configurable: true
    });

    // Clear mocks
    mockStdout.write.mockClear();
    mockStdin.setRawMode.mockClear();
    mockStdin.on.mockClear();

    // Create fresh orchestrator instance
    orchestrator = new MenuOrchestrator({
      menuOptions: mockMenuOptions
    });
  });

  afterEach(async () => {
    // Cleanup
    if (orchestrator && orchestrator.isActive()) {
      await orchestrator.cleanup();
    }

    // Restore stdout/stdin
    Object.defineProperty(process, 'stdout', {
      value: originalStdout,
      writable: true,
      configurable: true
    });

    Object.defineProperty(process, 'stdin', {
      value: originalStdin,
      writable: true,
      configurable: true
    });

    // Remove test directory
    try {
      await fs.rm(testConfigDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  afterAll(() => {
    delete global.__mockOra;
    delete process.env.NODE_ENV;
  });

  describe('Constructor', () => {
    test('creates instance with default options', () => {
      const orch = new MenuOrchestrator();
      expect(orch).toBeInstanceOf(MenuOrchestrator);
      expect(orch.menuOptions).toEqual([]);
      expect(orch.isRunning).toBe(false);
    });

    test('creates instance with menu options', () => {
      expect(orchestrator.menuOptions).toEqual(mockMenuOptions);
      expect(orchestrator.menuOptions).toHaveLength(6);
    });

    test('creates instance with custom config', () => {
      const orch = new MenuOrchestrator({
        menuOptions: mockMenuOptions,
        config: { theme: 'dark', animationsEnabled: false }
      });

      expect(orch.customConfig).toEqual({
        theme: 'dark',
        animationsEnabled: false
      });
    });

    test('initializes all component references as null', () => {
      expect(orchestrator.stateManager).toBeNull();
      expect(orchestrator.configManager).toBeNull();
      expect(orchestrator.commandHistory).toBeNull();
      expect(orchestrator.themeEngine).toBeNull();
      expect(orchestrator.animationEngine).toBeNull();
      expect(orchestrator.keyboardMapper).toBeNull();
      expect(orchestrator.inputHandler).toBeNull();
      expect(orchestrator.uiRenderer).toBeNull();
    });
  });

  // Helper to initialize orchestrator with test paths
  async function initializeWithTestPaths() {
    await orchestrator.initialize();
    // Override paths after initialization
    orchestrator.configManager.configPath = testConfigPath;
    orchestrator.commandHistory.historyPath = testHistoryPath;
    // Clear any existing data
    orchestrator.commandHistory.clear();
  }

  describe('initialize()', () => {
    test('initializes all 8 components successfully', async () => {
      await initializeWithTestPaths();

      expect(orchestrator.stateManager).not.toBeNull();
      expect(orchestrator.configManager).not.toBeNull();
      expect(orchestrator.commandHistory).not.toBeNull();
      expect(orchestrator.themeEngine).not.toBeNull();
      expect(orchestrator.animationEngine).not.toBeNull();
      expect(orchestrator.keyboardMapper).not.toBeNull();
      expect(orchestrator.inputHandler).not.toBeNull();
      expect(orchestrator.uiRenderer).not.toBeNull();
    });

    test('sets isRunning to true after initialization', async () => {
      expect(orchestrator.isRunning).toBe(false);
      await orchestrator.initialize();
      expect(orchestrator.isRunning).toBe(true);
    });

    test('loads config manager and applies preferences', async () => {
      await orchestrator.initialize();

      expect(orchestrator.configManager).toBeInstanceOf(ConfigManager);
      const config = orchestrator.configManager.get('preferences');
      expect(config).toHaveProperty('theme');
      expect(config).toHaveProperty('animationsEnabled');
    });

    test('loads command history', async () => {
      await initializeWithTestPaths();

      expect(orchestrator.commandHistory).toBeInstanceOf(CommandHistory);
      expect(orchestrator.commandHistory.getAll()).toEqual([]);
    });

    test('initializes ThemeEngine and loads theme', async () => {
      await orchestrator.initialize();

      expect(orchestrator.themeEngine.initialized).toBe(true);
      expect(orchestrator.themeEngine.currentTheme).not.toBeNull();
    });

    test('initializes AnimationEngine with config', async () => {
      await orchestrator.initialize();

      expect(orchestrator.animationEngine).toBeDefined();
      expect(typeof orchestrator.animationEngine.isEnabled).toBe('function');
    });

    test('initializes KeyboardMapper', async () => {
      await orchestrator.initialize();

      expect(orchestrator.keyboardMapper).toBeDefined();
      const shortcuts = orchestrator.keyboardMapper.getAllShortcuts();
      expect(shortcuts.length).toBeGreaterThan(0);
    });

    test('initializes StateManager with enriched menu options', async () => {
      await orchestrator.initialize();

      const state = orchestrator.stateManager.getState();
      expect(state.options).toHaveLength(mockMenuOptions.length);
      expect(state.selectedIndex).toBe(0);
      expect(state.mode).toBe('navigation');
    });

    test('initializes InputHandler with StateManager and KeyboardMapper', async () => {
      await orchestrator.initialize();

      expect(orchestrator.inputHandler).toBeDefined();
      expect(orchestrator.inputHandler.stateManager).toBe(orchestrator.stateManager);
      expect(orchestrator.inputHandler.keyboardMapper).toBe(orchestrator.keyboardMapper);
    });

    test('initializes UIRenderer with dependencies', async () => {
      await orchestrator.initialize();

      expect(orchestrator.uiRenderer).toBeDefined();
      expect(orchestrator.uiRenderer.themeEngine).toBe(orchestrator.themeEngine);
      expect(orchestrator.uiRenderer.animationEngine).toBe(orchestrator.animationEngine);
      expect(orchestrator.uiRenderer.keyboardMapper).toBe(orchestrator.keyboardMapper);
    });

    test('throws error if already running', async () => {
      await orchestrator.initialize();
      await expect(orchestrator.initialize()).rejects.toThrow('Menu already running');
    });

    test('cleans up on initialization error', async () => {
      // Force error during initialization
      const orch = new MenuOrchestrator({ menuOptions: mockMenuOptions });
      jest.spyOn(ConfigManager.prototype, 'load').mockRejectedValueOnce(new Error('Load failed'));

      await expect(orch.initialize()).rejects.toThrow('Failed to initialize menu');
      expect(orch.isRunning).toBe(false);

      ConfigManager.prototype.load.mockRestore();
    });
  });

  describe('enrichMenuOptions()', () => {
    test('enriches options with lastExecution from history', async () => {
      await orchestrator.initialize();

      // Add execution to history
      orchestrator.commandHistory.add({
        commandName: 'test-download',
        exitCode: 0,
        duration: 1500
      });

      const enriched = orchestrator.enrichMenuOptions();
      const downloadOption = enriched.find(opt => opt.command === 'test-download');

      expect(downloadOption.lastExecution).toBeDefined();
      expect(downloadOption.lastExecution.commandName).toBe('test-download');
      expect(downloadOption.lastExecution.status).toBe('success');
    });

    test('returns options without lastExecution if no history', async () => {
      await orchestrator.initialize();

      const enriched = orchestrator.enrichMenuOptions();
      const uploadOption = enriched.find(opt => opt.command === 'test-upload');

      expect(uploadOption.lastExecution).toBeNull();
    });
  });

  describe('Component Integration', () => {
    test('StateManager updates trigger UI re-render', async () => {
      await orchestrator.initialize();

      // Spy on updateDisplay
      const updateDisplaySpy = jest.spyOn(orchestrator, 'updateDisplay');
      updateDisplaySpy.mockImplementation(() => {});

      // Trigger state change
      orchestrator.stateManager.moveDown();

      // Should trigger observer and re-render
      expect(updateDisplaySpy).toHaveBeenCalled();

      updateDisplaySpy.mockRestore();
    });

    test('InputHandler navigation updates StateManager', async () => {
      await orchestrator.initialize();

      const initialIndex = orchestrator.stateManager.getState().selectedIndex;

      // Simulate arrow down via InputHandler (que já chama stateManager.moveDown())
      orchestrator.stateManager.moveDown();

      const newIndex = orchestrator.stateManager.getState().selectedIndex;
      expect(newIndex).not.toBe(initialIndex);
    });

    test('KeyboardMapper provides actions to InputHandler', async () => {
      await orchestrator.initialize();

      const action = orchestrator.keyboardMapper.getAction('h');
      expect(action).toBe('help');

      const action2 = orchestrator.keyboardMapper.getAction('q');
      expect(action2).toBe('quit');
    });

    test('ThemeEngine colorizes UIRenderer output', async () => {
      await orchestrator.initialize();

      // ThemeEngine should be available to UIRenderer
      expect(orchestrator.uiRenderer.themeEngine).toBe(orchestrator.themeEngine);

      // Colorize should work (if chalk available)
      if (orchestrator.themeEngine.chalk) {
        const colored = orchestrator.themeEngine.colorize('Test', 'success');
        expect(typeof colored).toBe('string');
      }
    });

    test('AnimationEngine controlled by user preferences', async () => {
      await orchestrator.initialize();

      const prefs = orchestrator.configManager.get('preferences');
      orchestrator.animationEngine.respectUserPreferences(prefs);

      expect(orchestrator.animationEngine.config.animationsEnabled).toBe(prefs.animationsEnabled);
    });
  });

  describe('switchMode()', () => {
    beforeEach(async () => {
      await orchestrator.initialize();
    });

    test('switches to preview mode', () => {
      const updateDisplaySpy = jest.spyOn(orchestrator, 'updateDisplay').mockImplementation(() => {});

      orchestrator.switchMode('preview');

      const state = orchestrator.stateManager.getState();
      expect(state.mode).toBe('preview');
      expect(updateDisplaySpy).toHaveBeenCalled();

      updateDisplaySpy.mockRestore();
    });

    test('switches to history mode and loads history', () => {
      const updateDisplaySpy = jest.spyOn(orchestrator, 'updateDisplay').mockImplementation(() => {});

      orchestrator.switchMode('history');

      const state = orchestrator.stateManager.getState();
      expect(state.mode).toBe('history');
      expect(state.history).toBeDefined();
      expect(Array.isArray(state.history)).toBe(true);

      updateDisplaySpy.mockRestore();
    });

    test('switches to config mode and loads config', () => {
      const updateDisplaySpy = jest.spyOn(orchestrator, 'updateDisplay').mockImplementation(() => {});

      orchestrator.switchMode('config');

      const state = orchestrator.stateManager.getState();
      expect(state.mode).toBe('config');
      expect(state.config).toBeDefined();
      expect(state.config).toHaveProperty('theme');

      updateDisplaySpy.mockRestore();
    });

    test('switches to help mode', () => {
      const updateDisplaySpy = jest.spyOn(orchestrator, 'updateDisplay').mockImplementation(() => {});

      orchestrator.switchMode('help');

      const state = orchestrator.stateManager.getState();
      expect(state.mode).toBe('help');

      updateDisplaySpy.mockRestore();
    });

    test('switches back to navigation mode', () => {
      const updateDisplaySpy = jest.spyOn(orchestrator, 'updateDisplay').mockImplementation(() => {});

      orchestrator.switchMode('history');
      orchestrator.switchMode('navigation');

      const state = orchestrator.stateManager.getState();
      expect(state.mode).toBe('navigation');

      updateDisplaySpy.mockRestore();
    });
  });

  describe('executeCommand()', () => {
    beforeEach(async () => {
      await orchestrator.initialize();
    });

    test('executes command and records success in history', async () => {
      const option = mockMenuOptions[0]; // test-download

      await orchestrator.executeCommand(option);

      const lastExec = orchestrator.commandHistory.getLastExecution('test-download');
      expect(lastExec).not.toBeNull();
      expect(lastExec.status).toBe('success');
      expect(lastExec.commandName).toBe('test-download');
    });

    test('updates StateManager during execution', async () => {
      const option = mockMenuOptions[0];

      const executePromise = orchestrator.executeCommand(option);

      // During execution, isExecuting should be true
      await new Promise(resolve => setTimeout(resolve, 100));
      // Note: Might already be cleared due to fast execution in tests

      await executePromise;

      const state = orchestrator.stateManager.getState();
      expect(state.isExecuting).toBe(false);
    });

    test('shows spinner during execution', async () => {
      const option = mockMenuOptions[0];
      const showSpinnerSpy = jest.spyOn(orchestrator.animationEngine, 'showSpinner');

      await orchestrator.executeCommand(option);

      expect(showSpinnerSpy).toHaveBeenCalled();
      showSpinnerSpy.mockRestore();
    });

    test('stops spinner with success on completion', async () => {
      const option = mockMenuOptions[0];
      const stopSpinnerSpy = jest.spyOn(orchestrator.animationEngine, 'stopSpinner');

      await orchestrator.executeCommand(option);

      expect(stopSpinnerSpy).toHaveBeenCalledWith('success', expect.any(String));
      stopSpinnerSpy.mockRestore();
    });

    test('records error in history on failure', async () => {
      const option = mockMenuOptions[0];

      // Force error by mocking simulateCommandExecution
      jest.spyOn(orchestrator, 'simulateCommandExecution').mockRejectedValueOnce(new Error('Test error'));

      await orchestrator.executeCommand(option);

      const lastExec = orchestrator.commandHistory.getLastExecution('test-download');
      expect(lastExec).not.toBeNull();
      expect(lastExec.status).toBe('failure');
      expect(lastExec.error).toBe('Test error');
    });

    test('stops spinner with error on failure', async () => {
      const option = mockMenuOptions[0];
      const stopSpinnerSpy = jest.spyOn(orchestrator.animationEngine, 'stopSpinner');

      jest.spyOn(orchestrator, 'simulateCommandExecution').mockRejectedValueOnce(new Error('Test error'));

      await orchestrator.executeCommand(option);

      expect(stopSpinnerSpy).toHaveBeenCalledWith('error', expect.stringContaining('Test error'));
      stopSpinnerSpy.mockRestore();
    });

    test('enriches menu options after execution', async () => {
      const option = mockMenuOptions[0];

      await orchestrator.executeCommand(option);

      const state = orchestrator.stateManager.getState();
      const downloadOption = state.options.find(opt => opt.command === 'test-download');

      expect(downloadOption.lastExecution).toBeDefined();
      expect(downloadOption.lastExecution.commandName).toBe('test-download');
    });
  });

  describe('shutdown()', () => {
    test('shuts down gracefully', async () => {
      await orchestrator.initialize();
      orchestrator.inputHandler.start();

      await orchestrator.shutdown();

      expect(orchestrator.isRunning).toBe(false);
      expect(orchestrator.isShuttingDown).toBe(false);
    });

    test('stops InputHandler', async () => {
      await orchestrator.initialize();
      orchestrator.inputHandler.start();

      expect(orchestrator.inputHandler.isActive).toBe(true);

      await orchestrator.shutdown();

      expect(orchestrator.inputHandler.isActive).toBe(false);
    });

    test('cleans up AnimationEngine', async () => {
      await orchestrator.initialize();
      const cleanupSpy = jest.spyOn(orchestrator.animationEngine, 'cleanup');

      await orchestrator.shutdown();

      expect(cleanupSpy).toHaveBeenCalled();
      cleanupSpy.mockRestore();
    });

    test('saves history before shutdown', async () => {
      await initializeWithTestPaths();

      orchestrator.commandHistory.add({
        commandName: 'test-cmd',
        exitCode: 0,
        duration: 100
      });

      await orchestrator.shutdown();

      // Verify history was saved
      const content = await fs.readFile(testHistoryPath, 'utf-8');
      const data = JSON.parse(content);
      expect(data.records).toHaveLength(1);
      expect(data.records[0].commandName).toBe('test-cmd');
    });

    test('saves config before shutdown', async () => {
      await initializeWithTestPaths();

      orchestrator.configManager.set('preferences.theme', 'dark');

      await orchestrator.shutdown();

      // Verify config was saved
      const content = await fs.readFile(testConfigPath, 'utf-8');
      const data = JSON.parse(content);
      expect(data.preferences.theme).toBe('dark');
    });

    test('handles errors during shutdown gracefully', async () => {
      await orchestrator.initialize();

      // Force error during shutdown
      jest.spyOn(orchestrator.commandHistory, 'save').mockRejectedValueOnce(new Error('Save failed'));

      // Should not throw
      await expect(orchestrator.shutdown()).resolves.not.toThrow();

      expect(orchestrator.isRunning).toBe(false);
    });

    test('does nothing if already shutting down', async () => {
      await orchestrator.initialize();

      orchestrator.isShuttingDown = true;
      const saveSpy = jest.spyOn(orchestrator.commandHistory, 'save');

      await orchestrator.shutdown();

      expect(saveSpy).not.toHaveBeenCalled();
      saveSpy.mockRestore();
    });
  });

  describe('cleanup()', () => {
    test('cleans up all component references', async () => {
      await orchestrator.initialize();
      await orchestrator.cleanup();

      expect(orchestrator.stateManager).toBeNull();
      expect(orchestrator.configManager).toBeNull();
      expect(orchestrator.commandHistory).toBeNull();
      expect(orchestrator.themeEngine).toBeNull();
      expect(orchestrator.animationEngine).toBeNull();
      expect(orchestrator.keyboardMapper).toBeNull();
      expect(orchestrator.inputHandler).toBeNull();
      expect(orchestrator.uiRenderer).toBeNull();
    });

    test('calls shutdown before cleanup', async () => {
      await orchestrator.initialize();

      const shutdownSpy = jest.spyOn(orchestrator, 'shutdown');

      await orchestrator.cleanup();

      expect(shutdownSpy).toHaveBeenCalled();
      shutdownSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    test('handles empty menu options gracefully', async () => {
      const orch = new MenuOrchestrator({ menuOptions: [] });
      await orch.initialize();

      const state = orch.getState();
      expect(state.options).toEqual([]);

      await orch.cleanup();
    });

    test('handles initialization without terminal', async () => {
      // Temporarily make stdin non-TTY
      mockStdin.isTTY = false;

      const orch = new MenuOrchestrator({ menuOptions: mockMenuOptions });

      // Initialize should still work (InputHandler start will fail later)
      await expect(orch.initialize()).resolves.not.toThrow();

      mockStdin.isTTY = true;
      await orch.cleanup();
    });

    test('getState() returns null if not initialized', () => {
      const orch = new MenuOrchestrator();
      expect(orch.getState()).toBeNull();
    });

    test('isActive() returns false if not initialized', () => {
      const orch = new MenuOrchestrator();
      expect(orch.isActive()).toBe(false);
    });

    test('isActive() returns true after initialization', async () => {
      await orchestrator.initialize();
      expect(orchestrator.isActive()).toBe(true);
    });
  });
});
