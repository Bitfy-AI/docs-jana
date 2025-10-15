# Plugin Development Guide - n8n-transfer

Guia completo para desenvolvimento de plugins customizados no sistema n8n-transfer.

## Índice

1. [Introdução](#introdução)
2. [Começando](#começando)
3. [Criando um Deduplicator](#criando-um-deduplicator)
4. [Criando um Validator](#criando-um-validator)
5. [Criando um Reporter](#criando-um-reporter)
6. [Testando Plugins](#testando-plugins)
7. [Distribuição](#distribuição)
8. [Referência da API](#referência-da-api)
9. [Boas Práticas](#boas-práticas)

---

## Introdução

### O que são Plugins no n8n-transfer?

O sistema de plugins do n8n-transfer permite estender e customizar o comportamento da ferramenta de transferência de workflows n8n através de três tipos de plugins:

- **Deduplicators**: Identificam workflows duplicados antes da transferência
- **Validators**: Validam workflows quanto a integridade, conformidade e regras de negócio
- **Reporters**: Geram relatórios customizados após transferências

### Arquitetura do Sistema de Plugins

```
n8n-transfer/
├── plugins/
│   ├── index.js              # BasePlugin class e interfaces
│   ├── README.md             # Documentação básica
│   ├── PLUGIN_DEVELOPMENT.md # Este guia (você está aqui!)
│   ├── deduplicators/        # Plugins de deduplicação
│   │   ├── standard-deduplicator.js
│   │   └── fuzzy-deduplicator.js
│   ├── validators/           # Plugins de validação
│   │   ├── schema-validator.js
│   │   └── integrity-validator.js
│   └── reporters/            # Plugins de geração de relatórios
│       ├── json-reporter.js
│       ├── markdown-reporter.js
│       └── csv-reporter.js
├── core/
│   └── plugin-registry.js    # Sistema de registro e descoberta
└── ...
```

**Fluxo de Execução:**

```
n8n-transfer inicializado
    ↓
PluginRegistry descobre plugins em diretórios
    ↓
Plugins são registrados e validados
    ↓
Durante transferência:
    ├─→ Deduplicators verificam duplicatas
    ├─→ Validators validam workflows
    └─→ Reporters geram relatórios ao final
```

### Por que usar Plugins?

- **Extensibilidade**: Adicione comportamentos customizados sem modificar código core
- **Reutilização**: Compartilhe plugins entre projetos e equipes
- **Isolamento**: Cada plugin é independente e pode ser habilitado/desabilitado
- **Testabilidade**: Plugins podem ser testados isoladamente

---

## Começando

### Pré-requisitos

- Node.js >= 14.0.0
- Conhecimento básico de JavaScript/ES6
- Familiaridade com conceitos de POO (classes, herança)
- (Opcional) TypeScript para type checking

### Estrutura de um Plugin

Todo plugin deve:

1. **Estender `BasePlugin`**: Classe base que fornece funcionalidades comuns
2. **Implementar métodos obrigatórios**: Baseado no tipo (deduplicator, validator, reporter)
3. **Registrar-se no PluginRegistry**: Manual ou via auto-discovery

### BasePlugin - Classe Base

A classe `BasePlugin` fornece:

| Método | Descrição |
|--------|-----------|
| `constructor(name, version, type, options)` | Inicializa plugin com metadados |
| `getName()` | Retorna nome do plugin |
| `getVersion()` | Retorna versão (semver) |
| `getType()` | Retorna tipo (deduplicator, validator, reporter) |
| `isEnabled()` | Verifica se plugin está habilitado |
| `enable()` | Habilita o plugin |
| `disable()` | Desabilita o plugin |
| `setOptions(options)` | Define opções de configuração |
| `getOption(key, defaultValue)` | Obtém opção específica |
| `setDescription(desc)` | Define descrição do plugin |
| `getDescription()` | Obtém descrição |
| `getInfo()` | Retorna informações completas do plugin |
| `validateImplementation(methods)` | Valida se métodos foram implementados |

### Registro de Plugins

**Opção 1: Registro Manual**

```javascript
const { PluginRegistry } = require('./core/plugin-registry');
const MyPlugin = require('./plugins/custom/my-plugin');

const registry = new PluginRegistry();
const plugin = new MyPlugin();
registry.register(plugin);
```

**Opção 2: Auto-Discovery**

```javascript
const { PluginRegistry } = require('./core/plugin-registry');

const registry = new PluginRegistry();
registry.discover('./plugins/validators'); // Carrega todos os plugins do diretório
```

O PluginRegistry automaticamente:
- Valida que plugins estendem `BasePlugin`
- Verifica métodos obrigatórios
- Previne duplicatas (nomes únicos)
- Indexa plugins por tipo para busca rápida

---

## Criando um Deduplicator

### O que é um Deduplicator?

Deduplicators identificam workflows duplicados antes da transferência, evitando uploads desnecessários e preservando dados existentes no servidor de destino.

### Interface Obrigatória

```javascript
class MyDeduplicator extends BasePlugin {
  constructor() {
    super('my-deduplicator', '1.0.0', 'deduplicator');
    this.validateImplementation(['isDuplicate']);
  }

  /**
   * Verifica se workflow é duplicata
   *
   * @param {Object} workflow - Workflow a ser verificado
   * @param {Object[]} existingWorkflows - Workflows já existentes no destino
   * @returns {boolean} true se é duplicata, false caso contrário
   */
  isDuplicate(workflow, existingWorkflows) {
    // Sua lógica aqui
  }
}
```

### Template: Deduplicator Básico

```javascript
const { BasePlugin } = require('../index');

/**
 * SimpleNameDeduplicator
 *
 * Identifica duplicatas comparando apenas o nome do workflow (case-sensitive).
 */
class SimpleNameDeduplicator extends BasePlugin {
  constructor() {
    super('simple-name-deduplicator', '1.0.0', 'deduplicator');

    this.setDescription(
      'Identifica workflows duplicados comparando apenas o nome (case-sensitive)'
    );

    // Valida que isDuplicate foi implementado
    this.validateImplementation(['isDuplicate']);
  }

  /**
   * Verifica se workflow é duplicata baseado no nome
   *
   * @param {Object} workflow - Workflow a ser verificado
   * @param {string} workflow.name - Nome do workflow
   * @param {Object[]} existingWorkflows - Lista de workflows existentes
   * @returns {boolean} true se workflow com mesmo nome já existe
   */
  isDuplicate(workflow, existingWorkflows) {
    if (!workflow || !workflow.name) {
      return false; // Workflow inválido não é duplicata
    }

    return existingWorkflows.some(existing =>
      existing.name === workflow.name
    );
  }
}

module.exports = SimpleNameDeduplicator;
```

### Exemplo: Deduplicator Avançado com Opções

```javascript
const { BasePlugin } = require('../index');

/**
 * SmartDeduplicator
 *
 * Deduplicador inteligente com múltiplas estratégias de comparação.
 * Suporta configuração de sensibilidade e campos de comparação.
 */
class SmartDeduplicator extends BasePlugin {
  constructor(options = {}) {
    super('smart-deduplicator', '1.0.0', 'deduplicator', options);

    this.setDescription(
      'Deduplicador inteligente com estratégias configuráveis de comparação'
    );

    // Opções padrão
    this.setOptions({
      compareFields: ['name', 'tags'],  // Campos a comparar
      caseSensitive: true,               // Comparação case-sensitive
      compareTags: true,                 // Comparar tags
      tagOrderMatters: false,            // Ordem das tags importa?
      ...options
    });

    this.validateImplementation(['isDuplicate', 'getReason']);
  }

  /**
   * Verifica se workflow é duplicata
   */
  isDuplicate(workflow, existingWorkflows) {
    const compareFields = this.getOption('compareFields', ['name', 'tags']);
    const caseSensitive = this.getOption('caseSensitive', true);

    for (const existing of existingWorkflows) {
      let isDuplicate = true;

      // Verificar cada campo configurado
      for (const field of compareFields) {
        if (field === 'name') {
          isDuplicate = isDuplicate && this._compareNames(workflow, existing, caseSensitive);
        } else if (field === 'tags' && this.getOption('compareTags', true)) {
          isDuplicate = isDuplicate && this._compareTags(workflow, existing);
        }
      }

      if (isDuplicate) {
        this._lastDuplicateReason = this._buildReason(workflow, existing);
        return true;
      }
    }

    return false;
  }

  /**
   * Retorna razão da última verificação de duplicata
   */
  getReason() {
    return this._lastDuplicateReason || 'Nenhuma duplicata encontrada';
  }

  /**
   * Compara nomes de workflows
   * @private
   */
  _compareNames(workflow1, workflow2, caseSensitive) {
    const name1 = caseSensitive ? workflow1.name : workflow1.name.toLowerCase();
    const name2 = caseSensitive ? workflow2.name : workflow2.name.toLowerCase();
    return name1 === name2;
  }

  /**
   * Compara tags de workflows
   * @private
   */
  _compareTags(workflow1, workflow2) {
    const tags1 = workflow1.tags || [];
    const tags2 = workflow2.tags || [];

    if (tags1.length !== tags2.length) {
      return false;
    }

    const tagOrderMatters = this.getOption('tagOrderMatters', false);

    if (tagOrderMatters) {
      // Comparação com ordem
      return tags1.every((tag, index) => tag === tags2[index]);
    } else {
      // Comparação sem ordem (usando Set)
      const set1 = new Set(tags1);
      const set2 = new Set(tags2);

      if (set1.size !== set2.size) {
        return false;
      }

      for (const tag of set1) {
        if (!set2.has(tag)) {
          return false;
        }
      }

      return true;
    }
  }

  /**
   * Constrói mensagem descritiva da razão
   * @private
   */
  _buildReason(workflow, duplicate) {
    const fields = this.getOption('compareFields', ['name', 'tags']);
    return `Duplicata encontrada: ${fields.join(' e ')} idênticos ao workflow '${duplicate.name}'`;
  }
}

module.exports = SmartDeduplicator;
```

### Exemplo: Deduplicator por Hash

```javascript
const { BasePlugin } = require('../index');
const crypto = require('crypto');

/**
 * HashDeduplicator
 *
 * Identifica duplicatas calculando hash SHA256 do conteúdo do workflow.
 * Útil para detectar workflows com nomes diferentes mas conteúdo idêntico.
 */
class HashDeduplicator extends BasePlugin {
  constructor() {
    super('hash-deduplicator', '1.0.0', 'deduplicator');

    this.setDescription(
      'Identifica duplicatas por hash SHA256 do conteúdo (nodes + connections)'
    );

    this.validateImplementation(['isDuplicate']);
  }

  isDuplicate(workflow, existingWorkflows) {
    const workflowHash = this._calculateHash(workflow);

    return existingWorkflows.some(existing => {
      const existingHash = this._calculateHash(existing);
      return workflowHash === existingHash;
    });
  }

  /**
   * Calcula hash SHA256 do conteúdo do workflow
   * @private
   */
  _calculateHash(workflow) {
    // Serializar apenas conteúdo relevante (nodes + connections)
    const content = {
      nodes: workflow.nodes || [],
      connections: workflow.connections || {}
    };

    const serialized = JSON.stringify(content, this._sortKeys);
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  /**
   * Função para ordenar chaves do objeto antes de serializar
   * Garante que objetos com mesmas propriedades em ordem diferente gerem mesmo hash
   * @private
   */
  _sortKeys(key, value) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value)
        .sort()
        .reduce((sorted, k) => {
          sorted[k] = value[k];
          return sorted;
        }, {});
    }
    return value;
  }
}

module.exports = HashDeduplicator;
```

### Boas Práticas para Deduplicators

1. **Performance**: Otimize comparações para grandes volumes
   ```javascript
   // ❌ Ineficiente
   isDuplicate(workflow, existing) {
     return JSON.stringify(workflow) === JSON.stringify(existing);
   }

   // ✅ Eficiente
   isDuplicate(workflow, existing) {
     // Comparação rápida primeiro (nome)
     if (workflow.name !== existing.name) return false;
     // Comparação complexa só se necessário
     return this._deepCompare(workflow, existing);
   }
   ```

2. **Validação de Entrada**: Sempre valide que workflow é um objeto válido
   ```javascript
   isDuplicate(workflow, existingWorkflows) {
     if (!workflow || typeof workflow !== 'object') {
       return false;
     }
     if (!Array.isArray(existingWorkflows)) {
       return false;
     }
     // Lógica de comparação...
   }
   ```

3. **Logging**: Armazene razão da duplicata para debugging
   ```javascript
   constructor() {
     super('my-dedup', '1.0.0', 'deduplicator');
     this._lastReason = null;
   }

   isDuplicate(workflow, existing) {
     if (/* é duplicata */) {
       this._lastReason = `Duplicata: nome '${workflow.name}' já existe`;
       return true;
     }
     return false;
   }

   getReason() {
     return this._lastReason || 'Não é duplicata';
   }
   ```

4. **Configurabilidade**: Use opções para tornar plugin flexível
   ```javascript
   constructor(options = {}) {
     super('my-dedup', '1.0.0', 'deduplicator', options);
     this.setOptions({
       strictMode: true,
       ignoreCase: false,
       ...options
     });
   }
   ```

---

## Criando um Validator

### O que é um Validator?

Validators verificam workflows antes da transferência, garantindo integridade estrutural, conformidade com regras de negócio e prevenindo erros no servidor de destino.

### Interface Obrigatória

```javascript
class MyValidator extends BasePlugin {
  constructor() {
    super('my-validator', '1.0.0', 'validator');
    this.validateImplementation(['validate']);
  }

  /**
   * Valida um workflow
   *
   * @param {Object} workflow - Workflow a ser validado
   * @returns {ValidationResult} Resultado com valid, errors, warnings, metadata
   */
  validate(workflow) {
    return {
      valid: true,      // boolean: se validação passou
      errors: [],       // string[]: erros que bloqueiam transferência
      warnings: [],     // string[]: avisos que não bloqueiam
      metadata: {}      // Object: metadados adicionais
    };
  }
}
```

### Template: Validator Básico

```javascript
const { BasePlugin } = require('../index');

/**
 * BasicWorkflowValidator
 *
 * Valida estrutura básica de workflows: nome presente, nodes existem, connections válidas.
 */
class BasicWorkflowValidator extends BasePlugin {
  constructor() {
    super('basic-workflow-validator', '1.0.0', 'validator');

    this.setDescription(
      'Valida estrutura básica: nome, nodes e connections presentes e válidas'
    );

    this.validateImplementation(['validate']);
  }

  /**
   * Valida workflow
   *
   * @param {Object} workflow - Workflow a validar
   * @returns {ValidationResult}
   */
  validate(workflow) {
    const errors = [];
    const warnings = [];
    const metadata = {
      validator: this.getName(),
      timestamp: new Date().toISOString()
    };

    // Validação 1: Workflow deve existir
    if (!workflow || typeof workflow !== 'object') {
      return {
        valid: false,
        errors: ['Workflow é null ou não é um objeto'],
        warnings: [],
        metadata
      };
    }

    // Validação 2: Nome obrigatório
    if (!workflow.name || workflow.name.trim() === '') {
      errors.push('Nome do workflow é obrigatório');
    } else {
      metadata.workflowName = workflow.name;
    }

    // Validação 3: Nodes devem existir
    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      errors.push('Workflow deve ter array de nodes');
    } else if (workflow.nodes.length === 0) {
      errors.push('Workflow deve ter pelo menos 1 node');
    } else {
      metadata.nodeCount = workflow.nodes.length;

      // Avisar sobre nodes desabilitados
      const disabledNodes = workflow.nodes.filter(n => n.disabled);
      if (disabledNodes.length > 0) {
        warnings.push(`${disabledNodes.length} node(s) desabilitado(s)`);
      }
    }

    // Validação 4: Connections devem existir
    if (!workflow.connections || typeof workflow.connections !== 'object') {
      errors.push('Workflow deve ter objeto de connections');
    }

    // Validação 5: Tags (opcional, apenas aviso)
    if (!workflow.tags || workflow.tags.length === 0) {
      warnings.push('Workflow sem tags - recomenda-se adicionar para organização');
    } else {
      metadata.tagCount = workflow.tags.length;
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metadata
    };
  }
}

module.exports = BasicWorkflowValidator;
```

### Exemplo: Validator com Zod Schema

```javascript
const { BasePlugin } = require('../index');
const { z } = require('zod');

/**
 * SchemaValidator
 *
 * Valida workflows usando schema Zod para type checking robusto.
 */
class SchemaValidator extends BasePlugin {
  constructor() {
    super('schema-validator', '1.0.0', 'validator');

    this.setDescription(
      'Valida workflows usando schema Zod para garantir tipos corretos'
    );

    this.validateImplementation(['validate']);

    // Definir schema Zod
    this.workflowSchema = z.object({
      name: z.string().min(1, 'Nome não pode ser vazio'),
      nodes: z.array(z.object({
        id: z.string(),
        name: z.string(),
        type: z.string(),
        position: z.array(z.number()).length(2),
        parameters: z.record(z.any())
      })).min(1, 'Workflow deve ter pelo menos 1 node'),
      connections: z.record(z.any()),
      tags: z.array(z.string()).optional(),
      active: z.boolean().optional(),
      settings: z.record(z.any()).optional()
    });
  }

  validate(workflow) {
    const result = {
      valid: false,
      errors: [],
      warnings: [],
      metadata: {
        validator: this.getName(),
        timestamp: new Date().toISOString()
      }
    };

    if (!workflow) {
      result.errors.push('Workflow é null ou undefined');
      return result;
    }

    // Executar validação Zod
    const validation = this.workflowSchema.safeParse(workflow);

    if (validation.success) {
      result.valid = true;
      result.metadata.workflowName = validation.data.name;
      result.metadata.nodeCount = validation.data.nodes.length;

      // Avisos para boas práticas
      if (!validation.data.tags || validation.data.tags.length === 0) {
        result.warnings.push('Workflow sem tags');
      }
      if (!validation.data.settings) {
        result.warnings.push('Workflow sem settings (usará defaults)');
      }
    } else {
      result.valid = false;
      result.errors = this._formatZodErrors(validation.error);
    }

    return result;
  }

  /**
   * Formata erros Zod em mensagens legíveis
   * @private
   */
  _formatZodErrors(zodError) {
    return zodError.issues.map(issue => {
      const path = issue.path.join('.');
      return `${path}: ${issue.message}`;
    });
  }
}

module.exports = SchemaValidator;
```

### Exemplo: Validator de Regras de Negócio

```javascript
const { BasePlugin } = require('../index');

/**
 * BusinessRulesValidator
 *
 * Valida workflows quanto a regras de negócio específicas da organização.
 */
class BusinessRulesValidator extends BasePlugin {
  constructor(options = {}) {
    super('business-rules-validator', '1.0.0', 'validator', options);

    this.setDescription(
      'Valida workflows quanto a regras de negócio customizadas'
    );

    this.setOptions({
      maxNodes: 50,                    // Máximo de nodes permitidos
      minNodes: 1,                     // Mínimo de nodes
      requiredTags: [],                // Tags obrigatórias
      forbiddenNodeTypes: [],          // Tipos de nodes proibidos
      requireActiveWorkflows: false,   // Requer workflows ativos
      ...options
    });

    this.validateImplementation(['validate']);
  }

  validate(workflow) {
    const errors = [];
    const warnings = [];
    const metadata = {
      validator: this.getName(),
      rulesChecked: []
    };

    // Regra 1: Quantidade de nodes
    const nodeCount = workflow.nodes?.length || 0;
    const maxNodes = this.getOption('maxNodes', 50);
    const minNodes = this.getOption('minNodes', 1);

    metadata.rulesChecked.push('node-count');

    if (nodeCount > maxNodes) {
      errors.push(
        `Workflow possui ${nodeCount} nodes, máximo permitido: ${maxNodes}`
      );
    } else if (nodeCount < minNodes) {
      errors.push(
        `Workflow possui ${nodeCount} nodes, mínimo requerido: ${minNodes}`
      );
    }

    // Regra 2: Tags obrigatórias
    const requiredTags = this.getOption('requiredTags', []);
    if (requiredTags.length > 0) {
      metadata.rulesChecked.push('required-tags');

      const workflowTags = workflow.tags || [];
      const missingTags = requiredTags.filter(tag => !workflowTags.includes(tag));

      if (missingTags.length > 0) {
        errors.push(
          `Tags obrigatórias ausentes: ${missingTags.join(', ')}`
        );
      }
    }

    // Regra 3: Tipos de nodes proibidos
    const forbiddenTypes = this.getOption('forbiddenNodeTypes', []);
    if (forbiddenTypes.length > 0) {
      metadata.rulesChecked.push('forbidden-node-types');

      const forbiddenNodesFound = workflow.nodes.filter(node =>
        forbiddenTypes.includes(node.type)
      );

      if (forbiddenNodesFound.length > 0) {
        errors.push(
          `Nodes proibidos encontrados: ${forbiddenNodesFound.map(n => n.name).join(', ')} ` +
          `(tipos: ${forbiddenNodesFound.map(n => n.type).join(', ')})`
        );
      }
    }

    // Regra 4: Workflow deve estar ativo
    if (this.getOption('requireActiveWorkflows', false)) {
      metadata.rulesChecked.push('active-status');

      if (!workflow.active) {
        warnings.push('Workflow está inativo - recomenda-se ativar antes da transferência');
      }
    }

    // Regra 5: Credenciais (aviso)
    const nodesWithEmptyCredentials = workflow.nodes.filter(node =>
      node.credentials && Object.keys(node.credentials).length === 0
    );

    if (nodesWithEmptyCredentials.length > 0) {
      warnings.push(
        `${nodesWithEmptyCredentials.length} node(s) com credenciais vazias`
      );
    }

    metadata.workflowName = workflow.name;
    metadata.nodeCount = nodeCount;

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metadata
    };
  }

  /**
   * Retorna informações sobre regras validadas
   */
  getValidationInfo() {
    return {
      rules: [
        {
          name: 'node-count',
          description: 'Valida quantidade de nodes',
          config: {
            min: this.getOption('minNodes', 1),
            max: this.getOption('maxNodes', 50)
          }
        },
        {
          name: 'required-tags',
          description: 'Valida presença de tags obrigatórias',
          config: {
            tags: this.getOption('requiredTags', [])
          }
        },
        {
          name: 'forbidden-node-types',
          description: 'Valida tipos de nodes proibidos',
          config: {
            forbiddenTypes: this.getOption('forbiddenNodeTypes', [])
          }
        }
      ]
    };
  }
}

module.exports = BusinessRulesValidator;
```

### Boas Práticas para Validators

1. **Separar Erros de Warnings**
   ```javascript
   validate(workflow) {
     const errors = [];   // Bloqueiam transferência
     const warnings = []; // Não bloqueiam, apenas alertam

     if (!workflow.name) {
       errors.push('Nome obrigatório'); // Erro crítico
     }

     if (!workflow.tags || workflow.tags.length === 0) {
       warnings.push('Sem tags'); // Aviso, não bloqueia
     }

     return {
       valid: errors.length === 0, // Válido se não há erros
       errors,
       warnings,
       metadata: {}
     };
   }
   ```

2. **Incluir Metadata Útil**
   ```javascript
   validate(workflow) {
     return {
       valid: true,
       errors: [],
       warnings: [],
       metadata: {
         validator: this.getName(),
         version: this.getVersion(),
         timestamp: new Date().toISOString(),
         workflowName: workflow.name,
         nodeCount: workflow.nodes.length,
         validatedFields: ['name', 'nodes', 'connections']
       }
     };
   }
   ```

3. **Mensagens de Erro Descritivas**
   ```javascript
   // ❌ Mensagem vaga
   errors.push('Invalid workflow');

   // ✅ Mensagem descritiva
   errors.push(
     `Workflow '${workflow.name}' possui ${workflow.nodes.length} nodes, ` +
     `mas o máximo permitido é ${this.getOption('maxNodes', 50)}`
   );
   ```

4. **Performance com Validações Caras**
   ```javascript
   validate(workflow) {
     // Validações rápidas primeiro (early return)
     if (!workflow.name) {
       return { valid: false, errors: ['Nome obrigatório'], warnings: [], metadata: {} };
     }

     // Validações caras só se necessário
     if (this.getOption('deepValidation', false)) {
       return this._deepValidate(workflow);
     }

     return { valid: true, errors: [], warnings: [], metadata: {} };
   }
   ```

---

## Criando um Reporter

### O que é um Reporter?

Reporters geram relatórios customizados após transferências, permitindo análise, documentação e integração com sistemas externos (CI/CD, dashboards, etc).

### Interface Obrigatória

```javascript
class MyReporter extends BasePlugin {
  constructor() {
    super('my-reporter', '1.0.0', 'reporter');
    this.validateImplementation(['generate']);
  }

  /**
   * Gera relatório a partir de resultado de transferência
   *
   * @param {TransferResult} transferResult - Resultado da transferência
   * @returns {string} Relatório em formato de string
   */
  generate(transferResult) {
    return 'Relatório gerado';
  }
}
```

### Template: Reporter Básico

```javascript
const { BasePlugin } = require('../index');

/**
 * SimpleTextReporter
 *
 * Gera relatórios simples em formato texto plano.
 */
class SimpleTextReporter extends BasePlugin {
  constructor() {
    super('simple-text-reporter', '1.0.0', 'reporter');

    this.setDescription(
      'Gera relatórios simples em formato texto plano'
    );

    this.validateImplementation(['generate']);
  }

  /**
   * Gera relatório em formato texto
   *
   * @param {TransferResult} transferResult - Resultado da transferência
   * @returns {string} Relatório em texto plano
   */
  generate(transferResult) {
    if (!transferResult) {
      throw new Error('transferResult é obrigatório');
    }

    const duration = this._calculateDuration(
      transferResult.startTime,
      transferResult.endTime
    );

    const successRate = this._calculateSuccessRate(
      transferResult.successCount,
      transferResult.totalWorkflows
    );

    const lines = [
      '============================================',
      '     Relatório de Transferência n8n        ',
      '============================================',
      '',
      `Data: ${new Date().toISOString()}`,
      `Duração: ${duration}`,
      '',
      '--- Estatísticas ---',
      `Total de workflows: ${transferResult.totalWorkflows}`,
      `Transferidos: ${transferResult.successCount} (${successRate}%)`,
      `Falhas: ${transferResult.failureCount}`,
      `Duplicatas ignoradas: ${transferResult.duplicateCount || 0}`,
      '',
      '--- Origem/Destino ---',
      `Origem: ${transferResult.metadata?.source || 'Não especificado'}`,
      `Destino: ${transferResult.metadata?.target || 'Não especificado'}`,
      ''
    ];

    // Adicionar erros se houver
    if (transferResult.errors && transferResult.errors.length > 0) {
      lines.push('--- Erros ---');
      transferResult.errors.forEach((error, index) => {
        lines.push(
          `${index + 1}. ${error.workflowName || 'Workflow desconhecido'}: ${error.message || error.error}`
        );
      });
      lines.push('');
    } else {
      lines.push('Nenhum erro encontrado.');
      lines.push('');
    }

    lines.push('============================================');
    lines.push(`Gerado por: ${this.getName()} v${this.getVersion()}`);
    lines.push('============================================');

    return lines.join('\n');
  }

  /**
   * Calcula duração da transferência
   * @private
   */
  _calculateDuration(startTime, endTime) {
    const start = startTime instanceof Date ? startTime : new Date(startTime);
    const end = endTime instanceof Date ? endTime : new Date(endTime);
    const durationMs = end.getTime() - start.getTime();
    const durationSeconds = (durationMs / 1000).toFixed(2);
    return `${durationSeconds}s`;
  }

  /**
   * Calcula taxa de sucesso
   * @private
   */
  _calculateSuccessRate(successCount, totalWorkflows) {
    if (totalWorkflows === 0) return '0.00';
    return ((successCount / totalWorkflows) * 100).toFixed(2);
  }
}

module.exports = SimpleTextReporter;
```

### Exemplo: Reporter JSON Completo

```javascript
const { BasePlugin } = require('../index');
const fs = require('fs').promises;
const path = require('path');

/**
 * JSONReporter
 *
 * Gera relatórios completos em JSON com metadados, estatísticas e detalhes de workflows.
 * Salva automaticamente em arquivo no diretório reports/.
 */
class JSONReporter extends BasePlugin {
  constructor(options = {}) {
    super('json-reporter', '1.0.0', 'reporter', options);

    this.setDescription(
      'Gera relatórios JSON completos com auto-save em reports/'
    );

    this.setOptions({
      outputDir: 'reports',
      autoSave: true,
      prettyPrint: true,
      includeWorkflowDetails: true,
      ...options
    });

    this.validateImplementation(['generate']);
  }

  generate(transferResult) {
    // Validações
    if (!transferResult) {
      throw new Error('transferResult é obrigatório');
    }

    const requiredFields = [
      'success', 'totalWorkflows', 'successCount',
      'failureCount', 'startTime', 'endTime'
    ];

    for (const field of requiredFields) {
      if (transferResult[field] === undefined) {
        throw new Error(`Campo obrigatório ausente: ${field}`);
      }
    }

    // Calcular duração
    const startTime = new Date(transferResult.startTime);
    const endTime = new Date(transferResult.endTime);
    const durationMs = endTime.getTime() - startTime.getTime();

    // Construir estrutura JSON
    const report = {
      metadata: {
        timestamp: new Date().toISOString(),
        duration: {
          milliseconds: durationMs,
          seconds: (durationMs / 1000).toFixed(2),
          formatted: this._formatDuration(durationMs)
        },
        source: transferResult.metadata?.source || 'unknown',
        target: transferResult.metadata?.target || 'unknown',
        transferStarted: startTime.toISOString(),
        transferEnded: endTime.toISOString()
      },

      statistics: {
        total: transferResult.totalWorkflows,
        transferred: transferResult.successCount,
        failed: transferResult.failureCount,
        duplicates: transferResult.duplicateCount || 0,
        successRate: this._calculateRate(
          transferResult.successCount,
          transferResult.totalWorkflows
        ),
        failureRate: this._calculateRate(
          transferResult.failureCount,
          transferResult.totalWorkflows
        )
      },

      workflows: this._extractWorkflows(transferResult),

      errors: this._formatErrors(transferResult.errors || []),

      configuration: {
        options: transferResult.metadata?.options || {},
        pluginsUsed: transferResult.metadata?.plugins || []
      },

      reportGeneration: {
        generatedBy: this.getName(),
        version: this.getVersion(),
        generatedAt: new Date().toISOString()
      }
    };

    // Converter para JSON
    const indent = this.getOption('prettyPrint', true) ? 2 : 0;
    const jsonOutput = JSON.stringify(report, null, indent);

    // Auto-save se habilitado
    if (this.getOption('autoSave', true)) {
      this._saveReport(jsonOutput).catch(error => {
        console.error('Erro ao salvar relatório:', error.message);
      });
    }

    return jsonOutput;
  }

  /**
   * Extrai detalhes de workflows
   * @private
   */
  _extractWorkflows(transferResult) {
    if (!this.getOption('includeWorkflowDetails', true)) {
      return [];
    }

    const workflows = transferResult.metadata?.workflows || [];

    return workflows.map(w => ({
      id: w.id,
      name: w.name,
      status: w.status || 'unknown',
      nodes: w.nodes?.length || 0,
      tags: w.tags?.map(t => t.name || t) || [],
      active: w.active || false
    }));
  }

  /**
   * Formata array de erros
   * @private
   */
  _formatErrors(errors) {
    return errors.map(e => ({
      workflow: e.workflowName || 'unknown',
      message: e.message || e.error || 'Erro desconhecido',
      code: e.code || 'UNKNOWN_ERROR',
      timestamp: e.timestamp || new Date().toISOString()
    }));
  }

  /**
   * Calcula taxa percentual
   * @private
   */
  _calculateRate(count, total) {
    if (total === 0) return '0.00%';
    return `${((count / total) * 100).toFixed(2)}%`;
  }

  /**
   * Formata duração
   * @private
   */
  _formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  /**
   * Salva relatório em arquivo
   * @private
   */
  async _saveReport(content) {
    const outputDir = this.getOption('outputDir', 'reports');
    const dir = path.resolve(process.cwd(), outputDir);

    await fs.mkdir(dir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `transfer-report-${timestamp}.json`;
    const filePath = path.join(dir, filename);

    await fs.writeFile(filePath, content, 'utf8');

    console.log(`Relatório salvo: ${filePath}`);
  }
}

module.exports = JSONReporter;
```

### Exemplo: Reporter Markdown

```javascript
const { BasePlugin } = require('../index');

/**
 * MarkdownReporter
 *
 * Gera relatórios em formato Markdown, ideal para documentação e wikis.
 */
class MarkdownReporter extends BasePlugin {
  constructor() {
    super('markdown-reporter', '1.0.0', 'reporter');

    this.setDescription('Gera relatórios em formato Markdown');

    this.validateImplementation(['generate']);
  }

  generate(transferResult) {
    const duration = this._calculateDuration(transferResult);
    const successRate = this._calculateSuccessRate(transferResult);

    const lines = [
      '# Relatório de Transferência n8n',
      '',
      `**Data:** ${new Date().toISOString()}`,
      `**Duração:** ${duration}`,
      '',
      '## Resumo',
      '',
      `- **Total de workflows:** ${transferResult.totalWorkflows}`,
      `- **Transferidos com sucesso:** ${transferResult.successCount} (${successRate}%)`,
      `- **Falhas:** ${transferResult.failureCount}`,
      `- **Duplicatas ignoradas:** ${transferResult.duplicateCount || 0}`,
      '',
      '## Origem e Destino',
      '',
      `- **Origem:** ${transferResult.metadata?.source || 'Não especificado'}`,
      `- **Destino:** ${transferResult.metadata?.target || 'Não especificado'}`,
      ''
    ];

    // Tabela de erros
    if (transferResult.errors && transferResult.errors.length > 0) {
      lines.push('## Erros Encontrados');
      lines.push('');
      lines.push('| # | Workflow | Erro |');
      lines.push('|---|----------|------|');

      transferResult.errors.forEach((error, index) => {
        const workflow = error.workflowName || 'Desconhecido';
        const message = error.message || error.error || 'Erro desconhecido';
        lines.push(`| ${index + 1} | ${workflow} | ${message} |`);
      });

      lines.push('');
    } else {
      lines.push('## Status');
      lines.push('');
      lines.push('✅ **Nenhum erro encontrado!**');
      lines.push('');
    }

    // Workflows transferidos (se disponível)
    if (transferResult.metadata?.workflows) {
      lines.push('## Workflows Transferidos');
      lines.push('');
      lines.push('| Nome | Nodes | Tags | Status |');
      lines.push('|------|-------|------|--------|');

      transferResult.metadata.workflows.forEach(w => {
        const tags = w.tags?.map(t => t.name || t).join(', ') || '-';
        const status = w.status || 'unknown';
        lines.push(`| ${w.name} | ${w.nodes?.length || 0} | ${tags} | ${status} |`);
      });

      lines.push('');
    }

    lines.push('---');
    lines.push(`*Gerado por ${this.getName()} v${this.getVersion()}*`);

    return lines.join('\n');
  }

  _calculateDuration(result) {
    const start = new Date(result.startTime);
    const end = new Date(result.endTime);
    const ms = end.getTime() - start.getTime();
    return `${(ms / 1000).toFixed(2)}s`;
  }

  _calculateSuccessRate(result) {
    if (result.totalWorkflows === 0) return '0.00';
    return ((result.successCount / result.totalWorkflows) * 100).toFixed(2);
  }
}

module.exports = MarkdownReporter;
```

### Boas Práticas para Reporters

1. **Auto-save com Graceful Failure**
   ```javascript
   generate(transferResult) {
     const content = this._generateContent(transferResult);

     if (this.getOption('autoSave', true)) {
       this._saveReport(content).catch(error => {
         // Não falhar se save falhar, apenas avisar
         console.warn('Aviso: Falha ao salvar relatório:', error.message);
       });
     }

     return content; // Sempre retornar conteúdo mesmo se save falhar
   }
   ```

2. **Timestamps e Metadados**
   ```javascript
   generate(transferResult) {
     const report = {
       metadata: {
         generatedAt: new Date().toISOString(),
         generatedBy: this.getName(),
         version: this.getVersion(),
         reportFormat: 'json' // ou 'markdown', 'csv', etc
       },
       data: {
         // ... dados do relatório
       }
     };

     return JSON.stringify(report, null, 2);
   }
   ```

3. **Formatação Consistente**
   ```javascript
   // Helper methods para formatação
   _formatDuration(ms) {
     const seconds = Math.floor(ms / 1000);
     const minutes = Math.floor(seconds / 60);
     return `${minutes}m ${seconds % 60}s`;
   }

   _formatPercentage(count, total) {
     if (total === 0) return '0.00%';
     return `${((count / total) * 100).toFixed(2)}%`;
   }

   _formatDate(date) {
     return new Date(date).toISOString();
   }
   ```

4. **Configurabilidade de Output**
   ```javascript
   constructor(options = {}) {
     super('my-reporter', '1.0.0', 'reporter', options);

     this.setOptions({
       outputDir: 'reports',
       includeWorkflowDetails: true,
       includeErrors: true,
       includeStatistics: true,
       format: 'json', // ou 'yaml', 'xml', etc
       ...options
     });
   }

   generate(transferResult) {
     const includeDetails = this.getOption('includeWorkflowDetails', true);
     const includeErrors = this.getOption('includeErrors', true);

     // Gerar relatório baseado em opções
   }
   ```

---

## Testando Plugins

### Estrutura de Testes

```
plugins/
├── __tests__/
│   ├── deduplicators/
│   │   └── my-deduplicator.test.js
│   ├── validators/
│   │   └── my-validator.test.js
│   └── reporters/
│       └── my-reporter.test.js
├── deduplicators/
│   └── my-deduplicator.js
├── validators/
│   └── my-validator.js
└── reporters/
    └── my-reporter.js
```

### Template de Teste: Deduplicator

```javascript
const MyDeduplicator = require('../deduplicators/my-deduplicator');

describe('MyDeduplicator', () => {
  let deduplicator;

  beforeEach(() => {
    deduplicator = new MyDeduplicator();
  });

  describe('Constructor', () => {
    test('deve ter nome correto', () => {
      expect(deduplicator.getName()).toBe('my-deduplicator');
    });

    test('deve ter versão correta', () => {
      expect(deduplicator.getVersion()).toBe('1.0.0');
    });

    test('deve ter tipo deduplicator', () => {
      expect(deduplicator.getType()).toBe('deduplicator');
    });

    test('deve estar habilitado por padrão', () => {
      expect(deduplicator.isEnabled()).toBe(true);
    });
  });

  describe('isDuplicate()', () => {
    test('deve retornar false quando workflow não é duplicata', () => {
      const workflow = { name: 'Workflow A', tags: ['tag1'] };
      const existing = [
        { name: 'Workflow B', tags: ['tag2'] }
      ];

      expect(deduplicator.isDuplicate(workflow, existing)).toBe(false);
    });

    test('deve retornar true quando workflow é duplicata', () => {
      const workflow = { name: 'Workflow A', tags: ['tag1'] };
      const existing = [
        { name: 'Workflow A', tags: ['tag1'] }
      ];

      expect(deduplicator.isDuplicate(workflow, existing)).toBe(true);
    });

    test('deve retornar false quando workflow é null', () => {
      expect(deduplicator.isDuplicate(null, [])).toBe(false);
    });

    test('deve retornar false quando existingWorkflows não é array', () => {
      const workflow = { name: 'Test' };
      expect(deduplicator.isDuplicate(workflow, null)).toBe(false);
    });
  });

  describe('enable/disable', () => {
    test('deve permitir desabilitar plugin', () => {
      deduplicator.disable();
      expect(deduplicator.isEnabled()).toBe(false);
    });

    test('deve permitir habilitar plugin', () => {
      deduplicator.disable();
      deduplicator.enable();
      expect(deduplicator.isEnabled()).toBe(true);
    });
  });
});
```

### Template de Teste: Validator

```javascript
const MyValidator = require('../validators/my-validator');

describe('MyValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new MyValidator();
  });

  describe('Constructor', () => {
    test('deve ter metadados corretos', () => {
      expect(validator.getName()).toBe('my-validator');
      expect(validator.getVersion()).toBe('1.0.0');
      expect(validator.getType()).toBe('validator');
    });
  });

  describe('validate()', () => {
    test('deve validar workflow válido', () => {
      const workflow = {
        name: 'Test Workflow',
        nodes: [{ id: 'node1', name: 'Start', type: 'start', position: [0, 0], parameters: {} }],
        connections: {}
      };

      const result = validator.validate(workflow);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('deve retornar erro quando nome está ausente', () => {
      const workflow = {
        nodes: [],
        connections: {}
      };

      const result = validator.validate(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Nome do workflow é obrigatório');
    });

    test('deve retornar erro quando nodes está ausente', () => {
      const workflow = {
        name: 'Test',
        connections: {}
      };

      const result = validator.validate(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('deve retornar warnings sem invalidar workflow', () => {
      const workflow = {
        name: 'Test',
        nodes: [{ id: 'node1', name: 'Start', type: 'start', position: [0, 0], parameters: {} }],
        connections: {}
        // Sem tags (deve gerar warning)
      };

      const result = validator.validate(workflow);

      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    test('deve incluir metadata no resultado', () => {
      const workflow = {
        name: 'Test Workflow',
        nodes: [{ id: 'node1', name: 'Start', type: 'start', position: [0, 0], parameters: {} }],
        connections: {}
      };

      const result = validator.validate(workflow);

      expect(result.metadata).toBeDefined();
      expect(result.metadata.validator).toBe(validator.getName());
    });
  });
});
```

### Template de Teste: Reporter

```javascript
const MyReporter = require('../reporters/my-reporter');

describe('MyReporter', () => {
  let reporter;

  beforeEach(() => {
    reporter = new MyReporter();
  });

  const mockTransferResult = {
    success: true,
    totalWorkflows: 10,
    successCount: 8,
    failureCount: 2,
    duplicateCount: 0,
    errors: [
      { workflowName: 'Failed Workflow', message: 'Network error' }
    ],
    metadata: {
      source: 'https://source.n8n.io',
      target: 'https://target.n8n.io'
    },
    startTime: new Date('2025-10-03T10:00:00Z'),
    endTime: new Date('2025-10-03T10:05:00Z')
  };

  describe('Constructor', () => {
    test('deve ter metadados corretos', () => {
      expect(reporter.getName()).toBe('my-reporter');
      expect(reporter.getVersion()).toBe('1.0.0');
      expect(reporter.getType()).toBe('reporter');
    });
  });

  describe('generate()', () => {
    test('deve gerar relatório a partir de transferResult', () => {
      const report = reporter.generate(mockTransferResult);

      expect(report).toBeDefined();
      expect(typeof report).toBe('string');
      expect(report.length).toBeGreaterThan(0);
    });

    test('deve incluir estatísticas no relatório', () => {
      const report = reporter.generate(mockTransferResult);

      expect(report).toContain('10'); // totalWorkflows
      expect(report).toContain('8');  // successCount
      expect(report).toContain('2');  // failureCount
    });

    test('deve incluir erros no relatório', () => {
      const report = reporter.generate(mockTransferResult);

      expect(report).toContain('Failed Workflow');
      expect(report).toContain('Network error');
    });

    test('deve lançar erro quando transferResult é null', () => {
      expect(() => {
        reporter.generate(null);
      }).toThrow();
    });

    test('deve lançar erro quando transferResult falta campos obrigatórios', () => {
      const invalidResult = { success: true };

      expect(() => {
        reporter.generate(invalidResult);
      }).toThrow();
    });
  });

  describe('Opções', () => {
    test('deve respeitar opções customizadas', () => {
      const customReporter = new MyReporter({
        prettyPrint: false,
        includeWorkflowDetails: false
      });

      expect(customReporter.getOption('prettyPrint')).toBe(false);
      expect(customReporter.getOption('includeWorkflowDetails')).toBe(false);
    });
  });
});
```

### Estratégias de Mocking

#### Mocking PluginRegistry

```javascript
jest.mock('../core/plugin-registry');

const PluginRegistry = require('../core/plugin-registry');

test('deve registrar plugin no registry', () => {
  const mockRegister = jest.fn();
  PluginRegistry.mockImplementation(() => ({
    register: mockRegister
  }));

  const registry = new PluginRegistry();
  const plugin = new MyPlugin();

  registry.register(plugin);

  expect(mockRegister).toHaveBeenCalledWith(plugin);
});
```

#### Mocking Filesystem (para Reporters)

```javascript
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined)
  }
}));

const fs = require('fs').promises;

test('deve salvar relatório em arquivo', async () => {
  const reporter = new JSONReporter({ autoSave: true });

  reporter.generate(mockTransferResult);

  // Aguardar promises assíncronas
  await new Promise(resolve => setTimeout(resolve, 100));

  expect(fs.mkdir).toHaveBeenCalled();
  expect(fs.writeFile).toHaveBeenCalled();
});
```

### Cobertura de Testes

**Objetivo:** Mínimo 80% de cobertura de código

```bash
# Executar testes com cobertura
npm test -- --coverage

# Ou com Jest diretamente
jest --coverage --collectCoverageFrom='plugins/**/*.js'
```

**Exemplo de configuração Jest:**

```json
{
  "jest": {
    "collectCoverageFrom": [
      "plugins/**/*.js",
      "!plugins/__tests__/**",
      "!plugins/index.js"
    ],
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

---

## Distribuição

### Estrutura de Arquivo

Seu plugin customizado deve seguir esta estrutura:

```
my-custom-plugin/
├── package.json
├── README.md
├── index.js                    # Plugin principal
├── __tests__/
│   └── index.test.js
└── examples/
    └── usage-example.js
```

### package.json Mínimo

```json
{
  "name": "n8n-transfer-plugin-my-validator",
  "version": "1.0.0",
  "description": "Custom validator for n8n-transfer",
  "main": "index.js",
  "scripts": {
    "test": "jest"
  },
  "keywords": [
    "n8n",
    "n8n-transfer",
    "plugin",
    "validator"
  ],
  "author": "Your Name",
  "license": "MIT",
  "peerDependencies": {
    "n8n-transfer": "^1.0.0"
  },
  "devDependencies": {
    "jest": "^29.0.0"
  }
}
```

### README Template

```markdown
# My Custom Validator Plugin

Custom validator plugin for n8n-transfer system.

## Installation

\`\`\`bash
npm install n8n-transfer-plugin-my-validator
\`\`\`

## Usage

\`\`\`javascript
const { PluginRegistry } = require('n8n-transfer/core/plugin-registry');
const MyValidator = require('n8n-transfer-plugin-my-validator');

const registry = new PluginRegistry();
const validator = new MyValidator({
  strictMode: true
});

registry.register(validator);
\`\`\`

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `strictMode` | boolean | `false` | Enable strict validation |

## License

MIT
```

### Instalação

#### Instalação Local

```bash
# No diretório do n8n-transfer
npm install ../path/to/my-custom-plugin
```

#### Instalação via npm

```bash
npm install n8n-transfer-plugin-my-validator
```

#### Instalação Manual

1. Copiar arquivo do plugin para `n8n-transfer/plugins/[tipo]/`
2. Plugin será descoberto automaticamente via `registry.discover()`

### Publicação no npm

```bash
# 1. Login no npm
npm login

# 2. Publicar
npm publish

# 3. Para updates
npm version patch  # ou minor, major
npm publish
```

---

## Referência da API

### BasePlugin Class

#### Constructor

```javascript
constructor(name: string, version: string, type: PluginType, options?: Object)
```

**Parâmetros:**
- `name` (string): Nome único do plugin
- `version` (string): Versão semver (ex: "1.0.0")
- `type` (PluginType): Tipo do plugin ("deduplicator", "validator", "reporter")
- `options` (Object, opcional): Opções de configuração

**Throws:**
- `Error` se name ou version não forem fornecidos
- `Error` se type não for válido

#### Métodos Públicos

##### getName()
```javascript
getName(): string
```
Retorna o nome do plugin.

##### getVersion()
```javascript
getVersion(): string
```
Retorna a versão do plugin.

##### getType()
```javascript
getType(): PluginType
```
Retorna o tipo do plugin.

##### isEnabled()
```javascript
isEnabled(): boolean
```
Verifica se o plugin está habilitado.

##### enable()
```javascript
enable(): BasePlugin
```
Habilita o plugin. Retorna `this` para chaining.

##### disable()
```javascript
disable(): BasePlugin
```
Desabilita o plugin. Retorna `this` para chaining.

##### setOptions(options)
```javascript
setOptions(options: Object): BasePlugin
```
Define opções de configuração. Retorna `this` para chaining.

##### getOption(key, defaultValue)
```javascript
getOption(key: string, defaultValue?: any): any
```
Obtém valor de uma opção. Retorna `defaultValue` se opção não existir.

##### setDescription(description)
```javascript
setDescription(description: string): BasePlugin
```
Define descrição do plugin. Retorna `this` para chaining.

##### getDescription()
```javascript
getDescription(): string
```
Retorna descrição do plugin.

##### getInfo()
```javascript
getInfo(): PluginInfo
```
Retorna objeto com todas as informações do plugin.

**Retorno:**
```javascript
{
  name: string,
  version: string,
  type: PluginType,
  enabled: boolean,
  description: string,
  options: Object
}
```

##### validateImplementation(methods)
```javascript
validateImplementation(methods: string[]): void
```
Valida que métodos obrigatórios foram implementados.

**Throws:**
- `Error` se algum método obrigatório não estiver implementado

### PluginRegistry Class

#### Constructor

```javascript
constructor()
```

#### Métodos Públicos

##### register(plugin)
```javascript
register(plugin: BasePlugin): void
```
Registra um plugin manualmente.

**Throws:**
- `Error` se plugin não for instância de BasePlugin
- `Error` se plugin com mesmo nome já estiver registrado
- `Error` se plugin não implementar métodos obrigatórios

##### get(name)
```javascript
get(name: string): BasePlugin | null
```
Busca plugin por nome (case-insensitive). Retorna `null` se não encontrado.

##### discover(directory)
```javascript
discover(directory: string): DiscoveryResult
```
Descobre e carrega plugins automaticamente de um diretório.

**Retorno:**
```javascript
{
  total: number,        // Total de arquivos encontrados
  loaded: number,       // Plugins carregados com sucesso
  failed: number,       // Falhas ao carregar
  plugins: string[],    // Nomes dos plugins descobertos
  errors: Object[]      // Lista de erros
}
```

**Throws:**
- `Error` se diretório não existir

##### listByType(type)
```javascript
listByType(type: PluginType): BasePlugin[]
```
Lista todos os plugins de um tipo específico.

**Throws:**
- `Error` se type não for válido

##### getAll()
```javascript
getAll(): BasePlugin[]
```
Retorna array com todos os plugins registrados.

##### unregister(name)
```javascript
unregister(name: string): boolean
```
Remove plugin do registry. Retorna `true` se removido, `false` se não encontrado.

##### clear()
```javascript
clear(): void
```
Remove todos os plugins do registry.

##### getStats()
```javascript
getStats(): RegistryStats
```
Retorna estatísticas do registry.

**Retorno:**
```javascript
{
  total: number,
  enabled: number,
  disabled: number,
  byType: {
    deduplicator: number,
    validator: number,
    reporter: number
  }
}
```

### Type Definitions

#### PluginType
```typescript
type PluginType = 'deduplicator' | 'validator' | 'reporter';
```

#### ValidationResult
```typescript
interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
  metadata?: Object;
}
```

#### TransferResult
```typescript
interface TransferResult {
  success: boolean;
  totalWorkflows: number;
  successCount: number;
  failureCount: number;
  duplicateCount: number;
  errors: Object[];
  metadata: Object;
  startTime: Date;
  endTime: Date;
}
```

---

## Boas Práticas

### 1. Nomenclatura

**Convenções:**
- Nome do plugin: kebab-case (ex: `custom-validator`)
- Classe: PascalCase (ex: `CustomValidator`)
- Arquivos: kebab-case (ex: `custom-validator.js`)
- Prefixo para plugins publicados: `n8n-transfer-plugin-{nome}`

**Exemplos:**
```javascript
// ✅ CORRETO
class SchemaValidator extends BasePlugin {
  constructor() {
    super('schema-validator', '1.0.0', 'validator');
  }
}

// ❌ INCORRETO
class SchemaValidator extends BasePlugin {
  constructor() {
    super('SchemaValidator', '1.0', 'validator'); // Nome em PascalCase, versão inválida
  }
}
```

### 2. Versionamento Semântico

Siga [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.1.0): New features (backward compatible)
- **PATCH** (0.0.1): Bug fixes

**Exemplo:**
```javascript
// v1.0.0 - Versão inicial
class MyValidator extends BasePlugin {
  constructor() {
    super('my-validator', '1.0.0', 'validator');
  }

  validate(workflow) {
    // Implementação
  }
}

// v1.1.0 - Nova feature: opção strictMode
class MyValidator extends BasePlugin {
  constructor(options = {}) {
    super('my-validator', '1.1.0', 'validator', options);
    this.setOptions({ strictMode: false, ...options });
  }

  validate(workflow) {
    // Implementação com strictMode
  }
}

// v2.0.0 - Breaking change: método validate retorna Promise
class MyValidator extends BasePlugin {
  constructor(options = {}) {
    super('my-validator', '2.0.0', 'validator', options);
  }

  async validate(workflow) {
    // Agora assíncrono (breaking change)
  }
}
```

### 3. Tratamento de Erros

**Sempre valide entradas:**

```javascript
// ✅ CORRETO
validate(workflow) {
  if (!workflow || typeof workflow !== 'object') {
    return {
      valid: false,
      errors: ['Workflow inválido ou ausente'],
      warnings: [],
      metadata: {}
    };
  }

  // Validações...
}

// ❌ INCORRETO (não valida entrada)
validate(workflow) {
  return {
    valid: workflow.nodes.length > 0, // Pode causar erro se workflow for null
    errors: [],
    warnings: [],
    metadata: {}
  };
}
```

**Use try/catch para operações que podem falhar:**

```javascript
generate(transferResult) {
  try {
    const report = this._buildReport(transferResult);
    return report;
  } catch (error) {
    console.error(`Erro ao gerar relatório: ${error.message}`);
    throw new Error(`Falha na geração de relatório: ${error.message}`);
  }
}
```

### 4. Documentação com JSDoc

**Sempre documente:**
- Classes
- Métodos públicos
- Parâmetros e tipos
- Retornos
- Exceções lançadas

**Exemplo completo:**

```javascript
/**
 * Custom Workflow Validator
 *
 * Valida workflows customizados com regras de negócio específicas.
 * Suporta validação de quantidade de nodes, tags obrigatórias e tipos proibidos.
 *
 * @class CustomValidator
 * @extends BasePlugin
 *
 * @example
 * const validator = new CustomValidator({
 *   maxNodes: 50,
 *   requiredTags: ['production'],
 *   forbiddenNodeTypes: ['http-request']
 * });
 *
 * const result = validator.validate(workflow);
 * if (!result.valid) {
 *   console.error('Erros:', result.errors);
 * }
 */
class CustomValidator extends BasePlugin {
  /**
   * Cria uma nova instância do CustomValidator
   *
   * @param {Object} [options={}] - Opções de configuração
   * @param {number} [options.maxNodes=50] - Máximo de nodes permitidos
   * @param {string[]} [options.requiredTags=[]] - Tags obrigatórias
   * @param {string[]} [options.forbiddenNodeTypes=[]] - Tipos de nodes proibidos
   *
   * @example
   * const validator = new CustomValidator({
   *   maxNodes: 100,
   *   requiredTags: ['production', 'approved']
   * });
   */
  constructor(options = {}) {
    super('custom-validator', '1.0.0', 'validator', options);

    this.setOptions({
      maxNodes: 50,
      requiredTags: [],
      forbiddenNodeTypes: [],
      ...options
    });
  }

  /**
   * Valida workflow contra regras customizadas
   *
   * Verifica:
   * - Quantidade de nodes (não deve exceder maxNodes)
   * - Presença de tags obrigatórias
   * - Ausência de tipos de nodes proibidos
   *
   * @param {Object} workflow - Workflow a ser validado
   * @param {string} workflow.name - Nome do workflow
   * @param {Object[]} workflow.nodes - Array de nodes
   * @param {string[]} [workflow.tags=[]] - Array de tags
   *
   * @returns {ValidationResult} Resultado da validação
   * @returns {boolean} ValidationResult.valid - true se válido
   * @returns {string[]} ValidationResult.errors - Erros encontrados
   * @returns {string[]} ValidationResult.warnings - Avisos
   * @returns {Object} ValidationResult.metadata - Metadados da validação
   *
   * @example
   * const workflow = {
   *   name: 'Customer Onboarding',
   *   nodes: [...],
   *   tags: ['production']
   * };
   *
   * const result = validator.validate(workflow);
   * console.log(result.valid); // true ou false
   * console.log(result.errors); // ['Erro 1', 'Erro 2']
   */
  validate(workflow) {
    // Implementação
  }
}
```

### 5. Performance

**Evite operações caras desnecessárias:**

```javascript
// ❌ INCORRETO (serializa todo o workflow sempre)
isDuplicate(workflow, existing) {
  return existing.some(w =>
    JSON.stringify(w) === JSON.stringify(workflow)
  );
}

// ✅ CORRETO (comparações rápidas primeiro)
isDuplicate(workflow, existing) {
  // 1. Verificação rápida (nome)
  const nameMatches = existing.filter(w => w.name === workflow.name);
  if (nameMatches.length === 0) return false;

  // 2. Verificação de tags (se nome matched)
  for (const match of nameMatches) {
    if (this._tagsEqual(workflow.tags, match.tags)) {
      return true;
    }
  }

  return false;
}
```

**Use caching quando apropriado:**

```javascript
class HashDeduplicator extends BasePlugin {
  constructor() {
    super('hash-dedup', '1.0.0', 'deduplicator');
    this._hashCache = new Map(); // Cache de hashes
  }

  isDuplicate(workflow, existing) {
    const workflowHash = this._getHash(workflow);

    for (const w of existing) {
      const existingHash = this._getHash(w);
      if (workflowHash === existingHash) {
        return true;
      }
    }

    return false;
  }

  _getHash(workflow) {
    const id = workflow.id || workflow.name;

    if (this._hashCache.has(id)) {
      return this._hashCache.get(id); // Retorna do cache
    }

    const hash = this._calculateHash(workflow);
    this._hashCache.set(id, hash); // Armazena no cache
    return hash;
  }

  _calculateHash(workflow) {
    // Cálculo caro de hash
    const content = JSON.stringify(workflow.nodes);
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}
```

### 6. Testabilidade

**Separe lógica em métodos testáveis:**

```javascript
class MyValidator extends BasePlugin {
  validate(workflow) {
    const errors = [];

    // Método público, fácil de testar
    errors.push(...this.validateName(workflow.name));
    errors.push(...this.validateNodes(workflow.nodes));
    errors.push(...this.validateTags(workflow.tags));

    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
      metadata: {}
    };
  }

  // Métodos menores, testáveis isoladamente
  validateName(name) {
    if (!name || name.trim() === '') {
      return ['Nome é obrigatório'];
    }
    return [];
  }

  validateNodes(nodes) {
    const errors = [];
    if (!Array.isArray(nodes)) {
      errors.push('Nodes deve ser um array');
    } else if (nodes.length === 0) {
      errors.push('Workflow deve ter pelo menos 1 node');
    }
    return errors;
  }

  validateTags(tags) {
    // ...
  }
}
```

**Use dependency injection para facilitar mocking:**

```javascript
class MyReporter extends BasePlugin {
  constructor(options = {}, fileWriter = null) {
    super('my-reporter', '1.0.0', 'reporter', options);

    // Permite injetar mock de fileWriter nos testes
    this.fileWriter = fileWriter || require('fs').promises;
  }

  async _saveReport(content, path) {
    await this.fileWriter.writeFile(path, content, 'utf8');
  }
}

// Em testes:
const mockFileWriter = {
  writeFile: jest.fn().mockResolvedValue(undefined)
};

const reporter = new MyReporter({}, mockFileWriter);
```

### 7. Configurabilidade

**Use opções para tornar plugins flexíveis:**

```javascript
class ConfigurableDeduplicator extends BasePlugin {
  constructor(options = {}) {
    super('configurable-dedup', '1.0.0', 'deduplicator', options);

    // Opções com valores padrão
    this.setOptions({
      compareFields: ['name', 'tags'],   // Campos a comparar
      caseSensitive: true,                // Case-sensitive
      ignoreDisabledWorkflows: false,     // Ignorar workflows desabilitados
      customComparator: null,             // Função customizada de comparação
      ...options
    });
  }

  isDuplicate(workflow, existing) {
    const compareFields = this.getOption('compareFields', ['name']);
    const customComparator = this.getOption('customComparator');

    // Se há comparador customizado, usar ele
    if (customComparator && typeof customComparator === 'function') {
      return customComparator(workflow, existing);
    }

    // Lógica padrão baseada em compareFields
    for (const field of compareFields) {
      // ...
    }
  }
}

// Uso com opções customizadas:
const dedup = new ConfigurableDeduplicator({
  compareFields: ['name', 'id'],
  caseSensitive: false,
  customComparator: (workflow, existing) => {
    // Lógica totalmente customizada
    return workflow.id === existing.id;
  }
});
```

### 8. Logging e Debugging

**Implemente logging adequado:**

```javascript
class MyPlugin extends BasePlugin {
  constructor(options = {}) {
    super('my-plugin', '1.0.0', 'validator', options);

    this.setOptions({
      verbose: false,
      ...options
    });
  }

  validate(workflow) {
    this._log(`Validando workflow: ${workflow.name}`);

    const errors = [];

    if (!workflow.nodes || workflow.nodes.length === 0) {
      const error = 'Workflow sem nodes';
      errors.push(error);
      this._log(`Erro: ${error}`, 'error');
    }

    this._log(`Validação completa. Erros: ${errors.length}`);

    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
      metadata: {}
    };
  }

  _log(message, level = 'info') {
    if (this.getOption('verbose', false)) {
      const prefix = `[${this.getName()}]`;
      const timestamp = new Date().toISOString();

      if (level === 'error') {
        console.error(`${timestamp} ${prefix} ${message}`);
      } else {
        console.log(`${timestamp} ${prefix} ${message}`);
      }
    }
  }
}
```

### 9. Segurança

**Valide e sanitize entradas:**

```javascript
validate(workflow) {
  // Validar que workflow não contém código malicioso
  if (this._containsMaliciousCode(workflow)) {
    return {
      valid: false,
      errors: ['Workflow contém código potencialmente malicioso'],
      warnings: [],
      metadata: {}
    };
  }

  // Validações normais...
}

_containsMaliciousCode(workflow) {
  const suspicious = ['eval(', 'Function(', 'require(', 'process.'];

  const workflowStr = JSON.stringify(workflow);

  return suspicious.some(pattern =>
    workflowStr.includes(pattern)
  );
}
```

**Não exponha dados sensíveis em logs:**

```javascript
generate(transferResult) {
  // ❌ INCORRETO (pode expor API keys em logs)
  console.log('Gerando relatório:', transferResult);

  // ✅ CORRETO (sanitiza dados sensíveis)
  const sanitized = this._sanitizeForLogging(transferResult);
  console.log('Gerando relatório:', sanitized);

  // ...
}

_sanitizeForLogging(data) {
  const sanitized = { ...data };

  // Remover campos sensíveis
  if (sanitized.metadata) {
    delete sanitized.metadata.apiKey;
    delete sanitized.metadata.credentials;
  }

  return sanitized;
}
```

---

## Exemplos Avançados

### Plugin com Configuração Externa

```javascript
const fs = require('fs');
const path = require('path');

class ConfigurableValidator extends BasePlugin {
  constructor(configPath = null) {
    super('configurable-validator', '1.0.0', 'validator');

    // Carregar configuração de arquivo se fornecido
    if (configPath) {
      this.loadConfigFromFile(configPath);
    }
  }

  loadConfigFromFile(configPath) {
    const fullPath = path.resolve(process.cwd(), configPath);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`Arquivo de configuração não encontrado: ${fullPath}`);
    }

    const config = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

    this.setOptions(config);
    this.setDescription(config.description || this.getDescription());

    console.log(`Configuração carregada de: ${fullPath}`);
  }

  validate(workflow) {
    // Validação baseada em configuração carregada
    const rules = this.getOption('rules', []);

    const errors = [];

    for (const rule of rules) {
      const ruleResult = this._applyRule(workflow, rule);
      if (!ruleResult.valid) {
        errors.push(...ruleResult.errors);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
      metadata: { rulesApplied: rules.length }
    };
  }

  _applyRule(workflow, rule) {
    switch (rule.type) {
      case 'max-nodes':
        return this._validateMaxNodes(workflow, rule.value);
      case 'required-tags':
        return this._validateRequiredTags(workflow, rule.value);
      default:
        return { valid: true, errors: [] };
    }
  }

  _validateMaxNodes(workflow, maxNodes) {
    const nodeCount = workflow.nodes?.length || 0;
    if (nodeCount > maxNodes) {
      return {
        valid: false,
        errors: [`Workflow possui ${nodeCount} nodes, máximo: ${maxNodes}`]
      };
    }
    return { valid: true, errors: [] };
  }

  _validateRequiredTags(workflow, requiredTags) {
    const workflowTags = workflow.tags || [];
    const missing = requiredTags.filter(tag => !workflowTags.includes(tag));

    if (missing.length > 0) {
      return {
        valid: false,
        errors: [`Tags obrigatórias ausentes: ${missing.join(', ')}`]
      };
    }

    return { valid: true, errors: [] };
  }
}

module.exports = ConfigurableValidator;
```

**Arquivo de configuração (validation-rules.json):**

```json
{
  "description": "Validador customizado com regras de produção",
  "rules": [
    {
      "type": "max-nodes",
      "value": 50
    },
    {
      "type": "required-tags",
      "value": ["production", "approved"]
    }
  ]
}
```

**Uso:**

```javascript
const validator = new ConfigurableValidator('./validation-rules.json');
const result = validator.validate(workflow);
```

### Plugin com Eventos

```javascript
const EventEmitter = require('events');

class EventDrivenValidator extends BasePlugin {
  constructor() {
    super('event-validator', '1.0.0', 'validator');

    this.events = new EventEmitter();
  }

  validate(workflow) {
    this.events.emit('validation:start', { workflow: workflow.name });

    const errors = [];
    const warnings = [];

    // Validação de nome
    if (!workflow.name) {
      const error = 'Nome obrigatório';
      errors.push(error);
      this.events.emit('validation:error', { error, field: 'name' });
    }

    // Validação de nodes
    if (!workflow.nodes || workflow.nodes.length === 0) {
      const error = 'Nodes obrigatórios';
      errors.push(error);
      this.events.emit('validation:error', { error, field: 'nodes' });
    }

    // Validação de tags (warning)
    if (!workflow.tags || workflow.tags.length === 0) {
      const warning = 'Workflow sem tags';
      warnings.push(warning);
      this.events.emit('validation:warning', { warning, field: 'tags' });
    }

    const result = {
      valid: errors.length === 0,
      errors,
      warnings,
      metadata: {}
    };

    this.events.emit('validation:complete', {
      workflow: workflow.name,
      valid: result.valid,
      errorCount: errors.length
    });

    return result;
  }

  on(event, handler) {
    this.events.on(event, handler);
    return this;
  }

  once(event, handler) {
    this.events.once(event, handler);
    return this;
  }

  off(event, handler) {
    this.events.off(event, handler);
    return this;
  }
}

module.exports = EventDrivenValidator;
```

**Uso com eventos:**

```javascript
const validator = new EventDrivenValidator();

validator.on('validation:start', ({ workflow }) => {
  console.log(`Iniciando validação de: ${workflow}`);
});

validator.on('validation:error', ({ error, field }) => {
  console.error(`Erro no campo ${field}: ${error}`);
});

validator.on('validation:warning', ({ warning, field }) => {
  console.warn(`Aviso no campo ${field}: ${warning}`);
});

validator.on('validation:complete', ({ workflow, valid, errorCount }) => {
  console.log(`Validação completa de ${workflow}: ${valid ? 'OK' : `FALHOU (${errorCount} erros)`}`);
});

const result = validator.validate(workflow);
```

---

## Recursos Adicionais

### Referências

- **Documentação Principal**: `plugins/README.md`
- **Código Fonte**: `plugins/index.js` (BasePlugin)
- **Plugin Registry**: `core/plugin-registry.js`
- **Exemplos**: Plugins built-in em `plugins/deduplicators/`, `plugins/validators/`, `plugins/reporters/`

### Comunidade e Suporte

- **Issues**: [GitHub Issues](https://github.com/seu-repo/docs-jana/issues)
- **Discussões**: [GitHub Discussions](https://github.com/seu-repo/docs-jana/discussions)
- **Contribuindo**: Ver `CONTRIBUTING.md`

### Plugins de Exemplo Completos

1. **StandardDeduplicator**: `plugins/deduplicators/standard-deduplicator.js`
   - Deduplicação por nome e tags
   - Comparação case-sensitive
   - Razão de duplicata

2. **SchemaValidator**: `plugins/validators/schema-validator.js`
   - Validação com Zod schema
   - Type checking completo
   - Formatação de erros Zod

3. **JSONReporter**: `plugins/reporters/json-reporter.js`
   - Relatório JSON completo
   - Auto-save em arquivo
   - Metadados e estatísticas

---

## Changelog

### v1.0.0 (2025-10-03)

- Versão inicial do guia
- Documentação completa de Deduplicators, Validators e Reporters
- Templates e exemplos práticos
- Seção de testes e mocking
- Boas práticas e referência da API

---

**Desenvolvido com ❤️ para o projeto docs-jana**

**Autor**: Jana Team
**Data**: 2025-10-03
**Versão**: 1.0.0
