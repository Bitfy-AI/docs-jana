# 🔧 Services Documentation

Documentação dos services internos utilizados pela CLI do docs-jana.

## 📑 Documentos Disponíveis

### [Integration Guide](INTEGRATION-GUIDE.md)
Guia completo de integração dos services na CLI.

**Conteúdo**:
- Arquitetura de services
- IDMappingService - Mapeamento de IDs (old → new)
- WorkflowIDRemapper - Remapeamento de referências
- UploadHistoryService - Histórico de uploads
- WorkflowValidator - Validação de IDs duplicados
- MigrationVerifier - Verificação de integridade
- ReferenceUpdater - Atualização recursiva de referências
- Exemplos de uso e workflows completos
- Troubleshooting e best practices

## 🎯 Para Que Serve

Os **services** são componentes de lógica de negócio que:
- Encapsulam funcionalidades complexas
- Podem ser reutilizados por múltiplos comandos
- Separam responsabilidades (SRP - Single Responsibility Principle)
- Facilitam testes unitários
- Permitem manutenção independente

## 🏗️ Arquitetura

```
CLI Commands (Entry Point)
    ↓
Services (Business Logic)
    ↓
Core/Utils (Infrastructure)
```

**Exemplo**:
```javascript
// Comando CLI (n8n-upload.js)
const idMappingService = new IDMappingService(logger);
idMappingService.addMapping(oldId, newId, workflowName);
await idMappingService.saveToFile('./mapping.json');

// Service (id-mapping-service.js)
class IDMappingService {
  addMapping(oldId, newId, workflowName) {
    // Business logic aqui
  }
}
```

## 📦 Services Disponíveis

| Service | Status | Usado Por | Arquivo |
|---------|--------|-----------|---------|
| IDMappingService | ✅ Integrado | n8n-upload, n8n-verify | [id-mapping-service.js](../../../src/services/id-mapping-service.js) |
| WorkflowIDRemapper | ✅ Integrado | n8n-upload | [workflow-id-remapper.js](../../../src/services/workflow-id-remapper.js) |
| UploadHistoryService | ✅ Integrado | n8n-upload | [upload-history-service.js](../../../src/services/upload-history-service.js) |
| WorkflowValidator | ✅ Integrado | n8n-download, n8n-validate | [validation-wrapper.js](../../../src/services/validation-wrapper.js) |
| MigrationVerifier | ✅ Integrado | n8n-verify | [migration-verifier.js](../../../src/services/migration-verifier.js) |
| ReferenceUpdater | ⚠️ Disponível | (futuro) | [reference-updater.js](../../../src/services/reference-updater.js) |

## 🚀 Quick Start

### Usando IDMappingService

```javascript
const IDMappingService = require('./src/services/id-mapping-service');

const mapper = new IDMappingService(logger);

// Adicionar mapeamentos
mapper.addMapping('old-123', 'new-456', 'My Workflow');
mapper.addMapping('old-789', 'new-012', 'Another Workflow');

// Consultar
const newId = mapper.getNewId('old-123'); // 'new-456'

// Salvar para arquivo
await mapper.saveToFile('./_id-mapping.json');

// Carregar de arquivo
await mapper.loadFromFile('./_id-mapping.json');
```

### Usando WorkflowValidator

```javascript
const WorkflowValidator = require('./src/services/validation-wrapper');

const validator = new WorkflowValidator(logger);

try {
  const result = validator.validate(workflows, {
    skipValidation: false,
    strict: true
  });

  console.log(result.valid ? 'OK' : 'Duplicates found');
} catch (error) {
  if (error.name === 'ValidationError') {
    error.messages.forEach(msg => console.error(msg));
  }
}
```

## 📖 Leitura Recomendada

1. **Iniciantes**: Comece com [Integration Guide](INTEGRATION-GUIDE.md)
2. **Desenvolvedores**: Leia o código-fonte dos services em `src/services/`
3. **Arquitetos**: Veja [Architecture](../../architecture/ARCHITECTURE.md)

## 🔗 Links Relacionados

- [Como Usar o CLI](../como-usar-cli.md) - Guia de uso dos comandos
- [Architecture](../../architecture/ARCHITECTURE.md) - Arquitetura completa
- [Source Code](../../../src/services/) - Código-fonte dos services

---

**Última atualização**: 2025-10-18
**Versão**: 1.0.0
