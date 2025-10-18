/**
 * Testes unitários para WorkflowValidationService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkflowValidationService } from '../WorkflowValidationService';
import { ValidationError } from '../errors';
import { DEFAULT_VALIDATION_CONFIG } from '../../../types/validation';
import type { N8NWorkflow } from '../../../types/validation';

describe('WorkflowValidationService', () => {
  let service: WorkflowValidationService;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    service = new WorkflowValidationService(DEFAULT_VALIDATION_CONFIG, mockLogger);
  });

  describe('validateWorkflows()', () => {
    it('should pass validation when no duplicates exist', () => {
      const workflows: N8NWorkflow[] = [
        {
          id: 'wf-1',
          name: '(ERR-OUT-001) Error Handler',
          active: true,
          nodes: [],
          connections: {},
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
        {
          id: 'wf-2',
          name: '(LOG-IN-001) Logger',
          active: true,
          nodes: [],
          connections: {},
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
      ];

      const result = service.validateWorkflows(workflows);

      expect(result.valid).toBe(true);
      expect(result.duplicates).toEqual([]);
      expect(result.totalWorkflows).toBe(2);
      expect(result.validatedAt).toBeInstanceOf(Date);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Validation successful'),
        expect.objectContaining({ duration_ms: expect.any(Number) })
      );
    });

    it('should throw ValidationError when duplicates detected', () => {
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

      expect(() => service.validateWorkflows(workflows)).toThrow(ValidationError);

      try {
        service.validateWorkflows(workflows);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).messages.length).toBeGreaterThan(0);
        expect((error as ValidationError).duplicates).toHaveLength(1);
        expect((error as ValidationError).duplicates[0].internalID).toBe('(ERR-OUT-001)');
        expect((error as ValidationError).duplicates[0].suggestions).toContain('(ERR-OUT-002)');
      }
    });

    it('should handle empty workflow array', () => {
      const result = service.validateWorkflows([]);

      expect(result.valid).toBe(true);
      expect(result.duplicates).toEqual([]);
      expect(result.totalWorkflows).toBe(0);
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
          name: 'Random Workflow Without ID',
          active: true,
          nodes: [],
          connections: {},
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
      ];

      const result = service.validateWorkflows(workflows);

      expect(result.valid).toBe(true);
      expect(result.totalWorkflows).toBe(2);
    });

    it('should detect multiple duplicates across different ID patterns', () => {
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
        {
          id: 'wf-3',
          name: '(LOG-IN-001) Logger A',
          active: true,
          nodes: [],
          connections: {},
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
        {
          id: 'wf-4',
          name: '(LOG-IN-001) Logger B',
          active: true,
          nodes: [],
          connections: {},
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
      ];

      expect(() => service.validateWorkflows(workflows)).toThrow(ValidationError);

      try {
        service.validateWorkflows(workflows);
      } catch (error) {
        const validationError = error as ValidationError;
        expect(validationError.duplicates).toHaveLength(2);
        expect(validationError.duplicates.some(d => d.internalID === '(ERR-OUT-001)')).toBe(true);
        expect(validationError.duplicates.some(d => d.internalID === '(LOG-IN-001)')).toBe(true);
      }
    });
  });

  describe('validateWorkflowsNonBlocking()', () => {
    it('should return report without throwing when duplicates exist', () => {
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

      const report = service.validateWorkflowsNonBlocking(workflows);

      expect(report.valid).toBe(false);
      expect(report.duplicates).toHaveLength(1);
      expect(report.totalWorkflows).toBe(2);
      expect(report.messages).toHaveLength(1);
      expect(report.messages[0]).toContain('(ERR-OUT-001)');
    });

    it('should return valid report when no duplicates', () => {
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
      ];

      const report = service.validateWorkflowsNonBlocking(workflows);

      expect(report.valid).toBe(true);
      expect(report.duplicates).toEqual([]);
      expect(report.messages).toHaveLength(0);
    });
  });

  describe('generateReport()', () => {
    it('should generate success report when no duplicates', () => {
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
      ];

      const report = service.generateReport(workflows);

      expect(report).toContain('✅');
      expect(report).toContain('1'); // workflow count
      expect(report).toContain('Nenhuma duplicata detectada');
    });

    it('should generate detailed report when duplicates exist', () => {
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

      const report = service.generateReport(workflows);

      expect(report).toContain('(ERR-OUT-001)');
      expect(report).toContain('wf-1');
      expect(report).toContain('wf-2');
      expect(report).toContain('(ERR-OUT-002)'); // suggestion
      expect(report).toContain('Validação de Workflows');
    });
  });

  describe('performance monitoring', () => {
    it('should log performance metrics', () => {
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
      ];

      service.validateWorkflows(workflows);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Validation successful'),
        expect.objectContaining({
          duration_ms: expect.any(Number),
        })
      );
    });
  });

  describe('integration with all components', () => {
    it('should integrate extractor, detector, suggester, and formatter', () => {
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
          tags: [],
          nodes: [],
          connections: {},
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
      ];

      try {
        service.validateWorkflows(workflows);
        expect.fail('Should have thrown ValidationError');
      } catch (error) {
        const validationError = error as ValidationError;

        // Verifica que InternalIDExtractor funcionou
        expect(validationError.duplicates[0].internalID).toBe('(ERR-OUT-001)');

        // Verifica que DuplicateIDDetector funcionou
        expect(validationError.duplicates[0].n8nIDs).toEqual(['wf-1', 'wf-2']);

        // Verifica que IDSuggestionEngine funcionou
        expect(validationError.duplicates[0].suggestions).toContain('(ERR-OUT-002)');

        // Verifica que ErrorMessageFormatter funcionou
        expect(validationError.messages[0]).toContain('📍');
        expect(validationError.messages[0]).toContain('(ERR-OUT-001)');
        expect(validationError.messages[0]).toContain('→ Sugestão');
      }
    });
  });
});
