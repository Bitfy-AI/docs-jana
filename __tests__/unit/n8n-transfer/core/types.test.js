/**
 * Unit tests for core/types.js
 *
 * Tests all TypeScript/JSDoc interfaces and Zod validators
 */

const {
  WorkflowSchema,
  NodeSchema,
  ConnectionSchema,
  TagSchema,
  TransferStateSchema,
  TransferSummarySchema,
  validateWorkflow,
  validateNode,
  validateConnection,
  validateTag,
  validateTransferState,
  validateTransferSummary,
} = require('../../../../scripts/admin/n8n-transfer/core/types');

describe('N8N Transfer Types - Validators', () => {
  describe('NodeSchema', () => {
    it('should validate a valid node', () => {
      const validNode = {
        id: 'node-1',
        name: 'Start',
        type: 'n8n-nodes-base.start',
        typeVersion: 1,
        position: [250, 300],
        parameters: {},
      };

      const result = validateNode(validNode);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validNode);
      }
    });

    it('should reject node with missing required fields', () => {
      const invalidNode = {
        id: 'node-1',
        // missing name, type, position, parameters
      };

      const result = validateNode(invalidNode);
      expect(result.success).toBe(false);
    });

    it('should reject node with invalid position', () => {
      const invalidNode = {
        id: 'node-1',
        name: 'Start',
        type: 'n8n-nodes-base.start',
        typeVersion: 1,
        position: [250], // should be tuple [x, y]
        parameters: {},
      };

      const result = validateNode(invalidNode);
      expect(result.success).toBe(false);
    });
  });

  describe('ConnectionSchema', () => {
    it('should validate a valid connection', () => {
      const validConnection = {
        sourceNodeId: 'Start',
        sourceOutputIndex: 0,
        targetNodeId: 'HTTP Request',
        targetInputIndex: 0,
      };

      const result = validateConnection(validConnection);
      expect(result.success).toBe(true);
    });

    it('should apply default values for optional indices', () => {
      const connection = {
        sourceNodeId: 'Start',
        targetNodeId: 'End',
      };

      const result = validateConnection(connection);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sourceOutputIndex).toBe(0);
        expect(result.data.targetInputIndex).toBe(0);
      }
    });
  });

  describe('TagSchema', () => {
    it('should validate a valid tag', () => {
      const validTag = {
        id: 'tag-123',
        name: 'production',
      };

      const result = validateTag(validTag);
      expect(result.success).toBe(true);
    });

    it('should reject tag with empty name', () => {
      const invalidTag = {
        id: 'tag-123',
        name: '',
      };

      const result = validateTag(invalidTag);
      expect(result.success).toBe(false);
    });
  });

  describe('WorkflowSchema', () => {
    it('should validate a complete workflow', () => {
      const validWorkflow = {
        id: 'wf-123',
        name: 'Customer Sync',
        nodes: [
          {
            id: 'node-1',
            name: 'Start',
            type: 'n8n-nodes-base.start',
            typeVersion: 1,
            position: [250, 300],
            parameters: {},
          },
        ],
        connections: {},
        tags: [],
        active: true,
        settings: {},
        createdAt: '2025-10-01T10:00:00.000Z',
        updatedAt: '2025-10-02T15:30:00.000Z',
      };

      const result = validateWorkflow(validWorkflow);
      expect(result.success).toBe(true);
      if (!result.success) {
        console.error('Validation error:', result.error);
      }
    });

    it('should reject workflow with no nodes', () => {
      const invalidWorkflow = {
        name: 'Empty Workflow',
        nodes: [],
        connections: {},
      };

      const result = validateWorkflow(invalidWorkflow);
      expect(result.success).toBe(false);
    });

    it('should apply defaults for optional fields', () => {
      const minimalWorkflow = {
        name: 'Minimal Workflow',
        nodes: [
          {
            id: 'node-1',
            name: 'Start',
            type: 'n8n-nodes-base.start',
            typeVersion: 1,
            position: [0, 0],
            parameters: {},
          },
        ],
        connections: {},
      };

      const result = validateWorkflow(minimalWorkflow);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.active).toBe(false);
        expect(result.data.tags).toEqual([]);
      }
    });
  });

  describe('TransferStateSchema', () => {
    const validWorkflow = {
      id: 'wf-123',
      name: 'Test Workflow',
      nodes: [
        {
          id: 'node-1',
          name: 'Start',
          type: 'n8n-nodes-base.start',
          typeVersion: 1,
          position: [0, 0],
          parameters: {},
        },
      ],
      connections: {},
    };

    it('should validate a valid transfer state', () => {
      const validState = {
        workflow: validWorkflow,
        status: 'transferring',
        source: 'https://source.n8n.io',
        target: 'https://target.n8n.io',
        validation: {
          passed: true,
          errors: [],
        },
      };

      const result = validateTransferState(validState);
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const invalidState = {
        workflow: validWorkflow,
        status: 'invalid-status',
        source: 'https://source.n8n.io',
        target: 'https://target.n8n.io',
      };

      const result = validateTransferState(invalidState);
      expect(result.success).toBe(false);
    });

    it('should reject invalid URLs', () => {
      const invalidState = {
        workflow: validWorkflow,
        status: 'pending',
        source: 'not-a-url',
        target: 'also-not-a-url',
      };

      const result = validateTransferState(invalidState);
      expect(result.success).toBe(false);
    });
  });

  describe('TransferSummarySchema', () => {
    it('should validate a valid transfer summary', () => {
      const validSummary = {
        total: 50,
        transferred: 45,
        skipped: 3,
        failed: 2,
        duplicates: 3,
        duration: 120000,
        errors: [
          {
            workflow: 'Failed Workflow',
            error: 'Network timeout',
            code: 'NETWORK_TIMEOUT',
          },
        ],
      };

      const result = validateTransferSummary(validSummary);
      expect(result.success).toBe(true);
    });

    it('should reject summary with negative values', () => {
      const invalidSummary = {
        total: 50,
        transferred: -5,
        skipped: 3,
        failed: 2,
        duration: 120000,
      };

      const result = validateTransferSummary(invalidSummary);
      expect(result.success).toBe(false);
    });

    it('should validate summary with any totals', () => {
      // Note: The schema does not enforce that transferred + skipped + failed = total
      // This is intentional to allow flexibility in summary reporting
      const summary = {
        total: 50,
        transferred: 30,
        skipped: 10,
        failed: 5, // 30 + 10 + 5 = 45, not 50, but still valid
        duration: 120000,
      };

      const result = validateTransferSummary(summary);
      expect(result.success).toBe(true);
    });
  });

  describe('Validation Functions', () => {
    it('should return detailed error messages', () => {
      const invalidNode = {
        id: '',
        name: '',
        type: '',
      };

      const result = validateNode(invalidNode);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toBeDefined();
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });
  });
});
