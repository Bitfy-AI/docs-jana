/**
 * @fileoverview Testes de UI components
 */

const { colors, title, success, error, warning, info } = require('../../../../scripts/admin/n8n-transfer/cli/ui/components/formatter');

describe('UI Components - Formatter', () => {
  describe('colors', () => {
    it('deve ter todos wrappers de cores', () => {
      expect(colors.primary).toBeDefined();
      expect(colors.success).toBeDefined();
      expect(colors.error).toBeDefined();
      expect(colors.warning).toBeDefined();
      expect(colors.info).toBeDefined();
    });
  });

  describe('title()', () => {
    it('deve formatar título', () => {
      const result = title('Test Title');
      expect(result).toContain('Test Title');
    });
  });

  describe('success()', () => {
    it('deve formatar mensagem de sucesso com ✓', () => {
      const result = success('Operation completed');
      expect(result).toContain('✓');
      expect(result).toContain('Operation completed');
    });
  });

  describe('error()', () => {
    it('deve formatar mensagem de erro com ✗', () => {
      const result = error('Operation failed');
      expect(result).toContain('✗');
      expect(result).toContain('Operation failed');
    });
  });

  describe('warning()', () => {
    it('deve formatar mensagem de warning com ⚠', () => {
      const result = warning('Warning message');
      expect(result).toContain('⚠');
      expect(result).toContain('Warning message');
    });
  });

  describe('info()', () => {
    it('deve formatar mensagem de info com ℹ', () => {
      const result = info('Info message');
      expect(result).toContain('ℹ');
      expect(result).toContain('Info message');
    });
  });
});

describe('ProgressBar', () => {
  it('deve criar ProgressBar sem erros', () => {
    const ProgressBar = require('../../../../scripts/admin/n8n-transfer/cli/ui/progress-bar');

    expect(() => {
      const bar = new ProgressBar(100);
      bar.stop();
    }).not.toThrow();
  });
});
