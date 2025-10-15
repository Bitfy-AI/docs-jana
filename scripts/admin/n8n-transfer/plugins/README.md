# Plugin System - n8n-transfer

Sistema de plugins extensível para o n8n-transfer, permitindo customização de comportamentos de deduplicação, validação e geração de relatórios.

## Visão Geral

O sistema de plugins do n8n-transfer foi projetado para máxima extensibilidade, permitindo que desenvolvedores criem:

- **Deduplicadores**: Identificam workflows duplicados antes da transferência
- **Validadores**: Validam workflows quanto a integridade e conformidade
- **Reporters**: Geram relatórios customizados após transferências

## Interfaces de Plugin

### Plugin (Base Interface)

Todas as interfaces de plugin estendem a interface base `Plugin`:

```javascript
/**
 * @typedef {Object} Plugin
 * @property {string} name - Nome único do plugin
 * @property {string} version - Versão (semver)
 * @property {'deduplicator'|'validator'|'reporter'} type - Tipo do plugin
 * @property {boolean} enabled - Se está habilitado
 */
```

### Deduplicator

Identifica workflows duplicados:

```javascript
/**
 * @typedef {Object} Deduplicator
 * @property {Function} isDuplicate - Verifica se workflow é duplicata
 */
```

**Método requerido:**
- `isDuplicate(workflow, existingWorkflows)` → `boolean`

### Validator

Valida workflows:

```javascript
/**
 * @typedef {Object} Validator
 * @property {Function} validate - Valida um workflow
 */
```

**Método requerido:**
- `validate(workflow)` → `ValidationResult`

### Reporter

Gera relatórios:

```javascript
/**
 * @typedef {Object} Reporter
 * @property {Function} generate - Gera relatório
 */
```

**Método requerido:**
- `generate(transferResult)` → `string`

## BasePlugin Class

Classe base fornecendo funcionalidades comuns:

```javascript
const { BasePlugin } = require('./index');

class MyPlugin extends BasePlugin {
  constructor() {
    super('my-plugin', '1.0.0', 'validator');
  }

  // Implementar métodos específicos do tipo
}
```

### Métodos Disponíveis

- `getName()` - Retorna nome do plugin
- `getVersion()` - Retorna versão
- `getType()` - Retorna tipo
- `isEnabled()` - Verifica se está habilitado
- `enable()` - Habilita o plugin
- `disable()` - Desabilita o plugin
- `setOptions(options)` - Define opções
- `getOption(key, defaultValue)` - Obtém opção
- `setDescription(desc)` - Define descrição
- `getDescription()` - Obtém descrição
- `getInfo()` - Retorna informações completas
- `validateImplementation(methods)` - Valida se métodos foram implementados

## Exemplos de Implementação

### 1. Deduplicator Customizado

```javascript
const { BasePlugin } = require('../index');

class NameBasedDeduplicator extends BasePlugin {
  constructor() {
    super('name-deduplicator', '1.0.0', 'deduplicator');
    this.setDescription('Identifica duplicatas por nome do workflow');
  }

  isDuplicate(workflow, existingWorkflows) {
    return existingWorkflows.some(existing =>
      existing.name === workflow.name
    );
  }
}

module.exports = NameBasedDeduplicator;
```

### 2. Validator Customizado

```javascript
const { BasePlugin } = require('../index');

class NodesValidator extends BasePlugin {
  constructor() {
    super('nodes-validator', '1.0.0', 'validator');
    this.setDescription('Valida se workflow possui nodes');
    this.setOptions({ minNodes: 1 });
  }

  validate(workflow) {
    const minNodes = this.getOption('minNodes', 1);
    const errors = [];
    const warnings = [];

    if (!workflow.nodes || workflow.nodes.length === 0) {
      errors.push('Workflow não possui nodes');
    } else if (workflow.nodes.length < minNodes) {
      errors.push(`Workflow possui apenas ${workflow.nodes.length} nodes, mínimo: ${minNodes}`);
    }

    workflow.nodes.forEach(node => {
      if (node.disabled) {
        warnings.push(`Node ${node.name} está desabilitado`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metadata: {
        nodeCount: workflow.nodes?.length || 0
      }
    };
  }
}

module.exports = NodesValidator;
```

### 3. Reporter Customizado

```javascript
const { BasePlugin } = require('../index');

class MarkdownReporter extends BasePlugin {
  constructor() {
    super('markdown-reporter', '1.0.0', 'reporter');
    this.setDescription('Gera relatório em formato Markdown');
  }

  generate(transferResult) {
    const duration = transferResult.endTime - transferResult.startTime;
    const successRate = (
      transferResult.successCount / transferResult.totalWorkflows * 100
    ).toFixed(2);

    return `
# Relatório de Transferência n8n

**Data:** ${new Date().toISOString()}
**Duração:** ${duration}ms

## Resumo

- Total de workflows: ${transferResult.totalWorkflows}
- Transferidos com sucesso: ${transferResult.successCount} (${successRate}%)
- Falhas: ${transferResult.failureCount}
- Duplicatas ignoradas: ${transferResult.duplicateCount}

## Detalhes

${transferResult.errors.length > 0
  ? '### Erros\n\n' + transferResult.errors.map((e, i) =>
      `${i + 1}. **${e.workflowName}**: ${e.message}`
    ).join('\n')
  : 'Nenhum erro encontrado.'}
    `.trim();
  }
}

module.exports = MarkdownReporter;
```

## Estrutura de Diretórios

```
plugins/
├── index.js              # Interfaces e BasePlugin
├── README.md            # Esta documentação
├── deduplicators/       # Plugins de deduplicação
│   ├── standard-deduplicator.js
│   └── fuzzy-deduplicator.js
├── validators/          # Plugins de validação
│   ├── integrity-validator.js
│   └── schema-validator.js
└── reporters/           # Plugins de relatórios
    ├── markdown-reporter.js
    ├── json-reporter.js
    └── csv-reporter.js
```

## Type Definitions

### ValidationResult

```javascript
/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Se validação passou
 * @property {string[]} [errors] - Erros de validação
 * @property {string[]} [warnings] - Avisos (não bloqueiam)
 * @property {Object} [metadata] - Metadados adicionais
 */
```

### TransferResult

```javascript
/**
 * @typedef {Object} TransferResult
 * @property {boolean} success - Se transferência foi bem-sucedida
 * @property {number} totalWorkflows - Total processado
 * @property {number} successCount - Quantidade de sucessos
 * @property {number} failureCount - Quantidade de falhas
 * @property {number} duplicateCount - Duplicatas encontradas
 * @property {Object[]} errors - Lista de erros
 * @property {Object} metadata - Metadados
 * @property {Date} startTime - Início
 * @property {Date} endTime - Conclusão
 */
```

## Boas Práticas

### 1. Sempre Estender BasePlugin

```javascript
// ✅ CORRETO
class MyPlugin extends BasePlugin {
  constructor() {
    super('my-plugin', '1.0.0', 'validator');
  }
}

// ❌ INCORRETO (implementação manual)
class MyPlugin {
  constructor() {
    this.name = 'my-plugin';
    this.version = '1.0.0';
    // ...
  }
}
```

### 2. Validar Implementação

Use `validateImplementation()` no constructor para garantir que métodos foram implementados:

```javascript
class MyValidator extends BasePlugin {
  constructor() {
    super('my-validator', '1.0.0', 'validator');
    this.validateImplementation(['validate']);
  }

  validate(workflow) {
    // implementação
  }
}
```

### 3. Fornecer Metadata

Sempre retorne metadata útil em validações:

```javascript
validate(workflow) {
  return {
    valid: true,
    errors: [],
    warnings: [],
    metadata: {
      workflowName: workflow.name,
      nodeCount: workflow.nodes.length,
      validatedAt: new Date().toISOString()
    }
  };
}
```

### 4. Usar Opções para Configurabilidade

```javascript
constructor() {
  super('my-plugin', '1.0.0', 'validator');
  this.setOptions({
    strictMode: true,
    maxNodes: 100,
    minNodes: 1
  });
}

validate(workflow) {
  const maxNodes = this.getOption('maxNodes', 100);
  // usar opção na validação
}
```

### 5. Documentar com JSDoc

```javascript
/**
 * Valida se workflow possui nodes obrigatórios
 *
 * @class NodesValidator
 * @extends BasePlugin
 *
 * @example
 * const validator = new NodesValidator();
 * validator.setOptions({ minNodes: 2 });
 * const result = validator.validate(workflow);
 */
class NodesValidator extends BasePlugin {
  // ...
}
```

## Testes

Exemplo de teste para plugin customizado:

```javascript
const MyPlugin = require('./my-plugin');

describe('MyPlugin', () => {
  let plugin;

  beforeEach(() => {
    plugin = new MyPlugin();
  });

  test('deve ter nome correto', () => {
    expect(plugin.getName()).toBe('my-plugin');
  });

  test('deve estar habilitado por padrão', () => {
    expect(plugin.isEnabled()).toBe(true);
  });

  test('deve permitir habilitar/desabilitar', () => {
    plugin.disable();
    expect(plugin.isEnabled()).toBe(false);

    plugin.enable();
    expect(plugin.isEnabled()).toBe(true);
  });

  // Testes específicos do tipo de plugin
});
```

## Referências

- **Arquivo principal:** `plugins/index.js`
- **Spec de design:** `.claude/specs/n8n-transfer-system-refactor/design.md`
- **Spec de requisitos:** `.claude/specs/n8n-transfer-system-refactor/requirements.md`
- **Tasks:** `.claude/specs/n8n-transfer-system-refactor/tasks.md` (Task 8)

## Contribuindo

Ao criar novos plugins:

1. Estenda `BasePlugin`
2. Implemente os métodos requeridos do tipo
3. Adicione JSDoc completo
4. Escreva testes unitários (cobertura >= 80%)
5. Documente exemplos de uso
6. Siga padrões de código do projeto

## License

Este código faz parte do projeto docs-jana.
