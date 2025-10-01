# Interactive Menu - API Reference

> Complete API documentation for all interactive menu components

This document provides detailed API documentation for all public classes, methods, and interfaces in the interactive menu system.

---

## Table of Contents

- [Core API](#core-api)
  - [MenuOrchestrator](#menuorchestrator)
  - [StateManager](#statemanager)
  - [InputHandler](#inputhandler)
  - [UIRenderer](#uirenderer)
- [Configuration API](#configuration-api)
  - [ConfigManager](#configmanager)
  - [CommandHistory](#commandhistory)
- [UI Utilities API](#ui-utilities-api)
  - [ThemeEngine](#themeengine)
  - [AnimationEngine](#animationengine)
  - [KeyboardMapper](#keyboardmapper)
- [Execution API](#execution-api)
  - [CommandExecutor](#commandexecutor)
- [Support API](#support-api)
  - [ErrorHandler](#errorhandler)
  - [MenuLogger](#menulogger)
- [Type Definitions](#type-definitions)
- [Configuration Schemas](#configuration-schemas)
- [Event System](#event-system)

---

## Core API

### MenuOrchestrator

**Purpose:** Central coordinator that manages the entire menu lifecycle

**Location:** `src/ui/menu/components/MenuOrchestrator.js`

#### Constructor

```javascript
new MenuOrchestrator(options?: MenuOrchestratorOptions)
```

**Parameters:**
- `options` (Object, optional): Configuration options
  - `menuOptions` (Array, optional): Custom menu options
  - `config` (Object, optional): Custom configuration

**Example:**
```javascript
const { MenuOrchestrator } = require('./src/ui/menu');

const menu = new MenuOrchestrator({
  menuOptions: customMenuOptions,
  config: { theme: 'dark' }
});
```

#### Methods

##### `async initialize()`

Initialize all menu components (11 total).

**Returns:** `Promise<void>`

**Throws:**
- `Error` if menu is already running

**Example:**
```javascript
await menu.initialize();
```

---

##### `async start()`

Start the interactive menu navigation loop.

**Returns:** `Promise<void>`

**Description:**
- Calls `initialize()` if not already done
- Starts input capture
- Renders initial menu
- Enters navigation loop

**Example:**
```javascript
await menu.start();
```

---

##### `async handleInput(input: UserInput): Promise<void>`

Process user input and update menu state.

**Parameters:**
- `input` (UserInput): User input object
  - `type` (string): Input type ('arrow-up', 'arrow-down', 'enter', etc.)
  - `key` (string, optional): Key pressed

**Example:**
```javascript
await menu.handleInput({
  type: 'arrow-down',
  key: undefined
});
```

---

##### `async executeCommand(commandName?: string): Promise<ExecutionResult>`

Execute a command.

**Parameters:**
- `commandName` (string, optional): Command to execute (defaults to selected option)

**Returns:** `Promise<ExecutionResult>`

**Example:**
```javascript
const result = await menu.executeCommand('n8n:download');
console.log(result.success); // true/false
```

---

##### `switchMode(mode: MenuMode)`

Switch to a different menu mode.

**Parameters:**
- `mode` (MenuMode): Target mode
  - `'navigation'`: Browse and select commands
  - `'preview'`: Show command preview
  - `'history'`: View command history
  - `'config'`: Edit configuration
  - `'help'`: Show help screen

**Example:**
```javascript
menu.switchMode('history');
```

---

##### `shutdown()`

Gracefully shutdown the menu.

**Description:**
- Removes signal handlers
- Stops input capture
- Saves history and configuration
- Cleans up resources

**Example:**
```javascript
menu.shutdown();
```

---

### StateManager

**Purpose:** Manage menu state and notify observers

**Location:** `src/ui/menu/components/StateManager.js`

#### Constructor

```javascript
new StateManager(options: MenuOption[])
```

**Parameters:**
- `options` (Array): Menu options to display

#### Methods

##### `getState(): MenuState`

Get current menu state.

**Returns:** `MenuState` object

**Example:**
```javascript
const state = stateManager.getState();
console.log(state.selectedIndex); // 0
console.log(state.mode); // 'navigation'
```

---

##### `getSelectedOption(): MenuOption`

Get currently selected menu option.

**Returns:** `MenuOption`

**Example:**
```javascript
const option = stateManager.getSelectedOption();
console.log(option.command); // 'n8n:download'
```

---

##### `setSelectedIndex(index: number)`

Set selected index (with validation).

**Parameters:**
- `index` (number): New index (0-based)

**Throws:**
- `Error` if index is out of bounds

**Example:**
```javascript
stateManager.setSelectedIndex(2);
```

---

##### `moveUp()`

Move selection up (circular navigation).

**Description:**
- Moves to previous option
- Wraps to last option if at first

**Example:**
```javascript
stateManager.moveUp();
```

---

##### `moveDown()`

Move selection down (circular navigation).

**Description:**
- Moves to next option
- Wraps to first option if at last

**Example:**
```javascript
stateManager.moveDown();
```

---

##### `setMode(mode: MenuMode)`

Set current menu mode.

**Parameters:**
- `mode` (MenuMode): New mode

**Example:**
```javascript
stateManager.setMode('preview');
```

---

##### `setExecuting(commandName: string)`

Mark command as executing.

**Parameters:**
- `commandName` (string): Command being executed

**Example:**
```javascript
stateManager.setExecuting('n8n:download');
```

---

##### `clearExecuting()`

Clear executing state.

**Example:**
```javascript
stateManager.clearExecuting();
```

---

##### `subscribe(callback: StateObserver): UnsubscribeFunction`

Register state change observer.

**Parameters:**
- `callback` (Function): Observer function `(state: MenuState) => void`

**Returns:** Unsubscribe function

**Example:**
```javascript
const unsubscribe = stateManager.subscribe((state) => {
  console.log('State changed:', state);
});

// Later: unsubscribe()
```

---

##### `enrichOptionsWithHistory(history: CommandHistory)`

Enrich menu options with execution history data.

**Parameters:**
- `history` (CommandHistory): Command history instance

**Example:**
```javascript
stateManager.enrichOptionsWithHistory(commandHistory);
```

---

### InputHandler

**Purpose:** Capture and process keyboard input

**Location:** `src/ui/menu/components/InputHandler.js`

#### Constructor

```javascript
new InputHandler()
```

#### Methods

##### `start()`

Start capturing input (sets stdin to raw mode).

**Example:**
```javascript
inputHandler.start();
```

---

##### `stop()`

Stop capturing input (restores stdin).

**Example:**
```javascript
inputHandler.stop();
```

---

##### `async waitForInput(): Promise<UserInput>`

Wait for next user input.

**Returns:** `Promise<UserInput>`

**Example:**
```javascript
const input = await inputHandler.waitForInput();
console.log(input.type); // 'arrow-down'
```

---

##### `isInteractive(): boolean`

Check if terminal is interactive.

**Returns:** `boolean`

**Example:**
```javascript
if (inputHandler.isInteractive()) {
  // Show interactive menu
} else {
  // Use non-interactive mode
}
```

---

##### `parseKeySequence(buffer: Buffer): UserInput | null`

Parse key buffer to user input.

**Parameters:**
- `buffer` (Buffer): Raw input buffer

**Returns:** `UserInput | null`

**Example:**
```javascript
const input = inputHandler.parseKeySequence(buffer);
if (input) {
  console.log(input.type); // 'enter'
}
```

---

### UIRenderer

**Purpose:** Render visual interface to terminal

**Location:** `src/ui/menu/components/UIRenderer.js`

#### Constructor

```javascript
new UIRenderer(themeEngine: ThemeEngine, animationEngine: AnimationEngine)
```

**Parameters:**
- `themeEngine` (ThemeEngine): Theme engine instance
- `animationEngine` (AnimationEngine): Animation engine instance

#### Methods

##### `renderMenu(state: MenuState)`

Render complete menu.

**Parameters:**
- `state` (MenuState): Current menu state

**Example:**
```javascript
uiRenderer.renderMenu(stateManager.getState());
```

---

##### `renderHeader()`

Render menu header.

**Example:**
```javascript
uiRenderer.renderHeader();
```

---

##### `renderOptions(options: MenuOption[], selectedIndex: number)`

Render menu options list.

**Parameters:**
- `options` (Array): Menu options
- `selectedIndex` (number): Currently selected index

**Example:**
```javascript
uiRenderer.renderOptions(options, 2);
```

---

##### `renderDescription(option: MenuOption)`

Render detailed description of option.

**Parameters:**
- `option` (MenuOption): Option to describe

**Example:**
```javascript
uiRenderer.renderDescription(selectedOption);
```

---

##### `renderPreviewMode(option: MenuOption)`

Render preview mode screen.

**Parameters:**
- `option` (MenuOption): Option to preview

**Example:**
```javascript
uiRenderer.renderPreviewMode(option);
```

---

##### `renderHistoryMode(history: ExecutionRecord[])`

Render history mode screen.

**Parameters:**
- `history` (Array): Execution records

**Example:**
```javascript
uiRenderer.renderHistoryMode(commandHistory.getRecent(10));
```

---

##### `renderConfigMode(config: UserPreferences)`

Render configuration mode screen.

**Parameters:**
- `config` (UserPreferences): Current configuration

**Example:**
```javascript
uiRenderer.renderConfigMode(configManager.config.preferences);
```

---

##### `renderHelpMode()`

Render help mode screen.

**Example:**
```javascript
uiRenderer.renderHelpMode();
```

---

##### `renderFooter(hints: string[])`

Render footer with keyboard hints.

**Parameters:**
- `hints` (Array): Hint strings

**Example:**
```javascript
uiRenderer.renderFooter(['↑↓: Navigate', 'Enter: Select', 'q: Quit']);
```

---

##### `clear()`

Clear terminal screen.

**Example:**
```javascript
uiRenderer.clear();
```

---

## Configuration API

### ConfigManager

**Purpose:** Manage user preferences and persistence

**Location:** `src/ui/menu/components/ConfigManager.js`

#### Constructor

```javascript
new ConfigManager()
```

#### Methods

##### `async load(): Promise<UserPreferences>`

Load configuration from file or create default.

**Returns:** `Promise<UserPreferences>`

**File Location:** `~/.docs-jana/config.json`

**Example:**
```javascript
const config = await configManager.load();
console.log(config.preferences.theme); // 'default'
```

---

##### `async save(config: ConfigFile): Promise<void>`

Save configuration to file.

**Parameters:**
- `config` (ConfigFile): Configuration to save

**Throws:**
- File system errors

**Example:**
```javascript
await configManager.save({
  version: '1.0',
  preferences: {
    theme: 'dark',
    animationsEnabled: true,
    // ... other preferences
  }
});
```

---

##### `get(key: string): any`

Get configuration value by key.

**Parameters:**
- `key` (string): Configuration key (supports dot notation)

**Returns:** Configuration value

**Example:**
```javascript
const theme = configManager.get('preferences.theme'); // 'default'
```

---

##### `set(key: string, value: any)`

Set configuration value.

**Parameters:**
- `key` (string): Configuration key
- `value` (any): Value to set

**Example:**
```javascript
configManager.set('preferences.theme', 'dark');
```

---

##### `reset()`

Reset to default configuration.

**Example:**
```javascript
configManager.reset();
```

---

##### `validateAndMigrate(config: any): ConfigFile`

Validate and migrate configuration to current version.

**Parameters:**
- `config` (any): Configuration to validate

**Returns:** `ConfigFile` (validated)

**Example:**
```javascript
const validConfig = configManager.validateAndMigrate(loadedConfig);
```

---

### CommandHistory

**Purpose:** Track and persist command execution history

**Location:** `src/ui/menu/components/CommandHistory.js`

#### Constructor

```javascript
new CommandHistory(maxSize?: number)
```

**Parameters:**
- `maxSize` (number, optional): Maximum history entries (default: 100)

#### Methods

##### `add(record: ExecutionRecord)`

Add execution record to history.

**Parameters:**
- `record` (ExecutionRecord): Execution record

**Description:**
- Enforces FIFO when limit reached
- Validates timestamp format (ISO 8601)

**Example:**
```javascript
commandHistory.add({
  commandName: 'n8n:download',
  timestamp: new Date().toISOString(),
  status: 'success',
  duration: 5200
});
```

---

##### `getAll(): ExecutionRecord[]`

Get all execution records (ordered: most recent first).

**Returns:** `ExecutionRecord[]`

**Example:**
```javascript
const allRecords = commandHistory.getAll();
```

---

##### `getRecent(count: number): ExecutionRecord[]`

Get last N execution records.

**Parameters:**
- `count` (number): Number of records

**Returns:** `ExecutionRecord[]`

**Example:**
```javascript
const last10 = commandHistory.getRecent(10);
```

---

##### `getLastExecution(commandName: string): ExecutionRecord | null`

Get last execution of specific command.

**Parameters:**
- `commandName` (string): Command name

**Returns:** `ExecutionRecord | null`

**Example:**
```javascript
const lastDownload = commandHistory.getLastExecution('n8n:download');
if (lastDownload) {
  console.log(lastDownload.status); // 'success'
}
```

---

##### `getStatistics(): HistoryStatistics`

Calculate history statistics.

**Returns:** `HistoryStatistics`

**Example:**
```javascript
const stats = commandHistory.getStatistics();
console.log(stats.mostUsed); // { command: 'n8n:download', count: 5 }
console.log(stats.successRate); // 0.85
```

---

##### `clear()`

Clear all history records.

**Example:**
```javascript
commandHistory.clear();
```

---

##### `async save(): Promise<void>`

Persist history to file.

**File Location:** `~/.docs-jana/history.json`

**Example:**
```javascript
await commandHistory.save();
```

---

##### `async load(): Promise<void>`

Load history from file.

**Example:**
```javascript
await commandHistory.load();
```

---

## UI Utilities API

### ThemeEngine

**Purpose:** Manage colors, themes, and accessibility

**Location:** `src/ui/menu/utils/ThemeEngine.js`

#### Constructor

```javascript
new ThemeEngine(themeName?: ThemeName)
```

**Parameters:**
- `themeName` (string, optional): Initial theme (default: 'default')

#### Methods

##### `loadTheme(themeName: ThemeName)`

Load and apply theme.

**Parameters:**
- `themeName` (ThemeName): Theme to load
  - `'default'`: Balanced colors
  - `'dark'`: Dark theme
  - `'light'`: Light theme
  - `'high-contrast'`: High contrast

**Example:**
```javascript
themeEngine.loadTheme('dark');
```

---

##### `colorize(text: string, type: ColorType): string`

Apply semantic color to text.

**Parameters:**
- `text` (string): Text to colorize
- `type` (ColorType): Color type

**Returns:** Colorized string

**Example:**
```javascript
const colored = themeEngine.colorize('Success!', 'success');
console.log(colored); // Green text
```

---

##### `format(text: string, format: FormatType): string`

Apply text formatting.

**Parameters:**
- `text` (string): Text to format
- `format` (FormatType): Format type ('bold', 'italic', 'underline', etc.)

**Returns:** Formatted string

**Example:**
```javascript
const bold = themeEngine.format('Important', 'bold');
```

---

##### `detectColorSupport(): ColorLevel`

Detect terminal color support.

**Returns:** `ColorLevel` (0-3)
- `0`: No color support
- `1`: Basic 16 colors
- `2`: 256 colors
- `3`: Truecolor (24-bit)

**Example:**
```javascript
const level = themeEngine.detectColorSupport();
if (level === 0) {
  console.log('No color support');
}
```

---

##### `validateContrast(foreground: string, background: string): number`

Calculate WCAG contrast ratio.

**Parameters:**
- `foreground` (string): Foreground color (hex)
- `background` (string): Background color (hex)

**Returns:** Contrast ratio (e.g., 4.5)

**Example:**
```javascript
const ratio = themeEngine.validateContrast('#3b82f6', '#ffffff');
console.log(ratio >= 4.5); // WCAG AA compliant?
```

---

### AnimationEngine

**Purpose:** Manage animations and loading indicators

**Location:** `src/ui/menu/utils/AnimationEngine.js`

#### Constructor

```javascript
new AnimationEngine(enabled?: boolean, speed?: AnimationSpeed)
```

**Parameters:**
- `enabled` (boolean, optional): Enable animations (default: true)
- `speed` (AnimationSpeed, optional): Animation speed (default: 'normal')

#### Methods

##### `async withSpinner<T>(message: string, operation: () => Promise<T>): Promise<T>`

Execute operation with spinner animation.

**Parameters:**
- `message` (string): Spinner message
- `operation` (Function): Async operation to execute

**Returns:** Operation result

**Example:**
```javascript
const result = await animationEngine.withSpinner(
  'Downloading workflows...',
  async () => {
    return await downloadWorkflows();
  }
);
```

---

##### `async animateSuccess(message?: string): Promise<void>`

Show success animation.

**Parameters:**
- `message` (string, optional): Success message

**Example:**
```javascript
await animationEngine.animateSuccess('Download complete!');
```

---

##### `async animateError(message?: string): Promise<void>`

Show error animation.

**Parameters:**
- `message` (string, optional): Error message

**Example:**
```javascript
await animationEngine.animateError('Download failed');
```

---

##### `async animateFadeIn(): Promise<void>`

Animate fade-in effect.

**Example:**
```javascript
await animationEngine.animateFadeIn();
```

---

##### `isEnabled(): boolean`

Check if animations are enabled.

**Returns:** `boolean`

**Example:**
```javascript
if (animationEngine.isEnabled()) {
  await animationEngine.animateFadeIn();
}
```

---

##### `setEnabled(enabled: boolean)`

Enable or disable animations.

**Parameters:**
- `enabled` (boolean): Enable flag

**Example:**
```javascript
animationEngine.setEnabled(false);
```

---

### KeyboardMapper

**Purpose:** Map keyboard shortcuts to actions

**Location:** `src/ui/menu/utils/KeyboardMapper.js`

#### Constructor

```javascript
new KeyboardMapper()
```

#### Methods

##### `registerShortcut(key: string, action: string, description?: string)`

Register keyboard shortcut.

**Parameters:**
- `key` (string): Key to map
- `action` (string): Action identifier
- `description` (string, optional): Shortcut description

**Throws:**
- `Error` if key is already registered

**Example:**
```javascript
keyboardMapper.registerShortcut('d', 'n8n:download', 'Download N8N workflows');
```

---

##### `unregisterShortcut(key: string)`

Remove keyboard shortcut.

**Parameters:**
- `key` (string): Key to unregister

**Example:**
```javascript
keyboardMapper.unregisterShortcut('d');
```

---

##### `getAction(key: string): string | null`

Get action for key.

**Parameters:**
- `key` (string): Key pressed

**Returns:** Action identifier or `null`

**Example:**
```javascript
const action = keyboardMapper.getAction('d');
console.log(action); // 'n8n:download'
```

---

##### `getAllShortcuts(): KeyMapping[]`

Get all registered shortcuts.

**Returns:** `KeyMapping[]`

**Example:**
```javascript
const shortcuts = keyboardMapper.getAllShortcuts();
shortcuts.forEach(s => {
  console.log(`${s.key}: ${s.action}`);
});
```

---

##### `isAvailable(key: string): boolean`

Check if key is available for registration.

**Parameters:**
- `key` (string): Key to check

**Returns:** `boolean`

**Example:**
```javascript
if (keyboardMapper.isAvailable('x')) {
  keyboardMapper.registerShortcut('x', 'my-action');
}
```

---

## Execution API

### CommandExecutor

**Purpose:** Execute commands via orchestration layer

**Location:** `src/ui/menu/components/CommandExecutor.js`

#### Constructor

```javascript
new CommandExecutor(orchestrationContext?: OrchestrationContext)
```

**Parameters:**
- `orchestrationContext` (Object, optional): Execution context

#### Methods

##### `async execute(commandName: string, options?: ExecutionOptions): Promise<ExecutionResult>`

Execute a command.

**Parameters:**
- `commandName` (string): Command to execute
- `options` (Object, optional): Execution options
  - `args` (Array): Command arguments
  - `flags` (Object): Command flags
  - `verbose` (boolean): Verbose output
  - `debug` (boolean): Debug mode

**Returns:** `Promise<ExecutionResult>`

**Example:**
```javascript
const result = await commandExecutor.execute('n8n:download', {
  args: [],
  flags: { output: './workflows' },
  verbose: true
});

if (result.success) {
  console.log(result.message);
} else {
  console.error(result.error);
}
```

---

##### `async executeMany(commands: CommandSpec[]): Promise<ExecutionResult[]>`

Execute multiple commands in sequence.

**Parameters:**
- `commands` (Array): Array of command specifications

**Returns:** `Promise<ExecutionResult[]>`

**Example:**
```javascript
const results = await commandExecutor.executeMany([
  { commandName: 'n8n:download', options: {} },
  { commandName: 'outline:download', options: {} }
]);
```

---

##### `validate(commandName: string): boolean`

Validate that command exists.

**Parameters:**
- `commandName` (string): Command to validate

**Returns:** `boolean`

**Example:**
```javascript
if (commandExecutor.validate('n8n:download')) {
  await commandExecutor.execute('n8n:download');
}
```

---

## Support API

### ErrorHandler

**Purpose:** Centralized error handling and recovery

**Location:** `src/ui/menu/utils/ErrorHandler.js`

#### Constructor

```javascript
new ErrorHandler(options?: ErrorHandlerOptions)
```

**Parameters:**
- `options` (Object, optional):
  - `debug` (boolean): Debug mode
  - `logger` (MenuLogger): Logger instance

#### Methods

##### `handle(error: Error, context?: ErrorContext): ErrorResponse`

Handle error and return user-friendly response.

**Parameters:**
- `error` (Error): Error to handle
- `context` (Object, optional): Error context

**Returns:** `ErrorResponse`

**Example:**
```javascript
try {
  await riskyOperation();
} catch (error) {
  const response = errorHandler.handle(error, {
    operation: 'riskyOperation',
    component: 'MenuOrchestrator'
  });
  console.error(response.userMessage);
}
```

---

##### `recover(error: Error, fallback: () => void)`

Attempt graceful recovery.

**Parameters:**
- `error` (Error): Error to recover from
- `fallback` (Function): Fallback action

**Example:**
```javascript
errorHandler.recover(error, () => {
  console.log('Falling back to default behavior');
});
```

---

##### `formatUserMessage(error: Error): string`

Format error for user display.

**Parameters:**
- `error` (Error): Error to format

**Returns:** User-friendly message

**Example:**
```javascript
const message = errorHandler.formatUserMessage(error);
console.error(message);
```

---

##### `categorizeError(error: Error): ErrorCategory`

Determine error category.

**Parameters:**
- `error` (Error): Error to categorize

**Returns:** `ErrorCategory`

**Example:**
```javascript
const category = errorHandler.categorizeError(error);
// 'user-input' | 'system' | 'command-execution' | 'runtime'
```

---

### MenuLogger

**Purpose:** Logging and performance diagnostics

**Location:** `src/ui/menu/utils/MenuLogger.js`

#### Constructor

```javascript
new MenuLogger(options?: LoggerOptions)
```

**Parameters:**
- `options` (Object, optional):
  - `level` (LogLevel): Log level ('debug', 'info', 'warn', 'error')
  - `enabled` (boolean): Enable logging

#### Methods

##### `debug(message: string, context?: any)`

Log debug message (only if DEBUG=true).

**Parameters:**
- `message` (string): Log message
- `context` (any, optional): Additional context

**Example:**
```javascript
logger.debug('StateManager initialized', { optionsCount: 7 });
```

---

##### `info(message: string, context?: any)`

Log informational message.

**Parameters:**
- `message` (string): Log message
- `context` (any, optional): Additional context

**Example:**
```javascript
logger.info('Menu started successfully');
```

---

##### `warn(message: string, context?: any)`

Log warning message.

**Parameters:**
- `message` (string): Warning message
- `context` (any, optional): Additional context

**Example:**
```javascript
logger.warn('Theme contrast is low', { ratio: 3.2 });
```

---

##### `error(message: string, error?: Error, context?: any)`

Log error message.

**Parameters:**
- `message` (string): Error message
- `error` (Error, optional): Error object
- `context` (any, optional): Additional context

**Example:**
```javascript
logger.error('Failed to load config', error, { path: configPath });
```

---

##### `startTimer(label: string)`

Start performance timer.

**Parameters:**
- `label` (string): Timer label

**Example:**
```javascript
logger.startTimer('menu-initialization');
```

---

##### `endTimer(label: string): number`

End performance timer and log duration.

**Parameters:**
- `label` (string): Timer label

**Returns:** Duration in milliseconds

**Example:**
```javascript
logger.endTimer('menu-initialization');
// Logs: "menu-initialization completed in 85ms"
```

---

## Type Definitions

### Core Types

```typescript
/**
 * Menu option definition
 */
interface MenuOption {
  key: string;                  // Unique identifier (e.g., '1', '2')
  command: string;              // Command name to execute
  label: string;                // Display label
  description: string;          // Detailed description
  icon: string;                 // Unicode icon (e.g., '📥')
  category: MenuCategory;       // Visual category
  shortcut?: string;            // Keyboard shortcut (e.g., 'd')
  preview?: CommandPreview;     // Command preview data
  lastExecution?: ExecutionRecord; // Last execution info
}

/**
 * Menu categories
 */
type MenuCategory =
  | 'action'      // Primary actions (blue)
  | 'info'        // Informational (cyan)
  | 'destructive' // Destructive actions (red)
  | 'utility';    // Utility functions (gray)

/**
 * Command preview information
 */
interface CommandPreview {
  shellCommand: string;         // Exact shell command
  affectedPaths: string[];      // Affected files/directories
  estimatedDuration?: number;   // Estimated duration (seconds)
  warning?: string;             // Warning message if destructive
}

/**
 * Menu state
 */
interface MenuState {
  options: MenuOption[];        // Available options
  selectedIndex: number;        // Currently selected index
  mode: MenuMode;               // Current mode
  isExecuting: boolean;         // Execution in progress?
  executingCommand?: string;    // Command being executed
}

/**
 * Menu modes
 */
type MenuMode =
  | 'navigation'  // Browse and select
  | 'preview'     // Command preview
  | 'history'     // Command history
  | 'config'      // Configuration
  | 'help';       // Help screen

/**
 * User input
 */
interface UserInput {
  type: InputType;              // Input type
  key?: string;                 // Key pressed (if applicable)
}

/**
 * Input types
 */
type InputType =
  | 'arrow-up'
  | 'arrow-down'
  | 'enter'
  | 'escape'
  | 'char';                     // Character key (a-z, 0-9)

/**
 * Execution record
 */
interface ExecutionRecord {
  commandName: string;          // Command executed
  timestamp: string;            // ISO 8601 timestamp
  status: 'success' | 'failure';
  duration: number;             // Duration in milliseconds
  error?: string;               // Error message if failed
}

/**
 * Execution result
 */
interface ExecutionResult {
  success: boolean;             // Execution status
  message: string;              // Result message
  timestamp: Date;              // Execution time
  duration: number;             // Duration in milliseconds
  data?: any;                   // Command output data
  error?: Error;                // Error if failed
}
```

### Configuration Types

```typescript
/**
 * User preferences
 */
interface UserPreferences {
  theme: ThemeName;
  animationsEnabled: boolean;
  animationSpeed: AnimationSpeed;
  iconsEnabled: boolean;
  showDescriptions: boolean;
  showPreviews: boolean;
  historySize: number;
  keyboardShortcuts?: KeyboardShortcuts;
}

/**
 * Theme names
 */
type ThemeName =
  | 'default'
  | 'dark'
  | 'light'
  | 'high-contrast';

/**
 * Animation speeds
 */
type AnimationSpeed = 'slow' | 'normal' | 'fast';

/**
 * Configuration file structure
 */
interface ConfigFile {
  version: string;              // Config version
  preferences: UserPreferences;
}

/**
 * History file structure
 */
interface HistoryFile {
  version: string;              // History version
  maxSize: number;              // Max entries
  records: ExecutionRecord[];
}
```

### Theme Types

```typescript
/**
 * Theme definition
 */
interface Theme {
  name: ThemeName;
  colors: ColorPalette;
  backgrounds: BackgroundColors;
  contrastRatios: ContrastConfig;
}

/**
 * Color palette
 */
interface ColorPalette {
  primary: string;              // Hex color
  success: string;
  error: string;
  warning: string;
  info: string;
  highlight: string;
  muted: string;
  destructive: string;
}

/**
 * Background colors
 */
interface BackgroundColors {
  selected: string;             // Selection background
  normal: string;               // Normal background
}

/**
 * Contrast configuration
 */
interface ContrastConfig {
  minRatio: number;             // Minimum ratio (4.5 for WCAG AA)
  largeTextRatio: number;       // Large text ratio (3.0 for WCAG AA)
}

/**
 * Color types
 */
type ColorType =
  | 'primary'
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'highlight'
  | 'muted'
  | 'destructive';

/**
 * Format types
 */
type FormatType =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'dim';

/**
 * Color support level
 */
type ColorLevel = 0 | 1 | 2 | 3;
```

### Error Types

```typescript
/**
 * Error response
 */
interface ErrorResponse {
  category: ErrorCategory;
  userMessage: string;
  technicalMessage: string;
  suggestions: string[];
  recoverable: boolean;
}

/**
 * Error categories
 */
type ErrorCategory =
  | 'user-input'
  | 'system'
  | 'command-execution'
  | 'runtime';

/**
 * Error context
 */
interface ErrorContext {
  operation?: string;
  component?: string;
  data?: any;
}
```

---

## Configuration Schemas

### Config File Schema

**Location:** `~/.docs-jana/config.json`

```json
{
  "version": "1.0",
  "preferences": {
    "theme": "default",
    "animationsEnabled": true,
    "animationSpeed": "normal",
    "iconsEnabled": true,
    "showDescriptions": true,
    "showPreviews": true,
    "historySize": 50,
    "keyboardShortcuts": {
      "help": ["h", "?"],
      "exit": ["q", "Escape"],
      "rerun": ["r"]
    }
  }
}
```

### History File Schema

**Location:** `~/.docs-jana/history.json`

```json
{
  "version": "1.0",
  "maxSize": 100,
  "records": [
    {
      "commandName": "n8n:download",
      "timestamp": "2025-10-01T14:30:00.000Z",
      "status": "success",
      "duration": 5200
    }
  ]
}
```

---

## Event System

### State Change Events

StateManager emits events through the Observer pattern:

```javascript
// Subscribe to all state changes
stateManager.subscribe((state) => {
  console.log('State changed:', state);
});

// Events are emitted on:
// - selectedIndexChanged: When selection moves
// - modeChanged: When mode switches
// - executionStarted: When command starts
// - executionCompleted: When command finishes
```

### Input Events

InputHandler processes various input types:

```javascript
// Input types emitted:
{
  type: 'arrow-up',    // ↑ key
  type: 'arrow-down',  // ↓ key
  type: 'enter',       // Enter key
  type: 'escape',      // Esc key
  type: 'char',        // Character key
  key: 'd'             // Actual character (for 'char' type)
}
```

---

## Usage Examples

### Complete Initialization Example

```javascript
const { MenuOrchestrator } = require('./src/ui/menu');

async function startInteractiveMenu() {
  const menu = new MenuOrchestrator();

  try {
    // Initialize all components
    await menu.initialize();

    // Start the menu
    await menu.start();
  } catch (error) {
    console.error('Failed to start menu:', error.message);
    process.exit(1);
  }
}

startInteractiveMenu();
```

### Custom Theme Example

```javascript
const ThemeEngine = require('./src/ui/menu/utils/ThemeEngine');

const customTheme = {
  name: 'my-theme',
  colors: {
    primary: '#3b82f6',
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#06b6d4',
    highlight: '#8b5cf6',
    muted: '#6b7280',
    destructive: '#dc2626'
  },
  backgrounds: {
    selected: '#3b82f6',
    normal: 'transparent'
  }
};

const themeEngine = new ThemeEngine();
themeEngine.loadTheme(customTheme);
```

### Command Execution with History Example

```javascript
const CommandExecutor = require('./src/ui/menu/components/CommandExecutor');
const CommandHistory = require('./src/ui/menu/components/CommandHistory');

const executor = new CommandExecutor();
const history = new CommandHistory();

async function executeAndTrack(commandName) {
  const result = await executor.execute(commandName);

  history.add({
    commandName,
    timestamp: new Date().toISOString(),
    status: result.success ? 'success' : 'failure',
    duration: result.duration,
    error: result.error?.message
  });

  await history.save();

  return result;
}
```

---

**Last Updated:** 2025-10-01
**Version:** 1.0.0
**For docs-jana CLI version:** 2.3.0+

---

Made with ❤️ by the Docs-Jana team
