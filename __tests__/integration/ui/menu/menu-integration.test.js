/**
 * Integration Tests - Interactive Menu
 *
 * Testa a integração completa entre todos os componentes do menu:
 * - MenuOrchestrator coordenando todos os componentes
 * - Fluxo de navegação e execução
 * - Modos especiais (preview, history, config, help)
 * - Error handling e logging
 * - Signal handlers e terminal resize
 *
 * Requirements: REQ-11.5 (Testing)
 */

const MenuOrchestrator = require('../../../../src/ui/menu/components/MenuOrchestrator');
const { getAllOptions } = require('../../../../src/ui/menu/config/menu-options');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

describe('Menu Integration Tests', () => {
  let orchestrator;
  let testConfigDir;

  beforeEach(async () => {
    // Cria diretório temporário para config/history
    testConfigDir = path.join(os.tmpdir(), `docs-jana-test-${Date.now()}`);
    await fs.mkdir(testConfigDir, { recursive: true });

    // Override env para usar diretório de teste
    process.env.DOCS_JANA_CONFIG_DIR = testConfigDir;
  });

  afterEach(async () => {
    // Cleanup
    if (orchestrator && orchestrator.isActive()) {
      await orchestrator.cleanup();
    }

    // Remove diretório de teste
    try {
      await fs.rm(testConfigDir, { recursive: true, force: true });
    } catch (error) {
      // Ignora erros de cleanup
    }
  });

  describe('Initialization', () => {
    test('deve inicializar todos os componentes corretamente', async () => {
      orchestrator = new MenuOrchestrator();
      await orchestrator.initialize();

      expect(orchestrator.isActive()).toBe(true);
      expect(orchestrator.stateManager).toBeDefined();
      expect(orchestrator.configManager).toBeDefined();
      expect(orchestrator.commandHistory).toBeDefined();
      expect(orchestrator.themeEngine).toBeDefined();
      expect(orchestrator.animationEngine).toBeDefined();
      expect(orchestrator.keyboardMapper).toBeDefined();
      expect(orchestrator.inputHandler).toBeDefined();
      expect(orchestrator.uiRenderer).toBeDefined();
      expect(orchestrator.commandExecutor).toBeDefined();
      expect(orchestrator.errorHandler).toBeDefined();
      expect(orchestrator.logger).toBeDefined();
    });

    test('deve carregar opções do menu corretamente', async () => {
      orchestrator = new MenuOrchestrator();
      await orchestrator.initialize();

      const state = orchestrator.getState();
      expect(state.options).toBeDefined();
      expect(state.options.length).toBeGreaterThan(0);
      expect(state.options[0]).toHaveProperty('key');
      expect(state.options[0]).toHaveProperty('command');
      expect(state.options[0]).toHaveProperty('label');
      expect(state.options[0]).toHaveProperty('icon');
    });

    test('deve carregar configurações padrão na primeira execução', async () => {
      orchestrator = new MenuOrchestrator();
      await orchestrator.initialize();

      const config = orchestrator.configManager.get('preferences');
      expect(config).toBeDefined();
      expect(config.theme).toBeDefined();
      expect(config.animationsEnabled).toBeDefined();
    });

    test('deve lidar com erro durante inicialização', async () => {
      // Mock para forçar erro
      const ConfigManager = require('../../../../src/ui/menu/components/ConfigManager');
      const originalLoad = ConfigManager.prototype.load;
      ConfigManager.prototype.load = jest.fn().mockRejectedValue(new Error('Config load failed'));

      orchestrator = new MenuOrchestrator();

      await expect(orchestrator.initialize()).rejects.toThrow();

      // Restaura mock
      ConfigManager.prototype.load = originalLoad;
    });
  });

  describe('Menu Options', () => {
    beforeEach(async () => {
      orchestrator = new MenuOrchestrator();
      await orchestrator.initialize();
    });

    test('deve incluir todas as opções esperadas', () => {
      const options = getAllOptions();

      expect(options).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ command: 'n8n:download' }),
          expect.objectContaining({ command: 'n8n:upload' }),
          expect.objectContaining({ command: 'outline:download' }),
          expect.objectContaining({ command: 'history' }),
          expect.objectContaining({ command: 'config' }),
          expect.objectContaining({ command: 'help' }),
          expect.objectContaining({ command: 'exit' })
        ])
      );
    });

    test('cada opção deve ter preview (exceto comandos especiais)', () => {
      const options = getAllOptions();
      const specialCommands = ['history', 'config', 'help', 'exit'];

      options.forEach(option => {
        if (!specialCommands.includes(option.command)) {
          expect(option.preview).toBeDefined();
          expect(option.preview.shellCommand).toBeDefined();
        }
      });
    });

    test('cada opção deve ter atalho de teclado', () => {
      const options = getAllOptions();

      options.forEach(option => {
        expect(option.shortcut).toBeDefined();
        expect(typeof option.shortcut).toBe('string');
      });
    });
  });

  describe('State Management', () => {
    beforeEach(async () => {
      orchestrator = new MenuOrchestrator();
      await orchestrator.initialize();
    });

    test('deve inicializar com modo navigation', () => {
      const state = orchestrator.getState();
      expect(state.mode).toBe('navigation');
    });

    test('deve alternar entre modos', () => {
      orchestrator.switchMode('preview');
      expect(orchestrator.getState().mode).toBe('preview');

      orchestrator.switchMode('history');
      expect(orchestrator.getState().mode).toBe('history');

      orchestrator.switchMode('config');
      expect(orchestrator.getState().mode).toBe('config');

      orchestrator.switchMode('help');
      expect(orchestrator.getState().mode).toBe('help');

      orchestrator.switchMode('navigation');
      expect(orchestrator.getState().mode).toBe('navigation');
    });

    test('deve enriquecer opções com histórico', async () => {
      // Adiciona execução ao histórico
      orchestrator.commandHistory.add({
        commandName: 'n8n:download',
        exitCode: 0,
        duration: 1000
      });

      // Re-enriquece opções
      orchestrator.stateManager.setOptions(orchestrator.enrichMenuOptions());

      const state = orchestrator.getState();
      const n8nOption = state.options.find(opt => opt.command === 'n8n:download');

      expect(n8nOption.lastExecution).toBeDefined();
      expect(n8nOption.lastExecution.status).toBe('success');
    });
  });

  describe('Command Executor', () => {
    beforeEach(async () => {
      orchestrator = new MenuOrchestrator();
      await orchestrator.initialize();
    });

    test('deve validar comandos especiais', () => {
      const specialCommands = ['history', 'config', 'help', 'exit'];

      specialCommands.forEach(cmd => {
        expect(orchestrator.commandExecutor.isValidCommand(cmd)).toBe(true);
      });
    });

    test('deve validar comandos de execução', () => {
      const execCommands = ['n8n:download', 'n8n:upload', 'outline:download'];

      execCommands.forEach(cmd => {
        expect(orchestrator.commandExecutor.isValidCommand(cmd)).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      orchestrator = new MenuOrchestrator();
      await orchestrator.initialize();
    });

    test('ErrorHandler deve categorizar erros corretamente', () => {
      const userError = new Error('Invalid input');
      const systemError = new Error('ENOENT');
      systemError.code = 'ENOENT';
      const cmdError = new Error('Command execution failed');

      const userResponse = orchestrator.errorHandler.handle(userError);
      expect(userResponse.category).toBe('user-input');

      const sysResponse = orchestrator.errorHandler.handle(systemError);
      expect(sysResponse.category).toBe('system');

      const cmdResponse = orchestrator.errorHandler.handle(cmdError);
      expect(cmdResponse.category).toBe('command-execution');
    });

    test('ErrorHandler deve fornecer mensagens amigáveis', () => {
      const error = new Error('Test error');
      const response = orchestrator.errorHandler.handle(error);

      expect(response.message).toBeDefined();
      expect(response.suggestion).toBeDefined();
      expect(response.recoverable).toBeDefined();
    });

    test('ErrorHandler deve formatar mensagens para usuário', () => {
      const error = new Error('Test error');
      const response = orchestrator.errorHandler.handle(error);
      const formatted = orchestrator.errorHandler.formatUserMessage(response);

      expect(formatted).toContain('❌');
      expect(formatted).toContain('💡');
    });
  });

  describe('Logging', () => {
    beforeEach(async () => {
      orchestrator = new MenuOrchestrator();
      await orchestrator.initialize();
    });

    test('Logger deve ter níveis corretos', () => {
      expect(orchestrator.logger.levels).toEqual({
        debug: 0,
        info: 1,
        warn: 2,
        error: 3
      });
    });

    test('Logger deve iniciar e parar timers de performance', () => {
      orchestrator.logger.startTimer('test-operation');
      expect(orchestrator.logger.timers.has('test-operation')).toBe(true);

      const duration = orchestrator.logger.endTimer('test-operation');
      expect(duration).toBeGreaterThanOrEqual(0);
      expect(orchestrator.logger.timers.has('test-operation')).toBe(false);
    });

    test('Logger deve logar apenas se nível adequado', () => {
      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

      orchestrator.logger.setLevel('info');
      orchestrator.logger.debug('This should not log');

      // Debug não deve logar em modo info
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Signal Handlers', () => {
    beforeEach(async () => {
      orchestrator = new MenuOrchestrator();
      await orchestrator.initialize();
    });

    test('deve configurar handlers de sinal', () => {
      // Verifica se handlers foram registrados
      const sigintListeners = process.listeners('SIGINT');
      const sigtermListeners = process.listeners('SIGTERM');

      expect(sigintListeners.length).toBeGreaterThan(0);
      expect(sigtermListeners.length).toBeGreaterThan(0);
    });

    test('deve remover handlers ao fazer shutdown', async () => {
      const initialSigintCount = process.listeners('SIGINT').length;

      await orchestrator.shutdown();

      const finalSigintCount = process.listeners('SIGINT').length;
      expect(finalSigintCount).toBeLessThan(initialSigintCount);
    });
  });

  describe('Terminal Resize', () => {
    beforeEach(async () => {
      orchestrator = new MenuOrchestrator();
      await orchestrator.initialize();
    });

    test('deve ter handler de resize configurado', () => {
      expect(orchestrator.handleResize).toBeDefined();
      expect(typeof orchestrator.handleResize).toBe('function');
    });

    test('deve re-renderizar ao redimensionar (sem crash)', () => {
      // Simula resize
      expect(() => {
        orchestrator.onTerminalResize();
      }).not.toThrow();
    });
  });

  describe('Graceful Shutdown', () => {
    beforeEach(async () => {
      orchestrator = new MenuOrchestrator();
      await orchestrator.initialize();
    });

    test('deve salvar configurações ao encerrar', async () => {
      const saveSpy = jest.spyOn(orchestrator.configManager, 'save');

      await orchestrator.shutdown();

      expect(saveSpy).toHaveBeenCalled();
      saveSpy.mockRestore();
    });

    test('deve salvar histórico ao encerrar', async () => {
      const saveSpy = jest.spyOn(orchestrator.commandHistory, 'save');

      await orchestrator.shutdown();

      expect(saveSpy).toHaveBeenCalled();
      saveSpy.mockRestore();
    });

    test('deve parar input handler ao encerrar', async () => {
      const stopSpy = jest.spyOn(orchestrator.inputHandler, 'stop');

      await orchestrator.shutdown();

      expect(stopSpy).toHaveBeenCalled();
      stopSpy.mockRestore();
    });

    test('deve limpar animações ao encerrar', async () => {
      const cleanupSpy = jest.spyOn(orchestrator.animationEngine, 'cleanup');

      await orchestrator.shutdown();

      expect(cleanupSpy).toHaveBeenCalled();
      cleanupSpy.mockRestore();
    });

    test('deve prevenir múltiplos shutdowns simultâneos', async () => {
      const saveSpy = jest.spyOn(orchestrator.configManager, 'save');

      // Chama shutdown múltiplas vezes
      await Promise.all([
        orchestrator.shutdown(),
        orchestrator.shutdown(),
        orchestrator.shutdown()
      ]);

      // Save deve ser chamado apenas uma vez
      expect(saveSpy.mock.calls.length).toBe(1);
      saveSpy.mockRestore();
    });
  });

  describe('Complete Flow', () => {
    beforeEach(async () => {
      orchestrator = new MenuOrchestrator();
      await orchestrator.initialize();
    });

    test('deve completar fluxo: inicialização → navegação → shutdown', async () => {
      // Inicialização já feita no beforeEach
      expect(orchestrator.isActive()).toBe(true);

      // Navegar
      const state = orchestrator.getState();
      expect(state.mode).toBe('navigation');

      // Shutdown
      await orchestrator.shutdown();
      expect(orchestrator.isActive()).toBe(false);
    });

    test('deve alternar modos sem erro', () => {
      const modes = ['navigation', 'preview', 'history', 'config', 'help'];

      modes.forEach(mode => {
        expect(() => {
          orchestrator.switchMode(mode);
        }).not.toThrow();

        expect(orchestrator.getState().mode).toBe(mode);
      });
    });

    test('deve manter integridade de dados entre modos', () => {
      // Estado inicial
      const initialOptions = orchestrator.getState().options;

      // Alterna modos
      orchestrator.switchMode('history');
      orchestrator.switchMode('config');
      orchestrator.switchMode('navigation');

      // Verifica que opções não foram corrompidas
      const finalOptions = orchestrator.getState().options;
      expect(finalOptions).toEqual(initialOptions);
    });
  });
});
