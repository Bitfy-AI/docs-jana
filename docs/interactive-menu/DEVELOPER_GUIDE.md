# Interactive Menu - Developer Guide

> Comprehensive guide for contributors and maintainers of the interactive menu system

This guide provides in-depth technical information about the interactive menu architecture, component design, and extension patterns.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Component Reference](#component-reference)
- [Extension Guide](#extension-guide)
- [Testing Guidelines](#testing-guidelines)
- [Design Patterns](#design-patterns)
- [Best Practices](#best-practices)

---

## Architecture Overview

### System Architecture

The interactive menu follows a **modular, component-based architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────┐
│                   MenuOrchestrator                      │
│              (Central Coordinator)                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌─────────────┐       │
│  │ State      │  │ Config     │  │ History     │       │
│  │ Manager    │  │ Manager    │  │ Manager     │       │
│  └────────────┘  └────────────┘  └─────────────┘       │
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌─────────────┐       │
│  │ Theme      │  │ Animation  │  │ Keyboard    │       │
│  │ Engine     │  │ Engine     │  │ Mapper      │       │
│  └────────────┘  └────────────┘  └─────────────┘       │
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌─────────────┐       │
│  │ Input      │  │ UI         │  │ Command     │       │
│  │ Handler    │  │ Renderer   │  │ Executor    │       │
│  └────────────┘  └────────────┘  └─────────────┘       │
│                                                          │
│  ┌────────────┐  ┌────────────┐                        │
│  │ Error      │  │ Menu       │                        │
│  │ Handler    │  │ Logger     │                        │
│  └────────────┘  └────────────┘                        │
└─────────────────────────────────────────────────────────┘
```

### Component Categories

#### 1. Core Components (7)
- **MenuOrchestrator**: Central coordinator
- **StateManager**: State management
- **InputHandler**: User input capture
- **UIRenderer**: Visual rendering
- **ConfigManager**: User preferences
- **CommandHistory**: Execution tracking
- **CommandExecutor**: Command execution

#### 2. UI Components (3)
- **ThemeEngine**: Color and theming
- **AnimationEngine**: Animations and spinners
- **KeyboardMapper**: Shortcut management

#### 3. Utility Components (2)
- **ErrorHandler**: Centralized error handling
- **MenuLogger**: Logging and diagnostics

### Data Flow

```
User Input → InputHandler → StateManager → MenuOrchestrator
                                                ↓
                                          [Decision]
                                                ↓
                           ┌────────────────────┴────────────────────┐
                           ↓                                         ↓
                     UIRenderer                              CommandExecutor
                           ↓                                         ↓
                    Terminal Output                         index.js (Orchestration)
                                                                     ↓
                                                            Command Handlers
                                                                     ↓
                                                            ExecutionResult
                                                                     ↓
                                                            CommandHistory
```

### File Structure

```
src/ui/menu/
├── components/              # Core components (7 files)
│   ├── CommandExecutor.js   # Command execution wrapper
│   ├── CommandHistory.js    # Execution history tracking
│   ├── ConfigManager.js     # User preferences management
│   ├── InputHandler.js      # Input capture and processing
│   ├── MenuOrchestrator.js  # Central coordinator
│   ├── StateManager.js      # State management
│   └── UIRenderer.js        # Visual rendering
│
├── utils/                   # Utility components (5 files)
│   ├── AnimationEngine.js   # Animations and spinners
│   ├── ErrorHandler.js      # Error handling
│   ├── KeyboardMapper.js    # Keyboard shortcuts
│   ├── MenuLogger.js        # Logging system
│   └── ThemeEngine.js       # Theme and colors
│
├── themes/                  # Theme definitions (4 files)
│   ├── default.js           # Default theme
│   ├── dark.js              # Dark theme
│   ├── light.js             # Light theme
│   └── high-contrast.js     # High contrast theme
│
├── config/                  # Configuration
│   └── menu-options.js      # Menu options definition
│
├── index.js                 # Public API entry point
└── README.md                # Module documentation
```

---

## Component Reference

### 1. MenuOrchestrator

**Purpose:** Central coordinator that manages the entire menu lifecycle

**Location:** `src/ui/menu/components/MenuOrchestrator.js`

**Responsibilities:**
- Initialize all 11 components
- Coordinate navigation flow
- Handle mode transitions (navigation, preview, history, config, help)
- Execute commands via CommandExecutor
- Manage graceful shutdown

**Key Methods:**

```javascript
class MenuOrchestrator {
  async initialize()       // Initialize all components
  async start()            // Start menu loop
  async handleInput(input) // Process user input
  async executeCommand()   // Execute selected command
  switchMode(mode)         // Change menu mode
  shutdown()               // Graceful cleanup
}
```

**Integration Example:**

```javascript
const { MenuOrchestrator } = require('./src/ui/menu');

const menu = new MenuOrchestrator({
  menuOptions: customOptions,  // Optional: custom menu options
  config: customConfig          // Optional: custom configuration
});

await menu.initialize();
await menu.start();
```

### 2. StateManager

**Purpose:** Manage menu state and notify observers

**Location:** `src/ui/menu/components/StateManager.js`

**Responsibilities:**
- Track selected option index
- Manage current mode (navigation, preview, history, config, help)
- Handle circular navigation
- Notify observers of state changes
- Enrich options with execution history

**Key Methods:**

```javascript
class StateManager {
  getState()                    // Get current state
  setSelectedIndex(index)       // Update selection
  moveUp()                      // Navigate up (circular)
  moveDown()                    // Navigate down (circular)
  setMode(mode)                 // Change mode
  subscribe(callback)           // Register observer
  enrichOptionsWithHistory()    // Add history data to options
}
```

**State Structure:**

```javascript
{
  options: MenuOption[],        // Menu options
  selectedIndex: number,        // Currently selected index
  mode: 'navigation' | 'preview' | 'history' | 'config' | 'help',
  isExecuting: boolean,         // Command execution flag
  currentCommand: string | null // Command being executed
}
```

### 3. InputHandler

**Purpose:** Capture and process user keyboard input

**Location:** `src/ui/menu/components/InputHandler.js`

**Responsibilities:**
- Configure stdin for raw mode
- Map key sequences to actions
- Support arrow keys, Enter, Escape
- Detect terminal interactivity
- Process keyboard shortcuts

**Key Methods:**

```javascript
class InputHandler {
  start()                       // Start capturing input
  stop()                        // Stop capturing input
  waitForInput()                // Wait for next keypress
  isInteractive()               // Check if terminal is interactive
  parseKeySequence(buffer)      // Parse key buffer to action
}
```

**Key Mappings:**

```javascript
const KEY_SEQUENCES = {
  '\x1b[A': 'arrow-up',         // ↑
  '\x1b[B': 'arrow-down',       // ↓
  '\r': 'enter',                 // Enter
  '\x1b': 'escape',              // Esc
  // ... character keys (a-z, 0-9)
};
```

### 4. UIRenderer

**Purpose:** Render visual interface to terminal

**Location:** `src/ui/menu/components/UIRenderer.js`

**Responsibilities:**
- Render menu header
- Render options list with selection highlight
- Render descriptions and previews
- Render history, config, and help screens
- Apply themes and colors
- Handle terminal width constraints

**Key Methods:**

```javascript
class UIRenderer {
  renderMenu(state)             // Render complete menu
  renderHeader()                // Render title
  renderOptions(opts, idx)      // Render option list
  renderDescription(option)     // Render description
  renderPreviewMode(option)     // Render preview screen
  renderHistoryMode(history)    // Render history screen
  renderConfigMode(config)      // Render config screen
  renderHelpMode()              // Render help screen
  clear()                       // Clear terminal
}
```

**Rendering Pipeline:**

```
1. Clear terminal
2. Render header (title, version)
3. Render options (with highlight)
4. Render description (selected option)
5. Render footer (keyboard hints)
```

### 5. ThemeEngine

**Purpose:** Manage colors, themes, and accessibility

**Location:** `src/ui/menu/utils/ThemeEngine.js`

**Responsibilities:**
- Apply semantic colors (success, error, warning, info)
- Load and validate themes
- Calculate contrast ratios (WCAG compliance)
- Detect terminal color support
- Provide fallback for limited terminals

**Key Methods:**

```javascript
class ThemeEngine {
  loadTheme(themeName)          // Load theme
  colorize(text, type)          // Apply semantic color
  format(text, format)          // Apply text formatting
  detectColorSupport()          // Detect color capabilities
  validateContrast(fg, bg)      // Check WCAG compliance
}
```

**Color Types:**

```javascript
type ColorType =
  | 'primary'     // Blue - main actions
  | 'success'     // Green - successful operations
  | 'error'       // Red - errors and failures
  | 'warning'     // Yellow - warnings
  | 'info'        // Cyan - informational
  | 'highlight'   // Violet - active selection
  | 'muted'       // Gray - secondary info
  | 'destructive' // Dark red - destructive actions
```

### 6. AnimationEngine

**Purpose:** Manage animations and loading indicators

**Location:** `src/ui/menu/utils/AnimationEngine.js`

**Responsibilities:**
- Display spinners during async operations
- Animate success/error feedback
- Control animation speed and timing
- Disable animations in non-interactive environments
- Maintain 60fps performance

**Key Methods:**

```javascript
class AnimationEngine {
  withSpinner(msg, fn)          // Execute with spinner
  animateSuccess()              // Success animation
  animateError()                // Error animation
  animateFadeIn()               // Fade-in animation
  isEnabled()                   // Check if enabled
  setEnabled(enabled)           // Enable/disable animations
}
```

**Animation Speeds:**

```javascript
const SPEEDS = {
  slow: 500,      // 500ms per animation
  normal: 300,    // 300ms per animation
  fast: 150       // 150ms per animation
};
```

### 7. KeyboardMapper

**Purpose:** Map keyboard shortcuts to actions

**Location:** `src/ui/menu/utils/KeyboardMapper.js`

**Responsibilities:**
- Register keyboard shortcuts
- Resolve key presses to actions
- Detect shortcut conflicts
- Provide shortcut documentation

**Key Methods:**

```javascript
class KeyboardMapper {
  registerShortcut(key, action) // Register shortcut
  unregisterShortcut(key)       // Remove shortcut
  getAction(key)                // Get action for key
  getAllShortcuts()             // List all shortcuts
  isAvailable(key)              // Check if key is free
}
```

**Default Shortcuts:**

```javascript
const DEFAULT_SHORTCUTS = {
  'd': 'n8n:download',
  'u': 'n8n:upload',
  'o': 'outline:download',
  'h': 'history',
  's': 'config',
  '?': 'help',
  'q': 'exit',
  'r': 'rerun'
};
```

### 8. ConfigManager

**Purpose:** Manage user preferences and persistence

**Location:** `src/ui/menu/components/ConfigManager.js`

**Responsibilities:**
- Load/save configuration from `~/.docs-jana/config.json`
- Validate configuration values
- Provide default values
- Reset to defaults

**Key Methods:**

```javascript
class ConfigManager {
  async load()                  // Load from file
  async save(prefs)             // Save to file
  get(key)                      // Get value
  set(key, value)               // Set value
  reset()                       // Reset to defaults
}
```

**Configuration Schema:**

```javascript
interface UserPreferences {
  theme: 'default' | 'dark' | 'light' | 'high-contrast';
  animationsEnabled: boolean;
  animationSpeed: 'slow' | 'normal' | 'fast';
  iconsEnabled: boolean;
  showDescriptions: boolean;
  showPreviews: boolean;
  historySize: number;          // 10-100
}
```

### 9. CommandHistory

**Purpose:** Track and persist command execution history

**Location:** `src/ui/menu/components/CommandHistory.js`

**Responsibilities:**
- Record command executions
- Limit history size (FIFO)
- Persist to `~/.docs-jana/history.json`
- Provide history queries
- Calculate statistics

**Key Methods:**

```javascript
class CommandHistory {
  add(record)                   // Add execution record
  getAll()                      // Get all records
  getRecent(count)              // Get last N records
  getLastExecution(cmdName)     // Get last execution of command
  getStatistics()               // Calculate stats
  clear()                       // Clear history
  async save()                  // Persist to file
  async load()                  // Load from file
}
```

**Execution Record:**

```javascript
interface ExecutionRecord {
  commandName: string;          // Command executed
  timestamp: string;            // ISO 8601 timestamp
  status: 'success' | 'failure';
  duration: number;             // Milliseconds
  error?: string;               // Error message if failed
}
```

### 10. CommandExecutor

**Purpose:** Execute commands via orchestration layer

**Location:** `src/ui/menu/components/CommandExecutor.js`

**Responsibilities:**
- Validate commands before execution
- Execute via `index.js` orchestration layer
- Capture timing and results
- Return structured execution results
- Support batch execution

**Key Methods:**

```javascript
class CommandExecutor {
  async execute(cmdName, opts)  // Execute single command
  async executeMany(commands)   // Execute multiple commands
  validate(cmdName)             // Validate command exists
}
```

**Execution Result:**

```javascript
interface ExecutionResult {
  success: boolean;             // Execution status
  message: string;              // Result message
  timestamp: Date;              // Execution time
  duration: number;             // Duration in ms
  data?: any;                   // Command output data
  error?: Error;                // Error if failed
}
```

### 11. ErrorHandler

**Purpose:** Centralized error handling and recovery

**Location:** `src/ui/menu/utils/ErrorHandler.js`

**Responsibilities:**
- Categorize errors (user-input, system, command-execution, runtime)
- Format user-friendly error messages
- Provide recovery strategies
- Log errors with context

**Key Methods:**

```javascript
class ErrorHandler {
  handle(error, context)        // Handle error
  recover(error, fallback)      // Recover gracefully
  formatUserMessage(error)      // Format for display
  categorizeError(error)        // Determine error type
}
```

**Error Categories:**

```javascript
type ErrorCategory =
  | 'user-input'        // Invalid input, validation errors
  | 'system'            // File system, permissions
  | 'command-execution' // Command failures
  | 'runtime'           // Unexpected exceptions
```

### 12. MenuLogger

**Purpose:** Logging and performance diagnostics

**Location:** `src/ui/menu/utils/MenuLogger.js`

**Responsibilities:**
- Multi-level logging (debug, info, warn, error)
- Performance timing
- Debug mode control
- Color-coded output

**Key Methods:**

```javascript
class MenuLogger {
  debug(msg, ctx)               // Debug logging
  info(msg, ctx)                // Info logging
  warn(msg, ctx)                // Warning logging
  error(msg, err, ctx)          // Error logging
  startTimer(label)             // Start performance timer
  endTimer(label)               // End performance timer
}
```

**Log Levels:**

```javascript
const LOG_LEVELS = {
  debug: 0,     // Detailed diagnostics (DEBUG=true only)
  info: 1,      // General information
  warn: 2,      // Warnings
  error: 3      // Errors
};
```

---

## Extension Guide

### Adding New Menu Options

1. **Define Option** in `src/ui/menu/config/menu-options.js`:

```javascript
const NEW_OPTION = {
  key: '7',
  command: 'my-command',
  label: 'My Custom Command',
  description: 'Detailed description of what this does',
  icon: '🚀',
  category: 'action',           // action, info, destructive, utility
  shortcut: 'm',
  preview: {
    shellCommand: 'docs-jana my-command --arg value',
    affectedPaths: ['./output/'],
    estimatedDuration: 5,
    warning: null               // or warning message
  }
};

// Add to MENU_OPTIONS array
MENU_OPTIONS.push(NEW_OPTION);
```

2. **Implement Command Handler** in `src/commands/my-command.js`:

```javascript
const BaseCommand = require('./base-command');

class MyCommand extends BaseCommand {
  constructor(services) {
    super(services);
  }

  async execute(args, flags) {
    // Implementation
    return {
      success: true,
      message: 'Command completed successfully'
    };
  }
}

module.exports = MyCommand;
```

3. **Register in index.js** (if needed):

```javascript
// ServiceContainer already handles dynamic command loading
// Just ensure command file follows naming convention
```

### Creating Custom Themes

1. **Create Theme File** in `src/ui/menu/themes/my-theme.js`:

```javascript
module.exports = {
  name: 'my-theme',
  colors: {
    primary: '#3b82f6',         // Blue
    success: '#10b981',         // Green
    error: '#ef4444',           // Red
    warning: '#f59e0b',         // Amber
    info: '#06b6d4',            // Cyan
    highlight: '#8b5cf6',       // Violet
    muted: '#6b7280',           // Gray
    destructive: '#dc2626'      // Dark red
  },
  backgrounds: {
    selected: '#3b82f6',        // Selection background
    normal: 'transparent'
  },
  contrastRatios: {
    minRatio: 4.5,              // WCAG AA compliance
    largeTextRatio: 3.0
  }
};
```

2. **Validate Contrast** using ThemeEngine:

```javascript
const themeEngine = new ThemeEngine();
const theme = require('./themes/my-theme');

// Validate contrast ratios
const isValid = themeEngine.validateContrast(
  theme.colors.primary,
  theme.backgrounds.normal
);

if (!isValid) {
  console.warn('Theme does not meet WCAG AA standards');
}
```

3. **Register Theme** in ConfigManager:

```javascript
// Update UserPreferences type to include new theme
theme: 'default' | 'dark' | 'light' | 'high-contrast' | 'my-theme'
```

### Extending UI Renderer

To add new rendering modes:

1. **Add Mode** to StateManager:

```javascript
type MenuMode = 'navigation' | 'preview' | 'history' | 'config' | 'help' | 'my-mode';
```

2. **Implement Renderer** in UIRenderer:

```javascript
class UIRenderer {
  // ... existing methods

  /**
   * Render my custom mode
   * @param {Object} data - Mode-specific data
   */
  renderMyMode(data) {
    this.clear();
    this.renderHeader();

    // Custom rendering logic
    console.log('╔════════════════════════════════════╗');
    console.log('║  My Custom Mode                    ║');
    console.log('╠════════════════════════════════════╣');
    // ...
    console.log('╚════════════════════════════════════╝');

    this.renderFooter(['Esc: Back']);
  }
}
```

3. **Add Mode Switcher** in MenuOrchestrator:

```javascript
class MenuOrchestrator {
  // ... existing methods

  /**
   * Show custom mode
   */
  async showMyMode() {
    this.currentMode = 'my-mode';
    this.stateManager.setMode('my-mode');

    const data = await this.fetchMyModeData();
    this.uiRenderer.renderMyMode(data);
  }
}
```

### Adding Keyboard Shortcuts

1. **Register Shortcut** in KeyboardMapper:

```javascript
// In MenuOrchestrator.initialize()
this.keyboardMapper.registerShortcut('x', 'my-custom-action');
```

2. **Handle Shortcut** in MenuOrchestrator:

```javascript
async handleShortcut(key) {
  const action = this.keyboardMapper.getAction(key);

  switch (action) {
    case 'my-custom-action':
      await this.executeMyCustomAction();
      break;
    // ... existing cases
  }
}
```

3. **Document Shortcut** in help mode (UIRenderer):

```javascript
renderHelpMode() {
  // ... existing shortcuts
  console.log('  x          My custom action');
}
```

---

## Testing Guidelines

### Unit Testing

Test individual components in isolation:

```javascript
// __tests__/unit/menu/StateManager.test.js
const StateManager = require('../../../src/ui/menu/components/StateManager');

describe('StateManager', () => {
  let stateManager;

  beforeEach(() => {
    stateManager = new StateManager([/* options */]);
  });

  test('should navigate up circularly', () => {
    stateManager.setSelectedIndex(0);
    stateManager.moveUp();
    expect(stateManager.getState().selectedIndex).toBe(/* last index */);
  });

  test('should notify observers on state change', () => {
    const observer = jest.fn();
    stateManager.subscribe(observer);
    stateManager.moveDown();
    expect(observer).toHaveBeenCalled();
  });
});
```

### Integration Testing

Test component interactions:

```javascript
// __tests__/integration/menu/menu-integration.test.js
describe('Menu Integration', () => {
  test('should execute command flow', async () => {
    const orchestrator = new MenuOrchestrator();
    await orchestrator.initialize();

    // Simulate navigation
    await orchestrator.handleInput({ type: 'arrow-down' });

    // Simulate selection
    await orchestrator.handleInput({ type: 'enter' });

    // Verify command execution
    expect(/* command executed */).toBeTruthy();
  });
});
```

### E2E Testing

Test complete user flows:

```javascript
// __tests__/e2e/menu-flow.test.js
describe('Menu E2E', () => {
  test('complete navigation and execution flow', async () => {
    // Mock stdin for input simulation
    const mockStdin = createMockStdin();

    // Start menu
    const menu = new MenuOrchestrator();
    await menu.start();

    // Simulate user actions
    mockStdin.send('\x1b[B'); // Arrow down
    mockStdin.send('\r');      // Enter

    // Verify result
    expect(/* execution successful */).toBeTruthy();
  });
});
```

### Performance Testing

Validate performance requirements:

```javascript
// __tests__/performance/menu-performance.test.js
describe('Menu Performance', () => {
  test('should render within 200ms', async () => {
    const start = performance.now();

    const orchestrator = new MenuOrchestrator();
    await orchestrator.initialize();

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(200);
  });

  test('should respond to navigation within 50ms', async () => {
    const orchestrator = new MenuOrchestrator();
    await orchestrator.initialize();

    const start = performance.now();
    await orchestrator.handleInput({ type: 'arrow-down' });
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(50);
  });
});
```

### Accessibility Testing

Validate WCAG compliance:

```javascript
// __tests__/accessibility/menu-accessibility.test.js
describe('Menu Accessibility', () => {
  test('should meet WCAG AA contrast requirements', () => {
    const themeEngine = new ThemeEngine();
    const theme = require('../../../src/ui/menu/themes/default');

    const ratio = themeEngine.validateContrast(
      theme.colors.primary,
      theme.backgrounds.normal
    );

    expect(ratio).toBeGreaterThanOrEqual(4.5); // WCAG AA
  });
});
```

---

## Design Patterns

### 1. Observer Pattern (State Management)

StateManager notifies observers of state changes:

```javascript
class StateManager {
  constructor(options) {
    this.observers = [];
  }

  subscribe(callback) {
    this.observers.push(callback);
    return () => {
      this.observers = this.observers.filter(cb => cb !== callback);
    };
  }

  notifyObservers() {
    this.observers.forEach(observer => observer(this.state));
  }

  moveDown() {
    // Update state
    this.notifyObservers(); // Notify all observers
  }
}
```

### 2. Strategy Pattern (Theme Engine)

Different themes implement the same interface:

```javascript
// Each theme file exports the same structure
module.exports = {
  name: string,
  colors: ColorPalette,
  backgrounds: BackgroundColors,
  contrastRatios: ContrastConfig
};

// ThemeEngine loads and applies any theme
class ThemeEngine {
  loadTheme(themeName) {
    this.currentTheme = require(`../themes/${themeName}`);
  }
}
```

### 3. Command Pattern (Keyboard Shortcuts)

Keyboard shortcuts map to command objects:

```javascript
class KeyboardMapper {
  registerShortcut(key, action) {
    this.shortcuts.set(key, {
      key,
      action,
      execute: () => this.executeAction(action)
    });
  }
}
```

### 4. Facade Pattern (MenuOrchestrator)

MenuOrchestrator provides a simple interface to complex subsystems:

```javascript
class MenuOrchestrator {
  async start() {
    // Hides complexity of 11 component initialization
    await this.initialize();
    await this.runNavigationLoop();
  }
}
```

### 5. Dependency Injection

Components receive dependencies via constructor:

```javascript
class UIRenderer {
  constructor(themeEngine, animationEngine) {
    this.themeEngine = themeEngine;
    this.animationEngine = animationEngine;
  }
}

// In MenuOrchestrator
this.uiRenderer = new UIRenderer(
  this.themeEngine,
  this.animationEngine
);
```

---

## Best Practices

### Code Organization

1. **One Component per File**: Each component in its own file
2. **Clear Exports**: Export only necessary public APIs
3. **Documentation**: JSDoc comments for all public methods
4. **Type Safety**: Use JSDoc types for better IDE support

### Error Handling

1. **Always Use ErrorHandler**: Don't throw errors directly
2. **Provide Context**: Include relevant context in error handling
3. **User-Friendly Messages**: Translate technical errors to user-friendly messages
4. **Graceful Degradation**: Always have fallback behavior

```javascript
// Good
try {
  await riskyOperation();
} catch (error) {
  const response = this.errorHandler.handle(error, {
    operation: 'riskyOperation',
    context: 'menu initialization'
  });
  console.error(response.userMessage);
}

// Bad
try {
  await riskyOperation();
} catch (error) {
  throw error; // No context, no user-friendly message
}
```

### Performance

1. **Lazy Loading**: Initialize components only when needed
2. **Debouncing**: Debounce rapid user actions
3. **Efficient Rendering**: Only re-render changed parts
4. **Memory Management**: Clean up resources on shutdown

```javascript
// Good: Debounced navigation
const debouncedRender = debounce(() => {
  this.uiRenderer.renderMenu(this.stateManager.getState());
}, 50);

// Bad: Render on every keypress
this.uiRenderer.renderMenu(state); // Too frequent
```

### Testing

1. **Mock External Dependencies**: Mock inquirer, chalk, ora
2. **Test Edge Cases**: Empty arrays, null values, errors
3. **Test Accessibility**: Validate contrast, keyboard-only
4. **Test Performance**: Measure and validate timing

### Documentation

1. **JSDoc All Public APIs**: Use JSDoc for IntelliSense
2. **Example Usage**: Provide code examples
3. **Architecture Docs**: Keep this guide up to date
4. **Inline Comments**: Explain complex logic

```javascript
/**
 * Execute a command via the orchestration layer
 * @param {string} commandName - Name of command to execute
 * @param {Object} options - Command options
 * @param {Object} options.args - Command arguments
 * @param {Object} options.flags - Command flags
 * @returns {Promise<ExecutionResult>} Execution result
 * @example
 * const result = await executor.execute('n8n:download', {
 *   args: [],
 *   flags: { output: './workflows' }
 * });
 */
async execute(commandName, options = {}) {
  // ...
}
```

---

## Common Development Tasks

### Adding a New Component

1. Create file: `src/ui/menu/components/MyComponent.js`
2. Implement class with clear responsibilities
3. Add JSDoc documentation
4. Write unit tests: `__tests__/unit/menu/MyComponent.test.js`
5. Integrate in MenuOrchestrator
6. Update this guide

### Modifying UI Rendering

1. Locate method in UIRenderer
2. Test changes in isolation
3. Validate terminal width handling
4. Test with different themes
5. Verify accessibility (contrast)

### Debugging Issues

1. Enable debug mode: `DEBUG=true docs-jana --interactive`
2. Check logs for component initialization
3. Verify state transitions in StateManager
4. Check error categorization in ErrorHandler
5. Review performance timings

---

## Contributing Guidelines

### Code Style

- Use meaningful variable names
- Follow existing patterns
- Keep functions small and focused
- Write self-documenting code

### Pull Request Process

1. Fork repository
2. Create feature branch
3. Implement changes with tests
4. Update documentation
5. Submit PR with clear description

### Review Checklist

- [ ] Code follows style guide
- [ ] All tests pass
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] Performance requirements met
- [ ] Accessibility validated
- [ ] No breaking changes (or documented)

---

## Resources

### Internal Documentation

- [User Guide](./USER_GUIDE.md) - End-user documentation
- [API Reference](./API_REFERENCE.md) - Detailed API documentation
- [Migration Guide](./MIGRATION_GUIDE.md) - Upgrade guide

### External Resources

- [Inquirer.js](https://github.com/SBoudrias/Inquirer.js) - Interactive prompts
- [Chalk](https://github.com/chalk/chalk) - Terminal colors
- [Ora](https://github.com/sindresorhus/ora) - Spinners and animations
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/) - Accessibility standards

### Related Specs

- [Requirements](../../.claude/specs/interactive-menu-enhancement/requirements.md)
- [Design Document](../../.claude/specs/interactive-menu-enhancement/design.md)
- [Implementation Tasks](../../.claude/specs/interactive-menu-enhancement/tasks.md)

---

**Last Updated:** 2025-10-01
**Version:** 1.0.0
**Maintainers:** Docs-Jana Team

---

Made with ❤️ by the Docs-Jana team
