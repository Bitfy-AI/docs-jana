/**
 * BorderRenderer TypeScript Definitions
 * @module ui/menu/visual/BorderRenderer
 */

import { TerminalDetector } from './TerminalDetector';
import { FallbackLogger } from './FallbackLogger';

/**
 * Border style preset options
 */
export type BorderStyle = 'single' | 'double' | 'bold' | 'rounded' | 'ascii';

/**
 * Character set for rendering borders
 */
export interface BorderCharSet {
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
  horizontal: string;
  vertical: string;
  cross: string;
  teeLeft: string;
  teeRight: string;
  teeTop: string;
  teeBottom: string;
}

/**
 * Options for rendering a bordered box
 */
export interface BorderBoxOptions {
  /**
   * Border style preset
   * @default 'single'
   */
  style?: BorderStyle;

  /**
   * Internal padding in spaces
   * @default 1
   */
  padding?: number;

  /**
   * Text alignment
   * @default 'left'
   */
  align?: 'left' | 'center' | 'right';

  /**
   * Border color (theme color name)
   * @default null
   */
  color?: string | null;
}

/**
 * BorderRenderer - Renders decorative borders with automatic fallbacks
 *
 * Responsibilities:
 * - Render decorative borders using Unicode or ASCII characters
 * - Apply automatic fallbacks based on terminal capabilities
 * - Provide different border styles (single, double, bold, rounded)
 * - Calculate and adjust border width dynamically
 * - Support boxed text rendering with padding and alignment
 */
export class BorderRenderer {
  /**
   * Terminal capability detector
   */
  readonly terminalDetector: TerminalDetector;

  /**
   * Visual design constants
   */
  readonly visualConstants: any;

  /**
   * Optional theme engine for color application
   */
  readonly themeEngine: any | null;

  /**
   * Fallback logger for production debugging
   */
  readonly fallbackLogger: FallbackLogger;

  /**
   * Cache for resolved charsets
   */
  readonly charsetCache: Map<string, BorderCharSet>;

  /**
   * Creates a BorderRenderer instance
   *
   * @param terminalDetector - Terminal capability detector
   * @param visualConstants - Visual design constants (BORDER_CHARS, etc)
   * @param themeEngine - Optional theme engine for color application
   * @param fallbackLogger - Optional fallback logger for debugging
   *
   * @example
   * ```typescript
   * const detector = new TerminalDetector();
   * const renderer = new BorderRenderer(detector, VisualConstants);
   * ```
   */
  constructor(
    terminalDetector: TerminalDetector,
    visualConstants: any,
    themeEngine?: any | null,
    fallbackLogger?: FallbackLogger | null
  );

  /**
   * Gets the appropriate border character set for current terminal
   *
   * Automatically detects terminal capabilities and applies fallbacks:
   * 1. If Unicode supported → use Unicode charset for requested style
   * 2. If Unicode not supported → use ASCII charset
   * 3. If style is 'ascii' → always use ASCII charset
   *
   * @param style - Border style preset
   * @returns Character set for the border style
   *
   * @example
   * ```typescript
   * // Terminal with Unicode support
   * const charset = renderer.getCharSet('double');
   * // Returns: { topLeft: '╔', horizontal: '═', ... }
   * ```
   */
  getCharSet(style?: BorderStyle): BorderCharSet;

  /**
   * Renders a top border line
   *
   * Format: topLeft + horizontal (repeated) + topRight
   *
   * @param width - Border width in columns
   * @param style - Border style preset
   * @returns Formatted top border string
   *
   * @example
   * ```typescript
   * // Unicode terminal, width 25
   * const border = renderer.renderTopBorder(25, 'double');
   * // Returns: "╔═══════════════════════╗"
   * ```
   */
  renderTopBorder(width: number, style?: BorderStyle): string;

  /**
   * Renders a bottom border line
   *
   * Format: bottomLeft + horizontal (repeated) + bottomRight
   *
   * @param width - Border width in columns
   * @param style - Border style preset
   * @returns Formatted bottom border string
   *
   * @example
   * ```typescript
   * const border = renderer.renderBottomBorder(25, 'single');
   * // Returns: "└─────────────────────┘"
   * ```
   */
  renderBottomBorder(width: number, style?: BorderStyle): string;

  /**
   * Renders a separator line (horizontal divider)
   *
   * Format: teeRight + horizontal (repeated) + teeLeft
   * Used to separate sections within a bordered area.
   *
   * @param width - Separator width in columns
   * @param style - Border style preset
   * @returns Formatted separator string
   *
   * @example
   * ```typescript
   * const separator = renderer.renderSeparator(25, 'single');
   * // Returns: "├─────────────────────┤"
   * ```
   */
  renderSeparator(width: number, style?: BorderStyle): string;

  /**
   * Renders text enclosed in a complete border box
   *
   * Features:
   * - Automatic width calculation based on text and padding
   * - Text alignment (left, center, right)
   * - Multi-line text support
   * - Optional color application via ThemeEngine
   *
   * @param text - Text content (string or array of lines)
   * @param options - Box styling options
   * @returns Complete boxed text with borders
   *
   * @example
   * ```typescript
   * // Simple box with default options
   * const box = renderer.renderBox('Hello, World!');
   * // ┌───────────────┐
   * // │ Hello, World! │
   * // └───────────────┘
   * ```
   *
   * @example
   * ```typescript
   * // Box with padding and center alignment
   * const box = renderer.renderBox('Title', {
   *   style: 'double',
   *   padding: 2,
   *   align: 'center'
   * });
   * // ╔═══════════╗
   * // ║           ║
   * // ║   Title   ║
   * // ║           ║
   * // ╚═══════════╝
   * ```
   */
  renderBox(text: string | string[], options?: BorderBoxOptions): string;

  /**
   * Clears the charset cache
   *
   * Useful when terminal capabilities might have changed
   */
  clearCache(): void;
}

export default BorderRenderer;
