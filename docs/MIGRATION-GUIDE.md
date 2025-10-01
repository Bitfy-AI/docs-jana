# 📦 N8N Workflow Migration Guide

Guia completo para migrar workflows entre instâncias N8N usando docs-jana CLI.

## 🎯 Cenário: Migrar workflows da pasta "jana"

Este guia mostra como migrar workflows da instância de origem (Nexus) para a instância de destino (Refrisol).

---

## 📋 Pré-requisitos

1. **Node.js** >= 14.0.0
2. **pnpm** instalado (`npm install -g pnpm`)
3. **Credenciais** de ambas as instâncias N8N

---

## 🔧 Configuração

### 1. Clonar e instalar

```bash
git clone https://github.com/jana-team/docs-jana.git
cd docs-jana
pnpm install
```

### 2. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```bash
# Instância de ORIGEM (download)
N8N_URL_SOURCE=https://flows.nexus.bitfy.ai
N8N_API_KEY_SOURCE=sua-api-key-source

# Instância de DESTINO (upload)
N8N_URL=https://n8n.refrisol.com.br
N8N_API_KEY=sua-api-key-target

# Opcional
LOG_LEVEL=info
```

---

## 🚀 Processo de Migração

### Passo 1: Download dos workflows

Baixa todos os workflows da instância de origem, organizados por tags:

```bash
node cli.js n8n:download --source --no-tag-filter --output workflows
```

**O que acontece:**
- ✅ Conecta na instância SOURCE
- ✅ Baixa TODOS os workflows (paginação automática)
- ✅ Organiza em pastas por tag: `workflows/{tag}/`
- ✅ Salva com ID original preservado

**Estrutura criada:**
```
workflows/
├── jana/           (30 workflows)
├── aventureiro/    (3 workflows)
├── interno/        (1 workflow)
├── no-tag/         (154 workflows)
└── v1.0.1/         (6 workflows)
```

### Passo 2: Validação (Dry-Run)

Valide os workflows antes de subir:

```bash
node cli.js n8n:upload --input workflows --folder jana --dry-run
```

**O que é verificado:**
- ✅ Workflows válidos (campos obrigatórios)
- ✅ Referências entre workflows (executeWorkflow nodes)
- ✅ Workflows faltando que são referenciados
- ✅ Análise de dependências

**Exemplo de saída:**
```
📊 Validation Summary:
   Valid:   30
   Invalid: 0
   Total:   30

🔗 Workflow Reference Analysis:
   Workflows with references: 9
   Referenced workflow IDs:   23
   Total reference links:     55

⚠️  Warning: 3 referenced workflows are NOT in the upload set:
   - H2uokpNckevszoVI (OAuth token)
   - 3JAysWPS3auAr2lW (Follow Up)
   - lKQiQULidnbJUMM5 (Seleciona atendente humano)
```

### Passo 3: Upload com todas as features

Execute o upload completo:

```bash
node cli.js n8n:upload --input workflows --folder jana --sync-tags
```

**Processo de 3 Fases:**

#### Fase 1: Upload Inicial
- Faz upload de todos os 30 workflows
- N8N atribui novos IDs automaticamente
- Constrói mapeamento: `old_id → new_id`
- Salva em `workflows/jana/_id-mapping.json`

#### Fase 2: Remapeamento de IDs
- Lê todos os workflows com `executeWorkflow` nodes
- Atualiza referências com novos IDs
- Valida que todas as referências podem ser resolvidas

#### Fase 3: Re-upload
- Re-faz upload dos workflows com referências corrigidas
- Usa flag `--force` para sobrescrever
- Garante que todos os links entre workflows funcionem

#### Fase 4: Sincronização de Tags (com --sync-tags)
- Detecta tag pela pasta de origem ("jana")
- Busca ou cria a tag no N8N de destino
- Vincula todos os workflows à tag

**Exemplo de saída:**
```
📊 FINAL SUMMARY
═══════════════════════════════════════════════════════
🎯 Target N8N: https://n8n.refrisol.com.br

Phase 1 (Initial Upload):
   Created:  30
   Updated:  0
   Skipped:  0
   Failed:   0

Phase 2 & 3 (ID Remapping & Re-upload):
   References remapped:  55
   Re-upload succeeded:  9
   Re-upload failed:     0

Phase 4 (Tag Sync):
   Tags synced:  30

✅ Upload complete! All workflows uploaded successfully.
   55 workflow references were remapped and updated.
```

### Passo 4: Verificar histórico

O sistema salva automaticamente o histórico:

```bash
# Na próxima execução, você verá:
📋 Últimas ações:
✅ [01/10 14:30] jana: 30/30 workflows uploaded
```

---

## 🔄 Casos de Uso Avançados

### Upload forçado (sobrescrever existentes)

```bash
node cli.js n8n:upload --input workflows --folder jana --sync-tags --force
```

### Sem remapeamento de IDs (workflows sem referências)

```bash
node cli.js n8n:upload --input workflows --folder jana --skip-remap
```

### Upload de todas as pastas

```bash
node cli.js n8n:upload --input workflows --sync-tags
```

### Filtrar por tag específica no download

```bash
node cli.js n8n:download --source --tag jana --output workflows
```

---

## 📊 Monitoramento

### Verificar log de upload

```bash
cat .upload-history.json
```

### Verificar mapeamento de IDs

```bash
cat workflows/jana/_id-mapping.json
```

Exemplo:
```json
{
  "oldId1": "newId1",
  "oldId2": "newId2",
  ...
}
```

---

## ⚠️ Pontos de Atenção

### 1. Workflows Referenciados Faltando

Se aparecer warning sobre workflows faltando, você tem 3 opções:

**Opção A**: Fazer upload desses workflows primeiro
```bash
# Download específico
node cli.js n8n:download --source --tag oauth --output workflows
node cli.js n8n:upload --input workflows --folder oauth --sync-tags
```

**Opção B**: Ignorar e corrigir manualmente depois no N8N

**Opção C**: Os workflows já existem no destino (verificar pelo ID)

### 2. Workflows Duplicados

Se workflows já existem no destino:
- Sem `--force`: serão pulados (skipped)
- Com `--force`: serão sobrescritos

### 3. Tags Personalizadas

Se workflows já têm tags no JSON:
- Tags existentes são preservadas
- Tag da pasta é adicionada (não substitui)

---

## 🐛 Troubleshooting

### Erro: "Failed to list workflows"

**Causa**: Problema de autenticação ou URL incorreta

**Solução**:
```bash
# Testar conexão
curl -H "X-N8N-API-KEY: sua-key" "https://seu-n8n.com/api/v1/workflows?limit=1"
```

### Erro: "HTTP 400: request/body must NOT have additional properties"

**Causa**: JSON do workflow tem campos extras da API

**Solução**: Já tratado automaticamente pelo sistema de limpeza de payload

### Upload parcial (alguns falharam)

**Causa**: Problemas de rede ou workflows inválidos

**Solução**:
1. Verificar log detalhado do erro
2. Re-executar apenas os falhados (sistema continua em caso de erro)

---

## ✅ Checklist de Migração Completa

- [ ] Configurar `.env` com credenciais de origem e destino
- [ ] Fazer backup da instância de destino (precaução)
- [ ] Download: `n8n:download --source --no-tag-filter`
- [ ] Validação: `n8n:upload --folder jana --dry-run`
- [ ] Upload: `n8n:upload --folder jana --sync-tags`
- [ ] Verificar workflows no N8N de destino
- [ ] Testar execução de workflows críticos
- [ ] Validar referências entre workflows funcionando
- [ ] Documentar IDs mapeados (salvo em `_id-mapping.json`)

---

## 📞 Suporte

Em caso de problemas:
1. Ativar debug: `LOG_LEVEL=debug node cli.js ...`
2. Verificar `.upload-history.json`
3. Abrir issue no GitHub com logs relevantes

---

## 🎓 Recursos Adicionais

- [README.md](README.md) - Documentação completa
- [CHANGELOG.md](CHANGELOG.md) - Histórico de versões
- [.env.example](.env.example) - Exemplo de configuração

---

**Última atualização**: 2025-10-01
**Versão do CLI**: 2.1.0
