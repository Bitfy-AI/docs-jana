/**
 * @fileoverview Testes de integração para TransferManager
 * @module tests/integration/n8n-transfer/transfer-flow.test
 *
 * Suite de testes de integração cobrindo:
 * - Fluxo completo de transferência end-to-end
 * - Cenários de erro e recuperação
 * - Workflows com credenciais
 * - Detecção e tratamento de duplicatas
 * - Validação de integridade
 *
 * Estes testes usam mocks mas simulam o comportamento real dos componentes integrados.
 */

const TransferManager = require('../../../scripts/admin/n8n-transfer/core/transfer-manager');

describe('TransferManager - Integration Tests', () => {
  let manager;
  let mockConfig;
  let mockSourceClient;
  let mockTargetClient;
  let mockPluginRegistry;
  let mockLogger;

  beforeEach(() => {
    // Create mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    // Create mock config
    mockConfig = {
      SOURCE: {
        url: 'https://source.n8n.com',
        apiKey: 'source-api-key-123'
      },
      TARGET: {
        url: 'https://target.n8n.com',
        apiKey: 'target-api-key-456'
      }
    };

    // Create mock HTTP clients
    mockSourceClient = {
      testConnection: jest.fn().mockResolvedValue({ success: true }),
      getWorkflows: jest.fn().mockResolvedValue([]),
      createWorkflow: jest.fn()
    };

    mockTargetClient = {
      testConnection: jest.fn().mockResolvedValue({ success: true }),
      getWorkflows: jest.fn().mockResolvedValue([]),
      createWorkflow: jest.fn()
    };

    // Create mock plugin registry
    mockPluginRegistry = {
      get: jest.fn(),
      getAll: jest.fn().mockReturnValue([])
    };
  });

  // ==================== Fluxo Completo de Transferência ====================
  describe('Fluxo Completo de Transferência', () => {
    it('deve executar transferência end-to-end com sucesso', async () => {
      // Arrange: SOURCE workflows
      const sourceWorkflows = [
        {
          id: 'wf-1',
          name: 'Customer Onboarding',
          tags: ['automation', 'sales'],
          nodes: [
            { id: 'node1', type: 'webhook', parameters: {} },
            { id: 'node2', type: 'sendEmail', parameters: {} }
          ],
          connections: { node1: { main: [[{ node: 'node2', type: 'main', index: 0 }]] } }
        },
        {
          id: 'wf-2',
          name: 'Data Sync',
          tags: ['integration'],
          nodes: [{ id: 'node1', type: 'httpRequest', parameters: {} }],
          connections: {}
        }
      ];

      // TARGET está vazio
      const targetWorkflows = [];

      mockSourceClient.getWorkflows.mockResolvedValue(sourceWorkflows);
      mockTargetClient.getWorkflows.mockResolvedValue(targetWorkflows);
      mockTargetClient.createWorkflow
        .mockResolvedValueOnce({ id: 'new-wf-1', name: 'Customer Onboarding' })
        .mockResolvedValueOnce({ id: 'new-wf-2', name: 'Data Sync' });

      // Mock plugins
      const mockDeduplicator = {
        getName: () => 'standard-deduplicator',
        isEnabled: () => true,
        isDuplicate: jest.fn().mockReturnValue(false),
        getReason: jest.fn()
      };

      const mockValidator = {
        getName: () => 'integrity-validator',
        isEnabled: () => true,
        validate: jest.fn().mockReturnValue({ valid: true, errors: [] })
      };

      const mockReporter = {
        getName: () => 'markdown-reporter',
        isEnabled: () => true,
        generate: jest.fn().mockReturnValue('/reports/transfer-report.md')
      };

      mockPluginRegistry.get.mockImplementation((name, type) => {
        if (type === 'deduplicator') return mockDeduplicator;
        if (type === 'validator') return mockValidator;
        if (type === 'reporter') return mockReporter;
        return null;
      });

      // Create manager with injected dependencies
      manager = new TransferManager(mockConfig, {
        logger: mockLogger,
        pluginRegistry: mockPluginRegistry
      });
      manager.sourceClient = mockSourceClient;
      manager.targetClient = mockTargetClient;

      // Act: Execute transfer
      const result = await manager.transfer({
        filters: {},
        dryRun: false,
        parallelism: 1,
        deduplicator: 'standard-deduplicator',
        validators: ['integrity-validator'],
        reporters: ['markdown-reporter']
      });

      // Assert: Verify transfer summary
      expect(result.total).toBe(2);
      expect(result.transferred).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.workflows).toHaveLength(2);
      expect(result.workflows[0].status).toBe('transferred');
      expect(result.workflows[1].status).toBe('transferred');

      // Verify SOURCE was queried
      expect(mockSourceClient.getWorkflows).toHaveBeenCalled();

      // Verify TARGET received workflows
      expect(mockTargetClient.createWorkflow).toHaveBeenCalledTimes(2);

      // Verify deduplication was executed
      expect(mockDeduplicator.isDuplicate).toHaveBeenCalledTimes(2);

      // Verify validation was executed
      expect(mockValidator.validate).toHaveBeenCalledTimes(2);

      // Verify reports were generated
      expect(mockReporter.generate).toHaveBeenCalled();
      expect(result.reports).toBeDefined();
      expect(result.reports[0].path).toContain('transfer-report.md');
    });

    it('deve aplicar filtros e transferir apenas workflows selecionados', async () => {
      const sourceWorkflows = [
        { id: 'wf-1', name: 'Prod Workflow', tags: ['production'], nodes: [] },
        { id: 'wf-2', name: 'Dev Workflow', tags: ['development'], nodes: [] },
        { id: 'wf-3', name: 'Prod Backup', tags: ['production', 'backup'], nodes: [] }
      ];

      mockSourceClient.getWorkflows.mockResolvedValue(sourceWorkflows);
      mockTargetClient.getWorkflows.mockResolvedValue([]);
      mockTargetClient.createWorkflow.mockResolvedValue({ id: 'new-id' });

      // Mock plugins
      const mockDeduplicator = {
        getName: () => 'standard-deduplicator',
        isEnabled: () => true,
        isDuplicate: jest.fn().mockReturnValue(false)
      };

      mockPluginRegistry.get.mockReturnValue(mockDeduplicator);

      manager = new TransferManager(mockConfig, {
        logger: mockLogger,
        pluginRegistry: mockPluginRegistry
      });
      manager.sourceClient = mockSourceClient;
      manager.targetClient = mockTargetClient;

      const result = await manager.transfer({
        filters: { tags: ['production'] },
        dryRun: false,
        deduplicator: 'standard-deduplicator',
        validators: [],
        reporters: []
      });

      expect(result.total).toBe(2); // Apenas workflows com tag 'production'
      expect(result.transferred).toBe(2);
      expect(mockTargetClient.createWorkflow).toHaveBeenCalledTimes(2);
    });

    it('deve executar deduplicação e skipar workflows duplicados', async () => {
      const sourceWorkflows = [
        { id: 'wf-1', name: 'Workflow A', tags: ['test'], nodes: [] }
      ];

      const targetWorkflows = [
        { id: 'existing-1', name: 'Workflow A', tags: ['test'], nodes: [] }
      ];

      mockSourceClient.getWorkflows.mockResolvedValue(sourceWorkflows);
      mockTargetClient.getWorkflows.mockResolvedValue(targetWorkflows);

      // Mock deduplicator to detect duplicate
      const mockDeduplicator = {
        getName: () => 'standard-deduplicator',
        isEnabled: () => true,
        isDuplicate: jest.fn().mockReturnValue(true),
        getReason: jest.fn().mockReturnValue('Duplicate: same name and tags')
      };

      mockPluginRegistry.get.mockReturnValue(mockDeduplicator);

      manager = new TransferManager(mockConfig, {
        logger: mockLogger,
        pluginRegistry: mockPluginRegistry
      });
      manager.sourceClient = mockSourceClient;
      manager.targetClient = mockTargetClient;

      const result = await manager.transfer({
        filters: {},
        dryRun: false,
        deduplicator: 'standard-deduplicator',
        validators: [],
        reporters: []
      });

      expect(result.total).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.transferred).toBe(0);
      expect(result.workflows[0].reason).toContain('Duplicate');
      expect(mockTargetClient.createWorkflow).not.toHaveBeenCalled();
    });

    it('deve executar validação e skipar workflows inválidos', async () => {
      const sourceWorkflows = [
        { id: 'wf-1', name: 'Invalid Workflow', nodes: null } // Invalid: nodes is null
      ];

      mockSourceClient.getWorkflows.mockResolvedValue(sourceWorkflows);
      mockTargetClient.getWorkflows.mockResolvedValue([]);

      // Mock validator to reject workflow
      const mockDeduplicator = {
        getName: () => 'standard-deduplicator',
        isEnabled: () => true,
        isDuplicate: jest.fn().mockReturnValue(false)
      };

      const mockValidator = {
        getName: () => 'integrity-validator',
        isEnabled: () => true,
        validate: jest.fn().mockReturnValue({
          valid: false,
          errors: ['Workflow.nodes is required']
        })
      };

      mockPluginRegistry.get.mockImplementation((name, type) => {
        if (type === 'deduplicator') return mockDeduplicator;
        if (type === 'validator') return mockValidator;
        return null;
      });

      manager = new TransferManager(mockConfig, {
        logger: mockLogger,
        pluginRegistry: mockPluginRegistry
      });
      manager.sourceClient = mockSourceClient;
      manager.targetClient = mockTargetClient;

      const result = await manager.transfer({
        filters: {},
        dryRun: false,
        deduplicator: 'standard-deduplicator',
        validators: ['integrity-validator'],
        reporters: []
      });

      expect(result.total).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.transferred).toBe(0);
      expect(result.workflows[0].reason).toContain('Validation failed');
      expect(mockTargetClient.createWorkflow).not.toHaveBeenCalled();
    });

    it('deve gerar relatórios ao final da transferência', async () => {
      const sourceWorkflows = [
        { id: 'wf-1', name: 'Test Workflow', tags: [], nodes: [] }
      ];

      mockSourceClient.getWorkflows.mockResolvedValue(sourceWorkflows);
      mockTargetClient.getWorkflows.mockResolvedValue([]);
      mockTargetClient.createWorkflow.mockResolvedValue({ id: 'new-1' });

      const mockDeduplicator = {
        getName: () => 'standard-deduplicator',
        isEnabled: () => true,
        isDuplicate: jest.fn().mockReturnValue(false)
      };

      const mockReporter = {
        getName: () => 'json-reporter',
        isEnabled: () => true,
        generate: jest.fn().mockReturnValue('/reports/transfer-report.json')
      };

      mockPluginRegistry.get.mockImplementation((name, type) => {
        if (type === 'deduplicator') return mockDeduplicator;
        if (type === 'reporter') return mockReporter;
        return null;
      });

      manager = new TransferManager(mockConfig, {
        logger: mockLogger,
        pluginRegistry: mockPluginRegistry
      });
      manager.sourceClient = mockSourceClient;
      manager.targetClient = mockTargetClient;

      const result = await manager.transfer({
        filters: {},
        dryRun: false,
        deduplicator: 'standard-deduplicator',
        validators: [],
        reporters: ['json-reporter']
      });

      expect(mockReporter.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          total: 1,
          transferred: 1,
          skipped: 0,
          failed: 0
        })
      );
      expect(result.reports).toHaveLength(1);
      expect(result.reports[0].path).toBe('/reports/transfer-report.json');
    });
  });

  // ==================== Cenários de Erro ====================
  describe('Cenários de Erro', () => {
    it('deve lançar erro se SOURCE não estiver disponível', async () => {
      mockSourceClient.testConnection.mockResolvedValue({
        success: false,
        error: 'Connection refused',
        suggestion: 'Verifique se o servidor está rodando'
      });

      const mockDeduplicator = {
        getName: () => 'standard-deduplicator',
        isEnabled: () => true
      };

      mockPluginRegistry.get.mockReturnValue(mockDeduplicator);

      manager = new TransferManager(mockConfig, {
        logger: mockLogger,
        pluginRegistry: mockPluginRegistry
      });
      manager.sourceClient = mockSourceClient;
      manager.targetClient = mockTargetClient;

      await expect(manager.transfer({
        deduplicator: 'standard-deduplicator',
        validators: [],
        reporters: []
      })).rejects.toThrow('SOURCE connection failed');

      expect(mockSourceClient.testConnection).toHaveBeenCalled();
      expect(mockSourceClient.getWorkflows).not.toHaveBeenCalled();
    });

    it('deve lançar erro se TARGET não estiver disponível', async () => {
      mockTargetClient.testConnection.mockResolvedValue({
        success: false,
        error: 'Unauthorized',
        suggestion: 'Verifique a API key'
      });

      const mockDeduplicator = {
        getName: () => 'standard-deduplicator',
        isEnabled: () => true
      };

      mockPluginRegistry.get.mockReturnValue(mockDeduplicator);

      manager = new TransferManager(mockConfig, {
        logger: mockLogger,
        pluginRegistry: mockPluginRegistry
      });
      manager.sourceClient = mockSourceClient;
      manager.targetClient = mockTargetClient;

      await expect(manager.transfer({
        deduplicator: 'standard-deduplicator',
        validators: [],
        reporters: []
      })).rejects.toThrow('TARGET connection failed');

      expect(mockTargetClient.testConnection).toHaveBeenCalled();
    });

    it('deve marcar workflow como failed se erro durante transferência', async () => {
      const sourceWorkflows = [
        { id: 'wf-1', name: 'Test Workflow', nodes: [] }
      ];

      mockSourceClient.getWorkflows.mockResolvedValue(sourceWorkflows);
      mockTargetClient.getWorkflows.mockResolvedValue([]);
      mockTargetClient.createWorkflow.mockRejectedValue(
        new Error('API Error: Rate limit exceeded')
      );

      const mockDeduplicator = {
        getName: () => 'standard-deduplicator',
        isEnabled: () => true,
        isDuplicate: jest.fn().mockReturnValue(false)
      };

      mockPluginRegistry.get.mockReturnValue(mockDeduplicator);

      manager = new TransferManager(mockConfig, {
        logger: mockLogger,
        pluginRegistry: mockPluginRegistry
      });
      manager.sourceClient = mockSourceClient;
      manager.targetClient = mockTargetClient;

      const result = await manager.transfer({
        filters: {},
        dryRun: false,
        deduplicator: 'standard-deduplicator',
        validators: [],
        reporters: []
      });

      expect(result.total).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.transferred).toBe(0);
      expect(result.workflows[0].status).toBe('failed');
      expect(result.workflows[0].error).toContain('API Error');
    });

    it('deve continuar processando após erro parcial', async () => {
      const sourceWorkflows = [
        { id: 'wf-1', name: 'Workflow 1', nodes: [] },
        { id: 'wf-2', name: 'Workflow 2', nodes: [] },
        { id: 'wf-3', name: 'Workflow 3', nodes: [] }
      ];

      mockSourceClient.getWorkflows.mockResolvedValue(sourceWorkflows);
      mockTargetClient.getWorkflows.mockResolvedValue([]);
      mockTargetClient.createWorkflow
        .mockResolvedValueOnce({ id: 'new-1' })
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce({ id: 'new-3' });

      const mockDeduplicator = {
        getName: () => 'standard-deduplicator',
        isEnabled: () => true,
        isDuplicate: jest.fn().mockReturnValue(false)
      };

      mockPluginRegistry.get.mockReturnValue(mockDeduplicator);

      manager = new TransferManager(mockConfig, {
        logger: mockLogger,
        pluginRegistry: mockPluginRegistry
      });
      manager.sourceClient = mockSourceClient;
      manager.targetClient = mockTargetClient;

      const result = await manager.transfer({
        filters: {},
        dryRun: false,
        parallelism: 1,
        deduplicator: 'standard-deduplicator',
        validators: [],
        reporters: []
      });

      expect(result.total).toBe(3);
      expect(result.transferred).toBe(2);
      expect(result.failed).toBe(1);
      expect(mockTargetClient.createWorkflow).toHaveBeenCalledTimes(3);
    });
  });

  // ==================== Workflows com Credenciais ====================
  describe('Workflows com Credenciais', () => {
    it('deve detectar workflows com credenciais', async () => {
      const sourceWorkflows = [
        {
          id: 'wf-1',
          name: 'Workflow with Creds',
          nodes: [
            { id: 'node1', type: 'http', credentials: { httpAuth: 'cred-123' } }
          ]
        }
      ];

      mockSourceClient.getWorkflows.mockResolvedValue(sourceWorkflows);
      mockTargetClient.getWorkflows.mockResolvedValue([]);

      const mockDeduplicator = {
        getName: () => 'standard-deduplicator',
        isEnabled: () => true,
        isDuplicate: jest.fn().mockReturnValue(false)
      };

      mockPluginRegistry.get.mockReturnValue(mockDeduplicator);

      manager = new TransferManager(mockConfig, {
        logger: mockLogger,
        pluginRegistry: mockPluginRegistry
      });
      manager.sourceClient = mockSourceClient;
      manager.targetClient = mockTargetClient;

      const result = await manager.transfer({
        filters: {},
        skipCredentials: true,
        dryRun: false,
        deduplicator: 'standard-deduplicator',
        validators: [],
        reporters: []
      });

      expect(result.skipped).toBe(1);
      expect(result.workflows[0].reason).toContain('credentials');
      expect(mockTargetClient.createWorkflow).not.toHaveBeenCalled();
    });

    it('deve transferir workflows com credenciais quando skipCredentials=false', async () => {
      const sourceWorkflows = [
        {
          id: 'wf-1',
          name: 'Workflow with Creds',
          nodes: [
            { id: 'node1', credentials: { httpAuth: 'cred-123' } }
          ]
        }
      ];

      mockSourceClient.getWorkflows.mockResolvedValue(sourceWorkflows);
      mockTargetClient.getWorkflows.mockResolvedValue([]);
      mockTargetClient.createWorkflow.mockResolvedValue({ id: 'new-1' });

      const mockDeduplicator = {
        getName: () => 'standard-deduplicator',
        isEnabled: () => true,
        isDuplicate: jest.fn().mockReturnValue(false)
      };

      mockPluginRegistry.get.mockReturnValue(mockDeduplicator);

      manager = new TransferManager(mockConfig, {
        logger: mockLogger,
        pluginRegistry: mockPluginRegistry
      });
      manager.sourceClient = mockSourceClient;
      manager.targetClient = mockTargetClient;

      const result = await manager.transfer({
        filters: {},
        skipCredentials: false,
        dryRun: false,
        deduplicator: 'standard-deduplicator',
        validators: [],
        reporters: []
      });

      expect(result.transferred).toBe(1);
      expect(result.skipped).toBe(0);
      expect(mockTargetClient.createWorkflow).toHaveBeenCalled();
    });
  });

  // ==================== Workflows Duplicados ====================
  describe('Workflows Duplicados', () => {
    it('deve detectar duplicatas com StandardDeduplicator', async () => {
      const sourceWorkflows = [
        { id: 'wf-1', name: 'Customer Sync', tags: ['integration', 'crm'], nodes: [] }
      ];

      const targetWorkflows = [
        { id: 'existing-1', name: 'Customer Sync', tags: ['crm', 'integration'], nodes: [] }
      ];

      mockSourceClient.getWorkflows.mockResolvedValue(sourceWorkflows);
      mockTargetClient.getWorkflows.mockResolvedValue(targetWorkflows);

      const mockDeduplicator = {
        getName: () => 'standard-deduplicator',
        isEnabled: () => true,
        isDuplicate: jest.fn((workflow, existing) => {
          // Simple deduplication logic: name + tags
          return existing.some(e =>
            e.name === workflow.name &&
            JSON.stringify(e.tags?.sort()) === JSON.stringify(workflow.tags?.sort())
          );
        }),
        getReason: jest.fn().mockReturnValue('Duplicate: same name and tags')
      };

      mockPluginRegistry.get.mockReturnValue(mockDeduplicator);

      manager = new TransferManager(mockConfig, {
        logger: mockLogger,
        pluginRegistry: mockPluginRegistry
      });
      manager.sourceClient = mockSourceClient;
      manager.targetClient = mockTargetClient;

      const result = await manager.transfer({
        filters: {},
        dryRun: false,
        deduplicator: 'standard-deduplicator',
        validators: [],
        reporters: []
      });

      expect(result.skipped).toBe(1);
      expect(result.transferred).toBe(0);
      expect(mockDeduplicator.isDuplicate).toHaveBeenCalledWith(
        sourceWorkflows[0],
        targetWorkflows
      );
    });

    it('deve transferir workflows únicos', async () => {
      const sourceWorkflows = [
        { id: 'wf-1', name: 'Unique Workflow', tags: ['test'], nodes: [] }
      ];

      const targetWorkflows = [
        { id: 'existing-1', name: 'Different Workflow', tags: ['prod'], nodes: [] }
      ];

      mockSourceClient.getWorkflows.mockResolvedValue(sourceWorkflows);
      mockTargetClient.getWorkflows.mockResolvedValue(targetWorkflows);
      mockTargetClient.createWorkflow.mockResolvedValue({ id: 'new-1' });

      const mockDeduplicator = {
        getName: () => 'standard-deduplicator',
        isEnabled: () => true,
        isDuplicate: jest.fn().mockReturnValue(false)
      };

      mockPluginRegistry.get.mockReturnValue(mockDeduplicator);

      manager = new TransferManager(mockConfig, {
        logger: mockLogger,
        pluginRegistry: mockPluginRegistry
      });
      manager.sourceClient = mockSourceClient;
      manager.targetClient = mockTargetClient;

      const result = await manager.transfer({
        filters: {},
        dryRun: false,
        deduplicator: 'standard-deduplicator',
        validators: [],
        reporters: []
      });

      expect(result.transferred).toBe(1);
      expect(result.skipped).toBe(0);
      expect(mockTargetClient.createWorkflow).toHaveBeenCalled();
    });
  });

  // ==================== Validação de Integridade ====================
  describe('Validação de Integridade', () => {
    it('deve executar IntegrityValidator e detectar issues', async () => {
      const sourceWorkflows = [
        { id: 'wf-1', name: 'Broken Workflow', nodes: null } // Missing nodes
      ];

      mockSourceClient.getWorkflows.mockResolvedValue(sourceWorkflows);
      mockTargetClient.getWorkflows.mockResolvedValue([]);

      const mockDeduplicator = {
        getName: () => 'standard-deduplicator',
        isEnabled: () => true,
        isDuplicate: jest.fn().mockReturnValue(false)
      };

      const mockValidator = {
        getName: () => 'integrity-validator',
        isEnabled: () => true,
        validate: jest.fn((workflow) => {
          if (!workflow.nodes) {
            return {
              valid: false,
              errors: ['Workflow.nodes is required and must be an array']
            };
          }
          return { valid: true, errors: [] };
        })
      };

      mockPluginRegistry.get.mockImplementation((name, type) => {
        if (type === 'deduplicator') return mockDeduplicator;
        if (type === 'validator') return mockValidator;
        return null;
      });

      manager = new TransferManager(mockConfig, {
        logger: mockLogger,
        pluginRegistry: mockPluginRegistry
      });
      manager.sourceClient = mockSourceClient;
      manager.targetClient = mockTargetClient;

      const result = await manager.transfer({
        filters: {},
        dryRun: false,
        deduplicator: 'standard-deduplicator',
        validators: ['integrity-validator'],
        reporters: []
      });

      expect(result.skipped).toBe(1);
      expect(result.workflows[0].reason).toContain('Validation failed');
      expect(mockValidator.validate).toHaveBeenCalled();
      expect(mockTargetClient.createWorkflow).not.toHaveBeenCalled();
    });

    it('deve skipar workflows inválidos e transferir válidos', async () => {
      const sourceWorkflows = [
        { id: 'wf-1', name: 'Valid', nodes: [{ id: 'n1' }] },
        { id: 'wf-2', name: 'Invalid', nodes: null },
        { id: 'wf-3', name: 'Also Valid', nodes: [{ id: 'n1' }] }
      ];

      mockSourceClient.getWorkflows.mockResolvedValue(sourceWorkflows);
      mockTargetClient.getWorkflows.mockResolvedValue([]);
      mockTargetClient.createWorkflow.mockResolvedValue({ id: 'new-id' });

      const mockDeduplicator = {
        getName: () => 'standard-deduplicator',
        isEnabled: () => true,
        isDuplicate: jest.fn().mockReturnValue(false)
      };

      const mockValidator = {
        getName: () => 'integrity-validator',
        isEnabled: () => true,
        validate: jest.fn((workflow) => {
          if (!workflow.nodes) {
            return { valid: false, errors: ['Missing nodes'] };
          }
          return { valid: true, errors: [] };
        })
      };

      mockPluginRegistry.get.mockImplementation((name, type) => {
        if (type === 'deduplicator') return mockDeduplicator;
        if (type === 'validator') return mockValidator;
        return null;
      });

      manager = new TransferManager(mockConfig, {
        logger: mockLogger,
        pluginRegistry: mockPluginRegistry
      });
      manager.sourceClient = mockSourceClient;
      manager.targetClient = mockTargetClient;

      const result = await manager.transfer({
        filters: {},
        dryRun: false,
        parallelism: 1,
        deduplicator: 'standard-deduplicator',
        validators: ['integrity-validator'],
        reporters: []
      });

      expect(result.total).toBe(3);
      expect(result.transferred).toBe(2);
      expect(result.skipped).toBe(1);
      expect(mockTargetClient.createWorkflow).toHaveBeenCalledTimes(2);
    });
  });
});
