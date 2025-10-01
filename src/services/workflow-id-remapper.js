/**
 * WorkflowIDRemapper - Remaps workflow ID references after migration to new N8N instance
 *
 * This service updates all workflow references (executeWorkflow and toolWorkflow nodes)
 * with new IDs assigned by the target N8N instance after upload.
 *
 * Features:
 * - Deep cloning to avoid mutating original workflows
 * - Support for multiple node types (executeWorkflow, toolWorkflow)
 * - Comprehensive validation of ID mappings
 * - Batch processing with statistics tracking
 * - Handles both simple string IDs and complex workflowId objects
 */

class WorkflowIDRemapper {
  /**
   * Creates an instance of WorkflowIDRemapper
   *
   * @param {Logger} logger - Logger instance for debug/info messages
   */
  constructor(logger) {
    this.logger = logger;

    // Node types that contain workflow references
    this.workflowNodeTypes = [
      'n8n-nodes-base.executeWorkflow',
      '@n8n/n8n-nodes-langchain.toolWorkflow'
    ];

    // Statistics tracking
    this.stats = {
      workflowsProcessed: 0,
      nodesProcessed: 0,
      referencesUpdated: 0,
      referencesFailed: 0
    };
  }

  /**
   * Remaps workflow references in a single workflow using the provided ID mapping
   *
   * This is the main method for updating workflow references. It creates a deep clone
   * of the workflow to avoid mutating the original, then recursively searches for and
   * updates all executeWorkflow and toolWorkflow nodes with their new IDs.
   *
   * @param {object} workflow - The workflow object to process
   * @param {object} workflow.name - Workflow name (for logging)
   * @param {Array} workflow.nodes - Array of workflow nodes
   * @param {object} idMapping - Mapping of old workflow IDs to new IDs
   * @param {string} idMapping.oldId - The original workflow ID from source instance
   * @param {string} idMapping.newId - The new workflow ID from target instance
   * @returns {object} Updated workflow with remapped IDs (deep cloned)
   *
   * @example
   * const idMapping = {
   *   'old-workflow-id-123': 'new-workflow-id-456',
   *   'old-workflow-id-789': 'new-workflow-id-012'
   * };
   * const updated = remapper.remapWorkflowReferences(workflow, idMapping);
   */
  remapWorkflowReferences(workflow, idMapping) {
    // Input validation
    if (!workflow || typeof workflow !== 'object') {
      throw new TypeError('workflow is required and must be an object');
    }

    if (!idMapping || typeof idMapping !== 'object') {
      throw new TypeError('idMapping is required and must be an object');
    }

    this.logger.debug(`Remapping workflow references: ${workflow.name}`);

    // Deep clone workflow to avoid mutating the original
    const cloned = this._deepClone(workflow);

    // Process all nodes in the workflow
    if (cloned.nodes && Array.isArray(cloned.nodes)) {
      for (const node of cloned.nodes) {
        this._processNode(node, idMapping);
        this.stats.nodesProcessed++;
      }
    }

    this.stats.workflowsProcessed++;

    return cloned;
  }

  /**
   * Finds all executeWorkflow and toolWorkflow nodes in a workflow
   *
   * This method scans through all nodes in a workflow and returns only those
   * that reference other workflows (executeWorkflow or toolWorkflow types).
   *
   * @param {object} workflow - The workflow object to scan
   * @param {Array} workflow.nodes - Array of workflow nodes
   * @returns {Array} Array of executeWorkflow/toolWorkflow nodes
   *
   * @example
   * const workflowNodes = remapper.findExecuteWorkflowNodes(workflow);
   * console.log(`Found ${workflowNodes.length} workflow reference nodes`);
   * // Returns: [{ type: 'n8n-nodes-base.executeWorkflow', ... }, ...]
   */
  findExecuteWorkflowNodes(workflow) {
    // Input validation
    if (!workflow || typeof workflow !== 'object') {
      throw new TypeError('workflow is required and must be an object');
    }

    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      this.logger.debug('Workflow has no nodes array');
      return [];
    }

    const workflowNodes = workflow.nodes.filter(node =>
      this.workflowNodeTypes.includes(node.type)
    );

    this.logger.debug(`Found ${workflowNodes.length} workflow reference nodes`);
    return workflowNodes;
  }

  /**
   * Updates a single node's workflowId parameter with a new ID
   *
   * This method handles both simple string workflowId values and complex
   * workflowId objects with __rl, mode, value, and cachedResultName properties.
   *
   * @param {object} node - The node to update
   * @param {object} node.parameters - Node parameters object
   * @param {object|string} node.parameters.workflowId - The workflowId to update
   * @param {string} newId - The new workflow ID to set
   *
   * @example
   * // Simple string workflowId
   * const node = { parameters: { workflowId: 'old-id-123' } };
   * remapper.updateNodeWorkflowId(node, 'new-id-456');
   * // node.parameters.workflowId is now 'new-id-456'
   *
   * @example
   * // Complex workflowId object
   * const node = {
   *   parameters: {
   *     workflowId: {
   *       __rl: true,
   *       mode: 'id',
   *       value: 'old-id-123',
   *       cachedResultName: 'My Workflow'
   *     }
   *   }
   * };
   * remapper.updateNodeWorkflowId(node, 'new-id-456');
   * // node.parameters.workflowId.value is now 'new-id-456'
   */
  updateNodeWorkflowId(node, newId) {
    // Input validation
    if (!node || typeof node !== 'object') {
      throw new TypeError('node is required and must be an object');
    }

    if (!newId || typeof newId !== 'string') {
      throw new TypeError('newId is required and must be a string');
    }

    if (!node.parameters || !node.parameters.workflowId) {
      this.logger.debug('Node has no workflowId parameter');
      return;
    }

    const workflowId = node.parameters.workflowId;

    // Case 1: workflowId is a complex object with value property
    if (typeof workflowId === 'object' && workflowId !== null && 'value' in workflowId) {
      const oldValue = workflowId.value;
      workflowId.value = newId;
      this.logger.debug(`  Updated workflowId object: ${oldValue} -> ${newId}`);
    }
    // Case 2: workflowId is a simple string
    else if (typeof workflowId === 'string') {
      const oldValue = workflowId;
      node.parameters.workflowId = newId;
      this.logger.debug(`  Updated workflowId string: ${oldValue} -> ${newId}`);
    }
    // Case 3: Unexpected format
    else {
      this.logger.warn(`  Unexpected workflowId format: ${typeof workflowId}`);
    }
  }

  /**
   * Remaps workflow IDs for multiple workflows in a batch operation
   *
   * This method processes an array of workflows and updates all workflow
   * references using the provided ID mapping. It tracks statistics and
   * logs progress for each workflow.
   *
   * @param {Array} workflows - Array of workflow objects to process
   * @param {object} idMapping - Mapping of old workflow IDs to new IDs
   * @returns {Array} Array of updated workflows with remapped IDs
   *
   * @example
   * const workflows = [workflow1, workflow2, workflow3];
   * const idMapping = {
   *   'old-id-1': 'new-id-1',
   *   'old-id-2': 'new-id-2'
   * };
   * const updated = remapper.remapBatch(workflows, idMapping);
   * console.log(`Updated ${updated.length} workflows`);
   */
  remapBatch(workflows, idMapping) {
    // Input validation
    if (!Array.isArray(workflows)) {
      throw new TypeError('workflows is required and must be an array');
    }

    if (!idMapping || typeof idMapping !== 'object') {
      throw new TypeError('idMapping is required and must be an object');
    }

    this.logger.info(`Remapping workflow references for ${workflows.length} workflows`);

    // Reset statistics
    this.resetStatistics();

    const updated = [];

    for (let i = 0; i < workflows.length; i++) {
      const workflow = workflows[i];

      this.logger.progress(
        i + 1,
        workflows.length,
        `Remapping: ${workflow.name}`
      );

      try {
        const updatedWorkflow = this.remapWorkflowReferences(workflow, idMapping);
        updated.push(updatedWorkflow);
      } catch (error) {
        this.logger.error(`Failed to remap workflow ${workflow.name}: ${error.message}`);
        // Continue processing other workflows even if one fails
        updated.push(workflow); // Return original workflow on error
      }
    }

    this.logger.success('Workflow references remapped successfully');
    this.logStatistics();

    return updated;
  }

  /**
   * Validates that all workflow references in a workflow can be remapped
   *
   * This method checks all executeWorkflow and toolWorkflow nodes to ensure
   * that their referenced workflow IDs exist in the provided ID mapping.
   * Returns validation results with details about any missing mappings.
   *
   * @param {object} workflow - The workflow to validate
   * @param {object} idMapping - The ID mapping to validate against
   * @returns {object} Validation result with valid flag and issues array
   * @returns {boolean} return.valid - True if all references can be remapped
   * @returns {Array} return.issues - Array of validation issues (if any)
   * @returns {string} return.issues[].nodeName - Name of node with issue
   * @returns {string} return.issues[].nodeType - Type of node with issue
   * @returns {string} return.issues[].oldId - The unmapped workflow ID
   * @returns {string} return.issues[].message - Description of the issue
   *
   * @example
   * const validation = remapper.validateRemapping(workflow, idMapping);
   * if (!validation.valid) {
   *   console.log(`Found ${validation.issues.length} validation issues`);
   *   validation.issues.forEach(issue => {
   *     console.log(`- ${issue.nodeName}: ${issue.message}`);
   *   });
   * }
   */
  validateRemapping(workflow, idMapping) {
    // Input validation
    if (!workflow || typeof workflow !== 'object') {
      throw new TypeError('workflow is required and must be an object');
    }

    if (!idMapping || typeof idMapping !== 'object') {
      throw new TypeError('idMapping is required and must be an object');
    }

    this.logger.debug(`Validating workflow references: ${workflow.name}`);

    const issues = [];

    // Find all workflow reference nodes
    const workflowNodes = this.findExecuteWorkflowNodes(workflow);

    for (const node of workflowNodes) {
      // Skip nodes without workflowId parameter
      if (!node.parameters || !node.parameters.workflowId) {
        issues.push({
          nodeName: node.name || 'Unnamed Node',
          nodeType: node.type,
          oldId: null,
          message: 'Node missing workflowId parameter'
        });
        continue;
      }

      const workflowId = node.parameters.workflowId;
      let oldId = null;

      // Extract old ID based on workflowId structure
      if (typeof workflowId === 'object' && workflowId !== null && 'value' in workflowId) {
        oldId = workflowId.value;
      } else if (typeof workflowId === 'string') {
        oldId = workflowId;
      }

      // Check if ID exists in mapping
      if (oldId && !idMapping[oldId]) {
        issues.push({
          nodeName: node.name || 'Unnamed Node',
          nodeType: node.type,
          oldId: oldId,
          message: `No mapping found for workflow ID: ${oldId}`
        });
      }
    }

    const valid = issues.length === 0;

    if (valid) {
      this.logger.debug('Validation passed: all references can be remapped');
    } else {
      this.logger.warn(`Validation failed: ${issues.length} issues found`);
    }

    return {
      valid,
      issues
    };
  }

  /**
   * Processes a single node, checking if it's a workflow reference node
   * and updating its workflowId if found in the mapping
   *
   * @private
   * @param {object} node - The node to process
   * @param {object} idMapping - The ID mapping
   */
  _processNode(node, idMapping) {
    // Check if this is a workflow reference node
    if (!this.workflowNodeTypes.includes(node.type)) {
      return;
    }

    // Check if node has workflowId parameter
    if (!node.parameters || !node.parameters.workflowId) {
      return;
    }

    const workflowId = node.parameters.workflowId;
    let oldId = null;

    // Extract old ID based on workflowId structure
    if (typeof workflowId === 'object' && workflowId !== null && 'value' in workflowId) {
      oldId = workflowId.value;
    } else if (typeof workflowId === 'string') {
      oldId = workflowId;
    }

    // Skip if no old ID found
    if (!oldId) {
      this.logger.debug(`  Skipping node with no workflow ID: ${node.name}`);
      return;
    }

    // Look up new ID in mapping
    const newId = idMapping[oldId];

    if (newId) {
      this.updateNodeWorkflowId(node, newId);
      this.stats.referencesUpdated++;
      this.logger.debug(`  Remapped ${node.name}: ${oldId} -> ${newId}`);
    } else {
      this.stats.referencesFailed++;
      this.logger.warn(`  No mapping found for ${node.name}: ${oldId}`);
    }
  }

  /**
   * Deep clones an object using JSON serialization
   *
   * This method creates a complete copy of the object with no shared
   * references to the original. This ensures that modifications to the
   * cloned workflow don't affect the original.
   *
   * @private
   * @param {object} obj - Object to clone
   * @returns {object} Deep cloned object
   * @throws {Error} If object cannot be cloned (contains circular references, functions, etc.)
   */
  _deepClone(obj) {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (error) {
      this.logger.error(`Failed to deep clone object: ${error.message}`);
      throw new Error(`Cannot clone workflow: ${error.message}`);
    }
  }

  /**
   * Returns current statistics about remapping operations
   *
   * @returns {object} Statistics object
   * @returns {number} return.workflowsProcessed - Number of workflows processed
   * @returns {number} return.nodesProcessed - Number of nodes processed
   * @returns {number} return.referencesUpdated - Number of references successfully updated
   * @returns {number} return.referencesFailed - Number of references that failed to update
   * @returns {string} return.successRate - Success rate as percentage string
   */
  getStatistics() {
    const totalReferences = this.stats.referencesUpdated + this.stats.referencesFailed;
    const successRate = totalReferences > 0
      ? ((this.stats.referencesUpdated / totalReferences) * 100).toFixed(2) + '%'
      : '0%';

    return {
      ...this.stats,
      successRate
    };
  }

  /**
   * Logs current statistics to the console
   */
  logStatistics() {
    const stats = this.getStatistics();

    this.logger.info(`Workflows processed: ${stats.workflowsProcessed}`);
    this.logger.info(`Nodes processed: ${stats.nodesProcessed}`);
    this.logger.info(`References updated: ${stats.referencesUpdated}`);

    if (stats.referencesFailed > 0) {
      this.logger.warn(`References failed: ${stats.referencesFailed}`);
    }

    this.logger.info(`Success rate: ${stats.successRate}`);
  }

  /**
   * Resets statistics counters to zero
   */
  resetStatistics() {
    this.stats = {
      workflowsProcessed: 0,
      nodesProcessed: 0,
      referencesUpdated: 0,
      referencesFailed: 0
    };
  }
}

module.exports = WorkflowIDRemapper;
