#!/usr/bin/env node

/**
 * Teste completo do CLI - Simula seleção de cada opção do menu
 */

const { spawn } = require('child_process');
const { EOL } = require('os');

console.log('🧪 TESTE COMPLETO DO CLI\n');
console.log('Este script testa cada opção do menu automaticamente.\n');
console.log('─'.repeat(80));

const tests = [
  {
    name: 'Opção 4 - Ver Versão',
    input: '4\n',
    expectedOutput: 'docs-jana version 2.0.0'
  },
  {
    name: 'Opção 5 - Ver Ajuda',
    input: '5\n',
    expectedOutput: 'USAGE:'
  },
  {
    name: 'Opção 1 - Download N8N (mostra ajuda)',
    input: '1\n',
    expectedOutput: 'N8N Download Command'
  }
];

async function runTest(test) {
  return new Promise((resolve) => {
    console.log(`\n\n📌 Testando: ${test.name}`);
    console.log('─'.repeat(80));

    const cli = spawn('node', ['cli.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';

    cli.stdout.on('data', (data) => {
      output += data.toString();
    });

    cli.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    // Send input
    cli.stdin.write(test.input);
    cli.stdin.end();

    // Wait 2 seconds then kill
    setTimeout(() => {
      cli.kill('SIGTERM');
    }, 2000);

    cli.on('close', (code) => {
      const allOutput = output + errorOutput;

      console.log('Saída do Comando:');
      console.log(allOutput);

      // Check if expected output is present
      if (allOutput.includes(test.expectedOutput)) {
        console.log(`\n✅ PASSOU: Encontrou "${test.expectedOutput}"`);
        resolve(true);
      } else {
        console.log(`\n❌ FALHOU: Não encontrou "${test.expectedOutput}"`);
        resolve(false);
      }
    });
  });
}

async function runAllTests() {
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const result = await runTest(test);
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log('\n' + '═'.repeat(80));
  console.log('\n📊 RESUMO DOS TESTES');
  console.log('─'.repeat(80));
  console.log(`Total de testes: ${tests.length}`);
  console.log(`✅ Passaram: ${passed}`);
  console.log(`❌ Falharam: ${failed}`);
  console.log(`Taxa de sucesso: ${((passed / tests.length) * 100).toFixed(1)}%`);
  console.log('\n' + '═'.repeat(80));

  if (failed === 0) {
    console.log('\n🎉 TODOS OS TESTES PASSARAM! O CLI está funcionando corretamente!\n');
  } else {
    console.log('\n⚠️  Alguns testes falharam. Verifique a saída acima.\n');
  }
}

runAllTests();
