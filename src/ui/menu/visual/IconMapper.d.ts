/**
 * IconMapper TypeScript Definitions
 * @module ui/menu/visual/IconMapper
 */

import { TerminalDetector } from './TerminalDetector';
import { FallbackLogger } from './FallbackLogger';

/**
 * Status type for status icons
 */
export type StatusType = 'success' | 'error' | 'warning' | 'info' | 'neutral';

/**
 * Action type for action icons
 */
export type ActionType =
  | 'download'
  | 'upload'
  | 'settings'
  | 'docs'
  | 'stats'
  | 'refresh'
  | 'help'
  | 'exit';

/**
 * Category type for category icons
 */
export type CategoryType = 'action' | 'utility' | 'destructive' | 'info';

/**
 * Icon set with fallback chain
 *
 * Fallback order: emoji → unicode → ascii → plain
 */
export interface IconSet {
  /**
   * Emoji representation (e.g., '📥')
   * Used on terminals with emoji support
   */
  emoji: string;

  /**
   * Unicode character representation (e.g., '↓')
   * Used on terminals with Unicode support
   */
  unicode: string;

  /**
   * ASCII fallback (e.g., 'v')
   * Used on terminals with basic ASCII only
   */
  ascii: string;

  /**
   * Plain text fallback (e.g., '[D]')
   * Always works, used as ultimate fallback
   */
  plain: string;
}

/**
 * IconMapper - Maps action types to appropriate icons with fallbacks
 *
 * Responsibilities:
 * - Map action types to appropriate icons (emoji, Unicode, ASCII, or plain text)
 * - Provide fallback chain: emoji → unicode → ascii → plain
 * - Allow custom icon registration
 * - Cache resolved icons for performance
 * - Provide status icons and selection indicators
 */
export class IconMapper {
  /**
   * Terminal capability detector
   */
  readonly terminalDetector: TerminalDetector;

  /**
   * Fallback logger for production debugging
   */
  readonly fallbackLogger: FallbackLogger;

  /**
   * User-registered custom icons
   */
  readonly customIcons: Record<string, IconSet>;

  /**
   * Cache for resolved icons
   */
  readonly iconCache: Map<string, string>;

  /**
   * Last known capabilities for cache invalidation
   */
  lastCapabilities: any | null;

  /**
   * Creates a new IconMapper instance
   *
   * @param terminalDetector - Terminal capability detector
   * @param fallbackLogger - Optional fallback logger for debugging
   *
   * @example
   * ```typescript
   * const detector = new TerminalDetector();
   * const iconMapper = new IconMapper(detector);
   *
   * const downloadIcon = iconMapper.getIcon('download');
   * console.log(`${downloadIcon} Download file`);
   * ```
   */
  constructor(terminalDetector: TerminalDetector, fallbackLogger?: FallbackLogger | null);

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
   * @param actionType - Type of action
   * @returns Icon string appropriate for terminal capabilities
   *
   * @example
   * ```typescript
   * const icon = iconMapper.getIcon('download');
   * // With emoji support: '📥'
   * // With unicode support: '↓'
   * // With ASCII only: 'v'
   * // Plain text: '[D]'
   * ```
   */
  getIcon(actionType: ActionType | string): string;

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
   * @param status - Status type
   * @returns Status icon appropriate for terminal capabilities
   *
   * @example
   * ```typescript
   * const successIcon = iconMapper.getStatusIcon('success');
   * console.log(`${successIcon} Operation completed successfully`);
   * ```
   */
  getStatusIcon(status: StatusType): string;

  /**
   * Gets selection indicator
   *
   * Returns appropriate marker for selected state:
   * - With emoji/Unicode: '▶'
   * - With ASCII: '>'
   * - Plain text: '>'
   *
   * @returns Selection arrow/marker
   *
   * @example
   * ```typescript
   * const indicator = iconMapper.getSelectionIndicator();
   * console.log(`${indicator} Selected option`);
   * console.log(`  Unselected option`);
   * ```
   */
  getSelectionIndicator(): string;

  /**
   * Gets category icon
   *
   * Category types:
   * - action: ⚡ / ► / > / [>]
   * - utility: 🔧 / ◆ / + / [+]
   * - destructive: ⚠️ / ! / ! / [!]
   * - info: ℹ️ / i / i / [i]
   *
   * @param category - Category name
   * @returns Category icon
   *
   * @example
   * ```typescript
   * const categoryIcon = iconMapper.getCategoryIcon('action');
   * console.log(`${categoryIcon} Action Commands`);
   * ```
   */
  getCategoryIcon(category: CategoryType): string;

  /**
   * Registers custom icon mapping
   *
   * Allows overriding default icons or adding new action types.
   * IconSet must include all four levels: emoji, unicode, ascii, plain.
   *
   * @param actionType - Action type identifier
   * @param iconSet - Icon set with all four fallback levels
   * @throws {TypeError} If iconSet is missing required properties
   *
   * @example
   * ```typescript
   * iconMapper.registerIcon('deploy', {
   *   emoji: '🚀',
   *   unicode: '↑',
   *   ascii: '^',
   *   plain: '[D]'
   * });
   *
   * const deployIcon = iconMapper.getIcon('deploy');
   * console.log(`${deployIcon} Deploy to production`);
   * ```
   */
  registerIcon(actionType: string, iconSet: IconSet): void;

  /**
   * Clears the icon cache
   *
   * Useful when terminal capabilities change or custom icons are updated.
   * Cache is automatically cleared when terminal resize is detected.
   */
  clearCache(): void;
}

export default IconMapper;
