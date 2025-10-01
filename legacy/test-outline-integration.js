#!/usr/bin/env node

/**
 * Testes de Integração para Outline Service
 *
 * Este arquivo testa a integração entre OutlineAuthFactory, OutlineService e métodos de sanitização.
 * Executa testes sem fazer chamadas reais à API (usa mocks/stubs quando necessário).
 *
 * Execução: node test-outline-integration.js
 *
 * Categorias de teste:
 * - Testes unitários: sanitizeFilename, sanitizePath, escapeYaml
 * - Testes de integração: Factory creation, service initialization
 * - Casos extremos: Inputs vazios, caracteres especiais, strings longas
 */

// Simples função de assertion para testes sem dependências externas
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      `${message}\n  Esperado: ${JSON.stringify(expected)}\n  Recebido: ${JSON.stringify(actual)}`
    );
  }
}

function assertContains(str, substring, message) {
  if (!str.includes(substring)) {
    throw new Error(`${message}\n  String "${str}" não contém "${substring}"`);
  }
}

function assertNotNull(value, message) {
  if (value === null || value === undefined) {
    throw new Error(`${message}\n  Valor não deveria ser null/undefined`);
  }
}

// Contador de testes
let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;
const failures = [];
const asyncTests = []; // Armazena promessas de testes assíncronos

// Função para executar um teste
function runTest(testName, testFn) {
  testsRun++;
  process.stdout.write(`  Testando ${testName}... `);

  try {
    const result = testFn();
    // Se a função retorna uma Promise, trata como assíncrona
    if (result && typeof result.then === 'function') {
      // Para testes assíncronos, armazena a Promise e retorna
      const testPromise = result.then(() => {
        testsPassed++;
        console.log('✓ Passou');
        return true;
      }).catch(error => {
        testsFailed++;
        console.log('✗ Falhou');
        console.log(`    Erro: ${error.message}`);
        failures.push({ test: testName, error: error.message });
        return false;
      });
      asyncTests.push(testPromise);
      return testPromise;
    }
    testsPassed++;
    console.log('✓ Passou');
    return true;
  } catch (error) {
    testsFailed++;
    console.log('✗ Falhou');
    console.log(`    Erro: ${error.message}`);
    failures.push({ test: testName, error: error.message });
    return false;
  }
}

// Mock do Logger para testes
class MockLogger {
  constructor() {
    this.logs = [];
  }

  debug(msg) { this.logs.push({ level: 'debug', msg }); }
  info(msg) { this.logs.push({ level: 'info', msg }); }
  warn(msg) { this.logs.push({ level: 'warn', msg }); }
  error(msg) { this.logs.push({ level: 'error', msg }); }
}

// Mock do FileManager para testes
class MockFileManager {
  constructor() {
    this.files = new Map();
    this.dirs = new Set();
  }

  async ensureDir(path) {
    this.dirs.add(path);
  }

  async writeFile(path, content) {
    this.files.set(path, content);
  }

  getFiles() {
    return Array.from(this.files.keys());
  }
}

// Mock do HttpClient para testes
class MockHttpClient {
  constructor() {
    this.requests = [];
    this.mockResponses = new Map();
  }

  setHeaders(headers) {
    this.headers = headers;
  }

  async post(endpoint, body) {
    this.requests.push({ endpoint, body });

    const mockResponse = this.mockResponses.get(endpoint);
    if (mockResponse) {
      return mockResponse;
    }

    // Retorna resposta padrão mock
    return { data: [] };
  }

  setMockResponse(endpoint, response) {
    this.mockResponses.set(endpoint, response);
  }
}

console.log('\n='.repeat(70));
console.log('TESTES DE INTEGRAÇÃO - OUTLINE SERVICE');
console.log('='.repeat(70));

// ============================================================================
// SEÇÃO 1: TESTES DE AUTENTICAÇÃO E FACTORY
// ============================================================================
console.log('\n1. Testes de Autenticação e Factory');
console.log('-'.repeat(70));

runTest('OutlineAuthFactory.create() com config válido', () => {
  const OutlineAuthFactory = require('./src/auth/outline-auth-factory');

  const config = {
    apiToken: 'test-token-12345',
    baseUrl: 'https://outline.example.com',
    delay: 100,
    verbose: false
  };

  const service = OutlineAuthFactory.create(config);

  assertNotNull(service, 'Service não deveria ser null');
  assert(typeof service === 'object', 'Service deveria ser um objeto');
});

runTest('OutlineAuthFactory.create() rejeita config sem apiToken', () => {
  const OutlineAuthFactory = require('./src/auth/outline-auth-factory');

  const config = {
    baseUrl: 'https://outline.example.com'
  };

  let errorThrown = false;
  try {
    OutlineAuthFactory.create(config);
  } catch (error) {
    errorThrown = true;
    assertContains(error.message, 'apiToken', 'Erro deveria mencionar apiToken');
  }

  assert(errorThrown, 'Deveria ter lançado erro para config sem apiToken');
});

runTest('OutlineAuthFactory.create() rejeita config sem baseUrl', () => {
  const OutlineAuthFactory = require('./src/auth/outline-auth-factory');

  const config = {
    apiToken: 'test-token-12345'
  };

  let errorThrown = false;
  try {
    OutlineAuthFactory.create(config);
  } catch (error) {
    errorThrown = true;
    assertContains(error.message, 'baseUrl', 'Erro deveria mencionar baseUrl');
  }

  assert(errorThrown, 'Deveria ter lançado erro para config sem baseUrl');
});

runTest('OutlineAuthFactory.create() rejeita URL inválida', () => {
  const OutlineAuthFactory = require('./src/auth/outline-auth-factory');

  const config = {
    apiToken: 'test-token-12345',
    baseUrl: 'not-a-valid-url'
  };

  let errorThrown = false;
  try {
    OutlineAuthFactory.create(config);
  } catch (error) {
    errorThrown = true;
    assertContains(error.message, 'URL', 'Erro deveria mencionar URL');
  }

  assert(errorThrown, 'Deveria ter lançado erro para URL inválida');
});

runTest('OutlineAuthFactory.validate() aceita config válido', () => {
  const OutlineAuthFactory = require('./src/auth/outline-auth-factory');

  const config = {
    apiToken: 'test-token-12345',
    baseUrl: 'https://outline.example.com'
  };

  const validation = OutlineAuthFactory.validate(config);

  assert(validation.valid === true, 'Config válido deveria passar na validação');
  assert(validation.errors.length === 0, 'Não deveria ter erros para config válido');
});

runTest('OutlineAuthFactory.validate() rejeita delay negativo', () => {
  const OutlineAuthFactory = require('./src/auth/outline-auth-factory');

  const config = {
    apiToken: 'test-token-12345',
    baseUrl: 'https://outline.example.com',
    delay: -100
  };

  const validation = OutlineAuthFactory.validate(config);

  assert(validation.valid === false, 'Config com delay negativo deveria falhar');
  assert(validation.errors.length > 0, 'Deveria ter erros na validação');
});

// ============================================================================
// SEÇÃO 2: TESTES DE INICIALIZAÇÃO DO SERVICE
// ============================================================================
console.log('\n2. Testes de Inicialização do Service');
console.log('-'.repeat(70));

runTest('OutlineService inicializa com dependências corretas', () => {
  const OutlineService = require('./src/services/outline-service');

  const mockHttpClient = new MockHttpClient();
  const mockLogger = new MockLogger();
  const mockFileManager = new MockFileManager();
  const mockAuthStrategy = { getHeaders: () => ({ Authorization: 'Bearer test' }) };

  const service = new OutlineService(
    mockHttpClient,
    mockAuthStrategy,
    mockLogger,
    mockFileManager,
    { delay: 100, verbose: false }
  );

  assertNotNull(service, 'Service não deveria ser null');
  assert(service.httpClient === mockHttpClient, 'HttpClient deveria ser injetado');
  assert(service.logger === mockLogger, 'Logger deveria ser injetado');
  assert(service.fileManager === mockFileManager, 'FileManager deveria ser injetado');
});

runTest('OutlineService configura headers de autenticação', () => {
  const OutlineService = require('./src/services/outline-service');

  const mockHttpClient = new MockHttpClient();
  const mockLogger = new MockLogger();
  const mockFileManager = new MockFileManager();
  const mockAuthStrategy = { getHeaders: () => ({ Authorization: 'Bearer secret-token' }) };

  new OutlineService(
    mockHttpClient,
    mockAuthStrategy,
    mockLogger,
    mockFileManager,
    {}
  );

  assertNotNull(mockHttpClient.headers, 'Headers deveriam estar configurados');
  assert(
    mockHttpClient.headers.Authorization === 'Bearer secret-token',
    'Header de autorização deveria estar correto'
  );
});

runTest('OutlineService inicializa cache vazio', () => {
  const OutlineService = require('./src/services/outline-service');

  const mockHttpClient = new MockHttpClient();
  const mockLogger = new MockLogger();
  const mockFileManager = new MockFileManager();
  const mockAuthStrategy = { getHeaders: () => ({}) };

  const service = new OutlineService(
    mockHttpClient,
    mockAuthStrategy,
    mockLogger,
    mockFileManager,
    {}
  );

  const stats = service.getCacheStats();
  assertEquals(stats.size, 0, 'Cache deveria estar vazio inicialmente');
});

// ============================================================================
// SEÇÃO 3: TESTES DE SANITIZAÇÃO
// ============================================================================
console.log('\n3. Testes de Métodos de Sanitização');
console.log('-'.repeat(70));

runTest('sanitizeFilename() - Remove caracteres especiais', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const result = service.sanitizeFilename('Test: File/Name');
  assertEquals(result, 'test--file-name', 'Deveria remover : e /');
});

runTest('sanitizeFilename() - Substitui espaços por hífens', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const result = service.sanitizeFilename('My Document Name');
  assertEquals(result, 'my-document-name', 'Deveria substituir espaços por hífens');
});

runTest('sanitizeFilename() - Converte para lowercase', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const result = service.sanitizeFilename('UPPERCASE');
  assertEquals(result, 'uppercase', 'Deveria converter para lowercase');
});

runTest('sanitizeFilename() - Remove trailing dots (Windows)', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const result = service.sanitizeFilename('filename...');
  assertEquals(result, 'filename', 'Deveria remover dots no final');
});

runTest('sanitizeFilename() - Protege contra path traversal (..)', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const result = service.sanitizeFilename('../../../etc/passwd');
  // Os slashes viram hífens, os .. são removidos
  assertEquals(result, '---etc-passwd', 'Deveria remover path traversal');
});

runTest('sanitizeFilename() - Protege contra leading dots', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const result = service.sanitizeFilename('...hidden');
  assertEquals(result, 'hidden', 'Deveria remover leading dots');
});

runTest('sanitizeFilename() - Retorna "untitled" para input vazio', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const result = service.sanitizeFilename('');
  assertEquals(result, 'untitled', 'Deveria retornar "untitled" para string vazia');
});

runTest('sanitizeFilename() - Retorna "untitled" para null', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const result = service.sanitizeFilename(null);
  assertEquals(result, 'untitled', 'Deveria retornar "untitled" para null');
});

runTest('sanitizeFilename() - Limita comprimento a 255 caracteres', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const longName = 'a'.repeat(300);
  const result = service.sanitizeFilename(longName);
  assert(result.length <= 255, `Nome deveria ter no máximo 255 chars, tem ${result.length}`);
});

runTest('sanitizeFilename() - Remove todos os caracteres inválidos do Windows', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const result = service.sanitizeFilename('file<>:"|?*name');
  // Pipe (|) não está na lista de caracteres inválidos, então só 7 hífens
  assertEquals(result, 'file-------name', 'Deveria substituir todos os caracteres inválidos');
});

runTest('sanitizePath() - Sanitiza collection name', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const result = service.sanitizePath('Engineering Team');
  assertEquals(result, 'engineering-team', 'Deveria sanitizar collection name');
});

runTest('sanitizePath() - Sanitiza collection e document path', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const result = service.sanitizePath('Sales & Marketing', 'API Documentation');
  // & não é um caractere especial que precisa ser substituído
  assertEquals(
    result,
    'sales-&-marketing/api-documentation',
    'Deveria sanitizar ambos os caminhos'
  );
});

runTest('sanitizePath() - Processa múltiplas partes do path', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const result = service.sanitizePath('Collection', 'Folder/Subfolder/Doc');
  assertEquals(
    result,
    'collection/folder/subfolder/doc',
    'Deveria processar múltiplas partes do path'
  );
});

// ============================================================================
// SEÇÃO 4: TESTES DE ESCAPE YAML
// ============================================================================
console.log('\n4. Testes de Escape YAML');
console.log('-'.repeat(70));

runTest('escapeYaml() - Mantém strings simples sem escape', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const result = service.escapeYaml('Simple Title');
  assertEquals(result, 'Simple Title', 'String simples não deveria ser alterada');
});

runTest('escapeYaml() - Escapa strings com dois-pontos', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const result = service.escapeYaml('Title: With Colon');
  assertEquals(result, '"Title: With Colon"', 'Deveria adicionar aspas para dois-pontos');
});

runTest('escapeYaml() - Escapa strings com aspas duplas', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const result = service.escapeYaml('Path with "quotes"');
  assertEquals(result, '"Path with \\"quotes\\""', 'Deveria escapar aspas duplas');
});

runTest('escapeYaml() - Escapa strings iniciadas com hífen', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const result = service.escapeYaml('- List Item');
  assertEquals(result, '"- List Item"', 'Deveria adicionar aspas para strings com hífen inicial');
});

runTest('escapeYaml() - Escapa strings iniciadas com interrogação', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const result = service.escapeYaml('? Question');
  assertEquals(result, '"? Question"', 'Deveria adicionar aspas para strings com ? inicial');
});

runTest('escapeYaml() - Escapa strings com caracteres especiais YAML', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const result = service.escapeYaml('Value with # comment');
  assertEquals(result, '"Value with # comment"', 'Deveria adicionar aspas para #');
});

runTest('escapeYaml() - Não altera valores não-string', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const result = service.escapeYaml(123);
  assertEquals(result, 123, 'Números não deveriam ser alterados');
});

runTest('escapeYaml() - Escapa backslashes corretamente', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const result = service.escapeYaml('Path\\with\\backslash');
  assertEquals(
    result,
    'Path\\with\\backslash',
    'Backslashes sozinhos não precisam escape se não houver outros caracteres especiais'
  );
});

// ============================================================================
// SEÇÃO 5: TESTES DE GERAÇÃO DE MARKDOWN
// ============================================================================
console.log('\n5. Testes de Geração de Markdown');
console.log('-'.repeat(70));

runTest('_generateMarkdown() - Gera frontmatter básico corretamente', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const document = {
    title: 'Test Document',
    id: 'doc123',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z',
    text: 'Document content here'
  };

  const result = service._generateMarkdown(document);

  assertContains(result, '---', 'Deveria conter delimitadores YAML');
  assertContains(result, 'title: Test Document', 'Deveria conter título');
  assertContains(result, 'id: doc123', 'Deveria conter ID');
  assertContains(result, 'created: 2025-01-01T00:00:00Z', 'Deveria conter data de criação');
  assertContains(result, 'updated: 2025-01-02T00:00:00Z', 'Deveria conter data de atualização');
  assertContains(result, 'Document content here', 'Deveria conter o conteúdo');
});

runTest('_generateMarkdown() - Inclui parent ID quando presente', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const document = {
    title: 'Child Document',
    id: 'doc456',
    parentDocumentId: 'parent123',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z',
    text: 'Child content'
  };

  const result = service._generateMarkdown(document);

  assertContains(result, 'parent: parent123', 'Deveria incluir parent ID');
});

runTest('_generateMarkdown() - Escapa título com caracteres especiais YAML', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const document = {
    title: 'Title: With Special Chars',
    id: 'doc789',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z',
    text: 'Content'
  };

  const result = service._generateMarkdown(document);

  assertContains(
    result,
    'title: "Title: With Special Chars"',
    'Título com caracteres especiais deveria ser escapado'
  );
});

// ============================================================================
// SEÇÃO 6: TESTES DE CACHE
// ============================================================================
console.log('\n6. Testes de Cache de Documentos');
console.log('-'.repeat(70));

runTest('getCacheStats() - Retorna estatísticas do cache', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const stats = service.getCacheStats();

  assertNotNull(stats, 'Stats não deveriam ser null');
  assert('size' in stats, 'Stats deveriam ter propriedade size');
  assert('entries' in stats, 'Stats deveriam ter propriedade entries');
  assertEquals(stats.size, 0, 'Cache deveria estar vazio');
});

runTest('clearCache() - Limpa o cache', async () => {
  const OutlineService = require('./src/services/outline-service');

  const mockHttpClient = new MockHttpClient();
  mockHttpClient.setMockResponse('/api/documents.info', {
    data: { id: 'doc1', title: 'Test', text: 'Content' }
  });

  const service = new OutlineService(
    mockHttpClient,
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  // Adiciona algo ao cache fazendo uma requisição
  await service.getDocumentContent('doc1');

  // Verifica que o cache tem conteúdo antes de limpar
  let stats = service.getCacheStats();
  assert(stats.size > 0, 'Cache deveria ter conteúdo antes de limpar');

  // Limpa o cache
  service.clearCache();

  // Verifica que o cache está vazio após limpar
  stats = service.getCacheStats();
  assertEquals(stats.size, 0, 'Cache deveria estar vazio após clearCache()');
});

// ============================================================================
// SEÇÃO 7: TESTES DE API METHODS
// ============================================================================
console.log('\n7. Testes de API Methods');
console.log('-'.repeat(70));

runTest('listCollections() - Retorna lista de coleções com sucesso', async () => {
  const OutlineService = require('./src/services/outline-service');

  const mockHttpClient = new MockHttpClient();
  mockHttpClient.setMockResponse('/api/collections.list', {
    data: [
      { id: 'col1', name: 'Collection 1' },
      { id: 'col2', name: 'Collection 2' }
    ]
  });

  const service = new OutlineService(
    mockHttpClient,
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const collections = await service.listCollections();

  assertEquals(collections.length, 2, 'Deveria retornar 2 coleções');
  assertEquals(collections[0].id, 'col1', 'Primeira coleção deveria ter ID correto');
});

runTest('listCollections() - Retorna array vazio quando não há coleções', async () => {
  const OutlineService = require('./src/services/outline-service');

  const mockHttpClient = new MockHttpClient();
  mockHttpClient.setMockResponse('/api/collections.list', { data: [] });

  const service = new OutlineService(
    mockHttpClient,
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const collections = await service.listCollections();

  assertEquals(collections.length, 0, 'Deveria retornar array vazio');
});

runTest('listCollections() - Lança erro quando API falha', async () => {
  const OutlineService = require('./src/services/outline-service');

  const mockHttpClient = new MockHttpClient();
  mockHttpClient.post = async () => {
    throw new Error('API Error');
  };

  const service = new OutlineService(
    mockHttpClient,
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  let errorThrown = false;
  try {
    await service.listCollections();
  } catch (error) {
    errorThrown = true;
    assertContains(error.message, 'API Error', 'Deveria propagar erro da API');
  }

  assert(errorThrown, 'Deveria lançar erro quando API falha');
});

runTest('listCollections() - Timeout na rede', async () => {
  const OutlineService = require('./src/services/outline-service');

  const mockHttpClient = new MockHttpClient();
  mockHttpClient.post = async () => {
    throw new Error('Network timeout');
  };

  const service = new OutlineService(
    mockHttpClient,
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  let errorThrown = false;
  try {
    await service.listCollections();
  } catch (error) {
    errorThrown = true;
    assertContains(error.message, 'timeout', 'Deveria conter mensagem de timeout');
  }

  assert(errorThrown, 'Deveria lançar erro de timeout');
});

runTest('getCollection() - Retorna coleção com sucesso', async () => {
  const OutlineService = require('./src/services/outline-service');

  const mockHttpClient = new MockHttpClient();
  mockHttpClient.setMockResponse('/api/collections.info', {
    data: { id: 'col1', name: 'Test Collection' }
  });

  const service = new OutlineService(
    mockHttpClient,
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const collection = await service.getCollection('col1');

  assertEquals(collection.id, 'col1', 'ID da coleção deveria estar correto');
  assertEquals(collection.name, 'Test Collection', 'Nome da coleção deveria estar correto');
});

runTest('getCollection() - Lança TypeError para ID inválido', async () => {
  const OutlineService = require('./src/services/outline-service');

  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  let errorThrown = false;
  try {
    await service.getCollection(123);
  } catch (error) {
    errorThrown = true;
    assert(error instanceof TypeError, 'Deveria ser TypeError');
    assertContains(error.message, 'string', 'Mensagem deveria mencionar string');
  }

  assert(errorThrown, 'Deveria lançar TypeError para ID não-string');
});

runTest('getCollection() - Lança erro para ID null', async () => {
  const OutlineService = require('./src/services/outline-service');

  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  let errorThrown = false;
  try {
    await service.getCollection(null);
  } catch (error) {
    errorThrown = true;
    assert(error instanceof TypeError, 'Deveria ser TypeError');
  }

  assert(errorThrown, 'Deveria lançar erro para ID null');
});

runTest('getCollection() - Lança erro para string vazia', async () => {
  const OutlineService = require('./src/services/outline-service');

  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  let errorThrown = false;
  try {
    await service.getCollection('   ');
  } catch (error) {
    errorThrown = true;
    assertContains(error.message, 'vazio', 'Mensagem deveria mencionar string vazia');
  }

  assert(errorThrown, 'Deveria lançar erro para string vazia');
});

runTest('getCollection() - Lança erro para tipo errado', async () => {
  const OutlineService = require('./src/services/outline-service');

  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  let errorThrown = false;
  try {
    await service.getCollection({ id: 'col1' });
  } catch (error) {
    errorThrown = true;
    assert(error instanceof TypeError, 'Deveria ser TypeError');
  }

  assert(errorThrown, 'Deveria lançar erro para objeto ao invés de string');
});

runTest('getCollectionDocuments() - Retorna documentos com sucesso', async () => {
  const OutlineService = require('./src/services/outline-service');

  const mockHttpClient = new MockHttpClient();
  mockHttpClient.setMockResponse('/api/collections.documents', {
    data: [
      { id: 'doc1', title: 'Document 1' },
      { id: 'doc2', title: 'Document 2' }
    ]
  });

  const service = new OutlineService(
    mockHttpClient,
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const documents = await service.getCollectionDocuments('col1');

  assertEquals(documents.length, 2, 'Deveria retornar 2 documentos');
  assertEquals(documents[0].id, 'doc1', 'Primeiro documento deveria ter ID correto');
});

runTest('getCollectionDocuments() - Retorna estrutura hierárquica aninhada', async () => {
  const OutlineService = require('./src/services/outline-service');

  const mockHttpClient = new MockHttpClient();
  mockHttpClient.setMockResponse('/api/collections.documents', {
    data: [
      {
        id: 'doc1',
        title: 'Parent',
        children: [
          { id: 'doc2', title: 'Child' }
        ]
      }
    ]
  });

  const service = new OutlineService(
    mockHttpClient,
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const documents = await service.getCollectionDocuments('col1');

  assertEquals(documents.length, 1, 'Deveria retornar 1 documento raiz');
  assert(documents[0].children, 'Documento deveria ter filhos');
  assertEquals(documents[0].children.length, 1, 'Deveria ter 1 filho');
});

runTest('getCollectionDocuments() - Lança erro para ID inválido', async () => {
  const OutlineService = require('./src/services/outline-service');

  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  let errorThrown = false;
  try {
    await service.getCollectionDocuments(null);
  } catch (error) {
    errorThrown = true;
    assert(error instanceof TypeError, 'Deveria ser TypeError');
  }

  assert(errorThrown, 'Deveria lançar erro para ID inválido');
});

runTest('getCollectionDocuments() - Lança erro quando API falha', async () => {
  const OutlineService = require('./src/services/outline-service');

  const mockHttpClient = new MockHttpClient();
  mockHttpClient.post = async () => {
    throw new Error('API Error');
  };

  const service = new OutlineService(
    mockHttpClient,
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  let errorThrown = false;
  try {
    await service.getCollectionDocuments('col1');
  } catch (error) {
    errorThrown = true;
    assertContains(error.message, 'API Error', 'Deveria propagar erro da API');
  }

  assert(errorThrown, 'Deveria lançar erro quando API falha');
});

runTest('getDocumentContent() - Cache hit retorna do cache', async () => {
  const OutlineService = require('./src/services/outline-service');

  const mockHttpClient = new MockHttpClient();
  let apiCallCount = 0;
  mockHttpClient.post = async (endpoint, body) => {
    apiCallCount++;
    return { data: { id: body.id, title: 'Test Doc', text: 'Content' } };
  };

  const service = new OutlineService(
    mockHttpClient,
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  // Primeira chamada - cache miss
  await service.getDocumentContent('doc1');
  // Segunda chamada - cache hit
  await service.getDocumentContent('doc1');

  assertEquals(apiCallCount, 1, 'API deveria ser chamada apenas uma vez (cache hit na segunda)');

  const stats = service.getCacheStats();
  assertEquals(stats.hits, 1, 'Deveria ter 1 cache hit');
});

runTest('getDocumentContent() - Cache miss busca da API', async () => {
  const OutlineService = require('./src/services/outline-service');

  const mockHttpClient = new MockHttpClient();
  mockHttpClient.setMockResponse('/api/documents.info', {
    data: { id: 'doc1', title: 'Test Doc', text: 'Content' }
  });

  const service = new OutlineService(
    mockHttpClient,
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const doc = await service.getDocumentContent('doc1');

  assertEquals(doc.id, 'doc1', 'Documento deveria ter ID correto');

  const stats = service.getCacheStats();
  assertEquals(stats.misses, 1, 'Deveria ter 1 cache miss');
});

runTest('getDocumentContent() - Lança erro para ID inválido', async () => {
  const OutlineService = require('./src/services/outline-service');

  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  let errorThrown = false;
  try {
    await service.getDocumentContent(123);
  } catch (error) {
    errorThrown = true;
    assert(error instanceof TypeError, 'Deveria ser TypeError');
  }

  assert(errorThrown, 'Deveria lançar erro para ID não-string');
});

runTest('getDocumentContent() - Lança erro quando API falha', async () => {
  const OutlineService = require('./src/services/outline-service');

  const mockHttpClient = new MockHttpClient();
  mockHttpClient.post = async () => {
    throw new Error('API Error');
  };

  const service = new OutlineService(
    mockHttpClient,
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  let errorThrown = false;
  try {
    await service.getDocumentContent('doc1');
  } catch (error) {
    errorThrown = true;
    assertContains(error.message, 'API Error', 'Deveria propagar erro da API');
  }

  assert(errorThrown, 'Deveria lançar erro quando API falha');
});

runTest('getDocumentContent() - Estatísticas de cache corretas', async () => {
  const OutlineService = require('./src/services/outline-service');

  const mockHttpClient = new MockHttpClient();
  mockHttpClient.post = async (endpoint, body) => {
    return { data: { id: body.id, title: 'Test Doc', text: 'Content' } };
  };

  const service = new OutlineService(
    mockHttpClient,
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  // 3 documentos diferentes
  await service.getDocumentContent('doc1');
  await service.getDocumentContent('doc2');
  await service.getDocumentContent('doc3');

  // 2 cache hits
  await service.getDocumentContent('doc1');
  await service.getDocumentContent('doc2');

  const stats = service.getCacheStats();
  assertEquals(stats.hits, 2, 'Deveria ter 2 cache hits');
  assertEquals(stats.misses, 3, 'Deveria ter 3 cache misses');
  assertEquals(stats.size, 3, 'Cache deveria ter 3 documentos');
});

// ============================================================================
// SEÇÃO 8: TESTES DE DOWNLOAD METHODS
// ============================================================================
console.log('\n8. Testes de Download Methods');
console.log('-'.repeat(70));

runTest('sanitizeFilename() - Remove caracteres Unicode inválidos', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const result = service.sanitizeFilename('Тест测试🔥');
  assertContains(result, 'тест', 'Deveria preservar Cyrillic em lowercase');
  assertContains(result, '🔥', 'Deveria preservar emoji');
});

runTest('sanitizeFilename() - Nomes muito longos são truncados', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const longName = 'a'.repeat(300);
  const result = service.sanitizeFilename(longName);

  assert(result.length <= 255, `Nome deveria ter máximo 255 chars, tem ${result.length}`);
  assertEquals(result.length, 255, 'Nome deveria ser exatamente 255 chars');
});

runTest('sanitizeFilename() - Múltiplos caracteres especiais consecutivos', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const result = service.sanitizeFilename('file:::///name');
  assertEquals(result, 'file------name', 'Múltiplos caracteres especiais viram múltiplos hífens');
});

runTest('sanitizeFilename() - Previne path traversal com múltiplos níveis', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const result = service.sanitizeFilename('../../../../../../etc/passwd');
  assert(!result.includes('..'), 'Não deveria conter ..');
  assert(!result.includes('/'), 'Não deveria conter /');
});

runTest('sanitizeFilename() - Nomes reservados do Windows (CON)', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const result = service.sanitizeFilename('CON');
  assertEquals(result, 'con', 'Nome reservado deveria ser convertido para lowercase');
});

runTest('sanitizeFilename() - Input vazio após sanitização', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const result = service.sanitizeFilename('...');
  assertEquals(result, 'untitled', 'Apenas dots deveriam virar "untitled"');
});

runTest('escapeYaml() - Caracteres especiais YAML múltiplos', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const result = service.escapeYaml('Title: With # and & special chars');
  assertEquals(result, '"Title: With # and & special chars"', 'Deveria adicionar aspas');
});

runTest('escapeYaml() - Aspas duplas e simples combinadas', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const result = service.escapeYaml('Text with "double" and \'single\' quotes');
  assertContains(result, '\\"', 'Deveria escapar aspas duplas');
});

runTest('escapeYaml() - Newlines são preservados', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const result = service.escapeYaml('Line 1\nLine 2');
  // Newlines não são caracteres especiais YAML que requerem escape
  assertEquals(result, 'Line 1\nLine 2', 'Newlines deveriam ser preservados');
});

runTest('escapeYaml() - Dois-pontos no meio da string', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const result = service.escapeYaml('http://example.com');
  assertEquals(result, '"http://example.com"', 'URLs com : deveriam ser escapadas');
});

runTest('escapeYaml() - Valores null e undefined', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const resultNull = service.escapeYaml(null);
  const resultUndefined = service.escapeYaml(undefined);

  assertEquals(resultNull, null, 'null deveria retornar null');
  assertEquals(resultUndefined, undefined, 'undefined deveria retornar undefined');
});

runTest('_generateMarkdown() - Documento completo com todos os campos', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const document = {
    title: 'Complete Document',
    id: 'doc123',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z',
    parentDocumentId: 'parent123',
    text: 'Document content here'
  };

  const result = service._generateMarkdown(document);

  assertContains(result, '---', 'Deveria conter delimitadores YAML');
  assertContains(result, 'title: Complete Document', 'Deveria conter título');
  assertContains(result, 'id: doc123', 'Deveria conter ID');
  assertContains(result, 'created: 2025-01-01T00:00:00Z', 'Deveria conter data de criação');
  assertContains(result, 'updated: 2025-01-02T00:00:00Z', 'Deveria conter data de atualização');
  assertContains(result, 'parent: parent123', 'Deveria conter parent ID');
  assertContains(result, 'Document content here', 'Deveria conter o conteúdo');
});

runTest('_generateMarkdown() - Documento mínimo sem parent', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const document = {
    title: 'Minimal Document',
    id: 'doc456',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z',
    text: 'Content'
  };

  const result = service._generateMarkdown(document);

  assertContains(result, 'title: Minimal Document', 'Deveria conter título');
  assert(!result.includes('parent:'), 'Não deveria conter campo parent');
});

runTest('_generateMarkdown() - Título com caracteres especiais', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const document = {
    title: 'Title: With Special # Characters',
    id: 'doc789',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z',
    text: 'Content'
  };

  const result = service._generateMarkdown(document);

  assertContains(result, '"Title: With Special # Characters"', 'Título deveria estar escapado');
});

runTest('downloadDocument() - Download com sucesso sem filhos', async () => {
  const OutlineService = require('./src/services/outline-service');

  const mockHttpClient = new MockHttpClient();
  mockHttpClient.setMockResponse('/api/documents.info', {
    data: { id: 'doc1', title: 'Test Doc', text: 'Content', createdAt: '2025-01-01', updatedAt: '2025-01-02' }
  });

  const mockFileManager = new MockFileManager();
  const service = new OutlineService(
    mockHttpClient,
    { getHeaders: () => ({}) },
    new MockLogger(),
    mockFileManager,
    {}
  );

  const document = { id: 'doc1', title: 'Test Doc', children: [] };
  const stats = await service.downloadDocument(document, 'Collection');

  assertEquals(stats.success, 1, 'Deveria ter 1 sucesso');
  assertEquals(stats.failed, 0, 'Não deveria ter falhas');
  assert(mockFileManager.files.size > 0, 'Deveria ter criado arquivo');
});

runTest('downloadDocument() - Download com filhos cria subpasta', async () => {
  const OutlineService = require('./src/services/outline-service');

  const mockHttpClient = new MockHttpClient();
  mockHttpClient.post = async (endpoint, body) => {
    return {
      data: {
        id: body.id,
        title: `Doc ${body.id}`,
        text: 'Content',
        createdAt: '2025-01-01',
        updatedAt: '2025-01-02'
      }
    };
  };

  const mockFileManager = new MockFileManager();
  const service = new OutlineService(
    mockHttpClient,
    { getHeaders: () => ({}) },
    new MockLogger(),
    mockFileManager,
    {}
  );

  const document = {
    id: 'parent',
    title: 'Parent Doc',
    children: [
      { id: 'child1', title: 'Child 1', children: [] }
    ]
  };

  const stats = await service.downloadDocument(document, 'Collection');

  assertEquals(stats.success, 2, 'Deveria ter 2 sucessos (parent + child)');
  assert(mockFileManager.dirs.size > 0, 'Deveria ter criado diretórios');
});

runTest('downloadDocument() - Download sem filhos não cria subpasta', async () => {
  const OutlineService = require('./src/services/outline-service');

  const mockHttpClient = new MockHttpClient();
  mockHttpClient.setMockResponse('/api/documents.info', {
    data: { id: 'doc1', title: 'Test Doc', text: 'Content', createdAt: '2025-01-01', updatedAt: '2025-01-02' }
  });

  const mockFileManager = new MockFileManager();
  const service = new OutlineService(
    mockHttpClient,
    { getHeaders: () => ({}) },
    new MockLogger(),
    mockFileManager,
    {}
  );

  const document = { id: 'doc1', title: 'Test Doc' };
  await service.downloadDocument(document, 'Collection');

  // Verifica que apenas o diretório base foi criado, não subpastas para o documento
  const createdDirs = Array.from(mockFileManager.dirs);
  assertEquals(createdDirs.length, 1, 'Deveria criar apenas diretório base');
});

runTest('downloadDocument() - Erro ao escrever arquivo', async () => {
  const OutlineService = require('./src/services/outline-service');

  const mockHttpClient = new MockHttpClient();
  mockHttpClient.setMockResponse('/api/documents.info', {
    data: { id: 'doc1', title: 'Test Doc', text: 'Content', createdAt: '2025-01-01', updatedAt: '2025-01-02' }
  });

  const mockFileManager = new MockFileManager();
  mockFileManager.writeFile = async () => {
    throw new Error('Write error');
  };

  const service = new OutlineService(
    mockHttpClient,
    { getHeaders: () => ({}) },
    new MockLogger(),
    mockFileManager,
    {}
  );

  const document = { id: 'doc1', title: 'Test Doc', children: [] };
  const stats = await service.downloadDocument(document, 'Collection');

  assertEquals(stats.success, 0, 'Não deveria ter sucesso');
  assertEquals(stats.failed, 1, 'Deveria ter 1 falha');
  assertEquals(stats.errors.length, 1, 'Deveria ter 1 erro');
});

runTest('downloadDocument() - Sanitização aplicada ao nome do arquivo', async () => {
  const OutlineService = require('./src/services/outline-service');

  const mockHttpClient = new MockHttpClient();
  mockHttpClient.setMockResponse('/api/documents.info', {
    data: { id: 'doc1', title: 'Test: Doc/Name', text: 'Content', createdAt: '2025-01-01', updatedAt: '2025-01-02' }
  });

  const mockFileManager = new MockFileManager();
  const service = new OutlineService(
    mockHttpClient,
    { getHeaders: () => ({}) },
    new MockLogger(),
    mockFileManager,
    {}
  );

  const document = { id: 'doc1', title: 'Test: Doc/Name', children: [] };
  await service.downloadDocument(document, 'Collection');

  const files = mockFileManager.getFiles();
  assert(files.length > 0, 'Deveria ter criado arquivo');
  assertContains(files[0], 'test--doc-name', 'Nome do arquivo deveria estar sanitizado');
});

runTest('processDocumentTree() - Árvore com único nível', async () => {
  const OutlineService = require('./src/services/outline-service');

  const mockHttpClient = new MockHttpClient();
  mockHttpClient.post = async (endpoint, body) => {
    return {
      data: {
        id: body.id,
        title: `Doc ${body.id}`,
        text: 'Content',
        createdAt: '2025-01-01',
        updatedAt: '2025-01-02'
      }
    };
  };

  const service = new OutlineService(
    mockHttpClient,
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const documents = [
    { id: 'doc1', title: 'Doc 1', children: [] },
    { id: 'doc2', title: 'Doc 2', children: [] }
  ];

  const stats = await service.processDocumentTree(documents, 'Collection');

  assertEquals(stats.success, 2, 'Deveria processar 2 documentos');
  assertEquals(stats.failed, 0, 'Não deveria ter falhas');
});

runTest('processDocumentTree() - Estrutura aninhada com múltiplos níveis', async () => {
  const OutlineService = require('./src/services/outline-service');

  const mockHttpClient = new MockHttpClient();
  mockHttpClient.post = async (endpoint, body) => {
    return {
      data: {
        id: body.id,
        title: `Doc ${body.id}`,
        text: 'Content',
        createdAt: '2025-01-01',
        updatedAt: '2025-01-02'
      }
    };
  };

  const service = new OutlineService(
    mockHttpClient,
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const documents = [
    {
      id: 'parent',
      title: 'Parent',
      children: [
        {
          id: 'child',
          title: 'Child',
          children: [
            { id: 'grandchild', title: 'Grandchild', children: [] }
          ]
        }
      ]
    }
  ];

  const stats = await service.processDocumentTree(documents, 'Collection');

  assertEquals(stats.success, 3, 'Deveria processar 3 documentos (parent + child + grandchild)');
});

runTest('processDocumentTree() - Árvore vazia retorna stats zerados', async () => {
  const OutlineService = require('./src/services/outline-service');

  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const stats = await service.processDocumentTree([], 'Collection');

  assertEquals(stats.success, 0, 'Não deveria ter sucessos');
  assertEquals(stats.failed, 0, 'Não deveria ter falhas');
  assertEquals(stats.errors.length, 0, 'Não deveria ter erros');
});

runTest('processDocumentTree() - Tratamento de erro não para processamento', async () => {
  const OutlineService = require('./src/services/outline-service');

  const mockHttpClient = new MockHttpClient();
  let callCount = 0;
  mockHttpClient.post = async (endpoint, body) => {
    callCount++;
    if (body.id === 'doc2') {
      throw new Error('API Error');
    }
    return {
      data: {
        id: body.id,
        title: `Doc ${body.id}`,
        text: 'Content',
        createdAt: '2025-01-01',
        updatedAt: '2025-01-02'
      }
    };
  };

  const service = new OutlineService(
    mockHttpClient,
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const documents = [
    { id: 'doc1', title: 'Doc 1', children: [] },
    { id: 'doc2', title: 'Doc 2', children: [] },
    { id: 'doc3', title: 'Doc 3', children: [] }
  ];

  const stats = await service.processDocumentTree(documents, 'Collection');

  assertEquals(stats.success, 2, 'Deveria ter 2 sucessos');
  assertEquals(stats.failed, 1, 'Deveria ter 1 falha');
});

runTest('downloadAllDocuments() - Download com sucesso', async () => {
  const OutlineService = require('./src/services/outline-service');

  const mockHttpClient = new MockHttpClient();
  mockHttpClient.setMockResponse('/api/collections.list', {
    data: [{ id: 'col1', name: 'Collection 1' }]
  });
  mockHttpClient.setMockResponse('/api/collections.info', {
    data: { id: 'col1', name: 'Collection 1' }
  });
  mockHttpClient.setMockResponse('/api/collections.documents', {
    data: [{ id: 'doc1', title: 'Doc 1', children: [] }]
  });
  mockHttpClient.setMockResponse('/api/documents.info', {
    data: { id: 'doc1', title: 'Doc 1', text: 'Content', createdAt: '2025-01-01', updatedAt: '2025-01-02' }
  });

  const service = new OutlineService(
    mockHttpClient,
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const summary = await service.downloadAllDocuments('./output');

  assertEquals(summary.totalDocs, 1, 'Deveria ter 1 documento total');
  assertEquals(summary.success, 1, 'Deveria ter 1 sucesso');
  assertEquals(summary.failed, 0, 'Não deveria ter falhas');
});

runTest('downloadAllDocuments() - Filtro de coleções', async () => {
  const OutlineService = require('./src/services/outline-service');

  const mockHttpClient = new MockHttpClient();
  mockHttpClient.setMockResponse('/api/collections.list', {
    data: [
      { id: 'col1', name: 'Collection 1' },
      { id: 'col2', name: 'Collection 2' }
    ]
  });

  const service = new OutlineService(
    mockHttpClient,
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  // Intercepta getCollection para verificar quais foram chamadas
  let calledCollections = [];
  service.getCollection = async (id) => {
    calledCollections.push(id);
    return { id, name: `Collection ${id}` };
  };

  service.getCollectionDocuments = async (id) => [];

  await service.downloadAllDocuments('./output', ['col1']);

  assert(calledCollections.length === 1, 'Deveria processar apenas 1 coleção');
  assertEquals(calledCollections[0], 'col1', 'Deveria processar apenas col1');
});

runTest('downloadAllDocuments() - Nenhuma coleção encontrada', async () => {
  const OutlineService = require('./src/services/outline-service');

  const mockHttpClient = new MockHttpClient();
  mockHttpClient.setMockResponse('/api/collections.list', { data: [] });

  const service = new OutlineService(
    mockHttpClient,
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const summary = await service.downloadAllDocuments('./output');

  assertEquals(summary.totalDocs, 0, 'Não deveria ter documentos');
  assertEquals(summary.collections.length, 0, 'Não deveria ter coleções');
});

runTest('downloadAllDocuments() - Falha parcial em uma coleção não para as outras', async () => {
  const OutlineService = require('./src/services/outline-service');

  const mockHttpClient = new MockHttpClient();

  let collectionCallCount = 0;
  mockHttpClient.post = async (endpoint, body) => {
    if (endpoint === '/api/collections.list') {
      return {
        data: [
          { id: 'col1', name: 'Collection 1' },
          { id: 'col2', name: 'Collection 2' }
        ]
      };
    }

    if (endpoint === '/api/collections.info') {
      return { data: { id: body.id, name: `Collection ${body.id}` } };
    }

    if (endpoint === '/api/collections.documents') {
      collectionCallCount++;
      if (body.id === 'col1') {
        throw new Error('Collection error');
      }
      return { data: [] };
    }

    return { data: [] };
  };

  const service = new OutlineService(
    mockHttpClient,
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const summary = await service.downloadAllDocuments('./output');

  // Pelo menos uma coleção deveria ser processada (col2), e col1 pode estar na lista de erros
  assert(summary.collections.length >= 1, 'Deveria processar pelo menos uma coleção');
  assert(collectionCallCount === 2, 'Deveria tentar ambas coleções');
});

// ============================================================================
// SEÇÃO 9: TESTES DE FEATURES NOVAS
// ============================================================================
console.log('\n9. Testes de Features Novas (LRU Cache, Validação, etc.)');
console.log('-'.repeat(70));

runTest('LRU Cache - Eviction quando maxCacheSize é excedido', async () => {
  const OutlineService = require('./src/services/outline-service');

  const mockHttpClient = new MockHttpClient();
  mockHttpClient.post = async (endpoint, body) => {
    return {
      data: {
        id: body.id,
        title: `Doc ${body.id}`,
        text: 'Content'
      }
    };
  };

  // Cache com tamanho máximo de 3
  const service = new OutlineService(
    mockHttpClient,
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    { maxCacheSize: 3 }
  );

  // Adiciona 4 documentos - o primeiro deveria ser removido
  await service.getDocumentContent('doc1');
  await service.getDocumentContent('doc2');
  await service.getDocumentContent('doc3');
  await service.getDocumentContent('doc4'); // Deveria causar eviction de doc1

  const stats = service.getCacheStats();
  assertEquals(stats.size, 3, 'Cache deveria ter tamanho máximo de 3');
  assertEquals(stats.evictions, 1, 'Deveria ter 1 eviction');
  assert(!stats.entries.includes('doc1'), 'doc1 deveria ter sido removido');
  assert(stats.entries.includes('doc4'), 'doc4 deveria estar no cache');
});

runTest('LRU Cache - Acesso move item para o final (mais recente)', async () => {
  const OutlineService = require('./src/services/outline-service');

  const mockHttpClient = new MockHttpClient();
  mockHttpClient.post = async (endpoint, body) => {
    return {
      data: {
        id: body.id,
        title: `Doc ${body.id}`,
        text: 'Content'
      }
    };
  };

  const service = new OutlineService(
    mockHttpClient,
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    { maxCacheSize: 3 }
  );

  // Adiciona 3 documentos
  await service.getDocumentContent('doc1');
  await service.getDocumentContent('doc2');
  await service.getDocumentContent('doc3');

  // Acessa doc1 novamente (move para o final)
  await service.getDocumentContent('doc1');

  // Adiciona doc4 - doc2 deveria ser removido (não doc1)
  await service.getDocumentContent('doc4');

  const stats = service.getCacheStats();
  assert(stats.entries.includes('doc1'), 'doc1 deveria ainda estar no cache');
  assert(!stats.entries.includes('doc2'), 'doc2 deveria ter sido removido (LRU)');
});

runTest('Cache Statistics - Hit rate é calculado corretamente', async () => {
  const OutlineService = require('./src/services/outline-service');

  const mockHttpClient = new MockHttpClient();
  mockHttpClient.post = async (endpoint, body) => {
    return {
      data: {
        id: body.id,
        title: `Doc ${body.id}`,
        text: 'Content'
      }
    };
  };

  const service = new OutlineService(
    mockHttpClient,
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  // 2 misses
  await service.getDocumentContent('doc1');
  await service.getDocumentContent('doc2');

  // 3 hits
  await service.getDocumentContent('doc1');
  await service.getDocumentContent('doc2');
  await service.getDocumentContent('doc1');

  const stats = service.getCacheStats();

  // Hit rate = 3 hits / 5 total = 60%
  assertEquals(stats.hitRate, '60.00%', 'Hit rate deveria ser 60%');
});

runTest('Cache Statistics - Hit rate zero quando não há requests', () => {
  const OutlineService = require('./src/services/outline-service');

  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const stats = service.getCacheStats();
  assertEquals(stats.hitRate, '0.00%', 'Hit rate deveria ser 0% quando não há requests');
});

runTest('Parameter Validation - getCollection lança TypeError para tipo errado', async () => {
  const OutlineService = require('./src/services/outline-service');

  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  let errorThrown = false;
  try {
    await service.getCollection(['invalid']);
  } catch (error) {
    errorThrown = true;
    assert(error instanceof TypeError, 'Deveria ser TypeError');
    assertContains(error.message, 'string', 'Mensagem deveria mencionar string');
  }

  assert(errorThrown, 'Deveria lançar TypeError');
});

runTest('Parameter Validation - getCollection lança Error para string vazia', async () => {
  const OutlineService = require('./src/services/outline-service');

  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  let errorThrown = false;
  try {
    await service.getCollection('');
  } catch (error) {
    errorThrown = true;
    assert(error instanceof TypeError, 'Deveria ser TypeError');
    // Aceita tanto "vazio" quanto "obrigatório" na mensagem
    const hasValidMessage = error.message.includes('vazio') || error.message.includes('obrigatório');
    assert(hasValidMessage, 'Mensagem deveria mencionar vazio ou obrigatório');
  }

  assert(errorThrown, 'Deveria lançar Error para string vazia');
});

runTest('Parameter Validation - getDocumentContent valida tipo de parâmetro', async () => {
  const OutlineService = require('./src/services/outline-service');

  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  let errorThrown = false;
  try {
    await service.getDocumentContent(null);
  } catch (error) {
    errorThrown = true;
    assert(error instanceof TypeError, 'Deveria ser TypeError');
  }

  assert(errorThrown, 'Deveria lançar TypeError para null');
});

runTest('Parameter Validation - downloadAllDocuments valida outputDir', async () => {
  const OutlineService = require('./src/services/outline-service');

  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  let errorThrown = false;
  try {
    await service.downloadAllDocuments('');
  } catch (error) {
    errorThrown = true;
    assert(error instanceof TypeError, 'Deveria ser TypeError');
    // Aceita tanto "vazio" quanto "obrigatório" na mensagem
    const hasValidMessage = error.message.includes('vazio') || error.message.includes('obrigatório');
    assert(hasValidMessage, 'Mensagem deveria mencionar vazio ou obrigatório');
  }

  assert(errorThrown, 'Deveria lançar erro para outputDir vazio');
});

runTest('Parameter Validation - downloadAllDocuments valida collectionFilter', async () => {
  const OutlineService = require('./src/services/outline-service');

  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  let errorThrown = false;
  try {
    await service.downloadAllDocuments('./output', 'not-an-array');
  } catch (error) {
    errorThrown = true;
    assert(error instanceof TypeError, 'Deveria ser TypeError');
    assertContains(error.message, 'array', 'Mensagem deveria mencionar array');
  }

  assert(errorThrown, 'Deveria lançar TypeError para collectionFilter não-array');
});

runTest('Duplicate API Call Elimination - collectionTrees cache evita chamadas duplicadas', async () => {
  const OutlineService = require('./src/services/outline-service');

  const mockHttpClient = new MockHttpClient();
  let documentsCallCount = 0;

  mockHttpClient.post = async (endpoint, body) => {
    if (endpoint === '/api/collections.list') {
      return { data: [{ id: 'col1', name: 'Collection 1' }] };
    }

    if (endpoint === '/api/collections.info') {
      return { data: { id: 'col1', name: 'Collection 1' } };
    }

    if (endpoint === '/api/collections.documents') {
      documentsCallCount++;
      return { data: [] };
    }

    return { data: {} };
  };

  const service = new OutlineService(
    mockHttpClient,
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  await service.downloadAllDocuments('./output');

  // Deveria chamar collections.documents apenas uma vez (primeira passagem)
  // e reutilizar na segunda passagem
  assertEquals(documentsCallCount, 1, 'API collections.documents deveria ser chamada apenas uma vez');
});

runTest('Cache Statistics - Métricas completas após múltiplas operações', async () => {
  const OutlineService = require('./src/services/outline-service');

  const mockHttpClient = new MockHttpClient();
  mockHttpClient.post = async (endpoint, body) => {
    return {
      data: {
        id: body.id,
        title: `Doc ${body.id}`,
        text: 'Content'
      }
    };
  };

  const service = new OutlineService(
    mockHttpClient,
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    { maxCacheSize: 2 }
  );

  // Operações variadas
  await service.getDocumentContent('doc1'); // miss
  await service.getDocumentContent('doc2'); // miss
  await service.getDocumentContent('doc1'); // hit
  await service.getDocumentContent('doc3'); // miss + eviction de doc2

  const stats = service.getCacheStats();

  assertEquals(stats.size, 2, 'Cache deveria ter 2 documentos');
  assertEquals(stats.maxSize, 2, 'maxSize deveria ser 2');
  assertEquals(stats.hits, 1, 'Deveria ter 1 hit');
  assertEquals(stats.misses, 3, 'Deveria ter 3 misses');
  assertEquals(stats.evictions, 1, 'Deveria ter 1 eviction');
  assert(Array.isArray(stats.entries), 'entries deveria ser array');
  assertEquals(stats.entries.length, 2, 'entries deveria ter 2 elementos');
});

// ============================================================================
// SEÇÃO 10: CASOS EXTREMOS
// ============================================================================
console.log('\n10. Testes de Casos Extremos');
console.log('-'.repeat(70));

runTest('sanitizeFilename() - String vazia vira "untitled"', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const result = service.sanitizeFilename('');
  assertEquals(result, 'untitled', 'String vazia deveria virar "untitled"');
});

runTest('sanitizeFilename() - Apenas caracteres especiais vira string de hífens', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const result = service.sanitizeFilename(':::///???');
  // Caracteres especiais viram hífens, não "untitled"
  assertEquals(result, '---------', 'Apenas caracteres especiais deveria virar hífens');
});

runTest('sanitizeFilename() - Unicode é preservado', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const result = service.sanitizeFilename('Documento em Português');
  assertEquals(result, 'documento-em-português', 'Unicode deveria ser preservado');
});

runTest('sanitizeFilename() - Emojis são preservados', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const result = service.sanitizeFilename('Doc 🚀 Rocket');
  assertContains(result, '🚀', 'Emojis deveriam ser preservados');
});

runTest('escapeYaml() - String vazia permanece vazia', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const result = service.escapeYaml('');
  assertEquals(result, '', 'String vazia deveria permanecer vazia');
});

runTest('escapeYaml() - null retorna null', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const result = service.escapeYaml(null);
  assertEquals(result, null, 'null deveria retornar null');
});

runTest('sanitizePath() - Path com múltiplos separadores', () => {
  const OutlineService = require('./src/services/outline-service');
  const service = new OutlineService(
    new MockHttpClient(),
    { getHeaders: () => ({}) },
    new MockLogger(),
    new MockFileManager(),
    {}
  );

  const result = service.sanitizePath('Collection', 'Path//With///Multiple////Separators');
  // Separadores vazios deveriam ser filtrados
  assertContains(result, 'collection', 'Deveria conter collection');
  assert(!result.includes('//'), 'Não deveria ter separadores duplos');
});

// ============================================================================
// RESUMO DOS TESTES
// ============================================================================
// Aguarda todos os testes assíncronos antes de mostrar o resumo
Promise.all(asyncTests).then(() => {
  console.log('\n' + '='.repeat(70));
  console.log('RESUMO DOS TESTES');
  console.log('='.repeat(70));
  console.log(`Total de testes executados: ${testsRun}`);
  console.log(`✓ Testes aprovados: ${testsPassed}`);
  console.log(`✗ Testes reprovados: ${testsFailed}`);
  console.log('='.repeat(70));

  if (testsFailed > 0) {
    console.log('\nFalhas detalhadas:');
    failures.forEach((failure, index) => {
      console.log(`\n${index + 1}. ${failure.test}`);
      console.log(`   ${failure.error}`);
    });
    console.log('\n' + '='.repeat(70));
    process.exit(1);
  } else {
    console.log('\n✓ Todos os testes passaram com sucesso!\n');
    process.exit(0);
  }
}).catch(error => {
  console.error('\nErro ao executar testes assíncronos:', error);
  process.exit(1);
});
