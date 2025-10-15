/**
 * TerminalDetector TypeScript Definitions
 * @module ui/menu/visual/TerminalDetector
 */

/**
 * Terminal capabilities detected
 */
export interface TerminalCapabilities {
  /**
   * Terminal width in columns
   */
  width: number;

  /**
   * Terminal height in rows
   */
  height: number;

  /**
   * Whether terminal supports Unicode characters
   */
  supportsUnicode: boolean;

  /**
   * Whether terminal supports emoji rendering
   */
  supportsEmojis: boolean;

  /**
   * Color support level:
   * - 0: No color support
   * - 1: Basic 16 colors
   * - 2: 256 colors
   * - 3: Truecolor (16 million colors)
   */
  colorLevel: 0 | 1 | 2 | 3;

  /**
   * Whether terminal is interactive (TTY)
   */
  isInteractive: boolean;

  /**
   * Terminal type (from TERM environment variable)
   */
  termType: string;

  /**
   * Platform (win32, darwin, linux, etc.)
   */
  platform: string;
}

/**
 * TerminalDetector - Detects terminal capabilities and dimensions
 *
 * Responsibilities:
 * - Detect terminal width and height
 * - Determine Unicode and emoji support
 * - Detect color support level
 * - Listen for terminal resize events
 * - Cache capabilities for performance
 */
export class TerminalDetector {
  /**
   * Cached terminal capabilities
   */
  capabilities: TerminalCapabilities | null;

  /**
   * Resize listeners
   */
  readonly resizeListeners: Array<() => void>;

  /**
   * Debounce timeout for resize events
   */
  resizeTimeout: NodeJS.Timeout | null;

  /**
   * Debounce delay in milliseconds
   */
  readonly resizeDebounceMs: number;

  /**
   * Creates a new TerminalDetector instance
   *
   * @param resizeDebounceMs - Debounce delay for resize events (default: 200ms)
   *
   * @example
   * ```typescript
   * const detector = new TerminalDetector();
   * const capabilities = detector.detect();
   *
   * console.log(`Terminal size: ${capabilities.width}x${capabilities.height}`);
   * console.log(`Unicode support: ${capabilities.supportsUnicode}`);
   * ```
   */
  constructor(resizeDebounceMs?: number);

  /**
   * Detects and returns terminal capabilities
   *
   * Capabilities are cached and reused until invalidated by:
   * - Terminal resize event
   * - Manual cache clear via clearCache()
   *
   * @returns Terminal capabilities object
   *
   * @example
   * ```typescript
   * const capabilities = detector.detect();
   *
   * if (capabilities.supportsUnicode) {
   *   console.log('✓ Unicode is supported');
   * } else {
   *   console.log('+ Unicode is NOT supported');
   * }
   * ```
   */
  detect(): TerminalCapabilities;

  /**
   * Gets terminal dimensions
   *
   * @returns Object with width and height in columns/rows
   *
   * @example
   * ```typescript
   * const { width, height } = detector.getDimensions();
   * console.log(`Terminal: ${width}x${height}`);
   * ```
   */
  getDimensions(): { width: number; height: number };

  /**
   * Checks if terminal supports Unicode characters
   *
   * Detection based on:
   * - LANG/LC_ALL environment variables (UTF-8)
   * - TERM environment variable
   * - Platform-specific heuristics
   *
   * @returns True if Unicode is supported
   *
   * @example
   * ```typescript
   * if (detector.supportsUnicode()) {
   *   console.log('Using Unicode box-drawing: ┌─┐');
   * } else {
   *   console.log('Using ASCII fallback: +-+');
   * }
   * ```
   */
  supportsUnicode(): boolean;

  /**
   * Checks if terminal supports emoji rendering
   *
   * Detection based on:
   * - Terminal emulator detection (iTerm2, Windows Terminal, etc.)
   * - Platform (macOS, modern Windows)
   * - TERM_PROGRAM environment variable
   *
   * @returns True if emojis are supported
   *
   * @example
   * ```typescript
   * const icon = detector.supportsEmojis() ? '📥' : '[D]';
   * console.log(`${icon} Download`);
   * ```
   */
  supportsEmojis(): boolean;

  /**
   * Gets color support level
   *
   * Levels:
   * - 0: No color support (CI, dumb terminals)
   * - 1: Basic 16 colors (ANSI)
   * - 2: 256 colors (xterm-256color)
   * - 3: Truecolor / 16 million colors (modern terminals)
   *
   * @returns Color level (0-3)
   *
   * @example
   * ```typescript
   * const colorLevel = detector.getColorLevel();
   *
   * if (colorLevel >= 2) {
   *   // Use 256 color palette
   * } else if (colorLevel === 1) {
   *   // Use basic 16 colors
   * } else {
   *   // No colors
   * }
   * ```
   */
  getColorLevel(): 0 | 1 | 2 | 3;

  /**
   * Checks if terminal is interactive (TTY)
   *
   * Non-interactive terminals:
   * - Piped output (e.g., `node script.js | less`)
   * - CI environments
   * - File redirection (e.g., `node script.js > output.txt`)
   *
   * @returns True if terminal is interactive
   *
   * @example
   * ```typescript
   * if (detector.isInteractive()) {
   *   // Show interactive menu
   * } else {
   *   // Output plain text
   * }
   * ```
   */
  isInteractive(): boolean;

  /**
   * Registers a callback for terminal resize events
   *
   * Callbacks are debounced to avoid excessive calls during resize.
   * Default debounce: 200ms
   *
   * @param callback - Function to call on resize
   *
   * @example
   * ```typescript
   * detector.onResize(() => {
   *   console.log('Terminal resized!');
   *   detector.clearCache(); // Invalidate cached capabilities
   *   redrawUI(); // Re-render UI with new dimensions
   * });
   * ```
   */
  onResize(callback: () => void): void;

  /**
   * Clears cached capabilities
   *
   * Forces re-detection on next detect() call.
   * Automatically called on terminal resize.
   */
  clearCache(): void;

  /**
   * Gets terminal type from TERM environment variable
   *
   * Common values:
   * - xterm-256color
   * - xterm
   * - dumb
   * - screen
   *
   * @returns Terminal type string
   */
  getTermType(): string;

  /**
   * Gets current platform
   *
   * Values:
   * - win32 (Windows)
   * - darwin (macOS)
   * - linux
   * - freebsd
   * - etc.
   *
   * @returns Platform identifier
   */
  getPlatform(): string;
}

export default TerminalDetector;
