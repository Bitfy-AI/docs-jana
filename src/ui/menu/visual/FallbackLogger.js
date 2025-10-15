/**
 * FallbackLogger - Sistema de logging para eventos de fallback em componentes visuais
 *
 * Captura e agrega eventos de fallback (Unicode → ASCII → Plain) para:
 * - Debugging de compatibilidade de terminal
 * - Análise de UX em diferentes ambientes
 * - Decisões data-driven sobre qualidade de fallbacks
 *
 * @example
 * const logger = new FallbackLogger();
 * logger.log('BorderRenderer', 'Unicode not supported', 'ASCII');
 * logger.log('IconMapper', 'Emoji not supported', 'Unicode');
 *
 * // Get aggregated report
 * const report = logger.getReport();
 * // {
 * //   'BorderRenderer:Unicode not supported': 15,
 * //   'IconMapper:Emoji not supported': 8
 * // }
 */
class FallbackLogger {
  /**
   * Creates a new FallbackLogger instance
   *
   * @param {Object} options - Configuration options
   * @param {boolean} options.enabled - Enable/disable logging (default: FALLBACK_DEBUG env var)
   * @param {boolean} options.verbose - Enable verbose console output (default: VERBOSE env var)
   * @param {number} options.maxEvents - Maximum events to store (default: 1000)
   */
  constructor(options = {}) {
    this.enabled = options.enabled ?? (process.env.FALLBACK_DEBUG === 'true');
    this.verbose = options.verbose ?? (process.env.VERBOSE === 'true');
    this.maxEvents = options.maxEvents || 1000;

    /**
     * Array of fallback events
     * @type {Array<FallbackEvent>}
     */
    this.events = [];

    /**
     * Aggregated counts by component:reason key
     * @type {Map<string, number>}
     */
    this.aggregated = new Map();
  }

  /**
   * Logs a fallback event
   *
   * @param {string} component - Component name (e.g., 'BorderRenderer', 'IconMapper')
   * @param {string} reason - Reason for fallback (e.g., 'Unicode not supported')
   * @param {string} fallbackUsed - Fallback strategy used (e.g., 'ASCII', 'Plain')
   *
   * @example
   * logger.log('BorderRenderer', 'Unicode not supported', 'ASCII');
   * logger.log('IconMapper', 'Emoji rendering failed', 'Unicode');
   */
  log(component, reason, fallbackUsed) {
    if (!this.enabled) return;

    const event = {
      timestamp: Date.now(),
      component,
      reason,
      fallbackUsed
    };

    // Add to events array
    this.events.push(event);

    // Enforce max events limit (FIFO)
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // Update aggregated counts
    const key = `${component}:${reason}`;
    const currentCount = this.aggregated.get(key) || 0;
    this.aggregated.set(key, currentCount + 1);

    // Verbose console output
    if (this.verbose) {
      console.warn(`[Fallback] ${component}: ${reason} → ${fallbackUsed}`);
    }
  }

  /**
   * Gets aggregated report of fallback events
   *
   * @returns {Object} Report object with component:reason keys and occurrence counts
   *
   * @example
   * const report = logger.getReport();
   * // {
   * //   'BorderRenderer:Unicode not supported': 15,
   * //   'IconMapper:Emoji not supported': 8,
   * //   'LayoutManager:Wide character detection failed': 3
   * // }
   */
  getReport() {
    const report = {};

    for (const [key, count] of this.aggregated.entries()) {
      report[key] = count;
    }

    return report;
  }

  /**
   * Gets detailed report with breakdown by component
   *
   * @returns {Object} Detailed report grouped by component
   *
   * @example
   * const report = logger.getDetailedReport();
   * // {
   * //   BorderRenderer: {
   * //     totalFallbacks: 15,
   * //     reasons: {
   * //       'Unicode not supported': { count: 15, fallbacks: ['ASCII'] }
   * //     }
   * //   }
   * // }
   */
  getDetailedReport() {
    const report = {};

    for (const event of this.events) {
      const { component, reason, fallbackUsed } = event;

      // Initialize component entry
      if (!report[component]) {
        report[component] = {
          totalFallbacks: 0,
          reasons: {}
        };
      }

      // Increment total
      report[component].totalFallbacks++;

      // Initialize reason entry
      if (!report[component].reasons[reason]) {
        report[component].reasons[reason] = {
          count: 0,
          fallbacks: []
        };
      }

      // Increment reason count
      report[component].reasons[reason].count++;

      // Track unique fallbacks used
      if (!report[component].reasons[reason].fallbacks.includes(fallbackUsed)) {
        report[component].reasons[reason].fallbacks.push(fallbackUsed);
      }
    }

    return report;
  }

  /**
   * Gets formatted report for CLI display
   *
   * @returns {string} Human-readable formatted report
   *
   * @example
   * console.log(logger.getFormattedReport());
   * // ╔════════════════════════════════════╗
   * // ║   FALLBACK REPORT                  ║
   * // ╚════════════════════════════════════╝
   * //
   * // BorderRenderer: 15 fallbacks
   * //   - Unicode not supported → ASCII (15x)
   * // ...
   */
  getFormattedReport() {
    const detailed = this.getDetailedReport();
    const components = Object.keys(detailed).sort();

    if (components.length === 0) {
      return 'No fallback events recorded.';
    }

    let output = '';
    output += '╔════════════════════════════════════════════════════════════╗\n';
    output += '║              FALLBACK REPORT                               ║\n';
    output += '╚════════════════════════════════════════════════════════════╝\n';
    output += '\n';

    for (const component of components) {
      const data = detailed[component];
      output += `${component}: ${data.totalFallbacks} fallback${data.totalFallbacks !== 1 ? 's' : ''}\n`;

      for (const [reason, info] of Object.entries(data.reasons)) {
        const fallbacksStr = info.fallbacks.join(', ');
        output += `  - ${reason} → ${fallbacksStr} (${info.count}x)\n`;
      }

      output += '\n';
    }

    output += `Total Events: ${this.events.length}\n`;
    output += `Enabled: ${this.enabled ? 'Yes' : 'No'}\n`;
    output += `Verbose: ${this.verbose ? 'Yes' : 'No'}\n`;

    return output;
  }

  /**
   * Clears all logged events
   *
   * Useful for testing or resetting state between sessions
   */
  reset() {
    this.events = [];
    this.aggregated.clear();
  }

  /**
   * Gets statistics about fallback events
   *
   * @returns {Object} Statistics object
   *
   * @example
   * const stats = logger.getStats();
   * // {
   * //   totalEvents: 26,
   * //   uniqueComponents: 3,
   * //   uniqueReasons: 5,
   * //   mostCommonFallback: { component: 'BorderRenderer', reason: 'Unicode not supported', count: 15 },
   * //   timeRange: { first: 1697123456789, last: 1697129876543 }
   * // }
   */
  getStats() {
    if (this.events.length === 0) {
      return {
        totalEvents: 0,
        uniqueComponents: 0,
        uniqueReasons: 0,
        mostCommonFallback: null,
        timeRange: null
      };
    }

    const components = new Set();
    const reasons = new Set();

    for (const event of this.events) {
      components.add(event.component);
      reasons.add(event.reason);
    }

    // Find most common fallback
    let mostCommon = { count: 0 };
    for (const [key, count] of this.aggregated.entries()) {
      if (count > mostCommon.count) {
        const [component, reason] = key.split(':');
        mostCommon = { component, reason, count };
      }
    }

    return {
      totalEvents: this.events.length,
      uniqueComponents: components.size,
      uniqueReasons: reasons.size,
      mostCommonFallback: mostCommon.count > 0 ? mostCommon : null,
      timeRange: {
        first: this.events[0].timestamp,
        last: this.events[this.events.length - 1].timestamp
      }
    };
  }

  /**
   * Exports events to JSON
   *
   * @returns {string} JSON string of all events
   *
   * @example
   * const json = logger.exportJSON();
   * fs.writeFileSync('fallback-report.json', json);
   */
  exportJSON() {
    return JSON.stringify({
      metadata: {
        exportedAt: Date.now(),
        totalEvents: this.events.length,
        enabled: this.enabled
      },
      events: this.events,
      aggregated: Object.fromEntries(this.aggregated),
      stats: this.getStats()
    }, null, 2);
  }
}

// Global singleton instance
let globalLogger = null;

/**
 * Gets or creates the global FallbackLogger instance
 *
 * @returns {FallbackLogger} Global logger instance
 *
 * @example
 * const logger = getGlobalLogger();
 * logger.log('BorderRenderer', 'Unicode not supported', 'ASCII');
 */
function getGlobalLogger() {
  if (!globalLogger) {
    globalLogger = new FallbackLogger();
  }
  return globalLogger;
}

/**
 * Resets the global logger instance (useful for testing)
 */
function resetGlobalLogger() {
  if (globalLogger) {
    globalLogger.reset();
  }
  globalLogger = null;
}

module.exports = {
  FallbackLogger,
  getGlobalLogger,
  resetGlobalLogger
};
