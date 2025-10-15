/**
 * Workflow Service - Handles all workflow-related API operations
 */

// Fields that are returned by N8N API but must NOT be included in create/update requests
// These fields are server-managed and cause HTTP 400 errors if included
const INVALID_UPLOAD_FIELDS = [
  'id',           // Must be removed for POST (only used in PUT with actual N8N ID)
  'versionId',    // Server-managed version identifier
  'shared',       // Server-managed sharing status
  'isArchived',   // Server-managed archive flag
  'createdAt',    // Server-managed creation timestamp
  'updatedAt',    // Server-managed update timestamp
  'triggerCount', // Server-managed execution count
  'homeProject',  // Server-managed project reference
  'scopes',       // Server-managed permission scopes
  'pinData',      // Test data (can cause upload issues)
  'tags',         // Tags must be managed separately via tags API
  'active',       // Read-only on PUT (can cause "active is read-only" error)
  'staticData',   // Can cause "additional properties" error
  'meta',         // Can cause "additional properties" error
];

// Fields accepted by N8N API for workflow create/update operations
// Based on N8N API schema: POST/PUT /api/v1/workflows
// Keep minimal - only core workflow structure
const ACCEPTED_UPLOAD_FIELDS = [
  'name',        // Workflow name (required)
  'nodes',       // Array of workflow nodes (required)
  'connections', // Node connections object (optional)
  'settings',    // Workflow settings (optional)
];

class WorkflowService {
  constructor(httpClient, authStrategy, logger) {
    this.httpClient = httpClient;
    this.authStrategy = authStrategy;
    this.logger = logger;

    // Headers are already set in HttpClient constructor
    // No need to set them again here
  }

  /**
   * List all workflows (with pagination support)
   * Robust implementation that handles multiple API response formats
   * and prevents infinite loops
   *
   * @returns {Promise<Array>} Array of workflows
   */
  async listWorkflows() {
    try {
      this.logger.debug('Fetching workflows list from API');

      // Pagination state
      let allWorkflows = [];
      let cursor = undefined;
      let hasMore = true;
      let pageCount = 0;
      const MAX_PAGES = 1000; // Safety limit to prevent infinite loops
      const PAGE_LIMIT = 100;
      const seenCursors = new Set(); // Track cursors to detect loops
      const seenWorkflowIds = new Set(); // Track workflow IDs to prevent duplicates

      while (hasMore && pageCount < MAX_PAGES) {
        pageCount++;

        // Build request params
        const params = cursor ? `?cursor=${cursor}&limit=${PAGE_LIMIT}` : `?limit=${PAGE_LIMIT}`;

        this.logger.debug(`Fetching page ${pageCount}${cursor ? ` (cursor: ${cursor.substring(0, 20)}...)` : ''}`);

        const response = await this.httpClient.get(`/api/v1/workflows${params}`);

        // STEP 1: Extract workflows from response (handle multiple formats)
        let workflows = this._extractWorkflowsFromResponse(response);

        if (!workflows || !Array.isArray(workflows)) {
          this.logger.warn(`Page ${pageCount} returned invalid workflows data, stopping pagination`);
          break;
        }

        // STEP 2: Filter out duplicate workflows
        const newWorkflows = workflows.filter(wf => {
          if (!wf.id) {
            this.logger.warn(`Workflow without ID found, skipping: ${wf.name || 'unknown'}`);
            return false;
          }
          if (seenWorkflowIds.has(wf.id)) {
            this.logger.debug(`Duplicate workflow ID detected: ${wf.id}, skipping`);
            return false;
          }
          seenWorkflowIds.add(wf.id);
          return true;
        });

        const duplicateCount = workflows.length - newWorkflows.length;
        if (duplicateCount > 0) {
          this.logger.debug(`Filtered out ${duplicateCount} duplicate workflow(s) on page ${pageCount}`);
        }

        // STEP 3: Add new workflows to result
        if (newWorkflows.length > 0) {
          allWorkflows = allWorkflows.concat(newWorkflows);
          this.logger.debug(`Page ${pageCount}: fetched ${newWorkflows.length} workflows (total: ${allWorkflows.length})`);
        } else if (workflows.length === 0) {
          this.logger.debug(`Page ${pageCount}: empty page received, stopping pagination`);
          break;
        } else {
          this.logger.debug(`Page ${pageCount}: all workflows were duplicates, stopping pagination`);
          break;
        }

        // STEP 4: Detect next cursor (try multiple possible fields)
        const nextCursor = this._extractNextCursor(response);

        // STEP 5: Determine if there are more pages using multiple heuristics
        if (!nextCursor) {
          // No cursor found
          if (newWorkflows.length < PAGE_LIMIT) {
            // Received less than page limit = last page
            this.logger.debug(`Page ${pageCount}: received ${newWorkflows.length}/${PAGE_LIMIT} workflows and no cursor, stopping pagination`);
            hasMore = false;
          } else {
            // Received full page but no cursor = ambiguous
            // Some APIs don't return cursor on last page even if it's full
            // To be safe, we stop here to avoid infinite loops
            this.logger.warn(`Page ${pageCount}: received full page (${newWorkflows.length}) but no cursor. Stopping to prevent potential infinite loop.`);
            this.logger.warn('If you believe there are more workflows, please check API pagination implementation.');
            hasMore = false;
          }
        } else {
          // Cursor found
          // Check for cursor loop (same cursor returned repeatedly = API bug)
          if (seenCursors.has(nextCursor)) {
            this.logger.warn(`Cursor loop detected! Same cursor returned twice: ${nextCursor.substring(0, 20)}...`);
            this.logger.warn('This indicates an API bug. Stopping pagination.');
            hasMore = false;
          } else {
            seenCursors.add(nextCursor);
            cursor = nextCursor;
            hasMore = true;
          }
        }
      }

      // Check if we hit the safety limit
      if (pageCount >= MAX_PAGES) {
        this.logger.warn(`⚠️  Reached maximum page limit (${MAX_PAGES}). Stopping pagination.`);
        this.logger.warn(`This is a safety measure. If you have more than ${MAX_PAGES * PAGE_LIMIT} workflows, please contact support.`);
      }

      this.logger.debug(`Pagination complete: ${pageCount} page(s) fetched, ${allWorkflows.length} total workflows`);
      return allWorkflows;
    } catch (error) {
      this.logger.error(`Failed to list workflows: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extract workflows array from API response
   * Handles multiple response formats:
   * - Direct array: [workflow1, workflow2, ...]
   * - Object with data: { data: [...], nextCursor: "..." }
   * - Object with workflows: { workflows: [...], next: "..." }
   * - Object with items: { items: [...], cursor: "..." }
   *
   * @param {*} response - API response
   * @returns {Array} Array of workflows or empty array
   * @private
   */
  _extractWorkflowsFromResponse(response) {
    // Format 1: Direct array
    if (Array.isArray(response)) {
      this.logger.debug('Response format: direct array');
      return response;
    }

    // Format 2: Object with data array
    if (response && response.data && Array.isArray(response.data)) {
      this.logger.debug('Response format: object with data array');
      return response.data;
    }

    // Format 3: Object with workflows array
    if (response && response.workflows && Array.isArray(response.workflows)) {
      this.logger.debug('Response format: object with workflows array');
      return response.workflows;
    }

    // Format 4: Object with items array
    if (response && response.items && Array.isArray(response.items)) {
      this.logger.debug('Response format: object with items array');
      return response.items;
    }

    // Format 5: Object with results array
    if (response && response.results && Array.isArray(response.results)) {
      this.logger.debug('Response format: object with results array');
      return response.results;
    }

    // Unknown format
    this.logger.warn('Unknown response format, cannot extract workflows');
    this.logger.debug(`Response type: ${typeof response}, keys: ${response ? Object.keys(response).join(', ') : 'null'}`);
    return [];
  }

  /**
   * Extract next cursor from API response
   * Tries multiple possible field names and locations
   *
   * @param {*} response - API response
   * @returns {string|null} Next cursor or null if not found
   * @private
   */
  _extractNextCursor(response) {
    // If response is array, no cursor available
    if (Array.isArray(response)) {
      return null;
    }

    if (!response || typeof response !== 'object') {
      return null;
    }

    // Try common cursor field names (in order of likelihood)
    const cursorFields = [
      'nextCursor',
      'next',
      'cursor',
      'next_cursor',
      'nextPageCursor',
      'continuation',
      'continuationToken',
    ];

    for (const field of cursorFields) {
      if (response[field]) {
        this.logger.debug(`Found cursor in field: ${field}`);
        return response[field];
      }
    }

    // Try nested pagination object
    if (response.pagination) {
      for (const field of cursorFields) {
        if (response.pagination[field]) {
          this.logger.debug(`Found cursor in pagination.${field}`);
          return response.pagination[field];
        }
      }
    }

    // Try nested meta object
    if (response.meta) {
      for (const field of cursorFields) {
        if (response.meta[field]) {
          this.logger.debug(`Found cursor in meta.${field}`);
          return response.meta[field];
        }
      }
    }

    return null;
  }

  /**
   * Get full workflow details by ID
   * @param {string} workflowId - Workflow ID
   * @returns {Promise<object>} Full workflow data
   */
  async getWorkflow(workflowId) {
    try {
      this.logger.debug(`Fetching workflow ${workflowId}`);
      const workflow = await this.httpClient.get(`/api/v1/workflows/${workflowId}`);
      return workflow;
    } catch (error) {
      this.logger.error(`Failed to get workflow ${workflowId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Filter workflows by tag
   * @param {Array} workflows - Array of workflows
   * @param {string} tagName - Tag name to filter by
   * @returns {Array} Filtered workflows
   */
  filterByTag(workflows, tagName) {
    if (!tagName) return workflows;

    const lowerTag = tagName.toLowerCase();
    return workflows.filter(workflow => {
      if (!workflow.tags || !Array.isArray(workflow.tags)) {
        return false;
      }

      return workflow.tags.some(tag => {
        if (typeof tag === 'string') {
          return tag.toLowerCase() === lowerTag;
        }
        if (typeof tag === 'object' && tag.name) {
          return tag.name.toLowerCase() === lowerTag;
        }
        return false;
      });
    });
  }

  /**
   * Download multiple workflows
   * @param {Array} workflows - Array of workflow summaries
   * @returns {Promise<object>} Results with success and failed arrays
   */
  async downloadWorkflows(workflows) {
    const results = {
      success: [],
      failed: [],
    };

    for (let i = 0; i < workflows.length; i++) {
      const workflow = workflows[i];
      const workflowId = workflow.id;
      const workflowName = workflow.name || `workflow-${workflowId}`;

      try {
        this.logger.progress(i + 1, workflows.length, `Baixando: ${workflowName}`);

        const fullWorkflow = await this.getWorkflow(workflowId);

        results.success.push({
          id: workflowId,
          name: workflowName,
          tags: workflow.tags,
          data: fullWorkflow,
        });

      } catch (error) {
        this.logger.error(`   Erro ao baixar ${workflowName}: ${error.message}`);
        results.failed.push({
          id: workflowId,
          name: workflowName,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Get workflow statistics
   * @param {Array} workflows - Array of workflows
   * @returns {object} Statistics object
   */
  getStatistics(workflows) {
    const stats = {
      total: workflows.length,
      active: 0,
      inactive: 0,
      tags: new Set(),
    };

    workflows.forEach(workflow => {
      if (workflow.active) stats.active++;
      else stats.inactive++;

      if (workflow.tags) {
        workflow.tags.forEach(tag => {
          const tagName = typeof tag === 'string' ? tag : tag.name;
          if (tagName) stats.tags.add(tagName);
        });
      }
    });

    stats.tags = Array.from(stats.tags);
    return stats;
  }

  /**
   * Create a new workflow
   * @param {object} workflowData - Workflow data to create
   * @returns {Promise<object>} Created workflow
   */
  async createWorkflow(workflowData) {
    try {
      this.logger.debug(`Creating workflow: ${workflowData.name}`);
      // Clean payload to match N8N API requirements
      const cleanedData = this._cleanWorkflowPayload(workflowData);
      const created = await this.httpClient.post('/api/v1/workflows', cleanedData);
      this.logger.debug(`Workflow created with ID: ${created.id}`);
      return created;
    } catch (error) {
      this.logger.error(`Failed to create workflow: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update an existing workflow
   * @param {string} workflowId - Workflow ID
   * @param {object} workflowData - Updated workflow data
   * @returns {Promise<object>} Updated workflow
   */
  async updateWorkflow(workflowId, workflowData) {
    try {
      this.logger.debug(`Updating workflow ${workflowId}`);
      // Clean payload to match N8N API requirements
      const cleanedData = this._cleanWorkflowPayload(workflowData);
      const updated = await this.httpClient.put(`/api/v1/workflows/${workflowId}`, cleanedData);
      this.logger.debug(`Workflow ${workflowId} updated successfully`);
      return updated;
    } catch (error) {
      this.logger.error(`Failed to update workflow ${workflowId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a workflow
   * @param {string} workflowId - Workflow ID
   * @returns {Promise<void>}
   */
  async deleteWorkflow(workflowId) {
    try {
      this.logger.debug(`Deleting workflow ${workflowId}`);
      await this.httpClient.delete(`/api/v1/workflows/${workflowId}`);
      this.logger.debug(`Workflow ${workflowId} deleted successfully`);
    } catch (error) {
      this.logger.error(`Failed to delete workflow ${workflowId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Activate a workflow
   * @param {string} workflowId - Workflow ID
   * @returns {Promise<object>} Updated workflow
   */
  async activateWorkflow(workflowId) {
    try {
      this.logger.debug(`Activating workflow ${workflowId}`);
      return await this.updateWorkflow(workflowId, { active: true });
    } catch (error) {
      this.logger.error(`Failed to activate workflow ${workflowId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Deactivate a workflow
   * @param {string} workflowId - Workflow ID
   * @returns {Promise<object>} Updated workflow
   */
  async deactivateWorkflow(workflowId) {
    try {
      this.logger.debug(`Deactivating workflow ${workflowId}`);
      return await this.updateWorkflow(workflowId, { active: false });
    } catch (error) {
      this.logger.error(`Failed to deactivate workflow ${workflowId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if a workflow exists by ID
   * @param {string} workflowId - Workflow ID to check
   * @returns {Promise<boolean>} True if workflow exists
   */
  async workflowExists(workflowId) {
    try {
      this.logger.debug(`Checking if workflow ${workflowId} exists`);
      await this.getWorkflow(workflowId);
      return true;
    } catch (error) {
      if (error.statusCode === 404 || error.message.includes('404')) {
        return false;
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Find a workflow by name in the target N8N instance
   * This is used to prevent duplicate workflows when uploading multiple times
   * @param {string} workflowName - Workflow name to search for
   * @returns {Promise<object|null>} Workflow object if found, null otherwise
   */
  async findWorkflowByName(workflowName) {
    try {
      this.logger.debug(`Searching for workflow by name: "${workflowName}"`);
      const workflows = await this.listWorkflows();
      const existing = workflows.find(w => w.name === workflowName);

      if (existing) {
        this.logger.debug(`Found existing workflow: "${workflowName}" (ID: ${existing.id})`);
        return existing;
      }

      this.logger.debug(`Workflow "${workflowName}" not found in target N8N`);
      return null;
    } catch (error) {
      this.logger.error(`Failed to search workflow by name: ${error.message}`);
      throw error;
    }
  }

  /**
   * List all tags from N8N instance
   * @returns {Promise<Array>} Array of tag objects with id, name, createdAt, updatedAt
   */
  async listTags() {
    try {
      this.logger.debug('Fetching tags list from API');
      const response = await this.httpClient.get('/api/v1/tags');
      const tags = response.data || response;
      this.logger.debug(`Received ${tags.length} tags from API`);
      return tags;
    } catch (error) {
      this.logger.error(`Failed to list tags: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a new tag in N8N
   * @param {string} tagName - Name of the tag to create
   * @returns {Promise<object>} Created tag object with id, name, createdAt, updatedAt
   */
  async createTag(tagName) {
    try {
      this.logger.debug(`Creating tag: ${tagName}`);
      const created = await this.httpClient.post('/api/v1/tags', { name: tagName });
      this.logger.debug(`Tag created with ID: ${created.id}`);
      return created;
    } catch (error) {
      this.logger.error(`Failed to create tag ${tagName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get or create a tag by name (idempotent operation)
   * Searches for existing tag by name, creates if not found
   *
   * @param {string} tagName - Name of the tag to find or create
   * @returns {Promise<object>} Tag object with id, name, createdAt, updatedAt
   */
  async getOrCreateTag(tagName) {
    try {
      // Get all existing tags
      const tags = await this.listTags();

      // Search for tag by name (case-insensitive comparison)
      const existingTag = tags.find(tag =>
        tag.name.toLowerCase() === tagName.toLowerCase()
      );

      if (existingTag) {
        this.logger.debug(`Tag found: ${tagName} (ID: ${existingTag.id})`);
        return existingTag;
      }

      // Tag doesn't exist, create it
      this.logger.info(`Tag not found, creating: ${tagName}`);
      const newTag = await this.createTag(tagName);
      return newTag;
    } catch (error) {
      this.logger.error(`Failed to get or create tag ${tagName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update workflow tags by linking tag IDs to a workflow
   * Uses the dedicated tags endpoint: PUT /api/v1/workflows/{id}/tags
   *
   * @param {string} workflowId - Workflow ID to update
   * @param {Array<string>} tagIds - Array of tag IDs to link to the workflow
   * @returns {Promise<Array>} Array of tag objects linked to the workflow
   */
  async updateWorkflowTags(workflowId, tagIds) {
    try {
      this.logger.debug(`Updating tags for workflow ${workflowId}: ${tagIds.join(', ')}`);

      // Format tags as array of objects with id property
      const tagsPayload = tagIds.map(id => ({ id }));

      // Use dedicated tags endpoint with PUT method
      const updated = await this.httpClient.put(
        `/api/v1/workflows/${workflowId}/tags`,
        tagsPayload
      );

      this.logger.debug(`Workflow ${workflowId} tags updated successfully`);
      return updated;
    } catch (error) {
      this.logger.error(`Failed to update tags for workflow ${workflowId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extract tag names from workflow data
   * Tags can be in different formats:
   * - Array of objects with 'name' property: [{ id: '123', name: 'jana' }]
   * - Array of strings: ['jana', 'production']
   *
   * @param {object} workflowData - Workflow data containing tags
   * @returns {Array<string>} Array of tag names
   * @private
   */
  _extractTagNames(workflowData) {
    if (!workflowData.tags || !Array.isArray(workflowData.tags)) {
      return [];
    }

    return workflowData.tags.map(tag => {
      // Tag is an object with name property
      if (typeof tag === 'object' && tag.name) {
        return tag.name;
      }
      // Tag is a string
      if (typeof tag === 'string') {
        return tag;
      }
      // Unknown format, skip
      return null;
    }).filter(name => name !== null);
  }

  /**
   * Process tags for a workflow - get or create all tags and return their IDs
   *
   * @param {object} workflowData - Workflow data containing tags
   * @returns {Promise<Array<string>>} Array of tag IDs
   * @private
   */
  async _processWorkflowTags(workflowData) {
    const tagNames = this._extractTagNames(workflowData);

    if (tagNames.length === 0) {
      this.logger.debug('No tags found in workflow data');
      return [];
    }

    this.logger.debug(`Processing ${tagNames.length} tags: ${tagNames.join(', ')}`);

    // Get or create each tag and collect their IDs
    const tagIds = [];
    for (const tagName of tagNames) {
      try {
        const tag = await this.getOrCreateTag(tagName);
        tagIds.push(tag.id);
      } catch (error) {
        this.logger.error(`Failed to process tag ${tagName}: ${error.message}`);
        // Continue processing other tags even if one fails
      }
    }

    return tagIds;
  }

  /**
   * Remove null and undefined fields from an object
   * Preserves falsy values like 0, false, and empty strings
   *
   * @param {object} obj - Object to clean
   * @returns {object} Object without null/undefined fields
   * @private
   */
  _removeNullFields(obj) {
    const cleaned = {};

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        // Keep all values except null and undefined
        if (value !== null && value !== undefined) {
          cleaned[key] = value;
        }
      }
    }

    return cleaned;
  }

  /**
   * Prepare workflow data for upload by removing invalid fields
   * Removes server-managed fields that cause HTTP 400 errors
   *
   * @param {object} workflowData - Raw workflow data
   * @param {boolean} _activate - Whether to activate the workflow (default: false)
   * @returns {object} Cleaned workflow ready for upload
   */
  prepareWorkflowForUpload(workflowData, _activate = false) {
    // Create a deep clone to avoid modifying the original
    const workflow = JSON.parse(JSON.stringify(workflowData));

    // Track removed fields for logging
    const removedFields = [];

    // Remove invalid fields that cause HTTP 400 errors
    INVALID_UPLOAD_FIELDS.forEach(field => {
      if (Object.prototype.hasOwnProperty.call(workflow, field)) {
        delete workflow[field];
        removedFields.push(field);
      }
    });

    // Log removed fields for debugging
    if (removedFields.length > 0) {
      this.logger.debug(`Removed invalid fields from workflow payload: ${removedFields.join(', ')}`);
    }

    // Remove null/undefined fields
    const cleanedWorkflow = this._removeNullFields(workflow);

    // Log final payload fields
    const finalFields = Object.keys(cleanedWorkflow);
    this.logger.debug(`Final workflow payload contains fields: ${finalFields.join(', ')}`);

    return cleanedWorkflow;
  }

  /**
   * Clean settings object by removing invalid fields
   * Some settings fields cause HTTP 400 errors on some N8N versions
   *
   * Strategy: Only keep known safe fields, remove everything else
   *
   * @param {object} settings - Settings object
   * @returns {object} Cleaned settings object
   * @private
   */
  _cleanSettings(settings) {
    if (!settings || typeof settings !== 'object') {
      return settings;
    }

    // SAFE APPROACH: Return empty settings to avoid API validation issues
    // N8N API is very strict about settings fields and they vary by version
    // Empty settings is always safe and N8N will use defaults
    this.logger.debug('Clearing settings object to avoid API validation issues');
    return {};
  }

  /**
   * Clean workflow payload to match N8N API requirements
   * N8N API only accepts: name, nodes, connections, settings
   * All other fields cause HTTP 400 errors
   *
   * @param {object} workflowData - Raw workflow data
   * @returns {object} Cleaned workflow payload
   * @private
   */
  _cleanWorkflowPayload(workflowData) {
    // Use prepareWorkflowForUpload which handles all cleaning logic
    const prepared = this.prepareWorkflowForUpload(workflowData);

    // Additionally filter to only accepted fields for extra safety
    const cleanedPayload = {};
    ACCEPTED_UPLOAD_FIELDS.forEach(field => {
      if (Object.prototype.hasOwnProperty.call(prepared, field)) {
        // Clean settings object specifically
        if (field === 'settings') {
          cleanedPayload[field] = this._cleanSettings(prepared[field]);
        } else {
          cleanedPayload[field] = prepared[field];
        }
      }
    });

    return cleanedPayload;
  }

  /**
   * Upload a workflow
   * Creates new workflow if it doesn't exist, updates if it does
   * Note: Tags are read-only in N8N API and cannot be managed via upload
   * Note: N8N assigns new IDs, so ID references will need to be remapped after upload
   *
   * @param {object} workflowData - Full workflow data
   * @param {boolean} force - Force update existing workflow
   * @returns {Promise<object>} Upload result with status and workflow information
   */
  async uploadWorkflow(workflowData, force = false) {
    const workflowId = workflowData.id;
    const workflowName = workflowData.name || `workflow-${workflowId}`;

    try {
      // Clean workflow payload to only include accepted fields
      // This removes ALL server-managed fields and only keeps: name, nodes, connections, settings
      const uploadData = this._cleanWorkflowPayload(workflowData);

      let result;
      let newId;

      // FIX: Check if workflow already exists BY NAME (not by ID)
      // This prevents duplicates when uploading multiple times, since N8N assigns new IDs
      const existingWorkflow = await this.findWorkflowByName(workflowName);

      if (existingWorkflow && !force) {
        this.logger.debug(`Workflow "${workflowName}" already exists (ID: ${existingWorkflow.id}), skipping`);
        return {
          status: 'skipped',
          id: existingWorkflow.id,
          name: workflowName,
          message: 'Workflow already exists (use --force to overwrite)',
        };
      }

      if (existingWorkflow) {
        // Update existing workflow using the actual ID from N8N
        this.logger.debug(`Updating workflow "${workflowName}" (ID: ${existingWorkflow.id})`);
        result = await this.updateWorkflow(existingWorkflow.id, uploadData);
        newId = existingWorkflow.id; // Use the actual N8N ID

        return {
          status: 'updated',
          oldId: workflowId, // Original ID from JSON
          newId: newId, // Actual ID in N8N
          name: workflowName,
          workflow: result,
        };
      } else {
        // Create new workflow - N8N will assign a new ID
        this.logger.debug(`Creating workflow: ${workflowName}`);
        result = await this.httpClient.post('/api/v1/workflows', uploadData);
        newId = result.id || result.data?.id;

        if (!newId) {
          throw new Error('N8N did not return workflow ID after creation');
        }

        this.logger.debug(`Workflow created with new ID: ${workflowId} → ${newId}`);

        return {
          status: 'created',
          oldId: workflowId,
          newId: newId,
          name: workflowName,
          workflow: result,
        };
      }
    } catch (error) {
      this.logger.error(`Failed to upload workflow ${workflowName}: ${error.message}`);
      return {
        status: 'failed',
        oldId: workflowId,
        name: workflowName,
        error: error.message,
      };
    }
  }

  /**
   * Upload multiple workflows from an array
   *
   * @param {Array} workflows - Array of workflow objects to upload
   * @param {boolean} force - Force update existing workflows
   * @param {boolean} skipErrors - Continue on errors
   * @returns {Promise<object>} Upload results with statistics
   */
  async uploadWorkflows(workflows, force = false, skipErrors = true) {
    const results = {
      created: [],
      updated: [],
      skipped: [],
      failed: [],
      total: workflows.length,
    };

    this.logger.info(`Starting upload of ${workflows.length} workflows...`);

    for (let i = 0; i < workflows.length; i++) {
      const workflow = workflows[i];
      const workflowName = workflow.name || `workflow-${workflow.id}`;

      try {
        this.logger.progress(i + 1, workflows.length, `Uploading: ${workflowName}`);

        const result = await this.uploadWorkflow(workflow, force);

        switch (result.status) {
        case 'created':
          results.created.push(result);
          break;
        case 'updated':
          results.updated.push(result);
          break;
        case 'skipped':
          results.skipped.push(result);
          break;
        case 'failed':
          results.failed.push(result);
          break;
        }
      } catch (error) {
        this.logger.error(`Error uploading ${workflowName}: ${error.message}`);
        results.failed.push({
          status: 'failed',
          id: workflow.id,
          name: workflowName,
          error: error.message,
        });

        if (!skipErrors) {
          throw error;
        }
      }
    }

    return results;
  }
}

module.exports = WorkflowService;