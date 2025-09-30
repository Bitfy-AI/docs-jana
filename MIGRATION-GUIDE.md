# Guia de Migração de Workflows N8N

Sistema completo para migração de workflows n8n entre instâncias, preservando todas as dependências e referências.

## Características

- **ZERO elos perdidos**: Garante que todas as referências entre workflows sejam mantidas
- **Análise de dependências**: Detecta e ordena workflows automaticamente
- **Busca inteligente**: Prioriza busca por nome (cachedResultName) sobre ID
- **Verificação de integridade**: Valida migração após conclusão
- **Modo dry-run**: Simula migração sem fazer alterações
- **Relatórios detalhados**: Gera JSON com estatísticas completas

## Arquitetura

### 5 Fases da Migração

1. **Inicialização**: Carrega configurações, autentica e carrega workflows
2. **Análise de Dependências**: Constrói grafo e calcula ordem de upload
3. **Upload Sequencial**: Cria workflows respeitando dependências
4. **Atualização de Referências**: Atualiza IDs usando mapeamento por nome
5. **Verificação**: Valida integridade (ZERO elos perdidos)

### Estrutura de Arquivos Criados

```
src/
├── models/
│   └── workflow-graph.js          # Grafo de dependências (ordenação topológica)
├── utils/
│   ├── workflow-loader.js         # Carregador de workflows do filesystem
│   └── id-mapper.js               # Mapeamento inteligente de IDs (prioridade: nome)
└── services/
    ├── dependency-analyzer.js     # Análise e ordenação de dependências
    ├── workflow-upload-service.js # Upload sequencial de workflows
    ├── reference-updater.js       # Atualização recursiva de referências
    └── migration-verifier.js      # Verificação de integridade

upload-n8n-workflows.js            # Script principal de migração
```

## Instalação

### 1. Configurar credenciais

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Edite `.env` e configure suas credenciais:

```bash
# N8N de DESTINO (onde workflows serão criados)
N8N_URL=https://destino.n8n.cloud/
N8N_API_KEY=sua_api_key_aqui

# Opcional: Filtrar por tag
# N8N_TAG=jana
```

### 2. Baixar workflows da origem (opcional)

Se você ainda não tem os workflows em JSON, baixe-os primeiro:

```bash
# Configure .env com credenciais da ORIGEM
node download-n8n-workflows.js
```

Isso criará uma pasta `n8n-workflows-YYYY-MM-DD/` com todos os workflows.

## Uso

### Sintaxe Básica

```bash
node upload-n8n-workflows.js <caminho-dos-workflows> [opções]
```

### Exemplos

#### 1. Simulação (Dry Run) - RECOMENDADO PRIMEIRO

```bash
node upload-n8n-workflows.js ./n8n-workflows-2025-09-30/ --dry-run
```

Isso vai:
- Analisar dependências
- Calcular ordem de upload
- Simular criação de workflows
- Gerar relatório
- **SEM fazer alterações no servidor**

#### 2. Migração Real

```bash
node upload-n8n-workflows.js ./n8n-workflows-2025-09-30/
```

#### 3. Filtrar por Tag

```bash
node upload-n8n-workflows.js ./n8n-workflows-2025-09-30/ --tag=jana
```

#### 4. Ativar Workflows Após Upload

```bash
node upload-n8n-workflows.js ./n8n-workflows-2025-09-30/ --activate
```

#### 5. Não Pular Workflows Existentes

```bash
node upload-n8n-workflows.js ./n8n-workflows-2025-09-30/ --skip-existing=false
```

### Opções Disponíveis

| Opção | Descrição | Padrão |
|-------|-----------|--------|
| `--dry-run` | Simula migração sem fazer alterações | `false` |
| `--skip-existing` | Pula workflows que já existem no destino | `true` |
| `--activate` | Ativa workflows após criação | `false` |
| `--no-verify` | Pula verificação de integridade | `false` |
| `--tag=<tag>` | Filtra workflows por tag | - |
| `--log-level=<level>` | Nível de log (debug/info/warn/error) | `info` |
| `--no-report` | Não salva relatório JSON | `false` |

## Fluxo de Execução

### Exemplo de Saída

```
==================================================
N8N WORKFLOW MIGRATION TOOL
==================================================
Configuração:
  Origem: ./n8n-workflows-2025-09-30/
  Modo: REAL
  Pular existentes: Sim
  Ativar workflows: Não
  Verificar: Sim

==================================================
FASE 1: INICIALIZAÇÃO
==================================================
[2025-09-30T12:00:00.000Z] ℹ️  Carregando configurações...
[2025-09-30T12:00:00.001Z] ✅ Autenticação configurada
[2025-09-30T12:00:00.002Z] ℹ️  URL: https://destino.n8n.cloud/
[2025-09-30T12:00:00.003Z] ℹ️  Método: ApiKeyStrategy

[2025-09-30T12:00:00.004Z] 📍 Carregando workflows
[2025-09-30T12:00:00.100Z] ℹ️  Carregando workflows do diretório: ./n8n-workflows-2025-09-30/
[2025-09-30T12:00:00.150Z] ℹ️  Encontrados 19 arquivos JSON
[2025-09-30T12:00:00.200Z] ✅ 19 workflows carregados com sucesso
[2025-09-30T12:00:00.201Z] ℹ️  Ativos: 5 | Inativos: 14
[2025-09-30T12:00:00.202Z] ℹ️  Tags: jana

==================================================
FASE 2: ANÁLISE DE DEPENDÊNCIAS
==================================================
[2025-09-30T12:00:00.300Z] 📍 Analisando dependências entre workflows
[2025-09-30T12:00:00.301Z] ℹ️  Fase 1: Indexando workflows...
[2025-09-30T12:00:00.310Z] ✅ 19 workflows indexados
[2025-09-30T12:00:00.311Z] ℹ️  Fase 2: Extraindo dependências...
[2025-09-30T12:00:00.350Z] ✅ 45 dependências encontradas
[2025-09-30T12:00:00.351Z] ℹ️  Fase 3: Calculando ordem de upload...
[2025-09-30T12:00:00.360Z] ✅ Ordem de upload calculada com sucesso
[2025-09-30T12:00:00.361Z] ℹ️  Workflows sem dependências: 8
[2025-09-30T12:00:00.362Z] ℹ️  Média de dependências por workflow: 2.37
[2025-09-30T12:00:00.363Z] ℹ️  Máximo de dependências: 5

==================================================
FASE 3: UPLOAD SEQUENCIAL
==================================================
[2025-09-30T12:00:00.400Z] 📍 Iniciando upload de workflows
[2025-09-30T12:00:00.500Z] 📥 [1/19] Processando: (INS-BCO-001) fabrica-insere-banco
[2025-09-30T12:00:00.700Z] ✅   Criado: (INS-BCO-001) fabrica-insere-banco (ABC123xyz)
[2025-09-30T12:00:01.200Z] 📥 [2/19] Processando: (BCO-CON-001) normalizador-banco-consultas
...
[2025-09-30T12:00:10.000Z] ✅ Upload concluído
[2025-09-30T12:00:10.001Z] ℹ️  Total processados: 19
[2025-09-30T12:00:10.002Z] ℹ️  Sucesso: 19
[2025-09-30T12:00:10.003Z] ℹ️  Taxa de sucesso: 100.00%

==================================================
FASE 4: ATUALIZAÇÃO DE REFERÊNCIAS
==================================================
[2025-09-30T12:00:10.100Z] 📍 Atualizando referências de workflows
[2025-09-30T12:00:10.200Z] 📥 [1/19] Atualizando: (INS-BCO-001) fabrica-insere-banco
...
[2025-09-30T12:00:15.000Z] ✅ Referências atualizadas com sucesso
[2025-09-30T12:00:15.001Z] ℹ️  Workflows processados: 19
[2025-09-30T12:00:15.002Z] ℹ️  Nodes processados: 234
[2025-09-30T12:00:15.003Z] ℹ️  Referências atualizadas: 45
[2025-09-30T12:00:15.004Z] ℹ️  Taxa de sucesso: 100.00%

==================================================
FASE 5: VERIFICAÇÃO DE INTEGRIDADE
==================================================
[2025-09-30T12:00:15.100Z] 📍 Verificando integridade da migração
[2025-09-30T12:00:15.200Z] ℹ️  Check 1: Verificando contagem de workflows...
[2025-09-30T12:00:15.300Z] ✅   19/19 workflows criados
[2025-09-30T12:00:15.400Z] ℹ️  Check 2: Verificando criação de workflows...
[2025-09-30T12:00:15.500Z] ✅   Todos os 19 workflows foram criados
[2025-09-30T12:00:15.600Z] ℹ️  Check 3: Verificando integridade de referências...
[2025-09-30T12:00:20.000Z] ✅   Todas as referências estão íntegras
[2025-09-30T12:00:20.100Z] ℹ️  Check 4: Verificando integridade de nodes...
[2025-09-30T12:00:20.200Z] ✅   Contagem de nodes está correta em todos os workflows

==================================================
RESULTADO DA VERIFICAÇÃO
==================================================
[2025-09-30T12:00:20.300Z] ✅ Status: PASSED
[2025-09-30T12:00:20.301Z] ✅ Checks: 4/4 passaram
[2025-09-30T12:00:20.302Z] ✅ Migração concluída com sucesso! ZERO elos perdidos.
==================================================

[2025-09-30T12:00:20.400Z] ✅ Relatório salvo: migration-report-2025-09-30T12-00-20-400Z.json

==================================================
RESUMO FINAL
==================================================
Duração total: 20s
Workflows processados: 19

Migração concluída com sucesso!
```

## Relatório de Migração

Após a execução, um relatório JSON é gerado com:

```json
{
  "timestamp": "2025-09-30T12:00:20.400Z",
  "config": {
    "sourcePath": "./n8n-workflows-2025-09-30/",
    "dryRun": false,
    "skipExisting": true,
    ...
  },
  "duration": "20s",
  "upload": {
    "statistics": {
      "attempted": 19,
      "succeeded": 19,
      "failed": 0,
      "skipped": 0,
      "successRate": "100.00%"
    },
    "results": {
      "success": [...],
      "failed": [],
      "skipped": []
    }
  },
  "mappings": {
    "mappings": [
      {
        "name": "(INS-BCO-001) fabrica-insere-banco",
        "oldId": "BrobqIHcPHBeCUPN",
        "newId": "ABC123xyz"
      },
      ...
    ]
  },
  "graph": {
    "nodes": [...],
    "edges": [...],
    "statistics": {...}
  }
}
```

## Como Funciona a Busca por Nome

O sistema implementa a estratégia exata do código de referência:

```javascript
// 1. Mapeamento por NOME (PRIORIDADE)
const mapNomeParaIdNovo = {};
for (const workflow of workflowsCriados) {
  mapNomeParaIdNovo[workflow.name] = workflow.id;
}

// 2. Atualização recursiva
function atualizarWorkflowIds(obj) {
  if (obj.workflowId && obj.workflowId.cachedResultName) {
    const nomeWorkflow = obj.workflowId.cachedResultName;
    const idNovo = mapNomeParaIdNovo[nomeWorkflow];
    if (idNovo) {
      obj.workflowId.value = idNovo; // ATUALIZA O ID
    }
  }
  // Recursão em todos os objetos/arrays...
}
```

## Tratamento de Erros

### Ciclos de Dependências

Se detectado ciclo, o sistema:
1. Alerta o usuário
2. Pede confirmação para continuar
3. Cria workflows (mas referências podem estar incorretas)

### Workflows Duplicados

Se `--skip-existing=true` (padrão), workflows que já existem são pulados.

### Referências Quebradas

A Fase 5 detecta e reporta qualquer referência quebrada.

## Troubleshooting

### Erro: "Credenciais inválidas"

Configure `N8N_API_KEY` ou `N8N_USERNAME` + `N8N_PASSWORD` no `.env`.

### Erro: "Nenhum workflow encontrado"

Verifique se o caminho está correto e contém arquivos `.json`.

### Verificação falhou

Execute com `--log-level=debug` para mais detalhes:

```bash
node upload-n8n-workflows.js ./workflows --log-level=debug
```

## Contribuindo

O código está organizado de forma modular:

- **Models**: Estruturas de dados (grafo)
- **Utils**: Utilitários (loader, mapper)
- **Services**: Lógica de negócio (analyzer, updater, verifier)

## Licença

Este projeto segue a mesma licença do repositório principal.
