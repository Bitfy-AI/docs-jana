# 🚀 CLI de Exemplo - Importação de Workflows N8N

CLI prático que demonstra como usar o **docs-jana** para importar workflows N8N.

## 📋 Pré-requisitos

1. **Arquivo .env configurado** na raiz do projeto:

```bash
# N8N Configuration
N8N_BASE_URL=https://seu-n8n.com
N8N_API_KEY=sua-api-key-aqui
```

2. **Workflows para importar** em algum diretório (ex: `./workflows`)

## 🎯 Comandos Disponíveis

### 1. Testar Conexão

Verifica se consegue conectar ao N8N:

```bash
node examples/n8n-import/import-cli.js test
```

**Resultado esperado:**
```
🔍 Testando conexão com N8N...
✅ Configuração carregada
✅ Conexão bem-sucedida!
📊 Workflows encontrados: 45
```

### 2. Importar Workflows

Importa workflows de um diretório:

```bash
# Importar de ./workflows (padrão)
node examples/n8n-import/import-cli.js import ./workflows

# Importar de outro diretório
node examples/n8n-import/import-cli.js import /caminho/para/workflows
```

**O que acontece:**
1. ✅ Carrega configuração do .env
2. 📂 Lê arquivos JSON do diretório
3. 🔐 Autentica no N8N
4. ⬆️  Faz upload dos workflows
5. 🏷️  Sincroniza tags automaticamente
6. 📊 Mostra resultado

**Resultado esperado:**
```
🚀 Iniciando importação de workflows...
✅ Configuração carregada
📂 Lendo workflows de: ./workflows
⬆️  Uploading workflow 1/10: Email Marketing Campaign
⬆️  Uploading workflow 2/10: Customer Onboarding
...
✅ Importação concluída!
📊 Workflows importados: 10/10
```

### 3. Ajuda

```bash
node examples/n8n-import/import-cli.js help
```

## 🏗️ Arquitetura do Exemplo

Este CLI demonstra:

### 1. **Importação de Módulos Reais**
```javascript
const WorkflowUploadService = require('../../src/services/workflow-upload-service');
const HttpClient = require('../../src/utils/http-client');
const AuthFactory = require('../../src/auth/auth-factory');
```

### 2. **Dependency Injection**
```javascript
const logger = new Logger();
const authStrategy = AuthFactory.createN8NAuth(config);
const httpClient = new HttpClient(config.baseUrl, authStrategy, logger);
const uploadService = new WorkflowUploadService(httpClient, fileManager, logger);
```

### 3. **Error Handling**
```javascript
try {
  await uploadService.uploadWorkflows(options);
} catch (error) {
  log('❌ Erro:', 'red');
  process.exit(1);
}
```

### 4. **Configuração via .env**
```javascript
const config = ConfigManager.loadN8NConfig();
// Carrega N8N_BASE_URL, N8N_API_KEY, etc
```

## 🧪 Fluxo de Teste Completo

### Passo 1: Preparar Ambiente

```bash
# 1. Configurar .env
cp .env.example .env
# Editar .env com suas credenciais N8N

# 2. Ter alguns workflows para testar
mkdir -p workflows-teste
# Copiar alguns arquivos .json de workflows
```

### Passo 2: Testar Conexão

```bash
node examples/n8n-import/import-cli.js test
```

### Passo 3: Importar Workflows

```bash
node examples/n8n-import/import-cli.js import ./workflows-teste
```

### Passo 4: Verificar no N8N

Acesse sua instância N8N e confirme que os workflows foram importados.

## 🎓 O que Você Aprende

### 1. **Como usar serviços existentes**
Não precisa reescrever toda a lógica - reutiliza os services do projeto

### 2. **Factory Pattern em ação**
`AuthFactory` cria a estratégia de autenticação correta automaticamente

### 3. **Configuração centralizada**
`ConfigManager` lida com .env e validação

### 4. **Error handling robusto**
Try/catch adequado + mensagens claras para o usuário

### 5. **CLI assíncrono**
Uso de `async/await` para operações de I/O

## 🔧 Modificações Sugeridas

Experimente adicionar:

1. **Flag --dry-run**
```javascript
if (args.includes('--dry-run')) {
  options.dryRun = true;
}
```

2. **Progress bar**
```javascript
const cliProgress = require('cli-progress');
const bar = new cliProgress.SingleBar({});
```

3. **Filtro por tag**
```javascript
const tag = args.find(a => a.startsWith('--tag='));
if (tag) {
  options.folderFilter = tag.split('=')[1];
}
```

## 📚 Próximos Passos

1. **Execute o teste de conexão**
2. **Importe alguns workflows**
3. **Leia o código do [import-cli.js](import-cli.js)**
4. **Modifique e adicione features**
5. **Compare com o [CLI principal](../../cli.js)**

## 🐛 Troubleshooting

### "Configuração não encontrada"
- Verifique se o arquivo `.env` existe na raiz do projeto
- Confirme que as variáveis `N8N_BASE_URL` e `N8N_API_KEY` estão definidas

### "Diretório não encontrado"
- Certifique-se que o caminho dos workflows está correto
- Use caminhos absolutos se tiver problemas com relativos

### "Erro de conexão"
- Verifique se a URL do N8N está acessível
- Confirme que a API key está correta
- Teste com `node examples/n8n-import/import-cli.js test`

---

**Dica:** Este exemplo mostra a VERDADEIRA funcionalidade do docs-jana em ação! 🚀
