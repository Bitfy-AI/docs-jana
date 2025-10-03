/**
 * @fileoverview JSON Reporter Plugin for N8N Transfer System
 *
 * This reporter generates comprehensive JSON reports of transfer operations,
 * including metadata, statistics, workflow details, and errors. The output
 * is formatted with 2-space indentation for readability and saved to the
 * reports/ directory for automation and integration purposes.
 *
 * @module n8n-transfer/plugins/reporters/json-reporter
 * @author docs-jana
 * @version 1.0.0
 */

const { BasePlugin } = require('../index');
const fs = require('fs').promises;
const path = require('path');

/**
 * JSON Reporter Plugin
 *
 * Generates comprehensive JSON reports containing complete transfer results,
 * including metadata, statistics, workflow details, and error information.
 * The JSON output is pretty-printed with 2-space indentation and saved to
 * the reports/ directory.
 *
 * @class JSONReporter
 * @extends BasePlugin
 *
 * @example
 * const reporter = new JSONReporter();
 * const transferResult = {
 *   success: true,
 *   totalWorkflows: 50,
 *   successCount: 45,
 *   failureCount: 2,
 *   duplicateCount: 3,
 *   errors: [],
 *   metadata: { source: 'https://source.n8n.io', target: 'https://target.n8n.io' },
 *   startTime: new Date('2025-10-03T10:00:00Z'),
 *   endTime: new Date('2025-10-03T10:05:00Z')
 * };
 * const jsonReport = reporter.generate(transferResult);
 * console.log(jsonReport);
 */
class JSONReporter extends BasePlugin {
  /**
   * Creates a new JSONReporter instance
   *
   * @param {Object} [options={}] - Configuration options for the reporter
   * @param {string} [options.outputDir='reports'] - Directory where reports will be saved
   * @param {boolean} [options.autoSave=true] - Automatically save reports to file
   * @param {boolean} [options.includeWorkflowDetails=true] - Include detailed workflow information
   * @param {boolean} [options.prettyPrint=true] - Enable pretty-printing with 2-space indentation
   *
   * @example
   * const reporter = new JSONReporter({
   *   outputDir: 'custom-reports',
   *   autoSave: true,
   *   prettyPrint: true
   * });
   */
  constructor(options = {}) {
    super('json-reporter', '1.0.0', 'reporter', options);

    this.setDescription(
      'Gera relatórios completos em formato JSON com metadados, estatísticas, ' +
      'detalhes de workflows e erros. Salva automaticamente no diretório reports/.'
    );

    // Validate implementation (ensures generate method exists)
    this.validateImplementation(['generate']);

    // Set default options
    this.options = {
      outputDir: 'reports',
      autoSave: true,
      includeWorkflowDetails: true,
      prettyPrint: true,
      ...options
    };
  }

  /**
   * Generates a comprehensive JSON report from transfer results
   *
   * The JSON structure includes:
   * - metadata: timestamp, duration, source, target URLs
   * - statistics: total, success, failure, duplicate counts
   * - workflows: array with detailed workflow information (if enabled)
   * - errors: array with error details
   * - configuration: transfer options used
   *
   * @param {Object} transferResult - Result of the transfer operation
   * @param {boolean} transferResult.success - Whether the transfer was successful
   * @param {number} transferResult.totalWorkflows - Total workflows processed
   * @param {number} transferResult.successCount - Number of successful transfers
   * @param {number} transferResult.failureCount - Number of failed transfers
   * @param {number} transferResult.duplicateCount - Number of duplicate workflows
   * @param {Object[]} transferResult.errors - Array of error objects
   * @param {Object} transferResult.metadata - Additional metadata
   * @param {Date} transferResult.startTime - Transfer start timestamp
   * @param {Date} transferResult.endTime - Transfer end timestamp
   *
   * @returns {string} JSON-formatted report (pretty-printed with 2-space indentation)
   *
   * @throws {Error} If transferResult is null or undefined
   * @throws {Error} If required fields are missing from transferResult
   *
   * @example
   * const transferResult = {
   *   success: true,
   *   totalWorkflows: 100,
   *   successCount: 95,
   *   failureCount: 2,
   *   duplicateCount: 3,
   *   errors: [
   *     { workflowName: 'Failed Flow', message: 'Network timeout', code: 'TIMEOUT' }
   *   ],
   *   metadata: {
   *     source: 'https://source.n8n.io',
   *     target: 'https://target.n8n.io',
   *     workflows: [
   *       { id: '123', name: 'Customer Onboarding', status: 'transferred' }
   *     ]
   *   },
   *   startTime: new Date('2025-10-03T10:00:00Z'),
   *   endTime: new Date('2025-10-03T10:05:00Z')
   * };
   * const jsonReport = reporter.generate(transferResult);
   */
  generate(transferResult) {
    // Validate input
    if (!transferResult) {
      throw new Error('transferResult é obrigatório para gerar relatório JSON');
    }

    // Validate required fields
    const requiredFields = [
      'success', 'totalWorkflows', 'successCount', 'failureCount',
      'duplicateCount', 'startTime', 'endTime'
    ];

    for (const field of requiredFields) {
      if (transferResult[field] === undefined && field !== 'duplicateCount') {
        throw new Error(`Campo obrigatório ausente em transferResult: ${field}`);
      }
    }

    // Calculate duration
    const startTime = transferResult.startTime instanceof Date
      ? transferResult.startTime
      : new Date(transferResult.startTime);

    const endTime = transferResult.endTime instanceof Date
      ? transferResult.endTime
      : new Date(transferResult.endTime);

    const durationMs = endTime.getTime() - startTime.getTime();
    const durationSeconds = (durationMs / 1000).toFixed(2);

    // Build JSON structure
    const report = {
      metadata: {
        timestamp: new Date().toISOString(),
        duration: {
          milliseconds: durationMs,
          seconds: parseFloat(durationSeconds),
          formatted: this._formatDuration(durationMs)
        },
        source: transferResult.metadata?.source || 'unknown',
        target: transferResult.metadata?.target || 'unknown',
        transferStarted: startTime.toISOString(),
        transferEnded: endTime.toISOString()
      },

      statistics: {
        total: transferResult.totalWorkflows,
        transferred: transferResult.successCount,
        failed: transferResult.failureCount,
        duplicates: transferResult.duplicateCount || 0,
        successRate: this._calculateSuccessRate(
          transferResult.successCount,
          transferResult.totalWorkflows
        ),
        failureRate: this._calculateSuccessRate(
          transferResult.failureCount,
          transferResult.totalWorkflows
        )
      },

      workflows: this._extractWorkflowDetails(transferResult),

      errors: this._formatErrors(transferResult.errors || []),

      configuration: {
        options: transferResult.metadata?.options || {},
        pluginsUsed: transferResult.metadata?.plugins || [],
        deduplicationEnabled: transferResult.duplicateCount > 0,
        validationEnabled: transferResult.metadata?.validationEnabled || false
      },

      reportGeneration: {
        generatedBy: this.getName(),
        version: this.getVersion(),
        generatedAt: new Date().toISOString()
      }
    };

    // Convert to JSON (pretty-print if enabled)
    const indent = this.getOption('prettyPrint', true) ? 2 : 0;
    const jsonOutput = JSON.stringify(report, null, indent);

    // Auto-save if enabled
    if (this.getOption('autoSave', true)) {
      this._saveReport(jsonOutput, transferResult).catch(error => {
        console.error('⚠️  Aviso: Falha ao salvar relatório JSON:', error.message);
      });
    }

    return jsonOutput;
  }

  /**
   * Extracts detailed workflow information from transfer results
   *
   * @private
   * @param {Object} transferResult - Transfer result object
   * @returns {Array<Object>} Array of workflow details
   */
  _extractWorkflowDetails(transferResult) {
    if (!this.getOption('includeWorkflowDetails', true)) {
      return [];
    }

    const workflows = transferResult.metadata?.workflows || [];

    return workflows.map(workflow => ({
      id: workflow.id,
      name: workflow.name,
      status: workflow.status || 'unknown',
      nodes: workflow.nodes?.length || 0,
      tags: workflow.tags?.map(tag => tag.name || tag) || [],
      active: workflow.active || false,
      transferred: workflow.status === 'transferred' || workflow.status === 'completed'
    }));
  }

  /**
   * Formats error array for JSON output
   *
   * @private
   * @param {Array<Object>} errors - Array of error objects
   * @returns {Array<Object>} Formatted error array
   */
  _formatErrors(errors) {
    if (!Array.isArray(errors)) {
      return [];
    }

    return errors.map(error => ({
      workflow: error.workflowName || error.workflow || 'unknown',
      message: error.message || error.error || 'Erro desconhecido',
      code: error.code || 'UNKNOWN_ERROR',
      timestamp: error.timestamp || new Date().toISOString()
    }));
  }

  /**
   * Calculates success/failure rate percentage
   *
   * @private
   * @param {number} count - Success or failure count
   * @param {number} total - Total workflows
   * @returns {string} Percentage formatted as string (e.g., "95.50%")
   */
  _calculateSuccessRate(count, total) {
    if (total === 0) {
      return '0.00%';
    }

    const percentage = (count / total * 100).toFixed(2);
    return `${percentage}%`;
  }

  /**
   * Formats duration in human-readable format
   *
   * @private
   * @param {number} milliseconds - Duration in milliseconds
   * @returns {string} Formatted duration (e.g., "2m 30s", "45s", "1h 15m")
   */
  _formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    }

    if (minutes > 0) {
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    }

    return `${seconds}s`;
  }

  /**
   * Saves JSON report to file in reports/ directory
   *
   * @private
   * @param {string} jsonContent - JSON content to save
   * @param {Object} _transferResult - Transfer result (for generating filename, currently unused)
   * @returns {Promise<string>} Path to saved file
   *
   * @throws {Error} If directory creation or file write fails
   */
  async _saveReport(jsonContent, _transferResult) {
    try {
      // Determine output directory
      const outputDir = this.getOption('outputDir', 'reports');
      const absoluteDir = path.resolve(process.cwd(), outputDir);

      // Create directory if it doesn't exist
      await fs.mkdir(absoluteDir, { recursive: true });

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const time = new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
      const filename = `n8n-transfer-${timestamp}_${time}.json`;
      const filePath = path.join(absoluteDir, filename);

      // Write file
      await fs.writeFile(filePath, jsonContent, 'utf8');

      console.log(`✅ Relatório JSON salvo em: ${filePath}`);

      return filePath;
    } catch (error) {
      throw new Error(`Falha ao salvar relatório JSON: ${error.message}`);
    }
  }

  /**
   * Returns plugin information with configuration
   *
   * @returns {Object} Plugin information including options
   *
   * @example
   * const reporter = new JSONReporter({ autoSave: false });
   * console.log(reporter.getInfo());
   * // {
   * //   name: 'json-reporter',
   * //   version: '1.0.0',
   * //   type: 'reporter',
   * //   enabled: true,
   * //   description: '...',
   * //   options: { outputDir: 'reports', autoSave: false, ... }
   * // }
   */
  getInfo() {
    return {
      ...super.getInfo(),
      capabilities: [
        'Complete JSON export',
        'Pretty-printing with 2-space indentation',
        'Auto-save to reports/ directory',
        'Detailed workflow information',
        'Error tracking and reporting',
        'Success/failure rate calculation',
        'Duration formatting'
      ]
    };
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = JSONReporter;
