/**
 * Testes unitários para InternalIDExtractor
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InternalIDExtractor } from '../InternalIDExtractor';
import { DEFAULT_VALIDATION_CONFIG } from '../../../types/validation';
import type { N8NWorkflow } from '../../../types/validation';

describe('InternalIDExtractor', () => {
  let extractor: InternalIDExtractor;

  beforeEach(() => {
    extractor = new InternalIDExtractor(DEFAULT_VALIDATION_CONFIG);
  });

  describe('extractSingleID()', () => {
    it('should extract ID from workflow name', () => {
      const workflow: N8NWorkflow = {
        id: 'wf-123',
        name: '(ERR-OUT-001) Error Handler',
        active: true,
        nodes: [],
        connections: {},
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      };

      const id = extractor.extractSingleID(workflow);
      expect(id).toBe('(ERR-OUT-001)');
    });

    it('should extract ID from tags if not in name', () => {
      const workflow: N8NWorkflow = {
        id: 'wf-123',
        name: 'Error Handler',
        active: true,
        tags: ['(LOG-IN-042)'],
        nodes: [],
        connections: {},
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      };

      const id = extractor.extractSingleID(workflow);
      expect(id).toBe('(LOG-IN-042)');
    });

    it('should return null if no valid ID found', () => {
      const workflow: N8NWorkflow = {
        id: 'wf-123',
        name: 'Random Workflow',
        active: true,
        nodes: [],
        connections: {},
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      };

      const id = extractor.extractSingleID(workflow);
      expect(id).toBeNull();
    });

    it('should normalize ID to uppercase', () => {
      const workflow: N8NWorkflow = {
        id: 'wf-123',
        name: '(err-out-001) Handler',
        active: true,
        nodes: [],
        connections: {},
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      };

      const id = extractor.extractSingleID(workflow);
      expect(id).toBe('(ERR-OUT-001)');
    });

    it('should handle workflows with whitespace in ID', () => {
      const workflow: N8NWorkflow = {
        id: 'wf-123',
        name: '  (ERR-OUT-001)  Handler',
        active: true,
        nodes: [],
        connections: {},
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      };

      const id = extractor.extractSingleID(workflow);
      expect(id).toBe('(ERR-OUT-001)');
    });
  });

  describe('extractInternalIDs()', () => {
    it('should create map of unique IDs to workflow IDs', () => {
      const workflows: N8NWorkflow[] = [
        {
          id: 'wf-1',
          name: '(ERR-OUT-001) Handler A',
          active: true,
          nodes: [],
          connections: {},
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
        {
          id: 'wf-2',
          name: '(ERR-OUT-002) Handler B',
          active: true,
          nodes: [],
          connections: {},
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
      ];

      const idMap = extractor.extractInternalIDs(workflows);

      expect(idMap.size).toBe(2);
      expect(idMap.get('(ERR-OUT-001)')).toEqual(['wf-1']);
      expect(idMap.get('(ERR-OUT-002)')).toEqual(['wf-2']);
    });

    it('should group duplicate IDs correctly', () => {
      const workflows: N8NWorkflow[] = [
        {
          id: 'wf-1',
          name: '(ERR-OUT-001) Handler A',
          active: true,
          nodes: [],
          connections: {},
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
        {
          id: 'wf-2',
          name: '(ERR-OUT-001) Handler B',
          active: true,
          nodes: [],
          connections: {},
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
      ];

      const idMap = extractor.extractInternalIDs(workflows);

      expect(idMap.size).toBe(1);
      expect(idMap.get('(ERR-OUT-001)')).toEqual(['wf-1', 'wf-2']);
    });

    it('should ignore workflows without valid IDs', () => {
      const workflows: N8NWorkflow[] = [
        {
          id: 'wf-1',
          name: '(ERR-OUT-001) Handler',
          active: true,
          nodes: [],
          connections: {},
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
        {
          id: 'wf-2',
          name: 'Random Workflow',
          active: true,
          nodes: [],
          connections: {},
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
      ];

      const idMap = extractor.extractInternalIDs(workflows);

      expect(idMap.size).toBe(1);
      expect(idMap.has('(ERR-OUT-001)')).toBe(true);
    });

    it('should handle empty workflow array', () => {
      const idMap = extractor.extractInternalIDs([]);
      expect(idMap.size).toBe(0);
    });
  });

  describe('custom regex pattern', () => {
    it('should use custom pattern from config', () => {
      const customExtractor = new InternalIDExtractor({
        idPattern: String.raw`\[ID-\d{2}\]`,
        strict: true,
        maxDuplicates: 100,
        logPath: '.jana/logs/test.log',
      });

      const workflow: N8NWorkflow = {
        id: 'wf-1',
        name: '[ID-42] Custom Pattern',
        active: true,
        nodes: [],
        connections: {},
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      };

      const id = customExtractor.extractSingleID(workflow);
      expect(id).toBe('[ID-42]');
    });
  });
});
