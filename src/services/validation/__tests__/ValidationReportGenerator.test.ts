/**
 * Testes unitários para ValidationReportGenerator
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ValidationReportGenerator } from '../ValidationReportGenerator';
import type { EnrichedDuplicateInfo } from '../../../types/validation';
import fs from 'fs';
import path from 'path';

describe('ValidationReportGenerator', () => {
  const generator = new ValidationReportGenerator();
  const testLogPath = '.jana/logs/test-validation-report.json';

  afterEach(() => {
    // Cleanup test files
    if (fs.existsSync(testLogPath)) {
      fs.unlinkSync(testLogPath);
    }
  });

  describe('generateJSON()', () => {
    it('should generate valid JSON report', () => {
      const duplicates: EnrichedDuplicateInfo[] = [
        {
          internalID: '(ERR-OUT-001)',
          n8nIDs: ['wf-1', 'wf-2'],
          count: 2,
          suggestions: ['(ERR-OUT-002)'],
        },
      ];

      const json = generator.generateJSON(35, duplicates);

      expect(json).toContain('"totalWorkflows": 35');
      expect(json).toContain('"duplicatesFound": 1');
      expect(json).toContain('"internalID": "(ERR-OUT-001)"');
      expect(json).toContain('"n8nIDs": ["wf-1","wf-2"]');
      expect(json).toContain('"suggestions": ["(ERR-OUT-002)"]');
      expect(json).toContain('"timestamp"');

      // Validate it's parseable JSON
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should include ISO timestamp', () => {
      const duplicates: EnrichedDuplicateInfo[] = [];
      const json = generator.generateJSON(10, duplicates);

      const parsed = JSON.parse(json);
      expect(parsed.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should handle empty duplicates array', () => {
      const json = generator.generateJSON(10, []);

      const parsed = JSON.parse(json);
      expect(parsed.totalWorkflows).toBe(10);
      expect(parsed.duplicatesFound).toBe(0);
      expect(parsed.duplicates).toEqual([]);
    });

    it('should handle multiple duplicates', () => {
      const duplicates: EnrichedDuplicateInfo[] = [
        {
          internalID: '(ERR-OUT-001)',
          n8nIDs: ['wf-1', 'wf-2'],
          count: 2,
          suggestions: ['(ERR-OUT-002)'],
        },
        {
          internalID: '(LOG-IN-001)',
          n8nIDs: ['wf-3', 'wf-4', 'wf-5'],
          count: 3,
          suggestions: ['(LOG-IN-002)', '(LOG-IN-003)'],
        },
      ];

      const json = generator.generateJSON(35, duplicates);
      const parsed = JSON.parse(json);

      expect(parsed.duplicatesFound).toBe(2);
      expect(parsed.duplicates).toHaveLength(2);
      expect(parsed.duplicates[0].internalID).toBe('(ERR-OUT-001)');
      expect(parsed.duplicates[1].internalID).toBe('(LOG-IN-001)');
    });

    it('should handle duplicates with empty suggestions', () => {
      const duplicates: EnrichedDuplicateInfo[] = [
        {
          internalID: '(ERR-OUT-001)',
          n8nIDs: ['wf-1', 'wf-2'],
          count: 2,
          suggestions: [],
        },
      ];

      const json = generator.generateJSON(10, duplicates);
      const parsed = JSON.parse(json);

      expect(parsed.duplicates[0].suggestions).toEqual([]);
    });
  });

  describe('saveReport()', () => {
    it('should save report to file', () => {
      const duplicates: EnrichedDuplicateInfo[] = [
        {
          internalID: '(ERR-OUT-001)',
          n8nIDs: ['wf-1', 'wf-2'],
          count: 2,
          suggestions: ['(ERR-OUT-002)'],
        },
      ];

      const savedPath = generator.saveReport(35, duplicates, testLogPath);

      expect(savedPath).toBe(testLogPath);
      expect(fs.existsSync(testLogPath)).toBe(true);

      const content = fs.readFileSync(testLogPath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.totalWorkflows).toBe(35);
      expect(parsed.duplicatesFound).toBe(1);
    });

    it('should create directory if not exists', () => {
      const deepPath = '.jana/logs/deep/nested/test-report.json';

      const savedPath = generator.saveReport(10, [], deepPath);

      expect(fs.existsSync(savedPath)).toBe(true);

      // Cleanup
      fs.unlinkSync(deepPath);
      fs.rmdirSync(path.dirname(deepPath), { recursive: true });
    });

    it('should use default path if not provided', () => {
      const duplicates: EnrichedDuplicateInfo[] = [];

      const savedPath = generator.saveReport(10, duplicates);

      expect(savedPath).toBe('.jana/logs/validation.log');
      expect(fs.existsSync(savedPath)).toBe(true);

      // Cleanup
      fs.unlinkSync(savedPath);
    });

    it('should overwrite existing report', () => {
      // First save
      generator.saveReport(10, [], testLogPath);
      const firstContent = fs.readFileSync(testLogPath, 'utf-8');
      const firstParsed = JSON.parse(firstContent);

      // Wait a bit to ensure different timestamp
      setTimeout(() => {
        // Second save with different data
        const duplicates: EnrichedDuplicateInfo[] = [
          {
            internalID: '(ERR-OUT-001)',
            n8nIDs: ['wf-1', 'wf-2'],
            count: 2,
            suggestions: ['(ERR-OUT-002)'],
          },
        ];
        generator.saveReport(35, duplicates, testLogPath);

        const secondContent = fs.readFileSync(testLogPath, 'utf-8');
        const secondParsed = JSON.parse(secondContent);

        expect(secondParsed.totalWorkflows).toBe(35);
        expect(secondParsed.duplicatesFound).toBe(1);
        expect(secondParsed.timestamp).not.toBe(firstParsed.timestamp);
      }, 10);
    });

    it('should handle Windows path separators', () => {
      const windowsPath = '.jana\\logs\\windows-test.json';

      const savedPath = generator.saveReport(10, [], windowsPath);

      expect(fs.existsSync(savedPath)).toBe(true);

      // Cleanup
      fs.unlinkSync(savedPath);
    });
  });

  describe('readReport()', () => {
    it('should read existing report', () => {
      const duplicates: EnrichedDuplicateInfo[] = [
        {
          internalID: '(ERR-OUT-001)',
          n8nIDs: ['wf-1', 'wf-2'],
          count: 2,
          suggestions: ['(ERR-OUT-002)'],
        },
      ];

      generator.saveReport(35, duplicates, testLogPath);

      const report = generator.readReport(testLogPath);

      expect(report).toBeDefined();
      expect(report?.totalWorkflows).toBe(35);
      expect(report?.duplicatesFound).toBe(1);
      expect(report?.duplicates).toHaveLength(1);
    });

    it('should return null if file does not exist', () => {
      const report = generator.readReport('.jana/logs/non-existent.json');
      expect(report).toBeNull();
    });

    it('should return null if JSON is invalid', () => {
      // Write invalid JSON
      fs.mkdirSync(path.dirname(testLogPath), { recursive: true });
      fs.writeFileSync(testLogPath, 'invalid json content', 'utf-8');

      const report = generator.readReport(testLogPath);
      expect(report).toBeNull();
    });
  });

  describe('formatReportSummary()', () => {
    it('should format summary for report with duplicates', () => {
      const duplicates: EnrichedDuplicateInfo[] = [
        {
          internalID: '(ERR-OUT-001)',
          n8nIDs: ['wf-1', 'wf-2'],
          count: 2,
          suggestions: ['(ERR-OUT-002)'],
        },
      ];

      generator.saveReport(35, duplicates, testLogPath);
      const report = generator.readReport(testLogPath);

      const summary = generator.formatReportSummary(report!);

      expect(summary).toContain('Relatório de Validação');
      expect(summary).toContain('Total de workflows: 35');
      expect(summary).toContain('Duplicatas encontradas: 1');
      expect(summary).toContain('(ERR-OUT-001)');
    });

    it('should format summary for clean report', () => {
      generator.saveReport(35, [], testLogPath);
      const report = generator.readReport(testLogPath);

      const summary = generator.formatReportSummary(report!);

      expect(summary).toContain('Relatório de Validação');
      expect(summary).toContain('Total de workflows: 35');
      expect(summary).toContain('Nenhuma duplicata encontrada');
    });
  });

  describe('data integrity', () => {
    it('should preserve all data fields in save/read cycle', () => {
      const duplicates: EnrichedDuplicateInfo[] = [
        {
          internalID: '(ERR-OUT-001)',
          n8nIDs: ['wf-1', 'wf-2', 'wf-3'],
          count: 3,
          suggestions: ['(ERR-OUT-002)', '(ERR-OUT-003)'],
        },
        {
          internalID: '(LOG-IN-015)',
          n8nIDs: ['wf-4', 'wf-5'],
          count: 2,
          suggestions: ['(LOG-IN-016)'],
        },
      ];

      generator.saveReport(50, duplicates, testLogPath);
      const report = generator.readReport(testLogPath);

      expect(report).toBeDefined();
      expect(report?.totalWorkflows).toBe(50);
      expect(report?.duplicatesFound).toBe(2);
      expect(report?.duplicates).toHaveLength(2);
      expect(report?.duplicates[0].n8nIDs).toEqual(['wf-1', 'wf-2', 'wf-3']);
      expect(report?.duplicates[0].suggestions).toEqual(['(ERR-OUT-002)', '(ERR-OUT-003)']);
      expect(report?.duplicates[1].suggestions).toEqual(['(LOG-IN-016)']);
    });
  });
});
