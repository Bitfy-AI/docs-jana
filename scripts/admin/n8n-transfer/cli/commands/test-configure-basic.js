/**
 * @fileoverview Test básico para validar a estrutura do comando configure
 * Este teste valida apenas a estrutura do módulo, não executa o wizard interativo
 */

const path = require('path');

console.log('🧪 Teste Básico - Comando Configure\n');
console.log('='.repeat(50));
console.log('');

// Test 1: Verificar se o módulo pode ser carregado
console.log('Test 1: Carregando módulo configure...');
try {
  const configure = require('./configure');

  if (typeof configure !== 'function') {
    throw new Error('configure não é uma função');
  }

  console.log('✅ PASS: Módulo carregado corretamente');
  console.log(`   Tipo: ${typeof configure}`);
  console.log('');
} catch (error) {
  console.log('❌ FAIL: Erro ao carregar módulo');
  console.log(`   Erro: ${error.message}`);
  console.log('');
  process.exit(1);
}

// Test 2: Verificar dependências
console.log('Test 2: Verificando dependências...');
try {
  const fs = require('fs');
  const basePath = path.join(__dirname, '..');

  // Verificar i18n
  const i18nPath = path.join(basePath, 'i18n', 'index.js');
  if (!fs.existsSync(i18nPath)) {
    throw new Error(`i18n não encontrado: ${i18nPath}`);
  }

  // Verificar UI components
  const componentsPath = path.join(basePath, 'ui', 'components', 'index.js');
  if (!fs.existsSync(componentsPath)) {
    throw new Error(`UI components não encontrados: ${componentsPath}`);
  }

  // Verificar HttpClient
  const httpClientPath = path.join(__dirname, '..', '..', 'core', 'http-client.js');
  if (!fs.existsSync(httpClientPath)) {
    throw new Error(`HttpClient não encontrado: ${httpClientPath}`);
  }

  console.log('✅ PASS: Todas as dependências encontradas');
  console.log(`   i18n: ${i18nPath}`);
  console.log(`   UI components: ${componentsPath}`);
  console.log(`   HttpClient: ${httpClientPath}`);
  console.log('');
} catch (error) {
  console.log('❌ FAIL: Erro ao verificar dependências');
  console.log(`   Erro: ${error.message}`);
  console.log('');
  process.exit(1);
}

// Test 3: Verificar strings i18n
console.log('Test 3: Verificando strings i18n...');
try {
  const { t } = require('../i18n');

  const requiredStrings = [
    'prompts.configWizard.title',
    'prompts.configWizard.sourceUrl',
    'prompts.configWizard.sourceApiKey',
    'prompts.configWizard.targetUrl',
    'prompts.configWizard.targetApiKey',
    'prompts.configWizard.saveConfig',
    'messages.connectionSuccess',
    'messages.configSaved',
    'errors.connectionFailed',
    'errors.cancelled'
  ];

  const missingStrings = [];
  for (const key of requiredStrings) {
    const value = t(key);
    if (value === key) {
      missingStrings.push(key);
    }
  }

  if (missingStrings.length > 0) {
    throw new Error(`Strings i18n faltando: ${missingStrings.join(', ')}`);
  }

  console.log('✅ PASS: Todas as strings i18n estão disponíveis');
  console.log(`   Total verificado: ${requiredStrings.length}`);
  console.log('');
} catch (error) {
  console.log('❌ FAIL: Erro ao verificar strings i18n');
  console.log(`   Erro: ${error.message}`);
  console.log('');
  process.exit(1);
}

// Test 4: Verificar HttpClient tem testConnection
console.log('Test 4: Verificando método HttpClient.testConnection...');
try {
  const HttpClient = require('../../core/http-client');

  // Verificar se testConnection existe no prototype
  if (typeof HttpClient.prototype.testConnection !== 'function') {
    throw new Error('HttpClient.testConnection não é uma função');
  }

  console.log('✅ PASS: HttpClient.testConnection existe');
  console.log('');
} catch (error) {
  console.log('❌ FAIL: Erro ao verificar HttpClient.testConnection');
  console.log(`   Erro: ${error.message}`);
  console.log('');
  process.exit(1);
}

// Summary
console.log('='.repeat(50));
console.log('');
console.log('✅ Todos os testes básicos passaram!');
console.log('');
console.log('📝 Nota: Este teste valida apenas a estrutura do módulo.');
console.log('   Para testar o fluxo completo, execute o comando manualmente:');
console.log('   node -e "require(\'./configure\')()"');
console.log('');
