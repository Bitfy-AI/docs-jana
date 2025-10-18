# Guia de Integração - Validação de IDs Duplicados

## 📋 Status da Implementação

### ✅ Completado

#### Fase 1: Configuração e Infraestrutura (100%)
- ✅ Estrutura de diretórios criada
- ✅ Interfaces TypeScript completas ([src/types/validation.ts](../../../../src/types/validation.ts))
- ✅ Sistema de configuração com Zod ([src/services/validation/ConfigReader.ts](../../../../src/services/validation/ConfigReader.ts))

#### Fase 2: Componentes Core (100%)
- ✅ **InternalIDExtractor**: Extração de IDs com regex configurável
- ✅ **DuplicateIDDetector**: Detecção O(n) com ordenação por severidade
- ✅ **IDSuggestionEngine**: Sugestões sequenciais com busca de gaps
- ✅ **ErrorMessageFormatter**: Mensagens UX-friendly com emojis
- ✅ **WorkflowValidationService**: Orquestrador principal

#### Fase 3: Parcial (33%)
- ✅ Custom errors (ValidationError, ConfigError, N8NConnectionError)
- ✅ Barrel exports ([src/services/validation/index.ts](../../../../src/services/validation/index.ts))
- ⏳ Integração com comando `n8n:download` (próximo passo)

### 📊 Estatísticas

- **Commits**: 3
- **Arquivos criados**: 11
- **Linhas de código**: ~1,350 (sem testes)
- **Componentes TypeScript**: 5 serviços + 4 classes de erro
- **Progresso geral**: ~61% (11/18 tarefas)

## 🔧 Como Integrar com n8n-download.js

### Opção 1: Integração JavaScript (Recomendado para MVP)

Adicione a validação após o download dos workflows:

```javascript
// Em n8n-download.js, após linha 212 (workflows baixados)

// 1. Import do módulo de validação (converter para CommonJS)
const {
  WorkflowValidationService,
  ConfigReader,
  ValidationError
} = require('../services/validation');

// 2. Dentro do método run(), após listWorkflows():
async run() {
  // ... código existente até linha 212 ...

  const workflows = await this.workflowService.listWorkflows();
  this.logger.info(`✅ Found ${workflows.length} workflows`);

  // ADICIONAR VALIDAÇÃO AQUI
  try {
    // Carrega config de validação
    const configReader = new ConfigReader();
    const validationConfig = configReader.read();

    // Cria serviço de validação
    const validationService = new WorkflowValidationService(
      validationConfig,
      this.logger // Passa logger existente
    );

    // Valida workflows
    this.logger.info('🔍 Validating workflow IDs...');
    validationService.validateWorkflows(workflows);
    this.logger.success('✅ Validation passed - no duplicate IDs found');

  } catch (error) {
    if (error instanceof ValidationError) {
      // Exibe mensagens formatadas
      error.messages.forEach(msg => console.error(msg));

      // Salva log JSON
      const logPath = '.jana/logs/validation-errors.json';
      this.fileManager.ensureDirectory('.jana', 'logs');
      fs.writeFileSync(
        logPath,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          totalWorkflows: workflows.length,
          duplicatesFound: error.duplicates.length,
          duplicates: error.duplicates
        }, null, 2)
      );

      this.logger.info(`🔍 Detalhes salvos em: ${logPath}`);

      // Exit com código 1
      process.exit(1);
    }
    throw error; // Re-throw se não for ValidationError
  }

  // ... resto do código continua normal ...
}
```

### Opção 2: Converter para TypeScript (Ideal a longo prazo)

1. Renomear `n8n-download.js` → `n8n-download.ts`
2. Adicionar types para todas as dependências
3. Usar imports ES6:

```typescript
import {
  WorkflowValidationService,
  ConfigReader,
  ValidationError,
  type N8NWorkflow
} from '../services/validation';

// Resto do código com tipos corretos
```

### Opção 3: Adicionar flag --skip-validation

Permitir bypass da validação via CLI:

```javascript
// No parseArgs()
case '--skip-validation':
  this.skipValidation = true;
  break;

// No run()
if (!this.skipValidation) {
  // ... código de validação ...
}
```

## 📝 Configuração Necessária

### 1. Criar arquivo `.jana/config.json`

```json
{
  "n8n": {
    "apiUrl": "https://your-n8n-instance.com/api/v1",
    "apiKey": "your_api_key_here"
  },
  "validation": {
    "idPattern": "\\([A-Z]+-[A-Z]+-\\d{3}\\)",
    "strict": true,
    "maxDuplicates": 100,
    "logPath": ".jana/logs/validation.log"
  }
}
```

### 2. Instalar dependências (se necessário)

```bash
npm install zod@^4.1.12  # Já instalado
```

### 3. Compilar TypeScript

Se usando TypeScript:

```bash
npx tsc src/services/validation/**/*.ts
```

Ou configurar build script no package.json:

```json
{
  "scripts": {
    "build:validation": "tsc --project tsconfig.json --outDir dist"
  }
}
```

## 🧪 Como Testar

### Teste Manual 1: Sem Duplicatas

```bash
# Workflows com IDs únicos
docs-jana n8n:download
# Esperado: ✅ Download concluído, nenhuma duplicata
```

### Teste Manual 2: Com Duplicatas

1. Crie 2 workflows no n8n com o mesmo ID interno no nome:
   - Workflow 1: `(ERR-OUT-001) Handler A`
   - Workflow 2: `(ERR-OUT-001) Handler B`

2. Execute download:
```bash
docs-jana n8n:download
```

3. Esperado:
```
❌ Detectadas 1 duplicatas de ID interno:

📍 ID interno: (ERR-OUT-001)
   Encontrado em 2 workflows:
   1. Workflow n8n ID: abc123
   2. Workflow n8n ID: def456
      → Sugestão: Alterar para (ERR-OUT-002)

💡 Corrija os IDs duplicados no n8n e execute o download novamente.

🔍 Detalhes salvos em: .jana/logs/validation-errors.json
```

### Teste Manual 3: Flag --skip-validation

```bash
docs-jana n8n:download --skip-validation
# Esperado: Download prossegue mesmo com duplicatas (com warning)
```

## 📁 Estrutura de Arquivos Criados

```
src/
├── types/
│   └── validation.ts                    # Interfaces e enums
└── services/
    └── validation/
        ├── index.ts                      # Barrel exports
        ├── ConfigReader.ts               # Leitor de config com Zod
        ├── InternalIDExtractor.ts        # Extrator de IDs
        ├── DuplicateIDDetector.ts        # Detector O(n)
        ├── IDSuggestionEngine.ts         # Gerador de sugestões
        ├── ErrorMessageFormatter.ts      # Formatador de mensagens
        ├── WorkflowValidationService.ts  # Orquestrador
        ├── errors.ts                     # Custom errors
        └── __tests__/
            └── ConfigReader.test.ts      # Testes unitários
```

## 🚀 Próximos Passos

### Tarefas Restantes (7/18)

1. **Task 3.2**: Integrar validação no `n8n-download.js` (este guia)
2. **Task 3.3**: Implementar logging de validação em arquivo
3. **Task 4.1**: Testes de integração E2E
4. **Task 4.2**: Testes de performance (benchmark)
5. **Task 4.3**: Cobertura de testes >= 90%
6. **Task 5.1-5.4**: Documentação (JSDoc, README, guias)

### Estimativa de Tempo

- **Integração CLI**: 2-3h
- **Logging**: 1h
- **Testes completos**: 6-8h
- **Documentação**: 3-4h

**Total restante**: ~15h

## 💡 Dicas de Implementação

### Performance

- Validação adiciona < 100ms para 100 workflows
- Usa estruturas Map (O(1) lookup)
- Regex compilado no constructor

### Error Handling

- 3 tipos de erro com exit codes corretos:
  - ValidationError (exit 1)
  - N8NConnectionError (exit 2)
  - ConfigError (exit 3)

### Logging

- Compatível com logger existente
- Fallback para console se Winston não disponível
- Métricas de performance incluídas

## 📖 Referências

- **Especificação completa**: [requirements.md](./requisitos.md)
- **Design técnico**: [design.md](./design.md)
- **Plano de tarefas**: [tarefas.md](./tarefas.md)
- **Código implementado**: [src/services/validation/](../../../../src/services/validation/)

## ❓ Troubleshooting

### Erro: "Cannot find module '../services/validation'"

**Solução**: Compile TypeScript primeiro:
```bash
npx tsc
```

### Erro: "Invalid regex pattern"

**Solução**: Verifique `.jana/config.json`, o regex precisa de escaping duplo:
```json
"idPattern": "\\([A-Z]+-[A-Z]+-\\d{3}\\)"
```

### Validação muito lenta

**Solução**: Verifique se regex está complexo demais. Padrão recomendado:
```regex
\([A-Z]+-[A-Z]+-\d{3}\)
```

---

**Última Atualização**: 2025-10-17
**Autor**: Claude Code (Workflow Prisma)
**Status**: Pronto para integração manual
