/**
 * IconMapper - Maps action types to appropriate icons with fallbacks
 *
 * Responsibilities:
 * - Map action types to appropriate icons (emoji, Unicode, ASCII, or plain text)
 * - Provide fallback chain: emoji → unicode → ascii → plain
 * - Allow custom icon registration
 * - Cache resolved icons for performance
 * - Provide status icons and selection indicators
 *
 * @module ui/menu/visual/IconMapper
 */

/**
 * @typedef {'success' | 'error' | 'warning' | 'info' | 'neutral'} StatusType
 */

/**
 * @typedef {Object} IconSet
 * @property {string} emoji - Emoji representation (e.g., '📥')
 * @property {string} unicode - Unicode character representation (e.g., '↓')
 * @property {string} ascii - ASCII fallback (e.g., 'v')
 * @property {string} plain - Plain text fallback (e.g., '[D]')
 */

/**
 * Default icon mappings for action types, statuses, and indicators
 *
 * Fallback chain: emoji → unicode → ascii → plain
 * - emoji: Modern terminals with emoji support (macOS Terminal, iTerm2, Windows Terminal)
 * - unicode: Terminals with Unicode box-drawing support (most modern terminals)
 * - ascii: Terminals with basic ASCII only (legacy Windows CMD, dumb terminals)
 * - plain: Text-based fallback for CI environments and screen readers
 */
const DEFAULT_ICONS = {
  // Action types
  download: { emoji: '📥', unicode: '↓', ascii: 'v', plain: '[D]' },
  upload: { emoji: '📤', unicode: '↑', ascii: '^', plain: '[U]' },
  settings: { emoji: '⚙️', unicode: '⚙', ascii: '*', plain: '[*]' },
  docs: { emoji: '📋', unicode: '☰', ascii: '=', plain: '[=]' },
  stats: { emoji: '📊', unicode: '▪', ascii: '#', plain: '[#]' },
  refresh: { emoji: '🔄', unicode: '↻', ascii: '@', plain: '[@]' },
  help: { emoji: '❓', unicode: '?', ascii: '?', plain: '[?]' },
  exit: { emoji: '🚪', unicode: '×', ascii: 'x', plain: '[X]' },

  // Status indicators
  success: { emoji: '✅', unicode: '✓', ascii: '+', plain: '[+]' },
  error: { emoji: '❌', unicode: '✗', ascii: '-', plain: '[-]' },
  warning: { emoji: '⚠️', unicode: '!', ascii: '!', plain: '[!]' },
  info: { emoji: 'ℹ️', unicode: 'i', ascii: 'i', plain: '[i]' },
  neutral: { emoji: '•', unicode: '•', ascii: '*', plain: '[*]' },

  // Selection indicators
  selected: { emoji: '▶', unicode: '▶', ascii: '>', plain: '>' },
  unselected: { emoji: ' ', unicode: ' ', ascii: ' ', plain: ' ' },

  // Category icons
  action: { emoji: '⚡', unicode: '►', ascii: '>', plain: '[>]' },
  utility: { emoji: '🔧', unicode: '◆', ascii: '+', plain: '[+]' },
  destructive: { emoji: '⚠️', unicode: '!', ascii: '!', plain: '[!]' },
  info: { emoji: 'ℹ️', unicode: 'i', ascii: 'i', plain: '[i]' }
};

class IconMapper {
  /**
   * Creates a new IconMapper instance
   *
   * @param {TerminalDetector} terminalDetector - Terminal capability detector
   * @param {FallbackLogger} [fallbackLogger=null] - Optional fallback logger for debugging
   *
   * @example
   * const detector = new TerminalDetector();
   * detector.initialize(chalk);
   * const iconMapper = new IconMapper(detector);
   *
   * const downloadIcon = iconMapper.getIcon('download');
   * console.log(`${downloadIcon} Download file`);
   */
  constructor(terminalDetector, fallbackLogger = null) {
    if (!terminalDetector) {
      throw new TypeError('IconMapper requires a TerminalDetector instance');
    }

    this.terminalDetector = terminalDetector;
    this.customIcons = {}; // User-registered custom icons
    this.iconCache = new Map(); // Cache for resolved icons
    this.lastCapabilities = null; // Track capabilities for cache invalidation

    // Fallback logger for production debugging
    if (fallbackLogger) {
      this.fallbackLogger = fallbackLogger;
    } else {
      // Use global logger if available
      const { getGlobalLogger } = require('./FallbackLogger');
      this.fallbackLogger = getGlobalLogger();
    }

    // Setup listener to invalidate cache when terminal capabilities change
    this._setupCapabilityChangeDetection();
  }

  /**
   * Gets icon for a specific action type
   *
   * Fallback chain:
   * 1. If emojis supported → return emoji
   * 2. Else if Unicode supported → return unicode symbol
   * 3. Else if ASCII supported → return ASCII character
   * 4. Else → return plain text fallback
   *
   * Custom icons registered via registerIcon() take precedence over defaults.
   *
   * @param {string} actionType - Type of action (download, upload, settings, docs, stats, refresh, help, exit)
   * @returns {string} Icon string appropriate for terminal capabilities
   *
   * @example
   * const icon = iconMapper.getIcon('download');
   * // With emoji support: '📥'
   * // With unicode support: '↓'
   * // With ASCII only: 'v'
   * // Plain text: '[D]'
   */
  getIcon(actionType) {
    // Check cache first for performance
    const cacheKey = `action:${actionType}`;
    if (this._isCacheValid() && this.iconCache.has(cacheKey)) {
      return this.iconCache.get(cacheKey);
    }

    // Get icon set (custom takes precedence over default)
    const iconSet = this.customIcons[actionType] || DEFAULT_ICONS[actionType];

    if (!iconSet) {
      console.warn(`IconMapper: Unknown action type '${actionType}', using neutral icon`);
      return this._resolveIconFromSet(DEFAULT_ICONS.neutral);
    }

    // Resolve icon based on terminal capabilities
    const resolvedIcon = this._resolveIconFromSet(iconSet);

    // Cache resolved icon
    this.iconCache.set(cacheKey, resolvedIcon);

    return resolvedIcon;
  }

  /**
   * Gets status indicator icon
   *
   * Status types:
   * - success: ✅ / ✓ / + / [+]
   * - error: ❌ / ✗ / - / [-]
   * - warning: ⚠️ / ! / ! / [!]
   * - info: ℹ️ / i / i / [i]
   * - neutral: • / • / * / [*]
   *
   * @param {StatusType} status - Status type
   * @returns {string} Status icon appropriate for terminal capabilities
   *
   * @example
   * const successIcon = iconMapper.getStatusIcon('success');
   * console.log(`${successIcon} Operation completed successfully`);
   */
  getStatusIcon(status) {
    // Validate status type
    const validStatuses = ['success', 'error', 'warning', 'info', 'neutral'];
    if (!validStatuses.includes(status)) {
      console.warn(`IconMapper: Invalid status type '${status}', using neutral`);
      status = 'neutral';
    }

    // Check cache first
    const cacheKey = `status:${status}`;
    if (this._isCacheValid() && this.iconCache.has(cacheKey)) {
      return this.iconCache.get(cacheKey);
    }

    // Get icon set from defaults
    const iconSet = DEFAULT_ICONS[status];
    const resolvedIcon = this._resolveIconFromSet(iconSet);

    // Cache resolved icon
    this.iconCache.set(cacheKey, resolvedIcon);

    return resolvedIcon;
  }

  /**
   * Gets selection indicator
   *
   * Returns appropriate marker for selected state:
   * - With emoji/Unicode: '▶'
   * - With ASCII: '>'
   * - Plain text: '>'
   *
   * @returns {string} Selection arrow/marker
   *
   * @example
   * const indicator = iconMapper.getSelectionIndicator();
   * console.log(`${indicator} Selected option`);
   * console.log(`  Unselected option`);
   */
  getSelectionIndicator() {
    // Check cache first
    const cacheKey = 'selection:indicator';
    if (this._isCacheValid() && this.iconCache.has(cacheKey)) {
      return this.iconCache.get(cacheKey);
    }

    const iconSet = DEFAULT_ICONS.selected;
    const resolvedIcon = this._resolveIconFromSet(iconSet);

    // Cache resolved icon
    this.iconCache.set(cacheKey, resolvedIcon);

    return resolvedIcon;
  }

  /**
   * Gets category icon
   *
   * Category types:
   * - action: ⚡ / ► / > / [>]
   * - utility: 🔧 / ◆ / + / [+]
   * - destructive: ⚠️ / ! / ! / [!]
   * - info: ℹ️ / i / i / [i]
   *
   * @param {string} category - Category name
   * @returns {string} Category icon
   *
   * @example
   * const categoryIcon = iconMapper.getCategoryIcon('action');
   * console.log(`${categoryIcon} Action Commands`);
   */
  getCategoryIcon(category) {
    // Check cache first
    const cacheKey = `category:${category}`;
    if (this._isCacheValid() && this.iconCache.has(cacheKey)) {
      return this.iconCache.get(cacheKey);
    }

    // Get icon set from defaults
    const iconSet = DEFAULT_ICONS[category];

    if (!iconSet) {
      console.warn(`IconMapper: Unknown category '${category}', using neutral icon`);
      return this._resolveIconFromSet(DEFAULT_ICONS.neutral);
    }

    const resolvedIcon = this._resolveIconFromSet(iconSet);

    // Cache resolved icon
    this.iconCache.set(cacheKey, resolvedIcon);

    return resolvedIcon;
  }

  /**
   * Registers custom icon mapping
   *
   * Allows overriding default icons or adding new action types.
   * IconSet must include all four levels: emoji, unicode, ascii, plain.
   *
   * @param {string} actionType - Action type identifier
   * @param {IconSet} iconSet - Icon set with all four fallback levels
   *
   * @throws {TypeError} If iconSet is missing required properties
   *
   * @example
   * iconMapper.registerIcon('deploy', {
   *   emoji: '🚀',
   *   unicode: '↑',
   *   ascii: '^',
   *   plain: '[D]'
   * });
   *
   * const deployIcon = iconMapper.getIcon('deploy');
   * console.log(`${deployIcon} Deploy to production`);
   */
  registerIcon(actionType, iconSet) {
    // Validate iconSet has all required properties
    const requiredProps = ['emoji', 'unicode', 'ascii', 'plain'];
    const missingProps = requiredProps.filter(prop => !iconSet[prop]);

    if (missingProps.length > 0) {
      throw new TypeError(
        `IconSet must include all properties: ${requiredProps.join(', ')}. ` +
        `Missing: ${missingProps.join(', ')}`
      );
    }

    // Validate all properties are strings
    for (const prop of requiredProps) {
      if (typeof iconSet[prop] !== 'string') {
        throw new TypeError(`IconSet property '${prop}' must be a string`);
      }
    }

    // Register custom icon
    this.customIcons[actionType] = iconSet;

    // Invalidate cache for this action type
    this.iconCache.delete(`action:${actionType}`);

    console.debug(`IconMapper: Registered custom icon for '${actionType}'`);
  }

  /**
   * Clears the icon cache
   *
   * Useful when terminal capabilities change or custom icons are updated.
   * Cache is automatically cleared when terminal resize is detected.
   */
  clearCache() {
    this.iconCache.clear();
    this.lastCapabilities = null;
    console.debug('IconMapper: Cache cleared');
  }

  /**
   * Resolves icon from IconSet based on terminal capabilities
   *
   * Fallback chain:
   * 1. emoji (if supportsEmojis)
   * 2. unicode (if supportsUnicode)
   * 3. ascii (if basic terminal)
   * 4. plain (fallback for all)
   *
   * @param {IconSet} iconSet - Icon set with all fallback levels
   * @returns {string} Resolved icon
   * @private
   */
  _resolveIconFromSet(iconSet) {
    const capabilities = this.terminalDetector.detect();

    // Emoji support (highest priority)
    if (capabilities.supportsEmojis && iconSet.emoji) {
      return iconSet.emoji;
    }

    // Unicode support (second priority)
    if (capabilities.supportsUnicode && iconSet.unicode) {
      // Log fallback if we expected emoji but got unicode
      if (capabilities.supportsEmojis && !iconSet.emoji) {
        this._logFallback('Emoji not available', 'Unicode');
      }
      return iconSet.unicode;
    }

    // ASCII support (third priority)
    if (iconSet.ascii) {
      // Log fallback if we expected unicode
      if (capabilities.supportsUnicode) {
        this._logFallback('Unicode not available', 'ASCII');
      } else if (capabilities.supportsEmojis) {
        this._logFallback('Emoji/Unicode not available', 'ASCII');
      }
      return iconSet.ascii;
    }

    // Plain text fallback (always available)
    this._logFallback('No graphics support', 'Plain text');
    return iconSet.plain;
  }

  /**
   * Logs a fallback event for production debugging
   *
   * @param {string} reason - Reason for fallback
   * @param {string} fallbackUsed - Fallback strategy used
   * @private
   */
  _logFallback(reason, fallbackUsed) {
    // Log to FallbackLogger for aggregation
    if (this.fallbackLogger) {
      this.fallbackLogger.log('IconMapper', reason, fallbackUsed);
    }

    // Also log to console in debug mode
    if (process.env.DEBUG) {
      console.debug(`[IconMapper] Fallback: ${reason} → ${fallbackUsed}`);
    }
  }

  /**
   * Checks if cached icons are still valid
   *
   * Cache is invalid if terminal capabilities have changed (e.g., resize, different color level)
   *
   * @returns {boolean} True if cache is valid
   * @private
   */
  _isCacheValid() {
    const currentCapabilities = this.terminalDetector.detect();

    // No cache yet
    if (!this.lastCapabilities) {
      this.lastCapabilities = currentCapabilities;
      return false;
    }

    // Check if relevant capabilities have changed
    const capabilitiesChanged =
      this.lastCapabilities.supportsEmojis !== currentCapabilities.supportsEmojis ||
      this.lastCapabilities.supportsUnicode !== currentCapabilities.supportsUnicode;

    if (capabilitiesChanged) {
      console.debug('IconMapper: Terminal capabilities changed, invalidating cache');
      this.lastCapabilities = currentCapabilities;
      return false;
    }

    return true;
  }

  /**
   * Sets up detection for terminal capability changes
   *
   * Listens to terminal resize events to invalidate cache when needed.
   *
   * @private
   */
  _setupCapabilityChangeDetection() {
    // Listen to resize events from TerminalDetector
    // This ensures cache is invalidated if terminal capabilities change
    if (this.terminalDetector.onResize) {
      this.terminalDetector.onResize(() => {
        // Terminal resized, capabilities might have changed
        this.clearCache();
      });
    }
  }
}

module.exports = IconMapper;
