# N8N Transfer CLI - Guia de Uso

## Instalação

Certifique-se de que todas as dependências estão instaladas:

```bash
npm install
```

## Comandos Disponíveis

### Configure

Configura URLs e API keys do SOURCE e TARGET:

```bash
npm run n8n:configure
```

Modo não-interativo:
```bash
npm run n8n:configure -- --non-interactive --source-url=... --source-api-key=... --target-url=... --target-api-key=...
```

### Transfer

Transfere workflows do SOURCE para TARGET:

```bash
npm run n8n:transfer
```

Flags disponíveis:
- `--dry-run`: Modo simulação
- `--non-interactive`: Modo automático
- `--parallelism=N`: Número de transferências paralelas (1-10)
- `--filters.tags=tag1,tag2`: Filtrar por tags

Exemplo:
```bash
npm run n8n:transfer -- --dry-run --filters.tags=production
```

### Validate

Valida workflows sem transferir:

```bash
npm run n8n:validate
```

Exemplo:
```bash
npm run n8n:validate -- --filters.tags=production
```

### List Plugins

Lista plugins disponíveis:

```bash
npm run n8n:list-plugins
```

Filtrar por tipo:
```bash
npm run n8n:list-plugins -- --type=validator
```

### Help

Exibe help geral ou de comando específico:

```bash
npm run n8n:help
npm run n8n:help configure
```

## Atalho Geral

Execute qualquer comando via script `n8n`:

```bash
npm run n8n configure
npm run n8n transfer
npm run n8n validate
npm run n8n list-plugins
npm run n8n help
```

## Flags Globais

- `--help`, `-h`: Exibe help do comando
- `--version`, `-v`: Exibe versão
- `--non-interactive`: Modo não-interativo (CI/CD)

## Workflow Completo

1. **Configure**:
   ```bash
   npm run n8n:configure
   ```

2. **Validate** (opcional):
   ```bash
   npm run n8n:validate
   ```

3. **Dry-run** (recomendado):
   ```bash
   npm run n8n:transfer -- --dry-run
   ```

4. **Transfer real**:
   ```bash
   npm run n8n:transfer
   ```

5. **Ver relatórios**:
   - Markdown: `reports/*.md`
   - JSON: `reports/*.json`
   - CSV: `reports/*.csv`
```
