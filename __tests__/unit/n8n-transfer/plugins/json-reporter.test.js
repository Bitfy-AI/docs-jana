/**
 * @fileoverview Testes unitários para JSONReporter Plugin
 * @module tests/unit/plugins/json-reporter.test
 */

// Criar mock completo de fs com promises ANTES de qualquer require
const mockFsPromises = {
  mkdir: jest.fn(),
  writeFile: jest.fn(),
  readFile: jest.fn()
};

jest.mock('fs', () => ({
  promises: mockFsPromises
}));

// Agora sim importar os módulos
const JSONReporter = require('../../../../scripts/admin/n8n-transfer/plugins/reporters/json-reporter');
const fs = require('fs').promises;

describe('JSONReporter', () => {
  let reporter;

  beforeEach(() => {
    reporter = new JSONReporter();
    jest.clearAllMocks();

    // Mock console.log para evitar poluição de output durante testes
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
    console.error.mockRestore();
  });

  describe('constructor()', () => {
    it('deve criar instância com configurações corretas', () => {
      expect(reporter.getName()).toBe('json-reporter');
      expect(reporter.getVersion()).toBe('1.0.0');
      expect(reporter.getType()).toBe('reporter');
    });

    it('deve ter outputDir padrão como "reports"', () => {
      expect(reporter.options.outputDir).toBe('reports');
    });

    it('deve ter autoSave padrão true', () => {
      expect(reporter.options.autoSave).toBe(true);
    });

    it('deve ter includeWorkflowDetails padrão true', () => {
      expect(reporter.options.includeWorkflowDetails).toBe(true);
    });

    it('deve ter prettyPrint padrão true', () => {
      expect(reporter.options.prettyPrint).toBe(true);
    });

    it('deve aceitar opções customizadas no construtor', () => {
      const customReporter = new JSONReporter({
        outputDir: 'custom-reports',
        autoSave: false,
        prettyPrint: false
      });

      expect(customReporter.options.outputDir).toBe('custom-reports');
      expect(customReporter.options.autoSave).toBe(false);
      expect(customReporter.options.prettyPrint).toBe(false);
    });
  });

  describe('generate() - validação de entrada', () => {
    it('deve lançar erro se transferResult for null', () => {
      expect(() => {
        reporter.generate(null);
      }).toThrow('transferResult é obrigatório');
    });

    it('deve lançar erro se transferResult for undefined', () => {
      expect(() => {
        reporter.generate(undefined);
      }).toThrow('transferResult é obrigatório');
    });

    it('deve lançar erro se faltar campo obrigatório "success"', () => {
      const transferResult = {
        totalWorkflows: 10,
        successCount: 8,
        failureCount: 2,
        duplicateCount: 0,
        startTime: new Date(),
        endTime: new Date()
      };

      expect(() => {
        reporter.generate(transferResult);
      }).toThrow('Campo obrigatório ausente');
      expect(() => {
        reporter.generate(transferResult);
      }).toThrow('success');
    });

    it('deve lançar erro se faltar campo obrigatório "totalWorkflows"', () => {
      const transferResult = {
        success: true,
        successCount: 8,
        failureCount: 2,
        duplicateCount: 0,
        startTime: new Date(),
        endTime: new Date()
      };

      expect(() => {
        reporter.generate(transferResult);
      }).toThrow('totalWorkflows');
    });

    it('deve aceitar transferResult válido', () => {
      const transferResult = {
        success: true,
        totalWorkflows: 10,
        successCount: 8,
        failureCount: 2,
        duplicateCount: 0,
        startTime: new Date(),
        endTime: new Date()
      };

      expect(() => {
        reporter.generate(transferResult);
      }).not.toThrow();
    });
  });

  describe('generate() - estrutura JSON', () => {
    it('deve gerar JSON válido', () => {
      const transferResult = {
        success: true,
        totalWorkflows: 10,
        successCount: 8,
        failureCount: 2,
        duplicateCount: 0,
        startTime: new Date('2025-01-03T10:00:00.000Z'),
        endTime: new Date('2025-01-03T10:05:00.000Z'),
        metadata: {
          source: 'https://source.n8n.io',
          target: 'https://target.n8n.io'
        }
      };

      const jsonOutput = reporter.generate(transferResult);
      const parsed = JSON.parse(jsonOutput);

      expect(parsed).toBeDefined();
      expect(parsed).toHaveProperty('metadata');
      expect(parsed).toHaveProperty('statistics');
      expect(parsed).toHaveProperty('workflows');
      expect(parsed).toHaveProperty('errors');
      expect(parsed).toHaveProperty('configuration');
      expect(parsed).toHaveProperty('reportGeneration');
    });

    it('deve incluir metadata completo', () => {
      const transferResult = {
        success: true,
        totalWorkflows: 10,
        successCount: 8,
        failureCount: 2,
        duplicateCount: 0,
        startTime: new Date('2025-01-03T10:00:00.000Z'),
        endTime: new Date('2025-01-03T10:05:00.000Z'),
        metadata: {
          source: 'https://source.n8n.io',
          target: 'https://target.n8n.io'
        }
      };

      const jsonOutput = reporter.generate(transferResult);
      const parsed = JSON.parse(jsonOutput);

      expect(parsed.metadata.source).toBe('https://source.n8n.io');
      expect(parsed.metadata.target).toBe('https://target.n8n.io');
      expect(parsed.metadata.transferStarted).toBe('2025-01-03T10:00:00.000Z');
      expect(parsed.metadata.transferEnded).toBe('2025-01-03T10:05:00.000Z');
      expect(parsed.metadata.duration).toBeDefined();
      expect(parsed.metadata.duration.milliseconds).toBe(300000);
      expect(parsed.metadata.duration.seconds).toBe(300);
    });

    it('deve incluir statistics completo', () => {
      const transferResult = {
        success: true,
        totalWorkflows: 100,
        successCount: 85,
        failureCount: 10,
        duplicateCount: 5,
        startTime: new Date(),
        endTime: new Date()
      };

      const jsonOutput = reporter.generate(transferResult);
      const parsed = JSON.parse(jsonOutput);

      expect(parsed.statistics.total).toBe(100);
      expect(parsed.statistics.transferred).toBe(85);
      expect(parsed.statistics.failed).toBe(10);
      expect(parsed.statistics.duplicates).toBe(5);
      expect(parsed.statistics.successRate).toBe('85.00%');
      expect(parsed.statistics.failureRate).toBe('10.00%');
    });

    it('deve calcular duration corretamente', () => {
      const transferResult = {
        success: true,
        totalWorkflows: 10,
        successCount: 10,
        failureCount: 0,
        duplicateCount: 0,
        startTime: new Date('2025-01-03T10:00:00.000Z'),
        endTime: new Date('2025-01-03T10:02:00.000Z') // 2 minutos
      };

      const jsonOutput = reporter.generate(transferResult);
      const parsed = JSON.parse(jsonOutput);

      expect(parsed.metadata.duration.milliseconds).toBe(120000);
      expect(parsed.metadata.duration.seconds).toBe(120);
      expect(parsed.metadata.duration.formatted).toBe('2m 0s');
    });
  });

  describe('_extractWorkflowDetails()', () => {
    it('deve extrair detalhes de workflows se includeWorkflowDetails for true', () => {
      const transferResult = {
        success: true,
        totalWorkflows: 2,
        successCount: 2,
        failureCount: 0,
        duplicateCount: 0,
        startTime: new Date(),
        endTime: new Date(),
        metadata: {
          workflows: [
            {
              id: '123',
              name: 'Workflow A',
              status: 'transferred',
              nodes: [{}, {}],
              tags: [{ name: 'production' }],
              active: true
            },
            {
              id: '456',
              name: 'Workflow B',
              status: 'completed',
              nodes: [{}],
              tags: [],
              active: false
            }
          ]
        }
      };

      const jsonOutput = reporter.generate(transferResult);
      const parsed = JSON.parse(jsonOutput);

      expect(parsed.workflows).toHaveLength(2);
      expect(parsed.workflows[0].id).toBe('123');
      expect(parsed.workflows[0].name).toBe('Workflow A');
      expect(parsed.workflows[0].nodes).toBe(2);
      expect(parsed.workflows[0].tags).toEqual(['production']);
      expect(parsed.workflows[0].transferred).toBe(true);
    });

    it('NÃO deve incluir detalhes de workflows se includeWorkflowDetails for false', () => {
      reporter.options.includeWorkflowDetails = false;

      const transferResult = {
        success: true,
        totalWorkflows: 2,
        successCount: 2,
        failureCount: 0,
        duplicateCount: 0,
        startTime: new Date(),
        endTime: new Date(),
        metadata: {
          workflows: [
            { id: '123', name: 'Workflow A', status: 'transferred' }
          ]
        }
      };

      const jsonOutput = reporter.generate(transferResult);
      const parsed = JSON.parse(jsonOutput);

      expect(parsed.workflows).toEqual([]);
    });

    it('deve retornar array vazio se metadata.workflows não existir', () => {
      const transferResult = {
        success: true,
        totalWorkflows: 0,
        successCount: 0,
        failureCount: 0,
        duplicateCount: 0,
        startTime: new Date(),
        endTime: new Date(),
        metadata: {}
      };

      const jsonOutput = reporter.generate(transferResult);
      const parsed = JSON.parse(jsonOutput);

      expect(parsed.workflows).toEqual([]);
    });
  });

  describe('_formatErrors()', () => {
    it('deve formatar erros corretamente', () => {
      const transferResult = {
        success: false,
        totalWorkflows: 10,
        successCount: 8,
        failureCount: 2,
        duplicateCount: 0,
        startTime: new Date(),
        endTime: new Date(),
        errors: [
          {
            workflowName: 'Failed Workflow',
            message: 'Network timeout',
            code: 'ETIMEDOUT',
            timestamp: '2025-01-03T10:00:00.000Z'
          }
        ]
      };

      const jsonOutput = reporter.generate(transferResult);
      const parsed = JSON.parse(jsonOutput);

      expect(parsed.errors).toHaveLength(1);
      expect(parsed.errors[0].workflow).toBe('Failed Workflow');
      expect(parsed.errors[0].message).toBe('Network timeout');
      expect(parsed.errors[0].code).toBe('ETIMEDOUT');
    });

    it('deve retornar array vazio se errors for null', () => {
      const transferResult = {
        success: true,
        totalWorkflows: 10,
        successCount: 10,
        failureCount: 0,
        duplicateCount: 0,
        startTime: new Date(),
        endTime: new Date(),
        errors: null
      };

      const jsonOutput = reporter.generate(transferResult);
      const parsed = JSON.parse(jsonOutput);

      expect(parsed.errors).toEqual([]);
    });

    it('deve usar valores padrão para campos ausentes', () => {
      const transferResult = {
        success: false,
        totalWorkflows: 10,
        successCount: 9,
        failureCount: 1,
        duplicateCount: 0,
        startTime: new Date(),
        endTime: new Date(),
        errors: [
          {} // Erro vazio
        ]
      };

      const jsonOutput = reporter.generate(transferResult);
      const parsed = JSON.parse(jsonOutput);

      expect(parsed.errors[0].workflow).toBe('unknown');
      expect(parsed.errors[0].message).toBe('Erro desconhecido');
      expect(parsed.errors[0].code).toBe('UNKNOWN_ERROR');
    });
  });

  describe('_calculateSuccessRate()', () => {
    it('deve calcular taxa de sucesso corretamente', () => {
      const transferResult = {
        success: true,
        totalWorkflows: 100,
        successCount: 85,
        failureCount: 15,
        duplicateCount: 0,
        startTime: new Date(),
        endTime: new Date()
      };

      const jsonOutput = reporter.generate(transferResult);
      const parsed = JSON.parse(jsonOutput);

      expect(parsed.statistics.successRate).toBe('85.00%');
      expect(parsed.statistics.failureRate).toBe('15.00%');
    });

    it('deve retornar 0.00% se total for 0', () => {
      const transferResult = {
        success: true,
        totalWorkflows: 0,
        successCount: 0,
        failureCount: 0,
        duplicateCount: 0,
        startTime: new Date(),
        endTime: new Date()
      };

      const jsonOutput = reporter.generate(transferResult);
      const parsed = JSON.parse(jsonOutput);

      expect(parsed.statistics.successRate).toBe('0.00%');
      expect(parsed.statistics.failureRate).toBe('0.00%');
    });

    it('deve formatar percentual com 2 casas decimais', () => {
      const transferResult = {
        success: true,
        totalWorkflows: 3,
        successCount: 2,
        failureCount: 1,
        duplicateCount: 0,
        startTime: new Date(),
        endTime: new Date()
      };

      const jsonOutput = reporter.generate(transferResult);
      const parsed = JSON.parse(jsonOutput);

      expect(parsed.statistics.successRate).toBe('66.67%');
    });
  });

  describe('_formatDuration()', () => {
    it('deve formatar duração em segundos', () => {
      const transferResult = {
        success: true,
        totalWorkflows: 10,
        successCount: 10,
        failureCount: 0,
        duplicateCount: 0,
        startTime: new Date('2025-01-03T10:00:00.000Z'),
        endTime: new Date('2025-01-03T10:00:45.000Z') // 45s
      };

      const jsonOutput = reporter.generate(transferResult);
      const parsed = JSON.parse(jsonOutput);

      expect(parsed.metadata.duration.formatted).toBe('45s');
    });

    it('deve formatar duração em minutos e segundos', () => {
      const transferResult = {
        success: true,
        totalWorkflows: 10,
        successCount: 10,
        failureCount: 0,
        duplicateCount: 0,
        startTime: new Date('2025-01-03T10:00:00.000Z'),
        endTime: new Date('2025-01-03T10:02:30.000Z') // 2m 30s
      };

      const jsonOutput = reporter.generate(transferResult);
      const parsed = JSON.parse(jsonOutput);

      expect(parsed.metadata.duration.formatted).toBe('2m 30s');
    });

    it('deve formatar duração em horas e minutos', () => {
      const transferResult = {
        success: true,
        totalWorkflows: 10,
        successCount: 10,
        failureCount: 0,
        duplicateCount: 0,
        startTime: new Date('2025-01-03T10:00:00.000Z'),
        endTime: new Date('2025-01-03T11:15:00.000Z') // 1h 15m
      };

      const jsonOutput = reporter.generate(transferResult);
      const parsed = JSON.parse(jsonOutput);

      expect(parsed.metadata.duration.formatted).toBe('1h 15m');
    });
  });

  describe('prettyPrint option', () => {
    it('deve gerar JSON com indentação se prettyPrint for true', () => {
      reporter.options.prettyPrint = true;

      const transferResult = {
        success: true,
        totalWorkflows: 10,
        successCount: 10,
        failureCount: 0,
        duplicateCount: 0,
        startTime: new Date(),
        endTime: new Date()
      };

      const jsonOutput = reporter.generate(transferResult);

      expect(jsonOutput).toContain('\n'); // Deve ter quebras de linha
      expect(jsonOutput).toContain('  '); // Deve ter indentação
    });

    it('deve gerar JSON compacto se prettyPrint for false', () => {
      reporter.options.prettyPrint = false;

      const transferResult = {
        success: true,
        totalWorkflows: 10,
        successCount: 10,
        failureCount: 0,
        duplicateCount: 0,
        startTime: new Date(),
        endTime: new Date()
      };

      const jsonOutput = reporter.generate(transferResult);
      const lines = jsonOutput.split('\n');

      expect(lines.length).toBe(1); // Deve ser uma única linha
    });
  });

  describe('autoSave', () => {
    it('deve salvar arquivo se autoSave for true', async () => {
      reporter.options.autoSave = true;
      mockFsPromises.mkdir.mockResolvedValue();
      mockFsPromises.writeFile.mockResolvedValue();

      const transferResult = {
        success: true,
        totalWorkflows: 10,
        successCount: 10,
        failureCount: 0,
        duplicateCount: 0,
        startTime: new Date(),
        endTime: new Date()
      };

      reporter.generate(transferResult);

      // Aguardar async save
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockFsPromises.mkdir).toHaveBeenCalled();
      expect(mockFsPromises.writeFile).toHaveBeenCalled();
    });

    it('NÃO deve salvar arquivo se autoSave for false', async () => {
      reporter.options.autoSave = false;

      const transferResult = {
        success: true,
        totalWorkflows: 10,
        successCount: 10,
        failureCount: 0,
        duplicateCount: 0,
        startTime: new Date(),
        endTime: new Date()
      };

      reporter.generate(transferResult);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockFsPromises.writeFile).not.toHaveBeenCalled();
    });

    it('deve capturar erro de save sem lançar exceção', async () => {
      reporter.options.autoSave = true;
      mockFsPromises.mkdir.mockResolvedValue();
      mockFsPromises.writeFile.mockRejectedValue(new Error('Disk full'));

      const transferResult = {
        success: true,
        totalWorkflows: 10,
        successCount: 10,
        failureCount: 0,
        duplicateCount: 0,
        startTime: new Date(),
        endTime: new Date()
      };

      expect(() => {
        reporter.generate(transferResult);
      }).not.toThrow();

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('getInfo()', () => {
    it('deve retornar informações do plugin com capabilities', () => {
      const info = reporter.getInfo();

      expect(info).toHaveProperty('name');
      expect(info).toHaveProperty('version');
      expect(info).toHaveProperty('type');
      expect(info).toHaveProperty('capabilities');
      expect(Array.isArray(info.capabilities)).toBe(true);
      expect(info.capabilities.length).toBeGreaterThan(0);
    });
  });

  describe('reportGeneration metadata', () => {
    it('deve incluir informações sobre geração do relatório', () => {
      const transferResult = {
        success: true,
        totalWorkflows: 10,
        successCount: 10,
        failureCount: 0,
        duplicateCount: 0,
        startTime: new Date(),
        endTime: new Date()
      };

      const jsonOutput = reporter.generate(transferResult);
      const parsed = JSON.parse(jsonOutput);

      expect(parsed.reportGeneration.generatedBy).toBe('json-reporter');
      expect(parsed.reportGeneration.version).toBe('1.0.0');
      expect(parsed.reportGeneration.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('integração - relatório completo', () => {
    it('deve gerar relatório JSON completo', () => {
      const transferResult = {
        success: true,
        totalWorkflows: 100,
        successCount: 85,
        failureCount: 10,
        duplicateCount: 5,
        startTime: new Date('2025-01-03T10:00:00.000Z'),
        endTime: new Date('2025-01-03T10:05:00.000Z'),
        metadata: {
          source: 'https://source.n8n.io',
          target: 'https://target.n8n.io',
          options: { dryRun: false },
          plugins: ['standard-deduplicator', 'integrity-validator'],
          validationEnabled: true,
          workflows: [
            {
              id: '1',
              name: 'Workflow A',
              status: 'transferred',
              nodes: [{}, {}],
              tags: [{ name: 'prod' }],
              active: true
            }
          ]
        },
        errors: [
          {
            workflowName: 'Failed Workflow',
            message: 'Network timeout',
            code: 'ETIMEDOUT'
          }
        ]
      };

      const jsonOutput = reporter.generate(transferResult);
      const parsed = JSON.parse(jsonOutput);

      // Validar estrutura completa
      expect(parsed.metadata).toBeDefined();
      expect(parsed.statistics).toBeDefined();
      expect(parsed.workflows).toBeDefined();
      expect(parsed.errors).toBeDefined();
      expect(parsed.configuration).toBeDefined();
      expect(parsed.reportGeneration).toBeDefined();

      // Validar conteúdo
      expect(parsed.statistics.total).toBe(100);
      expect(parsed.workflows.length).toBeGreaterThan(0);
      expect(parsed.errors.length).toBeGreaterThan(0);
      expect(parsed.configuration.pluginsUsed).toEqual(['standard-deduplicator', 'integrity-validator']);
    });
  });
});
