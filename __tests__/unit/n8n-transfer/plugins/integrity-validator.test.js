/**
 * @fileoverview Testes unitários para IntegrityValidator Plugin
 * @module tests/unit/plugins/integrity-validator.test
 */

const IntegrityValidator = require('../../../../scripts/admin/n8n-transfer/plugins/validators/integrity-validator');

describe('IntegrityValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new IntegrityValidator();
  });

  describe('constructor()', () => {
    it('deve criar instância com configurações corretas', () => {
      expect(validator.getName()).toBe('integrity-validator');
      expect(validator.getVersion()).toBe('1.0.0');
      expect(validator.getType()).toBe('validator');
    });

    it('deve ter descrição definida', () => {
      const description = validator.getDescription();
      expect(description).toBeTruthy();
      expect(description).toContain('integridade');
    });
  });

  describe('validate() - workflow válido completo', () => {
    it('deve validar workflow completo e correto', () => {
      const workflow = {
        name: 'Valid Workflow',
        nodes: [
          { id: 'node1', name: 'Start', type: 'n8n-nodes-base.start', parameters: {} },
          { id: 'node2', name: 'HTTP', type: 'n8n-nodes-base.httpRequest', parameters: {}, credentials: { httpApi: { id: '1' } } }
        ],
        connections: {
          node1: {
            main: [[{ node: 'node2', type: 'main', index: 0 }]]
          }
        }
      };

      const result = validator.validate(workflow);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.metadata.workflowName).toBe('Valid Workflow');
      expect(result.metadata.nodeCount).toBe(2);
      expect(result.metadata.connectionCount).toBe(1);
      expect(result.metadata.credentialNodeCount).toBe(1);
      expect(result.metadata.orphanedNodeCount).toBe(0);
      expect(result.metadata.circularDependencies).toBe(false);
    });
  });

  describe('_validateHasNodes()', () => {
    it('deve retornar erro se workflow.nodes for undefined', () => {
      const workflow = { name: 'Test' };
      const result = validator.validate(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Workflow não possui nodes - é necessário pelo menos 1 node');
    });

    it('deve retornar erro se workflow.nodes for null', () => {
      const workflow = { name: 'Test', nodes: null };
      const result = validator.validate(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Workflow não possui nodes - é necessário pelo menos 1 node');
    });

    it('deve retornar erro se workflow.nodes for array vazio', () => {
      const workflow = { name: 'Test', nodes: [] };
      const result = validator.validate(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Workflow não possui nodes - é necessário pelo menos 1 node');
    });

    it('deve retornar erro se workflow.nodes não for array', () => {
      const workflow = { name: 'Test', nodes: 'not-an-array' };
      const result = validator.validate(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Workflow não possui nodes - é necessário pelo menos 1 node');
    });

    it('deve aceitar workflow com pelo menos 1 node', () => {
      const workflow = {
        name: 'Test',
        nodes: [{ id: 'node1', name: 'Start', type: 'n8n-nodes-base.start' }],
        connections: {}
      };

      const result = validator.validate(workflow);
      expect(result.metadata.nodeCount).toBe(1);
    });
  });

  describe('_validateConnections()', () => {
    it('deve validar connections corretas', () => {
      const workflow = {
        name: 'Test',
        nodes: [
          { id: 'node1', name: 'Start' },
          { id: 'node2', name: 'End' }
        ],
        connections: {
          node1: {
            main: [[{ node: 'node2', type: 'main', index: 0 }]]
          }
        }
      };

      const result = validator.validate(workflow);
      expect(result.valid).toBe(true);
      expect(result.metadata.connectionCount).toBe(1);
    });

    it('deve retornar warning se connections não estiver definido', () => {
      const workflow = {
        name: 'Test',
        nodes: [{ id: 'node1', name: 'Start' }]
        // connections ausente
      };

      const result = validator.validate(workflow);
      expect(result.warnings).toContain('Workflow não possui connections definidas');
      expect(result.metadata.connectionCount).toBe(0);
    });

    it('deve retornar erro se source node não existir', () => {
      const workflow = {
        name: 'Test',
        nodes: [{ id: 'node1', name: 'Start' }],
        connections: {
          node999: { // ID inexistente
            main: [[{ node: 'node1', type: 'main', index: 0 }]]
          }
        }
      };

      const result = validator.validate(workflow);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Connection de source node "node999" referencia node inexistente');
    });

    it('deve retornar erro se target node não existir', () => {
      const workflow = {
        name: 'Test',
        nodes: [{ id: 'node1', name: 'Start' }],
        connections: {
          node1: {
            main: [[{ node: 'node999', type: 'main', index: 0 }]] // Target inexistente
          }
        }
      };

      const result = validator.validate(workflow);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('node999') && e.includes('target node inexistente'))).toBe(true);
    });

    it('deve retornar erro se connection não possui propriedade "node"', () => {
      const workflow = {
        name: 'Test',
        nodes: [{ id: 'node1', name: 'Start' }],
        connections: {
          node1: {
            main: [[{ type: 'main', index: 0 }]] // Falta "node"
          }
        }
      };

      const result = validator.validate(workflow);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('não possui propriedade "node"'))).toBe(true);
    });

    it('deve validar múltiplos connection types (main, ai, etc)', () => {
      const workflow = {
        name: 'Test',
        nodes: [
          { id: 'node1', name: 'Start' },
          { id: 'node2', name: 'End' },
          { id: 'node3', name: 'AI' }
        ],
        connections: {
          node1: {
            main: [[{ node: 'node2' }]],
            ai: [[{ node: 'node3' }]]
          }
        }
      };

      const result = validator.validate(workflow);
      expect(result.valid).toBe(true);
      expect(result.metadata.connectionCount).toBe(2);
    });

    it('deve validar múltiplos outputs (arrays aninhados)', () => {
      const workflow = {
        name: 'Test',
        nodes: [
          { id: 'node1', name: 'Start' },
          { id: 'node2', name: 'Branch1' },
          { id: 'node3', name: 'Branch2' }
        ],
        connections: {
          node1: {
            main: [
              [{ node: 'node2' }], // Output 0
              [{ node: 'node3' }]  // Output 1
            ]
          }
        }
      };

      const result = validator.validate(workflow);
      expect(result.valid).toBe(true);
      expect(result.metadata.connectionCount).toBe(2);
    });

    it('deve retornar warning para connection inválida (não-objeto)', () => {
      const workflow = {
        name: 'Test',
        nodes: [{ id: 'node1', name: 'Start' }],
        connections: {
          node1: {
            main: [['invalid-connection']] // String ao invés de objeto
          }
        }
      };

      const result = validator.validate(workflow);
      expect(result.warnings.some(w => w.includes('Connection inválida (não é objeto)'))).toBe(true);
    });
  });

  describe('_validateCredentials()', () => {
    it('deve contar nodes com credenciais válidas', () => {
      const workflow = {
        name: 'Test',
        nodes: [
          { id: 'node1', name: 'HTTP', credentials: { httpApi: { id: '1', name: 'MyAPI' } } },
          { id: 'node2', name: 'SQL', credentials: { postgres: { id: '2' } } }
        ],
        connections: {}
      };

      const result = validator.validate(workflow);
      expect(result.metadata.credentialNodeCount).toBe(2);
    });

    it('deve retornar warning para credentials vazia', () => {
      const workflow = {
        name: 'Test',
        nodes: [
          { id: 'node1', name: 'HTTP', credentials: {} } // Vazio
        ],
        connections: {}
      };

      const result = validator.validate(workflow);
      expect(result.warnings.some(w => w.includes('possui propriedade credentials vazia'))).toBe(true);
    });

    it('deve retornar warning para credential sem ID ou nome', () => {
      const workflow = {
        name: 'Test',
        nodes: [
          { id: 'node1', name: 'HTTP', credentials: { httpApi: {} } } // Sem id/name
        ],
        connections: {}
      };

      const result = validator.validate(workflow);
      expect(result.warnings.some(w => w.includes('sem ID ou nome'))).toBe(true);
    });

    it('deve retornar warning para credential que não é objeto', () => {
      const workflow = {
        name: 'Test',
        nodes: [
          { id: 'node1', name: 'HTTP', credentials: { httpApi: 'invalid' } }
        ],
        connections: {}
      };

      const result = validator.validate(workflow);
      expect(result.warnings.some(w => w.includes('credential "httpApi" inválida'))).toBe(true);
    });

    it('deve retornar warning para node desabilitado', () => {
      const workflow = {
        name: 'Test',
        nodes: [
          { id: 'node1', name: 'Disabled', disabled: true }
        ],
        connections: {}
      };

      const result = validator.validate(workflow);
      expect(result.warnings.some(w => w.includes('está desabilitado'))).toBe(true);
    });

    it('NÃO deve contar nodes sem credentials', () => {
      const workflow = {
        name: 'Test',
        nodes: [
          { id: 'node1', name: 'Start' } // Sem credentials
        ],
        connections: {}
      };

      const result = validator.validate(workflow);
      expect(result.metadata.credentialNodeCount).toBe(0);
    });
  });

  describe('_detectOrphanedNodes()', () => {
    it('deve detectar node órfão (sem conexões)', () => {
      const workflow = {
        name: 'Test',
        nodes: [
          { id: 'node1', name: 'Connected' },
          { id: 'node2', name: 'Orphan' }, // Órfão
          { id: 'node3', name: 'Connected2' }
        ],
        connections: {
          node1: {
            main: [[{ node: 'node3' }]]
          }
        }
      };

      const result = validator.validate(workflow);
      expect(result.metadata.orphanedNodeCount).toBe(1);
      expect(result.warnings.some(w => w.includes('Orphan') && w.includes('órfão'))).toBe(true);
    });

    it('NÃO deve detectar órfão se node tem conexão de saída', () => {
      const workflow = {
        name: 'Test',
        nodes: [
          { id: 'node1', name: 'Start' },
          { id: 'node2', name: 'End' }
        ],
        connections: {
          node1: {
            main: [[{ node: 'node2' }]]
          }
        }
      };

      const result = validator.validate(workflow);
      expect(result.metadata.orphanedNodeCount).toBe(0);
    });

    it('NÃO deve detectar órfão se node tem conexão de entrada', () => {
      const workflow = {
        name: 'Test',
        nodes: [
          { id: 'node1', name: 'Start' },
          { id: 'node2', name: 'End' }
        ],
        connections: {
          node1: {
            main: [[{ node: 'node2' }]]
          }
        }
      };

      const result = validator.validate(workflow);
      // node2 tem conexão de entrada (não é órfão)
      expect(result.metadata.orphanedNodeCount).toBe(0);
    });

    it('deve retornar warning se workflow não tem connections mas tem múltiplos nodes', () => {
      const workflow = {
        name: 'Test',
        nodes: [
          { id: 'node1', name: 'Node1' },
          { id: 'node2', name: 'Node2' }
        ],
        connections: {}
      };

      const result = validator.validate(workflow);
      expect(result.warnings.some(w => w.includes('nenhuma connection - todos os nodes estão órfãos'))).toBe(true);
      expect(result.metadata.orphanedNodeCount).toBe(2);
    });

    it('NÃO deve retornar warning se workflow tem apenas 1 node sem connections', () => {
      const workflow = {
        name: 'Test',
        nodes: [{ id: 'node1', name: 'Only' }],
        connections: {}
      };

      const result = validator.validate(workflow);
      expect(result.metadata.orphanedNodeCount).toBe(0);
    });
  });

  describe('_detectCircularDependencies()', () => {
    it('NÃO deve detectar ciclo em workflow linear', () => {
      const workflow = {
        name: 'Test',
        nodes: [
          { id: 'node1', name: 'A' },
          { id: 'node2', name: 'B' },
          { id: 'node3', name: 'C' }
        ],
        connections: {
          node1: { main: [[{ node: 'node2' }]] },
          node2: { main: [[{ node: 'node3' }]] }
        }
      };

      const result = validator.validate(workflow);
      expect(result.metadata.circularDependencies).toBe(false);
      expect(result.valid).toBe(true);
    });

    it('deve detectar ciclo simples (A -> B -> A)', () => {
      const workflow = {
        name: 'Test',
        nodes: [
          { id: 'node1', name: 'A' },
          { id: 'node2', name: 'B' }
        ],
        connections: {
          node1: { main: [[{ node: 'node2' }]] },
          node2: { main: [[{ node: 'node1' }]] } // Ciclo
        }
      };

      const result = validator.validate(workflow);
      expect(result.valid).toBe(false);
      expect(result.metadata.circularDependencies).toBe(true);
      expect(result.errors.some(e => e.includes('Dependência circular detectada'))).toBe(true);
    });

    it('deve detectar ciclo complexo (A -> B -> C -> A)', () => {
      const workflow = {
        name: 'Test',
        nodes: [
          { id: 'node1', name: 'A' },
          { id: 'node2', name: 'B' },
          { id: 'node3', name: 'C' }
        ],
        connections: {
          node1: { main: [[{ node: 'node2' }]] },
          node2: { main: [[{ node: 'node3' }]] },
          node3: { main: [[{ node: 'node1' }]] } // Ciclo
        }
      };

      const result = validator.validate(workflow);
      expect(result.valid).toBe(false);
      expect(result.metadata.circularDependencies).toBe(true);
    });

    it('deve detectar self-loop (A -> A)', () => {
      const workflow = {
        name: 'Test',
        nodes: [{ id: 'node1', name: 'A' }],
        connections: {
          node1: { main: [[{ node: 'node1' }]] } // Self-loop
        }
      };

      const result = validator.validate(workflow);
      expect(result.valid).toBe(false);
      expect(result.metadata.circularDependencies).toBe(true);
    });

    it('NÃO deve detectar ciclo em grafo com múltiplos caminhos sem ciclo', () => {
      const workflow = {
        name: 'Test',
        nodes: [
          { id: 'node1', name: 'A' },
          { id: 'node2', name: 'B' },
          { id: 'node3', name: 'C' },
          { id: 'node4', name: 'D' }
        ],
        connections: {
          node1: { main: [[{ node: 'node2' }, { node: 'node3' }]] }, // Fork
          node2: { main: [[{ node: 'node4' }]] },
          node3: { main: [[{ node: 'node4' }]] } // Join
        }
      };

      const result = validator.validate(workflow);
      expect(result.metadata.circularDependencies).toBe(false);
    });

    it('deve incluir nomes de nodes na mensagem de erro de ciclo', () => {
      const workflow = {
        name: 'Test',
        nodes: [
          { id: 'node1', name: 'Start Node' },
          { id: 'node2', name: 'Process Node' }
        ],
        connections: {
          node1: { main: [[{ node: 'node2' }]] },
          node2: { main: [[{ node: 'node1' }]] }
        }
      };

      const result = validator.validate(workflow);
      const circularError = result.errors.find(e => e.includes('Dependência circular'));

      expect(circularError).toBeTruthy();
      expect(circularError).toContain('Start Node');
      expect(circularError).toContain('Process Node');
    });
  });

  describe('validate() - múltiplos erros', () => {
    it('deve retornar múltiplos erros quando houver', () => {
      const workflow = {
        name: 'Test',
        nodes: [
          { id: 'node1', name: 'A' },
          { id: 'node2', name: 'B' }
        ],
        connections: {
          node1: {
            main: [[{ node: 'node999' }]] // Target inexistente (erro 1)
          },
          node999: { // Source node inexistente (erro 2)
            main: [[{ node: 'node1' }]]
          },
          node2: {
            main: [[{ type: 'main' }]] // Sem propriedade "node" (erro 3)
          }
        }
      };

      const result = validator.validate(workflow);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('metadata', () => {
    it('deve incluir workflowName em metadata', () => {
      const workflow = {
        name: 'My Test Workflow',
        nodes: [{ id: 'node1', name: 'Start' }],
        connections: {}
      };

      const result = validator.validate(workflow);
      expect(result.metadata.workflowName).toBe('My Test Workflow');
    });

    it('deve usar "Unnamed Workflow" se nome ausente', () => {
      const workflow = {
        nodes: [{ id: 'node1', name: 'Start' }],
        connections: {}
      };

      const result = validator.validate(workflow);
      expect(result.metadata.workflowName).toBe('Unnamed Workflow');
    });

    it('deve incluir timestamp ISO em validatedAt', () => {
      const workflow = {
        name: 'Test',
        nodes: [{ id: 'node1', name: 'Start' }],
        connections: {}
      };

      const result = validator.validate(workflow);
      expect(result.metadata.validatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('integração - cenários reais', () => {
    it('deve validar workflow n8n real completo', () => {
      const workflow = {
        name: 'Customer Onboarding Automation',
        active: true,
        nodes: [
          {
            id: 'start',
            name: 'Start',
            type: 'n8n-nodes-base.start',
            position: [240, 300],
            parameters: {}
          },
          {
            id: 'webhook',
            name: 'Webhook',
            type: 'n8n-nodes-base.webhook',
            position: [460, 300],
            parameters: { path: 'customer', httpMethod: 'POST' },
            credentials: { httpHeaderAuth: { id: '1', name: 'Webhook Auth' } }
          },
          {
            id: 'http',
            name: 'Create Customer',
            type: 'n8n-nodes-base.httpRequest',
            position: [680, 300],
            parameters: { url: 'https://api.example.com/customers', method: 'POST' },
            credentials: { httpApi: { id: '2', name: 'API Credentials' } }
          },
          {
            id: 'email',
            name: 'Send Welcome Email',
            type: 'n8n-nodes-base.emailSend',
            position: [900, 300],
            parameters: { subject: 'Welcome!', toEmail: '={{ $json.email }}' },
            credentials: { smtp: { id: '3', name: 'SMTP' } }
          }
        ],
        connections: {
          start: { main: [[{ node: 'webhook', type: 'main', index: 0 }]] },
          webhook: { main: [[{ node: 'http', type: 'main', index: 0 }]] },
          http: { main: [[{ node: 'email', type: 'main', index: 0 }]] }
        },
        settings: {
          executionOrder: 'v1'
        },
        tags: [
          { id: '1', name: 'production' },
          { id: '2', name: 'automation' }
        ]
      };

      const result = validator.validate(workflow);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.metadata.nodeCount).toBe(4);
      expect(result.metadata.connectionCount).toBe(3);
      expect(result.metadata.credentialNodeCount).toBe(3);
      expect(result.metadata.orphanedNodeCount).toBe(0);
      expect(result.metadata.circularDependencies).toBe(false);
    });

    it('deve detectar múltiplos problemas em workflow problemático', () => {
      const workflow = {
        name: 'Problematic Workflow',
        nodes: [
          { id: 'node1', name: 'Start', disabled: true },
          { id: 'node2', name: 'Orphan' },
          { id: 'node3', name: 'Loop1' },
          { id: 'node4', name: 'Loop2' }
        ],
        connections: {
          node3: { main: [[{ node: 'node4' }]] },
          node4: { main: [[{ node: 'node3' }]] } // Ciclo
        }
      };

      const result = validator.validate(workflow);

      expect(result.valid).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0); // Node desabilitado, órfãos
      expect(result.errors.length).toBeGreaterThan(0); // Ciclo
      expect(result.metadata.orphanedNodeCount).toBeGreaterThan(0);
      expect(result.metadata.circularDependencies).toBe(true);
    });
  });
});
