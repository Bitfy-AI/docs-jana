/**
 * Upload History Service - Tracks N8N workflow upload history
 *
 * This service maintains a persistent log of workflow upload operations,
 * enabling users to track upload history, debug issues, and understand
 * the evolution of their workflow deployments.
 *
 * Features:
 * - Track upload operations with timestamp, status, and summary
 * - Persist history to .upload-history.json file
 * - Automatic pruning to limit entries (max 50)
 * - Retrieve last N entries for quick review
 * - Load/save operations with error handling
 *
 * Entry Structure:
 * {
 *   timestamp: "2025-10-01T14:30:00Z",
 *   action: "upload",
 *   status: "success" | "failed" | "partial",
 *   summary: {
 *     total: 30,
 *     succeeded: 28,
 *     failed: 2,
 *     folder: "jana"
 *   },
 *   details: "28/30 workflows uploaded successfully to https://n8n.target.com"
 * }
 *
 * @example
 * const historyService = new UploadHistoryService(logger);
 * await historyService.load();
 * historyService.addEntry({
 *   action: 'upload',
 *   status: 'success',
 *   summary: { total: 30, succeeded: 28, failed: 2, folder: 'jana' },
 *   details: '28/30 workflows uploaded successfully'
 * });
 * await historyService.save();
 */

const fs = require('fs').promises;
const path = require('path');

class UploadHistoryService {
  /**
   * Creates an instance of UploadHistoryService
   *
   * @param {Logger} logger - Logger instance for debug/info messages
   * @param {string} historyFilePath - Path to history file (default: .upload-history.json in project root)
   */
  constructor(logger, historyFilePath = null) {
    this.logger = logger;

    // Default to .upload-history.json in project root
    this.historyFilePath = historyFilePath ||
      path.join(process.cwd(), '.upload-history.json');

    // Internal data structure: Array of history entries
    this.entries = [];

    // Maximum number of entries to keep (automatic pruning)
    this.maxEntries = 50;
  }

  /**
   * Add a new entry to the history
   *
   * Creates a new history entry with the current timestamp and provided data.
   * Automatically determines status based on success/failure counts if not provided.
   * Prunes old entries if history exceeds maxEntries limit.
   *
   * @param {Object} entry - Entry data
   * @param {string} entry.action - Action type (default: "upload")
   * @param {string} [entry.status] - Status: "success" | "failed" | "partial" (auto-determined if omitted)
   * @param {Object} entry.summary - Upload summary data
   * @param {number} entry.summary.total - Total workflows
   * @param {number} entry.summary.succeeded - Successfully uploaded workflows
   * @param {number} entry.summary.failed - Failed uploads
   * @param {string} [entry.summary.folder] - Source folder name
   * @param {string} entry.details - Detailed description
   * @throws {TypeError} If entry is not an object or missing required fields
   *
   * @example
   * service.addEntry({
   *   action: 'upload',
   *   status: 'success',
   *   summary: { total: 30, succeeded: 28, failed: 2, folder: 'jana' },
   *   details: '28/30 workflows uploaded successfully'
   * });
   */
  addEntry(entry) {
    // Validate parameter
    if (!entry || typeof entry !== 'object') {
      throw new TypeError('entry must be an object');
    }

    // Validate required fields
    if (!entry.summary || typeof entry.summary !== 'object') {
      throw new Error('entry.summary is required and must be an object');
    }

    if (typeof entry.summary.total !== 'number') {
      throw new Error('entry.summary.total is required and must be a number');
    }

    if (typeof entry.summary.succeeded !== 'number') {
      throw new Error('entry.summary.succeeded is required and must be a number');
    }

    if (typeof entry.summary.failed !== 'number') {
      throw new Error('entry.summary.failed is required and must be a number');
    }

    if (!entry.details || typeof entry.details !== 'string') {
      throw new Error('entry.details is required and must be a string');
    }

    // Auto-determine status if not provided
    let status = entry.status;
    if (!status) {
      if (entry.summary.failed === 0) {
        status = 'success';
      } else if (entry.summary.succeeded === 0) {
        status = 'failed';
      } else {
        status = 'partial';
      }
    }

    // Validate status value
    const validStatuses = ['success', 'failed', 'partial'];
    if (!validStatuses.includes(status)) {
      throw new Error(`entry.status must be one of: ${validStatuses.join(', ')}`);
    }

    // Create the new entry
    const newEntry = {
      timestamp: new Date().toISOString(),
      action: entry.action || 'upload',
      status: status,
      summary: {
        total: entry.summary.total,
        succeeded: entry.summary.succeeded,
        failed: entry.summary.failed,
        folder: entry.summary.folder || null
      },
      details: entry.details
    };

    // Add to entries array
    this.entries.push(newEntry);

    this.logger.debug(`History entry added: ${status} - ${entry.details}`);

    // Prune old entries if we exceed the limit
    this._pruneOldEntries();
  }

  /**
   * Get the last N entries from the history
   *
   * Returns the most recent N entries in reverse chronological order
   * (newest first). If N is greater than the total number of entries,
   * returns all available entries.
   *
   * @param {number} n - Number of entries to retrieve (default: 3)
   * @returns {Array<Object>} Array of history entries (newest first)
   * @throws {TypeError} If n is not a number
   * @throws {Error} If n is less than 1
   *
   * @example
   * const lastThree = service.getLastN(3);
   * // Returns: [entry3, entry2, entry1] (newest to oldest)
   */
  getLastN(n = 3) {
    // Validate parameter
    if (typeof n !== 'number') {
      throw new TypeError('n must be a number');
    }

    if (n < 1) {
      throw new Error('n must be at least 1');
    }

    // Return last N entries in reverse order (newest first)
    return this.entries.slice(-n).reverse();
  }

  /**
   * Save history to file
   *
   * Persists the current history entries to the configured JSON file.
   * The file is formatted with 2-space indentation for readability.
   * Creates directory structure if it doesn't exist.
   *
   * File structure:
   * {
   *   metadata: {
   *     totalEntries: 10,
   *     savedAt: "2025-10-01T14:30:00Z"
   *   },
   *   entries: [...]
   * }
   *
   * @throws {Error} If file write operation fails
   *
   * @example
   * await service.save();
   * // File created/updated at .upload-history.json
   */
  async save() {
    try {
      this.logger.debug(`Saving upload history to file: ${this.historyFilePath}`);

      // Ensure directory exists
      const directory = path.dirname(this.historyFilePath);
      await fs.mkdir(directory, { recursive: true });

      // Prepare data structure for serialization
      const data = {
        metadata: {
          totalEntries: this.entries.length,
          savedAt: new Date().toISOString(),
          maxEntries: this.maxEntries
        },
        entries: this.entries
      };

      // Write to file with pretty formatting
      await fs.writeFile(
        this.historyFilePath,
        JSON.stringify(data, null, 2),
        'utf8'
      );

      this.logger.debug(`Saved ${this.entries.length} history entries to: ${this.historyFilePath}`);
    } catch (error) {
      this.logger.error(`Failed to save upload history: ${error.message}`);
      throw error;
    }
  }

  /**
   * Load history from file
   *
   * Loads history entries from the configured JSON file. If the file
   * doesn't exist, initializes with an empty history. Validates file
   * structure and handles both old and new format versions.
   *
   * @throws {Error} If file exists but contains invalid JSON or structure
   *
   * @example
   * await service.load();
   * // History loaded from .upload-history.json
   */
  async load() {
    try {
      this.logger.debug(`Loading upload history from file: ${this.historyFilePath}`);

      // Check if file exists
      try {
        await fs.access(this.historyFilePath);
      } catch (error) {
        // File doesn't exist, initialize with empty history
        this.logger.debug('History file not found, starting with empty history');
        this.entries = [];
        return;
      }

      // Read file contents
      const fileContents = await fs.readFile(this.historyFilePath, 'utf8');

      // Parse JSON
      const data = JSON.parse(fileContents);

      // Validate structure (handle both old and new format)
      let entriesData;

      if (data.entries && Array.isArray(data.entries)) {
        // New format with metadata
        entriesData = data.entries;
        this.logger.debug(`File contains ${data.metadata?.totalEntries || 0} entries`);
      } else if (Array.isArray(data)) {
        // Old format - direct array
        entriesData = data;
      } else {
        throw new Error('Invalid history file format: expected array or object with entries');
      }

      // Load entries
      this.entries = entriesData;

      this.logger.info(`Loaded ${this.entries.length} history entries from file`);

    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in history file: ${error.message}`);
      }

      this.logger.error(`Failed to load upload history: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clear all history entries
   *
   * Removes all stored entries from memory. Use with caution as this
   * operation cannot be undone unless history was previously saved to file.
   * This method does NOT delete the history file.
   *
   * @example
   * service.clear();
   * // All entries removed from memory (file unchanged)
   */
  clear() {
    const previousSize = this.entries.length;
    this.entries = [];
    this.logger.debug(`Cleared ${previousSize} history entries from memory`);
  }

  /**
   * Clear all history entries and delete the history file
   *
   * Removes all stored entries from memory AND deletes the history file
   * from disk. Use with caution as this operation cannot be undone.
   *
   * @throws {Error} If file deletion fails
   *
   * @example
   * await service.clearAll();
   * // All entries removed and file deleted
   */
  async clearAll() {
    this.clear();

    try {
      // Check if file exists before attempting to delete
      try {
        await fs.access(this.historyFilePath);
        await fs.unlink(this.historyFilePath);
        this.logger.info(`Deleted history file: ${this.historyFilePath}`);
      } catch (error) {
        // File doesn't exist, nothing to delete
        this.logger.debug('History file does not exist, nothing to delete');
      }
    } catch (error) {
      this.logger.error(`Failed to delete history file: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get the total number of entries
   *
   * Returns the count of stored history entries.
   *
   * @returns {number} Total number of entries
   *
   * @example
   * const count = service.getEntryCount();
   * // Returns: 10
   */
  getEntryCount() {
    return this.entries.length;
  }

  /**
   * Format history entries for display
   *
   * Generates a human-readable formatted string showing the last N entries.
   * Uses emojis and formatting for visual clarity.
   *
   * Format:
   * 📋 Últimas ações:
   * ✅ [01/10 14:30] jana: 28/30 workflows uploaded
   * ⚠️  [01/10 12:15] no-tag: 100/150 workflows uploaded (50 failed)
   * ✅ [30/09 18:00] v1.0.1: 6/6 workflows uploaded
   *
   * @param {number} n - Number of entries to format (default: 3)
   * @returns {string} Formatted string ready for display
   *
   * @example
   * const display = service.formatLastN(3);
   * console.log(display);
   */
  formatLastN(n = 3) {
    const entries = this.getLastN(n);

    if (entries.length === 0) {
      return '📋 Últimas ações: Nenhum histórico disponível';
    }

    let output = '📋 Últimas ações:\n';

    for (const entry of entries) {
      // Determine status emoji
      let statusEmoji;
      if (entry.status === 'success') {
        statusEmoji = '✅';
      } else if (entry.status === 'failed') {
        statusEmoji = '❌';
      } else {
        statusEmoji = '⚠️ ';
      }

      // Format timestamp (DD/MM HH:MM)
      const date = new Date(entry.timestamp);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const hour = String(date.getHours()).padStart(2, '0');
      const minute = String(date.getMinutes()).padStart(2, '0');
      const formattedDate = `${day}/${month} ${hour}:${minute}`;

      // Build summary line
      const folder = entry.summary.folder || 'unknown';
      const succeeded = entry.summary.succeeded;
      const total = entry.summary.total;
      const failed = entry.summary.failed;

      let summaryLine = `${folder}: ${succeeded}/${total} workflows uploaded`;

      // Add failure info if present
      if (failed > 0) {
        summaryLine += ` (${failed} failed)`;
      }

      // Combine into formatted line
      output += `${statusEmoji} [${formattedDate}] ${summaryLine}\n`;
    }

    return output.trim();
  }

  /**
   * Prune old entries to stay within maxEntries limit
   *
   * Removes oldest entries when the total count exceeds maxEntries.
   * This ensures the history file doesn't grow indefinitely.
   * Always keeps the most recent entries.
   *
   * @private
   */
  _pruneOldEntries() {
    if (this.entries.length > this.maxEntries) {
      const removeCount = this.entries.length - this.maxEntries;
      this.entries.splice(0, removeCount);
      this.logger.debug(`Pruned ${removeCount} old entries from history`);
    }
  }

  /**
   * Get all entries
   *
   * Returns all stored history entries in chronological order (oldest first).
   *
   * @returns {Array<Object>} Array of all history entries
   *
   * @example
   * const allEntries = service.getAllEntries();
   * // Returns: [entry1, entry2, entry3, ...] (oldest to newest)
   */
  getAllEntries() {
    return [...this.entries];
  }
}

module.exports = UploadHistoryService;
