/**
 * Testes para AnimationEngine
 *
 * Valida:
 * - Spinner start/stop
 * - Spinner text updates
 * - Animation preferences respected
 * - Multiple spinners handling
 * - Edge cases (stopping without starting)
 */

const AnimationEngine = require('../../../../src/ui/menu/utils/AnimationEngine');

// Mock do módulo ora
const createMockSpinner = () => ({
  start: jest.fn(),
  stop: jest.fn(),
  succeed: jest.fn(),
  fail: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  text: ''
});

let mockSpinner;
const mockOra = jest.fn(() => mockSpinner);

// Configurar mock global para ora
global.__mockOra = mockOra;

describe('AnimationEngine', () => {
  let engine;
  let originalIsTTY;

  beforeEach(() => {
    // Salvar estado original do TTY
    originalIsTTY = process.stdout.isTTY;
    process.stdout.isTTY = true; // Simular terminal interativo

    // Criar novo mock spinner para cada teste
    mockSpinner = createMockSpinner();

    // Limpar mocks antes de criar engine
    jest.clearAllMocks();

    // Resetar função mockOra para retornar o novo mockSpinner
    mockOra.mockReturnValue(mockSpinner);

    // Criar nova instância do engine
    engine = new AnimationEngine({
      animationsEnabled: true,
      animationSpeed: 'normal'
    });
  });

  afterEach(() => {
    // Restaurar estado original
    process.stdout.isTTY = originalIsTTY;
    engine.cleanup();
  });

  describe('Constructor', () => {
    it('should initialize with default config', () => {
      const defaultEngine = new AnimationEngine();
      expect(defaultEngine.config.animationsEnabled).toBe(true);
      expect(defaultEngine.config.animationSpeed).toBe('normal');
    });

    it('should accept custom config', () => {
      const customEngine = new AnimationEngine({
        animationsEnabled: false,
        animationSpeed: 'fast'
      });
      expect(customEngine.config.animationsEnabled).toBe(false);
      expect(customEngine.config.animationSpeed).toBe('fast');
    });
  });

  describe('showSpinner', () => {
    it('should start spinner with text when animations enabled', async () => {
      await engine.showSpinner('Loading...');

      expect(mockOra).toHaveBeenCalledWith({
        text: 'Loading...',
        spinner: 'dots2',
        color: 'cyan'
      });
      expect(mockSpinner.start).toHaveBeenCalled();
      expect(engine.currentSpinner).toBe(mockSpinner);
    });

    it('should not start spinner when animations disabled', async () => {
      engine.setEnabled(false);

      await engine.showSpinner('Loading...');

      expect(mockOra).not.toHaveBeenCalled();
      expect(engine.currentSpinner).toBeNull();
    });

    it('should stop previous spinner before starting new one', async () => {
      await engine.showSpinner('First spinner');
      const firstSpinner = engine.currentSpinner;

      await engine.showSpinner('Second spinner');

      expect(firstSpinner.stop).toHaveBeenCalled();
      expect(mockOra).toHaveBeenCalledTimes(2);
    });

    it('should use fallback when ora fails to load', async () => {
      // Criar nova instância sem mock global
      const tempMock = global.__mockOra;
      delete global.__mockOra;
      engine.oraModule = null;

      // Forçar fallback
      await engine.showSpinner('Test');

      // Deve ter usado fallback (spinner vazio)
      expect(engine.currentSpinner).toBeTruthy();

      // Restaurar mock
      global.__mockOra = tempMock;
    });
  });

  describe('updateSpinner', () => {
    it('should update spinner text when spinner is running', async () => {
      await engine.showSpinner('Initial text');

      engine.updateSpinner('Updated text');

      expect(engine.currentSpinner.text).toBe('Updated text');
    });

    it('should do nothing when no spinner is running', () => {
      engine.updateSpinner('Some text');
      // Não deve lançar erro
      expect(engine.currentSpinner).toBeNull();
    });

    it('should do nothing when animations disabled', async () => {
      await engine.showSpinner('Test');
      engine.setEnabled(false);

      engine.updateSpinner('New text');

      // Não deve alterar
      expect(engine.currentSpinner).toBeNull();
    });
  });

  describe('stopSpinner', () => {
    beforeEach(async () => {
      await engine.showSpinner('Test spinner');
    });

    it('should stop with success symbol', () => {
      engine.stopSpinner('success', 'Operation completed!');

      expect(mockSpinner.succeed).toHaveBeenCalledWith('Operation completed!');
      expect(engine.currentSpinner).toBeNull();
    });

    it('should stop with error symbol', () => {
      engine.stopSpinner('error', 'Operation failed!');

      expect(mockSpinner.fail).toHaveBeenCalledWith('Operation failed!');
      expect(engine.currentSpinner).toBeNull();
    });

    it('should stop with warning symbol', () => {
      engine.stopSpinner('warning', 'Warning message');

      expect(mockSpinner.warn).toHaveBeenCalledWith('Warning message');
      expect(engine.currentSpinner).toBeNull();
    });

    it('should stop with info symbol', () => {
      engine.stopSpinner('info', 'Info message');

      expect(mockSpinner.info).toHaveBeenCalledWith('Info message');
      expect(engine.currentSpinner).toBeNull();
    });

    it('should handle stopping without starting (edge case)', () => {
      engine.currentSpinner = null;

      // Não deve lançar erro
      expect(() => {
        engine.stopSpinner('success', 'Message');
      }).not.toThrow();

      expect(engine.currentSpinner).toBeNull();
    });

    it('should handle unknown symbol type', async () => {
      await engine.showSpinner('Test');

      engine.stopSpinner('unknown', 'Test message');

      expect(mockSpinner.stop).toHaveBeenCalled();
      expect(engine.currentSpinner).toBeNull();
    });
  });

  describe('animateTransition', () => {
    it('should delay transition based on speed (normal)', async () => {
      const startTime = Date.now();

      await engine.animateTransition(0, 1);

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(90); // ~100ms com margem
      expect(elapsed).toBeLessThan(200); // Garantir < 200ms
    });

    it('should delay transition based on speed (fast)', async () => {
      engine.setSpeed('fast');
      const startTime = Date.now();

      await engine.animateTransition(0, 1);

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(40); // ~50ms com margem
      expect(elapsed).toBeLessThan(100);
    });

    it('should delay transition based on speed (slow)', async () => {
      engine.setSpeed('slow');
      const startTime = Date.now();

      await engine.animateTransition(0, 1);

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(140); // ~150ms com margem
      expect(elapsed).toBeLessThan(200); // Sempre < 200ms
    });

    it('should skip transition when animations disabled', async () => {
      engine.setEnabled(false);
      const startTime = Date.now();

      await engine.animateTransition(0, 1);

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(10); // Quase instantâneo
    });
  });

  describe('withSpinner', () => {
    it('should execute operation with spinner (success)', async () => {
      const operation = jest.fn(async () => 'result');

      const result = await engine.withSpinner('Processing...', operation);

      expect(result).toBe('result');
      expect(operation).toHaveBeenCalled();
      expect(mockSpinner.start).toHaveBeenCalled();
      expect(mockSpinner.succeed).toHaveBeenCalledWith('Concluído!');
    });

    it('should handle operation failure', async () => {
      const error = new Error('Operation failed');
      const operation = jest.fn(async () => {
        throw error;
      });

      await expect(
        engine.withSpinner('Processing...', operation)
      ).rejects.toThrow('Operation failed');

      expect(mockSpinner.fail).toHaveBeenCalledWith('Erro: Operation failed');
    });
  });

  describe('isEnabled', () => {
    it('should return true when animations enabled and TTY', () => {
      process.stdout.isTTY = true;
      engine.setEnabled(true);

      expect(engine.isEnabled()).toBe(true);
    });

    it('should return false when animations disabled', () => {
      process.stdout.isTTY = true;
      engine.setEnabled(false);

      expect(engine.isEnabled()).toBe(false);
    });

    it('should return false when not TTY (CI/CD environment)', () => {
      process.stdout.isTTY = false;
      engine.setEnabled(true);

      expect(engine.isEnabled()).toBe(false);
    });
  });

  describe('setEnabled', () => {
    it('should enable animations', () => {
      engine.setEnabled(false);
      expect(engine.config.animationsEnabled).toBe(false);

      engine.setEnabled(true);
      expect(engine.config.animationsEnabled).toBe(true);
    });

    it('should stop current spinner when disabling', async () => {
      await engine.showSpinner('Test');

      engine.setEnabled(false);

      expect(mockSpinner.stop).toHaveBeenCalled();
      expect(engine.currentSpinner).toBeNull();
    });
  });

  describe('setSpeed', () => {
    it('should update speed to valid values', () => {
      engine.setSpeed('slow');
      expect(engine.config.animationSpeed).toBe('slow');

      engine.setSpeed('fast');
      expect(engine.config.animationSpeed).toBe('fast');

      engine.setSpeed('normal');
      expect(engine.config.animationSpeed).toBe('normal');
    });

    it('should ignore invalid speed values', () => {
      engine.setSpeed('normal');
      engine.setSpeed('invalid');
      expect(engine.config.animationSpeed).toBe('normal');
    });
  });

  describe('respectUserPreferences', () => {
    it('should apply user preferences for animations', () => {
      const preferences = {
        animationsEnabled: false,
        animationSpeed: 'fast'
      };

      engine.respectUserPreferences(preferences);

      expect(engine.config.animationsEnabled).toBe(false);
      expect(engine.config.animationSpeed).toBe('fast');
    });

    it('should handle partial preferences', () => {
      engine.setSpeed('normal');
      engine.setEnabled(true);

      const preferences = {
        animationsEnabled: false
      };

      engine.respectUserPreferences(preferences);

      expect(engine.config.animationsEnabled).toBe(false);
      expect(engine.config.animationSpeed).toBe('normal'); // Não alterado
    });

    it('should handle empty preferences', () => {
      const initialEnabled = engine.config.animationsEnabled;
      const initialSpeed = engine.config.animationSpeed;

      engine.respectUserPreferences({});

      expect(engine.config.animationsEnabled).toBe(initialEnabled);
      expect(engine.config.animationSpeed).toBe(initialSpeed);
    });
  });

  describe('Multiple spinners handling', () => {
    it('should properly replace spinners when starting new one', async () => {
      await engine.showSpinner('Spinner 1');
      const firstSpinner = engine.currentSpinner;

      await engine.showSpinner('Spinner 2');
      const secondSpinner = engine.currentSpinner;

      await engine.showSpinner('Spinner 3');
      const thirdSpinner = engine.currentSpinner;

      expect(firstSpinner.stop).toHaveBeenCalled();
      expect(secondSpinner.stop).toHaveBeenCalled();
      expect(engine.currentSpinner).toBe(thirdSpinner);
    });
  });

  describe('Performance requirements', () => {
    it('should ensure transitions are < 200ms (REQ-5)', async () => {
      const testSpeeds = ['slow', 'normal', 'fast'];

      for (const speed of testSpeeds) {
        engine.setSpeed(speed);
        const startTime = Date.now();

        await engine.animateTransition(0, 1);

        const elapsed = Date.now() - startTime;
        expect(elapsed).toBeLessThan(200);
      }
    });
  });

  describe('cleanup', () => {
    it('should cleanup spinner state', async () => {
      await engine.showSpinner('Test');

      engine.cleanup();

      expect(mockSpinner.stop).toHaveBeenCalled();
      expect(engine.currentSpinner).toBeNull();
    });

    it('should handle cleanup without active spinner', () => {
      engine.cleanup();
      // Não deve lançar erro
      expect(engine.currentSpinner).toBeNull();
    });
  });
});
