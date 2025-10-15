/**
 * CSV Reporter Plugin for n8n-transfer
 *
 * Generates Excel-compatible CSV spreadsheet reports with comprehensive
 * workflow transfer statistics including names, status, tags, nodes,
 * IDs, and error reasons.
 *
 * @module n8n-transfer/plugins/reporters/csv-reporter
 * @author docs-jana
 * @version 1.0.0
 */

const { BasePlugin } = require('../index');
const fs = require('fs');
const path = require('path');

/**
 * CSV Reporter Plugin
 *
 * Generates CSV spreadsheet reports with workflow statistics.
 * Supports proper CSV escaping for quotes, commas, and newlines.
 * Output is Excel-compatible with UTF-8 encoding.
 *
 * @class CSVReporter
 * @extends BasePlugin
 *
 * @example
 * const reporter = new CSVReporter();
 * const csvContent = reporter.generate(transferResult);
 * console.log(csvContent); // CSV formatted string
 *
 * @example
 * // With custom options
 * const reporter = new CSVReporter();
 * reporter.setOptions({
 *   outputDir: './custom-reports',
 *   includeTimestamp: true
 * });
 * const csvContent = reporter.generate(transferResult);
 */
class CSVReporter extends BasePlugin {
  /**
   * Creates a new CSVReporter instance
   *
   * @constructor
   */
  constructor() {
    super('csv-reporter', '1.0.0', 'reporter');
    this.setDescription('Generates CSV spreadsheet with workflow statistics');

    // Default options
    this.setOptions({
      outputDir: path.join(__dirname, '../../reports'),
      includeTimestamp: true,
      delimiter: ',',
      encoding: 'utf8'
    });

    // Validate implementation
    this.validateImplementation(['generate']);
  }

  /**
   * Escapes a CSV field value
   *
   * Handles special characters: quotes, commas, newlines
   * - Wraps field in double quotes if contains: comma, quote, or newline
   * - Escapes existing quotes by doubling them (" → "")
   *
   * @private
   * @param {string|number|null|undefined} value - Field value to escape
   * @returns {string} Properly escaped CSV field
   *
   * @example
   * escapeCSVField('Simple text'); // 'Simple text'
   * escapeCSVField('Text with, comma'); // '"Text with, comma"'
   * escapeCSVField('Text with "quotes"'); // '"Text with ""quotes"""'
   * escapeCSVField('Multi\nline'); // '"Multi\nline"'
   */
  escapeCSVField(value) {
    // Handle null/undefined
    if (value === null || value === undefined) {
      return '';
    }

    // Convert to string
    const stringValue = String(value);

    // Check if field needs quoting (contains comma, quote, or newline)
    const needsQuoting = stringValue.includes(',') ||
                        stringValue.includes('"') ||
                        stringValue.includes('\n') ||
                        stringValue.includes('\r');

    if (needsQuoting) {
      // Escape existing quotes by doubling them
      const escaped = stringValue.replace(/"/g, '""');
      return `"${escaped}"`;
    }

    return stringValue;
  }

  /**
   * Formats tags array as comma-separated string
   *
   * @private
   * @param {Array<{id?: string, name: string}>} tags - Workflow tags
   * @returns {string} Comma-separated tag names
   *
   * @example
   * formatTags([{ name: 'prod' }, { name: 'v2' }]); // 'prod, v2'
   * formatTags([]); // ''
   * formatTags(null); // ''
   */
  formatTags(tags) {
    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return '';
    }

    return tags.map(tag => tag.name || '').filter(Boolean).join(', ');
  }

  /**
   * Counts nodes in a workflow
   *
   * @private
   * @param {Object} workflow - Workflow object
   * @returns {number} Number of nodes
   *
   * @example
   * countNodes({ nodes: [{}, {}, {}] }); // 3
   * countNodes({ nodes: [] }); // 0
   * countNodes({}); // 0
   */
  countNodes(workflow) {
    return workflow?.nodes?.length || 0;
  }

  /**
   * Determines transfer status from TransferState
   *
   * @private
   * @param {Object} state - TransferState object
   * @returns {string} Human-readable status
   *
   * @example
   * getStatus({ status: 'completed' }); // 'Success'
   * getStatus({ status: 'skipped', reason: 'duplicate' }); // 'Skipped (duplicate)'
   * getStatus({ status: 'failed' }); // 'Failed'
   */
  getStatus(state) {
    if (!state || !state.status) {
      return 'Unknown';
    }

    switch (state.status) {
    case 'completed':
      return 'Success';
    case 'skipped':
      return state.reason ? `Skipped (${state.reason})` : 'Skipped';
    case 'failed':
      return 'Failed';
    case 'pending':
      return 'Pending';
    case 'validating':
      return 'Validating';
    case 'transferring':
      return 'Transferring';
    default:
      return state.status;
    }
  }

  /**
   * Extracts failure/skip reason from TransferState
   *
   * @private
   * @param {Object} state - TransferState object
   * @returns {string} Reason for failure or skip
   *
   * @example
   * getReason({ status: 'skipped', reason: 'duplicate' }); // 'duplicate'
   * getReason({ status: 'failed', validation: { errors: [{ message: 'Invalid' }] } }); // 'Invalid'
   * getReason({ status: 'completed' }); // ''
   */
  getReason(state) {
    if (!state) {
      return '';
    }

    // If reason is explicitly provided
    if (state.reason) {
      return state.reason;
    }

    // If validation errors exist
    if (state.validation && state.validation.errors && state.validation.errors.length > 0) {
      return state.validation.errors.map(e => e.message).join('; ');
    }

    return '';
  }

  /**
   * Generates CSV header row
   *
   * @private
   * @returns {string} CSV header row
   *
   * @example
   * generateHeader(); // 'Name,Status,Tags,Nodes,Source ID,Target ID,Reason'
   */
  generateHeader() {
    const headers = [
      'Name',
      'Status',
      'Tags',
      'Nodes',
      'Source ID',
      'Target ID',
      'Reason'
    ];

    return headers.map(h => this.escapeCSVField(h)).join(this.getOption('delimiter', ','));
  }

  /**
   * Generates CSV row for a workflow transfer state
   *
   * @private
   * @param {Object} state - TransferState object
   * @returns {string} CSV row for the workflow
   *
   * @example
   * generateRow({
   *   workflow: { id: '123', name: 'My Workflow', nodes: [{}], tags: [] },
   *   status: 'completed',
   *   source: 'https://source.n8n.io',
   *   target: 'https://target.n8n.io'
   * });
   * // '"My Workflow",Success,"",1,123,123,""'
   */
  generateRow(state) {
    const workflow = state.workflow || {};
    const delimiter = this.getOption('delimiter', ',');

    const row = [
      this.escapeCSVField(workflow.name || 'Unknown'),
      this.escapeCSVField(this.getStatus(state)),
      this.escapeCSVField(this.formatTags(workflow.tags)),
      this.escapeCSVField(this.countNodes(workflow)),
      this.escapeCSVField(workflow.id || ''),
      this.escapeCSVField(workflow.id || ''), // Target ID (same as source after transfer)
      this.escapeCSVField(this.getReason(state))
    ];

    return row.join(delimiter);
  }

  /**
   * Generates CSV report from transfer result
   *
   * Creates a CSV spreadsheet with the following columns:
   * - Name: Workflow name
   * - Status: Transfer status (Success, Failed, Skipped)
   * - Tags: Comma-separated workflow tags
   * - Nodes: Number of nodes in workflow
   * - Source ID: Original workflow ID
   * - Target ID: Workflow ID in target instance
   * - Reason: Reason for skip/failure (if applicable)
   *
   * @param {Object} transferResult - Transfer result object
   * @param {Object[]} transferResult.workflows - Array of TransferState objects
   * @param {number} transferResult.totalWorkflows - Total workflows processed
   * @param {number} transferResult.successCount - Number of successful transfers
   * @param {number} transferResult.failureCount - Number of failures
   * @param {number} [transferResult.duplicateCount] - Number of duplicates skipped
   * @param {Date} transferResult.startTime - Transfer start time
   * @param {Date} transferResult.endTime - Transfer end time
   * @returns {string} CSV formatted string
   *
   * @throws {Error} If transferResult is invalid or missing required fields
   *
   * @example
   * const result = {
   *   workflows: [
   *     {
   *       workflow: { id: '1', name: 'Workflow A', nodes: [{}, {}], tags: [{ name: 'prod' }] },
   *       status: 'completed'
   *     },
   *     {
   *       workflow: { id: '2', name: 'Workflow B', nodes: [{}], tags: [] },
   *       status: 'skipped',
   *       reason: 'duplicate'
   *     }
   *   ],
   *   totalWorkflows: 2,
   *   successCount: 1,
   *   failureCount: 0,
   *   duplicateCount: 1,
   *   startTime: new Date(),
   *   endTime: new Date()
   * };
   *
   * const reporter = new CSVReporter();
   * const csv = reporter.generate(result);
   * console.log(csv);
   * // Name,Status,Tags,Nodes,Source ID,Target ID,Reason
   * // "Workflow A",Success,prod,2,1,1,""
   * // "Workflow B","Skipped (duplicate)","",1,2,2,duplicate
   */
  generate(transferResult) {
    // Validate input
    if (!transferResult) {
      throw new Error('TransferResult is required');
    }

    if (!transferResult.workflows || !Array.isArray(transferResult.workflows)) {
      throw new Error('TransferResult must contain workflows array');
    }

    // Generate CSV content
    const rows = [];

    // Header row
    rows.push(this.generateHeader());

    // Data rows
    transferResult.workflows.forEach(state => {
      rows.push(this.generateRow(state));
    });

    // Join rows with newlines
    const csvContent = rows.join('\n');

    // Optionally save to file
    if (this.getOption('autoSave', false)) {
      this.saveToFile(csvContent, transferResult);
    }

    return csvContent;
  }

  /**
   * Saves CSV content to file
   *
   * @private
   * @param {string} csvContent - CSV formatted string
   * @param {Object} _transferResult - Transfer result for filename generation (unused)
   * @returns {string} Path to saved file
   *
   * @throws {Error} If file cannot be written
   *
   * @example
   * saveToFile(csvContent, transferResult);
   * // Returns: '/path/to/reports/transfer-report-2025-10-03T12-30-45.csv'
   */
  saveToFile(csvContent, _transferResult) {
    const outputDir = this.getOption('outputDir');
    const includeTimestamp = this.getOption('includeTimestamp', true);
    const encoding = this.getOption('encoding', 'utf8');

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate filename
    let filename = 'transfer-report';

    if (includeTimestamp) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      filename += `-${timestamp}`;
    }

    filename += '.csv';

    // Full file path
    const filePath = path.join(outputDir, filename);

    // Write file
    fs.writeFileSync(filePath, csvContent, { encoding });

    return filePath;
  }
}

// =============================================================================
// Exports
// =============================================================================

module.exports = CSVReporter;
