/**
 * Unit Tests - DataValidator
 *
 * Testes para validação de schemas de dados do mapping de workflows.
 * Cobre validação de items, arrays, layers, IDs e campos obrigatórios.
 *
 * @module __tests__/unit/data-validator.test
 */

// Mock environment variables before loading modules
process.env.SOURCE_N8N_URL = 'http://test.com';
process.env.SOURCE_N8N_API_KEY = 'test-key';

const DataValidator = require('../../core/validators/data-validator');
const { LAYERS, DEFAULT_LAYER } = require('../../config/config');

describe('DataValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new DataValidator();
  });

  describe('validateMappingItem', () => {
    describe('valid inputs', () => {
      it('should validate a valid mapping item', () => {
        const validItem = {
          name: { new: 'Workflow Teste' },
          code: 'BCO-ATU-001',
          layer: 'A',
          id: '84ZeQA0cA24Umeli',
          tag: 'jana'
        };

        const result = validator.validateMappingItem(validItem);

        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
        expect(result.warnings).toEqual([]);
        expect(result.hasDefaultLayer).toBe(false);
        expect(result.appliedLayer).toBe('A');
      });

      it('should validate item with all valid layers (A-F)', () => {
        const layers = ['A', 'B', 'C', 'D', 'E', 'F'];

        layers.forEach(layer => {
          const item = {
            name: { new: 'Workflow Teste' },
            code: 'BCO-ATU-001',
            layer,
            id: '84ZeQA0cA24Umeli',
            tag: 'jana'
          };

          const result = validator.validateMappingItem(item);

          expect(result.isValid).toBe(true);
          expect(result.appliedLayer).toBe(layer);
        });
      });
    });

    describe('invalid name.new', () => {
      it('should reject missing name object', () => {
        const item = {
          code: 'BCO-ATU-001',
          layer: 'A',
          id: '84ZeQA0cA24Umeli',
          tag: 'jana'
        };

        const result = validator.validateMappingItem(item);

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].field).toBe('name.new');
        expect(result.errors[0].message).toContain('obrigatório');
      });

      it('should reject empty name.new string', () => {
        const item = {
          name: { new: '' },
          code: 'BCO-ATU-001',
          layer: 'A',
          id: '84ZeQA0cA24Umeli',
          tag: 'jana'
        };

        const result = validator.validateMappingItem(item);

        expect(result.isValid).toBe(false);
        expect(result.errors[0].field).toBe('name.new');
      });

      it('should reject whitespace-only name.new', () => {
        const item = {
          name: { new: '   ' },
          code: 'BCO-ATU-001',
          layer: 'A',
          id: '84ZeQA0cA24Umeli',
          tag: 'jana'
        };

        const result = validator.validateMappingItem(item);

        expect(result.isValid).toBe(false);
        expect(result.errors[0].field).toBe('name.new');
      });

      it('should reject non-string name.new', () => {
        const item = {
          name: { new: 123 },
          code: 'BCO-ATU-001',
          layer: 'A',
          id: '84ZeQA0cA24Umeli',
          tag: 'jana'
        };

        const result = validator.validateMappingItem(item);

        expect(result.isValid).toBe(false);
        expect(result.errors[0].field).toBe('name.new');
      });
    });

    describe('invalid code', () => {
      it('should reject missing code', () => {
        const item = {
          name: { new: 'Workflow Teste' },
          layer: 'A',
          id: '84ZeQA0cA24Umeli',
          tag: 'jana'
        };

        const result = validator.validateMappingItem(item);

        expect(result.isValid).toBe(false);
        expect(result.errors[0].field).toBe('code');
        expect(result.errors[0].message).toContain('obrigatório');
      });

      it('should reject invalid code format', () => {
        const invalidCodes = [
          'BCO-ATU-01',     // Falta um dígito
          'BCO-ATU-0001',   // Dígito extra
          'BC-ATU-001',     // Falta letra
          'BCO-AT-001',     // Falta letra
          'bco-atu-001',    // Minúsculas
          'BCO_ATU_001',    // Underscores
          'BCO ATU 001',    // Espaços
          'BCO-ATU-AAA',    // Letras no lugar de números
        ];

        invalidCodes.forEach(code => {
          const item = {
            name: { new: 'Workflow Teste' },
            code,
            layer: 'A',
            id: '84ZeQA0cA24Umeli',
            tag: 'jana'
          };

          const result = validator.validateMappingItem(item);

          expect(result.isValid).toBe(false);
          expect(result.errors[0].field).toBe('code');
          expect(result.errors[0].message).toContain('XXX-XXX-NNN');
        });
      });
    });

    describe('invalid layer', () => {
      it('should apply default layer F for undefined layer', () => {
        const item = {
          name: { new: 'Workflow Teste' },
          code: 'BCO-ATU-001',
          // layer: undefined (ausente)
          id: '84ZeQA0cA24Umeli',
          tag: 'jana'
        };

        const result = validator.validateMappingItem(item);

        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
        expect(result.warnings).toHaveLength(1);
        expect(result.warnings[0].field).toBe('layer');
        expect(result.warnings[0].message).toContain(DEFAULT_LAYER);
        expect(result.hasDefaultLayer).toBe(true);
        expect(result.appliedLayer).toBe(DEFAULT_LAYER);
      });

      it('should apply default layer F for null layer', () => {
        const item = {
          name: { new: 'Workflow Teste' },
          code: 'BCO-ATU-001',
          layer: null,
          id: '84ZeQA0cA24Umeli',
          tag: 'jana'
        };

        const result = validator.validateMappingItem(item);

        expect(result.isValid).toBe(true);
        expect(result.hasDefaultLayer).toBe(true);
        expect(result.appliedLayer).toBe(DEFAULT_LAYER);
        expect(result.warnings).toHaveLength(1);
      });

      it('should apply default layer F for empty string layer', () => {
        const item = {
          name: { new: 'Workflow Teste' },
          code: 'BCO-ATU-001',
          layer: '',
          id: '84ZeQA0cA24Umeli',
          tag: 'jana'
        };

        const result = validator.validateMappingItem(item);

        expect(result.isValid).toBe(true);
        expect(result.hasDefaultLayer).toBe(true);
        expect(result.appliedLayer).toBe(DEFAULT_LAYER);
      });

      it('should reject invalid layer value', () => {
        const item = {
          name: { new: 'Workflow Teste' },
          code: 'BCO-ATU-001',
          layer: 'Z', // Inválida
          id: '84ZeQA0cA24Umeli',
          tag: 'jana'
        };

        const result = validator.validateMappingItem(item);

        expect(result.isValid).toBe(false);
        expect(result.errors[0].field).toBe('layer');
        expect(result.errors[0].message).toContain('inválida');
        expect(result.errors[0].value).toBe('Z');
      });
    });

    describe('invalid id', () => {
      it('should reject missing id', () => {
        const item = {
          name: { new: 'Workflow Teste' },
          code: 'BCO-ATU-001',
          layer: 'A',
          tag: 'jana'
        };

        const result = validator.validateMappingItem(item);

        expect(result.isValid).toBe(false);
        expect(result.errors[0].field).toBe('id');
        expect(result.errors[0].message).toContain('obrigatório');
      });

      it('should reject empty id', () => {
        const item = {
          name: { new: 'Workflow Teste' },
          code: 'BCO-ATU-001',
          layer: 'A',
          id: '',
          tag: 'jana'
        };

        const result = validator.validateMappingItem(item);

        expect(result.isValid).toBe(false);
        expect(result.errors[0].field).toBe('id');
      });
    });

    describe('invalid tag', () => {
      it('should reject missing tag', () => {
        const item = {
          name: { new: 'Workflow Teste' },
          code: 'BCO-ATU-001',
          layer: 'A',
          id: '84ZeQA0cA24Umeli'
        };

        const result = validator.validateMappingItem(item);

        expect(result.isValid).toBe(false);
        expect(result.errors[0].field).toBe('tag');
        expect(result.errors[0].message).toContain('obrigatório');
      });

      it('should reject empty tag', () => {
        const item = {
          name: { new: 'Workflow Teste' },
          code: 'BCO-ATU-001',
          layer: 'A',
          id: '84ZeQA0cA24Umeli',
          tag: ''
        };

        const result = validator.validateMappingItem(item);

        expect(result.isValid).toBe(false);
        expect(result.errors[0].field).toBe('tag');
      });
    });

    describe('multiple errors', () => {
      it('should report all errors for completely invalid item', () => {
        const item = {
          name: { new: '' },
          code: 'invalid',
          layer: 'Z',
          id: '',
          tag: ''
        };

        const result = validator.validateMappingItem(item);

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThanOrEqual(5);
      });
    });
  });

  describe('validateMappingArray', () => {
    describe('valid arrays', () => {
      it('should validate array with valid items', () => {
        const items = [
          {
            name: { new: 'Workflow 1' },
            code: 'BCO-ATU-001',
            layer: 'A',
            id: '84ZeQA0cA24Umeli',
            tag: 'jana'
          },
          {
            name: { new: 'Workflow 2' },
            code: 'BCO-ATU-002',
            layer: 'B',
            id: '94ZeQA0cA24Umelj',
            tag: 'jana'
          }
        ];

        const result = validator.validateMappingArray(items);

        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });
    });

    describe('invalid arrays', () => {
      it('should reject non-array input', () => {
        const result = validator.validateMappingArray('not an array');

        expect(result.isValid).toBe(false);
        expect(result.errors[0].field).toBe('array');
        expect(result.errors[0].message).toContain('array');
      });

      it('should reject empty array', () => {
        const result = validator.validateMappingArray([]);

        expect(result.isValid).toBe(false);
        expect(result.errors[0].field).toBe('array');
        expect(result.errors[0].message).toContain('vazio');
      });
    });

    describe('duplicate detection', () => {
      it('should detect duplicate IDs', () => {
        const items = [
          {
            name: { new: 'Workflow 1' },
            code: 'BCO-ATU-001',
            layer: 'A',
            id: '84ZeQA0cA24Umeli',
            tag: 'jana'
          },
          {
            name: { new: 'Workflow 2' },
            code: 'BCO-ATU-002',
            layer: 'B',
            id: '84ZeQA0cA24Umeli', // ID duplicado
            tag: 'jana'
          }
        ];

        const result = validator.validateMappingArray(items);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual(
          expect.objectContaining({
            field: 'id',
            value: '84ZeQA0cA24Umeli',
            message: expect.stringContaining('duplicado')
          })
        );
      });

      it('should detect duplicate codes', () => {
        const items = [
          {
            name: { new: 'Workflow 1' },
            code: 'BCO-ATU-001',
            layer: 'A',
            id: '84ZeQA0cA24Umeli',
            tag: 'jana'
          },
          {
            name: { new: 'Workflow 2' },
            code: 'BCO-ATU-001', // Código duplicado
            layer: 'B',
            id: '94ZeQA0cA24Umelj',
            tag: 'jana'
          }
        ];

        const result = validator.validateMappingArray(items);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual(
          expect.objectContaining({
            field: 'code',
            value: 'BCO-ATU-001',
            message: expect.stringContaining('duplicado')
          })
        );
      });

      it('should report all duplicate indices', () => {
        const items = [
          {
            name: { new: 'Workflow 1' },
            code: 'BCO-ATU-001',
            layer: 'A',
            id: '84ZeQA0cA24Umeli',
            tag: 'jana'
          },
          {
            name: { new: 'Workflow 2' },
            code: 'BCO-ATU-001',
            layer: 'B',
            id: '84ZeQA0cA24Umeli',
            tag: 'jana'
          },
          {
            name: { new: 'Workflow 3' },
            code: 'BCO-ATU-001',
            layer: 'C',
            id: '84ZeQA0cA24Umeli',
            tag: 'jana'
          }
        ];

        const result = validator.validateMappingArray(items);

        expect(result.isValid).toBe(false);
        const duplicateError = result.errors.find(e => e.field === 'id');
        expect(duplicateError.message).toContain('[0, 1, 2]');
      });
    });

    describe('item validation aggregation', () => {
      it('should aggregate errors from multiple invalid items', () => {
        const items = [
          {
            name: { new: '' }, // Inválido
            code: 'BCO-ATU-001',
            layer: 'A',
            id: '84ZeQA0cA24Umeli',
            tag: 'jana'
          },
          {
            name: { new: 'Workflow 2' },
            code: 'invalid', // Inválido
            layer: 'B',
            id: '94ZeQA0cA24Umelj',
            tag: 'jana'
          }
        ];

        const result = validator.validateMappingArray(items);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual(
          expect.objectContaining({
            index: 0,
            field: 'name.new'
          })
        );
        expect(result.errors).toContainEqual(
          expect.objectContaining({
            index: 1,
            field: 'code'
          })
        );
      });

      it('should aggregate warnings from items', () => {
        const items = [
          {
            name: { new: 'Workflow 1' },
            code: 'BCO-ATU-001',
            // layer: undefined (warning)
            id: '84ZeQA0cA24Umeli',
            tag: 'jana'
          },
          {
            name: { new: 'Workflow 2' },
            code: 'BCO-ATU-002',
            layer: null, // Warning
            id: '94ZeQA0cA24Umelj',
            tag: 'jana'
          }
        ];

        const result = validator.validateMappingArray(items);

        expect(result.isValid).toBe(true);
        expect(result.warnings).toHaveLength(2);
        expect(result.warnings[0].index).toBe(0);
        expect(result.warnings[1].index).toBe(1);
      });

      it('should apply default layer to items missing layer', () => {
        const items = [
          {
            name: { new: 'Workflow 1' },
            code: 'BCO-ATU-001',
            // layer: undefined
            id: '84ZeQA0cA24Umeli',
            tag: 'jana'
          }
        ];

        const result = validator.validateMappingArray(items);

        expect(result.isValid).toBe(true);
        expect(items[0].layer).toBe(DEFAULT_LAYER);
      });
    });
  });

  describe('validateLayer', () => {
    it('should validate all valid layers (A-F)', () => {
      const validLayers = ['A', 'B', 'C', 'D', 'E', 'F'];

      validLayers.forEach(layer => {
        const result = validator.validateLayer(layer);
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });
    });

    it('should reject invalid layer', () => {
      const result = validator.validateLayer('Z');

      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('layer');
      expect(result.errors[0].value).toBe('Z');
    });

    it('should reject null layer', () => {
      const result = validator.validateLayer(null);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('layer');
    });

    it('should reject undefined layer', () => {
      const result = validator.validateLayer(undefined);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('layer');
    });

    it('should reject empty string layer', () => {
      const result = validator.validateLayer('');

      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('layer');
    });

    it('should reject number layer', () => {
      const result = validator.validateLayer(1);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('layer');
    });

    it('should list valid layers in error message', () => {
      const result = validator.validateLayer('Z');

      expect(result.errors[0].message).toContain('A');
      expect(result.errors[0].message).toContain('F');
    });
  });

  describe('validateWorkflowId', () => {
    describe('valid IDs', () => {
      it('should validate valid 16-character alphanumeric ID', () => {
        const validIds = [
          '84ZeQA0cA24Umeli',
          'abcd1234efgh5678',
          'ABCD1234EFGH5678',
          '0123456789abcdef'
        ];

        validIds.forEach(id => {
          const result = validator.validateWorkflowId(id);
          expect(result.isValid).toBe(true);
          expect(result.errors).toEqual([]);
        });
      });
    });

    describe('invalid IDs', () => {
      it('should reject missing ID', () => {
        const result = validator.validateWorkflowId(undefined);

        expect(result.isValid).toBe(false);
        expect(result.errors[0].field).toBe('id');
        expect(result.errors[0].message).toContain('obrigatório');
      });

      it('should reject null ID', () => {
        const result = validator.validateWorkflowId(null);

        expect(result.isValid).toBe(false);
        expect(result.errors[0].field).toBe('id');
      });

      it('should reject empty string ID', () => {
        const result = validator.validateWorkflowId('');

        expect(result.isValid).toBe(false);
        expect(result.errors[0].field).toBe('id');
      });

      it('should reject ID with wrong length', () => {
        const invalidIds = [
          '84ZeQA0cA24Umel',    // 15 chars
          '84ZeQA0cA24Umelii',  // 17 chars
          '84Ze',               // 4 chars
          '84ZeQA0cA24UmeliXX' // 18 chars
        ];

        invalidIds.forEach(id => {
          const result = validator.validateWorkflowId(id);
          expect(result.isValid).toBe(false);
          expect(result.errors[0].field).toBe('id');
          expect(result.errors[0].message).toContain('16 caracteres');
        });
      });

      it('should reject ID with special characters', () => {
        const invalidIds = [
          '84ZeQA0cA24Umel!',  // Special char
          '84ZeQA0cA24Umel@',  // Special char
          '84ZeQA0cA24Umel#',  // Special char
          '84ZeQA0cA24Umel-',  // Hyphen
          '84ZeQA0cA24Umel_',  // Underscore
          '84ZeQA0cA24Umel '   // Space
        ];

        invalidIds.forEach(id => {
          const result = validator.validateWorkflowId(id);
          expect(result.isValid).toBe(false);
          expect(result.errors[0].field).toBe('id');
          expect(result.errors[0].message).toContain('alfanuméricos');
        });
      });

      it('should reject non-string ID', () => {
        const result = validator.validateWorkflowId(123456);

        expect(result.isValid).toBe(false);
        expect(result.errors[0].field).toBe('id');
      });
    });
  });

  describe('_findDuplicates', () => {
    it('should find duplicates in array', () => {
      const array = ['a', 'b', 'a', 'c', 'b', 'a'];
      const duplicates = validator._findDuplicates(array);

      expect(duplicates).toContain('a');
      expect(duplicates).toContain('b');
      expect(duplicates).not.toContain('c');
      expect(duplicates).toHaveLength(2);
    });

    it('should return empty array for no duplicates', () => {
      const array = ['a', 'b', 'c', 'd'];
      const duplicates = validator._findDuplicates(array);

      expect(duplicates).toEqual([]);
    });

    it('should handle empty array', () => {
      const duplicates = validator._findDuplicates([]);

      expect(duplicates).toEqual([]);
    });

    it('should handle single element', () => {
      const duplicates = validator._findDuplicates(['a']);

      expect(duplicates).toEqual([]);
    });
  });
});
