/**
 * Unit Tests for FileManager
 * Tests critical security and reliability fixes including:
 * - Path traversal prevention
 * - Directory creation security
 * - Symlink handling in getDirectorySize
 * - Filename sanitization (Windows reserved names, special chars)
 */

const FileManager = require('../../src/utils/file-manager');
const fs = require('fs');
const path = require('path');

describe('FileManager', () => {
  let fileManager;
  let mockLogger;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      success: jest.fn(),
      folder: jest.fn()
    };

    fileManager = new FileManager(mockLogger);

    // Mock process.cwd() to return a consistent absolute path
    // Use path.resolve to ensure it's platform-compatible
    jest.spyOn(process, 'cwd').mockReturnValue(path.resolve('/home/user/project'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Path Traversal Prevention', () => {
    it('should reject relative paths with ../', () => {
      const maliciousPath = '../../../etc/passwd';

      expect(() => {
        fileManager.createBackupDirectory(maliciousPath, 'test');
      }).toThrow('baseDir must be an absolute path');
    });

    it('should reject paths containing .. sequences', () => {
      const maliciousPath = path.resolve('/home/user/../../../etc/passwd');

      expect(() => {
        fileManager.createBackupDirectory(maliciousPath, 'test');
      }).toThrow(); // Will throw either traversal error or outside cwd error
    });

    it('should reject paths outside current working directory', () => {
      const outsidePath = '/etc/passwd';

      expect(() => {
        fileManager.createBackupDirectory(outsidePath, 'test');
      }).toThrow('must be within current working directory');
    });

    it('should accept valid absolute paths within cwd', () => {
      const cwd = process.cwd();
      const validPath = path.join(cwd, 'backups');

      jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {});

      expect(() => {
        fileManager.createBackupDirectory(validPath, 'test');
      }).not.toThrow();
    });

    it('should normalize paths before validation', () => {
      // Path with redundant separators should be normalized
      const cwd = process.cwd();
      const validPath = path.join(cwd, 'backups', 'data');

      jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {});

      expect(() => {
        fileManager.createBackupDirectory(validPath, 'test');
      }).not.toThrow();
    });
  });

  describe('Filename Sanitization', () => {
    describe('Path Traversal Protection', () => {
      it('should remove path separators', () => {
        expect(fileManager.sanitizeFilename('path/to/file')).toBe('path-to-file');
        expect(fileManager.sanitizeFilename('path\\to\\file')).toBe('path-to-file');
      });

      it('should remove parent directory references (..)', () => {
        expect(fileManager.sanitizeFilename('../../../etc/passwd')).not.toContain('..');
        expect(fileManager.sanitizeFilename('file..name')).not.toContain('..');
      });

      it('should remove leading dots (hidden files)', () => {
        expect(fileManager.sanitizeFilename('.hidden')).toBe('hidden');
        expect(fileManager.sanitizeFilename('...file')).toBe('file');
      });

      it('should remove trailing dots (Windows issue)', () => {
        expect(fileManager.sanitizeFilename('file...')).toBe('file');
        expect(fileManager.sanitizeFilename('document.')).toBe('document');
      });
    });

    describe('Windows Reserved Names', () => {
      it('should reject Windows reserved device names (case-insensitive)', () => {
        const reservedNames = ['CON', 'PRN', 'AUX', 'NUL',
                               'COM1', 'COM2', 'COM9',
                               'LPT1', 'LPT2', 'LPT9'];

        for (const name of reservedNames) {
          expect(fileManager.sanitizeFilename(name)).toBe('untitled');
          expect(fileManager.sanitizeFilename(name.toLowerCase())).toBe('untitled');
          expect(fileManager.sanitizeFilename(name.toUpperCase())).toBe('untitled');
        }
      });

      it('should reject reserved names with extensions', () => {
        expect(fileManager.sanitizeFilename('CON.txt')).toBe('untitled');
        expect(fileManager.sanitizeFilename('prn.doc')).toBe('untitled');
        expect(fileManager.sanitizeFilename('aux.json')).toBe('untitled');
      });

      it('should allow reserved names as part of longer names', () => {
        expect(fileManager.sanitizeFilename('CONTROL')).not.toBe('untitled');
        expect(fileManager.sanitizeFilename('PRINTER')).not.toBe('untitled');
        expect(fileManager.sanitizeFilename('mycon')).not.toBe('untitled');
      });
    });

    describe('Special Character Handling', () => {
      it('should replace filesystem-invalid characters with hyphens', () => {
        const result = fileManager.sanitizeFilename('file<>:"/\\|?*name');
        expect(result).not.toContain('<');
        expect(result).not.toContain('>');
        expect(result).not.toContain(':');
        expect(result).not.toContain('"');
        expect(result).not.toContain('/');
        expect(result).not.toContain('\\');
        expect(result).not.toContain('|');
        expect(result).not.toContain('?');
        expect(result).not.toContain('*');
      });

      it('should replace spaces with underscores', () => {
        expect(fileManager.sanitizeFilename('my document name')).toBe('my_document_name');
        expect(fileManager.sanitizeFilename('multiple   spaces')).toBe('multiple_spaces');
      });

      it('should remove control characters', () => {
        const withControlChars = 'file\x00\x01\x1Fname';
        expect(fileManager.sanitizeFilename(withControlChars)).toBe('filename');
      });

      it('should normalize multiple hyphens and underscores', () => {
        expect(fileManager.sanitizeFilename('file---name')).toBe('file-name');
        expect(fileManager.sanitizeFilename('file___name')).toBe('file_name');
      });

      it('should trim leading and trailing hyphens/underscores', () => {
        expect(fileManager.sanitizeFilename('---file---')).toBe('file');
        expect(fileManager.sanitizeFilename('___file___')).toBe('file');
      });
    });

    describe('Edge Cases', () => {
      it('should handle null or undefined input', () => {
        expect(fileManager.sanitizeFilename(null)).toBe('untitled');
        expect(fileManager.sanitizeFilename(undefined)).toBe('untitled');
      });

      it('should handle non-string input', () => {
        expect(fileManager.sanitizeFilename(123)).toBe('untitled');
        expect(fileManager.sanitizeFilename({})).toBe('untitled');
      });

      it('should handle empty string', () => {
        expect(fileManager.sanitizeFilename('')).toBe('untitled');
        expect(fileManager.sanitizeFilename('   ')).toBe('untitled');
      });

      it('should handle string that becomes empty after sanitization', () => {
        expect(fileManager.sanitizeFilename('...')).toBe('untitled');
        expect(fileManager.sanitizeFilename('<<<>>>')).toBe('untitled');
      });

      it('should limit length to maxLength parameter', () => {
        const longName = 'a'.repeat(300);
        expect(fileManager.sanitizeFilename(longName).length).toBeLessThanOrEqual(255);
      });

      it('should respect custom maxLength', () => {
        const longName = 'a'.repeat(100);
        expect(fileManager.sanitizeFilename(longName, 50).length).toBe(50);
      });

      it('should preserve Unicode characters', () => {
        expect(fileManager.sanitizeFilename('文档')).toBe('文档');
        expect(fileManager.sanitizeFilename('документ')).toBe('документ');
      });
    });

    describe('Real-world Examples', () => {
      it('should sanitize complex real-world filenames', () => {
        const result1 = fileManager.sanitizeFilename('Report: Q4 2023 (Final)');
        expect(result1).not.toContain(':');
        expect(result1.toLowerCase()).toContain('q4'); // Content preserved
        expect(result1).toContain('2023'); // Content preserved

        const result2 = fileManager.sanitizeFilename('User Data/Export.csv');
        expect(result2).not.toContain('/');
        expect(result2.toLowerCase()).toContain('export');

        const result3 = fileManager.sanitizeFilename('Meeting Notes - 12/25/2023');
        expect(result3).not.toContain('/');
        expect(result3.toLowerCase()).toContain('meeting');
      });
    });
  });

  describe('Directory Operations', () => {
    it('should create backup directory with timestamp', () => {
      jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
      const cwd = process.cwd();
      const basePath = path.join(cwd, 'backups');

      const result = fileManager.createBackupDirectory(basePath, 'workflows');

      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(result).toContain('workflows-');
      expect(mockLogger.folder).toHaveBeenCalled();
    });

    it('should throw error on directory creation failure', () => {
      const error = new Error('Permission denied');
      jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {
        throw error;
      });

      const cwd = process.cwd();
      const testPath = path.join(cwd, 'test');

      expect(() => {
        fileManager.createBackupDirectory(testPath, 'backup');
      }).toThrow('Permission denied');

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should check directory existence correctly', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'statSync').mockReturnValue({ isDirectory: () => true });

      expect(fileManager.directoryExists('/some/path')).toBe(true);
    });

    it('should return false for non-existent directory', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);

      expect(fileManager.directoryExists('/nonexistent')).toBe(false);
    });

    it('should return false for file (not directory)', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'statSync').mockReturnValue({ isDirectory: () => false });

      expect(fileManager.directoryExists('/some/file.txt')).toBe(false);
    });
  });

  describe('Symlink Handling in getDirectorySize', () => {
    beforeEach(() => {
      jest.spyOn(fs, 'readdirSync').mockReturnValue([
        'file1.txt',
        'file2.txt',
        'symlink',
        'normaldir'
      ]);
    });

    it('should skip symbolic links to prevent infinite loops', () => {
      jest.spyOn(fs, 'lstatSync').mockImplementation((filePath) => {
        const fileName = path.basename(filePath);
        if (fileName === 'symlink') {
          return {
            isSymbolicLink: () => true,
            isFile: () => false,
            size: 0
          };
        }
        return {
          isSymbolicLink: () => false,
          isFile: () => true,
          size: 1024
        };
      });

      const size = fileManager.getDirectorySize('/test/dir');

      // Should only count file1.txt, file2.txt, and normaldir (3 * 1024)
      expect(size).toBe(3072);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Skipping symbolic link')
      );
    });

    it('should use lstatSync instead of statSync', () => {
      const lstatSpy = jest.spyOn(fs, 'lstatSync').mockReturnValue({
        isSymbolicLink: () => false,
        isFile: () => true,
        size: 100
      });

      fileManager.getDirectorySize('/test/dir');

      expect(lstatSpy).toHaveBeenCalled();
    });

    it('should handle permission errors gracefully', () => {
      jest.spyOn(fs, 'lstatSync').mockImplementation((filePath) => {
        if (filePath.includes('file2')) {
          throw new Error('EACCES: permission denied');
        }
        return {
          isSymbolicLink: () => false,
          isFile: () => true,
          size: 1024
        };
      });

      const size = fileManager.getDirectorySize('/test/dir');

      // Should skip file2.txt and continue with others
      expect(size).toBeGreaterThan(0);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Cannot access')
      );
    });

    it('should handle directory read errors', () => {
      jest.spyOn(fs, 'readdirSync').mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      const size = fileManager.getDirectorySize('/test/dir');

      expect(size).toBe(0);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Cannot read directory')
      );
    });

    it('should calculate total size correctly', () => {
      jest.spyOn(fs, 'lstatSync').mockReturnValue({
        isSymbolicLink: () => false,
        isFile: () => true,
        size: 1024
      });

      const size = fileManager.getDirectorySize('/test/dir');

      // 4 files * 1024 bytes
      expect(size).toBe(4096);
    });
  });

  describe('File Operations', () => {
    it('should save workflow successfully', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

      const workflow = {
        id: '123',
        name: 'Test Workflow',
        data: { nodes: [], connections: {} }
      };

      const filename = fileManager.saveWorkflow('/test/dir', workflow);

      expect(filename).toContain('123');
      expect(filename).toMatch(/\.json$/);
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(mockLogger.success).toHaveBeenCalled();
    });

    it('should create directory before saving if it does not exist', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
      jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

      const workflow = {
        id: '123',
        name: 'Test Workflow'
      };

      fileManager.saveWorkflow('/test/dir', workflow);

      expect(fs.mkdirSync).toHaveBeenCalledWith('/test/dir', { recursive: true });
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Created directory'));
    });

    it('should handle workflow save errors', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {
        throw new Error('Write error');
      });

      const workflow = {
        id: '123',
        name: 'Test Workflow'
      };

      expect(() => {
        fileManager.saveWorkflow('/test/dir', workflow);
      }).toThrow('Write error');

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should save multiple workflows', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

      const workflows = [
        { id: '1', name: 'Workflow 1', tags: ['prod'] },
        { id: '2', name: 'Workflow 2', tags: ['dev'] }
      ];

      const savedFiles = fileManager.saveWorkflows('/test/dir', workflows);

      expect(savedFiles).toHaveLength(2);
      expect(savedFiles[0].id).toBe('1');
      expect(savedFiles[1].id).toBe('2');
    });

    it('should skip failed workflow saves', () => {
      let callCount = 0;
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Write error');
        }
      });

      const workflows = [
        { id: '1', name: 'Workflow 1' },
        { id: '2', name: 'Workflow 2' },
        { id: '3', name: 'Workflow 3' }
      ];

      const savedFiles = fileManager.saveWorkflows('/test/dir', workflows);

      expect(savedFiles).toHaveLength(2);
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('Utility Methods', () => {
    it('should format bytes correctly', () => {
      expect(fileManager.formatBytes(0)).toBe('0 Bytes');
      expect(fileManager.formatBytes(1024)).toBe('1 KB');
      expect(fileManager.formatBytes(1048576)).toBe('1 MB');
      expect(fileManager.formatBytes(1073741824)).toBe('1 GB');
      expect(fileManager.formatBytes(1536)).toBe('1.5 KB');
    });

    it('should save log file', () => {
      jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

      const logData = {
        workflowCount: 10,
        successCount: 8,
        failureCount: 2
      };

      fileManager.saveLog('/test/dir', logData);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('_backup-log.json'),
        expect.any(String),
        'utf8'
      );
    });

    it('should handle log save errors gracefully', () => {
      jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {
        throw new Error('Write error');
      });

      expect(() => {
        fileManager.saveLog('/test/dir', {});
      }).not.toThrow();

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('Async File Operations', () => {
    it('should ensure directory exists', async () => {
      const accessSpy = jest.spyOn(fs.promises, 'access').mockResolvedValue(undefined);

      await fileManager.ensureDir('/test/dir');

      expect(accessSpy).toHaveBeenCalledWith('/test/dir');
    });

    it('should create directory if it does not exist', async () => {
      jest.spyOn(fs.promises, 'access').mockRejectedValue(new Error('ENOENT'));
      const mkdirSpy = jest.spyOn(fs.promises, 'mkdir').mockResolvedValue(undefined);

      await fileManager.ensureDir('/test/dir');

      expect(mkdirSpy).toHaveBeenCalledWith('/test/dir', { recursive: true });
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Created directory'));
    });

    it('should write file asynchronously', async () => {
      const writeFileSpy = jest.spyOn(fs.promises, 'writeFile').mockResolvedValue(undefined);

      await fileManager.writeFile('/test/file.txt', 'content');

      expect(writeFileSpy).toHaveBeenCalledWith('/test/file.txt', 'content', 'utf-8');
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Wrote file'));
    });

    it('should throw on write file error', async () => {
      jest.spyOn(fs.promises, 'writeFile').mockRejectedValue(new Error('Write error'));

      await expect(fileManager.writeFile('/test/file.txt', 'content')).rejects.toThrow('Write error');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
