/**
 * @fileoverview Testes unitários para StandardDeduplicator Plugin
 * @module tests/unit/plugins/standard-deduplicator.test
 */

const StandardDeduplicator = require('../../../../scripts/admin/n8n-transfer/plugins/deduplicators/standard-deduplicator');

describe('StandardDeduplicator', () => {
  let deduplicator;

  beforeEach(() => {
    deduplicator = new StandardDeduplicator();
  });

  describe('constructor()', () => {
    it('deve criar instância com configurações corretas', () => {
      expect(deduplicator.getName()).toBe('standard-deduplicator');
      expect(deduplicator.getVersion()).toBe('1.0.0');
      expect(deduplicator.getType()).toBe('deduplicator');
    });

    it('deve ter descrição definida', () => {
      const description = deduplicator.getDescription();
      expect(description).toBeTruthy();
      expect(description).toContain('nome e tags');
    });
  });

  describe('isDuplicate()', () => {
    describe('validação de entrada', () => {
      it('deve retornar false para workflow null', () => {
        const result = deduplicator.isDuplicate(null, []);
        expect(result).toBe(false);
        expect(deduplicator.getReason()).toContain('Workflow inválido');
      });

      it('deve retornar false para workflow undefined', () => {
        const result = deduplicator.isDuplicate(undefined, []);
        expect(result).toBe(false);
        expect(deduplicator.getReason()).toContain('Workflow inválido');
      });

      it('deve retornar false para workflow não-objeto', () => {
        const result = deduplicator.isDuplicate('not-an-object', []);
        expect(result).toBe(false);
        expect(deduplicator.getReason()).toContain('Workflow inválido');
      });

      it('deve retornar false para existingWorkflows não-array', () => {
        const workflow = { name: 'Test', tags: [] };
        const result = deduplicator.isDuplicate(workflow, 'not-an-array');
        expect(result).toBe(false);
        expect(deduplicator.getReason()).toContain('Lista de workflows existentes inválida');
      });

      it('deve retornar false para existingWorkflows null', () => {
        const workflow = { name: 'Test', tags: [] };
        const result = deduplicator.isDuplicate(workflow, null);
        expect(result).toBe(false);
        expect(deduplicator.getReason()).toContain('Lista de workflows existentes inválida');
      });
    });

    describe('detecção de duplicatas - nome e tags', () => {
      it('deve detectar duplicata com nome e tags iguais (mesma ordem)', () => {
        const workflow = { name: 'Customer Onboarding', tags: ['automation', 'sales', 'crm'] };
        const existing = [{ name: 'Customer Onboarding', tags: ['automation', 'sales', 'crm'] }];

        const result = deduplicator.isDuplicate(workflow, existing);
        expect(result).toBe(true);
        expect(deduplicator.getReason()).toContain('Customer Onboarding');
        expect(deduplicator.getReason()).toContain('automation');
      });

      it('deve detectar duplicata com nome e tags iguais (ordem diferente)', () => {
        const workflow = { name: 'Customer Onboarding', tags: ['automation', 'sales', 'crm'] };
        const existing = [{ name: 'Customer Onboarding', tags: ['sales', 'crm', 'automation'] }];

        const result = deduplicator.isDuplicate(workflow, existing);
        expect(result).toBe(true);
      });

      it('deve detectar duplicata em lista com múltiplos workflows', () => {
        const workflow = { name: 'Data Sync', tags: ['integration', 'api'] };
        const existing = [
          { name: 'Email Sender', tags: ['email'] },
          { name: 'Data Sync', tags: ['api', 'integration'] }, // Duplicata
          { name: 'Invoice Generator', tags: ['finance'] }
        ];

        const result = deduplicator.isDuplicate(workflow, existing);
        expect(result).toBe(true);
      });

      it('NÃO deve detectar duplicata se nome for diferente', () => {
        const workflow = { name: 'Customer Onboarding V2', tags: ['automation', 'sales', 'crm'] };
        const existing = [{ name: 'Customer Onboarding', tags: ['automation', 'sales', 'crm'] }];

        const result = deduplicator.isDuplicate(workflow, existing);
        expect(result).toBe(false);
      });

      it('NÃO deve detectar duplicata se tags forem diferentes', () => {
        const workflow = { name: 'Customer Onboarding', tags: ['automation', 'marketing'] };
        const existing = [{ name: 'Customer Onboarding', tags: ['automation', 'sales'] }];

        const result = deduplicator.isDuplicate(workflow, existing);
        expect(result).toBe(false);
      });

      it('NÃO deve detectar duplicata se quantidade de tags for diferente', () => {
        const workflow = { name: 'Email Marketing', tags: ['marketing', 'email'] };
        const existing = [{ name: 'Email Marketing', tags: ['marketing', 'email', 'automation'] }];

        const result = deduplicator.isDuplicate(workflow, existing);
        expect(result).toBe(false);
      });

      it('deve comparar nomes com case-sensitive', () => {
        const workflow = { name: 'customer onboarding', tags: ['automation'] };
        const existing = [{ name: 'Customer Onboarding', tags: ['automation'] }];

        const result = deduplicator.isDuplicate(workflow, existing);
        expect(result).toBe(false);
      });
    });

    describe('edge cases - tags undefined/null', () => {
      it('deve tratar workflow.tags undefined como array vazio', () => {
        const workflow = { name: 'Simple Workflow' }; // tags undefined
        const existing = [{ name: 'Simple Workflow', tags: [] }];

        const result = deduplicator.isDuplicate(workflow, existing);
        expect(result).toBe(true);
      });

      it('deve tratar existing.tags undefined como array vazio', () => {
        const workflow = { name: 'Simple Workflow', tags: [] };
        const existing = [{ name: 'Simple Workflow' }]; // tags undefined

        const result = deduplicator.isDuplicate(workflow, existing);
        expect(result).toBe(true);
      });

      it('deve tratar ambos tags undefined como duplicata', () => {
        const workflow = { name: 'Simple Workflow' };
        const existing = [{ name: 'Simple Workflow' }];

        const result = deduplicator.isDuplicate(workflow, existing);
        expect(result).toBe(true);
      });

      it('deve tratar workflow.tags null como array vazio', () => {
        const workflow = { name: 'Test', tags: null };
        const existing = [{ name: 'Test', tags: [] }];

        const result = deduplicator.isDuplicate(workflow, existing);
        expect(result).toBe(true);
      });

      it('NÃO deve detectar duplicata se um tem tags e outro não', () => {
        const workflow = { name: 'Test', tags: ['tag1'] };
        const existing = [{ name: 'Test', tags: [] }];

        const result = deduplicator.isDuplicate(workflow, existing);
        expect(result).toBe(false);
      });
    });

    describe('edge cases - arrays vazios', () => {
      it('deve retornar false para existingWorkflows vazio', () => {
        const workflow = { name: 'Test', tags: [] };
        const result = deduplicator.isDuplicate(workflow, []);
        expect(result).toBe(false);
      });

      it('deve detectar duplicata com tags vazias', () => {
        const workflow = { name: 'Test', tags: [] };
        const existing = [{ name: 'Test', tags: [] }];

        const result = deduplicator.isDuplicate(workflow, existing);
        expect(result).toBe(true);
      });
    });

    describe('edge cases - tags com duplicatas', () => {
      it('NÃO deve considerar duplicata se tags tiverem duplicatas diferentes', () => {
        // ['a', 'a'] vs ['a'] são diferentes
        const workflow = { name: 'Test', tags: ['tag1', 'tag1'] };
        const existing = [{ name: 'Test', tags: ['tag1'] }];

        const result = deduplicator.isDuplicate(workflow, existing);
        expect(result).toBe(false);
      });
    });
  });

  describe('getReason()', () => {
    it('deve retornar mensagem padrão se nenhuma verificação foi realizada', () => {
      const reason = deduplicator.getReason();
      expect(reason).toBe('Nenhuma verificação realizada');
    });

    it('deve retornar razão após encontrar duplicata', () => {
      const workflow = { name: 'Customer Sync', tags: ['crm', 'integration'] };
      const existing = [{ name: 'Customer Sync', tags: ['integration', 'crm'] }];

      deduplicator.isDuplicate(workflow, existing);
      const reason = deduplicator.getReason();

      expect(reason).toContain('Workflow duplicado encontrado');
      expect(reason).toContain('Customer Sync');
      expect(reason).toContain('crm');
      expect(reason).toContain('integration');
    });

    it('deve retornar razão de validação se workflow for inválido', () => {
      deduplicator.isDuplicate(null, []);
      const reason = deduplicator.getReason();
      expect(reason).toContain('Workflow inválido');
    });

    it('deve resetar razão em nova verificação', () => {
      const workflow1 = { name: 'Test1', tags: [] };
      const workflow2 = { name: 'Test2', tags: [] };
      const existing = [{ name: 'Test1', tags: [] }];

      // Primeira verificação - duplicata
      deduplicator.isDuplicate(workflow1, existing);
      expect(deduplicator.getReason()).toContain('Test1');

      // Segunda verificação - não duplicata
      deduplicator.isDuplicate(workflow2, existing);
      // Razão deve ser resetada (nenhuma duplicata)
      const reason = deduplicator.getReason();
      expect(reason).toBe('Nenhuma verificação realizada');
    });
  });

  describe('getDuplicateWorkflow()', () => {
    it('deve retornar null se nenhuma duplicata foi encontrada', () => {
      const duplicate = deduplicator.getDuplicateWorkflow();
      expect(duplicate).toBeNull();
    });

    it('deve retornar workflow duplicado encontrado', () => {
      const workflow = { name: 'Test', tags: ['tag1'] };
      const existing = [{ name: 'Test', tags: ['tag1'], id: 123 }];

      deduplicator.isDuplicate(workflow, existing);
      const duplicate = deduplicator.getDuplicateWorkflow();

      expect(duplicate).toBeDefined();
      expect(duplicate.id).toBe(123);
      expect(duplicate.name).toBe('Test');
    });

    it('deve resetar duplicateWorkflow em nova verificação sem duplicata', () => {
      const workflow1 = { name: 'Test1', tags: [] };
      const workflow2 = { name: 'Test2', tags: [] };
      const existing = [{ name: 'Test1', tags: [], id: 123 }];

      // Primeira verificação - encontra duplicata
      deduplicator.isDuplicate(workflow1, existing);
      expect(deduplicator.getDuplicateWorkflow()).toBeDefined();

      // Segunda verificação - não encontra duplicata
      deduplicator.isDuplicate(workflow2, existing);
      expect(deduplicator.getDuplicateWorkflow()).toBeNull();
    });

    it('deve retornar o workflow correto quando há múltiplas duplicatas potenciais', () => {
      const workflow = { name: 'Test', tags: ['tag1'] };
      const existing = [
        { name: 'Other', tags: ['tag1'], id: 100 },
        { name: 'Test', tags: ['tag1'], id: 200 }, // Esta é a duplicata
        { name: 'Test', tags: ['tag2'], id: 300 }  // Nome igual mas tags diferentes
      ];

      deduplicator.isDuplicate(workflow, existing);
      const duplicate = deduplicator.getDuplicateWorkflow();

      expect(duplicate.id).toBe(200);
    });
  });

  describe('_areTagsEqual() - método privado (testes indiretos)', () => {
    // Testado indiretamente através de isDuplicate()

    it('deve considerar arrays vazios como iguais', () => {
      const workflow = { name: 'Test', tags: [] };
      const existing = [{ name: 'Test', tags: [] }];
      expect(deduplicator.isDuplicate(workflow, existing)).toBe(true);
    });

    it('deve ignorar ordem dos elementos', () => {
      const workflow = { name: 'Test', tags: ['a', 'b', 'c'] };
      const existing = [{ name: 'Test', tags: ['c', 'a', 'b'] }];
      expect(deduplicator.isDuplicate(workflow, existing)).toBe(true);
    });

    it('deve detectar diferença em quantidade de elementos', () => {
      const workflow = { name: 'Test', tags: ['a', 'b'] };
      const existing = [{ name: 'Test', tags: ['a', 'b', 'c'] }];
      expect(deduplicator.isDuplicate(workflow, existing)).toBe(false);
    });

    it('deve detectar diferença em elementos', () => {
      const workflow = { name: 'Test', tags: ['a', 'b', 'c'] };
      const existing = [{ name: 'Test', tags: ['a', 'b', 'd'] }];
      expect(deduplicator.isDuplicate(workflow, existing)).toBe(false);
    });
  });

  describe('integração - cenários reais', () => {
    it('deve lidar com workflow complexo real', () => {
      const workflow = {
        id: 'wf-123',
        name: 'Customer Onboarding Automation',
        tags: ['production', 'critical', 'customer-service', 'automation'],
        active: true,
        nodes: [{}, {}, {}] // 3 nodes
      };

      const existing = [
        {
          id: 'wf-001',
          name: 'Customer Onboarding Automation',
          tags: ['automation', 'critical', 'production', 'customer-service'], // ordem diferente
          active: true,
          nodes: [{}, {}] // 2 nodes
        }
      ];

      const result = deduplicator.isDuplicate(workflow, existing);
      expect(result).toBe(true);

      const duplicate = deduplicator.getDuplicateWorkflow();
      expect(duplicate.id).toBe('wf-001');
    });

    it('deve processar lista grande de workflows eficientemente', () => {
      const workflow = { name: 'Target', tags: ['tag1', 'tag2'] };

      // Criar 1000 workflows existentes
      const existing = Array.from({ length: 1000 }, (_, i) => ({
        name: `Workflow ${i}`,
        tags: [`tag${i}`]
      }));

      // Adicionar duplicata no final
      existing.push({ name: 'Target', tags: ['tag2', 'tag1'] });

      const startTime = Date.now();
      const result = deduplicator.isDuplicate(workflow, existing);
      const duration = Date.now() - startTime;

      expect(result).toBe(true);
      expect(duration).toBeLessThan(100); // Deve completar em menos de 100ms
    });
  });
});
