/**
 * Unit Tests - TagLayerOrchestrator
 *
 * Testes para coordenação do fluxo de execução completo.
 * Cobre validação de ambiente, conexão, carregamento, processamento e relatórios.
 *
 * @module __tests__/unit/orchestrator.test
 */

// Mock environment variables before loading modules
process.env.SOURCE_N8N_URL = 'http://test.com';
process.env.SOURCE_N8N_API_KEY = 'test-key';

const TagLayerOrchestrator = require('../../core/orchestrator');

describe('TagLayerOrchestrator', () => {
  let orchestrator;
  let mockDependencies;

  beforeEach(() => {
    mockDependencies = {
      mappingLoader: {
        loadAndTransform: jest.fn(),
        getStatistics: jest.fn().mockReturnValue({
          total: 10,
          byLayer: { A: 3, B: 4, C: 3 },
          byTag: { jana: 10 }
        })
      },
      tagService: {
        listTags: jest.fn().mockResolvedValue([{ id: 'tag1', name: 'jana' }]),
        ensureTagExists: jest.fn().mockResolvedValue({ id: 'tag1', name: 'jana' })
      },
      workflowProcessor: {
        processBatch: jest.fn().mockResolvedValue({
          summary: { total: 10, success: 10, failed: 0, skipped: 0 },
          results: []
        }),
        getStats: jest.fn().mockReturnValue({
          totalProcessed: 10,
          successCount: 10,
          failedCount: 0
        })
      },
      reportGenerator: {
        generateMarkdownReport: jest.fn().mockReturnValue('# Report'),
        saveReport: jest.fn().mockReturnValue('/path/to/report.md'),
        printToConsole: jest.fn()
      },
      logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        success: jest.fn()
      }
    };

    orchestrator = new TagLayerOrchestrator(mockDependencies);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with injected dependencies', () => {
      expect(orchestrator.mappingLoader).toBe(mockDependencies.mappingLoader);
      expect(orchestrator.tagService).toBe(mockDependencies.tagService);
      expect(orchestrator.reportGenerator).toBe(mockDependencies.reportGenerator);
      expect(orchestrator.logger).toBe(mockDependencies.logger);
    });

    it('should create default dependencies if not provided', () => {
      const defaultOrchestrator = new TagLayerOrchestrator();
      expect(defaultOrchestrator.mappingLoader).toBeDefined();
      expect(defaultOrchestrator.tagService).toBeDefined();
      expect(defaultOrchestrator.reportGenerator).toBeDefined();
    });
  });

  describe('validateEnvironment', () => {
    it('should validate environment successfully', async () => {
      // Mock validateEnvironment function
      jest.doMock('../../core/validators/environment-validator', () => ({
        validateEnvironment: jest.fn().mockResolvedValue({
          success: true,
          errors: [],
          credentials: { url: 'http://test', apiKey: 'key' }
        })
      }));

      const result = await orchestrator.validateEnvironment();

      expect(result.success).toBe(true);
      expect(orchestrator.logger.success).toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      // Mock validateEnvironment function with error
      jest.doMock('../../core/validators/environment-validator', () => ({
        validateEnvironment: jest.fn().mockResolvedValue({
          success: false,
          errors: ['Missing SOURCE_N8N_URL'],
          credentials: null
        })
      }));

      const result = await orchestrator.validateEnvironment();

      expect(result.success).toBe(false);
      expect(orchestrator.logger.error).toHaveBeenCalled();
    });
  });

  describe('testConnection', () => {
    it('should test connection successfully', async () => {
      mockDependencies.tagService.listTags.mockResolvedValue([]);

      const result = await orchestrator.testConnection();

      expect(result).toBe(true);
      expect(mockDependencies.tagService.listTags).toHaveBeenCalled();
      expect(orchestrator.logger.success).toHaveBeenCalled();
    });

    it('should handle connection failure', async () => {
      mockDependencies.tagService.listTags.mockRejectedValue(new Error('Network error'));

      const result = await orchestrator.testConnection();

      expect(result).toBe(false);
      expect(orchestrator.logger.error).toHaveBeenCalled();
    });
  });

  describe('loadMapping', () => {
    it('should load mapping successfully', async () => {
      const mockData = [
        { id: '1', name: 'WF1', code: 'TST-001', layer: 'A', tag: 'jana' }
      ];

      mockDependencies.mappingLoader.loadAndTransform.mockReturnValue({
        success: true,
        data: mockData,
        errors: []
      });

      const result = await orchestrator.loadMapping();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(orchestrator.logger.success).toHaveBeenCalled();
    });

    it('should handle mapping load errors', async () => {
      mockDependencies.mappingLoader.loadAndTransform.mockReturnValue({
        success: false,
        data: [],
        errors: [{ message: 'File not found' }]
      });

      const result = await orchestrator.loadMapping();

      expect(result.success).toBe(false);
      expect(orchestrator.logger.error).toHaveBeenCalled();
    });

    it('should display layer statistics', async () => {
      mockDependencies.mappingLoader.loadAndTransform.mockReturnValue({
        success: true,
        data: [{ id: '1', layer: 'A' }],
        errors: []
      });

      await orchestrator.loadMapping();

      expect(mockDependencies.mappingLoader.getStatistics).toHaveBeenCalled();
      expect(orchestrator.logger.info).toHaveBeenCalledWith(expect.stringContaining('Layer'));
    });
  });

  describe('ensureTag', () => {
    it('should ensure tag exists', async () => {
      mockDependencies.tagService.ensureTagExists.mockResolvedValue({
        id: 'tag1',
        name: 'jana'
      });

      const tag = await orchestrator.ensureTag('jana');

      expect(tag.name).toBe('jana');
      expect(mockDependencies.tagService.ensureTagExists).toHaveBeenCalledWith('jana');
      expect(orchestrator.logger.success).toHaveBeenCalled();
    });

    it('should handle tag creation errors', async () => {
      mockDependencies.tagService.ensureTagExists.mockRejectedValue(
        new Error('Failed to create tag')
      );

      await expect(orchestrator.ensureTag('jana')).rejects.toThrow();
      expect(orchestrator.logger.error).toHaveBeenCalled();
    });
  });

  describe('processWorkflows', () => {
    const mockWorkflows = [
      { id: '1', name: 'WF1', code: 'TST-001', layer: 'A', tag: 'jana' }
    ];
    const mockTag = { id: 'tag1', name: 'jana' };

    it('should process workflows successfully', async () => {
      mockDependencies.workflowProcessor.processBatch.mockResolvedValue({
        summary: { total: 1, success: 1, failed: 0 },
        results: [{ status: 'success' }]
      });

      const result = await orchestrator.processWorkflows(mockWorkflows, mockTag, {
        dryRun: false
      });

      expect(result.summary.total).toBe(1);
      expect(result.summary.success).toBe(1);
      expect(mockDependencies.workflowProcessor.processBatch).toHaveBeenCalled();
    });

    it('should pass dry-run flag to processor', async () => {
      await orchestrator.processWorkflows(mockWorkflows, mockTag, { dryRun: true });

      expect(mockDependencies.workflowProcessor.processBatch).toHaveBeenCalledWith(
        mockWorkflows,
        mockTag.id,
        expect.objectContaining({ dryRun: true })
      );
    });

    it('should handle processing errors', async () => {
      mockDependencies.workflowProcessor.processBatch.mockRejectedValue(
        new Error('Processing failed')
      );

      await expect(
        orchestrator.processWorkflows(mockWorkflows, mockTag, { dryRun: false })
      ).rejects.toThrow();
    });

    it('should log progress during processing', async () => {
      await orchestrator.processWorkflows(mockWorkflows, mockTag, { dryRun: false });

      expect(orchestrator.logger.info).toHaveBeenCalled();
    });
  });

  describe('generateReport', () => {
    const mockResults = [
      {
        workflowId: '1',
        status: 'success',
        duration: 100
      }
    ];

    const mockMetadata = {
      timestamp: '2025-10-02T19:30:00Z',
      mode: 'production',
      duration: 5000
    };

    it('should generate and save report', async () => {
      mockDependencies.reportGenerator.generateMarkdownReport.mockReturnValue('# Report');
      mockDependencies.reportGenerator.saveReport.mockReturnValue('/path/to/report.md');

      const reportPath = await orchestrator.generateReport(mockResults, mockMetadata);

      expect(reportPath).toBe('/path/to/report.md');
      expect(mockDependencies.reportGenerator.generateMarkdownReport).toHaveBeenCalledWith(
        mockResults,
        mockMetadata
      );
      expect(mockDependencies.reportGenerator.saveReport).toHaveBeenCalled();
    });

    it('should print report to console if verbose', async () => {
      await orchestrator.generateReport(mockResults, mockMetadata, { verbose: true });

      expect(mockDependencies.reportGenerator.printToConsole).toHaveBeenCalled();
    });

    it('should not print to console if not verbose', async () => {
      await orchestrator.generateReport(mockResults, mockMetadata, { verbose: false });

      expect(mockDependencies.reportGenerator.printToConsole).not.toHaveBeenCalled();
    });
  });

  describe('execute', () => {
    beforeEach(() => {
      orchestrator.validateEnvironment = jest.fn().mockResolvedValue({
        success: true,
        errors: []
      });
      orchestrator.testConnection = jest.fn().mockResolvedValue(true);
      orchestrator.loadMapping = jest.fn().mockResolvedValue({
        success: true,
        data: [{ id: '1', name: 'WF1', code: 'TST-001', layer: 'A', tag: 'jana' }]
      });
      orchestrator.ensureTag = jest.fn().mockResolvedValue({ id: 'tag1', name: 'jana' });
      orchestrator.processWorkflows = jest.fn().mockResolvedValue({
        summary: { total: 1, success: 1, failed: 0 },
        results: [{ status: 'success' }]
      });
      orchestrator.generateReport = jest.fn().mockResolvedValue('/path/to/report.md');
    });

    it('should execute full workflow successfully', async () => {
      const result = await orchestrator.execute({ dryRun: false, verbose: true });

      expect(result.success).toBe(true);
      expect(orchestrator.validateEnvironment).toHaveBeenCalled();
      expect(orchestrator.testConnection).toHaveBeenCalled();
      expect(orchestrator.loadMapping).toHaveBeenCalled();
      expect(orchestrator.ensureTag).toHaveBeenCalled();
      expect(orchestrator.processWorkflows).toHaveBeenCalled();
      expect(orchestrator.generateReport).toHaveBeenCalled();
    });

    it('should stop on validation failure', async () => {
      orchestrator.validateEnvironment.mockResolvedValue({
        success: false,
        errors: ['Error']
      });

      const result = await orchestrator.execute({ dryRun: false });

      expect(result.success).toBe(false);
      expect(orchestrator.testConnection).not.toHaveBeenCalled();
    });

    it('should stop on connection failure', async () => {
      orchestrator.testConnection.mockResolvedValue(false);

      const result = await orchestrator.execute({ dryRun: false });

      expect(result.success).toBe(false);
      expect(orchestrator.loadMapping).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      orchestrator.loadMapping.mockRejectedValue(new Error('Load failed'));

      const result = await orchestrator.execute({ dryRun: false });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should pass dry-run flag through pipeline', async () => {
      await orchestrator.execute({ dryRun: true });

      expect(orchestrator.processWorkflows).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(Object),
        expect.objectContaining({ dryRun: true })
      );
    });
  });

  describe('cleanup', () => {
    it('should perform cleanup operations', async () => {
      await orchestrator.cleanup();

      expect(orchestrator.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Cleanup')
      );
    });
  });
});
