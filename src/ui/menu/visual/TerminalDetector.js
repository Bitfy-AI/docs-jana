/**
 * TerminalDetector - Detects terminal capabilities
 *
 * Responsibilities:
 * - Detect terminal capabilities (Unicode, colors, emojis, dimensions)
 * - Provide fallback information for limited terminals
 * - Detect changes in terminal size (resize events)
 * - Provide consistent API for querying terminal features
 *
 * @module ui/menu/visual/TerminalDetector
 */

/**
 * @typedef {Object} TerminalCapabilities
 * @property {boolean} supportsUnicode - Terminal supports Unicode box-drawing characters
 * @property {boolean} supportsEmojis - Terminal supports emoji rendering
 * @property {number} colorLevel - Color support level: 0=none, 1=basic (16), 2=256 colors, 3=truecolor
 * @property {number} width - Terminal width in columns
 * @property {number} height - Terminal height in rows
 * @property {string} platform - Operating system platform (win32, darwin, linux, etc)
 * @property {boolean} isCi - Running in CI/CD environment
 * @property {string} terminalType - Value of TERM environment variable
 */

class TerminalDetector {
  constructor() {
    this.chalk = null; // Will be set during initialization
    this.resizeCallbacks = [];
    this.resizeTimeout = null;
    this.cachedCapabilities = null;
    this.lastWidth = null;
  }

  /**
   * Initializes TerminalDetector with chalk instance
   * @param {object} chalkInstance - Chalk instance for color level detection
   */
  initialize(chalkInstance) {
    this.chalk = chalkInstance;
  }

  /**
   * Detects all terminal capabilities
   *
   * Strategy:
   * - Unicode: Check TERM, LANG environment variables and known terminal types
   * - Emojis: Check platform (macOS/Linux better support) and terminal type
   * - Color Level: Use chalk.level if available, otherwise fallback to TERM parsing
   * - Dimensions: Use process.stdout.getWindowSize() with fallback to defaults
   * - Platform: Use process.platform
   * - CI: Check CI environment variables (CI, CONTINUOUS_INTEGRATION, etc)
   *
   * @returns {TerminalCapabilities} Complete terminal capabilities object
   *
   * @example
   * const detector = new TerminalDetector();
   * detector.initialize(chalk);
   * const capabilities = detector.detect();
   * console.log(capabilities);
   * // {
   * //   supportsUnicode: true,
   * //   supportsEmojis: true,
   * //   colorLevel: 3,
   * //   width: 120,
   * //   height: 40,
   * //   platform: 'darwin',
   * //   isCi: false,
   * //   terminalType: 'xterm-256color'
   * // }
   */
  detect() {
    // Return cached capabilities if available and terminal width hasn't changed
    const currentWidth = this._getCurrentWidth();
    if (this.cachedCapabilities && this.lastWidth === currentWidth) {
      return this.cachedCapabilities;
    }

    const capabilities = {
      supportsUnicode: this.supportsUnicode(),
      supportsEmojis: this.supportsEmojis(),
      colorLevel: this.getColorLevel(),
      width: currentWidth,
      height: this._getCurrentHeight(),
      platform: process.platform,
      isCi: this._isCiEnvironment(),
      terminalType: process.env.TERM || 'unknown'
    };

    // Cache capabilities
    this.cachedCapabilities = capabilities;
    this.lastWidth = currentWidth;

    return capabilities;
  }

  /**
   * Checks if terminal supports Unicode box-drawing characters
   *
   * Detection strategy:
   * 1. Check if NO_UNICODE environment variable is set (forced disable)
   * 2. Check TERM environment variable for known Unicode-capable terminals
   * 3. Check LANG/LC_ALL for UTF-8 encoding
   * 4. Platform-specific defaults (macOS/Linux: true, Windows: depends on terminal)
   *
   * @returns {boolean} True if Unicode is supported
   *
   * @example
   * if (detector.supportsUnicode()) {
   *   console.log('Using Unicode box-drawing: ┌─┐');
   * } else {
   *   console.log('Using ASCII fallback: +-+');
   * }
   */
  supportsUnicode() {
    // Forced disable via environment variable
    if (process.env.NO_UNICODE === '1' || process.env.NO_UNICODE === 'true') {
      return false;
    }

    // Check if running in CI (usually no Unicode support)
    if (this._isCiEnvironment()) {
      return false;
    }

    const term = (process.env.TERM || '').toLowerCase();

    // Known terminals that DON'T support Unicode well
    const nonUnicodeTerminals = ['dumb', 'cons25', 'emacs'];
    if (nonUnicodeTerminals.some(t => term.includes(t))) {
      return false;
    }

    // Known terminals that DO support Unicode
    const unicodeTerminals = [
      'xterm',
      'vt100',
      'vt220',
      'rxvt',
      'screen',
      'tmux',
      'linux',
      'ansi',
      'cygwin',
      'putty'
    ];

    if (unicodeTerminals.some(t => term.includes(t))) {
      return true;
    }

    // Check for UTF-8 encoding in LANG or LC_ALL
    const lang = process.env.LANG || process.env.LC_ALL || '';
    if (lang.toLowerCase().includes('utf-8') || lang.toLowerCase().includes('utf8')) {
      return true;
    }

    // Platform-specific defaults
    // macOS and Linux generally support Unicode well
    // Windows depends on the terminal (PowerShell Core, Windows Terminal support it)
    if (process.platform === 'darwin' || process.platform === 'linux') {
      return true;
    }

    // Windows: Check for modern terminals
    if (process.platform === 'win32') {
      // Windows Terminal, PowerShell 7+, WSL
      const isWindowsTerminal = !!process.env.WT_SESSION;
      const isPowerShellCore = process.env.TERM_PROGRAM === 'PowerShell';
      const isWSL = !!process.env.WSL_DISTRO_NAME;

      if (isWindowsTerminal || isPowerShellCore || isWSL) {
        return true;
      }

      // Legacy CMD and PowerShell 5.1 often have issues with Unicode
      return false;
    }

    // Default: assume no Unicode support for unknown platforms
    return false;
  }

  /**
   * Checks if terminal supports emoji rendering
   *
   * Detection strategy:
   * 1. Check if NO_EMOJI environment variable is set (forced disable)
   * 2. Platform check: macOS and Linux have better emoji support
   * 3. Terminal type check: modern terminals support emojis
   * 4. Windows: Only modern terminals (Windows Terminal, PowerShell Core)
   *
   * @returns {boolean} True if emojis are supported
   *
   * @example
   * const icon = detector.supportsEmojis() ? '📁' : '[F]';
   * console.log(`Folder: ${icon}`);
   */
  supportsEmojis() {
    // Forced disable via environment variable
    if (process.env.NO_EMOJI === '1' || process.env.NO_EMOJI === 'true') {
      return false;
    }

    // CI environments typically don't render emojis well
    if (this._isCiEnvironment()) {
      return false;
    }

    // Emojis generally require Unicode support first
    if (!this.supportsUnicode()) {
      return false;
    }

    const term = (process.env.TERM || '').toLowerCase();
    const termProgram = (process.env.TERM_PROGRAM || '').toLowerCase();

    // macOS: Excellent emoji support
    if (process.platform === 'darwin') {
      return true;
    }

    // Linux: Good emoji support in modern terminals
    if (process.platform === 'linux') {
      const modernLinuxTerminals = ['gnome-terminal', 'konsole', 'terminator', 'alacritty', 'kitty'];
      if (modernLinuxTerminals.some(t => termProgram.includes(t))) {
        return true;
      }

      // GNOME Terminal and other GTK-based terminals support emojis
      if (process.env.VTE_VERSION) {
        return true;
      }

      // Default for Linux: assume basic emoji support if Unicode is available
      return true;
    }

    // Windows: Only modern terminals
    if (process.platform === 'win32') {
      const isWindowsTerminal = !!process.env.WT_SESSION;
      const isPowerShellCore = termProgram === 'PowerShell';
      const isVSCode = termProgram === 'vscode';

      return isWindowsTerminal || isPowerShellCore || isVSCode;
    }

    // Default: no emoji support for unknown platforms
    return false;
  }

  /**
   * Gets terminal color support level
   *
   * Uses chalk.level if available, otherwise falls back to TERM environment variable parsing.
   *
   * Color levels:
   * - 0: No color support (dumb terminal, CI with NO_COLOR)
   * - 1: Basic 16 colors (ANSI)
   * - 2: 256 colors
   * - 3: TrueColor / 16 million colors
   *
   * @returns {number} Color level (0-3)
   *
   * @example
   * const colorLevel = detector.getColorLevel();
   * if (colorLevel >= 2) {
   *   // Use 256 colors or TrueColor
   *   console.log(chalk.hex('#FF5733')('Vibrant color!'));
   * } else if (colorLevel === 1) {
   *   // Use basic 16 colors
   *   console.log(chalk.red('Basic red'));
   * } else {
   *   // No colors
   *   console.log('Plain text');
   * }
   */
  getColorLevel() {
    // Check NO_COLOR environment variable (universal standard)
    if (process.env.NO_COLOR) {
      return 0;
    }

    // If chalk is available, use its level detection
    if (this.chalk && typeof this.chalk.level === 'number') {
      return this.chalk.level;
    }

    // Fallback: Parse TERM environment variable
    const term = (process.env.TERM || '').toLowerCase();

    // Dumb terminal or CI without color support
    if (term === 'dumb' || (this._isCiEnvironment() && !process.env.FORCE_COLOR)) {
      return 0;
    }

    // TrueColor support (16 million colors)
    if (term.includes('truecolor') || term.includes('24bit')) {
      return 3;
    }

    // 256 color support
    if (term.includes('256') || term.includes('256color')) {
      return 2;
    }

    // Basic ANSI color support (16 colors)
    if (term.includes('color') || term.includes('ansi') || term.includes('xterm')) {
      return 1;
    }

    // Windows platform defaults
    if (process.platform === 'win32') {
      // Windows Terminal and PowerShell Core support TrueColor
      if (process.env.WT_SESSION || process.env.TERM_PROGRAM === 'PowerShell') {
        return 3;
      }
      // Legacy Windows terminals support basic colors
      return 1;
    }

    // Default: assume basic color support
    return 1;
  }

  /**
   * Gets current terminal dimensions
   *
   * Uses process.stdout.getWindowSize() with fallback to default values if not available.
   *
   * @returns {{width: number, height: number}} Terminal dimensions in columns and rows
   *
   * @example
   * const { width, height } = detector.getDimensions();
   * console.log(`Terminal size: ${width}x${height}`);
   */
  getDimensions() {
    return {
      width: this._getCurrentWidth(),
      height: this._getCurrentHeight()
    };
  }

  /**
   * Gets current terminal width with validation and bounds checking
   * @returns {number} Terminal width in columns (constrained to 60-200)
   * @private
   */
  _getCurrentWidth() {
    const MIN_WIDTH = 60;   // Minimum readable width
    const MAX_WIDTH = 200;  // Maximum reasonable width
    const DEFAULT_WIDTH = 80; // Standard terminal width

    try {
      let width = DEFAULT_WIDTH;

      if (process.stdout.getWindowSize) {
        const [detectedWidth] = process.stdout.getWindowSize();
        width = detectedWidth || DEFAULT_WIDTH;
      } else if (process.stdout.columns) {
        // Alternative: process.stdout.columns (older Node.js versions)
        width = process.stdout.columns;
      }

      // Sanitize: ensure it's a valid number and apply bounds
      const sanitizedWidth = parseInt(width, 10);
      if (isNaN(sanitizedWidth)) {
        return DEFAULT_WIDTH;
      }

      // Constrain to reasonable bounds
      return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, sanitizedWidth));
    } catch (error) {
      // Ignore errors, use fallback
      return DEFAULT_WIDTH;
    }
  }

  /**
   * Gets current terminal height with validation and bounds checking
   * @returns {number} Terminal height in rows (constrained to 20-100)
   * @private
   */
  _getCurrentHeight() {
    const MIN_HEIGHT = 20;   // Minimum readable height
    const MAX_HEIGHT = 100;  // Maximum reasonable height
    const DEFAULT_HEIGHT = 24; // Standard terminal height

    try {
      let height = DEFAULT_HEIGHT;

      if (process.stdout.getWindowSize) {
        const [, detectedHeight] = process.stdout.getWindowSize();
        height = detectedHeight || DEFAULT_HEIGHT;
      } else if (process.stdout.rows) {
        // Alternative: process.stdout.rows (older Node.js versions)
        height = process.stdout.rows;
      }

      // Sanitize: ensure it's a valid number and apply bounds
      const sanitizedHeight = parseInt(height, 10);
      if (isNaN(sanitizedHeight)) {
        return DEFAULT_HEIGHT;
      }

      // Constrain to reasonable bounds
      return Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, sanitizedHeight));
    } catch (error) {
      // Ignore errors, use fallback
      return DEFAULT_HEIGHT;
    }
  }

  /**
   * Checks if running in CI/CD environment
   * @returns {boolean} True if running in CI
   * @private
   */
  _isCiEnvironment() {
    // Common CI environment variables
    const ciEnvVars = [
      'CI',
      'CONTINUOUS_INTEGRATION',
      'TRAVIS',
      'CIRCLECI',
      'JENKINS',
      'GITLAB_CI',
      'GITHUB_ACTIONS',
      'BUILDKITE',
      'DRONE'
    ];

    return ciEnvVars.some(envVar => process.env[envVar]);
  }

  /**
   * Sets up listener for terminal resize events
   *
   * The callback is debounced by 200ms to avoid excessive re-renders when the user
   * is actively resizing the terminal window.
   *
   * Only triggers callback if terminal width has actually changed (ignores height-only changes).
   *
   * @param {Function} callback - Called when terminal is resized with new dimensions
   *
   * @example
   * detector.onResize(({ width, height }) => {
   *   console.log(`Terminal resized to ${width}x${height}`);
   *   // Re-render your UI here
   * });
   */
  onResize(callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('onResize callback must be a function');
    }

    // Add callback to list
    this.resizeCallbacks.push(callback);

    // Set up SIGWINCH listener only once (when first callback is registered)
    if (this.resizeCallbacks.length === 1) {
      this._setupResizeListener();
    }

    // Return cleanup function
    return () => {
      const index = this.resizeCallbacks.indexOf(callback);
      if (index > -1) {
        this.resizeCallbacks.splice(index, 1);
      }

      // Remove listener if no more callbacks
      if (this.resizeCallbacks.length === 0) {
        this._cleanupResizeListener();
      }
    };
  }

  /**
   * Sets up the SIGWINCH event listener for terminal resize
   * @private
   */
  _setupResizeListener() {
    this._resizeHandler = () => {
      // Clear previous timeout
      if (this.resizeTimeout) {
        clearTimeout(this.resizeTimeout);
      }

      // Debounce: wait 200ms after last resize event before triggering callbacks
      this.resizeTimeout = setTimeout(() => {
        const currentWidth = this._getCurrentWidth();

        // Only trigger if width has actually changed
        if (currentWidth !== this.lastWidth) {
          const newDimensions = this.getDimensions();

          // Invalidate cached capabilities since dimensions changed
          this.cachedCapabilities = null;
          this.lastWidth = currentWidth;

          // Trigger all registered callbacks
          this.resizeCallbacks.forEach(callback => {
            try {
              callback(newDimensions);
            } catch (error) {
              console.error('Error in resize callback:', error);
            }
          });
        }
      }, 200); // 200ms debounce
    };

    // Listen to SIGWINCH signal (terminal window size change)
    process.stdout.on('resize', this._resizeHandler);
  }

  /**
   * Cleans up the resize event listener
   * @private
   */
  _cleanupResizeListener() {
    if (this._resizeHandler) {
      process.stdout.off('resize', this._resizeHandler);
      this._resizeHandler = null;
    }

    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = null;
    }
  }

  /**
   * Manually invalidates cached capabilities
   * Useful when terminal state might have changed externally
   */
  invalidateCache() {
    this.cachedCapabilities = null;
    this.lastWidth = null;
  }
}

module.exports = TerminalDetector;
