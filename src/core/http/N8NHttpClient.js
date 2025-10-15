/**
 * N8NHttpClient - N8N API-specific HTTP client adapter
 *
 * @module src/core/http/N8NHttpClient
 * @description Extends HttpClient with N8N API-specific methods and configurations.
 * Provides high-level methods for common N8N operations like fetching workflows,
 * creating workflows, managing tags, etc.
 *
 * @example
 * const client = N8NHttpClient.create({
 *   baseUrl: 'https://n8n.example.com',
 *   apiKey: 'your-api-key',
 *   logger: loggerInstance
 * });
 *
 * const workflows = await client.getWorkflows();
 * const created = await client.createWorkflow(workflowData);
 */

const HttpClient = require('./HttpClient');

/**
 * @typedef {Object} N8NClientConfig
 * @property {string} baseUrl - N8N instance URL (e.g., https://n8n.example.com)
 * @property {string} apiKey - N8N API Key for authentication
 * @property {Object} [logger] - Logger instance (optional)
 * @property {number} [maxRetries=3] - Maximum number of retry attempts
 * @property {number} [timeout=10000] - Request timeout in milliseconds
 * @property {number} [maxRequestsPerSecond=10] - Rate limit (requests per second)
 */

/**
 * @typedef {Object} Workflow
 * @property {string} id - Workflow unique ID
 * @property {string} name - Workflow name
 * @property {boolean} active - Whether workflow is active
 * @property {Array<Object>} nodes - Workflow nodes
 * @property {Object} connections - Node connections
 * @property {Array<string>} [tags] - Associated tags
 * @property {Object} [settings] - Workflow settings
 */

/**
 * @typedef {Object} Tag
 * @property {string} id - Tag unique ID
 * @property {string} name - Tag name
 * @property {string} [createdAt] - Creation timestamp
 * @property {string} [updatedAt] - Last update timestamp
 */

class N8NHttpClient extends HttpClient {
  /**
   * Create a new N8NHttpClient instance
   *
   * @param {N8NClientConfig} config - Client configuration
   * @throws {Error} If baseUrl or apiKey is not provided
   */
  constructor(config) {
    if (!config.apiKey) {
      throw new Error('N8NHttpClient: apiKey is required');
    }

    // Configure headers for N8N API
    const n8nConfig = {
      ...config,
      headers: {
        'X-N8N-API-KEY': config.apiKey,
        ...config.headers,
      },
    };

    super(n8nConfig);

    this.apiKey = config.apiKey;

    // N8N API statistics
    this.n8nStats = {
      workflowsFetched: 0,
      workflowsCreated: 0,
      workflowsUpdated: 0,
      workflowsDeleted: 0,
      tagsFetched: 0,
      tagsCreated: 0,
    };
  }

  /**
   * Factory method to create N8NHttpClient instances
   *
   * @param {N8NClientConfig} config - Client configuration
   * @returns {N8NHttpClient} New N8NHttpClient instance
   *
   * @example
   * const client = N8NHttpClient.create({
   *   baseUrl: 'https://n8n.example.com',
   *   apiKey: 'your-api-key'
   * });
   */
  static create(config) {
    return new N8NHttpClient(config);
  }

  /**
   * Fetch all workflows from N8N instance
   *
   * @returns {Promise<Array<Workflow>>} List of workflows
   * @throws {Error} If request fails
   *
   * @example
   * const workflows = await client.getWorkflows();
   * console.log(`Found ${workflows.length} workflows`);
   */
  async getWorkflows() {
    this.logger.info('[N8NHttpClient] Fetching workflows...');

    const response = await this.get('/api/v1/workflows');

    // N8N API returns { data: [...workflows] }
    const workflows = response.data || response || [];
    this.n8nStats.workflowsFetched += workflows.length;
    this.logger.info(`[N8NHttpClient] ${workflows.length} workflows found`);

    return workflows;
  }

  /**
   * Fetch a specific workflow by ID
   *
   * @param {string} workflowId - Workflow ID
   * @returns {Promise<Workflow>} Workflow data
   * @throws {Error} If workflow not found or request fails
   *
   * @example
   * const workflow = await client.getWorkflow('123');
   * console.log(`Workflow: ${workflow.name}`);
   */
  async getWorkflow(workflowId) {
    if (!workflowId) {
      throw new Error('N8NHttpClient.getWorkflow: workflowId is required');
    }

    this.logger.debug(`[N8NHttpClient] Fetching workflow ID: ${workflowId}`);
    const workflow = await this.get(`/api/v1/workflows/${workflowId}`);

    this.n8nStats.workflowsFetched++;
    this.logger.debug(`[N8NHttpClient] Workflow found: ${workflow.name}`);

    return workflow;
  }

  /**
   * Create a new workflow in N8N instance
   *
   * @param {Workflow} workflowData - Workflow data
   * @returns {Promise<Workflow>} Created workflow (with generated ID)
   * @throws {Error} If creation fails or data is invalid
   *
   * @example
   * const created = await client.createWorkflow({
   *   name: 'My Workflow',
   *   nodes: [...],
   *   connections: {...},
   *   active: false
   * });
   * console.log(`Workflow created with ID: ${created.id}`);
   */
  async createWorkflow(workflowData) {
    if (!workflowData || !workflowData.name) {
      throw new Error('N8NHttpClient.createWorkflow: workflowData.name is required');
    }
    if (!workflowData.nodes || !Array.isArray(workflowData.nodes)) {
      throw new Error('N8NHttpClient.createWorkflow: workflowData.nodes must be an array');
    }

    this.logger.info(`[N8NHttpClient] Creating workflow: ${workflowData.name}`);
    const createdWorkflow = await this.post('/api/v1/workflows', workflowData);

    this.n8nStats.workflowsCreated++;
    this.logger.info(`[N8NHttpClient] Workflow created successfully: ${createdWorkflow.name} (ID: ${createdWorkflow.id})`);

    return createdWorkflow;
  }

  /**
   * Update an existing workflow
   *
   * @param {string} workflowId - Workflow ID
   * @param {Workflow} workflowData - Updated workflow data
   * @returns {Promise<Workflow>} Updated workflow
   * @throws {Error} If update fails or workflow not found
   *
   * @example
   * const updated = await client.updateWorkflow('123', {
   *   name: 'Updated Name',
   *   active: true
   * });
   */
  async updateWorkflow(workflowId, workflowData) {
    if (!workflowId) {
      throw new Error('N8NHttpClient.updateWorkflow: workflowId is required');
    }

    this.logger.info(`[N8NHttpClient] Updating workflow ID: ${workflowId}`);
    const updatedWorkflow = await this.put(`/api/v1/workflows/${workflowId}`, workflowData);

    this.n8nStats.workflowsUpdated++;
    this.logger.info(`[N8NHttpClient] Workflow updated successfully: ${updatedWorkflow.name}`);

    return updatedWorkflow;
  }

  /**
   * Delete a workflow
   *
   * @param {string} workflowId - Workflow ID
   * @returns {Promise<void>}
   * @throws {Error} If deletion fails or workflow not found
   *
   * @example
   * await client.deleteWorkflow('123');
   * console.log('Workflow deleted successfully');
   */
  async deleteWorkflow(workflowId) {
    if (!workflowId) {
      throw new Error('N8NHttpClient.deleteWorkflow: workflowId is required');
    }

    this.logger.info(`[N8NHttpClient] Deleting workflow ID: ${workflowId}`);
    await this.delete(`/api/v1/workflows/${workflowId}`);

    this.n8nStats.workflowsDeleted++;
    this.logger.info('[N8NHttpClient] Workflow deleted successfully');
  }

  /**
   * Fetch all tags from N8N instance
   *
   * @returns {Promise<Array<Tag>>} List of tags
   * @throws {Error} If request fails
   *
   * @example
   * const tags = await client.getTags();
   * console.log(`Found ${tags.length} tags`);
   */
  async getTags() {
    this.logger.info('[N8NHttpClient] Fetching tags...');

    const response = await this.get('/api/v1/tags');

    // N8N API returns { data: [...tags] }
    const tags = response.data || response || [];
    this.n8nStats.tagsFetched += tags.length;
    this.logger.info(`[N8NHttpClient] ${tags.length} tags found`);

    return tags;
  }

  /**
   * Create a new tag
   *
   * @param {string} tagName - Tag name
   * @returns {Promise<Tag>} Created tag
   * @throws {Error} If creation fails
   *
   * @example
   * const tag = await client.createTag('production');
   * console.log(`Tag created with ID: ${tag.id}`);
   */
  async createTag(tagName) {
    if (!tagName) {
      throw new Error('N8NHttpClient.createTag: tagName is required');
    }

    this.logger.info(`[N8NHttpClient] Creating tag: ${tagName}`);
    const createdTag = await this.post('/api/v1/tags', { name: tagName });

    this.n8nStats.tagsCreated++;
    this.logger.info(`[N8NHttpClient] Tag created successfully: ${createdTag.name} (ID: ${createdTag.id})`);

    return createdTag;
  }

  /**
   * Test connectivity with N8N instance
   * Overrides base testConnection to use N8N-specific endpoint
   *
   * @returns {Promise<Object>} Test result { success: boolean, message?: string, error?: string, suggestion?: string }
   *
   * @example
   * const result = await client.testConnection();
   * if (result.success) {
   *   console.log('Connected to N8N!');
   * } else {
   *   console.error(`Connection failed: ${result.error}`);
   * }
   */
  async testConnection() {
    this.logger.info('[N8NHttpClient] Testing connectivity with N8N...');

    try {
      // Test by fetching workflows (most basic N8N API operation)
      await this.get('/api/v1/workflows');

      this.logger.info('[N8NHttpClient] Connectivity OK');
      return {
        success: true,
        message: 'Connection to N8N successful',
      };
    } catch (error) {
      let errorMessage = error.message;
      let suggestion = '';

      // N8N-specific error handling
      if (error.statusCode === 401 || error.statusCode === 403) {
        errorMessage = 'Authentication failed';
        suggestion = 'Check if the N8N API key is correct';
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Could not connect to N8N server';
        suggestion = 'Check if the N8N URL is correct and the server is running';
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = 'Connection timeout';
        suggestion = 'Check network connectivity and firewall settings';
      } else if (error.code === 'ENOTFOUND') {
        errorMessage = 'N8N server not found';
        suggestion = 'Check if the N8N URL is correct';
      }

      this.logger.error(`[N8NHttpClient] Connectivity failed: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        suggestion: suggestion,
        originalError: error.message,
      };
    }
  }

  /**
   * Get N8N-specific statistics
   *
   * @returns {Object} Combined statistics (base + N8N-specific)
   *
   * @example
   * const stats = client.getN8NStats();
   * console.log(`Workflows created: ${stats.workflowsCreated}`);
   * console.log(`Success rate: ${(stats.successfulRequests / stats.totalRequests * 100).toFixed(2)}%`);
   */
  getN8NStats() {
    return {
      ...this.getStats(),
      ...this.n8nStats,
    };
  }

  /**
   * Reset all statistics (base + N8N-specific)
   */
  resetStats() {
    super.resetStats();
    this.n8nStats = {
      workflowsFetched: 0,
      workflowsCreated: 0,
      workflowsUpdated: 0,
      workflowsDeleted: 0,
      tagsFetched: 0,
      tagsCreated: 0,
    };
    this.logger.debug('[N8NHttpClient] N8N statistics reset');
  }
}

module.exports = N8NHttpClient;
