/**
 * @fileoverview Test script for UI components
 *
 * Usage: node test-components.js
 */

const {
  input,
  inputUrl,
  inputNumber,
  select,
  confirm,
  multiSelect,
  createSpinner,
  withSpinner,
  createTable,
  colors,
  title,
  success,
  error,
  warning,
  info,
  initFormatter
} = require('./index');

async function testComponents() {
  console.log('\n' + '='.repeat(60));
  console.log('Testing UI Components');
  console.log('='.repeat(60) + '\n');

  // Initialize formatter (loads chalk)
  await initFormatter();

  // Test formatter functions
  console.log(title('Teste de Formatação'));
  console.log(success('Operação bem-sucedida'));
  console.log(error('Erro detectado'));
  console.log(warning('Atenção necessária'));
  console.log(info('Informação útil'));
  console.log('\n');

  // Test colors
  console.log(colors.primary('Texto primário (cyan)'));
  console.log(colors.success('Texto de sucesso (verde)'));
  console.log(colors.error('Texto de erro (vermelho)'));
  console.log(colors.warning('Texto de aviso (amarelo)'));
  console.log(colors.info('Texto informativo (azul)'));
  console.log(colors.muted('Texto discreto (cinza)'));
  console.log(colors.bold('Texto em negrito'));
  console.log(colors.dim('Texto esmaecido'));
  console.log('\n');

  // Test table
  console.log(title('Teste de Tabela'));
  const tableOutput = createTable({
    head: ['Nome', 'Status', 'Progresso'],
    rows: [
      ['Task 1', colors.success('Completo'), '100%'],
      ['Task 2', colors.warning('Em progresso'), '50%'],
      ['Task 3', colors.muted('Pendente'), '0%']
    ]
  });
  console.log(tableOutput);
  console.log('\n');

  // Test spinner
  console.log(title('Teste de Spinner'));
  await withSpinner('Processando dados', async () => {
    await new Promise(resolve => setTimeout(resolve, 2000));
  });
  console.log('\n');

  // Test input
  console.log(title('Teste de Input'));
  const name = await input('Digite seu nome:', { default: 'Usuário' });
  console.log(success(`Nome recebido: ${name}`));
  console.log('\n');

  // Test inputNumber
  const age = await inputNumber('Digite sua idade:', { min: 0, max: 150, default: 25 });
  console.log(success(`Idade recebida: ${age}`));
  console.log('\n');

  // Test confirm
  const shouldContinue = await confirm('Deseja continuar?', { default: true });
  console.log(success(`Confirmação: ${shouldContinue ? 'Sim' : 'Não'}`));
  console.log('\n');

  if (shouldContinue) {
    // Test select
    const option = await select('Escolha uma opção:', [
      { name: 'Opção 1', value: 'opt1' },
      { name: 'Opção 2', value: 'opt2' },
      { name: 'Opção 3', value: 'opt3' }
    ]);
    console.log(success(`Opção selecionada: ${option}`));
    console.log('\n');

    // Test multiSelect
    const options = await multiSelect('Escolha múltiplas opções:', [
      { name: 'JavaScript', value: 'js', checked: true },
      { name: 'TypeScript', value: 'ts' },
      { name: 'Python', value: 'py' },
      { name: 'Go', value: 'go' }
    ]);
    console.log(success(`Opções selecionadas: ${options.join(', ')}`));
    console.log('\n');
  }

  // Test inputUrl
  console.log(title('Teste de URL'));
  const url = await inputUrl('Digite uma URL:', { default: 'https://example.com' });
  console.log(success(`URL recebida: ${url}`));
  console.log('\n');

  console.log('='.repeat(60));
  console.log(success('Todos os testes concluídos com sucesso!'));
  console.log('='.repeat(60) + '\n');
}

// Run tests if executed directly
if (require.main === module) {
  testComponents().catch(err => {
    console.error(error(`Erro durante os testes: ${err.message}`));
    process.exit(1);
  });
}

module.exports = { testComponents };
