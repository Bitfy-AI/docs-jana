/**
 * Unit Tests - ReportGenerator
 *
 * Testes para geração de relatórios em Markdown.
 * Cobre formatação, salvamento, estatísticas e agrupamento por layer.
 *
 * @module __tests__/unit/report-generator.test
 */

// Mock environment variables before loading modules
process.env.SOURCE_N8N_URL = 'http://test.com';
process.env.SOURCE_N8N_API_KEY = 'test-key';

jest.mock('fs');
const fs = require('fs');
const ReportGenerator = require('../../core/services/report-generator');
const { LAYERS } = require('../../config/config');

describe('ReportGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new ReportGenerator();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with config', () => {
      expect(generator.config).toBeDefined();
      expect(generator.outputDir).toBeTruthy();
    });
  });

  describe('generateMarkdownReport', () => {
    const mockResults = [
      {
        workflowId: '1',
        workflowName: 'WF1',
        workflowCode: 'TST-001',
        layer: 'A',
        status: 'success',
        duration: 100
      },
      {
        workflowId: '2',
        workflowName: 'WF2',
        workflowCode: 'TST-002',
        layer: 'B',
        status: 'success',
        duration: 150
      },
      {
        workflowId: '3',
        workflowName: 'WF3',
        workflowCode: 'TST-003',
        layer: 'A',
        status: 'failed',
        error: 'Network error',
        duration: 200
      }
    ];

    const mockMetadata = {
      timestamp: '2025-10-02T19:30:00Z',
      mode: 'production',
      duration: 5800
    };

    it('should generate complete Markdown report', () => {
      const report = generator.generateMarkdownReport(mockResults, mockMetadata);

      expect(report).toContain('# Tag Layer Application Report');
      expect(report).toContain('PRODUCTION');
      expect(report).toContain('Sumario Executivo');
      expect(report).toContain('Total workflows processados');
    });

    it('should include header section', () => {
      const report = generator.generateMarkdownReport(mockResults, mockMetadata);

      expect(report).toContain('Gerado em:');
      expect(report).toContain('2025-10-02T19:30:00Z');
      expect(report).toContain('Modo de execucao: production');
    });

    it('should include dry-run mode in header', () => {
      const dryRunMetadata = { ...mockMetadata, mode: 'dry-run' };
      const report = generator.generateMarkdownReport(mockResults, dryRunMetadata);

      expect(report).toContain('DRY-RUN MODE');
    });

    it('should calculate correct success statistics', () => {
      const report = generator.generateMarkdownReport(mockResults, mockMetadata);

      expect(report).toContain('Sucesso: 2');
      expect(report).toContain('Falhas: 1');
    });

    it('should include success list', () => {
      const report = generator.generateMarkdownReport(mockResults, mockMetadata);

      expect(report).toContain('TST-001');
      expect(report).toContain('TST-002');
    });

    it('should include failure list', () => {
      const report = generator.generateMarkdownReport(mockResults, mockMetadata);

      expect(report).toContain('TST-003');
      expect(report).toContain('Network error');
    });

    it('should include layer statistics', () => {
      const report = generator.generateMarkdownReport(mockResults, mockMetadata);

      expect(report).toContain('Layer A');
      expect(report).toContain('Layer B');
    });

    it('should include performance metrics', () => {
      const report = generator.generateMarkdownReport(mockResults, mockMetadata);

      expect(report).toContain('workflows/s');
    });

    it('should handle empty results', () => {
      const report = generator.generateMarkdownReport([], mockMetadata);

      expect(report).toContain('Total workflows processados: 0');
    });

    it('should handle results with no failures', () => {
      const successResults = mockResults.filter(r => r.status === 'success');
      const report = generator.generateMarkdownReport(successResults, mockMetadata);

      expect(report).toContain('Falhas: 0');
      expect(report).not.toContain('Workflows com Falha');
    });
  });

  describe('saveReport', () => {
    beforeEach(() => {
      fs.existsSync.mockReturnValue(false);
      fs.mkdirSync.mockImplementation(() => {});
      fs.writeFileSync.mockImplementation(() => {});
    });

    it('should create output directory if it does not exist', () => {
      const reportContent = '# Test Report';

      generator.saveReport(reportContent);

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        generator.outputDir,
        { recursive: true }
      );
    });

    it('should write report to file', () => {
      const reportContent = '# Test Report';

      generator.saveReport(reportContent);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.any(String),
        reportContent,
        'utf8'
      );
    });

    it('should return file path', () => {
      const reportContent = '# Test Report';

      const filePath = generator.saveReport(reportContent);

      expect(filePath).toBeTruthy();
      expect(typeof filePath).toBe('string');
    });

    it('should use custom filename if provided', () => {
      const reportContent = '# Test Report';
      const customFilename = 'custom-report.md';

      const filePath = generator.saveReport(reportContent, customFilename);

      expect(filePath).toContain(customFilename);
    });

    it('should not create directory if it already exists', () => {
      fs.existsSync.mockReturnValue(true);
      const reportContent = '# Test Report';

      generator.saveReport(reportContent);

      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('groupByLayer', () => {
    it('should group results by layer', () => {
      const results = [
        { workflowId: '1', layer: 'A', status: 'success' },
        { workflowId: '2', layer: 'B', status: 'success' },
        { workflowId: '3', layer: 'A', status: 'success' },
        { workflowId: '4', layer: 'C', status: 'success' }
      ];

      const grouped = generator.groupByLayer(results);

      expect(grouped.get('A')).toHaveLength(2);
      expect(grouped.get('B')).toHaveLength(1);
      expect(grouped.get('C')).toHaveLength(1);
    });

    it('should initialize all layers even if empty', () => {
      const results = [
        { workflowId: '1', layer: 'A', status: 'success' }
      ];

      const grouped = generator.groupByLayer(results);

      Object.keys(LAYERS).forEach(layer => {
        expect(grouped.has(layer)).toBe(true);
      });
    });

    it('should handle empty results', () => {
      const grouped = generator.groupByLayer([]);

      Object.keys(LAYERS).forEach(layer => {
        expect(grouped.get(layer)).toEqual([]);
      });
    });

    it('should handle unknown layers', () => {
      const results = [
        { workflowId: '1', layer: 'Unknown', status: 'success' }
      ];

      const grouped = generator.groupByLayer(results);

      expect(grouped.has('Unknown')).toBe(true);
      expect(grouped.get('Unknown')).toHaveLength(1);
    });
  });

  describe('printToConsole', () => {
    let consoleSpy;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should print report to console', () => {
      const content = '# Test Report\n## Section\nContent here';

      generator.printToConsole(content);

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should colorize headers', () => {
      const content = '# Header';

      generator.printToConsole(content);

      const calledWith = consoleSpy.mock.calls[0][0];
      expect(calledWith).toContain('\x1b['); // ANSI escape code
    });

    it('should colorize emojis', () => {
      const content = '✅ Success ❌ Failure ⚠️ Warning';

      generator.printToConsole(content);

      const calledWith = consoleSpy.mock.calls[0][0];
      expect(calledWith).toContain('\x1b['); // ANSI escape code
    });
  });

  describe('_generateFilename', () => {
    it('should generate filename with timestamp pattern', () => {
      const filename = generator._generateFilename();

      expect(filename).toMatch(/apply-tags-report-\d{4}-\d{2}-\d{2}-\d{6}\.md/);
    });
  });

  describe('_generateHeader', () => {
    it('should generate header with production mode', () => {
      const metadata = {
        timestamp: '2025-10-02T19:30:00Z',
        mode: 'production',
        duration: 5000
      };

      const header = generator._generateHeader(metadata);

      expect(header).toContain('PRODUCTION');
      expect(header).toContain('2025-10-02T19:30:00Z');
    });

    it('should generate header with dry-run mode', () => {
      const metadata = {
        timestamp: '2025-10-02T19:30:00Z',
        mode: 'dry-run',
        duration: 5000
      };

      const header = generator._generateHeader(metadata);

      expect(header).toContain('DRY-RUN MODE');
    });
  });

  describe('_generateSummary', () => {
    it('should calculate statistics correctly', () => {
      const results = [
        { status: 'success' },
        { status: 'success' },
        { status: 'failed' },
        { status: 'skipped' }
      ];
      const metadata = { duration: 4000 };

      const summary = generator._generateSummary(results, metadata);

      expect(summary).toContain('Total workflows processados:** 4');
      expect(summary).toContain('Sucesso:** 2');
      expect(summary).toContain('Falhas:** 1');
      expect(summary).toContain('Ignorados:** 1');
    });

    it('should calculate success rate', () => {
      const results = [
        { status: 'success' },
        { status: 'success' },
        { status: 'failed' },
        { status: 'failed' }
      ];
      const metadata = { duration: 4000 };

      const summary = generator._generateSummary(results, metadata);

      expect(summary).toContain('50.0%'); // 50% success rate
    });

    it('should calculate throughput', () => {
      const results = Array(10).fill({ status: 'success' });
      const metadata = { duration: 5000 }; // 5 seconds

      const summary = generator._generateSummary(results, metadata);

      expect(summary).toContain('workflows/s');
    });
  });
});
