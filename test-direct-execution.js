#!/usr/bin/env node

/**
 * Teste de execução direta sem preview intermediário
 */

const { spawn } = require('child_process');

console.log('🧪 TESTE: Execução Direta (Sem Preview)\n');
console.log('Configuração: showPreviews=false (padrão)\n');
console.log('Comportamento Esperado:');
console.log('  1. Navega até comando');
console.log('  2. Pressiona Enter');
console.log('  3. ✅ Comando EXECUTA IMEDIATAMENTE (sem preview)');
console.log('\n' + '─'.repeat(80) + '\n');

const cli = spawn('node', ['cli.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';

cli.stdout.on('data', (data) => {
  const text = data.toString();
  output += text;
  process.stdout.write(text); // Mostra em tempo real
});

cli.stderr.on('data', (data) => {
  const text = data.toString();
  output += text;
  process.stderr.write(text);
});

// Simula entrada do usuário:
// Digite '4' (Ver Versão) + Enter
setTimeout(() => {
  console.log('\n📌 Simulando: Digitar "4" (Ver Versão)...');
  cli.stdin.write('4\n');
}, 1500);

// Aguarda 3 segundos e mata o processo
setTimeout(() => {
  cli.kill('SIGTERM');
}, 4000);

cli.on('close', (code) => {
  console.log('\n' + '═'.repeat(80));
  console.log('\n📊 RESULTADO DO TESTE\n');

  // Verifica se executou diretamente (sem preview)
  if (output.includes('docs-jana version')) {
    console.log('🎉 SUCESSO! O comando executou DIRETAMENTE sem preview!');
    console.log('✅ showPreviews=false está funcionando corretamente!');
  } else if (output.includes('PREVIEW DO COMANDO')) {
    console.log('❌ FALHOU! Ainda está mostrando preview!');
    console.log('⚠️  showPreviews deve estar true no config.');
  } else if (output.includes('📋 MENU PRINCIPAL')) {
    console.log('⚠️  Menu legacy está sendo usado (esperado em CI/pipe).');
  } else {
    console.log('❓ Resultado inesperado - verifique output acima.');
  }

  console.log('\n' + '═'.repeat(80));
});
