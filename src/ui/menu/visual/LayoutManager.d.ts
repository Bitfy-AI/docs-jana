/**
 * LayoutManager TypeScript Definitions
 * @module ui/menu/visual/LayoutManager
 */

import { TerminalDetector } from './TerminalDetector';

/**
 * Layout mode based on terminal width
 */
export type LayoutMode = 'expanded' | 'standard' | 'compact';

/**
 * Text wrapping options
 */
export interface WrapOptions {
  /**
   * Maximum width for wrapping
   */
  maxWidth?: number;

  /**
   * Whether to break words that exceed maxWidth
   * @default false
   */
  breakWords?: boolean;

  /**
   * Indent subsequent lines
   * @default 0
   */
  indent?: number;
}

/**
 * LayoutManager - Manages responsive layout calculations
 *
 * Responsibilities:
 * - Determine layout mode based on terminal width
 * - Calculate content widths and padding
 * - Provide text manipulation utilities (truncate, wrap, center)
 * - Handle Unicode character width properly
 * - Cache layout calculations for performance
 */
export class LayoutManager {
  /**
   * Terminal capability detector
   */
  readonly terminalDetector: TerminalDetector;

  /**
   * Visual design constants
   */
  readonly visualConstants: any;

  /**
   * Cache for layout calculations
   */
  readonly layoutCache: Map<string, any>;

  /**
   * Last known terminal width for cache invalidation
   */
  lastWidth: number | null;

  /**
   * Creates a LayoutManager instance
   *
   * @param terminalDetector - Terminal capability detector
   * @param visualConstants - Visual design constants
   *
   * @example
   * ```typescript
   * const detector = new TerminalDetector();
   * const manager = new LayoutManager(detector, VisualConstants);
   * ```
   */
  constructor(terminalDetector: TerminalDetector, visualConstants: any);

  /**
   * Determines layout mode based on terminal width
   *
   * Layout modes:
   * - expanded: width >= 100 (full features, detailed info)
   * - standard: 80 <= width < 100 (normal layout)
   * - compact: width < 80 (minimal layout, abbreviated labels)
   *
   * @returns Current layout mode
   *
   * @example
   * ```typescript
   * const mode = manager.getLayoutMode();
   * if (mode === 'compact') {
   *   // Use abbreviated labels
   * }
   * ```
   */
  getLayoutMode(): LayoutMode;

  /**
   * Gets usable content width excluding margins
   *
   * Calculation: terminal width - (left margin + right margin)
   * Minimum: 20 columns (enforced for usability)
   *
   * @returns Content width in columns
   *
   * @example
   * ```typescript
   * const width = manager.getContentWidth();
   * const text = manager.truncateText(longText, width);
   * ```
   */
  getContentWidth(): number;

  /**
   * Gets horizontal padding based on layout mode
   *
   * Padding values:
   * - expanded: 3 spaces
   * - standard: 2 spaces
   * - compact: 1 space
   *
   * @returns Horizontal padding in spaces
   *
   * @example
   * ```typescript
   * const padding = manager.getHorizontalPadding();
   * const paddedText = ' '.repeat(padding) + text + ' '.repeat(padding);
   * ```
   */
  getHorizontalPadding(): number;

  /**
   * Gets vertical spacing based on layout mode
   *
   * Spacing values:
   * - expanded: 2 lines
   * - standard: 1 line
   * - compact: 0 lines
   *
   * @returns Vertical spacing in lines
   *
   * @example
   * ```typescript
   * const spacing = manager.getVerticalSpacing();
   * const spacer = '\n'.repeat(spacing);
   * ```
   */
  getVerticalSpacing(): number;

  /**
   * Truncates text to fit within maximum width
   *
   * Features:
   * - Handles Unicode characters properly (emoji, wide chars)
   * - Adds ellipsis (…) if text is truncated
   * - Preserves whole characters (no partial emoji)
   *
   * @param text - Text to truncate
   * @param maxWidth - Maximum width in columns
   * @returns Truncated text with ellipsis if needed
   *
   * @example
   * ```typescript
   * const text = 'This is a very long text that needs truncation';
   * const truncated = manager.truncateText(text, 20);
   * // Returns: "This is a very lo…"
   * ```
   */
  truncateText(text: string, maxWidth: number): string;

  /**
   * Wraps text to fit within maximum width
   *
   * Features:
   * - Intelligent word-wrap (breaks at word boundaries)
   * - Handles Unicode characters properly
   * - Optional word breaking for very long words
   * - Optional indentation for subsequent lines
   *
   * @param text - Text to wrap
   * @param maxWidth - Maximum width per line
   * @param options - Wrapping options
   * @returns Array of wrapped lines
   *
   * @example
   * ```typescript
   * const text = 'This is a long paragraph that needs to be wrapped to fit the terminal width.';
   * const lines = manager.wrapText(text, 30);
   * // Returns: [
   * //   'This is a long paragraph',
   * //   'that needs to be wrapped to',
   * //   'fit the terminal width.'
   * // ]
   * ```
   *
   * @example
   * ```typescript
   * // With indentation
   * const lines = manager.wrapText(text, 30, { indent: 4 });
   * // Returns: [
   * //   'This is a long paragraph',
   * //   '    that needs to be wrapped',
   * //   '    to fit the terminal width.'
   * // ]
   * ```
   */
  wrapText(text: string, maxWidth: number, options?: WrapOptions): string[];

  /**
   * Centers text within given width
   *
   * Adds equal padding on left and right to center text.
   * If text is longer than width, truncates with ellipsis.
   *
   * @param text - Text to center
   * @param width - Total width for centering
   * @returns Centered text with padding
   *
   * @example
   * ```typescript
   * const centered = manager.centerText('Title', 20);
   * // Returns: "       Title        " (20 chars total)
   * ```
   */
  centerText(text: string, width: number): string;

  /**
   * Calculates visual width of text
   *
   * Properly handles:
   * - Emoji (2 columns each)
   * - Wide characters (CJK: 2 columns)
   * - Regular ASCII (1 column)
   * - Control characters (0 columns)
   *
   * @param text - Text to measure
   * @returns Visual width in columns
   *
   * @example
   * ```typescript
   * const width = manager.getTextWidth('Hello 世界 🌍');
   * // Returns: 13 (5 ASCII + 4 CJK + 4 emoji)
   * ```
   */
  getTextWidth(text: string): number;

  /**
   * Clears the layout cache
   *
   * Useful when terminal is resized or settings change
   */
  clearCache(): void;
}

export default LayoutManager;
