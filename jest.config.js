/** @type {import('jest').Config} */
module.exports = {
  // Ambiente de teste
  testEnvironment: 'node',

  // Padrões de arquivos de teste
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/__tests__/**/*.spec.js'
  ],

  // Diretórios a ignorar
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.claude/',
    '/docs/',
    '/backup/'
  ],

  // Cobertura de código
  collectCoverage: false, // Ativar apenas quando explicitamente solicitado
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],

  // Thresholds de cobertura (serão enforçados no CI/CD)
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // Cobertura crítica para componentes de segurança
    './src/security/**/*.js': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  },

  // Arquivos a incluir na cobertura
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
    '!**/node_modules/**',
    '!**/__tests__/**'
  ],

  // Configuração de timeout
  testTimeout: 10000, // 10 segundos

  // Verbose output
  verbose: true,

  // Setup files
  // setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],

  // Transformações
  transform: {},

  // Módulos a mockar automaticamente
  // automock: false,

  // Limpar mocks entre testes
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Detectar vazamentos de memória
  detectLeaks: false,

  // Reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './test-results',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ],

  // Configuração de notificações
  notify: false,
  notifyMode: 'failure-change',

  // Máximo de workers em paralelo (otimização)
  maxWorkers: '50%'
};
