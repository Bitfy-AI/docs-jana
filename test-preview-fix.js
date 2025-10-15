#!/usr/bin/env node

/**
 * Teste do fix do preview - Verifica se Enter no preview executa o comando
 */

console.log('🧪 Testando Fix do Preview\n');
console.log('Este teste simula:');
console.log('  1. Enter → Mostra preview');
console.log('  2. Enter → EXECUTA comando ✅\n');
console.log('─'.repeat(80));

const MenuOrchestrator = require('./src/ui/menu/components/MenuOrchestrator');

async function testPreviewExecution() {
  const menu = new MenuOrchestrator({
    menuOptions: [
      {
        command: 'version',
        label: 'Ver Versão',
        description: 'Mostra informações da versão',
        preview: {
          title: 'Preview do Comando',
          command: 'docs-jana version',
          description: 'Comando simples de teste'
        }
      }
    ]
  });

  try {
    await menu.initialize();

    console.log('\n✅ Menu inicializado');
    console.log(`   Modo atual: ${menu.getState().mode}`);

    // Simula primeiro Enter (mostra preview)
    console.log('\n📌 Simulando primeiro Enter (mostra preview)...');
    menu.switchMode('preview');
    console.log(`   Modo mudou para: ${menu.getState().mode}`);

    // Simula segundo Enter (executa comando)
    console.log('\n📌 Simulando segundo Enter (deveria executar)...');

    // Mock do executeCommand para testar sem executar de verdade
    let commandExecuted = false;
    const originalExecute = menu.executeCommand.bind(menu);
    menu.executeCommand = async (option) => {
      commandExecuted = true;
      console.log(`   ✅ executeCommand() foi chamado!`);
      console.log(`   Comando: ${option.command}`);
      return Promise.resolve();
    };

    // Chama handleSelection (que é chamado quando pressiona Enter)
    await menu.handleSelection();

    // Verifica resultado
    console.log('\n' + '═'.repeat(80));
    console.log('📊 RESULTADO DO TESTE\n');

    if (commandExecuted) {
      console.log('🎉 SUCESSO! O comando foi executado após Enter no preview!\n');
      console.log('O fix está funcionando corretamente! ✅');
    } else {
      console.log('❌ FALHOU! O comando NÃO foi executado.\n');
      console.log('O bug ainda existe - handleSelection não executou o comando.');
    }

    console.log('═'.repeat(80));

    await menu.cleanup();

  } catch (error) {
    console.error('\n❌ Erro durante teste:', error.message);
    console.error('Stack:', error.stack);
  }
}

testPreviewExecution();
