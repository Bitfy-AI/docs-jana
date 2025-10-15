/**
 * @fileoverview Testes unitários para CSVReporter Plugin
 * @module tests/unit/plugins/csv-reporter.test
 */

// Criar mock completo de fs ANTES de qualquer require
const mockFs = {
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn()
};

jest.mock('fs', () => mockFs);

// Agora sim importar os módulos
const CSVReporter = require('../../../../scripts/admin/n8n-transfer/plugins/reporters/csv-reporter');
const fs = require('fs');

describe('CSVReporter', () => {
  let reporter;

  beforeEach(() => {
    reporter = new CSVReporter();
    jest.clearAllMocks();

    // Configurar comportamento padrão dos mocks
    mockFs.existsSync.mockReturnValue(true);
    mockFs.mkdirSync.mockImplementation(() => {});
    mockFs.writeFileSync.mockImplementation(() => {});
  });

  describe('constructor()', () => {
    it('deve criar instância com configurações corretas', () => {
      expect(reporter.getName()).toBe('csv-reporter');
      expect(reporter.getVersion()).toBe('1.0.0');
      expect(reporter.getType()).toBe('reporter');
    });

    it('deve ter outputDir padrão configurado', () => {
      const outputDir = reporter.getOption('outputDir');
      expect(outputDir).toBeTruthy();
      expect(outputDir).toContain('reports');
    });

    it('deve ter delimiter padrão como vírgula', () => {
      const delimiter = reporter.getOption('delimiter');
      expect(delimiter).toBe(',');
    });

    it('deve ter encoding padrão como utf8', () => {
      const encoding = reporter.getOption('encoding');
      expect(encoding).toBe('utf8');
    });
  });

  describe('escapeCSVField()', () => {
    it('deve retornar campo simples sem modificações', () => {
      const result = reporter.escapeCSVField('Simple text');
      expect(result).toBe('Simple text');
    });

    it('deve envolver campo com vírgula em aspas', () => {
      const result = reporter.escapeCSVField('Text with, comma');
      expect(result).toBe('"Text with, comma"');
    });

    it('deve escapar aspas duplas existentes', () => {
      const result = reporter.escapeCSVField('Text with "quotes"');
      expect(result).toBe('"Text with ""quotes"""');
    });

    it('deve envolver campo com quebra de linha em aspas', () => {
      const result = reporter.escapeCSVField('Multi\nline');
      expect(result).toBe('"Multi\nline"');
    });

    it('deve envolver campo com \\r em aspas', () => {
      const result = reporter.escapeCSVField('Text\rwith\rcarriage');
      expect(result).toBe('"Text\rwith\rcarriage"');
    });

    it('deve retornar string vazia para null', () => {
      const result = reporter.escapeCSVField(null);
      expect(result).toBe('');
    });

    it('deve retornar string vazia para undefined', () => {
      const result = reporter.escapeCSVField(undefined);
      expect(result).toBe('');
    });

    it('deve converter número para string', () => {
      const result = reporter.escapeCSVField(123);
      expect(result).toBe('123');
    });

    it('deve converter boolean para string', () => {
      const result = reporter.escapeCSVField(true);
      expect(result).toBe('true');
    });

    it('deve lidar com campo vazio', () => {
      const result = reporter.escapeCSVField('');
      expect(result).toBe('');
    });

    it('deve escapar campo complexo com múltiplos caracteres especiais', () => {
      const result = reporter.escapeCSVField('Field with, comma and "quotes" and\nnewline');
      expect(result).toBe('"Field with, comma and ""quotes"" and\nnewline"');
    });
  });

  describe('formatTags()', () => {
    it('deve formatar array de tags corretamente', () => {
      const tags = [
        { name: 'production' },
        { name: 'v2' },
        { name: 'critical' }
      ];

      const result = reporter.formatTags(tags);
      expect(result).toBe('production, v2, critical');
    });

    it('deve retornar string vazia para null', () => {
      const result = reporter.formatTags(null);
      expect(result).toBe('');
    });

    it('deve retornar string vazia para undefined', () => {
      const result = reporter.formatTags(undefined);
      expect(result).toBe('');
    });

    it('deve retornar string vazia para array vazio', () => {
      const result = reporter.formatTags([]);
      expect(result).toBe('');
    });

    it('deve ignorar tags sem nome', () => {
      const tags = [
        { name: 'tag1' },
        { name: '' },
        { name: 'tag2' },
        {}
      ];

      const result = reporter.formatTags(tags);
      expect(result).toBe('tag1, tag2');
    });

    it('deve retornar string vazia se não for array', () => {
      const result = reporter.formatTags('not-an-array');
      expect(result).toBe('');
    });
  });

  describe('countNodes()', () => {
    it('deve contar nodes corretamente', () => {
      const workflow = {
        nodes: [{}, {}, {}]
      };

      const result = reporter.countNodes(workflow);
      expect(result).toBe(3);
    });

    it('deve retornar 0 se nodes for array vazio', () => {
      const workflow = { nodes: [] };
      const result = reporter.countNodes(workflow);
      expect(result).toBe(0);
    });

    it('deve retornar 0 se nodes for undefined', () => {
      const workflow = {};
      const result = reporter.countNodes(workflow);
      expect(result).toBe(0);
    });

    it('deve retornar 0 se workflow for null', () => {
      const result = reporter.countNodes(null);
      expect(result).toBe(0);
    });

    it('deve retornar 0 se workflow for undefined', () => {
      const result = reporter.countNodes(undefined);
      expect(result).toBe(0);
    });
  });

  describe('getStatus()', () => {
    it('deve retornar "Success" para status completed', () => {
      const state = { status: 'completed' };
      expect(reporter.getStatus(state)).toBe('Success');
    });

    it('deve retornar "Skipped" para status skipped sem reason', () => {
      const state = { status: 'skipped' };
      expect(reporter.getStatus(state)).toBe('Skipped');
    });

    it('deve retornar "Skipped (duplicate)" para status skipped com reason', () => {
      const state = { status: 'skipped', reason: 'duplicate' };
      expect(reporter.getStatus(state)).toBe('Skipped (duplicate)');
    });

    it('deve retornar "Failed" para status failed', () => {
      const state = { status: 'failed' };
      expect(reporter.getStatus(state)).toBe('Failed');
    });

    it('deve retornar "Pending" para status pending', () => {
      const state = { status: 'pending' };
      expect(reporter.getStatus(state)).toBe('Pending');
    });

    it('deve retornar "Validating" para status validating', () => {
      const state = { status: 'validating' };
      expect(reporter.getStatus(state)).toBe('Validating');
    });

    it('deve retornar "Transferring" para status transferring', () => {
      const state = { status: 'transferring' };
      expect(reporter.getStatus(state)).toBe('Transferring');
    });

    it('deve retornar status original para status desconhecido', () => {
      const state = { status: 'custom-status' };
      expect(reporter.getStatus(state)).toBe('custom-status');
    });

    it('deve retornar "Unknown" para state null', () => {
      expect(reporter.getStatus(null)).toBe('Unknown');
    });

    it('deve retornar "Unknown" para state sem status', () => {
      expect(reporter.getStatus({})).toBe('Unknown');
    });
  });

  describe('getReason()', () => {
    it('deve retornar reason se presente', () => {
      const state = { reason: 'Duplicate workflow' };
      expect(reporter.getReason(state)).toBe('Duplicate workflow');
    });

    it('deve retornar erro de validação se presente', () => {
      const state = {
        validation: {
          errors: [
            { message: 'Invalid name' },
            { message: 'Missing required field' }
          ]
        }
      };

      expect(reporter.getReason(state)).toBe('Invalid name; Missing required field');
    });

    it('deve priorizar reason sobre validation errors', () => {
      const state = {
        reason: 'Explicit reason',
        validation: {
          errors: [{ message: 'Validation error' }]
        }
      };

      expect(reporter.getReason(state)).toBe('Explicit reason');
    });

    it('deve retornar string vazia se state for null', () => {
      expect(reporter.getReason(null)).toBe('');
    });

    it('deve retornar string vazia se não houver reason nem errors', () => {
      expect(reporter.getReason({})).toBe('');
    });

    it('deve retornar string vazia se validation.errors for vazio', () => {
      const state = {
        validation: { errors: [] }
      };

      expect(reporter.getReason(state)).toBe('');
    });
  });

  describe('generateHeader()', () => {
    it('deve gerar header CSV correto', () => {
      const header = reporter.generateHeader();

      expect(header).toBe('Name,Status,Tags,Nodes,Source ID,Target ID,Reason');
    });

    it('deve respeitar delimiter customizado', () => {
      reporter.setOptions({ delimiter: ';' });
      const header = reporter.generateHeader();

      expect(header).toBe('Name;Status;Tags;Nodes;Source ID;Target ID;Reason');
    });

    it('deve escapar headers se necessário', () => {
      // Mock temporário para testar
      const originalEscape = reporter.escapeCSVField;
      reporter.escapeCSVField = jest.fn(value => `[${value}]`);

      const header = reporter.generateHeader();

      expect(reporter.escapeCSVField).toHaveBeenCalled();

      reporter.escapeCSVField = originalEscape;
    });
  });

  describe('generateRow()', () => {
    it('deve gerar row CSV correto', () => {
      const state = {
        workflow: {
          id: '123',
          name: 'Test Workflow',
          nodes: [{}, {}],
          tags: [{ name: 'prod' }]
        },
        status: 'completed'
      };

      const row = reporter.generateRow(state);

      expect(row).toContain('Test Workflow');
      expect(row).toContain('Success');
      expect(row).toContain('prod');
      expect(row).toContain('2');
      expect(row).toContain('123');
    });

    it('deve escapar campos corretamente', () => {
      const state = {
        workflow: {
          id: '123',
          name: 'Workflow with, comma',
          nodes: [{}],
          tags: []
        },
        status: 'completed'
      };

      const row = reporter.generateRow(state);

      expect(row).toContain('"Workflow with, comma"');
    });

    it('deve usar "Unknown" se workflow.name ausente', () => {
      const state = {
        workflow: { id: '123' },
        status: 'completed'
      };

      const row = reporter.generateRow(state);

      expect(row).toContain('Unknown');
    });

    it('deve usar string vazia se workflow.id ausente', () => {
      const state = {
        workflow: { name: 'Test' },
        status: 'completed'
      };

      const row = reporter.generateRow(state);

      const fields = row.split(',');
      expect(fields[4]).toBe(''); // Source ID vazio
      expect(fields[5]).toBe(''); // Target ID vazio
    });

    it('deve incluir reason se presente', () => {
      const state = {
        workflow: { name: 'Test', id: '123' },
        status: 'skipped',
        reason: 'Duplicate'
      };

      const row = reporter.generateRow(state);

      expect(row).toContain('Duplicate');
    });
  });

  describe('generate() - validação', () => {
    it('deve lançar erro se transferResult for null', () => {
      expect(() => {
        reporter.generate(null);
      }).toThrow('TransferResult is required');
    });

    it('deve lançar erro se transferResult for undefined', () => {
      expect(() => {
        reporter.generate(undefined);
      }).toThrow('TransferResult is required');
    });

    it('deve lançar erro se workflows não for array', () => {
      const transferResult = {
        workflows: 'not-an-array',
        totalWorkflows: 10,
        successCount: 8,
        failureCount: 2,
        startTime: new Date(),
        endTime: new Date()
      };

      expect(() => {
        reporter.generate(transferResult);
      }).toThrow('workflows array');
    });

    it('deve lançar erro se workflows ausente', () => {
      const transferResult = {
        totalWorkflows: 10,
        successCount: 8,
        failureCount: 2,
        startTime: new Date(),
        endTime: new Date()
      };

      expect(() => {
        reporter.generate(transferResult);
      }).toThrow('workflows array');
    });
  });

  describe('generate() - CSV output', () => {
    it('deve gerar CSV com header e dados', () => {
      const transferResult = {
        workflows: [
          {
            workflow: { id: '1', name: 'Workflow A', nodes: [{}, {}], tags: [{ name: 'prod' }] },
            status: 'completed'
          },
          {
            workflow: { id: '2', name: 'Workflow B', nodes: [{}], tags: [] },
            status: 'skipped',
            reason: 'Duplicate'
          }
        ],
        totalWorkflows: 2,
        successCount: 1,
        failureCount: 0,
        duplicateCount: 1,
        startTime: new Date(),
        endTime: new Date()
      };

      const csv = reporter.generate(transferResult);

      const lines = csv.split('\n');
      expect(lines.length).toBe(3); // Header + 2 rows

      expect(lines[0]).toContain('Name,Status,Tags,Nodes,Source ID,Target ID,Reason');
      expect(lines[1]).toContain('Workflow A');
      expect(lines[2]).toContain('Workflow B');
    });

    it('deve gerar CSV vazio se workflows array vazio', () => {
      const transferResult = {
        workflows: [],
        totalWorkflows: 0,
        successCount: 0,
        failureCount: 0,
        startTime: new Date(),
        endTime: new Date()
      };

      const csv = reporter.generate(transferResult);

      const lines = csv.split('\n');
      expect(lines.length).toBe(1); // Apenas header
      expect(lines[0]).toContain('Name,Status,Tags,Nodes');
    });

    it('deve lidar com caracteres especiais corretamente', () => {
      const transferResult = {
        workflows: [
          {
            workflow: {
              id: '1',
              name: 'Workflow with "quotes", commas and\nnewlines',
              nodes: [{}],
              tags: [{ name: 'tag,with,commas' }]
            },
            status: 'completed'
          }
        ],
        totalWorkflows: 1,
        successCount: 1,
        failureCount: 0,
        startTime: new Date(),
        endTime: new Date()
      };

      const csv = reporter.generate(transferResult);

      expect(csv).toContain('"Workflow with ""quotes"", commas and\nnewlines"');
      expect(csv).toContain('"tag,with,commas"');
    });
  });

  describe('saveToFile()', () => {
    it('deve salvar arquivo com timestamp se includeTimestamp for true', () => {
      const csvContent = 'Name,Status\nWorkflow A,Success';
      const transferResult = {};

      const filePath = reporter.saveToFile(csvContent, transferResult);

      expect(filePath).toContain('.csv');
      expect(filePath).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);
      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });

    it('deve salvar arquivo sem timestamp se includeTimestamp for false', () => {
      reporter.setOptions({ includeTimestamp: false });

      const csvContent = 'Name,Status\nWorkflow A,Success';
      const transferResult = {};

      const filePath = reporter.saveToFile(csvContent, transferResult);

      expect(filePath).toContain('transfer-report.csv');
      expect(filePath).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    });

    it('deve criar diretório se não existir', () => {
      mockFs.existsSync.mockReturnValue(false);

      const csvContent = 'Name,Status\nWorkflow A,Success';
      const transferResult = {};

      reporter.saveToFile(csvContent, transferResult);

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.any(String),
        { recursive: true }
      );
    });

    it('deve usar encoding configurado', () => {
      reporter.setOptions({ encoding: 'utf16le' });

      const csvContent = 'Name,Status\nWorkflow A,Success';
      const transferResult = {};

      reporter.saveToFile(csvContent, transferResult);

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.any(String),
        csvContent,
        { encoding: 'utf16le' }
      );
    });
  });

  describe('autoSave option', () => {
    it('NÃO deve salvar automaticamente se autoSave for false (padrão)', () => {
      const transferResult = {
        workflows: [
          {
            workflow: { id: '1', name: 'Test', nodes: [], tags: [] },
            status: 'completed'
          }
        ],
        totalWorkflows: 1,
        successCount: 1,
        failureCount: 0,
        startTime: new Date(),
        endTime: new Date()
      };

      reporter.generate(transferResult);

      expect(mockFs.writeFileSync).not.toHaveBeenCalled();
    });

    it('deve salvar automaticamente se autoSave for true', () => {
      reporter.setOptions({ autoSave: true });

      const transferResult = {
        workflows: [
          {
            workflow: { id: '1', name: 'Test', nodes: [], tags: [] },
            status: 'completed'
          }
        ],
        totalWorkflows: 1,
        successCount: 1,
        failureCount: 0,
        startTime: new Date(),
        endTime: new Date()
      };

      reporter.generate(transferResult);

      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('delimiter customizado', () => {
    it('deve usar ponto-e-vírgula como delimiter', () => {
      reporter.setOptions({ delimiter: ';' });

      const transferResult = {
        workflows: [
          {
            workflow: { id: '1', name: 'Test', nodes: [{}], tags: [] },
            status: 'completed'
          }
        ],
        totalWorkflows: 1,
        successCount: 1,
        failureCount: 0,
        startTime: new Date(),
        endTime: new Date()
      };

      const csv = reporter.generate(transferResult);

      expect(csv).toContain('Name;Status;Tags');
    });

    it('deve usar tab como delimiter', () => {
      reporter.setOptions({ delimiter: '\t' });

      const transferResult = {
        workflows: [
          {
            workflow: { id: '1', name: 'Test', nodes: [{}], tags: [] },
            status: 'completed'
          }
        ],
        totalWorkflows: 1,
        successCount: 1,
        failureCount: 0,
        startTime: new Date(),
        endTime: new Date()
      };

      const csv = reporter.generate(transferResult);

      expect(csv).toContain('Name\tStatus\tTags');
    });
  });

  describe('integração - CSV completo', () => {
    it('deve gerar CSV completo e válido', () => {
      const transferResult = {
        workflows: [
          {
            workflow: {
              id: 'wf-1',
              name: 'Customer Onboarding',
              nodes: [{}, {}, {}],
              tags: [{ name: 'production' }, { name: 'critical' }]
            },
            status: 'completed'
          },
          {
            workflow: {
              id: 'wf-2',
              name: 'Invoice Processing',
              nodes: [{}, {}],
              tags: [{ name: 'finance' }]
            },
            status: 'skipped',
            reason: 'Duplicate detected'
          },
          {
            workflow: {
              id: 'wf-3',
              name: 'Data Sync',
              nodes: [{}],
              tags: []
            },
            status: 'failed',
            validation: {
              errors: [
                { message: 'Invalid credentials' }
              ]
            }
          }
        ],
        totalWorkflows: 3,
        successCount: 1,
        failureCount: 1,
        duplicateCount: 1,
        startTime: new Date(),
        endTime: new Date()
      };

      const csv = reporter.generate(transferResult);

      // Validar estrutura
      const lines = csv.split('\n');
      expect(lines.length).toBe(4); // Header + 3 rows

      // Validar header
      expect(lines[0]).toBe('Name,Status,Tags,Nodes,Source ID,Target ID,Reason');

      // Validar linhas de dados
      expect(lines[1]).toContain('Customer Onboarding');
      expect(lines[1]).toContain('Success');
      expect(lines[1]).toContain('production, critical');

      expect(lines[2]).toContain('Invoice Processing');
      expect(lines[2]).toContain('Skipped');
      expect(lines[2]).toContain('Duplicate detected');

      expect(lines[3]).toContain('Data Sync');
      expect(lines[3]).toContain('Failed');
      expect(lines[3]).toContain('Invalid credentials');
    });

    it('deve ser compatível com Excel (escaping correto)', () => {
      const transferResult = {
        workflows: [
          {
            workflow: {
              id: '1',
              name: 'Workflow "Special" (v2.0)',
              nodes: [{}],
              tags: [{ name: 'test, production' }]
            },
            status: 'completed'
          }
        ],
        totalWorkflows: 1,
        successCount: 1,
        failureCount: 0,
        startTime: new Date(),
        endTime: new Date()
      };

      const csv = reporter.generate(transferResult);

      // Verificar escaping correto para Excel
      expect(csv).toContain('"Workflow ""Special"" (v2.0)"');
      expect(csv).toContain('"test, production"');
    });
  });
});
