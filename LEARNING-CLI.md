# 📚 Guia de Aprendizado: Como Funciona uma CLI

Este guia explica como a CLI **docs-jana** funciona, desde conceitos básicos até arquitetura avançada.

---

## 🎯 O que é uma CLI?

**CLI** (Command Line Interface) é uma interface de linha de comando que permite executar programas através de comandos de texto no terminal.

### Exemplo Básico

```bash
# Comando simples
docs-jana help

# Comando com argumentos
docs-jana n8n:download --output ./workflows

# Comando com flags
docs-jana n8n:upload --input ./workflows --dry-run
```

---

## 🏗️ Anatomia de uma CLI Node.js

### 1. **Entry Point** - O Arquivo Executável

O arquivo [cli.js](cli.js) é o ponto de entrada:

```javascript
#!/usr/bin/env node
// Esta linha (shebang) diz ao sistema para executar com Node.js

// Importa módulos
const command = process.argv[2]; // Captura o comando
const args = process.argv.slice(3); // Captura os argumentos

// Executa lógica baseada no comando
if (command === 'help') {
  showHelp();
}
```

**Conceitos-chave:**
- `#!/usr/bin/env node` - Shebang que torna o arquivo executável
- `process.argv` - Array com argumentos da linha de comando
  - `argv[0]` = caminho do Node.js
  - `argv[1]` = caminho do script
  - `argv[2]` = primeiro argumento (comando)
  - `argv[3+]` = demais argumentos

### 2. **package.json** - Configuração do CLI

```json
{
  "name": "docs-jana",
  "bin": {
    "docs-jana": "./cli.js"
  }
}
```

- `bin` define o nome do comando e qual arquivo executar
- Após `npm install -g`, você pode usar `docs-jana` no terminal

---

## 📁 Arquitetura do Docs-Jana CLI

### Estrutura de Pastas

```
docs-jana/
├── cli.js                    # Entry point (parseador de comandos)
├── index.js                  # Módulo principal exportável
├── src/
│   ├── commands/             # 📌 Implementação dos comandos CLI
│   │   ├── base-command.js   # Classe base para comandos
│   │   ├── n8n-download.js   # Comando: n8n:download
│   │   ├── n8n-upload.js     # Comando: n8n:upload
│   │   └── outline-download.js
│   ├── services/             # 🔧 Lógica de negócio
│   │   ├── workflow-service.js
│   │   ├── outline-service.js
│   │   └── ...
│   ├── auth/                 # 🔐 Autenticação
│   │   ├── auth-factory.js
│   │   └── strategies/
│   ├── utils/                # 🛠️ Utilitários
│   │   ├── logger.js
│   │   ├── http-client.js
│   │   └── file-manager.js
│   └── config/               # ⚙️ Schemas e validação
```

### Fluxo de Execução

```
┌─────────────────────────────────────────────────┐
│ 1. Usuário executa:                             │
│    $ docs-jana n8n:download --output ./workflows│
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 2. cli.js recebe e parseia                      │
│    - Comando: 'n8n:download'                    │
│    - Args: ['--output', './workflows']          │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 3. Routing: identifica o comando                │
│    if (command === 'n8n:download')              │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 4. Instancia comando específico                 │
│    const cmd = new N8NDownloadCommand(args)     │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 5. Comando executa lógica                       │
│    - Valida argumentos                          │
│    - Carrega configuração (.env)                │
│    - Chama services                             │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 6. Service executa operação                     │
│    WorkflowService.downloadAll()                │
│    - Faz HTTP requests                          │
│    - Processa dados                             │
│    - Salva em arquivos                          │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 7. Retorna resultado ao usuário                 │
│    ✅ Downloaded 45 workflows                   │
└─────────────────────────────────────────────────┘
```

---

## 🔍 Detalhamento dos Componentes

### 1. **Commands** (Padrão Command Pattern)

Cada comando é uma classe que encapsula uma operação:

```javascript
// src/commands/n8n-download.js
class N8NDownloadCommand extends BaseCommand {
  constructor(args) {
    super();
    this.parseArgs(args); // Parseia --output, --tag, etc
  }

  async execute() {
    // Validação
    this.validateConfig();

    // Execução
    const service = new WorkflowService(config);
    const workflows = await service.downloadAll();

    // Output
    console.log(`✅ Downloaded ${workflows.length} workflows`);
  }

  parseArgs(args) {
    // Converte ['--output', './workflows'] em { output: './workflows' }
    // Usa bibliotecas como yargs, commander, ou parsing manual
  }
}
```

**Benefícios:**
- ✅ Cada comando é independente
- ✅ Fácil adicionar novos comandos
- ✅ Testável isoladamente

### 2. **Services** (Lógica de Negócio)

Services contêm a lógica real, separada da interface CLI:

```javascript
// src/services/workflow-service.js
class WorkflowService {
  constructor(httpClient, fileManager, logger) {
    this.http = httpClient;     // Dependency Injection
    this.files = fileManager;
    this.logger = logger;
  }

  async downloadAll() {
    // 1. Faz requisição HTTP
    const response = await this.http.get('/workflows');

    // 2. Processa dados
    const workflows = response.data.map(this.normalize);

    // 3. Salva em arquivos
    for (const workflow of workflows) {
      await this.files.save(`${workflow.name}.json`, workflow);
    }

    return workflows;
  }
}
```

**Benefícios:**
- ✅ Reutilizável (pode ser usado fora da CLI)
- ✅ Testável com mocks
- ✅ Baixo acoplamento

### 3. **Auth** (Factory + Strategy Pattern)

Sistema de autenticação flexível:

```javascript
// src/auth/auth-factory.js
class AuthFactory {
  static create(config) {
    if (config.apiKey) {
      return new ApiKeyStrategy(config.apiKey);
    }
    if (config.username && config.password) {
      return new BasicAuthStrategy(config.username, config.password);
    }
    throw new Error('No valid auth method');
  }
}

// src/auth/api-key-strategy.js
class ApiKeyStrategy {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  applyAuth(request) {
    request.headers['X-API-Key'] = this.apiKey;
    return request;
  }
}
```

### 4. **Utils** (Utilitários Reutilizáveis)

```javascript
// src/utils/logger.js
class Logger {
  info(message) {
    console.log(`ℹ️  ${message}`);
  }

  error(message) {
    console.error(`❌ ${message}`);
  }

  success(message) {
    console.log(`✅ ${message}`);
  }
}

// src/utils/http-client.js
class HttpClient {
  constructor(baseURL, authStrategy) {
    this.baseURL = baseURL;
    this.auth = authStrategy;
  }

  async get(path) {
    const url = `${this.baseURL}${path}`;
    let request = { url, method: 'GET', headers: {} };

    // Aplica autenticação
    request = this.auth.applyAuth(request);

    // Faz request (usando fetch, axios, etc)
    return fetch(request.url, request);
  }
}
```

---

## 🎨 Design Patterns Utilizados

### 1. **Command Pattern**
- Cada comando CLI é um objeto independente
- Facilita adicionar/remover comandos

### 2. **Factory Pattern**
- `AuthFactory` cria estratégias de autenticação
- `ServiceFactory` cria services com dependências injetadas

### 3. **Strategy Pattern**
- Diferentes estratégias de autenticação (API Key, Basic Auth, Token)
- Intercambiáveis em runtime

### 4. **Dependency Injection**
- Services recebem dependências via construtor
- Facilita testes e reduz acoplamento

### 5. **Single Responsibility**
- Cada classe tem uma única responsabilidade
- `Logger` só faz logging
- `HttpClient` só faz HTTP requests
- `FileManager` só manipula arquivos

---

## 🧪 Como Testar uma CLI

### Teste Unitário (Services)

```javascript
// __tests__/unit/workflow-service.test.js
describe('WorkflowService', () => {
  it('should download all workflows', async () => {
    // Arrange: Mock dependencies
    const mockHttp = {
      get: jest.fn().mockResolvedValue({ data: [{ id: 1 }] })
    };
    const mockFiles = {
      save: jest.fn()
    };

    const service = new WorkflowService(mockHttp, mockFiles);

    // Act: Execute
    const result = await service.downloadAll();

    // Assert: Verify
    expect(result).toHaveLength(1);
    expect(mockHttp.get).toHaveBeenCalledWith('/workflows');
    expect(mockFiles.save).toHaveBeenCalled();
  });
});
```

### Teste de Integração (Commands)

```javascript
// __tests__/integration/n8n-download.test.js
describe('n8n:download command', () => {
  it('should download workflows to specified directory', async () => {
    // Arrange
    const command = new N8NDownloadCommand(['--output', './test-output']);

    // Act
    await command.execute();

    // Assert
    const files = fs.readdirSync('./test-output');
    expect(files.length).toBeGreaterThan(0);
  });
});
```

### Teste E2E (CLI completa)

```javascript
// __tests__/e2e/cli.test.js
const { exec } = require('child_process');

describe('CLI E2E', () => {
  it('should execute n8n:download command', (done) => {
    exec('docs-jana n8n:download --output ./test-output', (error, stdout) => {
      expect(error).toBeNull();
      expect(stdout).toContain('Downloaded');
      done();
    });
  });
});
```

---

## 🚀 Como Adicionar um Novo Comando

### Passo a Passo

**1. Criar o arquivo do comando:**

```javascript
// src/commands/my-new-command.js
const BaseCommand = require('./base-command');

class MyNewCommand extends BaseCommand {
  constructor(args) {
    super();
    this.options = this.parseArgs(args);
  }

  async execute() {
    console.log('Executando meu novo comando!');
    // Sua lógica aqui
  }

  parseArgs(args) {
    // Parse argumentos
    return { /* options */ };
  }
}

module.exports = MyNewCommand;
```

**2. Registrar no cli.js:**

```javascript
// cli.js
const MyNewCommand = require('./src/commands/my-new-command');

if (command === 'my:new') {
  const cmd = new MyNewCommand(args);
  await cmd.execute();
}
```

**3. Adicionar documentação:**

Atualizar README.md com exemplos de uso.

**4. Criar testes:**

```javascript
// __tests__/unit/my-new-command.test.js
describe('MyNewCommand', () => {
  it('should execute successfully', async () => {
    const cmd = new MyNewCommand([]);
    await expect(cmd.execute()).resolves.not.toThrow();
  });
});
```

---

## 📦 Distribuição da CLI

### Instalação Local (Desenvolvimento)

```bash
# Link globalmente
npm link

# Agora você pode usar
docs-jana help
```

### Publicação no NPM

```bash
# 1. Fazer login no NPM
npm login

# 2. Publicar
npm publish

# 3. Usuários instalam
npm install -g docs-jana
```

### Distribuição como Binário (pkg)

```bash
# Instalar pkg
npm install -g pkg

# Criar binários para diferentes plataformas
pkg cli.js --targets node18-linux-x64,node18-macos-x64,node18-win-x64

# Resultado: 3 executáveis nativos (sem precisar Node.js)
```

---

## 🎓 Recursos de Aprendizado

### Bibliotecas Úteis

1. **Commander.js** - Parsing de argumentos robusto
2. **Yargs** - Alternativa ao Commander
3. **Chalk** - Cores no terminal
4. **Inquirer** - Prompts interativos
5. **Ora** - Spinners e loading
6. **cli-progress** - Barras de progresso (já usado no projeto)

### Exemplo com Commander.js

```javascript
const { Command } = require('commander');
const program = new Command();

program
  .name('docs-jana')
  .description('CLI for N8N and Outline management')
  .version('2.0.0');

program
  .command('n8n:download')
  .description('Download N8N workflows')
  .option('-o, --output <path>', 'Output directory', './workflows')
  .option('--tag <name>', 'Filter by tag')
  .action((options) => {
    console.log(`Downloading to ${options.output}`);
  });

program.parse();
```

---

## 🔧 Debugging

### Console Logs

```javascript
console.log('Debug:', value);
console.error('Error:', error);
console.table(arrayOfObjects); // Tabela formatada
```

### Node.js Inspector

```bash
# Executar com debugger
node --inspect-brk cli.js n8n:download

# Abrir Chrome DevTools
chrome://inspect
```

### VS Code Debugging

Criar `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug CLI",
      "program": "${workspaceFolder}/cli.js",
      "args": ["n8n:download", "--output", "./test"]
    }
  ]
}
```

---

## ✅ Próximos Passos

1. **Explore o código**:
   - Leia [cli.js](cli.js)
   - Analise [src/commands/n8n-download.js](src/commands/n8n-download.js)
   - Veja [src/services/workflow-service.js](src/services/workflow-service.js)

2. **Execute os comandos**:
   ```bash
   docs-jana help
   docs-jana n8n:download --help
   ```

3. **Modifique algo**:
   - Adicione um novo log
   - Crie um comando simples
   - Teste suas mudanças

4. **Leia os testes**:
   - [__tests__/unit/](file://__tests__/unit/)
   - Entenda como mockar dependências

---

## 📚 Glossário

- **CLI**: Command Line Interface
- **Shebang**: Linha `#!/usr/bin/env node` que indica o interpretador
- **argv**: Array de argumentos da linha de comando
- **Flag**: Opção booleana (ex: `--verbose`)
- **Option**: Opção com valor (ex: `--output ./path`)
- **Command**: Ação principal (ex: `n8n:download`)
- **Factory**: Padrão que cria objetos
- **Strategy**: Padrão que encapsula algoritmos intercambiáveis
- **DI**: Dependency Injection (injeção de dependências)

---

**Dúvidas?** Experimente, quebre, conserte, aprenda! 🚀
