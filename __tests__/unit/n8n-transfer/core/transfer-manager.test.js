/**
 * @fileoverview Testes unitários para TransferManager
 * @module tests/unit/core/transfer-manager.test
 *
 * Suite completa de testes unitários cobrindo:
 * - Constructor e inicialização
 * - Métodos públicos (getProgress, cancel, registerPlugin)
 * - Método transfer() - cenários completos
 * - Método validate() - validação standalone
 * - Método generateReports() - geração de relatórios
 * - Tratamento de erros e edge cases
 *
 * Target: >80% code coverage
 */

// Mock all dependencies before requiring
jest.mock('../../../../scripts/admin/n8n-transfer/core/logger', () => {
  return jest.fn().mockImplementation(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setLevel: jest.fn()
  }));
});

jest.mock('../../../../scripts/admin/n8n-transfer/core/config-loader');
jest.mock('../../../../scripts/admin/n8n-transfer/core/http-client');
jest.mock('../../../../scripts/admin/n8n-transfer/core/plugin-registry');

const TransferManager = require('../../../../scripts/admin/n8n-transfer/core/transfer-manager');
const ConfigLoader = require('../../../../scripts/admin/n8n-transfer/core/config-loader');
const HttpClient = require('../../../../scripts/admin/n8n-transfer/core/http-client');
const PluginRegistry = require('../../../../scripts/admin/n8n-transfer/core/plugin-registry');
const Logger = require('../../../../scripts/admin/n8n-transfer/core/logger');

describe('TransferManager', () => {
  let manager;
  let mockConfig;
  let mockSourceClient;
  let mockTargetClient;
  let mockPluginRegistry;
  let mockLogger;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock logger instance
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      setLevel: jest.fn()
    };
    Logger.mockReturnValue(mockLogger);

    // Mock HttpClient
    mockSourceClient = {
      testConnection: jest.fn().mockResolvedValue({ success: true }),
      getWorkflows: jest.fn().mockResolvedValue([]),
      createWorkflow: jest.fn().mockResolvedValue({ id: 'new-id' }),
      getStats: jest.fn().mockReturnValue({})
    };

    mockTargetClient = {
      testConnection: jest.fn().mockResolvedValue({ success: true }),
      getWorkflows: jest.fn().mockResolvedValue([]),
      createWorkflow: jest.fn().mockResolvedValue({ id: 'new-id' }),
      getStats: jest.fn().mockReturnValue({})
    };

    HttpClient.mockImplementation((config) => {
      return config.baseUrl.includes('source') ? mockSourceClient : mockTargetClient;
    });

    // Mock PluginRegistry
    mockPluginRegistry = {
      get: jest.fn(),
      register: jest.fn(),
      getAll: jest.fn().mockReturnValue([])
    };
    PluginRegistry.mockReturnValue(mockPluginRegistry);

    // Mock ConfigLoader
    mockConfig = {
      SOURCE: { url: 'https://source.n8n.com', apiKey: 'source-key' },
      TARGET: { url: 'https://target.n8n.com', apiKey: 'target-key' }
    };
    ConfigLoader.load = jest.fn().mockReturnValue(mockConfig);
  });

  // ==================== Constructor Tests ====================
  describe('constructor()', () => {
    it('deve criar instância com config object', () => {
      const manager = new TransferManager(mockConfig);

      expect(manager).toBeInstanceOf(TransferManager);
      expect(manager.config).toEqual(mockConfig);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('TransferManager initialized successfully'),
        expect.any(Object)
      );
    });

    it('deve criar instância com path .env', () => {
      const manager = new TransferManager('.env');

      expect(ConfigLoader.load).toHaveBeenCalledWith('.env');
      expect(manager.config).toEqual(mockConfig);
    });

    it('deve lançar erro se config não fornecido', () => {
      expect(() => new TransferManager()).toThrow(
        'TransferManager requires config parameter'
      );
    });

    it('deve lançar erro se config não é string nem object', () => {
      expect(() => new TransferManager(123)).toThrow(
        'Config must be a string (file path) or object'
      );
    });

    it('deve lançar erro se SOURCE não definido', () => {
      const invalidConfig = { TARGET: mockConfig.TARGET };
      expect(() => new TransferManager(invalidConfig)).toThrow(
        'Configuration missing SOURCE server definition'
      );
    });

    it('deve lançar erro se SOURCE.url não definido', () => {
      const invalidConfig = {
        SOURCE: { apiKey: 'key' },
        TARGET: mockConfig.TARGET
      };
      expect(() => new TransferManager(invalidConfig)).toThrow(
        'SOURCE.url is required'
      );
    });

    it('deve lançar erro se SOURCE.apiKey não definido', () => {
      const invalidConfig = {
        SOURCE: { url: 'https://source.com' },
        TARGET: mockConfig.TARGET
      };
      expect(() => new TransferManager(invalidConfig)).toThrow(
        'SOURCE.apiKey is required'
      );
    });

    it('deve lançar erro se TARGET não definido', () => {
      const invalidConfig = { SOURCE: mockConfig.SOURCE };
      expect(() => new TransferManager(invalidConfig)).toThrow(
        'Configuration missing TARGET server definition'
      );
    });

    it('deve lançar erro se TARGET.url não definido', () => {
      const invalidConfig = {
        SOURCE: mockConfig.SOURCE,
        TARGET: { apiKey: 'key' }
      };
      expect(() => new TransferManager(invalidConfig)).toThrow(
        'TARGET.url is required'
      );
    });

    it('deve lançar erro se TARGET.apiKey não definido', () => {
      const invalidConfig = {
        SOURCE: mockConfig.SOURCE,
        TARGET: { url: 'https://target.com' }
      };
      expect(() => new TransferManager(invalidConfig)).toThrow(
        'TARGET.apiKey is required'
      );
    });

    it('deve avisar se SOURCE e TARGET são iguais', () => {
      const sameConfig = {
        SOURCE: { url: 'https://same.com', apiKey: 'key1' },
        TARGET: { url: 'https://same.com', apiKey: 'key2' }
      };

      new TransferManager(sameConfig);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('SOURCE and TARGET URLs are identical')
      );
    });

    it('deve inicializar HttpClients para SOURCE e TARGET', () => {
      const manager = new TransferManager(mockConfig);

      expect(HttpClient).toHaveBeenCalledTimes(2);
      expect(manager.sourceClient).toBeDefined();
      expect(manager.targetClient).toBeDefined();
    });

    it('deve usar logger injetado se fornecido', () => {
      const customLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      };

      const manager = new TransferManager(mockConfig, { logger: customLogger });
      expect(manager.logger).toBe(customLogger);
    });

    it('deve usar PluginRegistry injetado se fornecido', () => {
      const customRegistry = {
        get: jest.fn(),
        getAll: jest.fn().mockReturnValue([])
      };

      const manager = new TransferManager(mockConfig, { pluginRegistry: customRegistry });
      expect(manager.pluginRegistry).toBe(customRegistry);
    });

    it('deve inicializar state correto', () => {
      const manager = new TransferManager(mockConfig);
      const progress = manager.getProgress();

      expect(progress).toEqual({
        total: 0,
        processed: 0,
        transferred: 0,
        skipped: 0,
        failed: 0,
        percentage: 0,
        status: 'idle'
      });
    });
  });

  // ==================== getProgress() Tests ====================
  describe('getProgress()', () => {
    it('deve retornar progress correto', () => {
      const manager = new TransferManager(mockConfig);
      const progress = manager.getProgress();

      expect(progress).toHaveProperty('total');
      expect(progress).toHaveProperty('processed');
      expect(progress).toHaveProperty('transferred');
      expect(progress).toHaveProperty('skipped');
      expect(progress).toHaveProperty('failed');
      expect(progress).toHaveProperty('percentage');
      expect(progress).toHaveProperty('status');
    });

    it('deve calcular percentual corretamente', () => {
      const manager = new TransferManager(mockConfig);

      // Simular progresso interno
      manager._progress.total = 10;
      manager._progress.processed = 5;
      manager._updateProgress();

      const progress = manager.getProgress();
      expect(progress.percentage).toBe(50);
    });

    it('deve retornar cópia do progress (não referência)', () => {
      const manager = new TransferManager(mockConfig);
      const progress1 = manager.getProgress();
      progress1.total = 999;

      const progress2 = manager.getProgress();
      expect(progress2.total).toBe(0);
    });
  });

  // ==================== cancel() Tests ====================
  describe('cancel()', () => {
    it('deve retornar false quando idle', () => {
      const manager = new TransferManager(mockConfig);
      const result = manager.cancel();

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No transfer in progress')
      );
    });

    it('deve retornar true quando running', () => {
      const manager = new TransferManager(mockConfig);
      manager._progress.status = 'running';

      const result = manager.cancel();

      expect(result).toBe(true);
      expect(manager._cancelRequested).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Transfer cancellation requested')
      );
    });

    it('deve setar flag _cancelRequested', () => {
      const manager = new TransferManager(mockConfig);
      manager._progress.status = 'running';

      expect(manager._cancelRequested).toBe(false);
      manager.cancel();
      expect(manager._cancelRequested).toBe(true);
    });
  });

  // ==================== registerPlugin() Tests ====================
  describe('registerPlugin()', () => {
    it('deve registrar plugin via PluginRegistry', () => {
      const manager = new TransferManager(mockConfig);
      const mockPlugin = {
        name: 'custom-plugin',
        type: 'validator'
      };

      manager.registerPlugin(mockPlugin);

      expect(mockPluginRegistry.register).toHaveBeenCalledWith(mockPlugin);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Plugin registered')
      );
    });

    it('deve lançar erro se registro falhar', () => {
      const manager = new TransferManager(mockConfig);
      const mockPlugin = { name: 'invalid' };
      mockPluginRegistry.register.mockImplementation(() => {
        throw new Error('Invalid plugin');
      });

      expect(() => manager.registerPlugin(mockPlugin)).toThrow('Invalid plugin');
    });
  });

  // ==================== transfer() - Cenários Completos ====================
  describe('transfer()', () => {
    let manager;
    let mockDeduplicator;
    let mockValidator;
    let mockReporter;

    beforeEach(() => {
      manager = new TransferManager(mockConfig);

      // Mock deduplicator
      mockDeduplicator = {
        getName: () => 'standard-deduplicator',
        isEnabled: () => true,
        enable: jest.fn(),
        isDuplicate: jest.fn().mockReturnValue(false),
        getReason: jest.fn().mockReturnValue('No duplicate')
      };

      // Mock validator
      mockValidator = {
        getName: () => 'integrity-validator',
        isEnabled: () => true,
        enable: jest.fn(),
        validate: jest.fn().mockReturnValue({ valid: true, errors: [] })
      };

      // Mock reporter
      mockReporter = {
        getName: () => 'markdown-reporter',
        isEnabled: () => true,
        enable: jest.fn(),
        generate: jest.fn().mockReturnValue('/reports/transfer-report.md')
      };

      // Configure plugin registry mock
      mockPluginRegistry.get.mockImplementation((name, type) => {
        if (type === 'deduplicator') return mockDeduplicator;
        if (type === 'validator') return mockValidator;
        if (type === 'reporter') return mockReporter;
        return null;
      });
    });

    it('deve transferir workflows com sucesso', async () => {
      const sourceWorkflows = [
        { id: '1', name: 'Workflow 1', nodes: [], connections: {} }
      ];

      mockSourceClient.getWorkflows.mockResolvedValue(sourceWorkflows);
      mockTargetClient.getWorkflows.mockResolvedValue([]);
      mockTargetClient.createWorkflow.mockResolvedValue({ id: 'new-1' });

      const result = await manager.transfer({
        filters: {},
        dryRun: false,
        deduplicator: 'standard-deduplicator',
        validators: ['integrity-validator'],
        reporters: ['markdown-reporter']
      });

      expect(result.total).toBe(1);
      expect(result.transferred).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.failed).toBe(0);
      expect(mockTargetClient.createWorkflow).toHaveBeenCalledTimes(1);
    });

    it('deve funcionar em dry-run mode', async () => {
      const sourceWorkflows = [
        { id: '1', name: 'Workflow 1', nodes: [] }
      ];

      mockSourceClient.getWorkflows.mockResolvedValue(sourceWorkflows);
      mockTargetClient.getWorkflows.mockResolvedValue([]);

      const result = await manager.transfer({
        dryRun: true,
        deduplicator: 'standard-deduplicator',
        validators: [],
        reporters: []
      });

      expect(result.dryRun).toBe(true);
      expect(result.transferred).toBe(1);
      expect(mockTargetClient.createWorkflow).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('DRY-RUN MODE COMPLETED')
      );
    });

    it('deve aplicar filtros corretamente', async () => {
      const sourceWorkflows = [
        { id: '1', name: 'Workflow 1', tags: ['prod'], nodes: [] },
        { id: '2', name: 'Workflow 2', tags: ['dev'], nodes: [] },
        { id: '3', name: 'Workflow 3', tags: ['prod'], nodes: [] }
      ];

      mockSourceClient.getWorkflows.mockResolvedValue(sourceWorkflows);
      mockTargetClient.getWorkflows.mockResolvedValue([]);

      const result = await manager.transfer({
        filters: { tags: ['prod'] },
        dryRun: true,
        deduplicator: 'standard-deduplicator',
        validators: [],
        reporters: []
      });

      expect(result.total).toBe(2); // Apenas workflows com tag 'prod'
    });

    it('deve executar deduplicação corretamente', async () => {
      const sourceWorkflows = [
        { id: '1', name: 'Workflow 1', tags: ['test'], nodes: [] }
      ];

      mockSourceClient.getWorkflows.mockResolvedValue(sourceWorkflows);
      mockTargetClient.getWorkflows.mockResolvedValue([]);
      mockDeduplicator.isDuplicate.mockReturnValue(true);
      mockDeduplicator.getReason.mockReturnValue('Duplicate found');

      const result = await manager.transfer({
        dryRun: false,
        deduplicator: 'standard-deduplicator',
        validators: [],
        reporters: []
      });

      expect(result.skipped).toBe(1);
      expect(result.transferred).toBe(0);
    });

    it('deve skipar workflow se validação falhar', async () => {
      const sourceWorkflows = [
        { id: '1', name: 'Invalid Workflow', nodes: [] }
      ];

      mockSourceClient.getWorkflows.mockResolvedValue(sourceWorkflows);
      mockTargetClient.getWorkflows.mockResolvedValue([]);
      mockValidator.validate.mockReturnValue({
        valid: false,
        errors: ['Missing required field']
      });

      const result = await manager.transfer({
        dryRun: false,
        deduplicator: 'standard-deduplicator',
        validators: ['integrity-validator'],
        reporters: []
      });

      expect(result.skipped).toBe(1);
      expect(result.transferred).toBe(0);
    });

    it('deve skipar workflows com credenciais quando skipCredentials=true', async () => {
      const sourceWorkflows = [
        {
          id: '1',
          name: 'Workflow with Creds',
          nodes: [
            { id: 'node1', credentials: { api: 'cred-1' } }
          ]
        }
      ];

      mockSourceClient.getWorkflows.mockResolvedValue(sourceWorkflows);
      mockTargetClient.getWorkflows.mockResolvedValue([]);

      const result = await manager.transfer({
        skipCredentials: true,
        dryRun: false,
        deduplicator: 'standard-deduplicator',
        validators: [],
        reporters: []
      });

      expect(result.skipped).toBe(1);
      expect(result.workflows[0].reason).toContain('credentials');
    });

    it('deve transferir workflows com credenciais quando skipCredentials=false', async () => {
      const sourceWorkflows = [
        {
          id: '1',
          name: 'Workflow with Creds',
          nodes: [
            { id: 'node1', credentials: { api: 'cred-1' } }
          ]
        }
      ];

      mockSourceClient.getWorkflows.mockResolvedValue(sourceWorkflows);
      mockTargetClient.getWorkflows.mockResolvedValue([]);
      mockTargetClient.createWorkflow.mockResolvedValue({ id: 'new-1' });

      const result = await manager.transfer({
        skipCredentials: false,
        dryRun: false,
        deduplicator: 'standard-deduplicator',
        validators: [],
        reporters: []
      });

      expect(result.transferred).toBe(1);
      expect(result.skipped).toBe(0);
    });

    it('deve implementar cancelamento graceful', async () => {
      const sourceWorkflows = [
        { id: '1', name: 'Workflow 1', nodes: [] },
        { id: '2', name: 'Workflow 2', nodes: [] },
        { id: '3', name: 'Workflow 3', nodes: [] }
      ];

      mockSourceClient.getWorkflows.mockResolvedValue(sourceWorkflows);
      mockTargetClient.getWorkflows.mockResolvedValue([]);

      // Simular cancelamento após primeiro workflow
      mockTargetClient.createWorkflow.mockImplementation(async () => {
        manager._cancelRequested = true;
        return { id: 'new-id' };
      });

      const result = await manager.transfer({
        dryRun: false,
        parallelism: 1,
        deduplicator: 'standard-deduplicator',
        validators: [],
        reporters: []
      });

      expect(result.cancelled).toBe(true);
      expect(result.transferred).toBeLessThan(3);
    });

    it('deve continuar processando se houver erro de API', async () => {
      const sourceWorkflows = [
        { id: '1', name: 'Workflow 1', nodes: [] },
        { id: '2', name: 'Workflow 2', nodes: [] }
      ];

      mockSourceClient.getWorkflows.mockResolvedValue(sourceWorkflows);
      mockTargetClient.getWorkflows.mockResolvedValue([]);
      mockTargetClient.createWorkflow
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({ id: 'new-2' });

      const result = await manager.transfer({
        dryRun: false,
        parallelism: 1,
        deduplicator: 'standard-deduplicator',
        validators: [],
        reporters: []
      });

      expect(result.failed).toBe(1);
      expect(result.transferred).toBe(1);
    });

    it('deve retornar vazio se nenhum workflow corresponder aos filtros', async () => {
      const sourceWorkflows = [
        { id: '1', name: 'Workflow 1', tags: ['dev'], nodes: [] }
      ];

      mockSourceClient.getWorkflows.mockResolvedValue(sourceWorkflows);
      mockTargetClient.getWorkflows.mockResolvedValue([]);

      const result = await manager.transfer({
        filters: { tags: ['production'] },
        dryRun: false,
        deduplicator: 'standard-deduplicator',
        validators: [],
        reporters: []
      });

      expect(result.total).toBe(0);
      expect(result.transferred).toBe(0);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No workflows found matching filters')
      );
    });

    it('deve processar workflows em paralelo quando parallelism > 1', async () => {
      const sourceWorkflows = [
        { id: '1', name: 'Workflow 1', nodes: [] },
        { id: '2', name: 'Workflow 2', nodes: [] },
        { id: '3', name: 'Workflow 3', nodes: [] }
      ];

      mockSourceClient.getWorkflows.mockResolvedValue(sourceWorkflows);
      mockTargetClient.getWorkflows.mockResolvedValue([]);
      mockTargetClient.createWorkflow.mockResolvedValue({ id: 'new-id' });

      const result = await manager.transfer({
        parallelism: 3,
        dryRun: false,
        deduplicator: 'standard-deduplicator',
        validators: [],
        reporters: []
      });

      expect(result.transferred).toBe(3);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('parallelism: 3')
      );
    });

    it('deve gerar relatórios quando reporters configurados', async () => {
      const sourceWorkflows = [
        { id: '1', name: 'Workflow 1', nodes: [] }
      ];

      mockSourceClient.getWorkflows.mockResolvedValue(sourceWorkflows);
      mockTargetClient.getWorkflows.mockResolvedValue([]);
      mockTargetClient.createWorkflow.mockResolvedValue({ id: 'new-1' });

      const result = await manager.transfer({
        dryRun: false,
        deduplicator: 'standard-deduplicator',
        validators: [],
        reporters: ['markdown-reporter']
      });

      expect(mockReporter.generate).toHaveBeenCalled();
      expect(result.reports).toBeDefined();
      expect(result.reports.length).toBe(1);
      expect(result.reports[0].path).toContain('transfer-report.md');
    });

    it('deve lançar erro se SOURCE não disponível', async () => {
      mockSourceClient.testConnection.mockResolvedValue({
        success: false,
        error: 'Connection refused'
      });

      await expect(manager.transfer({
        deduplicator: 'standard-deduplicator',
        validators: [],
        reporters: []
      })).rejects.toThrow('SOURCE connection failed');
    });

    it('deve lançar erro se TARGET não disponível', async () => {
      mockTargetClient.testConnection.mockResolvedValue({
        success: false,
        error: 'Connection refused'
      });

      await expect(manager.transfer({
        deduplicator: 'standard-deduplicator',
        validators: [],
        reporters: []
      })).rejects.toThrow('TARGET connection failed');
    });

    it('deve lançar erro se deduplicator não encontrado', async () => {
      mockPluginRegistry.get.mockReturnValue(null);

      await expect(manager.transfer({
        deduplicator: 'non-existent-deduplicator',
        validators: [],
        reporters: []
      })).rejects.toThrow('Deduplicator plugin not found');
    });

    it('deve continuar se validator não encontrado', async () => {
      mockPluginRegistry.get.mockImplementation((name, type) => {
        if (type === 'deduplicator') return mockDeduplicator;
        if (type === 'validator') return null;
        return null;
      });

      const sourceWorkflows = [
        { id: '1', name: 'Workflow 1', nodes: [] }
      ];

      mockSourceClient.getWorkflows.mockResolvedValue(sourceWorkflows);
      mockTargetClient.getWorkflows.mockResolvedValue([]);

      const result = await manager.transfer({
        dryRun: true,
        deduplicator: 'standard-deduplicator',
        validators: ['non-existent-validator'],
        reporters: []
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Validator plugin not found')
      );
      expect(result.transferred).toBe(1);
    });
  });

  // ==================== validate() Tests ====================
  describe('validate()', () => {
    let manager;
    let mockValidator;

    beforeEach(() => {
      manager = new TransferManager(mockConfig);

      mockValidator = {
        getName: () => 'integrity-validator',
        isEnabled: () => true,
        enable: jest.fn(),
        validate: jest.fn().mockReturnValue({ valid: true, errors: [] })
      };

      mockPluginRegistry.get.mockImplementation((name, type) => {
        if (type === 'validator') return mockValidator;
        return null;
      });
    });

    it('deve executar validação standalone', async () => {
      const sourceWorkflows = [
        { id: '1', name: 'Workflow 1', nodes: [] }
      ];

      mockSourceClient.getWorkflows.mockResolvedValue(sourceWorkflows);

      const result = await manager.validate({
        validators: ['integrity-validator']
      });

      expect(result.total).toBe(1);
      expect(result.valid).toBe(1);
      expect(result.invalid).toBe(0);
      expect(mockValidator.validate).toHaveBeenCalled();
    });

    it('deve aplicar filtros na validação', async () => {
      const sourceWorkflows = [
        { id: '1', name: 'Workflow 1', tags: ['prod'], nodes: [] },
        { id: '2', name: 'Workflow 2', tags: ['dev'], nodes: [] }
      ];

      mockSourceClient.getWorkflows.mockResolvedValue(sourceWorkflows);

      const result = await manager.validate({
        filters: { tags: ['prod'] },
        validators: ['integrity-validator']
      });

      expect(result.total).toBe(1);
    });

    it('deve usar múltiplos validators', async () => {
      const mockValidator2 = {
        getName: () => 'schema-validator',
        isEnabled: () => true,
        enable: jest.fn(),
        validate: jest.fn().mockReturnValue({ valid: true, errors: [] })
      };

      mockPluginRegistry.get.mockImplementation((name, type) => {
        if (type === 'validator' && name === 'integrity-validator') return mockValidator;
        if (type === 'validator' && name === 'schema-validator') return mockValidator2;
        return null;
      });

      const sourceWorkflows = [
        { id: '1', name: 'Workflow 1', nodes: [] }
      ];

      mockSourceClient.getWorkflows.mockResolvedValue(sourceWorkflows);

      const result = await manager.validate({
        validators: ['integrity-validator', 'schema-validator']
      });

      expect(mockValidator.validate).toHaveBeenCalled();
      expect(mockValidator2.validate).toHaveBeenCalled();
      expect(result.validators).toContain('integrity-validator');
      expect(result.validators).toContain('schema-validator');
    });

    it('deve contar errors e warnings corretamente', async () => {
      mockValidator.validate.mockReturnValue({
        valid: false,
        errors: ['Error 1', 'Error 2'],
        warnings: ['Warning 1']
      });

      const sourceWorkflows = [
        { id: '1', name: 'Workflow 1', nodes: [] }
      ];

      mockSourceClient.getWorkflows.mockResolvedValue(sourceWorkflows);

      const result = await manager.validate({
        validators: ['integrity-validator']
      });

      expect(result.errors).toBe(2);
      expect(result.warnings).toBe(1);
      expect(result.invalid).toBe(1);
    });

    it('não deve chamar TARGET na validação', async () => {
      const sourceWorkflows = [
        { id: '1', name: 'Workflow 1', nodes: [] }
      ];

      mockSourceClient.getWorkflows.mockResolvedValue(sourceWorkflows);

      await manager.validate({
        validators: ['integrity-validator']
      });

      expect(mockTargetClient.getWorkflows).not.toHaveBeenCalled();
    });

    it('deve lançar erro se nenhum validator carregado', async () => {
      mockPluginRegistry.get.mockReturnValue(null);

      await expect(manager.validate({
        validators: ['non-existent']
      })).rejects.toThrow('No validators loaded');
    });
  });

  // ==================== generateReports() Tests ====================
  describe('generateReports()', () => {
    let manager;
    let mockReporter1;
    let mockReporter2;

    beforeEach(() => {
      manager = new TransferManager(mockConfig);

      mockReporter1 = {
        getName: () => 'markdown-reporter',
        generate: jest.fn().mockReturnValue('/reports/report.md')
      };

      mockReporter2 = {
        getName: () => 'json-reporter',
        generate: jest.fn().mockReturnValue('/reports/report.json')
      };
    });

    it('deve gerar relatórios com múltiplos reporters', async () => {
      const summary = {
        total: 5,
        transferred: 4,
        skipped: 1,
        failed: 0
      };

      const reporters = [mockReporter1, mockReporter2];

      const result = await manager.generateReports(summary, reporters);

      expect(result.length).toBe(2);
      expect(result[0].reporter).toBe('markdown-reporter');
      expect(result[0].path).toBe('/reports/report.md');
      expect(result[1].reporter).toBe('json-reporter');
      expect(result[1].path).toBe('/reports/report.json');
    });

    it('deve continuar se um reporter falhar', async () => {
      mockReporter1.generate.mockImplementation(() => {
        throw new Error('Reporter error');
      });

      const summary = { total: 1 };
      const reporters = [mockReporter1, mockReporter2];

      const result = await manager.generateReports(summary, reporters);

      expect(result.length).toBe(1);
      expect(result[0].reporter).toBe('json-reporter');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to generate report'),
        expect.any(Object)
      );
    });

    it('deve retornar array vazio se nenhum reporter configurado', async () => {
      const summary = { total: 1 };

      const result = await manager.generateReports(summary, []);

      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No reporters configured')
      );
    });

    it('deve incluir formato do relatório', async () => {
      const summary = { total: 1 };
      const reporters = [mockReporter1];

      const result = await manager.generateReports(summary, reporters);

      expect(result[0].format).toBe('markdown');
    });
  });

  // ==================== Edge Cases & Integration ====================
  describe('Edge Cases', () => {
    it('deve lidar com workflows sem nodes', async () => {
      const manager = new TransferManager(mockConfig);
      const workflow = { id: '1', name: 'Empty', nodes: null };

      const hasCredentials = manager._hasCredentials(workflow);
      expect(hasCredentials).toBe(false);
    });

    it('deve lidar com nodes sem credentials', async () => {
      const manager = new TransferManager(mockConfig);
      const workflow = {
        id: '1',
        name: 'Test',
        nodes: [{ id: 'node1', type: 'webhook' }]
      };

      const hasCredentials = manager._hasCredentials(workflow);
      expect(hasCredentials).toBe(false);
    });

    it('deve detectar credenciais em nodes', async () => {
      const manager = new TransferManager(mockConfig);
      const workflow = {
        id: '1',
        name: 'Test',
        nodes: [
          { id: 'node1', credentials: {} },
          { id: 'node2', credentials: { api: 'cred-1' } }
        ]
      };

      const hasCredentials = manager._hasCredentials(workflow);
      expect(hasCredentials).toBe(true);
    });

    it('deve mascarar URL corretamente', async () => {
      const manager = new TransferManager(mockConfig);
      const masked = manager._maskUrl('https://user:pass@example.com/path?key=secret');

      expect(masked).toBe('https://example.com/path');
      expect(masked).not.toContain('user');
      expect(masked).not.toContain('pass');
      expect(masked).not.toContain('secret');
    });

    it('deve retornar URL original se parsing falhar', async () => {
      const manager = new TransferManager(mockConfig);
      const invalid = 'not-a-url';
      const masked = manager._maskUrl(invalid);

      expect(masked).toBe(invalid);
    });
  });

  // ==================== Getter Methods ====================
  describe('Getter Methods', () => {
    it('getPluginRegistry() deve retornar PluginRegistry', () => {
      const manager = new TransferManager(mockConfig);
      const registry = manager.getPluginRegistry();

      expect(registry).toBe(mockPluginRegistry);
    });

    it('getLogger() deve retornar Logger', () => {
      const manager = new TransferManager(mockConfig);
      const logger = manager.getLogger();

      expect(logger).toBe(mockLogger);
    });
  });
});
