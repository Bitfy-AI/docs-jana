/**
 * @fileoverview Testes do comando transfer
 */

// Mock dependencies that use ESM
jest.mock('../../../../../scripts/admin/n8n-transfer/cli/ui/components', () => ({
  title: jest.fn((text) => text),
  success: jest.fn((text) => text),
  error: jest.fn((text) => text),
  info: jest.fn((text) => text),
  createTable: jest.fn(),
  input: jest.fn(),
  select: jest.fn(),
  confirm: jest.fn(),
  multiSelect: jest.fn(),
  inputNumber: jest.fn(),
  createSpinner: jest.fn(() => ({
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn(),
    fail: jest.fn()
  }))
}));

jest.mock('../../../../../scripts/admin/n8n-transfer/cli/i18n', () => ({
  t: jest.fn((key) => key)
}));

jest.mock('../../../../../scripts/admin/n8n-transfer/core/transfer-manager', () => {
  return jest.fn().mockImplementation(() => ({
    getProgress: jest.fn(),
    transfer: jest.fn()
  }));
});

jest.mock('../../../../../scripts/admin/n8n-transfer/cli/ui/progress-bar', () => {
  return jest.fn().mockImplementation(() => ({
    increment: jest.fn(),
    stop: jest.fn()
  }));
});

const transfer = require('../../../../../scripts/admin/n8n-transfer/cli/commands/transfer');

describe('Transfer Command', () => {
  it('deve exportar função', () => {
    expect(typeof transfer).toBe('function');
  });

  it('deve ser função async', () => {
    expect(transfer.constructor.name).toBe('AsyncFunction');
  });
});
