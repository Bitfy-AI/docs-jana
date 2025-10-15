/**
 * Unit Tests - WorkflowProcessor
 *
 * Testes para processamento paralelo de workflows com aplicação de tags.
 * Cobre dry-run, retry, error handling e batch processing.
 *
 * @module __tests__/unit/workflow-processor.test
 */

const WorkflowProcessor = require('../../core/processors/workflow-processor');

describe('WorkflowProcessor', () => {
  let processor;
  let mockTagService;
  let mockLogger;

  beforeEach(() => {
    mockTagService = {
      applyTagToWorkflow: jest.fn()
    };

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      success: jest.fn()
    };

    processor = new WorkflowProcessor(mockTagService, mockLogger, {
      maxConcurrent: 5,
      dryRun: false
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw error if TagService is missing', () => {
      expect(() => new WorkflowProcessor(null)).toThrow('TagService is required');
    });

    it('should initialize with config', () => {
      expect(processor.tagService).toBe(mockTagService);
      expect(processor.logger).toBe(mockLogger);
      expect(processor.config.maxConcurrent).toBe(5);
      expect(processor.config.dryRun).toBe(false);
    });

    it('should initialize stats', () => {
      expect(processor.stats).toEqual({
        totalProcessed: 0,
        successCount: 0,
        failedCount: 0,
        skippedCount: 0,
        dryRunCount: 0,
        totalRetries: 0
      });
    });
  });

  describe('processWorkflow', () => {
    const workflowItem = {
      id: 'workflow123',
      name: { new: 'Test Workflow' },
      code: 'TST-001',
      layer: 'A',
      tag: 'jana'
    };
    const tagId = 'tag123';

    describe('dry-run mode', () => {
      it('should simulate tag application in dry-run mode', async () => {
        const result = await processor.processWorkflow(workflowItem, tagId, true);

        expect(result.status).toBe('dry-run');
        expect(result.workflowId).toBe('workflow123');
        expect(result.workflowCode).toBe('TST-001');
        expect(result.error).toBeNull();
        expect(result.retries).toBe(0);
        expect(mockTagService.applyTagToWorkflow).not.toHaveBeenCalled();
        expect(processor.stats.dryRunCount).toBe(1);
      });
    });

    describe('success cases', () => {
      it('should apply tag successfully', async () => {
        mockTagService.applyTagToWorkflow.mockResolvedValue({ id: 'workflow123', tags: [tagId] });

        const result = await processor.processWorkflow(workflowItem, tagId, false);

        expect(result.status).toBe('success');
        expect(result.error).toBeNull();
        expect(result.retries).toBe(0);
        expect(mockTagService.applyTagToWorkflow).toHaveBeenCalledWith('workflow123', tagId);
        expect(processor.stats.successCount).toBe(1);
        expect(processor.stats.totalProcessed).toBe(1);
      });
    });

    describe('validation errors', () => {
      it('should fail if workflowId is missing', async () => {
        const invalidItem = { name: { new: 'Test' }, code: 'TST-001' };

        const result = await processor.processWorkflow(invalidItem, tagId, false);

        expect(result.status).toBe('failed');
        expect(result.error).toContain('workflowId is required');
      });
    });

    describe('error handling', () => {
      it('should handle 404 as skipped', async () => {
        const error = new Error('Not found');
        error.statusCode = 404;
        mockTagService.applyTagToWorkflow.mockRejectedValue(error);
        processor._extractStatusCode = jest.fn().mockReturnValue(404);

        const result = await processor.processWorkflow(workflowItem, tagId, false);

        expect(result.status).toBe('skipped');
        expect(result.message).toContain('404');
        expect(processor.stats.skippedCount).toBe(1);
      });

      it('should handle 409 as success (tag already applied)', async () => {
        const error = new Error('Conflict');
        error.statusCode = 409;
        mockTagService.applyTagToWorkflow.mockRejectedValue(error);
        processor._extractStatusCode = jest.fn().mockReturnValue(409);

        const result = await processor.processWorkflow(workflowItem, tagId, false);

        expect(result.status).toBe('success');
        expect(result.message).toContain('409');
        expect(processor.stats.successCount).toBe(1);
      });

      it('should fail immediately on 401', async () => {
        const error = new Error('Unauthorized');
        error.statusCode = 401;
        mockTagService.applyTagToWorkflow.mockRejectedValue(error);
        processor._extractStatusCode = jest.fn().mockReturnValue(401);

        const result = await processor.processWorkflow(workflowItem, tagId, false);

        expect(result.status).toBe('failed');
        expect(processor.stats.failedCount).toBe(1);
      });
    });

    describe('retry mechanism', () => {
      it('should retry on transient errors', async () => {
        mockTagService.applyTagToWorkflow
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce({ id: 'workflow123', tags: [tagId] });

        processor._extractStatusCode = jest.fn().mockReturnValue(null);
        processor._shouldRetry = jest.fn().mockReturnValue(true);

        const result = await processor.processWorkflow(workflowItem, tagId, false);

        expect(result.status).toBe('success');
        expect(result.retries).toBeGreaterThan(0);
        expect(mockTagService.applyTagToWorkflow).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('processBatch', () => {
    const workflowItems = [
      { id: 'wf1', name: { new: 'WF1' }, code: 'TST-001', layer: 'A', tag: 'jana' },
      { id: 'wf2', name: { new: 'WF2' }, code: 'TST-002', layer: 'B', tag: 'jana' },
      { id: 'wf3', name: { new: 'WF3' }, code: 'TST-003', layer: 'C', tag: 'jana' }
    ];
    const tagId = 'tag123';

    it('should process batch successfully', async () => {
      mockTagService.applyTagToWorkflow.mockResolvedValue({ tags: [tagId] });

      const result = await processor.processBatch(workflowItems, tagId, { dryRun: false });

      expect(result.summary.total).toBe(3);
      expect(result.summary.success).toBe(3);
      expect(result.results).toHaveLength(3);
    });

    it('should call onProgress callback', async () => {
      mockTagService.applyTagToWorkflow.mockResolvedValue({ tags: [tagId] });
      const onProgress = jest.fn();

      await processor.processBatch(workflowItems, tagId, { dryRun: false, onProgress });

      expect(onProgress).toHaveBeenCalledTimes(3);
      expect(onProgress).toHaveBeenCalledWith(1, 3, expect.any(Object));
      expect(onProgress).toHaveBeenCalledWith(2, 3, expect.any(Object));
      expect(onProgress).toHaveBeenCalledWith(3, 3, expect.any(Object));
    });

    it('should process in dry-run mode', async () => {
      const result = await processor.processBatch(workflowItems, tagId, { dryRun: true });

      expect(result.summary.total).toBe(3);
      expect(mockTagService.applyTagToWorkflow).not.toHaveBeenCalled();
      expect(processor.stats.dryRunCount).toBe(3);
    });

    it('should aggregate errors', async () => {
      mockTagService.applyTagToWorkflow
        .mockResolvedValueOnce({ tags: [tagId] })
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({ tags: [tagId] });

      processor._extractStatusCode = jest.fn().mockReturnValue(500);
      processor._shouldRetry = jest.fn().mockReturnValue(false);

      const result = await processor.processBatch(workflowItems, tagId, { dryRun: false });

      expect(result.summary.success).toBe(2);
      expect(result.summary.failed).toBe(1);
    });
  });

  describe('_shouldRetry', () => {
    it('should retry on 429 rate limit', () => {
      const shouldRetry = processor._shouldRetry(new Error('Rate limit'), 429);
      expect(shouldRetry).toBe(true);
    });

    it('should retry on 5xx errors', () => {
      const shouldRetry = processor._shouldRetry(new Error('Server error'), 500);
      expect(shouldRetry).toBe(true);
    });

    it('should retry on network errors', () => {
      const error = new Error('Network error');
      error.code = 'ECONNRESET';
      const shouldRetry = processor._shouldRetry(error, null);
      expect(shouldRetry).toBe(true);
    });

    it('should not retry on 4xx errors (except 429)', () => {
      const shouldRetry = processor._shouldRetry(new Error('Bad request'), 400);
      expect(shouldRetry).toBe(false);
    });
  });

  describe('_extractStatusCode', () => {
    it('should extract status code from error', () => {
      const error = new Error('Test');
      error.statusCode = 404;
      const code = processor._extractStatusCode(error);
      expect(code).toBe(404);
    });

    it('should return null if no status code', () => {
      const error = new Error('Test');
      const code = processor._extractStatusCode(error);
      expect(code).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should return statistics', () => {
      processor.stats.successCount = 5;
      processor.stats.failedCount = 2;

      const stats = processor.getStats();

      expect(stats.successCount).toBe(5);
      expect(stats.failedCount).toBe(2);
    });
  });

  describe('resetStats', () => {
    it('should reset statistics', () => {
      processor.stats.successCount = 5;
      processor.stats.failedCount = 2;

      processor.resetStats();

      expect(processor.stats.successCount).toBe(0);
      expect(processor.stats.failedCount).toBe(0);
      expect(processor.stats.totalProcessed).toBe(0);
    });
  });
});
