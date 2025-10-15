/**
 * @fileoverview Testes unitários para SchemaValidator Plugin
 * @module tests/unit/plugins/schema-validator.test
 */

const { SchemaValidator } = require('../../../../scripts/admin/n8n-transfer/plugins/validators/schema-validator');

describe('SchemaValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new SchemaValidator();
  });

  describe('constructor()', () => {
    it('deve criar instância com configurações corretas', () => {
      expect(validator.getName()).toBe('schema-validator');
      expect(validator.getVersion()).toBe('1.0.0');
      expect(validator.getType()).toBe('validator');
    });

    it('deve ter descrição definida', () => {
      const description = validator.getDescription();
      expect(description).toBeTruthy();
      expect(description).toContain('schema');
      expect(description).toContain('Zod');
    });
  });

  describe('validate() - workflows válidos', () => {
    it('deve validar workflow mínimo válido', () => {
      const workflow = {
        name: 'Test Workflow',
        nodes: [
          {
            id: 'node1',
            name: 'Start',
            type: 'n8n-nodes-base.start',
            position: [0, 0],
            parameters: {}
          }
        ],
        connections: {}
      };

      const result = validator.validate(workflow);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.metadata.workflowName).toBe('Test Workflow');
      expect(result.metadata.nodeCount).toBe(1);
    });

    it('deve validar workflow completo com todos campos opcionais', () => {
      const workflow = {
        id: 'wf-123',
        name: 'Complete Workflow',
        active: true,
        nodes: [
          {
            id: 'node1',
            name: 'Start',
            type: 'n8n-nodes-base.start',
            position: [0, 0],
            parameters: {}
          }
        ],
        connections: {},
        tags: [
          { id: '1', name: 'production' },
          { id: '2', name: 'automation' }
        ],
        settings: {
          executionOrder: 'v1'
        },
        versionId: 'v1',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-02T00:00:00.000Z'
      };

      const result = validator.validate(workflow);

      expect(result.valid).toBe(true);
      expect(result.metadata.tagCount).toBe(2);
      expect(result.metadata.isActive).toBe(true);
    });
  });

  describe('validate() - workflows inválidos', () => {
    it('deve retornar erro se workflow for null', () => {
      const result = validator.validate(null);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Workflow object is required');
    });

    it('deve retornar erro se workflow for undefined', () => {
      const result = validator.validate(undefined);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Workflow object is required');
    });

    it('deve retornar erro se name estiver ausente', () => {
      const workflow = {
        nodes: [{ id: 'node1', name: 'Start', type: 'n8n-nodes-base.start', position: [0, 0], parameters: {} }],
        connections: {}
      };

      const result = validator.validate(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('name'))).toBe(true);
    });

    it('deve retornar erro se nodes estiver ausente', () => {
      const workflow = {
        name: 'Test',
        connections: {}
      };

      const result = validator.validate(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('nodes'))).toBe(true);
    });

    it('deve aceitar workflow sem connections (z.any() aceita undefined)', () => {
      const workflow = {
        name: 'Test',
        nodes: [{ id: 'node1', name: 'Start', type: 'n8n-nodes-base.start', position: [0, 0], parameters: {} }]
        // connections ausente - aceito por z.any()
      };

      const result = validator.validate(workflow);

      // Como connections usa z.any(), undefined é aceito
      expect(result.valid).toBe(true);
    });
  });

  describe('_formatZodErrors() - tipos inválidos', () => {
    it('deve retornar erro se name não for string', () => {
      const workflow = {
        name: 123, // Tipo errado
        nodes: [{ id: 'node1', name: 'Start', type: 'n8n-nodes-base.start', position: [0, 0], parameters: {} }],
        connections: {}
      };

      const result = validator.validate(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('expected string') && e.includes('name'))).toBe(true);
    });

    it('deve retornar erro se nodes não for array', () => {
      const workflow = {
        name: 'Test',
        nodes: 'not-an-array',
        connections: {}
      };

      const result = validator.validate(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('expected array') && e.includes('nodes'))).toBe(true);
    });

    it('deve aceitar connections de qualquer tipo (z.any())', () => {
      const workflow = {
        name: 'Test',
        nodes: [{ id: 'node1', name: 'Start', type: 'n8n-nodes-base.start', position: [0, 0], parameters: {} }],
        connections: 'not-an-object' // Aceito por z.any()
      };

      const result = validator.validate(workflow);

      // Como connections usa z.any(), qualquer tipo é aceito
      expect(result.valid).toBe(true);
    });

    it('deve retornar erro se active não for boolean', () => {
      const workflow = {
        name: 'Test',
        active: 'yes', // Tipo errado
        nodes: [{ id: 'node1', name: 'Start', type: 'n8n-nodes-base.start', position: [0, 0], parameters: {} }],
        connections: {}
      };

      const result = validator.validate(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('expected boolean') && e.includes('active'))).toBe(true);
    });
  });

  describe('_formatZodErrors() - array constraints', () => {
    it('deve retornar erro se nodes array estiver vazio', () => {
      const workflow = {
        name: 'Test',
        nodes: [], // Array vazio
        connections: {}
      };

      const result = validator.validate(workflow);

      expect(result.valid).toBe(false);
      // Zod schema exige nodes.length >= 1
      expect(result.errors.some(e => e.includes('nodes') && e.includes('too small'))).toBe(true);
    });

    it('deve aceitar nodes com múltiplos elementos', () => {
      const workflow = {
        name: 'Test',
        nodes: [
          { id: 'node1', name: 'Start', type: 'n8n-nodes-base.start', position: [0, 0], parameters: {} },
          { id: 'node2', name: 'End', type: 'n8n-nodes-base.end', position: [100, 0], parameters: {} }
        ],
        connections: {}
      };

      const result = validator.validate(workflow);
      expect(result.valid).toBe(true);
    });
  });

  describe('_formatZodErrors() - string constraints', () => {
    it('deve retornar erro se name for string vazia', () => {
      const workflow = {
        name: '', // String vazia
        nodes: [{ id: 'node1', name: 'Start', type: 'n8n-nodes-base.start', position: [0, 0], parameters: {} }],
        connections: {}
      };

      const result = validator.validate(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('name') && e.includes('too small'))).toBe(true);
    });

    it('deve aceitar name com 1 caractere', () => {
      const workflow = {
        name: 'A',
        nodes: [{ id: 'node1', name: 'Start', type: 'n8n-nodes-base.start', position: [0, 0], parameters: {} }],
        connections: {}
      };

      const result = validator.validate(workflow);
      expect(result.valid).toBe(true);
    });
  });

  describe('warnings - best practices', () => {
    it('deve retornar warning se workflow não possui tags', () => {
      const workflow = {
        name: 'Test',
        nodes: [{ id: 'node1', name: 'Start', type: 'n8n-nodes-base.start', position: [0, 0], parameters: {} }],
        connections: {}
        // tags ausente
      };

      const result = validator.validate(workflow);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('no tags'))).toBe(true);
    });

    it('deve retornar warning se tags for array vazio', () => {
      const workflow = {
        name: 'Test',
        nodes: [{ id: 'node1', name: 'Start', type: 'n8n-nodes-base.start', position: [0, 0], parameters: {} }],
        connections: {},
        tags: [] // Vazio
      };

      const result = validator.validate(workflow);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('no tags'))).toBe(true);
    });

    it('NÃO deve retornar warning se workflow possui tags', () => {
      const workflow = {
        name: 'Test',
        nodes: [{ id: 'node1', name: 'Start', type: 'n8n-nodes-base.start', position: [0, 0], parameters: {} }],
        connections: {},
        tags: [{ id: '1', name: 'production' }]
      };

      const result = validator.validate(workflow);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('tags'))).toBe(false);
    });

    it('deve retornar warning se settings ausente', () => {
      const workflow = {
        name: 'Test',
        nodes: [{ id: 'node1', name: 'Start', type: 'n8n-nodes-base.start', position: [0, 0], parameters: {} }],
        connections: {}
        // settings ausente
      };

      const result = validator.validate(workflow);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('no settings'))).toBe(true);
    });

    it('NÃO deve retornar warning se settings presente', () => {
      const workflow = {
        name: 'Test',
        nodes: [{ id: 'node1', name: 'Start', type: 'n8n-nodes-base.start', position: [0, 0], parameters: {} }],
        connections: {},
        settings: { executionOrder: 'v1' }
      };

      const result = validator.validate(workflow);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('settings'))).toBe(false);
    });
  });

  describe('metadata', () => {
    it('deve incluir metadata completo em resultado válido', () => {
      const workflow = {
        name: 'My Workflow',
        active: true,
        nodes: [
          { id: 'node1', name: 'Start', type: 'n8n-nodes-base.start', position: [0, 0], parameters: {} },
          { id: 'node2', name: 'End', type: 'n8n-nodes-base.end', position: [100, 0], parameters: {} }
        ],
        connections: {},
        tags: [
          { id: '1', name: 'tag1' },
          { id: '2', name: 'tag2' }
        ]
      };

      const result = validator.validate(workflow);

      expect(result.metadata.validator).toBe('schema-validator');
      expect(result.metadata.version).toBe('1.0.0');
      expect(result.metadata.workflowName).toBe('My Workflow');
      expect(result.metadata.nodeCount).toBe(2);
      expect(result.metadata.tagCount).toBe(2);
      expect(result.metadata.isActive).toBe(true);
      expect(result.metadata.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('deve incluir attemptedWorkflowName em metadata de erro', () => {
      const workflow = {
        name: 'Test Workflow',
        nodes: 'invalid', // Erro
        connections: {}
      };

      const result = validator.validate(workflow);

      expect(result.valid).toBe(false);
      expect(result.metadata.attemptedWorkflowName).toBe('Test Workflow');
    });

    it('deve usar valores padrão se campos opcionais ausentes', () => {
      const workflow = {
        name: 'Test',
        nodes: [{ id: 'node1', name: 'Start', type: 'n8n-nodes-base.start', position: [0, 0], parameters: {} }],
        connections: {}
      };

      const result = validator.validate(workflow);

      expect(result.metadata.tagCount).toBe(0);
      expect(result.metadata.isActive).toBe(false);
    });
  });

  describe('getValidationInfo()', () => {
    it('deve retornar informações sobre validação', () => {
      const info = validator.getValidationInfo();

      expect(info).toHaveProperty('requiredFields');
      expect(info).toHaveProperty('optionalFields');
      expect(info).toHaveProperty('validatedStructures');
      expect(info).toHaveProperty('warnings');
      expect(info).toHaveProperty('errorFormats');
    });

    it('deve listar campos obrigatórios corretos', () => {
      const info = validator.getValidationInfo();

      expect(info.requiredFields).toContain('name');
      expect(info.requiredFields).toContain('nodes');
      expect(info.requiredFields).toContain('connections');
    });

    it('deve listar campos opcionais corretos', () => {
      const info = validator.getValidationInfo();

      expect(info.optionalFields).toContain('id');
      expect(info.optionalFields).toContain('tags');
      expect(info.optionalFields).toContain('active');
      expect(info.optionalFields).toContain('settings');
    });
  });

  describe('_formatZodErrors() - error formatting', () => {
    it('deve formatar erro de tipo inválido corretamente', () => {
      const workflow = {
        name: 123,
        nodes: [{ id: 'node1', name: 'Start', type: 'n8n-nodes-base.start', position: [0, 0], parameters: {} }],
        connections: {}
      };

      const result = validator.validate(workflow);

      expect(result.errors.some(e =>
        e.includes('expected string') &&
        e.includes('name') &&
        e.includes('received number')
      )).toBe(true);
    });

    it('deve formatar erro de array too_small', () => {
      const workflow = {
        name: 'Test',
        nodes: [],
        connections: {}
      };

      const result = validator.validate(workflow);

      expect(result.errors.some(e =>
        e.includes('nodes') &&
        e.includes('too small')
      )).toBe(true);
    });

    it('deve formatar erro de string too_small', () => {
      const workflow = {
        name: '',
        nodes: [{ id: 'node1', name: 'Start', type: 'n8n-nodes-base.start', position: [0, 0], parameters: {} }],
        connections: {}
      };

      const result = validator.validate(workflow);

      expect(result.errors.some(e =>
        e.includes('name') &&
        e.includes('too small')
      )).toBe(true);
    });
  });

  describe('múltiplos erros', () => {
    it('deve retornar múltiplos erros quando houver', () => {
      const workflow = {
        name: 123, // Tipo errado
        nodes: 'invalid', // Tipo errado
        connections: [] // Aceito por z.any()
      };

      const result = validator.validate(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });

    it('deve aceitar nodes com estrutura inválida (z.any())', () => {
      const workflow = {
        name: 'Test',
        nodes: [
          {
            id: 'node1',
            name: 123, // Tipo errado mas aceito por z.any()
            type: 'n8n-nodes-base.start',
            position: [0, 0],
            parameters: {}
          }
        ],
        connections: {}
      };

      const result = validator.validate(workflow);

      // Como nodes usa z.any(), estruturas nested não são validadas
      expect(result.valid).toBe(true);
    });
  });

  describe('_formatZodErrors() - edge cases', () => {
    it('deve formatar erro too_big corretamente', () => {
      // Criar schema temporário com limite máximo para testar too_big
      const { z } = require('zod');
      const testSchema = z.object({
        name: z.string().max(5),
        nodes: z.array(z.any()).min(1),
        connections: z.any()
      });

      const validator = require('../../../../scripts/admin/n8n-transfer/plugins/validators/schema-validator').SchemaValidator;
      const v = new validator();

      // Simular erro too_big usando validação direta
      const result = testSchema.safeParse({
        name: 'ThisIsAVeryLongName',
        nodes: [{ id: 'n1', name: 'S', type: 't', position: [0, 0], parameters: {} }],
        connections: {}
      });

      if (!result.success) {
        const formatted = v._formatZodErrors(result.error);
        expect(formatted.some(e => e.includes('too big'))).toBe(true);
      }
    });

    it('deve formatar erro invalid_enum_value corretamente', () => {
      // Criar schema com enum para testar invalid_enum_value
      const { z } = require('zod');
      const testSchema = z.object({
        status: z.enum(['active', 'inactive']),
        nodes: z.array(z.any()).min(1),
        connections: z.any()
      });

      const validator = require('../../../../scripts/admin/n8n-transfer/plugins/validators/schema-validator').SchemaValidator;
      const v = new validator();

      const result = testSchema.safeParse({
        status: 'pending',
        nodes: [{ id: 'n1', name: 'S', type: 't', position: [0, 0], parameters: {} }],
        connections: {}
      });

      if (!result.success) {
        const formatted = v._formatZodErrors(result.error);
        expect(formatted.some(e => e.includes('Expected one of'))).toBe(true);
      }
    });

    it('deve formatar erro invalid_string corretamente', () => {
      // Criar schema com validação de email para testar invalid_string
      const { z } = require('zod');
      const testSchema = z.object({
        email: z.string().email(),
        nodes: z.array(z.any()).min(1),
        connections: z.any()
      });

      const validator = require('../../../../scripts/admin/n8n-transfer/plugins/validators/schema-validator').SchemaValidator;
      const v = new validator();

      const result = testSchema.safeParse({
        email: 'not-a-valid-email',
        nodes: [{ id: 'n1', name: 'S', type: 't', position: [0, 0], parameters: {} }],
        connections: {}
      });

      if (!result.success) {
        const formatted = v._formatZodErrors(result.error);
        expect(formatted.some(e => e.includes('invalid format') || e.includes('email'))).toBe(true);
      }
    });

    it('deve formatar erro unrecognized_keys corretamente', () => {
      // Criar schema strict para testar unrecognized_keys
      const { z } = require('zod');
      const testSchema = z.object({
        name: z.string(),
        nodes: z.array(z.any()).min(1)
      }).strict();

      const validator = require('../../../../scripts/admin/n8n-transfer/plugins/validators/schema-validator').SchemaValidator;
      const v = new validator();

      const result = testSchema.safeParse({
        name: 'Test',
        nodes: [{ id: 'n1' }],
        extraField: 'not allowed'
      });

      if (!result.success) {
        const formatted = v._formatZodErrors(result.error);
        expect(formatted.some(e => e.includes('Unrecognized') || e.includes('extraField'))).toBe(true);
      }
    });

    it('deve usar fallback default para códigos desconhecidos', () => {
      const validator = require('../../../../scripts/admin/n8n-transfer/plugins/validators/schema-validator').SchemaValidator;
      const v = new validator();

      // Simular erro com código desconhecido
      const mockError = {
        issues: [
          {
            code: 'unknown_error_code',
            path: ['test', 'field'],
            message: 'Unknown error occurred'
          }
        ]
      };

      const formatted = v._formatZodErrors(mockError);
      expect(formatted.some(e => e.includes('Validation error'))).toBe(true);
    });
  });

  describe('integração - cenários reais', () => {
    it('deve validar workflow n8n real exportado', () => {
      const workflow = {
        id: 'abc123',
        name: 'Customer Email Automation',
        active: true,
        nodes: [
          {
            id: 'node-1',
            name: 'Webhook',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 1,
            position: [240, 300],
            parameters: {
              path: 'customer-signup',
              httpMethod: 'POST',
              responseMode: 'onReceived'
            },
            credentials: {
              httpHeaderAuth: {
                id: '1',
                name: 'Webhook Auth'
              }
            }
          },
          {
            id: 'node-2',
            name: 'Send Email',
            type: 'n8n-nodes-base.emailSend',
            typeVersion: 1,
            position: [460, 300],
            parameters: {
              fromEmail: 'noreply@example.com',
              toEmail: '={{ $json.email }}',
              subject: 'Welcome!',
              text: 'Thanks for signing up!'
            },
            credentials: {
              smtp: {
                id: '2',
                name: 'SMTP Account'
              }
            }
          }
        ],
        connections: {
          'node-1': {
            main: [
              [
                {
                  node: 'node-2',
                  type: 'main',
                  index: 0
                }
              ]
            ]
          }
        },
        settings: {
          executionOrder: 'v1',
          saveDataErrorExecution: 'all',
          saveDataSuccessExecution: 'all'
        },
        tags: [
          { id: '1', name: 'production' },
          { id: '2', name: 'email' },
          { id: '3', name: 'automation' }
        ],
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-03T00:00:00.000Z'
      };

      const result = validator.validate(workflow);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.metadata.workflowName).toBe('Customer Email Automation');
      expect(result.metadata.nodeCount).toBe(2);
      expect(result.metadata.tagCount).toBe(3);
      expect(result.metadata.isActive).toBe(true);
    });
  });
});
