/**
 * Workflow Service - Handles all workflow-related API operations
 */

class WorkflowService {
  constructor(httpClient, authStrategy, logger) {
    this.httpClient = httpClient;
    this.authStrategy = authStrategy;
    this.logger = logger;

    // Set authentication headers
    this.httpClient.setHeaders(this.authStrategy.getHeaders());
  }

  /**
   * List all workflows
   * @returns {Promise<Array>} Array of workflows
   */
  async listWorkflows() {
    try {
      this.logger.debug('Fetching workflows list from API');
      const response = await this.httpClient.get('/api/v1/workflows');
      const workflows = response.data || response;
      this.logger.debug(`Received ${workflows.length} workflows from API`);
      return workflows;
    } catch (error) {
      this.logger.error(`Failed to list workflows: ${error.message}`);
      throw error;
    }
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
      const created = await this.httpClient.post('/api/v1/workflows', workflowData);
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
      const updated = await this.httpClient.put(`/api/v1/workflows/${workflowId}`, workflowData);
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
}

module.exports = WorkflowService;