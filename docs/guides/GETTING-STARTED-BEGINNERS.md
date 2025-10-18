# 🚀 Guia de Início para Iniciantes - CLI docs-jana

**Bem-vindo!** Este guia irá te ensinar do zero como usar a CLI docs-jana para gerenciar workflows N8N e documentação Outline.

---

## 📋 Índice

1. [O Que É docs-jana?](#o-que-é-docs-jana)
2. [Pré-requisitos](#pré-requisitos)
3. [Instalação](#instalação)
4. [Configuração Inicial](#configuração-inicial)
5. [Seu Primeiro Comando](#seu-primeiro-comando)
6. [Comandos Essenciais](#comandos-essenciais)
7. [Fluxo de Trabalho Típico](#fluxo-de-trabalho-típico)
8. [Solução de Problemas](#solução-de-problemas)
9. [Próximos Passos](#próximos-passos)

---

## 🎯 O Que É docs-jana?

docs-jana é uma **ferramenta de linha de comando (CLI)** que ajuda você a:

- ✅ **Fazer backup** de workflows N8N
- ✅ **Migrar workflows** entre instâncias N8N diferentes
- ✅ **Validar** workflows para detectar problemas
- ✅ **Baixar documentação** do Outline
- ✅ **Automatizar** tarefas repetitivas

**Em termos simples:** É como ter um assistente que cuida dos seus workflows N8N automaticamente!

---

## 💻 Pré-requisitos

Antes de começar, você precisa ter instalado:

### 1. Node.js (JavaScript Runtime)

**O que é?** Node.js permite executar programas JavaScript no seu computador.

**Como instalar:**
```bash
# Visite: https://nodejs.org/
# Baixe a versão LTS (recomendada)
# Execute o instalador e siga as instruções
```

**Como verificar se está instalado:**
```bash
node --version
# Deve mostrar algo como: v18.17.0
```

### 2. Acesso ao N8N

Você precisa de:
- ✅ URL da sua instância N8N (ex: `https://n8n.empresa.com`)
- ✅ API Key do N8N

**Como obter a API Key:**
1. Acesse seu N8N
2. Vá em **Settings → API**
3. Clique em **Create API Key**
4. Copie a chave gerada

---

## 📦 Instalação

### Método 1: Instalação Global (Recomendado)

```bash
# Navegar até a pasta do projeto
cd path/to/docs-jana

# Instalar dependências
npm install

# Criar link global
npm link

# Testar instalação
docs-jana --version
```

### Método 2: Executar Localmente

```bash
# Navegar até a pasta do projeto
cd path/to/docs-jana

# Instalar dependências
npm install

# Executar comandos
node cli.js --version
```

**💡 Dica:** Use a instalação global para poder executar `docs-jana` de qualquer pasta!

---

## ⚙️ Configuração Inicial

### Passo 1: Criar Arquivo .env

O arquivo `.env` guarda suas configurações de forma segura.

```bash
# Na pasta do projeto
cp .env.example .env
```

### Passo 2: Editar o Arquivo .env

Abra o arquivo `.env` com um editor de texto e preencha:

```bash
# === N8N Configuration ===

# URL da sua instância N8N
N8N_URL=https://n8n.sua-empresa.com

# API Key do N8N
N8N_API_KEY=cole_sua_api_key_aqui

# (Opcional) Tag para filtrar workflows
N8N_TAG=production


# === Para Migração (Opcional) ===

# N8N Origem (de onde vem os workflows)
SOURCE_N8N_URL=https://source.n8n.com
SOURCE_N8N_API_KEY=source_api_key
SOURCE_N8N_TAG=production

# N8N Destino (para onde vão os workflows)
TARGET_N8N_URL=https://target.n8n.com
TARGET_N8N_API_KEY=target_api_key
TARGET_N8N_TAG=production


# === Outline Configuration (Opcional) ===

# URL do Outline
OUTLINE_URL=https://outline.sua-empresa.com

# Token da API do Outline
OUTLINE_API_TOKEN=cole_seu_token_aqui
```

**⚠️ IMPORTANTE:**
- Nunca compartilhe seu arquivo `.env`!
- Nunca commit o `.env` no Git!
- O arquivo `.env.example` pode ser commitado (sem dados sensíveis)

---

## 🎉 Seu Primeiro Comando

Vamos testar se tudo está funcionando!

### 1. Verificar Versão

```bash
docs-jana --version
```

**Resultado esperado:**
```
2.0.0
```

### 2. Ver Menu de Ajuda

```bash
docs-jana --help
```

**Resultado esperado:**
```
Docs-Jana CLI v2.0.0
Unified tool for documentation and workflow management

COMMANDS:
  n8n:download          Download workflows from N8N
  n8n:upload            Upload workflows to N8N
  n8n:verify            Verify migration integrity
  n8n:validate          Validate workflows for duplicate IDs
  ...
```

### 3. Menu Interativo

```bash
docs-jana
```

Use as **setas ↑↓** para navegar e **Enter** para selecionar!

**🎊 Parabéns!** Se você viu isso, sua instalação está funcionando!

---

## 🛠️ Comandos Essenciais

### 1. Download de Workflows

**O que faz?** Baixa todos os workflows do N8N para seu computador.

```bash
docs-jana n8n:download
```

**Com opções:**
```bash
# Baixar apenas workflows com tag específica
docs-jana n8n:download --tag production

# Salvar em pasta customizada
docs-jana n8n:download --output ./meus-workflows

# Usar instância SOURCE
docs-jana n8n:download --source
```

**Resultado:**
- Workflows salvos em `./n8n-workflows-[data-hora]/`
- Organizados por tags em subpastas
- Arquivo `_id-mapping.json` criado

---

### 2. Upload de Workflows

**O que faz?** Envia workflows do seu computador para o N8N.

```bash
# Upload básico
docs-jana n8n:upload --input ./n8n-workflows-2025-10-18/

# Teste sem fazer upload real (dry-run)
docs-jana n8n:upload --input ./workflows --dry-run

# Upload de pasta específica
docs-jana n8n:upload --input ./workflows --folder production
```

**⚠️ Importante:** O upload acontece em 3 fases:
1. **Fase 1:** Upload inicial
2. **Fase 2:** Remapeamento de IDs
3. **Fase 3:** Re-upload com IDs corretos

---

### 3. Validar Workflows

**O que faz?** Verifica se há IDs duplicados sem precisar baixar.

```bash
# Validação simples
docs-jana n8n:validate

# Validar com filtro
docs-jana n8n:validate --tag production

# Salvar relatório
docs-jana n8n:validate --output ./relatorio.json
```

**Resultado:**
```
✓ Validação concluída
✓ Nenhum ID duplicado encontrado
✓ 42 workflows validados
```

---

### 4. Verificar Migração

**O que faz?** Verifica se a migração foi bem-sucedida (ZERO erros).

```bash
docs-jana n8n:verify --input ./n8n-workflows-2025-10-18/
```

**Resultado:**
```
✅ MIGRATION VERIFIED SUCCESSFULLY!
   All workflows migrated with ZERO broken links.

   Total workflows: 42
   All checks passed: 4/4
```

---

## 📖 Fluxo de Trabalho Típico

### Cenário 1: Backup Simples

**Objetivo:** Fazer backup dos workflows.

```bash
# 1. Baixar workflows
docs-jana n8n:download --output ./backup-$(date +%Y%m%d)

# 2. Compactar (opcional)
zip -r backup-workflows.zip ./backup-20251018
```

---

### Cenário 2: Migração Entre Ambientes

**Objetivo:** Migrar workflows de DEV para PROD.

```bash
# 1. Validar workflows na origem (antes de baixar)
docs-jana n8n:validate --source --tag production

# 2. Baixar workflows do ambiente SOURCE
docs-jana n8n:download --source --tag production

# 3. Testar upload (dry-run)
docs-jana n8n:upload --input ./n8n-workflows-xxx --dry-run

# 4. Upload real
docs-jana n8n:upload --input ./n8n-workflows-xxx

# 5. Verificar integridade
docs-jana n8n:verify --input ./n8n-workflows-xxx

# ✅ Migração completa!
```

---

### Cenário 3: Validação Regular

**Objetivo:** Verificar workflows periodicamente.

```bash
# Validar workflows production
docs-jana n8n:validate --tag production --output ./validation-$(date +%Y%m%d).json

# Ver relatório
cat ./validation-20251018.json | jq '.duplicatesFound'
```

**💡 Dica:** Adicione isso ao cron para rodar diariamente!

```bash
# Adicionar ao crontab
crontab -e

# Executar todo dia às 9h
0 9 * * * cd /path/to/docs-jana && docs-jana n8n:validate --tag production
```

---

## 🆘 Solução de Problemas

### Problema 1: "Command not found"

**Erro:**
```
bash: docs-jana: command not found
```

**Solução:**
```bash
# Reinstalar globalmente
cd /path/to/docs-jana
npm link

# Ou usar diretamente
node cli.js --version
```

---

### Problema 2: "N8N API connection not configured"

**Erro:**
```
Error: N8N API connection not configured
```

**Solução:**
1. Verificar arquivo `.env`:
   ```bash
   cat .env | grep N8N_URL
   cat .env | grep N8N_API_KEY
   ```

2. Se vazio, preencher:
   ```bash
   # Editar .env
   nano .env

   # Adicionar
   N8N_URL=https://n8n.sua-empresa.com
   N8N_API_KEY=sua_api_key
   ```

3. Ou configurar via comando:
   ```bash
   docs-jana n8n:configure-target --url https://n8n.com --api-key abc123
   ```

---

### Problema 3: "Validation failed - duplicates found"

**Erro:**
```
❌ VALIDATION FAILED!
   Found 2 duplicate ID(s)

   📍 ID interno: (AAA-BBB-001)
```

**Solução:**
1. Ver relatório detalhado:
   ```bash
   cat .jana/logs/validation.log
   ```

2. Corrigir no N8N:
   - Acessar workflows duplicados
   - Renomear IDs únicos

3. Validar novamente:
   ```bash
   docs-jana n8n:validate
   ```

---

### Problema 4: "Exit code 1" em scripts

**Erro:**
```
Exit code: 1 (script falhou)
```

**Solução:**
```bash
# Ver o que aconteceu
docs-jana n8n:verify --input ./workflows --verbose

# Verificar logs
cat .jana/logs/errors.log
```

---

## 🎓 Próximos Passos

Agora que você conhece o básico, explore:

### 1. Documentação Avançada

- **[CLI Commands Reference](CLI-COMMANDS.md)** - Todos os comandos detalhados
- **[Services Integration](services/INTEGRATION-GUIDE.md)** - Como funciona internamente
- **[Directus Schema](DIRECTUS-SCHEMA-EXPLAINED.md)** - Entenda o banco de dados

### 2. Automatização

```bash
# Script de backup diário
#!/bin/bash
DATE=$(date +%Y%m%d)
docs-jana n8n:download --output ./backups/backup-$DATE
zip -r ./backups/backup-$DATE.zip ./backups/backup-$DATE
rm -rf ./backups/backup-$DATE
```

### 3. Integração com Git

```bash
# Versionar workflows no Git
cd ./n8n-workflows-xxx
git init
git add .
git commit -m "Backup workflows $(date +%Y-%m-%d)"
git remote add origin git@github.com:empresa/n8n-workflows.git
git push
```

### 4. CI/CD Pipeline

```yaml
# .github/workflows/validate.yml
name: Validate Workflows
on: [push]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Validate
        run: |
          docs-jana n8n:validate
```

---

## 📚 Recursos Adicionais

### Documentação

- [README Principal](../../README.md)
- [Architecture](../architecture/ARCHITECTURE.md)
- [Components](../components/VISUAL-COMPONENTS.md)

### Comunidade

- **Issues:** [GitHub Issues](https://github.com/bitfy-ai/docs-jana/issues)
- **Discussões:** [GitHub Discussions](https://github.com/bitfy-ai/docs-jana/discussions)

### Videos Tutoriais

- 🎥 [Como Instalar docs-jana](link)
- 🎥 [Primeira Migração de Workflows](link)
- 🎥 [Automação com docs-jana](link)

---

## ✅ Checklist do Iniciante

Antes de considerar que dominou o básico, verifique:

- [ ] Instalei Node.js e verifiquei a versão
- [ ] Instalei docs-jana (global ou local)
- [ ] Criei e configurei o arquivo `.env`
- [ ] Executei `docs-jana --version` com sucesso
- [ ] Executei meu primeiro `n8n:download`
- [ ] Entendi o que cada comando faz
- [ ] Sei como ver ajuda (`--help`)
- [ ] Conheço os comandos essenciais
- [ ] Sei solucionar problemas comuns
- [ ] Li a documentação avançada

**🎊 Parabéns!** Você agora é capaz de usar a CLI docs-jana com confiança!

---

## 💡 Dicas Finais

### 1. Sempre use `--help`

```bash
docs-jana n8n:download --help
```

### 2. Teste com `--dry-run` primeiro

```bash
docs-jana n8n:upload --input ./workflows --dry-run
```

### 3. Faça backups regularmente

```bash
# Todo domingo às 2h
0 2 * * 0 docs-jana n8n:download
```

### 4. Mantenha `.env` seguro

```bash
# Adicionar ao .gitignore
echo ".env" >> .gitignore
```

### 5. Valide antes de migrar

```bash
# Sempre validar primeiro!
docs-jana n8n:validate --source
docs-jana n8n:download --source
docs-jana n8n:upload --input ./workflows
docs-jana n8n:verify --input ./workflows
```

---

## 🤝 Precisa de Ajuda?

- **Bug?** [Abra uma issue](https://github.com/bitfy-ai/docs-jana/issues)
- **Pergunta?** [Inicie uma discussão](https://github.com/bitfy-ai/docs-jana/discussions)
- **Sugestão?** [Crie um PR](https://github.com/bitfy-ai/docs-jana/pulls)

---

**Última Atualização:** 2025-10-18
**Versão da CLI:** 2.0.0
**Versão do Guia:** 1.0

**Bom trabalho com a CLI docs-jana!** 🚀
