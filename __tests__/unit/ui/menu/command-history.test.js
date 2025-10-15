/**
 * Testes unitários para CommandHistory
 * Requirements: 11.5, REQ-7
 */

const CommandHistory = require('../../../../src/ui/menu/components/CommandHistory');
const path = require('path');
const os = require('os');

// Mock fs module before requiring it
jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    promises: {
      mkdir: jest.fn(),
      writeFile: jest.fn(),
      readFile: jest.fn(),
      access: jest.fn(),
      chmod: jest.fn(),
      copyFile: jest.fn(),
    },
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
  };
});

const fs = require('fs').promises;
const fsSync = require('fs');

describe('CommandHistory', () => {
  let history;
  let testHistoryPath;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup default mock implementations
    fs.mkdir.mockResolvedValue();
    fs.writeFile.mockResolvedValue();
    fs.chmod.mockResolvedValue();
    fs.copyFile.mockResolvedValue();
    fs.access.mockRejectedValue(new Error('ENOENT')); // Default: file doesn't exist
    fs.readFile.mockResolvedValue('{}');

    fsSync.existsSync.mockReturnValue(false); // Default: file doesn't exist
    fsSync.readFileSync.mockReturnValue('{}');

    // Use temporary path for tests
    testHistoryPath = path.join(os.tmpdir(), 'test-history.json');
    history = new CommandHistory(testHistoryPath);
  });

  describe('Initialization', () => {
    test('should initialize with empty records', () => {
      expect(history.records).toEqual([]);
      expect(history.maxSize).toBe(CommandHistory.MAX_SIZE);
    });

    test('should use default history path if not provided', () => {
      const defaultHistory = new CommandHistory();
      expect(defaultHistory.historyPath).toBe(CommandHistory.DEFAULT_HISTORY_PATH);
    });

    test('should use custom history path when provided', () => {
      expect(history.historyPath).toBe(testHistoryPath);
    });

    test('should have correct static constants', () => {
      expect(CommandHistory.MAX_SIZE).toBe(100);
      expect(CommandHistory.FILE_VERSION).toBe('1.0');
    });
  });

  describe('add() - Adding execution records', () => {
    test('should add successful execution', () => {
      const record = history.add({
        commandName: 'n8n:download',
        exitCode: 0,
        duration: 5000,
      });

      expect(record.commandName).toBe('n8n:download');
      expect(record.status).toBe('success');
      expect(record.exitCode).toBe(0);
      expect(record.duration).toBe(5000);
      expect(record.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(history.records.length).toBe(1);
    });

    test('should add failed execution', () => {
      const record = history.add({
        commandName: 'n8n:upload',
        exitCode: 1,
        duration: 1000,
        error: 'Connection timeout',
      });

      expect(record.status).toBe('failure');
      expect(record.exitCode).toBe(1);
      expect(record.error).toBe('Connection timeout');
      expect(history.records.length).toBe(1);
    });

    test('should add record to beginning of list (most recent first)', () => {
      history.add({ commandName: 'cmd1', exitCode: 0 });
      history.add({ commandName: 'cmd2', exitCode: 0 });
      history.add({ commandName: 'cmd3', exitCode: 0 });

      expect(history.records[0].commandName).toBe('cmd3');
      expect(history.records[1].commandName).toBe('cmd2');
      expect(history.records[2].commandName).toBe('cmd1');
    });

    test('should use default duration of 0 if not provided', () => {
      const record = history.add({
        commandName: 'cmd',
        exitCode: 0,
      });

      expect(record.duration).toBe(0);
    });

    test('should not include error field for successful executions', () => {
      const record = history.add({
        commandName: 'cmd',
        exitCode: 0,
      });

      expect(record.error).toBeUndefined();
    });

    test('should throw error if commandName is missing', () => {
      expect(() => {
        history.add({ exitCode: 0 });
      }).toThrow('commandName is required and must be a string');
    });

    test('should throw error if commandName is not a string', () => {
      expect(() => {
        history.add({ commandName: 123, exitCode: 0 });
      }).toThrow('commandName is required and must be a string');
    });

    test('should throw error if exitCode is missing', () => {
      expect(() => {
        history.add({ commandName: 'cmd' });
      }).toThrow('exitCode is required and must be a number');
    });

    test('should throw error if exitCode is not a number', () => {
      expect(() => {
        history.add({ commandName: 'cmd', exitCode: 'invalid' });
      }).toThrow('exitCode is required and must be a number');
    });

    test('should generate valid ISO 8601 timestamp', () => {
      const record = history.add({
        commandName: 'cmd',
        exitCode: 0,
      });

      const timestamp = new Date(record.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.toString()).not.toBe('Invalid Date');
    });
  });

  describe('Auto-pruning (size limit)', () => {
    test('should remove oldest entries when exceeding max size', () => {
      // Add 105 entries (exceeds MAX_SIZE of 100)
      for (let i = 1; i <= 105; i++) {
        history.add({
          commandName: `cmd${i}`,
          exitCode: 0,
        });
      }

      // Should keep only 100 most recent
      expect(history.records.length).toBe(100);

      // Most recent should be cmd105
      expect(history.records[0].commandName).toBe('cmd105');

      // Oldest should be cmd6 (cmd1-5 were pruned)
      expect(history.records[99].commandName).toBe('cmd6');
    });

    test('should auto-prune after each add', () => {
      // Fill to max
      for (let i = 1; i <= 100; i++) {
        history.add({ commandName: `cmd${i}`, exitCode: 0 });
      }

      expect(history.records.length).toBe(100);

      // Add one more
      history.add({ commandName: 'cmd101', exitCode: 0 });

      // Should still be 100
      expect(history.records.length).toBe(100);

      // cmd1 should be removed
      expect(history.records.find(r => r.commandName === 'cmd1')).toBeUndefined();

      // cmd101 should be at the beginning
      expect(history.records[0].commandName).toBe('cmd101');
    });
  });

  describe('getAll()', () => {
    test('should return all records', () => {
      history.add({ commandName: 'cmd1', exitCode: 0 });
      history.add({ commandName: 'cmd2', exitCode: 0 });

      const all = history.getAll();
      expect(all.length).toBe(2);
    });

    test('should return copy of records (not reference)', () => {
      history.add({ commandName: 'cmd1', exitCode: 0 });

      const all = history.getAll();
      all.push({ commandName: 'fake', exitCode: 0 });

      // Original should not be modified
      expect(history.records.length).toBe(1);
    });

    test('should return empty array when no records', () => {
      expect(history.getAll()).toEqual([]);
    });
  });

  describe('getRecent()', () => {
    beforeEach(() => {
      // Add 20 test records
      for (let i = 1; i <= 20; i++) {
        history.add({ commandName: `cmd${i}`, exitCode: 0 });
      }
    });

    test('should return last 10 records by default', () => {
      const recent = history.getRecent();
      expect(recent.length).toBe(10);
      expect(recent[0].commandName).toBe('cmd20'); // Most recent
    });

    test('should return specified number of records', () => {
      const recent = history.getRecent(5);
      expect(recent.length).toBe(5);
      expect(recent[0].commandName).toBe('cmd20');
      expect(recent[4].commandName).toBe('cmd16');
    });

    test('should return all records if count exceeds total', () => {
      const recent = history.getRecent(100);
      expect(recent.length).toBe(20);
    });

    test('should throw error for invalid count', () => {
      expect(() => history.getRecent(0)).toThrow('count must be a positive number');
      expect(() => history.getRecent(-5)).toThrow('count must be a positive number');
      expect(() => history.getRecent('invalid')).toThrow('count must be a positive number');
    });
  });

  describe('getLastExecution()', () => {
    beforeEach(() => {
      history.add({ commandName: 'n8n:download', exitCode: 0, duration: 1000 });
      history.add({ commandName: 'outline:download', exitCode: 1, duration: 2000 });
      history.add({ commandName: 'n8n:download', exitCode: 0, duration: 3000 });
    });

    test('should return most recent execution of specified command', () => {
      const last = history.getLastExecution('n8n:download');
      expect(last).not.toBeNull();
      expect(last.commandName).toBe('n8n:download');
      expect(last.duration).toBe(3000); // Most recent
    });

    test('should return null for command that was never executed', () => {
      const last = history.getLastExecution('nonexistent:command');
      expect(last).toBeNull();
    });

    test('should throw error if commandName is missing', () => {
      expect(() => history.getLastExecution()).toThrow('commandName is required and must be a string');
    });

    test('should throw error if commandName is not a string', () => {
      expect(() => history.getLastExecution(123)).toThrow('commandName is required and must be a string');
    });
  });

  describe('getStatistics()', () => {
    test('should return empty statistics for empty history', () => {
      const stats = history.getStatistics();

      expect(stats.totalExecutions).toBe(0);
      expect(stats.successCount).toBe(0);
      expect(stats.failureCount).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.mostUsed).toEqual([]);
    });

    test('should calculate correct statistics', () => {
      // Add mix of successes and failures
      history.add({ commandName: 'n8n:download', exitCode: 0 });
      history.add({ commandName: 'n8n:download', exitCode: 0 });
      history.add({ commandName: 'n8n:download', exitCode: 1 });
      history.add({ commandName: 'outline:download', exitCode: 0 });
      history.add({ commandName: 'outline:download', exitCode: 1 });

      const stats = history.getStatistics();

      expect(stats.totalExecutions).toBe(5);
      expect(stats.successCount).toBe(3);
      expect(stats.failureCount).toBe(2);
      expect(stats.successRate).toBe(0.6);
    });

    test('should calculate most used commands correctly', () => {
      history.add({ commandName: 'cmd1', exitCode: 0 });
      history.add({ commandName: 'cmd2', exitCode: 0 });
      history.add({ commandName: 'cmd1', exitCode: 0 });
      history.add({ commandName: 'cmd3', exitCode: 0 });
      history.add({ commandName: 'cmd1', exitCode: 0 });

      const stats = history.getStatistics();

      // cmd1 should be most used with count 3
      expect(stats.mostUsed[0]).toEqual({ command: 'cmd1', count: 3 });

      // cmd2 and cmd3 both have count 1 (order not guaranteed for equal counts)
      const otherCommands = stats.mostUsed.slice(1);
      expect(otherCommands).toHaveLength(2);
      expect(otherCommands).toContainEqual({ command: 'cmd2', count: 1 });
      expect(otherCommands).toContainEqual({ command: 'cmd3', count: 1 });
    });

    test('should sort most used commands by count (descending)', () => {
      history.add({ commandName: 'rare', exitCode: 0 });
      history.add({ commandName: 'common', exitCode: 0 });
      history.add({ commandName: 'common', exitCode: 0 });
      history.add({ commandName: 'common', exitCode: 0 });
      history.add({ commandName: 'medium', exitCode: 0 });
      history.add({ commandName: 'medium', exitCode: 0 });

      const stats = history.getStatistics();

      expect(stats.mostUsed[0].command).toBe('common');
      expect(stats.mostUsed[0].count).toBe(3);
      expect(stats.mostUsed[1].command).toBe('medium');
      expect(stats.mostUsed[1].count).toBe(2);
      expect(stats.mostUsed[2].command).toBe('rare');
      expect(stats.mostUsed[2].count).toBe(1);
    });

    test('should calculate 100% success rate', () => {
      history.add({ commandName: 'cmd', exitCode: 0 });
      history.add({ commandName: 'cmd', exitCode: 0 });

      const stats = history.getStatistics();
      expect(stats.successRate).toBe(1.0);
    });

    test('should calculate 0% success rate', () => {
      history.add({ commandName: 'cmd', exitCode: 1 });
      history.add({ commandName: 'cmd', exitCode: 2 });

      const stats = history.getStatistics();
      expect(stats.successRate).toBe(0);
    });
  });

  describe('clear()', () => {
    test('should remove all records', () => {
      history.add({ commandName: 'cmd1', exitCode: 0 });
      history.add({ commandName: 'cmd2', exitCode: 0 });

      const removedCount = history.clear();

      expect(removedCount).toBe(2);
      expect(history.records).toEqual([]);
    });

    test('should return 0 when clearing empty history', () => {
      const removedCount = history.clear();
      expect(removedCount).toBe(0);
    });
  });

  describe('save() - File persistence', () => {
    beforeEach(() => {
      // Mock successful file operations
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();
      fs.chmod.mockResolvedValue();
    });

    test('should create directory if it does not exist', async () => {
      await history.save();

      const expectedDir = path.dirname(testHistoryPath);
      expect(fs.mkdir).toHaveBeenCalledWith(expectedDir, { recursive: true });
    });

    test('should write history to file with correct structure', async () => {
      history.add({ commandName: 'cmd1', exitCode: 0 });
      history.add({ commandName: 'cmd2', exitCode: 1 });

      await history.save();

      expect(fs.writeFile).toHaveBeenCalled();
      const writeCall = fs.writeFile.mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1]);

      expect(writtenContent.version).toBe('1.0');
      expect(writtenContent.maxSize).toBe(100);
      expect(writtenContent.records.length).toBe(2);
      expect(writtenContent.lastUpdate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    test('should set file permissions to 0600 on Unix', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'linux' });

      await history.save();

      expect(fs.chmod).toHaveBeenCalledWith(testHistoryPath, 0o600);

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    test('should not set permissions on Windows', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });

      await history.save();

      expect(fs.chmod).not.toHaveBeenCalled();

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    test('should throw error if save fails', async () => {
      fs.writeFile.mockRejectedValue(new Error('Disk full'));

      await expect(history.save()).rejects.toThrow('Failed to save history: Disk full');
    });
  });

  describe('load() - File persistence', () => {
    test('should initialize empty if file does not exist', async () => {
      fs.access.mockRejectedValue(new Error('ENOENT'));

      await history.load();

      expect(history.records).toEqual([]);
    });

    test('should load valid history file', async () => {
      const validHistory = {
        version: '1.0',
        maxSize: 100,
        lastUpdate: '2025-10-01T12:00:00.000Z',
        records: [
          {
            commandName: 'cmd1',
            timestamp: '2025-10-01T12:00:00.000Z',
            status: 'success',
            exitCode: 0,
            duration: 1000,
          },
        ],
      };

      fs.access.mockResolvedValue();
      fs.readFile.mockResolvedValue(JSON.stringify(validHistory));

      await history.load();

      expect(history.records.length).toBe(1);
      expect(history.records[0].commandName).toBe('cmd1');
    });

    test('should handle corrupted JSON file', async () => {
      fs.access.mockResolvedValue();
      fs.readFile.mockResolvedValue('{ invalid json }');
      fs.copyFile.mockResolvedValue();

      await history.load();

      expect(history.records).toEqual([]);
      expect(fs.copyFile).toHaveBeenCalled(); // Backup created
    });

    test('should handle invalid file structure', async () => {
      const invalidHistory = {
        version: '1.0',
        // Missing records array
      };

      fs.access.mockResolvedValue();
      fs.readFile.mockResolvedValue(JSON.stringify(invalidHistory));
      fs.copyFile.mockResolvedValue();

      await history.load();

      expect(history.records).toEqual([]);
    });

    test('should apply size limit when loading', async () => {
      const records = [];
      for (let i = 1; i <= 150; i++) {
        records.push({
          commandName: `cmd${i}`,
          timestamp: '2025-10-01T12:00:00.000Z',
          status: 'success',
          exitCode: 0,
          duration: 0,
        });
      }

      const oversizedHistory = {
        version: '1.0',
        maxSize: 100,
        records,
      };

      fs.access.mockResolvedValue();
      fs.readFile.mockResolvedValue(JSON.stringify(oversizedHistory));

      await history.load();

      expect(history.records.length).toBe(100);
    });

    test('should update maxSize from file', async () => {
      const historyWithCustomSize = {
        version: '1.0',
        maxSize: 50,
        records: [],
      };

      fs.access.mockResolvedValue();
      fs.readFile.mockResolvedValue(JSON.stringify(historyWithCustomSize));

      await history.load();

      expect(history.maxSize).toBe(50);
    });
  });

  describe('Timestamp format validation', () => {
    test('should accept valid ISO 8601 timestamps', async () => {
      const validHistory = {
        version: '1.0',
        records: [
          {
            commandName: 'cmd',
            timestamp: '2025-10-01T12:30:45.123Z',
            status: 'success',
            exitCode: 0,
          },
        ],
      };

      fs.access.mockResolvedValue();
      fs.readFile.mockResolvedValue(JSON.stringify(validHistory));

      await history.load();

      expect(history.records.length).toBe(1);
    });

    test('should reject invalid timestamp formats', async () => {
      const invalidHistory = {
        version: '1.0',
        records: [
          {
            commandName: 'cmd',
            timestamp: '2025-10-01 12:30:45', // Invalid format
            status: 'success',
            exitCode: 0,
          },
        ],
      };

      fs.access.mockResolvedValue();
      fs.readFile.mockResolvedValue(JSON.stringify(invalidHistory));
      fs.copyFile.mockResolvedValue();

      await history.load();

      expect(history.records).toEqual([]);
    });
  });

  describe('Edge cases', () => {
    test('should handle record with all optional fields', () => {
      const record = history.add({
        commandName: 'cmd',
        exitCode: 1,
        duration: 5000,
        error: 'Something went wrong',
      });

      expect(record.error).toBe('Something went wrong');
      expect(record.duration).toBe(5000);
    });

    test('should handle multiple records with same command name', () => {
      history.add({ commandName: 'cmd', exitCode: 0 });
      history.add({ commandName: 'cmd', exitCode: 1 });
      history.add({ commandName: 'cmd', exitCode: 0 });

      expect(history.records.length).toBe(3);

      const stats = history.getStatistics();
      expect(stats.mostUsed[0]).toEqual({ command: 'cmd', count: 3 });
    });

    test('should handle very long command names', () => {
      const longName = 'a'.repeat(1000);
      const record = history.add({
        commandName: longName,
        exitCode: 0,
      });

      expect(record.commandName).toBe(longName);
    });

    test('should handle special characters in command names', () => {
      const specialName = 'cmd:with-special@chars#123';
      const record = history.add({
        commandName: specialName,
        exitCode: 0,
      });

      expect(record.commandName).toBe(specialName);
    });

    test('should handle zero duration', () => {
      const record = history.add({
        commandName: 'cmd',
        exitCode: 0,
        duration: 0,
      });

      expect(record.duration).toBe(0);
    });

    test('should handle very large durations', () => {
      const record = history.add({
        commandName: 'cmd',
        exitCode: 0,
        duration: 999999999,
      });

      expect(record.duration).toBe(999999999);
    });

    test('should handle non-zero exit codes for failures', () => {
      const record1 = history.add({ commandName: 'cmd', exitCode: 1 });
      const record2 = history.add({ commandName: 'cmd', exitCode: 127 });
      const record3 = history.add({ commandName: 'cmd', exitCode: -1 });

      expect(record1.status).toBe('failure');
      expect(record2.status).toBe('failure');
      expect(record3.status).toBe('failure');
    });
  });

  describe('loadSync() - Synchronous loading', () => {
    test('should load synchronously', () => {
      const validHistory = {
        version: '1.0',
        records: [
          {
            commandName: 'cmd',
            timestamp: '2025-10-01T12:00:00.000Z',
            status: 'success',
            exitCode: 0,
            duration: 0,
          },
        ],
      };

      fsSync.existsSync.mockReturnValue(true);
      fsSync.readFileSync.mockReturnValue(JSON.stringify(validHistory));

      history.loadSync();

      expect(history.records.length).toBe(1);
    });

    test('should handle missing file in sync mode', () => {
      fsSync.existsSync.mockReturnValue(false);

      history.loadSync();

      expect(history.records).toEqual([]);
    });

    test('should handle corrupted JSON in sync mode', () => {
      fsSync.existsSync.mockReturnValue(true);
      fsSync.readFileSync.mockReturnValue('{ invalid }');

      history.loadSync();

      expect(history.records).toEqual([]);
    });
  });
});
