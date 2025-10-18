/**
 * Testes unitários para IDSuggestionEngine
 */

import { describe, it, expect } from 'vitest';
import { IDSuggestionEngine } from '../IDSuggestionEngine';
import type { DuplicateInfo } from '../../../types/validation';

describe('IDSuggestionEngine', () => {
  const engine = new IDSuggestionEngine();

  describe('suggestNextID()', () => {
    it('should suggest next sequential ID', () => {
      const usedIDs = new Set(['(ERR-OUT-001)', '(ERR-OUT-002)']);
      const suggestion = engine.suggestNextID('(ERR-OUT-001)', usedIDs);

      expect(suggestion).toBe('(ERR-OUT-003)');
    });

    it('should find gaps in sequence', () => {
      const usedIDs = new Set(['(ERR-OUT-001)', '(ERR-OUT-003)']);
      const suggestion = engine.suggestNextID('(ERR-OUT-001)', usedIDs);

      expect(suggestion).toBe('(ERR-OUT-002)'); // Gap em 002
    });

    it('should use zero-padding correctly', () => {
      const usedIDs = new Set(['(ERR-OUT-001)']);
      const suggestion = engine.suggestNextID('(ERR-OUT-001)', usedIDs);

      expect(suggestion).toBe('(ERR-OUT-002)'); // Não '(ERR-OUT-2)'
    });

    it('should return null if pattern not recognized', () => {
      const usedIDs = new Set();
      const suggestion = engine.suggestNextID('[INVALID-ID]', usedIDs);

      expect(suggestion).toBeNull();
    });

    it('should return null if exhausted (reached 999)', () => {
      // Simula todos IDs de 001 a 999 usados
      const usedIDs = new Set(
        Array.from({ length: 999 }, (_, i) => `(ERR-OUT-${String(i + 1).padStart(3, '0')})`)
      );

      const suggestion = engine.suggestNextID('(ERR-OUT-001)', usedIDs);
      expect(suggestion).toBeNull();
    });

    it('should handle different prefixes independently', () => {
      const usedIDs = new Set(['(ERR-OUT-001)', '(LOG-IN-001)']);

      const errSuggestion = engine.suggestNextID('(ERR-OUT-001)', usedIDs);
      const logSuggestion = engine.suggestNextID('(LOG-IN-001)', usedIDs);

      expect(errSuggestion).toBe('(ERR-OUT-002)');
      expect(logSuggestion).toBe('(LOG-IN-002)');
    });

    it('should skip already suggested IDs', () => {
      const usedIDs = new Set(['(ERR-OUT-001)']);

      const firstSuggestion = engine.suggestNextID('(ERR-OUT-001)', usedIDs);
      expect(firstSuggestion).toBe('(ERR-OUT-002)');

      // Adiciona primeira sugestão aos usados
      usedIDs.add(firstSuggestion!);

      const secondSuggestion = engine.suggestNextID('(ERR-OUT-001)', usedIDs);
      expect(secondSuggestion).toBe('(ERR-OUT-003)');
    });
  });

  describe('enrichWithSuggestions()', () => {
    it('should enrich duplicates with suggestions', () => {
      const duplicates: DuplicateInfo[] = [
        {
          internalID: '(ERR-OUT-001)',
          n8nIDs: ['wf-1', 'wf-2'],
          count: 2,
        },
      ];

      const idMap = new Map([
        ['(ERR-OUT-001)', ['wf-1', 'wf-2']],
      ]);

      const enriched = engine.enrichWithSuggestions(duplicates, idMap);

      expect(enriched).toHaveLength(1);
      expect(enriched[0].suggestions).toHaveLength(1); // count - 1 = 2 - 1 = 1
      expect(enriched[0].suggestions[0]).toBe('(ERR-OUT-002)');
    });

    it('should generate multiple suggestions for multiple duplicates', () => {
      const duplicates: DuplicateInfo[] = [
        {
          internalID: '(ERR-OUT-001)',
          n8nIDs: ['wf-1', 'wf-2', 'wf-3'],
          count: 3,
        },
      ];

      const idMap = new Map([
        ['(ERR-OUT-001)', ['wf-1', 'wf-2', 'wf-3']],
      ]);

      const enriched = engine.enrichWithSuggestions(duplicates, idMap);

      expect(enriched[0].suggestions).toHaveLength(2); // count - 1 = 3 - 1 = 2
      expect(enriched[0].suggestions).toContain('(ERR-OUT-002)');
      expect(enriched[0].suggestions).toContain('(ERR-OUT-003)');
    });

    it('should limit suggestions to max 3', () => {
      const duplicates: DuplicateInfo[] = [
        {
          internalID: '(ERR-OUT-001)',
          n8nIDs: ['wf-1', 'wf-2', 'wf-3', 'wf-4', 'wf-5', 'wf-6'],
          count: 6,
        },
      ];

      const idMap = new Map([
        ['(ERR-OUT-001)', ['wf-1', 'wf-2', 'wf-3', 'wf-4', 'wf-5', 'wf-6']],
      ]);

      const enriched = engine.enrichWithSuggestions(duplicates, idMap);

      expect(enriched[0].suggestions.length).toBeLessThanOrEqual(3);
    });

    it('should handle empty duplicates array', () => {
      const enriched = engine.enrichWithSuggestions([], new Map());
      expect(enriched).toEqual([]);
    });

    it('should not suggest already used IDs', () => {
      const duplicates: DuplicateInfo[] = [
        {
          internalID: '(ERR-OUT-001)',
          n8nIDs: ['wf-1', 'wf-2'],
          count: 2,
        },
      ];

      const idMap = new Map([
        ['(ERR-OUT-001)', ['wf-1', 'wf-2']],
        ['(ERR-OUT-002)', ['wf-3']], // Já existe
      ]);

      const enriched = engine.enrichWithSuggestions(duplicates, idMap);

      expect(enriched[0].suggestions[0]).toBe('(ERR-OUT-003)'); // Pula o 002
    });
  });

  describe('isValidSuggestion()', () => {
    it('should return true for unused ID', () => {
      const usedIDs = new Set(['(ERR-OUT-001)']);
      expect(engine.isValidSuggestion('(ERR-OUT-002)', usedIDs)).toBe(true);
    });

    it('should return false for used ID', () => {
      const usedIDs = new Set(['(ERR-OUT-001)', '(ERR-OUT-002)']);
      expect(engine.isValidSuggestion('(ERR-OUT-002)', usedIDs)).toBe(false);
    });
  });
});
