/**
 * Testes unitários para ErrorMessageFormatter
 */

import { describe, it, expect } from 'vitest';
import { ErrorMessageFormatter } from '../ErrorMessageFormatter';
import type { EnrichedDuplicateInfo } from '../../../types/validation';

describe('ErrorMessageFormatter', () => {
  const formatter = new ErrorMessageFormatter();

  describe('formatSingle()', () => {
    it('should format single duplicate with suggestions', () => {
      const duplicate: EnrichedDuplicateInfo = {
        internalID: '(ERR-OUT-001)',
        n8nIDs: ['wf-1', 'wf-2'],
        count: 2,
        suggestions: ['(ERR-OUT-002)'],
      };

      const message = formatter.formatSingle(duplicate);

      expect(message).toContain('(ERR-OUT-001)');
      expect(message).toContain('2 workflows');
      expect(message).toContain('wf-1');
      expect(message).toContain('wf-2');
      expect(message).toContain('(ERR-OUT-002)');
      expect(message).toContain('→ Sugestão');
    });

    it('should not suggest for first workflow (keeps original ID)', () => {
      const duplicate: EnrichedDuplicateInfo = {
        internalID: '(ERR-OUT-001)',
        n8nIDs: ['wf-1', 'wf-2'],
        count: 2,
        suggestions: ['(ERR-OUT-002)'],
      };

      const message = formatter.formatSingle(duplicate);

      // Primeira linha não deve ter sugestão
      const lines = message.split('\n');
      const firstWorkflowLine = lines.find(l => l.includes('wf-1'));
      const secondWorkflowLine = lines.find(l => l.includes('wf-2'));

      expect(firstWorkflowLine).not.toContain('→ Sugestão');
      expect(message).toContain('wf-2');
    });

    it('should handle multiple suggestions', () => {
      const duplicate: EnrichedDuplicateInfo = {
        internalID: '(LOG-IN-001)',
        n8nIDs: ['wf-1', 'wf-2', 'wf-3'],
        count: 3,
        suggestions: ['(LOG-IN-002)', '(LOG-IN-003)'],
      };

      const message = formatter.formatSingle(duplicate);

      expect(message).toContain('(LOG-IN-002)');
      expect(message).toContain('(LOG-IN-003)');
    });
  });

  describe('format()', () => {
    it('should format header and footer correctly', () => {
      const duplicates: EnrichedDuplicateInfo[] = [
        {
          internalID: '(ERR-OUT-001)',
          n8nIDs: ['wf-1', 'wf-2'],
          count: 2,
          suggestions: ['(ERR-OUT-002)'],
        },
      ];

      const messages = formatter.format(duplicates);

      const fullMessage = messages.join('\n');

      expect(fullMessage).toContain('❌ Detectadas 1 duplicatas');
      expect(fullMessage).toContain('💡 Corrija os IDs duplicados no n8n');
    });

    it('should format multiple duplicates', () => {
      const duplicates: EnrichedDuplicateInfo[] = [
        {
          internalID: '(ERR-OUT-001)',
          n8nIDs: ['wf-1', 'wf-2'],
          count: 2,
          suggestions: ['(ERR-OUT-002)'],
        },
        {
          internalID: '(LOG-IN-001)',
          n8nIDs: ['wf-3', 'wf-4'],
          count: 2,
          suggestions: ['(LOG-IN-002)'],
        },
      ];

      const messages = formatter.format(duplicates);
      const fullMessage = messages.join('\n');

      expect(fullMessage).toContain('❌ Detectadas 2 duplicatas');
      expect(fullMessage).toContain('(ERR-OUT-001)');
      expect(fullMessage).toContain('(LOG-IN-001)');
    });

    it('should return array of strings', () => {
      const duplicates: EnrichedDuplicateInfo[] = [
        {
          internalID: '(ERR-OUT-001)',
          n8nIDs: ['wf-1', 'wf-2'],
          count: 2,
          suggestions: ['(ERR-OUT-002)'],
        },
      ];

      const messages = formatter.format(duplicates);

      expect(Array.isArray(messages)).toBe(true);
      expect(messages.every(m => typeof m === 'string')).toBe(true);
    });
  });

  describe('formatCompact()', () => {
    it('should format compact one-liner per duplicate', () => {
      const duplicates: EnrichedDuplicateInfo[] = [
        {
          internalID: '(ERR-OUT-001)',
          n8nIDs: ['wf-1', 'wf-2'],
          count: 2,
          suggestions: ['(ERR-OUT-002)'],
        },
      ];

      const messages = formatter.formatCompact(duplicates);

      expect(messages).toHaveLength(1);
      expect(messages[0]).toContain('(ERR-OUT-001)');
      expect(messages[0]).toContain('2 workflows');
      expect(messages[0]).toContain('(ERR-OUT-002)');
    });

    it('should handle duplicate without suggestions', () => {
      const duplicates: EnrichedDuplicateInfo[] = [
        {
          internalID: '(ERR-OUT-001)',
          n8nIDs: ['wf-1', 'wf-2'],
          count: 2,
          suggestions: [],
        },
      ];

      const messages = formatter.formatCompact(duplicates);

      expect(messages[0]).toContain('N/A'); // Sem sugestão
    });
  });

  describe('formatSuccess()', () => {
    it('should format success message', () => {
      const messages = formatter.formatSuccess(35);

      const fullMessage = messages.join('\n');

      expect(fullMessage).toContain('✅ Download concluído com sucesso');
      expect(fullMessage).toContain('35');
      expect(fullMessage).toContain('Nenhuma duplicata detectada');
    });
  });

  describe('formatLogHeader()', () => {
    it('should format log header with stats', () => {
      const header = formatter.formatLogHeader(2, 35);

      expect(header).toContain('Validação de Workflows');
      expect(header).toContain('Total de workflows: 35');
      expect(header).toContain('Duplicatas encontradas: 2');
      expect(header).toContain('═'); // Separadores
    });

    it('should include timestamp', () => {
      const header = formatter.formatLogHeader(0, 10);

      expect(header).toMatch(/\d{4}-\d{2}-\d{2}/); // ISO date format
    });
  });
});
