# 🚀 Como Usar o CLI Docs-Jana

## Executar o CLI

```bash
node cli.js
```

Isso abre o menu interativo:

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                        📚 Docs-Jana CLI v2.0.0                        ║
║           Unified tool for documentation and workflow management          ║
╚═══════════════════════════════════════════════════════════════════════════╝

📋 MENU PRINCIPAL - Selecione uma opção:

  [1] Download workflows from N8N
  [2] Upload workflows to N8N
  [3] Download documentation from Outline
  [4] Show version information
  [5] Show help (all commands)
  [0] Exit

Digite o número da opção e pressione Enter:
```

## Testar Comandos

### Opção 4 - Ver Versão

Digite `4` e pressione Enter. Você deve ver:

```
docs-jana version 2.0.0

Platform: win32
Node.js: v20.x.x
Architecture: x64

Copyright (c) 2025 Jana Team
License: MIT
```

### Opção 5 - Ver Ajuda

Digite `5` e pressione Enter. Você verá a ajuda completa com todos os comandos.

### Opção 1 - Download N8N (com --help)

Digite `1` e pressione Enter.

**IMPORTANTE:** Como você não tem `.env` configurado, o comando vai mostrar a ajuda:

```
N8N Download Command - Download workflows from N8N

USAGE:
  docs-jana n8n:download [options]

OPTIONS:
  --source              Download from SOURCE_N8N_URL instead of N8N_URL
  --tag, -t <tag>       Filter workflows by tag
  --no-tag-filter       Ignore N8N_TAG from .env and download all workflows
  --output, -o <dir>    Output directory (default: ./n8n-workflows-TIMESTAMP)
  --help, -h            Show this help message

ENVIRONMENT VARIABLES:
  SOURCE_N8N_URL        Source N8N instance URL (for download)
  SOURCE_N8N_API_KEY    Source N8N API key (for download)
  ...
```

## Comandos Diretos (Sem Menu)

Você também pode executar comandos diretamente:

```bash
# Ver versão
node cli.js version

# Ver ajuda
node cli.js help

# Baixar workflows (mostra ajuda se não configurado)
node cli.js n8n:download

# Upload de workflows
node cli.js n8n:upload

# Download do Outline
node cli.js outline:download
```

## Configurar N8N

Para usar os comandos de N8N de verdade, crie um arquivo `.env` na raiz do projeto:

```bash
# .env
N8N_URL=https://seu-n8n.com
N8N_API_KEY=sua-api-key-aqui
N8N_TAG=production
```

Depois você pode rodar:

```bash
node cli.js n8n:download
```

E vai fazer o download real dos workflows!

## Exemplo Completo de Uso

```bash
# 1. Execute o CLI
node cli.js

# 2. Digite 1 (Download N8N)
1

# 3. Se .env não configurado, mostra ajuda
# 4. Configure o .env e tente novamente

# 5. Ou teste opção 4 (versão)
4

# Saída:
docs-jana version 2.0.0
Platform: win32
...
```

## Atalhos no Package.json

Você também pode usar os npm scripts:

```bash
# Modo interativo
npm start

# Download direto
npm run n8n:download

# Upload direto
npm run n8n:upload
```

## Troubleshooting

### "Nada acontece quando pressiono Enter"

**Solução:** Use `node cli.js` diretamente no terminal (não via npm start em alguns ambientes).

### "Unknown command: version"

**Isso foi corrigido!** O bug era que `help` e `version` não eram tratados antes de chamar `executeCommand()`. Agora funciona.

### "Enhanced menu failed"

**Isso é normal** em alguns terminais do Windows. O CLI automaticamente faz fallback para o menu simples que funciona em qualquer terminal.

## Exemplos Reais

### Download de workflows específicos

```bash
node cli.js n8n:download --tag production --output ./prod-workflows
```

### Upload com dry-run

```bash
node cli.js n8n:upload --input ./workflows --dry-run
```

### Download do Outline

```bash
node cli.js outline:download --collections "Engineering,Product"
```

---

**Conclusão:** Seu CLI está funcionando! Os comandos `help` e `version` agora executam corretamente, e os comandos N8N mostram ajuda quando não configurados (comportamento correto!).
