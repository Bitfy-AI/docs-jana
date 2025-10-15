/**
 * @fileoverview Testes unitários para MarkdownReporter Plugin
 * @module tests/unit/plugins/markdown-reporter.test
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
const MarkdownReporter = require('../../../../scripts/admin/n8n-transfer/plugins/reporters/markdown-reporter');
const fs = require('fs');
const path = require('path');

describe('MarkdownReporter', () => {
  let reporter;
  const testOutputDir = path.join(__dirname, '../../../../../scripts/admin/n8n-transfer/reports');

  beforeEach(() => {
    reporter = new MarkdownReporter();
    jest.clearAllMocks();

    // Configurar comportamento padrão dos mocks
    mockFs.existsSync.mockReturnValue(true);
    mockFs.mkdirSync.mockImplementation(() => {});
    mockFs.writeFileSync.mockImplementation(() => {});
  });

  describe('constructor()', () => {
    it('deve criar instância com configurações corretas', () => {
      expect(reporter.getName()).toBe('markdown-reporter');
      expect(reporter.getVersion()).toBe('1.0.0');
      expect(reporter.getType()).toBe('reporter');
    });

    it('deve ter outputDir padrão configurado', () => {
      const outputDir = reporter.getOption('outputDir');
      expect(outputDir).toBeTruthy();
      expect(outputDir).toContain('reports');
    });

    it('deve ter includeTimestamp padrão true', () => {
      const includeTimestamp = reporter.getOption('includeTimestamp');
      expect(includeTimestamp).toBe(true);
    });

    it('deve ter includeEmojis padrão true', () => {
      const includeEmojis = reporter.getOption('includeEmojis');
      expect(includeEmojis).toBe(true);
    });
  });

  describe('_validateTransferResult()', () => {
    it('deve lançar erro se transferResult for null', () => {
      expect(() => {
        reporter.generate(null);
      }).toThrow('transferResult deve ser um objeto válido');
    });

    it('deve lançar erro se transferResult não for objeto', () => {
      expect(() => {
        reporter.generate('not-an-object');
      }).toThrow('transferResult deve ser um objeto válido');
    });

    it('deve lançar erro se faltar campo obrigatório "total"', () => {
      const transferResult = {
        transferred: 10,
        skipped: 2,
        failed: 1,
        duration: 5000
      };

      expect(() => {
        reporter.generate(transferResult);
      }).toThrow(/total/);
    });

    it('deve lançar erro se faltar campo obrigatório "duration"', () => {
      const transferResult = {
        total: 10,
        transferred: 8,
        skipped: 1,
        failed: 1
      };

      expect(() => {
        reporter.generate(transferResult);
      }).toThrow(/duration/);
    });

    it('deve aceitar transferResult válido', () => {
      const transferResult = {
        total: 10,
        transferred: 8,
        skipped: 1,
        failed: 1,
        duration: 5000
      };

      expect(() => {
        reporter.generate(transferResult);
      }).not.toThrow();
    });
  });

  describe('generate() - relatório básico', () => {
    it('deve gerar relatório e retornar caminho do arquivo', () => {
      const transferResult = {
        total: 10,
        transferred: 8,
        skipped: 1,
        failed: 1,
        duration: 5000
      };

      const reportPath = reporter.generate(transferResult);

      expect(reportPath).toBeTruthy();
      expect(reportPath).toContain('.md');
      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });

    it('deve criar diretório se não existir', () => {
      mockFs.existsSync.mockReturnValue(false);

      const transferResult = {
        total: 10,
        transferred: 8,
        skipped: 1,
        failed: 1,
        duration: 5000
      };

      reporter.generate(transferResult);

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.any(String),
        { recursive: true }
      );
    });
  });

  describe('_buildHeader()', () => {
    it('deve incluir título com emoji por padrão', () => {
      const transferResult = {
        total: 10,
        transferred: 8,
        skipped: 1,
        failed: 1,
        duration: 5000
      };

      const reportPath = reporter.generate(transferResult);
      const reportContent = mockFs.writeFileSync.mock.calls[0][1];

      expect(reportContent).toContain('📊');
      expect(reportContent).toContain('Relatório de Transferência N8N');
    });

    it('NÃO deve incluir emoji se includeEmojis for false', () => {
      reporter.setOptions({ includeEmojis: false });

      const transferResult = {
        total: 10,
        transferred: 8,
        skipped: 1,
        failed: 1,
        duration: 5000
      };

      const reportPath = reporter.generate(transferResult);
      const reportContent = mockFs.writeFileSync.mock.calls[0][1];

      expect(reportContent).not.toContain('📊');
      expect(reportContent).toContain('Relatório de Transferência N8N');
    });

    it('deve incluir timestamp ISO', () => {
      const transferResult = {
        total: 10,
        transferred: 8,
        skipped: 1,
        failed: 1,
        duration: 5000,
        startTime: new Date('2025-01-03T10:00:00.000Z')
      };

      const reportPath = reporter.generate(transferResult);
      const reportContent = mockFs.writeFileSync.mock.calls[0][1];

      expect(reportContent).toContain('**Data de Execução:**');
      expect(reportContent).toContain('2025-01-03T10:00:00.000Z');
    });

    it('deve incluir duração formatada', () => {
      const transferResult = {
        total: 10,
        transferred: 8,
        skipped: 1,
        failed: 1,
        duration: 150000 // 2m 30s
      };

      const reportPath = reporter.generate(transferResult);
      const reportContent = mockFs.writeFileSync.mock.calls[0][1];

      expect(reportContent).toContain('**Duração:**');
      expect(reportContent).toContain('2m 30s');
    });

    it('deve incluir URLs de origem e destino', () => {
      const transferResult = {
        total: 10,
        transferred: 8,
        skipped: 1,
        failed: 1,
        duration: 5000,
        sourceUrl: 'https://source.n8n.io',
        targetUrl: 'https://target.n8n.io'
      };

      const reportPath = reporter.generate(transferResult);
      const reportContent = mockFs.writeFileSync.mock.calls[0][1];

      expect(reportContent).toContain('https://source.n8n.io');
      expect(reportContent).toContain('https://target.n8n.io');
    });
  });

  describe('_buildSummary()', () => {
    it('deve incluir tabela de resumo com todas as métricas', () => {
      const transferResult = {
        total: 100,
        transferred: 85,
        skipped: 10,
        failed: 5,
        duplicates: 8,
        duration: 5000
      };

      const reportPath = reporter.generate(transferResult);
      const reportContent = mockFs.writeFileSync.mock.calls[0][1];

      expect(reportContent).toContain('## 📋 Resumo da Operação');
      expect(reportContent).toContain('| Métrica | Quantidade | Percentual |');
      expect(reportContent).toContain('100'); // total
      expect(reportContent).toContain('85'); // transferred
      expect(reportContent).toContain('10'); // skipped
      expect(reportContent).toContain('5'); // failed
      expect(reportContent).toContain('8'); // duplicates
    });

    it('deve calcular success rate corretamente', () => {
      const transferResult = {
        total: 100,
        transferred: 85,
        skipped: 10,
        failed: 5,
        duration: 5000
      };

      const reportPath = reporter.generate(transferResult);
      const reportContent = mockFs.writeFileSync.mock.calls[0][1];

      expect(reportContent).toContain('85.0%'); // Success rate
    });

    it('deve incluir linha de duplicatas se presente', () => {
      const transferResult = {
        total: 100,
        transferred: 85,
        skipped: 10,
        failed: 5,
        duplicates: 8,
        duration: 5000
      };

      const reportPath = reporter.generate(transferResult);
      const reportContent = mockFs.writeFileSync.mock.calls[0][1];

      expect(reportContent).toContain('🔄');
      expect(reportContent).toContain('Duplicatas Detectadas');
    });

    it('NÃO deve incluir linha de duplicatas se não houver', () => {
      const transferResult = {
        total: 100,
        transferred: 90,
        skipped: 5,
        failed: 5,
        duration: 5000
        // duplicates ausente
      };

      const reportPath = reporter.generate(transferResult);
      const reportContent = mockFs.writeFileSync.mock.calls[0][1];

      expect(reportContent).not.toContain('Duplicatas Detectadas');
    });
  });

  describe('_buildTransferredWorkflows()', () => {
    it('deve incluir tabela de workflows transferidos', () => {
      const transferResult = {
        total: 2,
        transferred: 2,
        skipped: 0,
        failed: 0,
        duration: 5000,
        workflows: [
          {
            name: 'Workflow A',
            sourceId: 'src-1',
            targetId: 'tgt-1',
            status: 'transferred'
          },
          {
            name: 'Workflow B',
            sourceId: 'src-2',
            targetId: 'tgt-2',
            status: 'completed'
          }
        ]
      };

      const reportPath = reporter.generate(transferResult);
      const reportContent = mockFs.writeFileSync.mock.calls[0][1];

      expect(reportContent).toContain('## ✅ Workflows Transferidos');
      expect(reportContent).toContain('Workflow A');
      expect(reportContent).toContain('Workflow B');
      expect(reportContent).toContain('src-1');
      expect(reportContent).toContain('tgt-1');
    });

    it('NÃO deve incluir seção se não houver workflows transferidos', () => {
      const transferResult = {
        total: 1,
        transferred: 0,
        skipped: 1,
        failed: 0,
        duration: 5000,
        workflows: []
      };

      const reportPath = reporter.generate(transferResult);
      const reportContent = mockFs.writeFileSync.mock.calls[0][1];

      expect(reportContent).not.toContain('Workflows Transferidos');
    });
  });

  describe('_buildSkippedWorkflows()', () => {
    it('deve incluir tabela de workflows pulados', () => {
      const transferResult = {
        total: 2,
        transferred: 1,
        skipped: 1,
        failed: 0,
        duration: 5000,
        workflows: [
          {
            name: 'Workflow Skipped',
            status: 'skipped',
            reason: 'Duplicate detected'
          }
        ]
      };

      const reportPath = reporter.generate(transferResult);
      const reportContent = mockFs.writeFileSync.mock.calls[0][1];

      expect(reportContent).toContain('## ⏭️ Workflows Pulados');
      expect(reportContent).toContain('Workflow Skipped');
      expect(reportContent).toContain('Duplicate detected');
    });

    it('deve usar skipReason se reason não estiver disponível', () => {
      const transferResult = {
        total: 1,
        transferred: 0,
        skipped: 1,
        failed: 0,
        duration: 5000,
        workflows: [
          {
            name: 'Workflow',
            status: 'skipped',
            skipReason: 'Already exists'
          }
        ]
      };

      const reportPath = reporter.generate(transferResult);
      const reportContent = mockFs.writeFileSync.mock.calls[0][1];

      expect(reportContent).toContain('Already exists');
    });
  });

  describe('_buildFailedWorkflows()', () => {
    it('deve incluir tabela de workflows com falha', () => {
      const transferResult = {
        total: 2,
        transferred: 1,
        skipped: 0,
        failed: 1,
        duration: 5000,
        workflows: [
          {
            name: 'Failed Workflow',
            status: 'failed',
            error: 'Network timeout'
          }
        ]
      };

      const reportPath = reporter.generate(transferResult);
      const reportContent = mockFs.writeFileSync.mock.calls[0][1];

      expect(reportContent).toContain('## ❌ Workflows com Falha');
      expect(reportContent).toContain('Failed Workflow');
      expect(reportContent).toContain('Network timeout');
    });

    it('deve usar errorMessage se error não estiver disponível', () => {
      const transferResult = {
        total: 1,
        transferred: 0,
        skipped: 0,
        failed: 1,
        duration: 5000,
        workflows: [
          {
            name: 'Workflow',
            status: 'failed',
            errorMessage: 'Connection refused'
          }
        ]
      };

      const reportPath = reporter.generate(transferResult);
      const reportContent = mockFs.writeFileSync.mock.calls[0][1];

      expect(reportContent).toContain('Connection refused');
    });
  });

  describe('_buildErrorDetails()', () => {
    it('deve incluir detalhes de erros', () => {
      const transferResult = {
        total: 1,
        transferred: 0,
        skipped: 0,
        failed: 1,
        duration: 5000,
        errors: [
          {
            workflow: 'Failed Workflow',
            error: 'Network timeout',
            code: 'ETIMEDOUT'
          }
        ]
      };

      const reportPath = reporter.generate(transferResult);
      const reportContent = mockFs.writeFileSync.mock.calls[0][1];

      expect(reportContent).toContain('## 🔍 Detalhes dos Erros');
      expect(reportContent).toContain('Failed Workflow');
      expect(reportContent).toContain('ETIMEDOUT');
      expect(reportContent).toContain('Network timeout');
    });

    it('NÃO deve incluir seção se não houver erros', () => {
      const transferResult = {
        total: 1,
        transferred: 1,
        skipped: 0,
        failed: 0,
        duration: 5000,
        errors: []
      };

      const reportPath = reporter.generate(transferResult);
      const reportContent = mockFs.writeFileSync.mock.calls[0][1];

      expect(reportContent).not.toContain('Detalhes dos Erros');
    });
  });

  describe('_buildFooter()', () => {
    it('deve incluir status de sucesso se não houver erros', () => {
      const transferResult = {
        total: 10,
        transferred: 10,
        skipped: 0,
        failed: 0,
        duration: 5000
      };

      const reportPath = reporter.generate(transferResult);
      const reportContent = mockFs.writeFileSync.mock.calls[0][1];

      expect(reportContent).toContain('completada com sucesso');
      expect(reportContent).toContain('✅');
    });

    it('deve incluir warning se houver falhas', () => {
      const transferResult = {
        total: 10,
        transferred: 8,
        skipped: 0,
        failed: 2,
        duration: 5000
      };

      const reportPath = reporter.generate(transferResult);
      const reportContent = mockFs.writeFileSync.mock.calls[0][1];

      expect(reportContent).toContain('completada com erros');
      expect(reportContent).toContain('⚠️');
      expect(reportContent).toContain('2 workflow(s) falharam');
    });

    it('deve incluir informação do gerador', () => {
      const transferResult = {
        total: 10,
        transferred: 10,
        skipped: 0,
        failed: 0,
        duration: 5000
      };

      const reportPath = reporter.generate(transferResult);
      const reportContent = mockFs.writeFileSync.mock.calls[0][1];

      expect(reportContent).toContain('Relatório gerado automaticamente');
      expect(reportContent).toContain('Markdown Reporter');
    });
  });

  describe('_formatDuration()', () => {
    it('deve formatar segundos corretamente', () => {
      const transferResult = {
        total: 1,
        transferred: 1,
        skipped: 0,
        failed: 0,
        duration: 45000 // 45 segundos
      };

      const reportPath = reporter.generate(transferResult);
      const reportContent = mockFs.writeFileSync.mock.calls[0][1];

      expect(reportContent).toContain('45s');
    });

    it('deve formatar minutos e segundos corretamente', () => {
      const transferResult = {
        total: 1,
        transferred: 1,
        skipped: 0,
        failed: 0,
        duration: 150000 // 2m 30s
      };

      const reportPath = reporter.generate(transferResult);
      const reportContent = mockFs.writeFileSync.mock.calls[0][1];

      expect(reportContent).toContain('2m 30s');
    });

    it('deve formatar horas, minutos e segundos corretamente', () => {
      const transferResult = {
        total: 1,
        transferred: 1,
        skipped: 0,
        failed: 0,
        duration: 4530000 // 1h 15m 30s
      };

      const reportPath = reporter.generate(transferResult);
      const reportContent = mockFs.writeFileSync.mock.calls[0][1];

      expect(reportContent).toContain('1h 15m 30s');
    });
  });

  describe('_calcPercentage()', () => {
    it('deve calcular percentual corretamente', () => {
      const transferResult = {
        total: 100,
        transferred: 85,
        skipped: 10,
        failed: 5,
        duration: 5000
      };

      const reportPath = reporter.generate(transferResult);
      const reportContent = mockFs.writeFileSync.mock.calls[0][1];

      expect(reportContent).toContain('85.0%'); // transferred
      expect(reportContent).toContain('10.0%'); // skipped
      expect(reportContent).toContain('5.0%'); // failed
    });

    it('deve retornar 0.0% se total for 0', () => {
      const transferResult = {
        total: 0,
        transferred: 0,
        skipped: 0,
        failed: 0,
        duration: 5000
      };

      const reportPath = reporter.generate(transferResult);
      const reportContent = mockFs.writeFileSync.mock.calls[0][1];

      expect(reportContent).toContain('0.0%');
    });
  });

  describe('_generateTimestamp()', () => {
    it('deve gerar timestamp no formato correto', () => {
      const transferResult = {
        total: 1,
        transferred: 1,
        skipped: 0,
        failed: 0,
        duration: 5000
      };

      const reportPath = reporter.generate(transferResult);

      // Formato esperado: YYYY-MM-DD-HHmmss
      expect(reportPath).toMatch(/\d{4}-\d{2}-\d{2}-\d{6}\.md$/);
    });

    it('NÃO deve incluir timestamp se includeTimestamp for false', () => {
      reporter.setOptions({ includeTimestamp: false });

      const transferResult = {
        total: 1,
        transferred: 1,
        skipped: 0,
        failed: 0,
        duration: 5000
      };

      const reportPath = reporter.generate(transferResult);

      expect(reportPath).toContain('latest.md');
    });
  });

  describe('edge cases', () => {
    it('deve lidar com workflows array vazio', () => {
      const transferResult = {
        total: 0,
        transferred: 0,
        skipped: 0,
        failed: 0,
        duration: 100,
        workflows: []
      };

      expect(() => {
        reporter.generate(transferResult);
      }).not.toThrow();
    });

    it('deve lidar com dados null/undefined em workflows', () => {
      const transferResult = {
        total: 1,
        transferred: 1,
        skipped: 0,
        failed: 0,
        duration: 5000,
        workflows: [
          {
            name: null,
            sourceId: undefined,
            status: 'transferred'
          }
        ]
      };

      expect(() => {
        reporter.generate(transferResult);
      }).not.toThrow();
    });

    it('deve escapar caracteres especiais em Markdown', () => {
      const transferResult = {
        total: 1,
        transferred: 1,
        skipped: 0,
        failed: 0,
        duration: 5000,
        workflows: [
          {
            name: 'Workflow with | pipes',
            status: 'transferred'
          }
        ]
      };

      const reportPath = reporter.generate(transferResult);
      const reportContent = mockFs.writeFileSync.mock.calls[0][1];

      expect(reportContent).toContain('Workflow with | pipes');
    });
  });

  describe('integração - relatório completo', () => {
    it('deve gerar relatório completo com todas as seções', () => {
      const transferResult = {
        total: 100,
        transferred: 85,
        skipped: 10,
        failed: 5,
        duplicates: 8,
        duration: 120000,
        sourceUrl: 'https://source.n8n.io',
        targetUrl: 'https://target.n8n.io',
        startTime: new Date('2025-01-03T10:00:00.000Z'),
        endTime: new Date('2025-01-03T10:02:00.000Z'),
        workflows: [
          { name: 'Transferred 1', sourceId: 's1', targetId: 't1', status: 'transferred' },
          { name: 'Skipped 1', status: 'skipped', reason: 'Duplicate' },
          { name: 'Failed 1', status: 'failed', error: 'Network error' }
        ],
        errors: [
          { workflow: 'Failed 1', error: 'Network error', code: 'ECONNREFUSED' }
        ]
      };

      const reportPath = reporter.generate(transferResult);
      const reportContent = mockFs.writeFileSync.mock.calls[0][1];

      // Verificar todas as seções principais
      expect(reportContent).toContain('Relatório de Transferência N8N');
      expect(reportContent).toContain('Resumo da Operação');
      expect(reportContent).toContain('Workflows Transferidos');
      expect(reportContent).toContain('Workflows Pulados');
      expect(reportContent).toContain('Workflows com Falha');
      expect(reportContent).toContain('Detalhes dos Erros');
      expect(reportContent).toContain('Status Final');
    });
  });
});
