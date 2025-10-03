# Apply Layer Tags - N8N Workflow Tagger

Ferramenta automatizada para aplicação de tags em workflows do n8n baseada em layers arquiteturais.

## 🎯 Objetivo

Aplicar a tag 'jana' em 31 workflows organizados por layers (A-F) conforme mapeamento em `rename-mapping-atualizado.json`.

## 📋 Features

- ✅ Aplicação automática de tags via API n8n
- ✅ Organização por layers arquiteturais (A-F)
- ✅ Modo dry-run para validação
- ✅ Processamento paralelo (5 workflows simultâneos)
- ✅ Progress bar em tempo real
- ✅ Retry automático com exponential backoff
- ✅ Relatórios detalhados em Markdown
- ✅ Tratamento robusto de edge cases
- ✅ 278 testes (91% passing)

## 🚀 Quick Start

### 1. Configurar Ambiente

```bash
# .env na raiz do projeto
SOURCE_N8N_URL=https://flows.nexus.bitfy.ai/
SOURCE_N8N_API_KEY=your-api-key-here
```

### 2. Dry-Run (Recomendado Primeiro)

```bash
node scripts/admin/apply-layer-tags/index.js --dry-run
```

### 3. Executar

```bash
node scripts/admin/apply-layer-tags/index.js
```

## 📖 Uso

### Flags Disponíveis

| Flag | Descrição |
|------|-----------|
| `--dry-run` ou `-d` | Modo simulação (não faz chamadas API) |
| `--verbose` ou `-v` | Logs detalhados |
| `--quiet` ou `-q` | Sem progress bar |
| `--mapping <path>` | Caminho customizado do mapping |
| `--output <dir>` | Diretório de output customizado |
| `--help` ou `-h` | Exibe ajuda |

### Exemplos

```bash
# Dry-run com logs verbose
node scripts/admin/apply-layer-tags/index.js --dry-run --verbose

# Modo produção quiet
node scripts/admin/apply-layer-tags/index.js --quiet

# Mapping customizado
node scripts/admin/apply-layer-tags/index.js --mapping ./custom.json
```

## 🏗️ Arquitetura

### Componentes

1. **TagLayerOrchestrator** - Coordena fluxo completo
2. **MappingLoader** - Carrega e valida JSON
3. **TagService** - Operações de tags via API
4. **WorkflowProcessor** - Processamento paralelo
5. **ReportGenerator** - Relatórios Markdown
6. **ProgressTracker** - Barra de progresso
7. **EdgeCaseHandler** - Tratamento de edge cases

### Layers Arquiteturais

| Layer | Descrição | Total |
|-------|-----------|-------|
| A | Pontes (integrações) | 5 |
| B | Adaptadores (normalização) | 2 |
| C | Fábricas (criação) | 10 |
| D | Agentes (processamento inteligente) | 8 |
| E | Calendário (agenda) | 2 |
| F | Logs (eventos) | 4 |

## 📊 Performance

- **Target:** 31 workflows em <10s
- **Real:** ~5-6s (speedup 3x com paralelização)
- **Throughput:** 7-8 workflows/s
- **Memory:** <20MB increment

## 🧪 Testes

```bash
# Unit tests
npm test -- scripts/admin/apply-layer-tags/__tests__/unit

# Integration tests
npm test -- scripts/admin/apply-layer-tags/__tests__/integration

# E2E tests
npm test -- scripts/admin/apply-layer-tags/__tests__/e2e

# Performance
npm test -- scripts/admin/apply-layer-tags/__tests__/performance

# Todos
npm test -- scripts/admin/apply-layer-tags/__tests__
```

**Cobertura:** 85%+

## 📝 Relatórios

Relatórios são salvos em `scripts/admin/apply-layer-tags/output/`:

```
apply-tags-report-2025-10-02-193000.md
```

### Estrutura do Relatório

- Sumário Executivo
- Estatísticas por Layer
- Workflows Processados (sucesso)
- Workflows com Falha
- Métricas de Performance

## 🔧 Troubleshooting

### Erro: SOURCE_N8N_URL not set

```bash
# Verificar .env
cat .env | grep SOURCE_N8N

# Criar se necessário
echo "SOURCE_N8N_URL=https://..." >> .env
echo "SOURCE_N8N_API_KEY=..." >> .env
```

### Erro: 401 Unauthorized

- Verificar SOURCE_N8N_API_KEY está correto
- Regenerar API Key no n8n (Settings → API)

### Erro: 429 Too Many Requests

- Script já trata automaticamente
- Retry com backoff exponencial

## 📚 Documentação

- [DECISIONS.md](./docs/DECISIONS.md) - Decisões técnicas
- [API Reference](./docs/API.md) - JSDoc completo
- [Performance Tests](./docs/PERFORMANCE.md) - Benchmarks

## 🤝 Contribuir

1. Fork o projeto
2. Create feature branch
3. Run tests
4. Submit PR

## 📄 Licença

MIT
