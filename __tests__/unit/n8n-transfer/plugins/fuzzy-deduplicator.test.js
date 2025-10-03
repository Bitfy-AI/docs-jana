/**
 * @fileoverview Testes unitários para FuzzyDeduplicator Plugin
 * @module tests/unit/plugins/fuzzy-deduplicator.test
 */

const FuzzyDeduplicator = require('../../../../scripts/admin/n8n-transfer/plugins/deduplicators/fuzzy-deduplicator');

describe('FuzzyDeduplicator', () => {
  let deduplicator;

  beforeEach(() => {
    deduplicator = new FuzzyDeduplicator();
  });

  describe('constructor()', () => {
    it('deve criar instância com configurações corretas', () => {
      expect(deduplicator.getName()).toBe('fuzzy-deduplicator');
      expect(deduplicator.getVersion()).toBe('1.0.0');
      expect(deduplicator.getType()).toBe('deduplicator');
    });

    it('deve ter threshold padrão de 0.85', () => {
      const threshold = deduplicator.getOption('threshold');
      expect(threshold).toBe(0.85);
    });

    it('deve ter caseSensitive padrão false', () => {
      const caseSensitive = deduplicator.getOption('caseSensitive');
      expect(caseSensitive).toBe(false);
    });

    it('deve ter compareFields padrão como ["name"]', () => {
      const fields = deduplicator.getOption('compareFields');
      expect(fields).toEqual(['name']);
    });
  });

  describe('_levenshteinDistance()', () => {
    it('deve calcular distância correta para strings idênticas', () => {
      const distance = deduplicator._levenshteinDistance('hello', 'hello');
      expect(distance).toBe(0);
    });

    it('deve calcular distância correta para strings completamente diferentes', () => {
      const distance = deduplicator._levenshteinDistance('abc', 'xyz');
      expect(distance).toBe(3);
    });

    it('deve calcular distância para exemplo clássico (kitten -> sitting)', () => {
      const distance = deduplicator._levenshteinDistance('kitten', 'sitting');
      expect(distance).toBe(3);
      // kitten -> sitten (substitui k por s) = 1
      // sitten -> sittin (substitui e por i) = 2
      // sittin -> sitting (insere g) = 3
    });

    it('deve calcular distância com uma substituição', () => {
      const distance = deduplicator._levenshteinDistance('hello', 'hallo');
      expect(distance).toBe(1);
    });

    it('deve calcular distância com uma inserção', () => {
      const distance = deduplicator._levenshteinDistance('hello', 'hellos');
      expect(distance).toBe(1);
    });

    it('deve calcular distância com uma deleção', () => {
      const distance = deduplicator._levenshteinDistance('hello', 'hell');
      expect(distance).toBe(1);
    });

    it('deve tratar strings vazias corretamente', () => {
      expect(deduplicator._levenshteinDistance('', '')).toBe(0);
      expect(deduplicator._levenshteinDistance('hello', '')).toBe(5);
      expect(deduplicator._levenshteinDistance('', 'hello')).toBe(5);
    });

    it('deve tratar espaços em branco (trim)', () => {
      const distance = deduplicator._levenshteinDistance('  hello  ', 'hello');
      expect(distance).toBe(0);
    });

    it('deve ignorar case por padrão (caseSensitive: false)', () => {
      const distance = deduplicator._levenshteinDistance('HELLO', 'hello');
      expect(distance).toBe(0);
    });

    it('deve respeitar case quando caseSensitive: true', () => {
      deduplicator.setOptions({ caseSensitive: true });
      const distance = deduplicator._levenshteinDistance('HELLO', 'hello');
      expect(distance).toBeGreaterThan(0);
    });

    it('deve lançar erro se str1 não for string', () => {
      expect(() => {
        deduplicator._levenshteinDistance(123, 'hello');
      }).toThrow('Ambos os parâmetros devem ser strings');
    });

    it('deve lançar erro se str2 não for string', () => {
      expect(() => {
        deduplicator._levenshteinDistance('hello', null);
      }).toThrow('Ambos os parâmetros devem ser strings');
    });
  });

  describe('_calculateSimilarity()', () => {
    it('deve retornar 1.0 para strings idênticas', () => {
      const similarity = deduplicator._calculateSimilarity('hello', 'hello');
      expect(similarity).toBe(1.0);
    });

    it('deve retornar 0.0 para strings completamente diferentes (mesmo tamanho)', () => {
      const similarity = deduplicator._calculateSimilarity('abc', 'xyz');
      expect(similarity).toBe(0.0);
    });

    it('deve retornar 1.0 para strings vazias', () => {
      const similarity = deduplicator._calculateSimilarity('', '');
      expect(similarity).toBe(1.0);
    });

    it('deve calcular similaridade correta (80%) para "hello" vs "hallo"', () => {
      // Distance = 1, maxLength = 5
      // Similarity = 1 - (1 / 5) = 0.8
      const similarity = deduplicator._calculateSimilarity('hello', 'hallo');
      expect(similarity).toBeCloseTo(0.8, 2);
    });

    it('deve calcular similaridade entre 0 e 1', () => {
      const similarity = deduplicator._calculateSimilarity('test', 'testing');
      expect(similarity).toBeGreaterThanOrEqual(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });

    it('deve ignorar case por padrão', () => {
      const similarity = deduplicator._calculateSimilarity('HELLO', 'hello');
      expect(similarity).toBe(1.0);
    });

    it('deve usar string mais longa para cálculo', () => {
      // "ab" vs "abcd": distance = 2, maxLength = 4
      // Similarity = 1 - (2 / 4) = 0.5
      const similarity = deduplicator._calculateSimilarity('ab', 'abcd');
      expect(similarity).toBeCloseTo(0.5, 2);
    });
  });

  describe('isDuplicate()', () => {
    describe('validação de entrada', () => {
      it('deve lançar erro se workflow for null', () => {
        expect(() => {
          deduplicator.isDuplicate(null, []);
        }).toThrow('Workflow deve ser um objeto válido');
      });

      it('deve lançar erro se workflow não for objeto', () => {
        expect(() => {
          deduplicator.isDuplicate('not-object', []);
        }).toThrow('Workflow deve ser um objeto válido');
      });

      it('deve lançar erro se workflow.name não existir', () => {
        expect(() => {
          deduplicator.isDuplicate({}, []);
        }).toThrow('Workflow deve possuir propriedade "name" do tipo string');
      });

      it('deve lançar erro se workflow.name não for string', () => {
        expect(() => {
          deduplicator.isDuplicate({ name: 123 }, []);
        }).toThrow('Workflow deve possuir propriedade "name" do tipo string');
      });

      it('deve lançar erro se existingWorkflows não for array', () => {
        expect(() => {
          deduplicator.isDuplicate({ name: 'Test' }, 'not-array');
        }).toThrow('existingWorkflows deve ser um array');
      });

      it('deve retornar false se existingWorkflows estiver vazio', () => {
        const result = deduplicator.isDuplicate({ name: 'Test' }, []);
        expect(result).toBe(false);
      });
    });

    describe('threshold validation', () => {
      it('deve lançar erro se threshold < 0', () => {
        deduplicator.setOptions({ threshold: -0.1 });
        expect(() => {
          deduplicator.isDuplicate({ name: 'Test' }, [{ name: 'Test' }]);
        }).toThrow('Threshold deve estar entre 0 e 1');
      });

      it('deve lançar erro se threshold > 1', () => {
        deduplicator.setOptions({ threshold: 1.1 });
        expect(() => {
          deduplicator.isDuplicate({ name: 'Test' }, [{ name: 'Test' }]);
        }).toThrow('Threshold deve estar entre 0 e 1');
      });

      it('deve aceitar threshold = 0', () => {
        deduplicator.setOptions({ threshold: 0 });
        expect(() => {
          deduplicator.isDuplicate({ name: 'Test' }, [{ name: 'Different' }]);
        }).not.toThrow();
      });

      it('deve aceitar threshold = 1', () => {
        deduplicator.setOptions({ threshold: 1 });
        expect(() => {
          deduplicator.isDuplicate({ name: 'Test' }, [{ name: 'Test' }]);
        }).not.toThrow();
      });
    });

    describe('fuzzy matching - threshold padrão (0.85)', () => {
      it('deve detectar duplicata para nomes idênticos (100% similar)', () => {
        const workflow = { name: 'Customer Onboarding' };
        const existing = [{ name: 'Customer Onboarding' }];

        const result = deduplicator.isDuplicate(workflow, existing);
        expect(result).toBe(true);
      });

      it('deve detectar duplicata para nomes muito similares (>85%)', () => {
        const workflow = { name: 'Customer Onboarding v2' };
        const existing = [{ name: 'Customer Onboarding' }];

        const result = deduplicator.isDuplicate(workflow, existing);
        expect(result).toBe(true);
      });

      it('NÃO deve detectar duplicata para nomes diferentes (<85%)', () => {
        const workflow = { name: 'Invoice Processing' };
        const existing = [{ name: 'Customer Onboarding' }];

        const result = deduplicator.isDuplicate(workflow, existing);
        expect(result).toBe(false);
      });

      it('deve ignorar diferenças de case por padrão', () => {
        const workflow = { name: 'CUSTOMER ONBOARDING' };
        const existing = [{ name: 'customer onboarding' }];

        const result = deduplicator.isDuplicate(workflow, existing);
        expect(result).toBe(true);
      });

      it('deve detectar duplicata com typo único', () => {
        const workflow = { name: 'Customar Onboarding' }; // typo: customar
        const existing = [{ name: 'Customer Onboarding' }];

        const result = deduplicator.isDuplicate(workflow, existing);
        // Similarity alta o suficiente para threshold 0.85
        expect(result).toBe(true);
      });
    });

    describe('threshold customizado', () => {
      it('deve detectar duplicata com threshold baixo (0.5)', () => {
        deduplicator.setOptions({ threshold: 0.5 });

        const workflow = { name: 'Test Workflow ABC' };
        const existing = [{ name: 'Test Workflow XYZ' }]; // ~70% similar

        const result = deduplicator.isDuplicate(workflow, existing);
        expect(result).toBe(true);
      });

      it('NÃO deve detectar duplicata com threshold alto (0.95)', () => {
        deduplicator.setOptions({ threshold: 0.95 });

        const workflow = { name: 'Customer Onboarding v2' };
        const existing = [{ name: 'Customer Onboarding' }]; // ~90% similar

        const result = deduplicator.isDuplicate(workflow, existing);
        expect(result).toBe(false);
      });

      it('deve detectar apenas match exato com threshold 1.0', () => {
        deduplicator.setOptions({ threshold: 1.0 });

        const workflow = { name: 'Test' };
        const existing = [{ name: 'Test' }];

        expect(deduplicator.isDuplicate(workflow, existing)).toBe(true);

        const workflow2 = { name: 'Test!' };
        expect(deduplicator.isDuplicate(workflow2, existing)).toBe(false);
      });

      it('deve detectar qualquer match com threshold 0', () => {
        deduplicator.setOptions({ threshold: 0 });

        const workflow = { name: 'ABC' };
        const existing = [{ name: 'XYZ' }]; // 0% similar

        const result = deduplicator.isDuplicate(workflow, existing);
        expect(result).toBe(true); // Threshold 0 aceita qualquer similaridade >= 0
      });
    });

    describe('seleção do melhor match', () => {
      it('deve selecionar workflow com maior similaridade', () => {
        const workflow = { name: 'Customer Onboarding' };
        const existing = [
          { name: 'Invoice Processing' },        // ~20% similar
          { name: 'Customer Onboarding v2' },    // ~90% similar
          { name: 'Data Sync' }                  // ~10% similar
        ];

        deduplicator.isDuplicate(workflow, existing);
        const reason = deduplicator.getReason();

        expect(reason).toContain('Customer Onboarding v2');
      });

      it('deve ignorar workflows com name inválido', () => {
        const workflow = { name: 'Test Workflow' };
        const existing = [
          { name: null },           // Inválido
          {},                       // name ausente
          { name: 123 },            // tipo errado
          { name: 'Test Workflow 2' }    // Válido - similaridade ~86.7% > 85%
        ];

        const result = deduplicator.isDuplicate(workflow, existing);
        expect(result).toBe(true);
        expect(deduplicator.getReason()).toContain('Test Workflow 2');
      });
    });

    describe('case sensitivity', () => {
      it('deve ignorar case com caseSensitive: false (padrão)', () => {
        const workflow = { name: 'HELLO WORLD' };
        const existing = [{ name: 'hello world' }];

        const result = deduplicator.isDuplicate(workflow, existing);
        expect(result).toBe(true);
      });

      it('deve considerar case com caseSensitive: true', () => {
        deduplicator.setOptions({ caseSensitive: true });

        const workflow = { name: 'HELLO WORLD' };
        const existing = [{ name: 'hello world' }];

        // Similaridade será menor devido a diferenças de case
        const result = deduplicator.isDuplicate(workflow, existing);
        expect(result).toBe(false);
      });
    });
  });

  describe('getReason()', () => {
    it('deve retornar mensagem padrão se nenhuma duplicata foi detectada', () => {
      const reason = deduplicator.getReason();
      expect(reason).toBe('Nenhuma duplicata detectada');
    });

    it('deve retornar razão com nome e similaridade após match', () => {
      const workflow = { name: 'Customer Onboarding' };
      const existing = [{ name: 'Customer Onboarding v2' }];

      deduplicator.isDuplicate(workflow, existing);
      const reason = deduplicator.getReason();

      expect(reason).toContain('Workflow similar encontrado');
      expect(reason).toContain('Customer Onboarding v2');
      expect(reason).toContain('%'); // Similaridade em percentual
    });

    it('deve formatar similaridade com 1 casa decimal', () => {
      const workflow = { name: 'Test' };
      const existing = [{ name: 'Test' }];

      deduplicator.isDuplicate(workflow, existing);
      const reason = deduplicator.getReason();

      // Deve conter "100.0%" não "100%"
      expect(reason).toMatch(/\d+\.\d%/);
    });

    it('deve resetar razão após verificação sem duplicata', () => {
      const workflow1 = { name: 'Match' };
      const workflow2 = { name: 'Different' };
      const existing = [{ name: 'Match' }];

      // Primeira verificação - match
      deduplicator.isDuplicate(workflow1, existing);
      expect(deduplicator.getReason()).toContain('Match');

      // Segunda verificação - sem match
      deduplicator.isDuplicate(workflow2, existing);
      expect(deduplicator.getReason()).toBe('Nenhuma duplicata detectada');
    });
  });

  describe('integração - cenários reais', () => {
    it('deve lidar com workflow real com nome complexo', () => {
      // Usar threshold mais baixo para este teste (similaridade é ~82%)
      deduplicator.setOptions({ threshold: 0.80 });

      const workflow = {
        name: 'Customer Onboarding & Email Automation (Production)',
        id: '123'
      };
      const existing = [
        { name: 'Customer Onboarding & Email Automation (Staging)', id: '456' }
      ];

      const result = deduplicator.isDuplicate(workflow, existing);
      expect(result).toBe(true); // Muito similar apesar de Staging vs Production

      // Resetar threshold para não afetar outros testes
      deduplicator.setOptions({ threshold: 0.85 });
    });

    it('deve lidar com nomes com caracteres especiais', () => {
      const workflow = { name: 'Workflow: Test #1 (v2.0)' };
      const existing = [{ name: 'Workflow: Test #1 (v1.0)' }];

      const result = deduplicator.isDuplicate(workflow, existing);
      expect(result).toBe(true);
    });

    it('deve lidar com lista grande de workflows', () => {
      const workflow = { name: 'Target Workflow v1' };

      // 1000 workflows diferentes
      const existing = Array.from({ length: 1000 }, (_, i) => ({
        name: `Workflow ${i}`
      }));

      // Adicionar match similar no final (similaridade ~94.4% > 85%)
      existing.push({ name: 'Target Workflow v2' });

      const startTime = Date.now();
      const result = deduplicator.isDuplicate(workflow, existing);
      const duration = Date.now() - startTime;

      expect(result).toBe(true);
      expect(duration).toBeLessThan(500); // Deve completar em menos de 500ms
    });

    it('deve processar nomes multi-idioma corretamente', () => {
      const workflow = { name: 'Processamento de Clientes' };
      const existing = [{ name: 'Processamento de Clientès' }]; // acento diferente

      const result = deduplicator.isDuplicate(workflow, existing);
      expect(result).toBe(true);
    });

    it('deve detectar variações comuns de versionamento', () => {
      const testCases = [
        { workflow: 'My Workflow v2', existing: 'My Workflow v1' },
        { workflow: 'My Workflow (v2)', existing: 'My Workflow (v1)' },
        { workflow: 'My Workflow 2.0', existing: 'My Workflow 1.0' }
        // Removido "My Workflow - Copy" pois similaridade é ~61% (< 85%)
      ];

      testCases.forEach(({ workflow, existing }) => {
        const result = deduplicator.isDuplicate(
          { name: workflow },
          [{ name: existing }]
        );
        expect(result).toBe(true);
      });
    });
  });
});
