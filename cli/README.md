# CLI Non-Interactive Mode

Este diretório contém wrappers CLI com suporte a modo não-interativo para uso em ambientes CI/CD e automação.

## Estrutura

```
cli/
├── commands/          # Wrappers de comandos
│   ├── configure.js  # Configuração não-interativa
│   └── transfer.js   # Transferência não-interativa
├── utils/            # Utilitários
│   └── non-interactive.js  # Helpers para modo não-interativo
└── README.md
```

## Modo Não-Interativo

### Flag Global

Todos os comandos suportam a flag `--non-interactive` para execução sem prompts:

```bash
docs-jana <command> --non-interactive [options]
```

### Exit Codes

- `0`: Sucesso total
- `1`: Falha parcial (alguns itens falharam)
- `2`: Falha total ou validação de configuração

### Output JSON

Em modo não-interativo, todos os comandos retornam JSON estruturado:

```json
{
  "success": true,
  "message": "Operation completed",
  "result": { ... }
}
```

## Comandos

### Configure

Configura credenciais N8N sem prompts interativos.

**Via Flags:**
```bash
docs-jana configure --non-interactive \
  --source-url=https://source.n8n.io \
  --source-api-key=key123 \
  --target-url=https://target.n8n.io \
  --target-api-key=key456
```

**Via Variáveis de Ambiente:**
```bash
SOURCE_URL=https://source.n8n.io \
SOURCE_API_KEY=key123 \
TARGET_URL=https://target.n8n.io \
TARGET_API_KEY=key456 \
docs-jana configure --non-interactive
```

**Output:**
```json
{
  "success": true,
  "message": "Configuration saved to .env",
  "config": {
    "SOURCE_URL": "https://source.n8n.io",
    "SOURCE_API_KEY": "***123",
    "TARGET_URL": "https://target.n8n.io",
    "TARGET_API_KEY": "***456"
  }
}
```

### Transfer

Transfere workflows sem wizard interativo.

**Básico:**
```bash
docs-jana transfer --non-interactive
```

**Com Opções:**
```bash
docs-jana transfer --non-interactive \
  --dry-run \
  --parallelism=5 \
  --deduplicator=standard-deduplicator \
  --validators=integrity-validator,schema-validator \
  --reporters=markdown-reporter,json-reporter \
  --filters.tags=prod,important \
  --filters.excludeTags=deprecated
```

**Flags Disponíveis:**
- `--dry-run`: Modo simulação
- `--parallelism N`: Número de transfers paralelos (default: 3)
- `--deduplicator NAME`: Deduplicator a usar (standard-deduplicator, fuzzy-deduplicator)
- `--validators LIST`: Validators separados por vírgula (default: integrity-validator)
- `--reporters LIST`: Reporters separados por vírgula (default: markdown-reporter)
- `--filters.tags LIST`: Tags a incluir
- `--filters.excludeTags LIST`: Tags a excluir

**Output:**
```json
{
  "success": true,
  "result": {
    "total": 10,
    "transferred": 8,
    "skipped": 1,
    "failed": 1,
    "duration": 45.2,
    "dryRun": false,
    "reports": [
      {
        "reporter": "markdown-reporter",
        "path": "reports/transfer-2025-10-03.md"
      }
    ]
  }
}
```

## Uso em CI/CD

### GitHub Actions

```yaml
name: Deploy Workflows

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: pnpm install

      - name: Configure N8N
        run: |
          docs-jana configure --non-interactive \
            --source-url=${{ secrets.SOURCE_URL }} \
            --source-api-key=${{ secrets.SOURCE_API_KEY }} \
            --target-url=${{ secrets.TARGET_URL }} \
            --target-api-key=${{ secrets.TARGET_API_KEY }}

      - name: Dry-run transfer
        run: |
          docs-jana transfer --non-interactive --dry-run > dry-run.json
          cat dry-run.json

      - name: Transfer workflows
        if: success()
        run: |
          docs-jana transfer --non-interactive > result.json
          cat result.json

      - name: Check exit code
        run: |
          if [ $? -ne 0 ]; then
            echo "Transfer failed or had partial failures"
            exit 1
          fi
```

### GitLab CI

```yaml
deploy:
  stage: deploy
  script:
    - pnpm install
    - docs-jana configure --non-interactive
        --source-url=$SOURCE_URL
        --source-api-key=$SOURCE_API_KEY
        --target-url=$TARGET_URL
        --target-api-key=$TARGET_API_KEY
    - docs-jana transfer --non-interactive --dry-run
    - docs-jana transfer --non-interactive
  variables:
    SOURCE_URL: $SOURCE_URL
    SOURCE_API_KEY: $SOURCE_API_KEY
    TARGET_URL: $TARGET_URL
    TARGET_API_KEY: $TARGET_API_KEY
  only:
    - main
```

### Script Bash

```bash
#!/bin/bash

set -e

# Configurar
docs-jana configure --non-interactive \
  --source-url="$SOURCE_URL" \
  --source-api-key="$SOURCE_API_KEY" \
  --target-url="$TARGET_URL" \
  --target-api-key="$TARGET_API_KEY"

# Transferir
docs-jana transfer --non-interactive \
  --filters.tags=production \
  --reporters=markdown-reporter,json-reporter

# Verificar exit code
EXIT_CODE=$?
if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ Transfer completed successfully"
elif [ $EXIT_CODE -eq 1 ]; then
  echo "⚠️ Transfer completed with partial failures"
  exit 1
else
  echo "❌ Transfer failed"
  exit 2
fi
```

## Desenvolvimento

### Helpers Disponíveis

O módulo `utils/non-interactive.js` fornece:

```javascript
const {
  isNonInteractive,  // Verifica se está em modo não-interativo
  getFlag,           // Obtém valor de flag CLI
  EXIT_CODES,        // Constantes de exit codes
  getExitCode,       // Determina exit code baseado em resultado
  outputJSON         // Output JSON estruturado
} = require('./utils/non-interactive');
```

### Adicionar Novo Comando

Para adicionar suporte não-interativo a um novo comando:

1. Criar wrapper em `cli/commands/<nome>.js`
2. Importar helpers de `utils/non-interactive.js`
3. Verificar `isNonInteractive()` no início
4. Se não-interativo:
   - Obter configurações via `getFlag()` ou env vars
   - Validar configurações obrigatórias
   - Executar lógica sem prompts
   - Retornar JSON via `outputJSON()`
   - Usar exit code apropriado
5. Se interativo:
   - Delegar para comando existente

### Exemplo de Implementação

```javascript
const { isNonInteractive, getFlag, outputJSON } = require('../utils/non-interactive');

async function myCommand() {
  const nonInteractive = isNonInteractive();

  if (nonInteractive) {
    const option = getFlag('option') || 'default';

    try {
      const result = await doSomething(option);
      outputJSON({ success: true, result });
      process.exit(0);
    } catch (err) {
      outputJSON({ success: false, error: err.message });
      process.exit(2);
    }
  }

  // Modo interativo
  const interactiveCommand = require('../../src/commands/my-command');
  await interactiveCommand.execute();
}
```

## Referências

- Task 101 em `.claude/specs/cli-architecture-refactor/tasks.md`
- Implementação: `cli/utils/non-interactive.js`
- Exemplos: `cli/commands/configure.js`, `cli/commands/transfer.js`
