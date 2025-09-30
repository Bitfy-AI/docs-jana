# N8N Workflow Tools

Conjunto completo de ferramentas para gerenciamento de workflows n8n, incluindo backup, migração e documentação automática.

## Ferramentas Disponíveis

1. **download-n8n-workflows.js** - Backup de workflows
2. **upload-n8n-workflows.js** - Migração inteligente de workflows (NOVO!)
3. **generate-docs.js** - Geração de documentação
4. **generate-sql.js** - Geração de scripts SQL

## Sistema de Migração de Workflows (NOVO!)

Sistema completo para migração de workflows n8n entre instâncias, **garantindo ZERO elos perdidos**.

### Características

- Análise automática de dependências entre workflows
- Ordenação topológica para upload na ordem correta
- Mapeamento inteligente de IDs (prioridade por nome)
- Atualização recursiva de referências
- Verificação de integridade pós-migração
- Modo dry-run para simulação
- Relatórios detalhados em JSON

### Uso Rápido

```bash
# 1. Configure credenciais no .env
cp .env.example .env
# Edite .env com suas credenciais

# 2. Teste a migração (simulação)
node upload-n8n-workflows.js ./n8n-workflows-2025-09-30/ --dry-run

# 3. Execute a migração real
node upload-n8n-workflows.js ./n8n-workflows-2025-09-30/
```

### Documentação Completa

Veja [MIGRATION-GUIDE.md](./MIGRATION-GUIDE.md) para documentação detalhada da migração.

---

## Download de Workflows (Backup)

Script para baixar todos os workflows (ou workflows filtrados por tag) do n8n via API.

## 📋 Pré-requisitos

- Node.js instalado
- Acesso à API do n8n (URL e credenciais)

## 🚀 Como Usar

### Opção 1: Via linha de comando

```bash
node download-n8n-workflows.js <N8N_URL> <API_KEY> [TAG]
```

**Exemplos:**

```bash
# Baixar todos os workflows
node download-n8n-workflows.js https://seu-n8n.com n8n_api_xxxxx

# Baixar apenas workflows com a tag "producao"
node download-n8n-workflows.js https://seu-n8n.com n8n_api_xxxxx producao
```

### Opção 2: Via variáveis de ambiente

```bash
# Com API Key
N8N_URL=https://seu-n8n.com N8N_API_KEY=sua-chave node download-n8n-workflows.js

# Com usuário e senha
N8N_URL=https://seu-n8n.com N8N_USERNAME=admin N8N_PASSWORD=senha123 node download-n8n-workflows.js

# Com filtro por tag
N8N_URL=https://seu-n8n.com N8N_API_KEY=sua-chave N8N_TAG=producao node download-n8n-workflows.js
```

## 🏷️ Filtrar por Tag

Para baixar apenas workflows com uma tag específica, adicione o nome da tag como último argumento:

```bash
node download-n8n-workflows.js https://seu-n8n.com sua-api-key producao
```

Ou via variável de ambiente:

```bash
N8N_TAG=producao node download-n8n-workflows.js
```

## 📁 Saída

O script cria uma pasta com timestamp no formato:
```
n8n-workflows-YYYY-MM-DDTHH-MM-SS/
  ├── workflow-name-1-123.json
  ├── workflow-name-2-456.json
  └── _backup-log.json
```

Cada arquivo contém:
- **workflow-*.json**: Dados completos do workflow em JSON
- **_backup-log.json**: Log do backup com informações de sucesso/falha

## 🔑 Autenticação

O script suporta duas formas de autenticação:

1. **API Key** (recomendado):
   - Vá em Settings → API no n8n
   - Crie uma API Key
   - Use via `N8N_API_KEY` ou segundo argumento

2. **Usuário e Senha**:
   - Use `N8N_USERNAME` e `N8N_PASSWORD`

## 🔧 Variáveis de Ambiente

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `N8N_URL` | URL do n8n (ex: https://n8n.exemplo.com) | Sim |
| `N8N_API_KEY` | API Key do n8n | Sim* |
| `N8N_USERNAME` | Usuário do n8n | Sim* |
| `N8N_PASSWORD` | Senha do n8n | Sim* |
| `N8N_TAG` | Tag para filtrar workflows (opcional) | Não |

*Forneça API_KEY ou USERNAME+PASSWORD

## ✨ Recursos

- ✅ Baixa todos os workflows do n8n
- ✅ Filtra por tag específica (opcional)
- ✅ Suporta autenticação via API Key ou Basic Auth
- ✅ Cria backup organizado por timestamp
- ✅ Gera log detalhado do processo
- ✅ Sanitiza nomes de arquivos
- ✅ Tratamento de erros individual por workflow

## 📝 Exemplo de Log

```json
{
  "success": [
    {
      "id": "1",
      "name": "Workflow Produção",
      "file": "Workflow_Producao-1.json",
      "tags": ["producao"]
    }
  ],
  "failed": [],
  "timestamp": "2025-09-30T10:30:00.000Z",
  "n8nUrl": "https://seu-n8n.com",
  "tag": "producao"
}
```