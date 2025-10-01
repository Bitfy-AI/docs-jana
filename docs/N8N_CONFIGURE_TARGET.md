# N8N Configure Target - Nova Feature

## Resumo

Nova opção adicionada ao menu interativo para configurar o n8n de destino (onde os workflows serão enviados).

## O que foi implementado

### 1. Novo Comando: `n8n:configure-target`

**Localização**: `src/commands/n8n-configure-target.js`

**Funcionalidades**:
- ✅ Prompt interativo para URL e API Key do n8n de destino
- ✅ Validação da URL (formato correto)
- ✅ Validação da API Key (tamanho mínimo)
- ✅ Teste de conexão opcional antes de salvar
- ✅ Salvamento automático no arquivo `.env`
- ✅ Atualização de `TARGET_N8N_URL` e `TARGET_N8N_API_KEY`
- ✅ Mensagens amigáveis com cores (via chalk)
- ✅ Spinners para feedback visual (via ora)
- ✅ Tratamento de erros gracioso

### 2. Nova Opção no Menu Interativo

**Localização**: `src/ui/menu/config/menu-options.js`

**Detalhes da opção**:
```javascript
{
  key: '5',
  command: 'n8n:configure-target',
  label: 'Configure Target N8N Instance',
  description: 'Configure the target N8N instance where workflows will be uploaded. Enter URL and API key, test connection, and save to .env file. This is required before uploading workflows.',
  icon: '🎯',
  category: 'action',
  shortcut: 't',
  preview: {
    shellCommand: 'Configure TARGET_N8N_URL and TARGET_N8N_API_KEY',
    affectedPaths: ['.env file will be updated'],
    estimatedDuration: 2,
    warning: '⚠️  API keys will be stored in .env file. Keep this file secure and never commit it to version control.'
  }
}
```

### 3. Registro do Comando

**Localizações atualizadas**:
- ✅ `cli.js` - Adicionado ao COMMANDS registry
- ✅ `index.js` - Adicionado ao commandMap do CommandOrchestrator

**Aliases disponíveis**:
- `n8n:config`
- `config:n8n`

## Como Usar

### Via Menu Interativo

```bash
# Lançar menu interativo
node cli.js

# Ou forçar modo interativo
node cli.js --interactive
```

Depois selecionar a opção **5** ou pressionar **t** (shortcut).

### Via Linha de Comando

```bash
# Executar diretamente
node cli.js n8n:configure-target

# Ver ajuda
node cli.js n8n:configure-target --help

# Usar alias
node cli.js n8n:config
```

## Fluxo de Configuração

1. **Prompt para URL**:
   ```
   Target N8N URL: https://flows.aibotize.com
   ```
   - Valida formato de URL
   - Remove trailing slash automaticamente

2. **Prompt para API Key**:
   ```
   Target N8N API Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
   - Campo tipo password (oculto)
   - Valida tamanho mínimo (20 caracteres)

3. **Teste de Conexão (Opcional)**:
   ```
   Test connection before saving? (Y/n)
   ```
   - Testa autenticação fazendo GET em `/api/v1/workflows`
   - Mostra spinner durante teste
   - Permite salvar mesmo se falhar (com confirmação)

4. **Salvamento**:
   - Atualiza `.env` com novas variáveis
   - Preserva outras configurações existentes
   - Cria seção TARGET se não existir

5. **Confirmação**:
   ```
   ✅ Target N8N instance configured!
   You can now use the "Upload workflows to N8N" option.
   ```

## Como Obter API Key do N8N

Instruções incluídas no help:

1. Login no n8n
2. Ir em Settings → API
3. Clicar em "Create API Key"
4. Copiar a key (mostrada apenas uma vez!)

## Variáveis de Ambiente

### Antes
```env
SOURCE_N8N_URL=https://flows.nexus.bitfy.ai/
SOURCE_N8N_API_KEY=eyJ...
```

### Depois
```env
SOURCE_N8N_URL=https://flows.nexus.bitfy.ai/
SOURCE_N8N_API_KEY=eyJ...

# TARGET N8N Instance (for upload/restore)
TARGET_N8N_URL=https://flows.aibotize.com/
TARGET_N8N_API_KEY=eyJ...
```

## Segurança

✅ **Implementado**:
- API Key armazenada em `.env` (não commitado)
- Campo password oculta a key durante digitação
- Warning sobre não commitar `.env`
- Teste de conexão antes de salvar

⚠️ **Avisos**:
- API keys são sensíveis - nunca commitar
- `.env` deve estar no `.gitignore`
- Usar variáveis de ambiente em produção

## Dependências

- **inquirer**: Prompts interativos (ESM)
- **ora**: Spinners de loading (ESM)
- **chalk**: Cores no terminal (ESM)
- **node-fetch**: HTTP requests para teste de conexão (ESM)

Todas as importações ESM são feitas via dynamic `import()`.

## Testes

### Manual
```bash
# Teste completo
node cli.js n8n:configure-target

# Teste help
node cli.js n8n:configure-target --help

# Teste via menu
node cli.js --interactive
# Escolher opção 5 ou pressionar 't'
```

### Cenários Testados
- ✅ URL válida + API Key válida + Conexão OK
- ✅ URL inválida → mostra erro de validação
- ✅ API Key muito curta → mostra erro de validação
- ✅ Conexão falhando → permite salvar com confirmação
- ✅ Cancelamento (Ctrl+C) → limpa graciosamente
- ✅ Arquivo `.env` não existe → cria novo
- ✅ Arquivo `.env` existe → atualiza variáveis existentes

## Arquivos Modificados

1. ✅ `src/ui/menu/config/menu-options.js` - Nova opção no menu
2. ✅ `cli.js` - Registro no COMMANDS
3. ✅ `index.js` - Registro no commandMap

## Arquivos Criados

1. ✅ `src/commands/n8n-configure-target.js` - Comando completo
2. ✅ `docs/N8N_CONFIGURE_TARGET.md` - Esta documentação

## Próximos Passos (Opcional)

- [ ] Adicionar teste automatizado do comando
- [ ] Adicionar suporte para configurar SOURCE também
- [ ] Adicionar validação de API Key format (JWT structure)
- [ ] Adicionar opção para editar configuração existente
- [ ] Adicionar suporte para múltiplos targets (target1, target2...)

## Screenshots (Exemplo de Uso)

```
🎯 Configure Target N8N Instance

This will configure where workflows will be uploaded.

? Target N8N URL: https://flows.aibotize.com
? Target N8N API Key: **********************************
? Test connection before saving? Yes
✔ Connection successful!
✔ Configuration saved successfully!

📋 Configuration Summary:
──────────────────────────────────────────────────────
Target URL: https://flows.aibotize.com
API Key: ********************8f9a1b2c
──────────────────────────────────────────────────────

✅ Target N8N instance configured!
You can now use the "Upload workflows to N8N" option.
```

## Notas de Implementação

### Padrão Arquitetural

Segue o padrão existente do projeto:
- Classe estática `N8NConfigureTargetCommand` com método `execute(args)`
- Classe interna `N8NConfigureTargetApp` para lógica de negócio
- Integração com orchestration layer via `index.js`
- Suporte a flags `--help` e `-h`

### ESM vs CommonJS

O comando usa dynamic imports para módulos ESM:
```javascript
const inquirer = (await import('inquirer')).default;
const ora = (await import('ora')).default;
const chalk = (await import('chalk')).default;
```

Isso permite usar packages ESM-only em um projeto CommonJS.

### Error Handling

Tratamento gracioso de:
- Erros de validação (URL, API Key)
- Erros de conexão
- Erros de I/O (leitura/escrita `.env`)
- Cancelamento pelo usuário (Ctrl+C)
- Ambiente não-TTY

---

**Status**: ✅ Implementado e funcional
**Versão**: 2.0.0+
**Data**: 2025-10-02
