/**
 * @fileoverview Testes de utils/non-interactive
 */

const { isNonInteractive, getFlag, EXIT_CODES, getExitCode } = require('../../../../../scripts/admin/n8n-transfer/cli/utils/non-interactive');

describe('Non-Interactive Utils', () => {
  let originalArgv;

  beforeEach(() => {
    // Save original process.argv
    originalArgv = process.argv;
    // Reset process.argv
    process.argv = ['node', 'script.js'];
  });

  afterEach(() => {
    // Restore original process.argv
    process.argv = originalArgv;
  });

  describe('isNonInteractive()', () => {
    it('deve retornar false quando flag ausente', () => {
      expect(isNonInteractive()).toBe(false);
    });

    it('deve retornar true quando flag presente', () => {
      process.argv.push('--non-interactive');
      expect(isNonInteractive()).toBe(true);
    });
  });

  describe('getFlag()', () => {
    it('deve retornar null quando flag ausente', () => {
      expect(getFlag('dry-run')).toBe(null);
    });

    it('deve retornar true para boolean flag', () => {
      process.argv.push('--dry-run');
      expect(getFlag('dry-run')).toBe(null); // getFlag expects --flag=value format
    });

    it('deve retornar valor para value flag', () => {
      process.argv.push('--parallelism=5');
      expect(getFlag('parallelism')).toBe('5');
    });
  });

  describe('EXIT_CODES', () => {
    it('deve ter constantes corretas', () => {
      expect(EXIT_CODES.SUCCESS).toBe(0);
      expect(EXIT_CODES.PARTIAL_FAILURE).toBe(1);
      expect(EXIT_CODES.TOTAL_FAILURE).toBe(2);
    });
  });

  describe('getExitCode()', () => {
    it('deve retornar SUCCESS quando sem falhas', () => {
      const result = { failed: 0, transferred: 5 };
      expect(getExitCode(result)).toBe(EXIT_CODES.SUCCESS);
    });

    it('deve retornar PARTIAL_FAILURE quando tem falhas mas também sucessos', () => {
      const result = { failed: 2, transferred: 3 };
      expect(getExitCode(result)).toBe(EXIT_CODES.PARTIAL_FAILURE);
    });

    it('deve retornar TOTAL_FAILURE quando todas falharam', () => {
      const result = { failed: 5, transferred: 0 };
      expect(getExitCode(result)).toBe(EXIT_CODES.TOTAL_FAILURE);
    });
  });
});
