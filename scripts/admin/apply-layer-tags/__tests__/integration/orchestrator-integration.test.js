/**
 * Integration Tests - TagLayerOrchestrator
 *
 * Testes de integração que validam o fluxo entre componentes do orquestrador:
 * - Carregamento de mapping e validação
 * - Garantia de tag (criação ou busca)
 * - Processamento de workflows em dry-run e produção
 * - Tratamento de erros em cada fase
 *
 * @module __tests__/integration/orchestrator-integration.test
 */

const TagLayerOrchestrator = require('../../core/orchestrator');
const MappingLoader = require('../../core/loaders/mapping-loader');
const TagService = require('../../core/services/tag-service');
const WorkflowProcessor = require('../../core/processors/workflow-processor');
const ReportGenerator = require('../../core/services/report-generator');
const Logger = require('../../../../../src/utils/logger');

describe('TagLayerOrchestrator Integration', () => {
  let orchestrator;
  let mockMappingLoader;
  let mockTagService;
  let mockWorkflowProcessor;
  let mockReportGenerator;
  let mockLogger;

  beforeEach(() => {
    // Mock Logger
    mockLogger = {
      info: jest.fn(),
      success: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      setLogLevel: jest.fn()
    };

    // Mock MappingLoader
    mockMappingLoader = {
      loadAndTransform: jest.fn(),
      getStatistics: jest.fn().mockReturnValue({
        byLayer: { A: 5, B: 10, C: 8, D: 4, E: 2, F: 2 }
      })
    };

    // Mock TagService
    mockTagService = {
      listTags: jest.fn(),
      ensureTagExists: jest.fn(),
      applyTagToWorkflow: jest.fn()
    };

    // Mock WorkflowProcessor
    mockWorkflowProcessor = {
      processBatch: jest.fn()
    };

    // Mock ReportGenerator
    mockReportGenerator = {
      generateMarkdownReport: jest.fn().mockReturnValue('# Mock Report'),
      saveReport: jest.fn().mockReturnValue('/mock/path/report.md')
    };

    // Criar orchestrator com dependências mockadas
    orchestrator = new TagLayerOrchestrator({
      mappingLoader: mockMappingLoader,
      tagService: mockTagService,
      workflowProcessor: mockWorkflowProcessor,
      reportGenerator: mockReportGenerator,
      logger: mockLogger
    });
  });

  describe('loadMapping and validation', () => {
    it('should load mapping and validate successfully', async () => {
      // Setup: Mock mapping file com dados válidos
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

      // Execute: carregar mapeamento
      const result = await orchestrator.loadMapping();

      // Validate: workflowItems retornados corretamente
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe('84ZeQA0cA24Umeli');
      expect(mockLogger.success).toHaveBeenCalledWith(
        expect.stringContaining('2 workflows')
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Distribuicao por layer:');
    });

    it('should handle mapping load errors gracefully', async () => {
      // Setup: Mock erro ao carregar mapping
      mockMappingLoader.loadAndTransform.mockReturnValue({
        success: false,
        data: [],
        errors: [
          { message: 'File not found: rename-mapping-atualizado.json' }
        ]
      });

      // Execute: carregar mapeamento
      const result = await orchestrator.loadMapping();

      // Validate: erro reportado corretamente
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Falha ao carregar mapeamento'
      );
    });

    it('should handle validation errors in mapping data', async () => {
      // Setup: Mock dados com erros de validação
      mockMappingLoader.loadAndTransform.mockReturnValue({
        success: false,
        data: [],
        errors: [
          { message: 'Invalid workflow ID at index 0' },
          { message: 'Invalid layer at index 1' }
        ]
      });

      // Execute: carregar mapeamento
      const result = await orchestrator.loadMapping();

      // Validate: múltiplos erros reportados
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('ensureTag', () => {
    it('should ensure tag exists (create if needed)', async () => {
      // Setup: Mock TagService API - tag não existe, será criada
      mockTagService.ensureTagExists.mockResolvedValue({
        id: 'tag123',
        name: 'jana',
        createdAt: '2025-10-02T19:30:00Z',
        updatedAt: '2025-10-02T19:30:00Z'
      });

      // Execute: garantir tag existe
      const tag = await orchestrator.ensureTag('jana');

      // Validate: tag criada/encontrada corretamente
      expect(tag.id).toBe('tag123');
      expect(tag.name).toBe('jana');
      expect(mockTagService.ensureTagExists).toHaveBeenCalledWith('jana');
      expect(mockLogger.success).toHaveBeenCalledWith(
        expect.stringContaining('tag123')
      );
    });

    it('should handle tag creation failure', async () => {
      // Setup: Mock falha ao criar tag
      mockTagService.ensureTagExists.mockRejectedValue(
        new Error('API Error: 401 Unauthorized')
      );

      // Execute & Validate: erro lançado corretamente
      await expect(orchestrator.ensureTag('jana')).rejects.toThrow(
        'API Error: 401 Unauthorized'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Falha ao garantir tag'),
        'API Error: 401 Unauthorized'
      );
    });
  });

  describe('processWorkflows in dry-run mode', () => {
    it('should process workflows in dry-run mode without API calls', async () => {
      // Setup: Mock workflows e dry-run
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

      mockWorkflowProcessor.processBatch.mockResolvedValue({
        results: [
          {
            workflowId: '84ZeQA0cA24Umeli',
            workflowName: 'Workflow Test 1',
            workflowCode: 'BCO-ATU-001',
            status: 'dry-run',
            message: 'Tag application simulated (dry-run mode)',
            error: null,
            duration: 150,
            retries: 0
          },
          {
            workflowId: '94ZeQA0cA24Umelj',
            workflowName: 'Workflow Test 2',
            workflowCode: 'BCO-ATU-002',
            status: 'dry-run',
            message: 'Tag application simulated (dry-run mode)',
            error: null,
            duration: 140,
            retries: 0
          }
        ],
        summary: {
          total: 2,
          success: 0,
          failed: 0,
          skipped: 0,
          dryRun: 2
        },
        performance: {
          totalDuration: 300,
          averageDuration: 145,
          totalRetries: 0
        }
      });

      // Execute: processar workflows em dry-run
      const result = await orchestrator.processWorkflows(
        mockWorkflowItems,
        'tag123',
        { dryRun: true, quiet: false }
      );

      // Validate: resultados simulados, sem API calls
      expect(result.summary.dryRun).toBe(2);
      expect(result.summary.success).toBe(0);
      expect(result.summary.failed).toBe(0);
      expect(mockWorkflowProcessor.processBatch).toHaveBeenCalledWith(
        mockWorkflowItems,
        'tag123',
        expect.objectContaining({ dryRun: true })
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('DRY-RUN')
      );
    });
  });

  describe('error handling in each phase', () => {
    it('should handle environment validation errors gracefully', async () => {
      // Setup: Mock validateEnvironment para retornar erro
      jest.spyOn(orchestrator, 'validateEnvironment').mockResolvedValue({
        success: false,
        errors: ['SOURCE_N8N_URL is missing', 'SOURCE_N8N_API_KEY is missing']
      });

      // Execute: executar fluxo completo
      const result = await orchestrator.execute({
        dryRun: false,
        verbose: false,
        quiet: false,
        tagName: 'jana'
      });

      // Validate: execução falhou por validação de ambiente
      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('SOURCE_N8N_URL'),
          expect.stringContaining('SOURCE_N8N_API_KEY')
        ])
      );
      expect(result.summary.total).toBe(0);
    });

    it('should handle connection test errors gracefully', async () => {
      // Setup: Mock validateEnvironment OK, mas testConnection falha
      jest.spyOn(orchestrator, 'validateEnvironment').mockResolvedValue({
        success: true,
        errors: []
      });

      jest.spyOn(orchestrator, 'testConnection').mockResolvedValue(false);

      // Execute: executar fluxo completo
      const result = await orchestrator.execute({
        dryRun: false,
        verbose: false,
        quiet: false,
        tagName: 'jana'
      });

      // Validate: execução falhou por falha de conexão
      expect(result.success).toBe(false);
      expect(result.errors).toEqual(['Falha ao conectar com API n8n']);
      expect(result.summary.total).toBe(0);
    });

    it('should handle mapping load errors gracefully', async () => {
      // Setup: Mock ambiente OK, conexão OK, mas mapping falha
      jest.spyOn(orchestrator, 'validateEnvironment').mockResolvedValue({
        success: true,
        errors: []
      });

      jest.spyOn(orchestrator, 'testConnection').mockResolvedValue(true);

      mockMappingLoader.loadAndTransform.mockReturnValue({
        success: false,
        data: [],
        errors: [
          { message: 'Invalid JSON format' },
          { message: 'Missing required fields' }
        ]
      });

      // Execute: executar fluxo completo
      const result = await orchestrator.execute({
        dryRun: false,
        verbose: false,
        quiet: false,
        tagName: 'jana'
      });

      // Validate: execução falhou por erro no mapping
      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          'Invalid JSON format',
          'Missing required fields'
        ])
      );
      expect(result.summary.total).toBe(0);
    });

    it('should handle tag creation errors gracefully', async () => {
      // Setup: Mock tudo OK até tag creation, que falha
      jest.spyOn(orchestrator, 'validateEnvironment').mockResolvedValue({
        success: true,
        errors: []
      });

      jest.spyOn(orchestrator, 'testConnection').mockResolvedValue(true);

      mockMappingLoader.loadAndTransform.mockReturnValue({
        success: true,
        data: [
          {
            id: '84ZeQA0cA24Umeli',
            name: { new: 'Workflow Test' },
            code: 'BCO-ATU-001',
            layer: 'C',
            tag: 'jana'
          }
        ],
        errors: []
      });

      mockTagService.ensureTagExists.mockRejectedValue(
        new Error('API Error: 500 Internal Server Error')
      );

      // Execute: executar fluxo completo
      const result = await orchestrator.execute({
        dryRun: false,
        verbose: false,
        quiet: false,
        tagName: 'jana'
      });

      // Validate: execução falhou por erro ao criar tag
      expect(result.success).toBe(false);
      expect(result.errors).toEqual(['API Error: 500 Internal Server Error']);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('ERRO FATAL')
      );
    });

    it('should continue execution and log partial failures', async () => {
      // Setup: Mock processamento com falhas parciais
      jest.spyOn(orchestrator, 'validateEnvironment').mockResolvedValue({
        success: true,
        errors: []
      });

      jest.spyOn(orchestrator, 'testConnection').mockResolvedValue(true);

      mockMappingLoader.loadAndTransform.mockReturnValue({
        success: true,
        data: [
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
        ],
        errors: []
      });

      mockTagService.ensureTagExists.mockResolvedValue({
        id: 'tag123',
        name: 'jana'
      });

      mockWorkflowProcessor.processBatch.mockResolvedValue({
        results: [
          {
            workflowId: '84ZeQA0cA24Umeli',
            workflowName: 'Workflow Test 1',
            workflowCode: 'BCO-ATU-001',
            status: 'success',
            message: 'Tag applied successfully',
            error: null,
            duration: 150,
            retries: 0
          },
          {
            workflowId: '94ZeQA0cA24Umelj',
            workflowName: 'Workflow Test 2',
            workflowCode: 'BCO-ATU-002',
            status: 'failed',
            message: 'Failed after 3 retries',
            error: '404 Not Found',
            duration: 450,
            retries: 3
          }
        ],
        summary: {
          total: 2,
          success: 1,
          failed: 1,
          skipped: 0,
          dryRun: 0
        },
        performance: {
          totalDuration: 600,
          averageDuration: 300,
          totalRetries: 3
        }
      });

      // Execute: executar fluxo completo
      const result = await orchestrator.execute({
        dryRun: false,
        verbose: false,
        quiet: false,
        tagName: 'jana'
      });

      // Validate: execução continua com falhas parciais
      expect(result.success).toBe(false); // Falhou porque summary.failed > 0
      expect(result.summary.success).toBe(1);
      expect(result.summary.failed).toBe(1);
      expect(result.reportPath).toBe('/mock/path/report.md');
      expect(mockReportGenerator.saveReport).toHaveBeenCalled();
    });
  });

  describe('complete workflow execution', () => {
    it('should execute complete workflow successfully', async () => {
      // Setup: Mock fluxo completo com sucesso
      jest.spyOn(orchestrator, 'validateEnvironment').mockResolvedValue({
        success: true,
        errors: []
      });

      jest.spyOn(orchestrator, 'testConnection').mockResolvedValue(true);

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

      mockTagService.ensureTagExists.mockResolvedValue({
        id: 'tag123',
        name: 'jana'
      });

      mockWorkflowProcessor.processBatch.mockResolvedValue({
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
          },
          {
            workflowId: '94ZeQA0cA24Umelj',
            workflowName: 'Workflow Test 2',
            workflowCode: 'BCO-ATU-002',
            status: 'success',
            message: 'Tag applied successfully',
            error: null,
            duration: 140,
            retries: 0,
            layer: 'C'
          }
        ],
        summary: {
          total: 2,
          success: 2,
          failed: 0,
          skipped: 0,
          dryRun: 0
        },
        performance: {
          totalDuration: 300,
          averageDuration: 145,
          totalRetries: 0
        }
      });

      // Execute: executar fluxo completo
      const result = await orchestrator.execute({
        dryRun: false,
        verbose: false,
        quiet: false,
        tagName: 'jana'
      });

      // Validate: execução completa com sucesso
      expect(result.success).toBe(true);
      expect(result.summary.total).toBe(2);
      expect(result.summary.success).toBe(2);
      expect(result.summary.failed).toBe(0);
      expect(result.reportPath).toBe('/mock/path/report.md');
      expect(result.errors).toEqual([]);

      // Verificar que todas as etapas foram executadas
      expect(mockMappingLoader.loadAndTransform).toHaveBeenCalled();
      expect(mockTagService.ensureTagExists).toHaveBeenCalledWith('jana');
      expect(mockWorkflowProcessor.processBatch).toHaveBeenCalledWith(
        mockWorkflowItems,
        'tag123',
        expect.objectContaining({ dryRun: false })
      );
      expect(mockReportGenerator.generateMarkdownReport).toHaveBeenCalled();
      expect(mockReportGenerator.saveReport).toHaveBeenCalled();
    });
  });
});
