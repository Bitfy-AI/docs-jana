/**
 * FallbackLogger TypeScript Definitions
 * @module ui/menu/visual/FallbackLogger
 */

/**
 * Single fallback event
 */
export interface FallbackEvent {
  /**
   * Timestamp of the event (ms since epoch)
   */
  timestamp: number;

  /**
   * Component that triggered the fallback
   * (e.g., 'BorderRenderer', 'IconMapper')
   */
  component: string;

  /**
   * Reason for the fallback
   * (e.g., 'Unicode not supported', 'Emoji not available')
   */
  reason: string;

  /**
   * Fallback strategy used
   * (e.g., 'ASCII', 'Unicode', 'Plain text')
   */
  fallbackUsed: string;
}

/**
 * Aggregated report of fallback events
 */
export interface FallbackReport {
  /**
   * Map of "component:reason" keys to occurrence counts
   *
   * @example
   * {
   *   'BorderRenderer:Unicode not supported': 15,
   *   'IconMapper:Emoji not available': 8
   * }
   */
  [key: string]: number;
}

/**
 * Detailed report breakdown by component
 */
export interface DetailedReport {
  /**
   * Per-component breakdown
   */
  [component: string]: {
    /**
     * Total fallback events for this component
     */
    totalFallbacks: number;

    /**
     * Breakdown by reason
     */
    reasons: {
      [reason: string]: {
        /**
         * Count of occurrences for this reason
         */
        count: number;

        /**
         * List of unique fallback strategies used
         */
        fallbacks: string[];
      };
    };
  };
}

/**
 * Statistics about fallback events
 */
export interface FallbackStats {
  /**
   * Total number of events logged
   */
  totalEvents: number;

  /**
   * Number of unique components that triggered fallbacks
   */
  uniqueComponents: number;

  /**
   * Number of unique reasons for fallbacks
   */
  uniqueReasons: number;

  /**
   * Most common fallback event
   */
  mostCommonFallback: {
    component: string;
    reason: string;
    count: number;
  } | null;

  /**
   * Time range of logged events
   */
  timeRange: {
    /**
     * Timestamp of first event
     */
    first: number;

    /**
     * Timestamp of last event
     */
    last: number;
  } | null;
}

/**
 * FallbackLogger options
 */
export interface FallbackLoggerOptions {
  /**
   * Enable/disable logging
   * @default process.env.FALLBACK_DEBUG === 'true'
   */
  enabled?: boolean;

  /**
   * Enable verbose console output
   * @default process.env.VERBOSE === 'true'
   */
  verbose?: boolean;

  /**
   * Maximum events to store (FIFO)
   * @default 1000
   */
  maxEvents?: number;
}

/**
 * FallbackLogger - Sistema de logging para eventos de fallback
 *
 * Captura e agrega eventos de fallback (Unicode → ASCII → Plain) para:
 * - Debugging de compatibilidade de terminal
 * - Análise de UX em diferentes ambientes
 * - Decisões data-driven sobre qualidade de fallbacks
 */
export class FallbackLogger {
  /**
   * Whether logging is enabled
   */
  readonly enabled: boolean;

  /**
   * Whether verbose console output is enabled
   */
  readonly verbose: boolean;

  /**
   * Maximum events to store
   */
  readonly maxEvents: number;

  /**
   * Array of fallback events
   */
  readonly events: FallbackEvent[];

  /**
   * Aggregated counts by component:reason key
   */
  readonly aggregated: Map<string, number>;

  /**
   * Creates a new FallbackLogger instance
   *
   * @param options - Configuration options
   *
   * @example
   * ```typescript
   * const logger = new FallbackLogger({ enabled: true, verbose: false });
   * logger.log('BorderRenderer', 'Unicode not supported', 'ASCII');
   * logger.log('IconMapper', 'Emoji not supported', 'Unicode');
   *
   * const report = logger.getReport();
   * console.log(report);
   * // {
   * //   'BorderRenderer:Unicode not supported': 1,
   * //   'IconMapper:Emoji not supported': 1
   * // }
   * ```
   */
  constructor(options?: FallbackLoggerOptions);

  /**
   * Logs a fallback event
   *
   * @param component - Component name (e.g., 'BorderRenderer', 'IconMapper')
   * @param reason - Reason for fallback (e.g., 'Unicode not supported')
   * @param fallbackUsed - Fallback strategy used (e.g., 'ASCII', 'Plain')
   *
   * @example
   * ```typescript
   * logger.log('BorderRenderer', 'Unicode not supported', 'ASCII');
   * logger.log('IconMapper', 'Emoji rendering failed', 'Unicode');
   * ```
   */
  log(component: string, reason: string, fallbackUsed: string): void;

  /**
   * Gets aggregated report of fallback events
   *
   * @returns Report object with component:reason keys and occurrence counts
   *
   * @example
   * ```typescript
   * const report = logger.getReport();
   * // {
   * //   'BorderRenderer:Unicode not supported': 15,
   * //   'IconMapper:Emoji not supported': 8,
   * //   'LayoutManager:Wide character detection failed': 3
   * // }
   * ```
   */
  getReport(): FallbackReport;

  /**
   * Gets detailed report with breakdown by component
   *
   * @returns Detailed report grouped by component
   *
   * @example
   * ```typescript
   * const report = logger.getDetailedReport();
   * // {
   * //   BorderRenderer: {
   * //     totalFallbacks: 15,
   * //     reasons: {
   * //       'Unicode not supported': { count: 15, fallbacks: ['ASCII'] }
   * //     }
   * //   }
   * // }
   * ```
   */
  getDetailedReport(): DetailedReport;

  /**
   * Gets formatted report for CLI display
   *
   * @returns Human-readable formatted report
   *
   * @example
   * ```typescript
   * console.log(logger.getFormattedReport());
   * // ╔════════════════════════════════════╗
   * // ║   FALLBACK REPORT                  ║
   * // ╚════════════════════════════════════╝
   * //
   * // BorderRenderer: 15 fallbacks
   * //   - Unicode not supported → ASCII (15x)
   * // ...
   * ```
   */
  getFormattedReport(): string;

  /**
   * Clears all logged events
   *
   * Useful for testing or resetting state between sessions
   */
  reset(): void;

  /**
   * Gets statistics about fallback events
   *
   * @returns Statistics object
   *
   * @example
   * ```typescript
   * const stats = logger.getStats();
   * // {
   * //   totalEvents: 26,
   * //   uniqueComponents: 3,
   * //   uniqueReasons: 5,
   * //   mostCommonFallback: {
   * //     component: 'BorderRenderer',
   * //     reason: 'Unicode not supported',
   * //     count: 15
   * //   },
   * //   timeRange: { first: 1697123456789, last: 1697129876543 }
   * // }
   * ```
   */
  getStats(): FallbackStats;

  /**
   * Exports events to JSON
   *
   * @returns JSON string of all events
   *
   * @example
   * ```typescript
   * const json = logger.exportJSON();
   * fs.writeFileSync('fallback-report.json', json);
   * ```
   */
  exportJSON(): string;
}

/**
 * Gets or creates the global FallbackLogger instance
 *
 * @returns Global logger instance
 *
 * @example
 * ```typescript
 * const logger = getGlobalLogger();
 * logger.log('BorderRenderer', 'Unicode not supported', 'ASCII');
 * ```
 */
export function getGlobalLogger(): FallbackLogger;

/**
 * Resets the global logger instance (useful for testing)
 */
export function resetGlobalLogger(): void;

export default FallbackLogger;
