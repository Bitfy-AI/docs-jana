# Estrutura de Testes

Este diretório contém todos os testes automatizados do projeto docs-jana.

## Organização

### `unit/`
Testes unitários que testam funções e classes isoladamente, sem dependências externas.

**Características:**
- Rápidos de executar (< 100ms por teste)
- Não acessam I/O (filesystem, network, database)
- Usam mocks para todas as dependências
- Cobertura: 100% para código crítico, 80%+ para código geral

**Executar:**
```bash
npm run test:unit
```

### `integration/`
Testes de integração que testam a interação entre múltiplos componentes.

**Características:**
- Testam fluxos completos (ex: validação → sanitização → processamento)
- Podem usar filesystem real ou APIs mockadas
- Mais lentos que unit tests
- Focam em contratos entre componentes

**Executar:**
```bash
npm run test:integration
```

### `e2e/`
Testes end-to-end que testam fluxos completos da aplicação.

**Características:**
- Testam cenários reais de uso
- Usam dados reais ou fixtures realistas
- Mais lentos (podem levar segundos/minutos)
- Focam em validar que o sistema funciona como esperado

**Executar:**
```bash
npm run test:e2e
```

## Comandos Úteis

```bash
# Executar todos os testes
npm test

# Executar testes em modo watch (re-executa ao salvar)
npm run test:watch

# Executar com cobertura
npm run test:coverage

# Executar apenas testes unitários
npm run test:unit

# Executar no CI (modo otimizado)
npm run test:ci
```

## Convenções de Nomenclatura

- Arquivos de teste devem terminar com `.test.js` ou `.spec.js`
- Nome do arquivo de teste deve corresponder ao arquivo testado:
  - `src/utils/logger.js` → `__tests__/unit/logger.test.js`
- Testes devem ser organizados em blocos `describe()` claros
- Cada teste deve ter um nome descritivo do comportamento esperado

## Estrutura de um Teste

```javascript
const { FunctionToTest } = require('../../src/module');

describe('FunctionToTest', () => {
  describe('when condition X', () => {
    it('should do Y', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = FunctionToTest(input);

      // Assert
      expect(result).toBe('expected');
    });
  });

  describe('when invalid input', () => {
    it('should throw ValidationError', () => {
      expect(() => FunctionToTest(null)).toThrow('ValidationError');
    });
  });
});
```

## Mocks e Fixtures

- Mocks de módulos devem ficar em `__mocks__/`
- Fixtures de dados devem ficar em `__tests__/fixtures/`
- Helpers de teste devem ficar em `__tests__/helpers/`

## Cobertura de Código

Targets mínimos:
- **Global**: 80% (branches, functions, lines, statements)
- **Componentes de segurança** (`src/security/**`): 100%
- **Código crítico**: 90%+

Ver relatório de cobertura:
```bash
npm run test:coverage
# Abrir: coverage/index.html
```

## Executando no CI/CD

O comando `npm run test:ci` é otimizado para ambientes de CI:
- Executa em modo `--ci` (desabilita watch, otimiza output)
- Gera relatório de cobertura
- Limita workers para evitar timeout
- Gera relatório JUnit para integração com CI tools
