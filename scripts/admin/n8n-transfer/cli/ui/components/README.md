# UI Components - Biblioteca Reutilizável para CLI

Esta biblioteca fornece componentes UI reutilizáveis para construção de interfaces CLI interativas usando Inquirer.js, Chalk e Ora.

## Componentes Disponíveis

### 1. Input Components (input.js)

Componentes para captura de entrada de texto do usuário.

```javascript
const { input, inputUrl, inputNumber } = require('./components');

// Input básico
const name = await input('Digite seu nome:', { default: 'Usuário' });

// Input com validação de URL
const url = await inputUrl('Digite a URL:', { default: 'https://example.com' });

// Input numérico com validação
const port = await inputNumber('Digite a porta:', {
  min: 1,
  max: 65535,
  default: 3000
});

// Input de senha (mascarado)
const password = await input('Digite a senha:', { password: true });
```

### 2. Select Components

#### select.js - Seleção única

```javascript
const { select } = require('./components');

const option = await select('Escolha uma opção:', [
  { name: 'Opção 1', value: 'opt1' },
  { name: 'Opção 2', value: 'opt2' },
  { name: 'Opção 3', value: 'opt3' }
], { default: 'opt1' });
```

#### confirm.js - Confirmação Sim/Não

```javascript
const { confirm } = require('./components');

const shouldContinue = await confirm('Deseja continuar?', { default: true });

if (shouldContinue) {
  // Executar ação
}
```

#### multi-select.js - Seleção Múltipla

```javascript
const { multiSelect } = require('./components');

const languages = await multiSelect('Escolha linguagens:', [
  { name: 'JavaScript', value: 'js', checked: true },
  { name: 'TypeScript', value: 'ts' },
  { name: 'Python', value: 'py' }
]);

console.log(`Selecionadas: ${languages.join(', ')}`);
```

### 3. Progress Components (progress.js)

Componentes para indicação de progresso usando Ora.

```javascript
const { createSpinner, withSpinner } = require('./components');

// Uso manual do spinner
const spinner = createSpinner('Carregando dados...');
spinner.start();
// ... operação
spinner.succeed('Dados carregados!');

// Uso automático com withSpinner
const result = await withSpinner('Processando', async () => {
  // Operação assíncrona
  return await processData();
});
```

### 4. Table Component (table.js)

Componente para exibição de dados tabulares usando cli-table3.

```javascript
const { createTable, colors } = require('./components');

const tableOutput = createTable({
  head: ['Nome', 'Status', 'Progresso'],
  rows: [
    ['Task 1', colors.success('Completo'), '100%'],
    ['Task 2', colors.warning('Em progresso'), '50%'],
    ['Task 3', colors.muted('Pendente'), '0%']
  ],
  style: {
    head: ['cyan'],
    border: ['grey']
  }
});

console.log(tableOutput);
```

### 5. Formatter Component (formatter.js)

Wrappers para Chalk com funções de formatação padronizadas.

```javascript
const { colors, title, success, error, warning, info, initFormatter } = require('./components');

// IMPORTANTE: Inicializar formatter antes de usar (carrega chalk ESM)
await initFormatter();

// Formatação de cores
console.log(colors.primary('Texto primário'));
console.log(colors.success('Texto de sucesso'));
console.log(colors.error('Texto de erro'));
console.log(colors.warning('Texto de aviso'));
console.log(colors.bold('Texto em negrito'));

// Funções de formatação com ícones
console.log(title('Título da Seção'));
console.log(success('Operação bem-sucedida'));
console.log(error('Erro detectado'));
console.log(warning('Atenção necessária'));
console.log(info('Informação útil'));
```

## Dependências

- **inquirer** (^12.9.6): Prompts interativos
- **chalk** (^5.6.2): Formatação de cores (ESM)
- **ora** (^9.0.0): Spinners de progresso
- **cli-table3** (^0.6.5): Tabelas formatadas

## Instalação

As dependências já estão instaladas no projeto. Caso precise reinstalar:

```bash
npm install inquirer@^12.9.6 chalk@^5.6.2 ora@^9.0.0 cli-table3@^0.6.5
```

## Uso Básico

```javascript
// Importar todos os componentes
const components = require('./components');

// Ou importar seletivamente
const {
  input,
  select,
  confirm,
  createSpinner,
  success,
  error
} = require('./components');

// Exemplo de wizard interativo
async function configureApp() {
  // Inicializar formatter
  await components.initFormatter();

  console.log(components.title('Configuração da Aplicação'));

  const appName = await input('Nome da aplicação:');
  const port = await inputNumber('Porta:', { min: 1, max: 65535, default: 3000 });
  const env = await select('Ambiente:', [
    { name: 'Desenvolvimento', value: 'dev' },
    { name: 'Produção', value: 'prod' }
  ]);

  const shouldSave = await confirm('Salvar configurações?');

  if (shouldSave) {
    await withSpinner('Salvando configurações', async () => {
      // Salvar configurações
      await saveConfig({ appName, port, env });
    });

    console.log(success('Configurações salvas com sucesso!'));
  } else {
    console.log(warning('Configurações não foram salvas'));
  }
}
```

## Teste

Execute o script de teste para verificar todos os componentes:

```bash
node test-components.js
```

## Integração com i18n

Os componentes podem ser integrados com o sistema de i18n do projeto:

```javascript
const { t } = require('../../i18n');
const { input, error } = require('./components');

const name = await input(t('prompts.enterName'), {
  validate: (value) => {
    if (!value) return t('errors.nameRequired');
    return true;
  }
});
```

## Padrões de Código

- **JSDoc completo**: Todas as funções possuem documentação JSDoc
- **Validação de entrada**: Validações customizáveis via opções
- **Error handling**: Tratamento de erros consistente
- **PT-BR**: Mensagens padrão em português brasileiro
- **Async/await**: API assíncrona moderna

## Arquitetura

```
components/
├── input.js          # Input text, URL, number
├── select.js         # Single selection
├── confirm.js        # Yes/No confirmation
├── multi-select.js   # Multiple selection (checkbox)
├── progress.js       # Spinners e progress indicators
├── table.js          # Tabular data display
├── formatter.js      # Chalk wrappers e color utilities
├── index.js          # Exports centralizados
├── test-components.js # Script de teste
└── README.md         # Esta documentação
```

## Compatibilidade

- **Node.js**: >= 14.0.0
- **Inquirer**: 12.x (ESM/CommonJS hybrid)
- **Chalk**: 5.x (ESM, com lazy loading)
- **Ora**: 9.x
- **cli-table3**: 0.6.x

## Notas Importantes

1. **Chalk ESM**: O formatter usa dynamic import para carregar chalk (ESM). Sempre chame `await initFormatter()` antes de usar cores.

2. **Inquirer 12.x**: Esta versão usa API diferente de 8.x. Os componentes são compatíveis com ambas as versões.

3. **Graceful degradation**: Se chalk não carregar, formatter retorna texto sem cores.

## Próximos Passos

- [ ] Adicionar testes unitários (Jest)
- [ ] Adicionar componente de progress bar (cli-progress)
- [ ] Adicionar componente de lista paginada
- [ ] Adicionar suporte a temas customizados
- [ ] Documentar patterns avançados (wizard flow, validation chains)

## Contribuindo

Ao adicionar novos componentes:

1. Seguir estrutura de JSDoc existente
2. Exportar funções em index.js
3. Adicionar exemplos neste README
4. Criar testes em test-components.js
5. Manter compatibilidade com versões atuais das dependências

## Licença

MIT - Jana Team
