#!/usr/bin/env node

/**
 * CLI SIMPLES DE EXEMPLO
 * Execute: node examples/simple-cli/cli.js <comando>
 */

// Captura argumentos da linha de comando
const command = process.argv[2];
const args = process.argv.slice(3);

// Router de comandos
switch (command) {
case 'hello':
  console.log('👋 Olá! CLI funcionando!');
  break;

case 'echo':
  console.log('📢 Você disse:', args.join(' '));
  break;

case 'sum': {
  const num1 = parseFloat(args[0]);
  const num2 = parseFloat(args[1]);
  console.log(`➕ ${num1} + ${num2} = ${num1 + num2}`);
  break;
}

case 'list':
  console.log('📋 Comandos disponíveis:');
  console.log('  • hello - Mostra saudação');
  console.log('  • echo <texto> - Repete o texto');
  console.log('  • sum <num1> <num2> - Soma dois números');
  console.log('  • list - Mostra esta lista');
  break;

default:
  console.log('❌ Comando desconhecido:', command);
  console.log('💡 Use "list" para ver comandos disponíveis');
  process.exit(1);
}
