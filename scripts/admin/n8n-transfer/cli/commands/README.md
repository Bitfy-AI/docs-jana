# N8N Transfer CLI Commands

Este diretório contém comandos CLI para o sistema de transferência N8N.

## Comandos Disponíveis

### validate

**Arquivo**: `validate.js`

**Descrição**: Valida workflows sem transferir. Permite executar validators standalone para verificar integridade e schema de workflows.

**Modo Interativo**:
```bash
node scripts/admin/n8n-transfer/cli/commands/validate.js
```

**Modo Não-Interativo**:
```bash
NON_INTERACTIVE=true node scripts/admin/n8n-transfer/cli/commands/validate.js \
  --validators=integrity-validator,schema-validator \
  --filters.tags=production
```

**Flags Disponíveis** (modo não-interativo):
- `--validators`: Lista de validators separados por vírgula (default: integrity-validator,schema-validator)
- `--filters.tags`: Tags para filtrar workflows (separadas por vírgula)
- `--non-interactive`: Força modo não-interativo

**Exit Codes**:
- `0`: Sucesso (nenhum erro encontrado)
- `1`: Erros de validação encontrados
- `2`: Erro de execução (configuração, conectividade, etc)

**Funcionalidades**:
- ✅ Validação standalone (sem transferir)
- ✅ Lista de issues com severidade (error/warning)
- ✅ Tabela formatada de issues
- ✅ Relatório JSON opcional
- ✅ Modo interativo e não-interativo
- ✅ Exit codes apropriados

**Output Exemplo** (modo não-interativo):
```json
{
  "success": true,
  "result": {
    "total": 10,
    "valid": 8,
    "invalid": 2,
    "errors": 3,
    "warnings": 1,
    "issues": [
      {
        "workflow": "Workflow Name",
        "workflowId": "123",
        "issues": [
          {
            "validator": "integrity-validator",
            "severity": "error",
            "message": "Missing required field: nodes"
          }
        ]
      }
    ]
  }
}
```

## Estrutura do Diretório

```
cli/
├── commands/          # Comandos CLI
│   ├── validate.js   # Comando de validação
│   └── README.md     # Esta documentação
├── utils/            # Utilitários
│   └── non-interactive.js  # Suporte para modo não-interativo
├── ui/               # Componentes UI
│   └── components/   # Componentes reutilizáveis
└── i18n/             # Internacionalização
    └── pt-BR.json    # Strings PT-BR
```

## Implementação

Cada comando deve:
1. Suportar modo interativo e não-interativo
2. Usar componentes UI do diretório `ui/components`
3. Usar i18n para mensagens (`cli/i18n`)
4. Retornar exit codes apropriados
5. Fornecer output JSON estruturado em modo não-interativo
