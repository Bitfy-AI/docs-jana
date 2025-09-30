# N8N Workflow Tools

Conjunto completo de ferramentas para gerenciamento de workflows n8n, incluindo backup, migração e documentação automática.

## 🚀 Ferramentas Disponíveis

### 1. 📥 Download de Workflows (Backup)
**Arquivo:** `download-n8n-workflows.js`

Baixa workflows do n8n via API, com suporte para filtros por tag e autenticação flexível.

### 2. 📤 Upload/Migração de Workflows
**Arquivo:** `upload-n8n-workflows.js`

Sistema completo de migração de workflows entre instâncias n8n, com análise de dependências e garantia de zero elos perdidos.

### 3. 📝 Geração de Documentação
**Arquivo:** `generate-docs.js`

Gera documentação markdown automática a partir de workflows n8n, incluindo extração de sticky notes e análise de qualidade.

### 4. 🧪 Teste de Migração
**Arquivo:** `test-migration.js`

Valida o sistema de migração sem fazer upload real, executando 6 testes automatizados.

---

## 🎯 Início Rápido

### Pré-requisitos

- Node.js 14+ instalado
- Acesso à API do n8n (URL + credenciais)
- Instância n8n de origem e/ou destino

### Instalação

```bash
# Clone o repositório
git clone https://github.com/matheusmaiberg/docs-jana.git
cd docs-jana

# Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais
```

### Exemplos de Uso

#### 1. Fazer Backup de Workflows

```bash
# Baixar todos os workflows
node download-n8n-workflows.js

# Baixar apenas workflows com tag específica
node download-n8n-workflows.js --tag=producao
```

#### 2. Migrar Workflows Entre Instâncias

```bash
# Teste primeiro (dry-run)
node upload-n8n-workflows.js ./n8n-workflows-2025-09-30/ --dry-run

# Execute a migração real
node upload-n8n-workflows.js ./n8n-workflows-2025-09-30/

# Com filtro por tag e ativação automática
node upload-n8n-workflows.js ./workflows --tag=jana --activate
```

#### 3. Gerar Documentação

```bash
# Gerar documentação de workflows
node generate-docs.js ./n8n-workflows-2025-09-30/
```

---

## 📚 Sistema de Migração de Workflows

Sistema completo para migração de workflows n8n entre instâncias, **garantindo ZERO elos perdidos**.

### ✨ Características Principais

- 🔍 **Análise automática de dependências** entre workflows
- 📊 **Ordenação topológica** para upload na ordem correta
- 🎯 **Mapeamento inteligente de IDs** (prioridade por nome)
- 🔄 **Atualização recursiva** de todas as referências
- ✅ **Verificação de integridade** pós-migração (4 checks)
- 🧪 **Modo dry-run** para simulação segura
- 📋 **Relatórios detalhados** em JSON

### 🏗️ Arquitetura em 5 Fases

1. **Inicialização** - Carrega configurações e workflows
2. **Análise de Dependências** - Constrói grafo e calcula ordem
3. **Upload Sequencial** - Cria workflows respeitando dependências
4. **Atualização de Referências** - Atualiza IDs usando mapeamento por nome
5. **Verificação** - Valida integridade completa

### 📖 Documentação Detalhada

- [MIGRATION-GUIDE.md](./MIGRATION-GUIDE.md) - Guia completo de migração
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitetura técnica detalhada
- [EXAMPLES.md](./EXAMPLES.md) - Exemplos práticos e troubleshooting
- [IMPLEMENTATION-SUMMARY.md](./IMPLEMENTATION-SUMMARY.md) - Resumo da implementação

---

## 📥 Referência: Download de Workflows

### Uso via Linha de Comando

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

### Uso via Variáveis de Ambiente (.env)

Configure o arquivo `.env`:
```bash
N8N_URL=https://seu-n8n.com
N8N_API_KEY=sua-chave
N8N_TAG=producao  # opcional
```

Execute:
```bash
node download-n8n-workflows.js
```

### Saída

O script cria uma pasta com timestamp no formato:
```
n8n-workflows-YYYY-MM-DDTHH-MM-SS/
  ├── workflow-name-1-123.json
  ├── workflow-name-2-456.json
  └── _backup-log.json
```

- **workflow-*.json**: Dados completos do workflow
- **_backup-log.json**: Log com estatísticas de sucesso/falha

### Autenticação Suportada

- **API Key** (recomendado): `N8N_API_KEY`
- **Basic Auth**: `N8N_USERNAME` + `N8N_PASSWORD`

---

## 🔧 Variáveis de Ambiente

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `N8N_URL` | URL da instância n8n | Sim |
| `N8N_API_KEY` | API Key do n8n | Condicional* |
| `N8N_USERNAME` | Usuário do n8n | Condicional* |
| `N8N_PASSWORD` | Senha do n8n | Condicional* |
| `N8N_TAG` | Filtro por tag (opcional) | Não |
| `LOG_LEVEL` | Nível de log (debug/info/warn/error) | Não |

*Forneça `API_KEY` ou `USERNAME`+`PASSWORD`

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'feat: adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

## 📧 Contato

- GitHub: [@matheusmaiberg](https://github.com/matheusmaiberg)
- Repositório: [docs-jana](https://github.com/matheusmaiberg/docs-jana)