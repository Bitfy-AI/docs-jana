/**
 * Unit Tests - MappingLoader
 *
 * Testes para carregamento e transformação de arquivo de mapeamento JSON.
 * Cobre leitura de arquivo, parsing, validação e transformação de dados.
 *
 * @module __tests__/unit/mapping-loader.test
 */

// Mock environment variables before loading modules
process.env.SOURCE_N8N_URL = 'http://test.com';
process.env.SOURCE_N8N_API_KEY = 'test-key';

// Mock fs module
jest.mock('fs');

const fs = require('fs');
const MappingLoader = require('../../core/loaders/mapping-loader');
const DataValidator = require('../../core/validators/data-validator');
const { LAYERS } = require('../../config/config');

describe('MappingLoader', () => {
  let loader;

  beforeEach(() => {
    loader = new MappingLoader();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with DataValidator', () => {
      expect(loader.validator).toBeInstanceOf(DataValidator);
    });
  });

  describe('loadMappingFile', () => {
    describe('successful loading', () => {
      it('should load and parse valid JSON file', () => {
        const validData = [
          {
            name: { new: 'Workflow 1' },
            code: 'BCO-ATU-001',
            layer: 'A',
            id: '84ZeQA0cA24Umeli',
            tag: 'jana'
          }
        ];

        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(JSON.stringify(validData));

        const result = loader.loadMappingFile('/test/path.json');

        expect(result.success).toBe(true);
        expect(result.data).toEqual(validData);
        expect(result.errors).toEqual([]);
        expect(fs.existsSync).toHaveBeenCalledWith('/test/path.json');
        expect(fs.readFileSync).toHaveBeenCalledWith('/test/path.json', 'utf-8');
      });

      it('should load multiple items', () => {
        const validData = [
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

        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(JSON.stringify(validData));

        const result = loader.loadMappingFile();

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(2);
      });
    });

    describe('file not found', () => {
      it('should return error when file does not exist', () => {
        fs.existsSync.mockReturnValue(false);

        const result = loader.loadMappingFile('/test/missing.json');

        expect(result.success).toBe(false);
        expect(result.data).toEqual([]);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].field).toBe('file');
        expect(result.errors[0].message).toContain('não encontrado');
        expect(fs.readFileSync).not.toHaveBeenCalled();
      });
    });

    describe('invalid JSON', () => {
      it('should return error for malformed JSON', () => {
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue('{ invalid json }');

        const result = loader.loadMappingFile();

        expect(result.success).toBe(false);
        expect(result.data).toEqual([]);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].field).toBe('json');
        expect(result.errors[0].message).toContain('JSON inválido');
      });

      it('should return error for empty JSON string', () => {
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue('');

        const result = loader.loadMappingFile();

        expect(result.success).toBe(false);
        expect(result.errors[0].field).toBe('json');
      });

      it('should return error for truncated JSON', () => {
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue('[{"name": {"new": "Test"}');

        const result = loader.loadMappingFile();

        expect(result.success).toBe(false);
        expect(result.errors[0].field).toBe('json');
      });
    });

    describe('validation errors', () => {
      it('should return validation errors for invalid data', () => {
        const invalidData = [
          {
            name: { new: '' }, // Nome vazio - inválido
            code: 'BCO-ATU-001',
            layer: 'A',
            id: '84ZeQA0cA24Umeli',
            tag: 'jana'
          }
        ];

        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(JSON.stringify(invalidData));

        const result = loader.loadMappingFile();

        expect(result.success).toBe(false);
        expect(result.data).toEqual([]);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should return errors for empty array', () => {
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue('[]');

        const result = loader.loadMappingFile();

        expect(result.success).toBe(false);
        expect(result.errors[0].message).toContain('vazio');
      });

      it('should return errors for duplicate IDs', () => {
        const duplicateData = [
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

        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(JSON.stringify(duplicateData));

        const result = loader.loadMappingFile();

        expect(result.success).toBe(false);
        expect(result.errors).toContainEqual(
          expect.objectContaining({
            field: 'id',
            message: expect.stringContaining('duplicado')
          })
        );
      });
    });

    describe('file system errors', () => {
      it('should handle file read errors', () => {
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockImplementation(() => {
          throw new Error('Permission denied');
        });

        const result = loader.loadMappingFile();

        expect(result.success).toBe(false);
        expect(result.errors[0].message).toContain('Erro ao carregar arquivo');
        expect(result.errors[0].value).toContain('Permission denied');
      });
    });
  });

  describe('transformToWorkflowItems', () => {
    describe('successful transformation', () => {
      it('should transform single item to WorkflowItem format', () => {
        const mappingData = [
          {
            name: { new: 'banco atualizacao workflow' },
            code: 'BCO-ATU-001',
            layer: 'A',
            id: '84ZeQA0cA24Umeli',
            tag: 'jana'
          }
        ];

        const result = loader.transformToWorkflowItems(mappingData);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          id: '84ZeQA0cA24Umeli',
          name: 'banco atualizacao workflow',
          code: 'BCO-ATU-001',
          layer: 'A',
          layerDescription: LAYERS['A'],
          tag: 'jana',
          status: 'pending'
        });
      });

      it('should transform multiple items', () => {
        const mappingData = [
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

        const result = loader.transformToWorkflowItems(mappingData);

        expect(result).toHaveLength(2);
        expect(result[0].layer).toBe('A');
        expect(result[1].layer).toBe('B');
      });

      it('should include correct layer descriptions for all layers', () => {
        const layers = ['A', 'B', 'C', 'D', 'E', 'F'];
        const mappingData = layers.map((layer, index) => ({
          name: { new: `Workflow ${layer}` },
          code: `BCO-ATU-00${index + 1}`,
          layer,
          id: `84ZeQA0cA24Umel${index}`,
          tag: 'jana'
        }));

        const result = loader.transformToWorkflowItems(mappingData);

        result.forEach((item, index) => {
          expect(item.layerDescription).toBe(LAYERS[layers[index]]);
        });
      });

      it('should set status to pending for all items', () => {
        const mappingData = [
          {
            name: { new: 'Workflow 1' },
            code: 'BCO-ATU-001',
            layer: 'A',
            id: '84ZeQA0cA24Umeli',
            tag: 'jana'
          }
        ];

        const result = loader.transformToWorkflowItems(mappingData);

        expect(result[0].status).toBe('pending');
      });
    });

    describe('name normalization', () => {
      it('should trim whitespace from names', () => {
        const mappingData = [
          {
            name: { new: '  Workflow with spaces  ' },
            code: 'BCO-ATU-001',
            layer: 'A',
            id: '84ZeQA0cA24Umeli',
            tag: 'jana'
          }
        ];

        const result = loader.transformToWorkflowItems(mappingData);

        expect(result[0].name).toBe('Workflow with spaces');
      });

      it('should preserve internal whitespace', () => {
        const mappingData = [
          {
            name: { new: 'Workflow   with   multiple   spaces' },
            code: 'BCO-ATU-001',
            layer: 'A',
            id: '84ZeQA0cA24Umeli',
            tag: 'jana'
          }
        ];

        const result = loader.transformToWorkflowItems(mappingData);

        expect(result[0].name).toBe('Workflow   with   multiple   spaces');
      });
    });

    describe('layer description handling', () => {
      it('should provide fallback for unknown layer', () => {
        const mappingData = [
          {
            name: { new: 'Workflow Test' },
            code: 'BCO-ATU-001',
            layer: 'Z', // Layer inválida (não deveria chegar aqui após validação)
            id: '84ZeQA0cA24Umeli',
            tag: 'jana'
          }
        ];

        const result = loader.transformToWorkflowItems(mappingData);

        expect(result[0].layerDescription).toBe('Descrição não disponível');
      });
    });

    describe('empty input', () => {
      it('should return empty array for empty input', () => {
        const result = loader.transformToWorkflowItems([]);

        expect(result).toEqual([]);
      });
    });
  });

  describe('loadAndTransform', () => {
    describe('successful flow', () => {
      it('should load and transform in one operation', () => {
        const validData = [
          {
            name: { new: 'Workflow Test' },
            code: 'BCO-ATU-001',
            layer: 'A',
            id: '84ZeQA0cA24Umeli',
            tag: 'jana'
          }
        ];

        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(JSON.stringify(validData));

        const result = loader.loadAndTransform('/test/path.json');

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(1);
        expect(result.data[0]).toHaveProperty('layerDescription');
        expect(result.data[0]).toHaveProperty('status', 'pending');
        expect(result.errors).toEqual([]);
      });

      it('should transform multiple items', () => {
        const validData = [
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

        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(JSON.stringify(validData));

        const result = loader.loadAndTransform();

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(2);
      });
    });

    describe('error handling', () => {
      it('should return load errors without transformation', () => {
        fs.existsSync.mockReturnValue(false);

        const result = loader.loadAndTransform('/test/missing.json');

        expect(result.success).toBe(false);
        expect(result.data).toEqual([]);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].field).toBe('file');
      });

      it('should return validation errors without transformation', () => {
        const invalidData = [
          {
            name: { new: '' },
            code: 'BCO-ATU-001',
            layer: 'A',
            id: '84ZeQA0cA24Umeli',
            tag: 'jana'
          }
        ];

        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(JSON.stringify(invalidData));

        const result = loader.loadAndTransform();

        expect(result.success).toBe(false);
        expect(result.data).toEqual([]);
      });

      it('should return JSON parse errors without transformation', () => {
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue('{ invalid }');

        const result = loader.loadAndTransform();

        expect(result.success).toBe(false);
        expect(result.errors[0].field).toBe('json');
      });
    });
  });

  describe('getStatistics', () => {
    it('should calculate total count', () => {
      const workflowItems = [
        {
          id: '1',
          name: 'WF1',
          code: 'BCO-ATU-001',
          layer: 'A',
          layerDescription: LAYERS.A,
          tag: 'jana',
          status: 'pending'
        },
        {
          id: '2',
          name: 'WF2',
          code: 'BCO-ATU-002',
          layer: 'B',
          layerDescription: LAYERS.B,
          tag: 'jana',
          status: 'pending'
        }
      ];

      const stats = loader.getStatistics(workflowItems);

      expect(stats.total).toBe(2);
    });

    it('should count by layer', () => {
      const workflowItems = [
        { id: '1', name: 'WF1', code: 'BCO-ATU-001', layer: 'A', layerDescription: LAYERS.A, tag: 'jana', status: 'pending' },
        { id: '2', name: 'WF2', code: 'BCO-ATU-002', layer: 'A', layerDescription: LAYERS.A, tag: 'jana', status: 'pending' },
        { id: '3', name: 'WF3', code: 'BCO-ATU-003', layer: 'B', layerDescription: LAYERS.B, tag: 'jana', status: 'pending' },
        { id: '4', name: 'WF4', code: 'BCO-ATU-004', layer: 'C', layerDescription: LAYERS.C, tag: 'jana', status: 'pending' },
        { id: '5', name: 'WF5', code: 'BCO-ATU-005', layer: 'C', layerDescription: LAYERS.C, tag: 'jana', status: 'pending' },
        { id: '6', name: 'WF6', code: 'BCO-ATU-006', layer: 'C', layerDescription: LAYERS.C, tag: 'jana', status: 'pending' }
      ];

      const stats = loader.getStatistics(workflowItems);

      expect(stats.byLayer).toEqual({
        A: 2,
        B: 1,
        C: 3
      });
    });

    it('should count by tag', () => {
      const workflowItems = [
        { id: '1', name: 'WF1', code: 'BCO-ATU-001', layer: 'A', layerDescription: LAYERS.A, tag: 'jana', status: 'pending' },
        { id: '2', name: 'WF2', code: 'BCO-ATU-002', layer: 'B', layerDescription: LAYERS.B, tag: 'jana', status: 'pending' },
        { id: '3', name: 'WF3', code: 'BCO-ATU-003', layer: 'C', layerDescription: LAYERS.C, tag: 'production', status: 'pending' }
      ];

      const stats = loader.getStatistics(workflowItems);

      expect(stats.byTag).toEqual({
        jana: 2,
        production: 1
      });
    });

    it('should handle empty array', () => {
      const stats = loader.getStatistics([]);

      expect(stats.total).toBe(0);
      expect(stats.byLayer).toEqual({});
      expect(stats.byTag).toEqual({});
    });

    it('should handle all layers', () => {
      const layers = ['A', 'B', 'C', 'D', 'E', 'F'];
      const workflowItems = layers.map((layer, index) => ({
        id: `${index + 1}`,
        name: `WF${index + 1}`,
        code: `BCO-ATU-00${index + 1}`,
        layer,
        layerDescription: LAYERS[layer],
        tag: 'jana',
        status: 'pending'
      }));

      const stats = loader.getStatistics(workflowItems);

      expect(stats.total).toBe(6);
      expect(Object.keys(stats.byLayer)).toHaveLength(6);
      layers.forEach(layer => {
        expect(stats.byLayer[layer]).toBe(1);
      });
    });
  });
});
