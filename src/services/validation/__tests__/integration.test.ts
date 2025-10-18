/**
 * Testes de integração end-to-end do sistema de validação
 *
 * Simula o fluxo completo:
 * 1. Download de workflows do n8n
 * 2. Validação de IDs duplicados
 * 3. Geração de relatórios
 * 4. Formatação de mensagens de erro
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorkflowValidationService } from '../WorkflowValidationService';
import { ConfigReader } from '../ConfigReader';
import { ValidationReportGenerator } from '../ValidationReportGenerator';
import { ValidationError } from '../errors';
import type { N8NWorkflow } from '../../../types/validation';
import fs from 'fs';

describe('Integration: Workflow Validation End-to-End', () => {
  let service: WorkflowValidationService;
  let reportGenerator: ValidationReportGenerator;
  let mockLogger: any;
  const testLogPath = '.jana/logs/integration-test.json';

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const configReader = new ConfigReader();
    const config = configReader.read();

    service = new WorkflowValidationService(config, mockLogger);
    reportGenerator = new ValidationReportGenerator();
  });

  afterEach(() => {
    if (fs.existsSync(testLogPath)) {
      fs.unlinkSync(testLogPath);
    }
  });

  describe('Scenario 1: Clean download - no duplicates', () => {
    it('should complete full flow without errors', () => {
      // Simula workflows retornados da API do n8n
      const workflows: N8NWorkflow[] = [
        {
          id: 'n8n-abc123',
          name: '(ERR-OUT-001) Error Handler Principal',
          active: true,
          nodes: [],
          connections: {},
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
        {
          id: 'n8n-def456',
          name: '(LOG-IN-001) Sistema de Logs',
          active: true,
          nodes: [],
          connections: {},
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
        {
          id: 'n8n-ghi789',
          name: '(BCO-UPS-001) Upsert Banco',
          active: true,
          nodes: [],
          connections: {},
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
      ];

      // 1. Validação
      const result = service.validateWorkflows(workflows);

      expect(result.valid).toBe(true);
      expect(result.duplicates).toEqual([]);
      expect(result.totalWorkflows).toBe(3);

      // 2. Geração de relatório de sucesso
      const report = service.generateReport(workflows);

      expect(report).toContain('✅');
      expect(report).toContain('Nenhuma duplicata encontrada');

      // 3. Logger deve ter sido chamado
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Validation successful'),
        expect.any(Object)
      );
    });
  });

  describe('Scenario 2: Duplicate detection and error handling', () => {
    it('should detect duplicates, generate suggestions, format errors, and save report', () => {
      const workflows: N8NWorkflow[] = [
        {
          id: 'n8n-abc123',
          name: '(ERR-OUT-001) Error Handler A',
          active: true,
          nodes: [],
          connections: {},
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
        {
          id: 'n8n-def456',
          name: '(ERR-OUT-001) Error Handler B',
          active: true,
          nodes: [],
          connections: {},
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
        {
          id: 'n8n-ghi789',
          name: '(LOG-IN-001) Logger A',
          active: true,
          nodes: [],
          connections: {},
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
        {
          id: 'n8n-jkl012',
          name: '(LOG-IN-001) Logger B',
          active: true,
          nodes: [],
          connections: {},
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
      ];

      // 1. Validação deve lançar erro
      expect(() => service.validateWorkflows(workflows)).toThrow(ValidationError);

      try {
        service.validateWorkflows(workflows);
        expect.fail('Should have thrown ValidationError');
      } catch (error) {
        const validationError = error as ValidationError;

        // 2. Verificar estrutura do erro
        expect(validationError).toBeInstanceOf(ValidationError);
        expect(validationError.name).toBe('ValidationError');
        expect(validationError.messages).toHaveLength(4); // header + 2 duplicates + footer

        // 3. Verificar duplicatas detectadas
        expect(validationError.duplicates).toHaveLength(2);

        const errOutDup = validationError.duplicates.find(d => d.internalID === '(ERR-OUT-001)');
        const logInDup = validationError.duplicates.find(d => d.internalID === '(LOG-IN-001)');

        expect(errOutDup).toBeDefined();
        expect(errOutDup?.n8nIDs).toEqual(['n8n-abc123', 'n8n-def456']);
        expect(errOutDup?.suggestions).toContain('(ERR-OUT-002)');

        expect(logInDup).toBeDefined();
        expect(logInDup?.n8nIDs).toEqual(['n8n-ghi789', 'n8n-jkl012']);
        expect(logInDup?.suggestions).toContain('(LOG-IN-002)');

        // 4. Verificar formatação das mensagens
        const fullMessage = validationError.messages.join('\n');

        expect(fullMessage).toContain('❌ Detectadas 2 duplicatas');
        expect(fullMessage).toContain('📍 ID interno: (ERR-OUT-001)');
        expect(fullMessage).toContain('→ Sugestão: Alterar para (ERR-OUT-002)');
        expect(fullMessage).toContain('📍 ID interno: (LOG-IN-001)');
        expect(fullMessage).toContain('→ Sugestão: Alterar para (LOG-IN-002)');
        expect(fullMessage).toContain('💡 Corrija os IDs duplicados');

        // 5. Salvar relatório JSON
        const savedPath = reportGenerator.saveReport(
          workflows.length,
          validationError.duplicates,
          testLogPath
        );

        expect(savedPath).toBe(testLogPath);
        expect(fs.existsSync(testLogPath)).toBe(true);

        // 6. Ler e validar relatório salvo
        const report = reportGenerator.readReport(testLogPath);

        expect(report).toBeDefined();
        expect(report?.totalWorkflows).toBe(4);
        expect(report?.duplicatesFound).toBe(2);
        expect(report?.duplicates).toHaveLength(2);

        // 7. Formatar sumário do relatório
        const summary = reportGenerator.formatReportSummary(report!);

        expect(summary).toContain('Relatório de Validação');
        expect(summary).toContain('Total de workflows: 4');
        expect(summary).toContain('Duplicatas encontradas: 2');
      }
    });
  });

  describe('Scenario 3: Mixed workflows (with and without IDs)', () => {
    it('should only validate workflows with valid IDs', () => {
      const workflows: N8NWorkflow[] = [
        {
          id: 'n8n-001',
          name: '(ERR-OUT-001) Error Handler',
          active: true,
          nodes: [],
          connections: {},
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
        {
          id: 'n8n-002',
          name: 'Workflow sem ID interno',
          active: true,
          nodes: [],
          connections: {},
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
        {
          id: 'n8n-003',
          name: 'Outro workflow genérico',
          active: false,
          nodes: [],
          connections: {},
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
        {
          id: 'n8n-004',
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
      expect(result.totalWorkflows).toBe(4);
      expect(result.duplicates).toEqual([]);
    });
  });

  describe('Scenario 4: Performance with many workflows', () => {
    it('should validate 100 workflows efficiently', () => {
      const workflows: N8NWorkflow[] = Array.from({ length: 100 }, (_, i) => ({
        id: `n8n-${i}`,
        name: `(ERR-OUT-${String(i + 1).padStart(3, '0')}) Workflow ${i}`,
        active: true,
        nodes: [],
        connections: {},
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      }));

      const startTime = performance.now();
      const result = service.validateWorkflows(workflows);
      const duration = performance.now() - startTime;

      expect(result.valid).toBe(true);
      expect(result.totalWorkflows).toBe(100);
      expect(duration).toBeLessThan(500); // Should be < 500ms for 100 workflows

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Validation successful'),
        expect.objectContaining({
          duration_ms: expect.any(Number),
        })
      );
    });
  });

  describe('Scenario 5: Non-blocking validation mode', () => {
    it('should return report without throwing in non-blocking mode', () => {
      const workflows: N8NWorkflow[] = [
        {
          id: 'n8n-001',
          name: '(ERR-OUT-001) Handler A',
          active: true,
          nodes: [],
          connections: {},
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
        {
          id: 'n8n-002',
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
      expect(report.messages).toHaveLength(1);
      expect(report.messages[0]).toContain('(ERR-OUT-001)');
    });
  });

  describe('Scenario 6: Tag-based ID extraction', () => {
    it('should extract IDs from tags when not in name', () => {
      const workflows: N8NWorkflow[] = [
        {
          id: 'n8n-001',
          name: 'Error Handler Principal',
          active: true,
          tags: ['(ERR-OUT-001)', 'production'],
          nodes: [],
          connections: {},
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
        {
          id: 'n8n-002',
          name: 'Logger System',
          active: true,
          tags: ['(LOG-IN-001)', 'monitoring'],
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
  });

  describe('Scenario 7: Gap-finding in suggestions', () => {
    it('should suggest gap IDs before incrementing', () => {
      const workflows: N8NWorkflow[] = [
        {
          id: 'n8n-001',
          name: '(ERR-OUT-001) Handler A',
          active: true,
          nodes: [],
          connections: {},
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
        {
          id: 'n8n-002',
          name: '(ERR-OUT-001) Handler B',
          active: true,
          nodes: [],
          connections: {},
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
        {
          id: 'n8n-003',
          name: '(ERR-OUT-005) Handler C',
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
        const duplicate = validationError.duplicates[0];

        // Deve sugerir 002 (gap) antes de 006
        expect(duplicate.suggestions[0]).toBe('(ERR-OUT-002)');
      }
    });
  });
});
