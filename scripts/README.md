# 🛠️ Scripts - Docs-Jana

Este diretório contém scripts utilitários para testes, administração e manutenção do projeto.

---

## 📁 Estrutura

```
scripts/
├── test/          # Scripts de teste e validação
├── admin/         # Scripts administrativos (⚠️ use com cuidado)
└── README.md      # Esta documentação
```

---

## 🧪 Test Scripts (`/test`)

Scripts para testar funcionalidades e validar comportamento.

### `check-all-settings.js`
Verifica todas as configurações do sistema.

```bash
node scripts/test/check-all-settings.js
```

**Propósito**: Validar que todas as variáveis de ambiente e configurações estão corretas.

---

### `check-fields.js`
Verifica campos específicos em workflows.

```bash
node scripts/test/check-fields.js
```

**Propósito**: Validar estrutura de dados de workflows N8N.

---

### `test-cleaning.js`
Testa limpeza de dados em workflows.

```bash
node scripts/test/test-cleaning.js
```

**Propósito**: Validar que a limpeza de payloads funciona corretamente.

---

### `test-folder-filter.js`
Testa filtro de pastas no upload.

```bash
node scripts/test/test-folder-filter.js
```

**Propósito**: Validar funcionalidade de --folder flag.

---

### `test-payload-cleaning.js`
Testa limpeza de payloads antes do upload.

```bash
node scripts/test/test-payload-cleaning.js
```

**Propósito**: Garantir que dados sensíveis são removidos antes do upload.

---

### `test-tag-operations.js`
Testa operações de tags (criar, listar, associar).

```bash
node scripts/test/test-tag-operations.js
```

**Propósito**: Validar sistema de tags do N8N.

**Requer**: `.env` configurado com N8N_API_KEY

---

### `test-upload-history.js`
Testa sistema de histórico de uploads.

```bash
node scripts/test/test-upload-history.js
```

**Propósito**: Validar que `.upload-history.json` é criado e atualizado corretamente.

---

### `test-workflow-id-preservation.js`
Testa preservação de IDs durante upload.

```bash
node scripts/test/test-workflow-id-preservation.js
```

**Propósito**: Validar que IDs de workflows são mapeados corretamente.

**Requer**: `.env` configurado

---

## ⚠️ Admin Scripts (`/admin`)

**ATENÇÃO**: Scripts administrativos que fazem modificações no sistema. Use com cuidado!

### `update-workflow-names.js` ⭐ NEW
Atualiza nomes de workflows em massa usando mapeamento.

```bash
# Dry-run (recomendado primeiro)
node scripts/admin/update-workflow-names.js --dry-run

# Executar atualização
node scripts/admin/update-workflow-names.js

# Com logs verbose
node scripts/admin/update-workflow-names.js --verbose
```

**Propósito**: Renomear workflows na instância SOURCE conforme `rename-mapping-atualizado.json`.

**Requer**:
- `.env` configurado com `SOURCE_N8N_URL` e `SOURCE_N8N_API_KEY`
- Arquivo `rename-mapping-atualizado.json` na raiz do projeto

**Features**:
- ✅ Modo dry-run para testar sem modificar
- ✅ Rate limiting automático (100ms entre requests)
- ✅ Log de erros detalhado (`update-workflow-names-errors.log`)
- ✅ Progress tracking em tempo real
- ✅ Estatísticas ao final (success/skipped/failed)
- ✅ Skip automático de workflows que não mudaram

**Documentação**: [UPDATE_WORKFLOW_NAMES.md](../docs/technical/UPDATE_WORKFLOW_NAMES.md)

**⚠️ Recomendações**:
1. SEMPRE executar `--dry-run` primeiro
2. Fazer backup antes: `node cli.js n8n:download --source --output ./backup`
3. Verificar log de erros após execução
4. Testar em ambiente não-produtivo primeiro

---

### `cleanup-duplicates.js`
Remove workflows duplicados no N8N.

```bash
node scripts/admin/cleanup-duplicates.js
```

**⚠️ WARNING**: Este script **deleta workflows** permanentemente!

**Propósito**: Limpar workflows duplicados por nome.

**Requer**:
- `.env` configurado com N8N_API_KEY
- Confirmação manual antes de executar

**Recomendação**: Fazer backup antes de executar!

---

### `delete-all-workflows.js`
**🚨 DANGER ZONE 🚨** - Deleta TODOS os workflows do N8N.

```bash
node scripts/admin/delete-all-workflows.js
```

**⚠️ CRITICAL WARNING**: Este script **deleta TODOS os workflows** sem confirmação!

**Propósito**: Limpar completamente instância N8N (útil para testes).

**Requer**: `.env` configurado

**⚠️ NÃO USE EM PRODUÇÃO!**

**Recomendação**:
- Apenas para ambientes de teste/desenvolvimento
- SEMPRE fazer backup completo antes
- Considere usar soft delete ou archive ao invés de delete permanente

---

### `unarchive-direct.js`
Desarquiva workflows diretamente via API.

```bash
node scripts/admin/unarchive-direct.js
```

**Propósito**: Reativar workflows arquivados usando chamada direta à API.

**Requer**: `.env` configurado

---

### `unarchive-workflows.js`
Desarquiva workflows usando serviço.

```bash
node scripts/admin/unarchive-workflows.js
```

**Propósito**: Reativar workflows arquivados usando WorkflowService.

**Requer**: `.env` configurado

---

## 📋 Pré-requisitos

### Para todos os scripts:

1. **Node.js** >= 14.0.0
2. **Dependências instaladas**:
   ```bash
   pnpm install
   ```

### Para scripts que acessam N8N:

3. **Arquivo `.env`** configurado:
   ```bash
   cp .env.example .env
   # Editar .env com suas credenciais
   ```

4. **Variáveis necessárias**:
   ```env
   N8N_BASE_URL=https://seu-n8n.com
   N8N_API_KEY=sua-api-key
   ```

---

## 🐛 Troubleshooting

### Erro: "Cannot find module"

```bash
# Instalar dependências
pnpm install

# Verificar que está na raiz do projeto
pwd
# Deve ser: .../docs-jana
```

### Erro: "Configuration Error: N8N_BASE_URL is required"

```bash
# Criar/verificar arquivo .env
cat .env

# Deve conter:
# N8N_BASE_URL=https://...
# N8N_API_KEY=...
```

### Erro: "ECONNREFUSED" ou timeout

- Verificar que N8N está rodando
- Verificar URL no `.env` está correta
- Verificar firewall/rede
- Testar acesso manual: `curl $N8N_BASE_URL/api/v1/workflows`

### Erro: "Unauthorized" ou "403"

- Verificar que N8N_API_KEY está correta
- Verificar que API key tem permissões necessárias
- Regenerar API key se necessário

---

## 🔒 Segurança

### Boas Práticas:

1. **NUNCA commitar `.env`** (já está no .gitignore)
2. **Fazer backup** antes de scripts admin
3. **Testar em ambiente de dev** primeiro
4. **Usar --dry-run** quando disponível
5. **Revisar código** de scripts admin antes de executar

### Scripts Perigosos:

🚨 **EXTREMO CUIDADO**:
- `delete-all-workflows.js` - Deleta TUDO

⚠️ **CUIDADO**:
- `cleanup-duplicates.js` - Deleta workflows
- `update-workflow-names.js` - Modifica nomes de workflows (use --dry-run primeiro!)
- `unarchive-*.js` - Modifica estado de workflows

✅ **SEGURO**:
- Todos os scripts em `/test` - Apenas leitura/validação

---

## 📚 Documentação Relacionada

- [README Principal](../README.md) - Documentação geral do projeto
- [CLI Documentation](../LEARNING-CLI.md) - Como funciona a CLI
- [Architecture](../docs/architecture/) - Documentação de arquitetura
- [Technical Docs](../docs/technical/) - Documentação técnica detalhada

---

## 💡 Dicas

### Executar com Verbose Logging

```bash
DEBUG=* node scripts/test/test-tag-operations.js
```

### Dry Run (quando disponível)

```bash
node scripts/admin/cleanup-duplicates.js --dry-run
```

### Testar Conexão N8N

```bash
node -e "
const ConfigManager = require('./src/utils/config-manager');
const config = ConfigManager.loadN8NConfig();
console.log('✅ Config OK:', config.baseUrl);
"
```

---

## 🤝 Contribuindo

Ao adicionar novos scripts:

1. Coloque em `/test` ou `/admin` conforme apropriado
2. Adicione documentação neste README
3. Inclua warnings se script for destrutivo
4. Adicione verificações de segurança (confirmações)
5. Teste em ambiente isolado primeiro

---

**Última atualização**: 2025-10-01
**Mantido por**: Jana Team
