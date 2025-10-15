#!/usr/bin/env node

/**
 * @fileoverview Teste de validação Task 39 - CLI Entry Point
 * @description
 * Valida que interactive-cli.js implementa todos os requisitos da Task 39.
 */

const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');

const CLI_PATH = path.join(__dirname, 'cli', 'interactive-cli.js');
const INDEX_PATH = path.join(__dirname, 'cli', 'index.js');

console.log('🧪 Validando Task 39: CLI Entry Point\n');

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`✅ ${description}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${description}`);
    console.log(`   ${error.message}\n`);
    failed++;
  }
}

function exec(command) {
  try {
    return execSync(command, { cwd: __dirname, encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    // Combina stdout e stderr para capturar todas as mensagens
    const stdout = error.stdout || '';
    const stderr = error.stderr || '';
    return stdout + stderr;
  }
}

// Test 1: Arquivo existe
test('interactive-cli.js existe', () => {
  if (!fs.existsSync(CLI_PATH)) {
    throw new Error('Arquivo não encontrado');
  }
});

// Test 2: index.js existe
test('index.js (alias) existe', () => {
  if (!fs.existsSync(INDEX_PATH)) {
    throw new Error('Arquivo não encontrado');
  }
});

// Test 3: Shebang correto em interactive-cli.js
test('Shebang correto em interactive-cli.js', () => {
  const content = fs.readFileSync(CLI_PATH, 'utf8');
  if (!content.startsWith('#!/usr/bin/env node')) {
    throw new Error('Shebang ausente ou incorreto');
  }
});

// Test 4: Shebang correto em index.js
test('Shebang correto em index.js', () => {
  const content = fs.readFileSync(INDEX_PATH, 'utf8');
  if (!content.startsWith('#!/usr/bin/env node')) {
    throw new Error('Shebang ausente ou incorreto');
  }
});

// Test 5: Flag --version funciona
test('Flag --version funciona', () => {
  const output = exec(`node "${CLI_PATH}" --version`);
  if (!output.includes('n8n-transfer v')) {
    throw new Error(`Output esperado não encontrado. Got: ${output}`);
  }
});

// Test 6: Flag -v funciona
test('Flag -v funciona', () => {
  const output = exec(`node "${CLI_PATH}" -v`);
  if (!output.includes('n8n-transfer v')) {
    throw new Error(`Output esperado não encontrado. Got: ${output}`);
  }
});

// Test 7: Flag --help funciona
test('Flag --help funciona', () => {
  const output = exec(`node "${CLI_PATH}" --help`);
  if (!output.includes('N8N Transfer System - Help')) {
    throw new Error(`Output esperado não encontrado. Got: ${output}`);
  }
});

// Test 8: Flag -h funciona
test('Flag -h funciona', () => {
  const output = exec(`node "${CLI_PATH}" -h`);
  if (!output.includes('N8N Transfer System - Help')) {
    throw new Error(`Output esperado não encontrado. Got: ${output}`);
  }
});

// Test 9: Sem argumentos exibe help
test('Sem argumentos exibe help', () => {
  const output = exec(`node "${CLI_PATH}"`);
  if (!output.includes('Comandos Disponíveis')) {
    throw new Error(`Output esperado não encontrado. Got: ${output}`);
  }
});

// Test 10: Comando inválido exibe erro
test('Comando inválido exibe erro descritivo', () => {
  const output = exec(`node "${CLI_PATH}" invalid-command`);
  if (!output.includes('Comando desconhecido')) {
    throw new Error(`Mensagem de erro não encontrada. Got: ${output}`);
  }
  if (!output.includes('Comandos disponíveis')) {
    throw new Error(`Lista de comandos não encontrada. Got: ${output}`);
  }
});

// Test 11: Comando help funciona
test('Comando "help" funciona', () => {
  const output = exec(`node "${CLI_PATH}" help`);
  if (!output.includes('N8N Transfer System - Help')) {
    throw new Error(`Output esperado não encontrado. Got: ${output}`);
  }
});

// Test 12: Comando list-plugins funciona
test('Comando "list-plugins" funciona', () => {
  const output = exec(`node "${CLI_PATH}" list-plugins`);
  if (!output.includes('Plugins Disponíveis')) {
    throw new Error(`Output esperado não encontrado. Got: ${output}`);
  }
});

// Test 13: Help de comando específico funciona
test('Help de comando específico funciona', () => {
  const output = exec(`node "${CLI_PATH}" help configure`);
  if (!output.includes('Help: configure')) {
    throw new Error(`Output esperado não encontrado. Got: ${output}`);
  }
});

// Test 14: index.js alias funciona
test('index.js (alias) funciona', () => {
  const output = exec(`node "${INDEX_PATH}" --version`);
  if (!output.includes('n8n-transfer v')) {
    throw new Error(`Output esperado não encontrado. Got: ${output}`);
  }
});

// Test 15: JSDoc presente
test('JSDoc completo presente', () => {
  const content = fs.readFileSync(CLI_PATH, 'utf8');
  if (!content.includes('@fileoverview')) {
    throw new Error('JSDoc @fileoverview ausente');
  }
  if (!content.includes('@returns')) {
    throw new Error('JSDoc @returns ausente');
  }
  if (!content.includes('@throws')) {
    throw new Error('JSDoc @throws ausente');
  }
  if (!content.includes('@example')) {
    throw new Error('JSDoc @example ausente');
  }
  if (!content.includes('@description')) {
    throw new Error('JSDoc @description ausente');
  }
});

// Test 16: Map de comandos presente
test('Map de comandos (COMMANDS) presente', () => {
  const content = fs.readFileSync(CLI_PATH, 'utf8');
  if (!content.includes('const COMMANDS')) {
    throw new Error('Map COMMANDS não encontrado');
  }
  const requiredCommands = ['configure', 'transfer', 'validate', 'list-plugins', 'help'];
  requiredCommands.forEach(cmd => {
    if (!content.includes(`'${cmd}'`)) {
      throw new Error(`Comando '${cmd}' não encontrado em COMMANDS`);
    }
  });
});

// Test 17: Tratamento de erros presente
test('Tratamento de erros global presente', () => {
  const content = fs.readFileSync(CLI_PATH, 'utf8');
  if (!content.includes('try {') || !content.includes('catch (error)')) {
    throw new Error('Try/catch global não encontrado');
  }
  if (!content.includes('process.env.DEBUG')) {
    throw new Error('Suporte a DEBUG mode não encontrado');
  }
});

// Test 18: Self-invoke pattern presente
test('Self-invoke pattern presente', () => {
  const content = fs.readFileSync(CLI_PATH, 'utf8');
  // Aceita tanto o pattern padrão quanto a versão expandida com index.js check
  const hasStandardPattern = content.includes('require.main === module');
  const hasMainInvocation = content.includes('main()') && content.includes('if (');

  if (!hasStandardPattern || !hasMainInvocation) {
    throw new Error('Self-invoke pattern não encontrado');
  }
});

// Test 19: Module export presente
test('Module export presente', () => {
  const content = fs.readFileSync(CLI_PATH, 'utf8');
  if (!content.includes('module.exports')) {
    throw new Error('Module export não encontrado');
  }
});

// Test 20: Exit codes apropriados
test('Exit codes apropriados presente', () => {
  const content = fs.readFileSync(CLI_PATH, 'utf8');
  if (!content.includes('process.exit(0)')) {
    throw new Error('Exit code 0 (sucesso) não encontrado');
  }
  if (!content.includes('process.exit(1)')) {
    throw new Error('Exit code 1 (erro) não encontrado');
  }
});

// Resumo
console.log('\n' + '='.repeat(50));
console.log(`✅ Testes Passou: ${passed}`);
console.log(`❌ Testes Falhou: ${failed}`);
console.log('='.repeat(50));

if (failed === 0) {
  console.log('\n🎉 Task 39: CLI Entry Point - TODOS OS REQUISITOS ATENDIDOS!\n');
  process.exit(0);
} else {
  console.log('\n⚠️  Alguns requisitos não foram atendidos. Verifique os erros acima.\n');
  process.exit(1);
}
