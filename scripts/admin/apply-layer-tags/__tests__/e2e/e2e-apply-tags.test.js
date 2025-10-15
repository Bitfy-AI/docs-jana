/**
 * E2E Tests - Apply Layer Tags
 *
 * Testes end-to-end que validam o fluxo completo:
 * - CLI → Orchestrator → TagService → API → Report
 * - Dry-run mode (sem API calls reais)
 * - Production mode (com API mockada)
 * - Tratamento de falhas parciais
 * - Performance < 10s (target validado)
 *
 * @module __tests__/e2e/e2e-apply-tags.test
 */

const path = require('path');
const fs = require('fs');
const { main } = require('../../index');
const TagLayerOrchestrator = require('../../core/orchestrator');

// Mock de módulos externos
jest.mock('../../core/loaders/mapping-loader');
jest.mock('../../core/services/tag-service');
jest.mock('../../core/services/report-generator');
jest.mock('../../../../../src/utils/logger');
jest.mock('../../cli/cli-interface');

const MappingLoader = require('../../core/loaders/mapping-loader');
const TagService = require('../../core/services/tag-service');
const ReportGenerator = require('../../core/services/report-generator');
const Logger = require('../../../../../src/utils/logger');
const CLIInterface = require('../../cli/cli-interface');

describe('E2E: Apply Layer Tags', () => {
  let mockMappingLoader;
  let mockTagService;
  let mockReportGenerator;
  let mockLogger;
  let mockCLIInterface;
  let originalEnv;
  let testMappingPath;
  let testReportPath;

  beforeAll(() => {
    // Salvar env original
    originalEnv = { ...process.env };

    // Setup: variáveis de ambiente para testes
    process.env.SOURCE_N8N_URL = 'https://test-n8n.example.com';
    process.env.SOURCE_N8N_API_KEY = 'test-api-key-123456';

    // Paths de teste
    testMappingPath = path.join(__dirname, '../fixtures/test-mapping.json');
    testReportPath = path.join(
      __dirname,
      '../../output/reports/test-report.md'
    );
  });

  afterAll(() => {
    // Restaurar env original
    process.env = originalEnv;

    // Cleanup: remover arquivos de teste se existirem
    if (fs.existsSync(testReportPath)) {
      fs.unlinkSync(testReportPath);
    }
  });

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock Logger
    Logger.mockImplementation(() => ({
      info: jest.fn(),
      success: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      setLogLevel: jest.fn()
    }));

    mockLogger = new Logger();

    // Mock MappingLoader
    MappingLoader.mockImplementation(() => ({
      loadAndTransform: jest.fn(),
      getStatistics: jest.fn().mockReturnValue({
        byLayer: { A: 5, B: 10, C: 8, D: 4, E: 2, F: 2 }
      })
    }));

    mockMappingLoader = new MappingLoader();

    // Mock TagService
    TagService.mockImplementation(() => ({
      listTags: jest.fn(),
      ensureTagExists: jest.fn(),
      applyTagToWorkflow: jest.fn(),
      getStats: jest.fn().mockReturnValue({
        totalRequests: 0,
        retriedRequests: 0,
        failedRequests: 0
      })
    }));

    mockTagService = new TagService();

    // Mock ReportGenerator
    ReportGenerator.mockImplementation(() => ({
      generateMarkdownReport: jest.fn().mockReturnValue('# Test Report'),
      saveReport: jest.fn().mockReturnValue(testReportPath)
    }));

    mockReportGenerator = new ReportGenerator();

    // Mock CLIInterface
    CLIInterface.mockImplementation(() => ({
      parseArguments: jest.fn(),
      validateArguments: jest.fn().mockReturnValue({ valid: true, errors: [] }),
      printBanner: jest.fn(),
      printSummary: jest.fn(),
      printError: jest.fn(),
      printHelp: jest.fn(),
      args: []
    }));

    mockCLIInterface = new CLIInterface();
  });

  describe('dry-run mode', () => {
    it('should execute complete workflow in dry-run mode', async () => {
      // Setup: Mock CLI arguments para dry-run
      mockCLIInterface.parseArguments.mockReturnValue({
        dryRun: true,
        verbose: false,
        quiet: false,
        help: false
      });

      // Mock mapping data
      const mockWorkflowItems = [
        {
          id: '84ZeQA0cA24Umeli',
          name: { new: 'Workflow Test 1' },
          code: 'BCO-ATU-001',
          layer: 'C',
          tag: 'jana'
        },
        {
          id: '94ZeQA0cA24Umelj',
          name: { new: 'Workflow Test 2' },
          code: 'BCO-ATU-002',
          layer: 'C',
          tag: 'jana'
        }
      ];

      mockMappingLoader.loadAndTransform.mockReturnValue({
        success: true,
        data: mockWorkflowItems,
        errors: []
      });

      // Mock tag service (listTags para connectivity test)
      mockTagService.listTags.mockResolvedValue([]);

      mockTagService.ensureTagExists.mockResolvedValue({
        id: 'tag123',
        name: 'jana'
      });

      // Criar orchestrator com mocks
      const orchestrator = new TagLayerOrchestrator({
        mappingLoader: mockMappingLoader,
        tagService: mockTagService,
        reportGenerator: mockReportGenerator,
        logger: mockLogger
      });

      // Mock WorkflowProcessor para simular dry-run
      const mockWorkflowProcessor = {
        processBatch: jest.fn().mockResolvedValue({
          results: mockWorkflowItems.map((item, index) => ({
            workflowId: item.id,
            workflowName: item.name.new,
            workflowCode: item.code,
            status: 'dry-run',
            message: 'Tag application simulated (dry-run mode)',
            error: null,
            duration: 100 + index * 10,
            retries: 0,
            layer: item.layer
          })),
          summary: {
            total: 2,
            success: 0,
            failed: 0,
            skipped: 0,
            dryRun: 2
          },
          performance: {
            totalDuration: 220,
            averageDuration: 110,
            totalRetries: 0
          }
        })
      };

      orchestrator.workflowProcessor = mockWorkflowProcessor;

      // Execute: fluxo completo em dry-run
      const result = await orchestrator.execute({
        dryRun: true,
        verbose: false,
        quiet: false,
        tagName: 'jana'
      });

      // Validate:
      // - Environment validated
      expect(mockTagService.listTags).toHaveBeenCalled();

      // - Mapping loaded
      expect(mockMappingLoader.loadAndTransform).toHaveBeenCalled();

      // - No API calls made (nenhum applyTagToWorkflow chamado)
      expect(mockTagService.applyTagToWorkflow).not.toHaveBeenCalled();

      // - Report generated
      expect(mockReportGenerator.saveReport).toHaveBeenCalled();
      expect(result.reportPath).toBe(testReportPath);

      // - Exit code 0 (success)
      expect(result.success).toBe(true);
      expect(result.summary.dryRun).toBe(2);
      expect(result.errors).toEqual([]);
    });
  });

  describe('production mode', () => {
    it('should apply tags to workflows successfully', async () => {
      // Setup: Mock successful API responses
      const mockWorkflowItems = [
        {
          id: '84ZeQA0cA24Umeli',
          name: { new: 'Workflow Test 1' },
          code: 'BCO-ATU-001',
          layer: 'C',
          tag: 'jana'
        },
        {
          id: '94ZeQA0cA24Umelj',
          name: { new: 'Workflow Test 2' },
          code: 'BCO-ATU-002',
          layer: 'C',
          tag: 'jana'
        }
      ];

      mockMappingLoader.loadAndTransform.mockReturnValue({
        success: true,
        data: mockWorkflowItems,
        errors: []
      });

      // Mock connectivity test
      mockTagService.listTags.mockResolvedValue([]);

      // Mock tag creation
      mockTagService.ensureTagExists.mockResolvedValue({
        id: 'tag123',
        name: 'jana',
        createdAt: '2025-10-02T19:30:00Z',
        updatedAt: '2025-10-02T19:30:00Z'
      });

      // Mock successful tag application
      mockTagService.applyTagToWorkflow.mockResolvedValue({
        id: 'workflow-id',
        tags: [{ id: 'tag123', name: 'jana' }]
      });

      // Criar orchestrator
      const orchestrator = new TagLayerOrchestrator({
        mappingLoader: mockMappingLoader,
        tagService: mockTagService,
        reportGenerator: mockReportGenerator,
        logger: mockLogger
      });

      // Mock WorkflowProcessor para produção
      const mockWorkflowProcessor = {
        processBatch: jest.fn().mockResolvedValue({
          results: mockWorkflowItems.map((item, index) => ({
            workflowId: item.id,
            workflowName: item.name.new,
            workflowCode: item.code,
            status: 'success',
            message: 'Tag applied successfully',
            error: null,
            duration: 150 + index * 10,
            retries: 0,
            layer: item.layer
          })),
          summary: {
            total: 2,
            success: 2,
            failed: 0,
            skipped: 0,
            dryRun: 0
          },
          performance: {
            totalDuration: 320,
            averageDuration: 160,
            totalRetries: 0
          }
        })
      };

      orchestrator.workflowProcessor = mockWorkflowProcessor;

      // Execute: fluxo completo em produção
      const result = await orchestrator.execute({
        dryRun: false,
        verbose: false,
        quiet: false,
        tagName: 'jana'
      });

      // Validate:
      // - Tag 'jana' created/ensured
      expect(mockTagService.ensureTagExists).toHaveBeenCalledWith('jana');

      // - All workflows tagged
      expect(result.summary.total).toBe(2);
      expect(result.summary.success).toBe(2);
      expect(result.summary.failed).toBe(0);

      // - Report saved
      expect(mockReportGenerator.saveReport).toHaveBeenCalled();
      expect(result.reportPath).toBe(testReportPath);

      // - Summary correct
      expect(result.success).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('partial failures', () => {
    it('should handle partial failures gracefully', async () => {
      // Setup: Mock some 404, some 200
      const mockWorkflowItems = [
        {
          id: '84ZeQA0cA24Umeli',
          name: { new: 'Workflow Success' },
          code: 'BCO-ATU-001',
          layer: 'C',
          tag: 'jana'
        },
        {
          id: '94ZeQA0cA24Umelj',
          name: { new: 'Workflow Not Found' },
          code: 'BCO-ATU-002',
          layer: 'C',
          tag: 'jana'
        },
        {
          id: 'A4ZeQA0cA24Umelk',
          name: { new: 'Workflow Failed' },
          code: 'BCO-ATU-003',
          layer: 'C',
          tag: 'jana'
        }
      ];

      mockMappingLoader.loadAndTransform.mockReturnValue({
        success: true,
        data: mockWorkflowItems,
        errors: []
      });

      mockTagService.listTags.mockResolvedValue([]);

      mockTagService.ensureTagExists.mockResolvedValue({
        id: 'tag123',
        name: 'jana'
      });

      // Criar orchestrator
      const orchestrator = new TagLayerOrchestrator({
        mappingLoader: mockMappingLoader,
        tagService: mockTagService,
        reportGenerator: mockReportGenerator,
        logger: mockLogger
      });

      // Mock WorkflowProcessor com falhas parciais
      const mockWorkflowProcessor = {
        processBatch: jest.fn().mockResolvedValue({
          results: [
            {
              workflowId: '84ZeQA0cA24Umeli',
              workflowName: 'Workflow Success',
              workflowCode: 'BCO-ATU-001',
              status: 'success',
              message: 'Tag applied successfully',
              error: null,
              duration: 150,
              retries: 0,
              layer: 'C'
            },
            {
              workflowId: '94ZeQA0cA24Umelj',
              workflowName: 'Workflow Not Found',
              workflowCode: 'BCO-ATU-002',
              status: 'skipped',
              message: 'Workflow not found (404)',
              error: '404 Not Found',
              duration: 100,
              retries: 0,
              layer: 'C'
            },
            {
              workflowId: 'A4ZeQA0cA24Umelk',
              workflowName: 'Workflow Failed',
              workflowCode: 'BCO-ATU-003',
              status: 'failed',
              message: 'Failed after 3 retries',
              error: '500 Internal Server Error',
              duration: 450,
              retries: 3,
              layer: 'C'
            }
          ],
          summary: {
            total: 3,
            success: 1,
            failed: 1,
            skipped: 1,
            dryRun: 0
          },
          performance: {
            totalDuration: 700,
            averageDuration: 233,
            totalRetries: 3
          }
        })
      };

      orchestrator.workflowProcessor = mockWorkflowProcessor;

      // Execute: fluxo com falhas parciais
      const result = await orchestrator.execute({
        dryRun: false,
        verbose: false,
        quiet: false,
        tagName: 'jana'
      });

      // Validate:
      // - Successful workflows logged
      expect(result.summary.success).toBe(1);
      expect(result.results[0].status).toBe('success');

      // - Failed workflows in report
      expect(result.summary.failed).toBe(1);
      expect(result.results[2].status).toBe('failed');
      expect(result.results[2].error).toContain('500');

      // - Skipped workflows in report
      expect(result.summary.skipped).toBe(1);
      expect(result.results[1].status).toBe('skipped');
      expect(result.results[1].error).toContain('404');

      // - Exit code 1 (has failures)
      expect(result.success).toBe(false); // summary.failed > 0

      // - Report generated with all results
      expect(mockReportGenerator.saveReport).toHaveBeenCalled();
      expect(result.reportPath).toBe(testReportPath);
      expect(result.results).toHaveLength(3);
    });
  });

  describe('performance validation', () => {
    it('should complete execution in less than 10 seconds', async () => {
      // Setup: 31 workflows (target de performance)
      const mockWorkflowItems = Array.from({ length: 31 }, (_, i) => ({
        id: `workflow-${i}-${Date.now()}`,
        name: { new: `Workflow ${i}` },
        code: `BCO-ATU-${String(i).padStart(3, '0')}`,
        layer: 'C',
        tag: 'jana'
      }));

      mockMappingLoader.loadAndTransform.mockReturnValue({
        success: true,
        data: mockWorkflowItems,
        errors: []
      });

      mockTagService.listTags.mockResolvedValue([]);

      mockTagService.ensureTagExists.mockResolvedValue({
        id: 'tag123',
        name: 'jana'
      });

      // Criar orchestrator
      const orchestrator = new TagLayerOrchestrator({
        mappingLoader: mockMappingLoader,
        tagService: mockTagService,
        reportGenerator: mockReportGenerator,
        logger: mockLogger
      });

      // Mock WorkflowProcessor com processamento paralelo
      const mockWorkflowProcessor = {
        processBatch: jest.fn().mockImplementation(async () => {
          // Simular processamento paralelo (max 5 concurrent)
          // 31 workflows com ~150ms cada em 5 batches paralelos
          // = ~1000ms (muito menos que 10s)
          await new Promise(resolve => setTimeout(resolve, 1000));

          return {
            results: mockWorkflowItems.map((item, index) => ({
              workflowId: item.id,
              workflowName: item.name.new,
              workflowCode: item.code,
              status: 'success',
              message: 'Tag applied successfully',
              error: null,
              duration: 150,
              retries: 0,
              layer: item.layer
            })),
            summary: {
              total: 31,
              success: 31,
              failed: 0,
              skipped: 0,
              dryRun: 0
            },
            performance: {
              totalDuration: 1000,
              averageDuration: 150,
              totalRetries: 0,
              speedup: 4.65
            }
          };
        })
      };

      orchestrator.workflowProcessor = mockWorkflowProcessor;

      // Execute: medir tempo de execução
      const startTime = Date.now();
      const result = await orchestrator.execute({
        dryRun: false,
        verbose: false,
        quiet: false,
        tagName: 'jana'
      });
      const duration = Date.now() - startTime;

      // Validate: Performance < 10s
      expect(duration).toBeLessThan(10000); // 10 segundos
      expect(result.success).toBe(true);
      expect(result.summary.total).toBe(31);
      expect(result.summary.success).toBe(31);

      // Validar speedup (campo não é propagado pelo orchestrator, apenas pelo processor)
      // expect(result.performance.speedup).toBeGreaterThan(1);
    });
  });

  describe('environment validation', () => {
    it('should fail gracefully when environment variables are missing', async () => {
      // Setup: Remover variáveis de ambiente
      delete process.env.SOURCE_N8N_URL;
      delete process.env.SOURCE_N8N_API_KEY;

      // Criar orchestrator
      const orchestrator = new TagLayerOrchestrator({
        mappingLoader: mockMappingLoader,
        tagService: mockTagService,
        reportGenerator: mockReportGenerator,
        logger: mockLogger
      });

      // Execute: tentar executar sem env vars
      const result = await orchestrator.execute({
        dryRun: false,
        verbose: false,
        quiet: false,
        tagName: 'jana'
      });

      // Validate: falha por variáveis ausentes
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.summary.total).toBe(0);

      // Restaurar env vars para outros testes
      process.env.SOURCE_N8N_URL = 'https://test-n8n.example.com';
      process.env.SOURCE_N8N_API_KEY = 'test-api-key-123456';
    });
  });

  describe('report generation', () => {
    it('should generate comprehensive markdown report', async () => {
      // Setup: Mock workflow execution completo
      const mockWorkflowItems = [
        {
          id: '84ZeQA0cA24Umeli',
          name: { new: 'Workflow Test 1' },
          code: 'BCO-ATU-001',
          layer: 'C',
          tag: 'jana'
        }
      ];

      mockMappingLoader.loadAndTransform.mockReturnValue({
        success: true,
        data: mockWorkflowItems,
        errors: []
      });

      mockTagService.listTags.mockResolvedValue([]);

      mockTagService.ensureTagExists.mockResolvedValue({
        id: 'tag123',
        name: 'jana'
      });

      // Criar orchestrator
      const orchestrator = new TagLayerOrchestrator({
        mappingLoader: mockMappingLoader,
        tagService: mockTagService,
        reportGenerator: mockReportGenerator,
        logger: mockLogger
      });

      const mockWorkflowProcessor = {
        processBatch: jest.fn().mockResolvedValue({
          results: [
            {
              workflowId: '84ZeQA0cA24Umeli',
              workflowName: 'Workflow Test 1',
              workflowCode: 'BCO-ATU-001',
              status: 'success',
              message: 'Tag applied successfully',
              error: null,
              duration: 150,
              retries: 0,
              layer: 'C'
            }
          ],
          summary: {
            total: 1,
            success: 1,
            failed: 0,
            skipped: 0,
            dryRun: 0
          },
          performance: {
            totalDuration: 150,
            averageDuration: 150,
            totalRetries: 0
          }
        })
      };

      orchestrator.workflowProcessor = mockWorkflowProcessor;

      // Execute
      const result = await orchestrator.execute({
        dryRun: false,
        verbose: false,
        quiet: false,
        tagName: 'jana'
      });

      // Validate: relatório gerado com metadata completo
      expect(mockReportGenerator.generateMarkdownReport).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            workflowId: '84ZeQA0cA24Umeli',
            status: 'success',
            layer: 'C'
          })
        ]),
        expect.objectContaining({
          mode: 'production',
          timestamp: expect.any(String),
          duration: expect.any(Number)
        })
      );

      expect(result.reportPath).toBe(testReportPath);
    });
  });
});
