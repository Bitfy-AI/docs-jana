/**
 * @fileoverview Testes do comando configure
 */

// Mock dependencies that use ESM
jest.mock('../../../../../scripts/admin/n8n-transfer/cli/ui/components', () => ({
  title: jest.fn((text) => text),
  success: jest.fn((text) => text),
  error: jest.fn((text) => text),
  warning: jest.fn((text) => text),
  inputUrl: jest.fn(),
  input: jest.fn(),
  confirm: jest.fn(),
  withSpinner: jest.fn()
}));

jest.mock('../../../../../scripts/admin/n8n-transfer/cli/i18n', () => ({
  t: jest.fn((key) => key)
}));

jest.mock('../../../../../scripts/admin/n8n-transfer/core/http-client', () => {
  return jest.fn().mockImplementation(() => ({
    testConnection: jest.fn()
  }));
});

const configure = require('../../../../../scripts/admin/n8n-transfer/cli/commands/configure');

describe('Configure Command', () => {
  it('deve exportar função', () => {
    expect(typeof configure).toBe('function');
  });

  it('deve ser função async', () => {
    expect(configure.constructor.name).toBe('AsyncFunction');
  });
});
