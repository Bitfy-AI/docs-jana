# Arquitetura do Sistema de Migração

Documentação técnica da arquitetura e implementação do sistema de migração de workflows n8n.

## Visão Geral

O sistema foi projetado para migrar workflows n8n entre instâncias diferentes, preservando todas as dependências e referências entre workflows. A implementação segue o padrão do código de referência fornecido, priorizando a busca de workflows por **nome** ao invés de ID.

## Arquitetura em 5 Fases

### Fase 1: Inicialização
**Responsável por:** Carregar configurações e preparar o ambiente

**Componentes:**
- `EnvLoader` - Carrega variáveis do .env
- `AuthFactory` - Cria estratégia de autenticação
- `HttpClient` - Cliente HTTP para API do n8n
- `WorkflowService` - Serviço para operações de workflow
- `WorkflowLoader` - Carrega workflows do filesystem

**Fluxo:**
1. Carrega .env
2. Valida credenciais
3. Cria instâncias de serviços
4. Carrega workflows JSON
5. Aplica filtros (tag, nome, etc)

### Fase 2: Análise de Dependências
**Responsável por:** Construir grafo e calcular ordem de upload

**Componentes:**
- `DependencyAnalyzer` - Analisa dependências
- `WorkflowGraph` - Estrutura de dados do grafo

**Fluxo:**
1. Indexa todos os workflows no grafo
2. Extrai dependências de cada workflow
3. Constrói grafo direcionado
4. Executa ordenação topológica (algoritmo de Kahn)
5. Detecta ciclos de dependências

**Algoritmo de Detecção de Dependências:**
```javascript
// Busca nodes do tipo "executeWorkflow"
for (const node of workflow.nodes) {
  if (node.type === 'n8n-nodes-base.executeWorkflow') {
    // Extrai nome do workflow referenciado
    const depName = node.parameters.workflowId.cachedResultName;
    dependencies.add(depName);
  }
}
```

### Fase 3: Upload Sequencial
**Responsável por:** Criar workflows na ordem correta

**Componentes:**
- `WorkflowUploadService` - Gerencia upload
- `IdMapper` - Mapeia IDs antigos para novos

**Fluxo:**
1. Verifica workflows existentes no destino
2. Para cada workflow na ordem:
   - Pula se já existe (opcional)
   - Prepara dados (remove campos desnecessários)
   - Cria via API POST /api/v1/workflows
   - Registra mapeamento (oldId, name -> newId)
   - Aguarda delay entre uploads

**Estrutura de Mapeamento:**
```javascript
// Mapa por NOME (PRIORIDADE)
nameToNewId: Map {
  "(INS-BCO-001) fabrica-insere-banco" => "ABC123xyz",
  "(BCO-CON-001) normalizador-banco-consultas" => "DEF456abc"
}

// Mapa por ID (FALLBACK)
oldIdToNewId: Map {
  "BrobqIHcPHBeCUPN" => "ABC123xyz",
  "Krdi6CaDNjI1Wtln" => "DEF456abc"
}
```

### Fase 4: Atualização de Referências
**Responsável por:** Atualizar IDs nos workflows

**Componentes:**
- `ReferenceUpdater` - Atualiza referências recursivamente

**Fluxo:**
1. Para cada workflow criado:
   - Percorre recursivamente todos os objetos/arrays
   - Identifica campos `workflowId`
   - Busca novo ID por NOME primeiro
   - Se não encontrar, busca por ID antigo
   - Atualiza `workflowId.value`
2. Atualiza workflow via API PUT /api/v1/workflows/{id}

**Algoritmo de Atualização (Recursivo):**
```javascript
function updateObjectRecursively(obj) {
  // Se encontrou workflowId
  if (obj.workflowId && obj.workflowId.cachedResultName) {
    // PRIORIDADE 1: Busca por nome
    const newId = idMapper.getIdByName(obj.workflowId.cachedResultName);

    if (newId) {
      obj.workflowId.value = newId; // ATUALIZA!
    } else {
      // PRIORIDADE 2: Busca por ID antigo
      const fallbackId = idMapper.getIdByOldId(obj.workflowId.value);
      if (fallbackId) {
        obj.workflowId.value = fallbackId;
      }
    }
  }

  // Recursão em propriedades
  for (const key in obj) {
    if (typeof obj[key] === 'object') {
      updateObjectRecursively(obj[key]);
    }
  }
}
```

### Fase 5: Verificação de Integridade
**Responsável por:** Garantir ZERO elos perdidos

**Componentes:**
- `MigrationVerifier` - Executa verificações

**Verificações:**

1. **Contagem de Workflows**
   - Compara quantidade original vs criada
   - Valida que todos foram criados

2. **Criação de Workflows**
   - Verifica que cada workflow original tem mapeamento
   - Lista workflows que falharam

3. **Integridade de Referências**
   - Busca todos os workflows criados
   - Valida cada node `executeWorkflow`
   - Verifica se IDs referenciados existem
   - Detecta referências quebradas

4. **Integridade de Nodes**
   - Compara contagem de nodes original vs criado
   - Detecta discrepâncias

**Critério de Sucesso:**
- Todos os 4 checks devem passar
- Zero issues críticas
- Zero referências quebradas

## Estrutura de Dados

### Workflow JSON (n8n)

```json
{
  "id": "75q0ifXVV6qTaABN",
  "name": "3. (MAP-DBC-001) ponte-normalizacao-debouncer-agente",
  "active": false,
  "nodes": [
    {
      "parameters": {
        "workflowId": {
          "value": "BrobqIHcPHBeCUPN",
          "cachedResultName": "(INS-BCO-001) fabrica-insere-banco"
        }
      },
      "type": "n8n-nodes-base.executeWorkflow",
      "name": "Executa Workflow"
    }
  ],
  "connections": {},
  "settings": {},
  "tags": ["jana"]
}
```

### Grafo de Dependências

```javascript
WorkflowGraph {
  workflows: Map {
    "75q0ifXVV6qTaABN" => { /* workflow completo */ },
    "BrobqIHcPHBeCUPN" => { /* workflow completo */ }
  },

  nameToId: Map {
    "3. (MAP-DBC-001)..." => "75q0ifXVV6qTaABN",
    "(INS-BCO-001)..." => "BrobqIHcPHBeCUPN"
  },

  dependencies: Map {
    "75q0ifXVV6qTaABN" => ["BrobqIHcPHBeCUPN"]
  },

  dependents: Map {
    "BrobqIHcPHBeCUPN" => ["75q0ifXVV6qTaABN"]
  }
}
```

### Ordenação Topológica

**Algoritmo de Kahn:**
```
1. Calcula grau de entrada de cada nó
2. Adiciona nós com grau 0 na fila
3. Enquanto fila não vazia:
   a. Remove nó da fila
   b. Adiciona na ordem
   c. Reduz grau de entrada dos dependentes
   d. Se grau virou 0, adiciona na fila
4. Se ainda há nós não processados = ciclo
```

**Exemplo:**
```
Workflows:
  A (sem deps)
  B (depende de A)
  C (depende de A e B)

Ordem: [A, B, C]
```

## Padrões de Código

### Strategy Pattern (Autenticação)
```javascript
// AuthStrategy (interface)
class AuthStrategy {
  getHeaders() {}
  validate() {}
}

// Implementações
class ApiKeyStrategy extends AuthStrategy { }
class BasicAuthStrategy extends AuthStrategy { }

// Factory
class AuthFactory {
  static create(credentials) {
    if (credentials.apiKey) return new ApiKeyStrategy();
    if (credentials.username) return new BasicAuthStrategy();
  }
}
```

### Service Pattern
Toda lógica de negócio está em services:
- `WorkflowService` - Operações de workflow
- `DependencyAnalyzer` - Análise de dependências
- `WorkflowUploadService` - Upload de workflows
- `ReferenceUpdater` - Atualização de referências
- `MigrationVerifier` - Verificação de integridade

### Injeção de Dependências
```javascript
class WorkflowUploadService {
  constructor(workflowService, idMapper, logger) {
    this.workflowService = workflowService;
    this.idMapper = idMapper;
    this.logger = logger;
  }
}

// Uso
const uploadService = new WorkflowUploadService(
  workflowService,
  idMapper,
  logger
);
```

## Tratamento de Erros

### Nível 1: Try/Catch Individual
Cada operação crítica tem try/catch:
```javascript
try {
  const created = await this.uploadWorkflow(workflow);
  results.success.push(created);
} catch (error) {
  results.failed.push({ error: error.message });
}
```

### Nível 2: Continuar ou Parar
Opção `stopOnError` controla comportamento:
```javascript
if (options.stopOnError) {
  throw error; // Para execução
} else {
  continue; // Continua com próximo
}
```

### Nível 3: Validação Pós-Execução
Fase 5 valida integridade completa.

## Performance

### Otimizações Implementadas

1. **Delay entre uploads** - Evita sobrecarga da API
2. **Mapeamento em memória** - Maps para busca O(1)
3. **Clonagem profunda** - Não modifica originais
4. **Logs condicionais** - Usa logLevel para controlar

### Limites

- Workflows: Sem limite (testado com 19)
- Dependências: Sem limite (testado com 45)
- Nodes por workflow: Sem limite (testado com 234)

## Testes

### Script de Teste
```bash
node test-migration.js ./workflows
```

Valida:
1. Carregamento de workflows
2. Análise de dependências
3. Mapeamento de IDs
4. Atualização de referências
5. Validação de referências

### Teste Manual

1. **Dry Run:**
```bash
node upload-n8n-workflows.js ./workflows --dry-run
```

2. **Migração Real:**
```bash
node upload-n8n-workflows.js ./workflows
```

3. **Verificar no n8n:**
- Abrir workflows criados
- Verificar referências
- Testar execução

## API do n8n

### Endpoints Utilizados

```
GET  /api/v1/workflows          # Listar workflows
GET  /api/v1/workflows/{id}     # Buscar workflow
POST /api/v1/workflows          # Criar workflow
PUT  /api/v1/workflows/{id}     # Atualizar workflow
```

### Autenticação

**API Key (Header):**
```
X-N8N-API-KEY: sua_api_key
```

**Basic Auth (Header):**
```
Authorization: Basic base64(username:password)
```

## Logs

### Níveis
- `debug` - Todos os detalhes
- `info` - Informações gerais (padrão)
- `warn` - Avisos
- `error` - Erros

### Formato
```
[timestamp] emoji mensagem
[2025-09-30T12:00:00.000Z] ✅ Workflow criado
```

## Extensibilidade

### Adicionar Nova Verificação

```javascript
// Em migration-verifier.js
async verifyCustomCheck() {
  const result = { passed: true, issues: [] };

  // Sua lógica aqui

  return result;
}

// No método verify()
results.checks.customCheck = await this.verifyCustomCheck();
```

### Adicionar Novo Filtro

```javascript
// Em workflow-loader.js
filterWorkflows(workflows, filters) {
  if (filters.customFilter) {
    // Sua lógica
  }
}
```

## Referências

- [n8n API Documentation](https://docs.n8n.io/api/)
- [Ordenação Topológica](https://en.wikipedia.org/wiki/Topological_sorting)
- [Algoritmo de Kahn](https://en.wikipedia.org/wiki/Topological_sorting#Kahn's_algorithm)

## Contribuindo

Para contribuir com melhorias:

1. Mantenha a estrutura modular
2. Adicione testes para novas funcionalidades
3. Documente mudanças
4. Siga os padrões de código existentes

## Licença

Este projeto segue a mesma licença do repositório principal.
