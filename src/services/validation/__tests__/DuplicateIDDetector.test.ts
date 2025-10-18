/**
 * Testes unitários para DuplicateIDDetector
 */

import { describe, it, expect } from 'vitest';
import { DuplicateIDDetector } from '../DuplicateIDDetector';

describe('DuplicateIDDetector', () => {
  const detector = new DuplicateIDDetector();

  describe('findDuplicates()', () => {
    it('should return empty array when no duplicates', () => {
      const idMap = new Map([
        ['(ERR-OUT-001)', ['wf-1']],
        ['(ERR-OUT-002)', ['wf-2']],
        ['(LOG-IN-001)', ['wf-3']],
      ]);

      const duplicates = detector.findDuplicates(idMap);
      expect(duplicates).toEqual([]);
    });

    it('should detect single duplicate', () => {
      const idMap = new Map([
        ['(ERR-OUT-001)', ['wf-1', 'wf-2']],
        ['(ERR-OUT-002)', ['wf-3']],
      ]);

      const duplicates = detector.findDuplicates(idMap);

      expect(duplicates).toHaveLength(1);
      expect(duplicates[0]).toEqual({
        internalID: '(ERR-OUT-001)',
        n8nIDs: ['wf-1', 'wf-2'],
        count: 2,
      });
    });

    it('should detect multiple duplicates', () => {
      const idMap = new Map([
        ['(ERR-OUT-001)', ['wf-1', 'wf-2']],
        ['(LOG-IN-001)', ['wf-3', 'wf-4', 'wf-5']],
        ['(BCO-UPS-001)', ['wf-6']],
      ]);

      const duplicates = detector.findDuplicates(idMap);

      expect(duplicates).toHaveLength(2);
    });

    it('should sort duplicates by severity (count desc)', () => {
      const idMap = new Map([
        ['(ERR-OUT-001)', ['wf-1', 'wf-2']], // count: 2
        ['(LOG-IN-001)', ['wf-3', 'wf-4', 'wf-5']], // count: 3 (mais severo)
        ['(BCO-UPS-001)', ['wf-6', 'wf-7', 'wf-8', 'wf-9']], // count: 4 (mais severo ainda)
      ]);

      const duplicates = detector.findDuplicates(idMap);

      expect(duplicates[0].count).toBe(4); // BCO-UPS-001 primeiro
      expect(duplicates[1].count).toBe(3); // LOG-IN-001 segundo
      expect(duplicates[2].count).toBe(2); // ERR-OUT-001 terceiro
    });

    it('should handle empty idMap', () => {
      const duplicates = detector.findDuplicates(new Map());
      expect(duplicates).toEqual([]);
    });

    it('should handle 10+ occurrences of same ID', () => {
      const manyWorkflows = Array.from({ length: 12 }, (_, i) => `wf-${i}`);
      const idMap = new Map([['(ERR-OUT-001)', manyWorkflows]]);

      const duplicates = detector.findDuplicates(idMap);

      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].count).toBe(12);
      expect(duplicates[0].n8nIDs).toHaveLength(12);
    });
  });

  describe('isDuplicate()', () => {
    const idMap = new Map([
      ['(ERR-OUT-001)', ['wf-1', 'wf-2']],
      ['(ERR-OUT-002)', ['wf-3']],
    ]);

    it('should return true for duplicate ID', () => {
      expect(detector.isDuplicate('(ERR-OUT-001)', idMap)).toBe(true);
    });

    it('should return false for unique ID', () => {
      expect(detector.isDuplicate('(ERR-OUT-002)', idMap)).toBe(false);
    });

    it('should return false for non-existent ID', () => {
      expect(detector.isDuplicate('(UNKNOWN-ID-999)', idMap)).toBe(false);
    });
  });

  describe('countUniqueDuplicates()', () => {
    it('should count number of unique duplicate IDs', () => {
      const duplicates = [
        { internalID: '(ERR-OUT-001)', n8nIDs: ['wf-1', 'wf-2'], count: 2 },
        { internalID: '(LOG-IN-001)', n8nIDs: ['wf-3', 'wf-4'], count: 2 },
      ];

      expect(detector.countUniqueDuplicates(duplicates)).toBe(2);
    });

    it('should return 0 for empty array', () => {
      expect(detector.countUniqueDuplicates([])).toBe(0);
    });
  });

  describe('countAffectedWorkflows()', () => {
    it('should count total workflows affected by duplicates', () => {
      const duplicates = [
        { internalID: '(ERR-OUT-001)', n8nIDs: ['wf-1', 'wf-2'], count: 2 },
        { internalID: '(LOG-IN-001)', n8nIDs: ['wf-3', 'wf-4', 'wf-5'], count: 3 },
      ];

      expect(detector.countAffectedWorkflows(duplicates)).toBe(5); // 2 + 3
    });

    it('should return 0 for empty array', () => {
      expect(detector.countAffectedWorkflows([])).toBe(0);
    });
  });
});
