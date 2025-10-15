/**
 * Unit tests for WorkflowService pagination logic
 * Tests multiple API response formats and edge cases
 */

const WorkflowService = require('../../src/services/workflow-service');

describe('WorkflowService - Pagination', () => {
  let workflowService;
  let mockHttpClient;
  let mockLogger;
  let mockAuthStrategy;

  beforeEach(() => {
    // Mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      progress: jest.fn(),
    };

    // Mock auth strategy
    mockAuthStrategy = {
      getHeaders: jest.fn(() => ({ 'X-N8N-API-KEY': 'test-key' })),
    };

    // Mock HTTP client
    mockHttpClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    };

    workflowService = new WorkflowService(mockHttpClient, mockAuthStrategy, mockLogger);
  });

  describe('_extractWorkflowsFromResponse', () => {
    it('should extract workflows from direct array response', () => {
      const response = [
        { id: '1', name: 'Workflow 1' },
        { id: '2', name: 'Workflow 2' },
      ];

      const workflows = workflowService._extractWorkflowsFromResponse(response);

      expect(workflows).toEqual(response);
      expect(mockLogger.debug).toHaveBeenCalledWith('Response format: direct array');
    });

    it('should extract workflows from object with data array', () => {
      const response = {
        data: [
          { id: '1', name: 'Workflow 1' },
          { id: '2', name: 'Workflow 2' },
        ],
        nextCursor: 'abc123',
      };

      const workflows = workflowService._extractWorkflowsFromResponse(response);

      expect(workflows).toEqual(response.data);
      expect(mockLogger.debug).toHaveBeenCalledWith('Response format: object with data array');
    });

    it('should extract workflows from object with workflows array', () => {
      const response = {
        workflows: [
          { id: '1', name: 'Workflow 1' },
          { id: '2', name: 'Workflow 2' },
        ],
        next: 'abc123',
      };

      const workflows = workflowService._extractWorkflowsFromResponse(response);

      expect(workflows).toEqual(response.workflows);
      expect(mockLogger.debug).toHaveBeenCalledWith('Response format: object with workflows array');
    });

    it('should extract workflows from object with items array', () => {
      const response = {
        items: [
          { id: '1', name: 'Workflow 1' },
          { id: '2', name: 'Workflow 2' },
        ],
        cursor: 'abc123',
      };

      const workflows = workflowService._extractWorkflowsFromResponse(response);

      expect(workflows).toEqual(response.items);
      expect(mockLogger.debug).toHaveBeenCalledWith('Response format: object with items array');
    });

    it('should return empty array for unknown format', () => {
      const response = {
        unknownField: 'value',
        someData: 123,
      };

      const workflows = workflowService._extractWorkflowsFromResponse(response);

      expect(workflows).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith('Unknown response format, cannot extract workflows');
    });
  });

  describe('_extractNextCursor', () => {
    it('should return null for array response', () => {
      const response = [{ id: '1' }];
      const cursor = workflowService._extractNextCursor(response);
      expect(cursor).toBeNull();
    });

    it('should extract nextCursor field', () => {
      const response = { data: [], nextCursor: 'abc123' };
      const cursor = workflowService._extractNextCursor(response);
      expect(cursor).toBe('abc123');
    });

    it('should extract next field', () => {
      const response = { data: [], next: 'xyz789' };
      const cursor = workflowService._extractNextCursor(response);
      expect(cursor).toBe('xyz789');
    });

    it('should extract cursor field', () => {
      const response = { data: [], cursor: 'def456' };
      const cursor = workflowService._extractNextCursor(response);
      expect(cursor).toBe('def456');
    });

    it('should extract cursor from pagination object', () => {
      const response = {
        data: [],
        pagination: { nextCursor: 'paginated123' },
      };
      const cursor = workflowService._extractNextCursor(response);
      expect(cursor).toBe('paginated123');
    });

    it('should extract cursor from meta object', () => {
      const response = {
        data: [],
        meta: { next: 'meta123' },
      };
      const cursor = workflowService._extractNextCursor(response);
      expect(cursor).toBe('meta123');
    });

    it('should return null when no cursor found', () => {
      const response = { data: [] };
      const cursor = workflowService._extractNextCursor(response);
      expect(cursor).toBeNull();
    });
  });

  describe('listWorkflows - Pagination scenarios', () => {
    it('should handle single page response (array format)', async () => {
      const workflows = [
        { id: '1', name: 'Workflow 1' },
        { id: '2', name: 'Workflow 2' },
      ];

      mockHttpClient.get.mockResolvedValueOnce(workflows);

      const result = await workflowService.listWorkflows();

      expect(result).toEqual(workflows);
      expect(mockHttpClient.get).toHaveBeenCalledTimes(1);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/api/v1/workflows?limit=100');
    });

    it('should handle single page response (object format)', async () => {
      const response = {
        data: [
          { id: '1', name: 'Workflow 1' },
          { id: '2', name: 'Workflow 2' },
        ],
      };

      mockHttpClient.get.mockResolvedValueOnce(response);

      const result = await workflowService.listWorkflows();

      expect(result).toEqual(response.data);
      expect(mockHttpClient.get).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple pages with cursor', async () => {
      const page1 = {
        data: Array.from({ length: 100 }, (_, i) => ({ id: String(i + 1), name: `Workflow ${i + 1}` })),
        nextCursor: 'cursor-page2',
      };

      const page2 = {
        data: Array.from({ length: 50 }, (_, i) => ({ id: String(i + 101), name: `Workflow ${i + 101}` })),
        nextCursor: null,
      };

      mockHttpClient.get
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(page2);

      const result = await workflowService.listWorkflows();

      expect(result.length).toBe(150);
      expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
      expect(mockHttpClient.get).toHaveBeenNthCalledWith(1, '/api/v1/workflows?limit=100');
      expect(mockHttpClient.get).toHaveBeenNthCalledWith(2, '/api/v1/workflows?cursor=cursor-page2&limit=100');
    });

    it('should stop pagination when receiving less than page limit without cursor', async () => {
      const response = {
        data: Array.from({ length: 50 }, (_, i) => ({ id: String(i + 1), name: `Workflow ${i + 1}` })),
      };

      mockHttpClient.get.mockResolvedValueOnce(response);

      const result = await workflowService.listWorkflows();

      expect(result.length).toBe(50);
      expect(mockHttpClient.get).toHaveBeenCalledTimes(1);
    });

    it('should detect and stop on cursor loop', async () => {
      const page1 = {
        data: Array.from({ length: 100 }, (_, i) => ({ id: String(i + 1), name: `Workflow ${i + 1}` })),
        nextCursor: 'same-cursor',
      };

      const page2 = {
        data: Array.from({ length: 100 }, (_, i) => ({ id: String(i + 101), name: `Workflow ${i + 101}` })),
        nextCursor: 'same-cursor', // Same cursor = loop
      };

      mockHttpClient.get
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(page2);

      const result = await workflowService.listWorkflows();

      expect(result.length).toBe(200);
      expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Cursor loop detected'));
    });

    it('should filter out duplicate workflows across pages', async () => {
      const page1 = {
        data: [
          { id: '1', name: 'Workflow 1' },
          { id: '2', name: 'Workflow 2' },
        ],
        nextCursor: 'cursor-page2',
      };

      const page2 = {
        data: [
          { id: '2', name: 'Workflow 2' }, // Duplicate
          { id: '3', name: 'Workflow 3' },
        ],
        nextCursor: null,
      };

      mockHttpClient.get
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(page2);

      const result = await workflowService.listWorkflows();

      expect(result.length).toBe(3); // Only unique workflows
      expect(result.map(w => w.id)).toEqual(['1', '2', '3']);
    });

    it('should stop when empty page is received', async () => {
      const page1 = {
        data: [
          { id: '1', name: 'Workflow 1' },
        ],
        nextCursor: 'cursor-page2',
      };

      const page2 = {
        data: [], // Empty page
        nextCursor: 'cursor-page3',
      };

      mockHttpClient.get
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(page2);

      const result = await workflowService.listWorkflows();

      expect(result.length).toBe(1);
      expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
    });

    it('should stop when full page received without cursor (safety measure)', async () => {
      const response = {
        data: Array.from({ length: 100 }, (_, i) => ({ id: String(i + 1), name: `Workflow ${i + 1}` })),
        // No nextCursor but full page
      };

      mockHttpClient.get.mockResolvedValueOnce(response);

      const result = await workflowService.listWorkflows();

      expect(result.length).toBe(100);
      expect(mockHttpClient.get).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('received full page'));
    });

    it('should handle workflows without IDs gracefully', async () => {
      const response = {
        data: [
          { id: '1', name: 'Workflow 1' },
          { name: 'Workflow without ID' }, // Missing ID
          { id: '2', name: 'Workflow 2' },
        ],
      };

      mockHttpClient.get.mockResolvedValueOnce(response);

      const result = await workflowService.listWorkflows();

      expect(result.length).toBe(2); // Only workflows with IDs
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Workflow without ID'));
    });
  });
});
