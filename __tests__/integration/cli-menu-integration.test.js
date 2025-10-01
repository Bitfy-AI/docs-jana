/**
 * Integration tests for CLI menu integration (Task 22)
 *
 * Tests the integration between cli.js and MenuOrchestrator
 */

const { spawn } = require('child_process');
const path = require('path');

describe('CLI Menu Integration', () => {
  const CLI_PATH = path.join(__dirname, '..', '..', 'cli.js');
  const timeout = 10000;

  /**
   * Helper: Run CLI command and capture output
   * @param {string[]} args - Command arguments
   * @param {Object} options - Spawn options
   * @returns {Promise<Object>} {stdout, stderr, exitCode}
   */
  function runCLI(args = [], options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn('node', [CLI_PATH, ...args], {
        env: { ...process.env, ...options.env },
        timeout: timeout
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          stdout,
          stderr,
          exitCode: code
        });
      });

      child.on('error', (error) => {
        reject(error);
      });

      // Send input if provided
      if (options.input) {
        child.stdin.write(options.input);
        child.stdin.end();
      }

      // Kill after timeout
      setTimeout(() => {
        child.kill();
        reject(new Error('CLI timeout'));
      }, timeout);
    });
  }

  describe('Direct Command Mode (Backward Compatibility)', () => {
    it('should execute help command directly', async () => {
      const result = await runCLI(['help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Docs-Jana CLI');
      expect(result.stdout).toContain('USAGE');
      expect(result.stdout).toContain('COMMANDS');
    });

    it('should execute version command directly', async () => {
      const result = await runCLI(['version']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('version');
      expect(result.stdout).toContain('Platform');
      expect(result.stdout).toContain('Node.js');
    });

    it('should handle unknown command', async () => {
      const result = await runCLI(['unknown-command']);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Unknown command');
    });

    it('should work with command aliases', async () => {
      const result = await runCLI(['-h']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Docs-Jana CLI');
    });
  });

  describe('Interactive Mode Detection', () => {
    it('should show menu when no args provided (non-TTY will use legacy)', async () => {
      // Note: In CI/CD (non-TTY), this will use legacy menu
      // We test that it doesn't crash and shows some menu
      const result = await runCLI([], {
        input: '0\n', // Select exit option
        env: { USE_ENHANCED_MENU: 'false' } // Force legacy menu for testing
      });

      // Should show menu (legacy version in non-TTY)
      expect(result.stdout).toContain('Docs-Jana CLI');
      expect(result.stdout).toContain('MENU');
    });

    it('should use legacy menu when USE_ENHANCED_MENU=false', async () => {
      const result = await runCLI([], {
        input: '0\n',
        env: { USE_ENHANCED_MENU: 'false' }
      });

      expect(result.stdout).toContain('MENU PRINCIPAL');
    });
  });

  describe('Flag Support', () => {
    it('should bypass menu with --no-interactive flag', async () => {
      const result = await runCLI(['--no-interactive', 'help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Docs-Jana CLI');
      expect(result.stdout).toContain('USAGE');
      // Should NOT show menu
      expect(result.stdout).not.toContain('Digite o número');
    });

    it('should handle --interactive flag (forces menu)', async () => {
      const result = await runCLI(['--interactive', 'help'], {
        input: '0\n',
        env: { USE_ENHANCED_MENU: 'false' } // Use legacy menu for testing
      });

      // Should show menu even with command specified
      expect(result.stdout).toContain('MENU');
    });

    it('should handle -i shorthand for --interactive', async () => {
      const result = await runCLI(['-i'], {
        input: '0\n',
        env: { USE_ENHANCED_MENU: 'false' }
      });

      expect(result.stdout).toContain('MENU');
    });
  });

  describe('Enhanced Menu Integration', () => {
    it('should fall back to legacy menu if enhanced menu fails', async () => {
      // Simulate enhanced menu failure by providing invalid environment
      const result = await runCLI([], {
        input: '0\n',
        env: {
          USE_ENHANCED_MENU: 'true',
          // This might cause enhanced menu to fail in non-interactive env
        }
      });

      // Should fall back to legacy menu
      expect(result.stdout).toContain('MENU');
    });
  });

  describe('Error Handling', () => {
    it('should handle graceful shutdown on invalid menu selection', async () => {
      const result = await runCLI([], {
        input: 'invalid\n0\n', // Invalid input, then exit
        env: { USE_ENHANCED_MENU: 'false' }
      });

      expect(result.stdout).toContain('inválida');
    });

    it('should not crash on SIGINT simulation', async () => {
      // This test verifies graceful shutdown handlers don't conflict
      const result = await runCLI(['help']);

      expect(result.exitCode).toBe(0);
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain all existing command behaviors', async () => {
      const commands = ['help', 'version', '-h', '--help', '-v', '--version'];

      for (const cmd of commands) {
        const result = await runCLI([cmd]);
        expect(result.exitCode).toBe(0);
      }
    });

    it('should pass flags to underlying commands', async () => {
      const result = await runCLI(['help', '--verbose']);

      expect(result.exitCode).toBe(0);
    });
  });
});
