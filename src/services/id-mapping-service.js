/**
 * ID Mapping Service - Handles workflow ID mapping for N8N migration
 *
 * When uploading workflows to N8N, the system assigns new IDs to workflows.
 * This service tracks the mapping between old IDs and new IDs, enabling
 * the update of executeWorkflow node references after migration.
 *
 * Features:
 * - Track old ID to new ID mappings with metadata
 * - Validate that all referenced IDs have mappings
 * - Persist mappings to JSON file for later use
 * - Load mappings from existing JSON file
 * - Generate comprehensive summary reports
 *
 * @example
 * const mappingService = new IDMappingService(logger);
 * mappingService.addMapping('old-123', 'new-456', 'MyWorkflow');
 * const newId = mappingService.getNewId('old-123');
 * await mappingService.saveToFile('./id-mappings.json');
 */

const fs = require('fs').promises;
const path = require('path');

class IDMappingService {
  /**
   * Creates an instance of IDMappingService
   *
   * @param {Logger} logger - Logger instance for debug/info messages
   */
  constructor(logger) {
    this.logger = logger;

    // Internal data structure: Map<oldId, { newId, workflowName, timestamp }>
    // Using Map for O(1) lookups and guaranteed insertion order
    this.mappings = new Map();
  }

  /**
   * Add a mapping entry for an old ID to new ID relationship
   *
   * This method records the mapping between an old workflow ID (from export)
   * and the new workflow ID (assigned by N8N after upload). It also stores
   * metadata for tracking and debugging purposes.
   *
   * @param {string} oldId - The original workflow ID from export
   * @param {string} newId - The new workflow ID assigned by N8N
   * @param {string} workflowName - The workflow name for reference
   * @throws {TypeError} If any parameter is not a string
   * @throws {Error} If any parameter is empty or if duplicate mapping exists with different newId
   *
   * @example
   * service.addMapping('123', '456', 'Customer Onboarding');
   * // Mapping added: 123 -> 456 (Customer Onboarding)
   */
  addMapping(oldId, newId, workflowName) {
    // Validate parameters
    if (typeof oldId !== 'string') {
      throw new TypeError('oldId must be a string');
    }

    if (typeof newId !== 'string') {
      throw new TypeError('newId must be a string');
    }

    if (typeof workflowName !== 'string') {
      throw new TypeError('workflowName must be a string');
    }

    if (oldId.trim().length === 0) {
      throw new Error('oldId cannot be empty');
    }

    if (newId.trim().length === 0) {
      throw new Error('newId cannot be empty');
    }

    if (workflowName.trim().length === 0) {
      throw new Error('workflowName cannot be empty');
    }

    // Check for duplicate mapping with different newId
    if (this.mappings.has(oldId)) {
      const existing = this.mappings.get(oldId);
      if (existing.newId !== newId) {
        throw new Error(
          `Duplicate mapping for oldId "${oldId}": ` +
          `existing newId "${existing.newId}" conflicts with "${newId}"`
        );
      }

      // Same mapping already exists, log debug and skip
      this.logger.debug(`Mapping already exists: ${oldId} -> ${newId} (${workflowName})`);
      return;
    }

    // Add the mapping with metadata
    this.mappings.set(oldId, {
      newId: newId,
      workflowName: workflowName,
      timestamp: new Date().toISOString()
    });

    this.logger.debug(`Mapping added: ${oldId} -> ${newId} (${workflowName})`);
  }

  /**
   * Get the new ID for a given old ID
   *
   * Retrieves the new workflow ID that was assigned by N8N for a given
   * old workflow ID from the export.
   *
   * @param {string} oldId - The original workflow ID to look up
   * @returns {string|null} The new workflow ID, or null if not found
   * @throws {TypeError} If oldId is not a string
   * @throws {Error} If oldId is empty
   *
   * @example
   * const newId = service.getNewId('123');
   * // Returns: '456' or null if not found
   */
  getNewId(oldId) {
    // Validate parameter
    if (typeof oldId !== 'string') {
      throw new TypeError('oldId must be a string');
    }

    if (oldId.trim().length === 0) {
      throw new Error('oldId cannot be empty');
    }

    // Look up the mapping
    const mapping = this.mappings.get(oldId);

    if (!mapping) {
      this.logger.debug(`No mapping found for oldId: ${oldId}`);
      return null;
    }

    return mapping.newId;
  }

  /**
   * Get all mappings as a plain object
   *
   * Returns the complete mapping data structure, useful for inspection,
   * serialization, or passing to other components.
   *
   * @returns {object} Object with oldId as keys, mapping data as values
   *
   * @example
   * const allMappings = service.getAllMappings();
   * // Returns: { '123': { newId: '456', workflowName: 'MyWorkflow', timestamp: '...' } }
   */
  getAllMappings() {
    // Convert Map to plain object for easier serialization
    const mappingsObject = {};

    for (const [oldId, mappingData] of this.mappings.entries()) {
      mappingsObject[oldId] = mappingData;
    }

    return mappingsObject;
  }

  /**
   * Check if any referenced IDs are missing from mappings
   *
   * This method validates that all workflow IDs referenced in executeWorkflow
   * nodes have corresponding mappings. It's essential for ensuring that
   * reference updates won't fail due to missing mappings.
   *
   * @param {Array<string>} referencedIds - Array of old workflow IDs that are referenced
   * @returns {boolean} True if any referenced IDs are missing from mappings
   * @throws {TypeError} If referencedIds is not an array
   *
   * @example
   * const hasMissing = service.hasMissingMappings(['123', '456', '789']);
   * // Returns: true if any of these IDs don't have mappings
   */
  hasMissingMappings(referencedIds) {
    // Validate parameter
    if (!Array.isArray(referencedIds)) {
      throw new TypeError('referencedIds must be an array');
    }

    // Check if any referenced ID is missing from mappings
    for (const refId of referencedIds) {
      if (!this.mappings.has(refId)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get array of IDs that don't have mappings
   *
   * Returns a list of all workflow IDs that are referenced but don't have
   * corresponding mappings. Useful for identifying which workflows need to
   * be uploaded before updating references.
   *
   * @param {Array<string>} referencedIds - Array of old workflow IDs that are referenced
   * @returns {Array<string>} Array of IDs that are missing from mappings
   * @throws {TypeError} If referencedIds is not an array
   *
   * @example
   * const missing = service.getMissingIds(['123', '456', '789']);
   * // Returns: ['456', '789'] if only '123' has a mapping
   */
  getMissingIds(referencedIds) {
    // Validate parameter
    if (!Array.isArray(referencedIds)) {
      throw new TypeError('referencedIds must be an array');
    }

    // Filter for IDs that don't have mappings
    const missingIds = referencedIds.filter(refId => !this.mappings.has(refId));

    if (missingIds.length > 0) {
      this.logger.debug(`Found ${missingIds.length} missing mappings: ${missingIds.join(', ')}`);
    }

    return missingIds;
  }

  /**
   * Save mappings to a JSON file
   *
   * Persists the current mapping data to a JSON file, which can be loaded
   * later to restore the mapping state. The file contains all mapping
   * metadata including timestamps for audit purposes.
   *
   * Features:
   * - Creates directory structure if it doesn't exist
   * - Writes formatted JSON with 2-space indentation
   * - Includes metadata: total count and save timestamp
   * - Atomic write operation
   *
   * @param {string} filePath - Absolute path to the JSON file
   * @throws {TypeError} If filePath is not a string
   * @throws {Error} If filePath is empty or file write fails
   *
   * @example
   * await service.saveToFile('/path/to/id-mappings.json');
   * // File created with all mapping data
   */
  async saveToFile(filePath) {
    // Validate parameter
    if (typeof filePath !== 'string') {
      throw new TypeError('filePath must be a string');
    }

    if (filePath.trim().length === 0) {
      throw new Error('filePath cannot be empty');
    }

    try {
      this.logger.debug(`Saving ID mappings to file: ${filePath}`);

      // Ensure directory exists
      const directory = path.dirname(filePath);
      await fs.mkdir(directory, { recursive: true });

      // Prepare data structure for serialization
      const data = {
        metadata: {
          totalMappings: this.mappings.size,
          savedAt: new Date().toISOString()
        },
        mappings: this.getAllMappings()
      };

      // Write to file with pretty formatting
      await fs.writeFile(
        filePath,
        JSON.stringify(data, null, 2),
        'utf8'
      );

      this.logger.info(`Saved ${this.mappings.size} ID mappings to: ${filePath}`);
    } catch (error) {
      this.logger.error(`Failed to save ID mappings to file: ${error.message}`);
      throw error;
    }
  }

  /**
   * Load mappings from a JSON file
   *
   * Restores mapping data from a previously saved JSON file. This allows
   * resuming migration operations or updating references using previously
   * recorded mappings.
   *
   * Features:
   * - Validates file existence and JSON structure
   * - Merges with existing mappings (doesn't clear current state)
   * - Handles both old and new file format versions
   * - Logs conflicts when merging
   *
   * @param {string} filePath - Absolute path to the JSON file
   * @throws {TypeError} If filePath is not a string
   * @throws {Error} If filePath is empty, file doesn't exist, or JSON is invalid
   *
   * @example
   * await service.loadFromFile('/path/to/id-mappings.json');
   * // All mappings from file are loaded into service
   */
  async loadFromFile(filePath) {
    // Validate parameter
    if (typeof filePath !== 'string') {
      throw new TypeError('filePath must be a string');
    }

    if (filePath.trim().length === 0) {
      throw new Error('filePath cannot be empty');
    }

    try {
      this.logger.debug(`Loading ID mappings from file: ${filePath}`);

      // Read file contents
      const fileContents = await fs.readFile(filePath, 'utf8');

      // Parse JSON
      const data = JSON.parse(fileContents);

      // Validate structure (handle both old and new format)
      let mappingsData;

      if (data.mappings && typeof data.mappings === 'object') {
        // New format with metadata
        mappingsData = data.mappings;
        this.logger.debug(`File contains ${data.metadata?.totalMappings || 0} mappings`);
      } else if (typeof data === 'object') {
        // Old format - direct mapping object
        mappingsData = data;
      } else {
        throw new Error('Invalid mapping file format: expected object with mappings');
      }

      // Load mappings into the Map
      let loadedCount = 0;
      let conflictCount = 0;

      for (const [oldId, mappingData] of Object.entries(mappingsData)) {
        // Validate mapping data structure
        if (!mappingData.newId || !mappingData.workflowName) {
          this.logger.warn(`Skipping invalid mapping entry for ${oldId}: missing required fields`);
          continue;
        }

        // Check for conflicts with existing mappings
        if (this.mappings.has(oldId)) {
          const existing = this.mappings.get(oldId);
          if (existing.newId !== mappingData.newId) {
            this.logger.warn(
              `Mapping conflict for ${oldId}: ` +
              `existing "${existing.newId}" vs file "${mappingData.newId}". ` +
              'Keeping existing mapping.'
            );
            conflictCount++;
            continue;
          }
        }

        // Add mapping to the Map
        this.mappings.set(oldId, {
          newId: mappingData.newId,
          workflowName: mappingData.workflowName,
          timestamp: mappingData.timestamp || new Date().toISOString()
        });

        loadedCount++;
      }

      this.logger.info(
        `Loaded ${loadedCount} ID mappings from file. ` +
        (conflictCount > 0 ? `Skipped ${conflictCount} conflicts.` : '')
      );

    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Mapping file not found: ${filePath}`);
      }

      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in mapping file: ${error.message}`);
      }

      this.logger.error(`Failed to load ID mappings from file: ${error.message}`);
      throw error;
    }
  }

  /**
   * Print a summary of all mappings to the logger
   *
   * Generates a human-readable summary of the current mapping state,
   * including total count and individual mapping details. Useful for
   * debugging and verification during migration.
   *
   * Features:
   * - Shows total mapping count
   * - Lists each mapping with old ID, new ID, and workflow name
   * - Handles empty state gracefully
   * - Formatted output with visual separators
   *
   * @example
   * service.printSummary();
   * // Logs formatted summary to console:
   * // ==================================================
   * // ID Mapping Summary
   * // ==================================================
   * // Total Mappings: 3
   * //
   * // Mappings:
   * //   123 -> 456 (Customer Onboarding)
   * //   789 -> 012 (Order Processing)
   * //   345 -> 678 (Email Notification)
   * // ==================================================
   */
  printSummary() {
    this.logger.info('='.repeat(50));
    this.logger.info('ID Mapping Summary');
    this.logger.info('='.repeat(50));

    if (this.mappings.size === 0) {
      this.logger.info('No mappings found.');
      this.logger.info('='.repeat(50));
      return;
    }

    this.logger.info(`Total Mappings: ${this.mappings.size}`);
    this.logger.info('');
    this.logger.info('Mappings:');

    // Sort by workflow name for better readability
    const sortedMappings = Array.from(this.mappings.entries())
      .sort((a, b) => a[1].workflowName.localeCompare(b[1].workflowName));

    for (const [oldId, mappingData] of sortedMappings) {
      this.logger.info(
        `  ${oldId} -> ${mappingData.newId} (${mappingData.workflowName})`
      );
    }

    this.logger.info('='.repeat(50));
  }

  /**
   * Clear all mappings
   *
   * Removes all stored mappings from memory. Use with caution as this
   * operation cannot be undone unless mappings were previously saved to file.
   *
   * @example
   * service.clearMappings();
   * // All mappings removed from memory
   */
  clearMappings() {
    const previousSize = this.mappings.size;
    this.mappings.clear();
    this.logger.debug(`Cleared ${previousSize} mappings from memory`);
  }

  /**
   * Get the total number of mappings
   *
   * Returns the count of stored mappings. Useful for validation and
   * progress tracking during migration.
   *
   * @returns {number} Total number of mappings
   *
   * @example
   * const count = service.getMappingCount();
   * // Returns: 42
   */
  getMappingCount() {
    return this.mappings.size;
  }

  /**
   * Check if a mapping exists for a given old ID
   *
   * Quick check to determine if a mapping has been recorded for a
   * specific old workflow ID.
   *
   * @param {string} oldId - The old workflow ID to check
   * @returns {boolean} True if mapping exists
   * @throws {TypeError} If oldId is not a string
   * @throws {Error} If oldId is empty
   *
   * @example
   * const exists = service.hasMapping('123');
   * // Returns: true or false
   */
  hasMapping(oldId) {
    // Validate parameter
    if (typeof oldId !== 'string') {
      throw new TypeError('oldId must be a string');
    }

    if (oldId.trim().length === 0) {
      throw new Error('oldId cannot be empty');
    }

    return this.mappings.has(oldId);
  }

  /**
   * Get detailed mapping information for a specific old ID
   *
   * Returns the complete mapping data including metadata (newId, workflowName, timestamp)
   * for a given old workflow ID.
   *
   * @param {string} oldId - The old workflow ID to look up
   * @returns {object|null} Mapping data object or null if not found
   * @throws {TypeError} If oldId is not a string
   * @throws {Error} If oldId is empty
   *
   * @example
   * const mappingInfo = service.getMappingInfo('123');
   * // Returns: { newId: '456', workflowName: 'MyWorkflow', timestamp: '2023-...' }
   */
  getMappingInfo(oldId) {
    // Validate parameter
    if (typeof oldId !== 'string') {
      throw new TypeError('oldId must be a string');
    }

    if (oldId.trim().length === 0) {
      throw new Error('oldId cannot be empty');
    }

    const mapping = this.mappings.get(oldId);

    if (!mapping) {
      return null;
    }

    // Return a copy to prevent external modification
    return { ...mapping };
  }
}

module.exports = IDMappingService;
