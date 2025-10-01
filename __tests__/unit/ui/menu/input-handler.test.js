/**
 * Testes unitários para InputHandler
 * Requirements: REQ-1 (Navegação com Setas), REQ-6 (Atalhos de Teclado)
 */

const InputHandler = require('../../../../src/ui/menu/components/InputHandler');
const StateManager = require('../../../../src/ui/menu/components/StateManager');
const KeyboardMapper = require('../../../../src/ui/menu/utils/KeyboardMapper');

// Mock process.stdin
const mockStdin = {
  isTTY: true,
  setRawMode: jest.fn(),
  resume: jest.fn(),
  pause: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn()
};

describe('InputHandler', () => {
  let inputHandler;
  let stateManager;
  let keyboardMapper;

  const mockOptions = [
    { key: '1', label: 'Option 1', command: 'cmd1' },
    { key: '2', label: 'Option 2', command: 'cmd2' },
    { key: '3', label: 'Option 3', command: 'cmd3' }
  ];

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Cria dependências
    stateManager = new StateManager(mockOptions);
    keyboardMapper = new KeyboardMapper();

    // Mock stdin
    inputHandler = new InputHandler(stateManager, keyboardMapper);
    inputHandler.stdin = mockStdin;
  });

  afterEach(() => {
    if (inputHandler.isActive) {
      inputHandler.cleanup();
    }
  });

  describe('Initialization', () => {
    test('should require StateManager', () => {
      expect(() => new InputHandler(null)).toThrow('StateManager is required');
    });

    test('should initialize with StateManager and optional KeyboardMapper', () => {
      const handler = new InputHandler(stateManager);
      expect(handler.stateManager).toBe(stateManager);
      expect(handler.keyboardMapper).toBeInstanceOf(KeyboardMapper);
    });

    test('should use provided KeyboardMapper', () => {
      const customMapper = new KeyboardMapper();
      const handler = new InputHandler(stateManager, customMapper);
      expect(handler.keyboardMapper).toBe(customMapper);
    });

    test('should initialize with inactive state', () => {
      expect(inputHandler.isActive).toBe(false);
      expect(inputHandler.rawMode).toBe(false);
    });
  });

  describe('Terminal Detection', () => {
    test('isInteractive() should return true when stdin is TTY', () => {
      inputHandler.stdin = { isTTY: true };
      expect(inputHandler.isInteractive()).toBe(true);
    });

    test('isInteractive() should return false when stdin is not TTY', () => {
      inputHandler.stdin = { isTTY: false };
      expect(inputHandler.isInteractive()).toBe(false);
    });

    test('isInteractive() should return false when isTTY is undefined', () => {
      inputHandler.stdin = {};
      expect(inputHandler.isInteractive()).toBe(false);
    });
  });

  describe('Start/Stop', () => {
    test('start() should enable raw mode and set up listener', () => {
      inputHandler.start();

      expect(mockStdin.setRawMode).toHaveBeenCalledWith(true);
      expect(mockStdin.resume).toHaveBeenCalled();
      expect(mockStdin.on).toHaveBeenCalledWith('data', expect.any(Function));
      expect(inputHandler.isActive).toBe(true);
      expect(inputHandler.rawMode).toBe(true);
    });

    test('start() should throw error if terminal is not interactive', () => {
      inputHandler.stdin = { isTTY: false };

      expect(() => inputHandler.start()).toThrow('Cannot start InputHandler: terminal is not interactive');
    });

    test('start() should be idempotent (no effect if already active)', () => {
      inputHandler.start();
      mockStdin.setRawMode.mockClear();
      mockStdin.on.mockClear();

      inputHandler.start(); // Segunda chamada

      expect(mockStdin.setRawMode).not.toHaveBeenCalled();
      expect(mockStdin.on).not.toHaveBeenCalled();
    });

    test('stop() should disable raw mode and remove listener', () => {
      inputHandler.start();
      inputHandler.stop();

      expect(mockStdin.setRawMode).toHaveBeenCalledWith(false);
      expect(mockStdin.pause).toHaveBeenCalled();
      expect(mockStdin.removeListener).toHaveBeenCalledWith('data', expect.any(Function));
      expect(inputHandler.isActive).toBe(false);
      expect(inputHandler.rawMode).toBe(false);
    });

    test('stop() should be safe to call when not active', () => {
      expect(() => inputHandler.stop()).not.toThrow();
    });
  });

  describe('Key Parsing', () => {
    test('should parse arrow up key (ESC[A)', () => {
      const buffer = Buffer.from([27, 91, 65]); // ESC[A
      const key = inputHandler.parseKey(buffer);
      expect(key).toBe('up');
    });

    test('should parse arrow down key (ESC[B)', () => {
      const buffer = Buffer.from([27, 91, 66]); // ESC[B
      const key = inputHandler.parseKey(buffer);
      expect(key).toBe('down');
    });

    test('should parse arrow right key (ESC[C)', () => {
      const buffer = Buffer.from([27, 91, 67]); // ESC[C
      const key = inputHandler.parseKey(buffer);
      expect(key).toBe('right');
    });

    test('should parse arrow left key (ESC[D)', () => {
      const buffer = Buffer.from([27, 91, 68]); // ESC[D
      const key = inputHandler.parseKey(buffer);
      expect(key).toBe('left');
    });

    test('should parse Enter key (byte 13)', () => {
      const buffer = Buffer.from([13]);
      const key = inputHandler.parseKey(buffer);
      expect(key).toBe('enter');
    });

    test('should parse Enter key (byte 10)', () => {
      const buffer = Buffer.from([10]);
      const key = inputHandler.parseKey(buffer);
      expect(key).toBe('enter');
    });

    test('should parse Escape key', () => {
      const buffer = Buffer.from([27]);
      const key = inputHandler.parseKey(buffer);
      expect(key).toBe('escape');
    });

    test('should parse Space key', () => {
      const buffer = Buffer.from([32]);
      const key = inputHandler.parseKey(buffer);
      expect(key).toBe('space');
    });

    test('should parse Backspace key (byte 127)', () => {
      const buffer = Buffer.from([127]);
      const key = inputHandler.parseKey(buffer);
      expect(key).toBe('backspace');
    });

    test('should parse Backspace key (byte 8)', () => {
      const buffer = Buffer.from([8]);
      const key = inputHandler.parseKey(buffer);
      expect(key).toBe('backspace');
    });

    test('should parse Tab key', () => {
      const buffer = Buffer.from([9]);
      const key = inputHandler.parseKey(buffer);
      expect(key).toBe('tab');
    });

    test('should parse Ctrl+C (byte 3)', () => {
      const buffer = Buffer.from([3]);
      const key = inputHandler.parseKey(buffer);
      expect(key).toBe('ctrl-c');
    });

    test('should parse letter keys (lowercase)', () => {
      const buffer = Buffer.from('q');
      const key = inputHandler.parseKey(buffer);
      expect(key).toBe('q');
    });

    test('should parse letter keys (uppercase converted to lowercase)', () => {
      const buffer = Buffer.from('Q');
      const key = inputHandler.parseKey(buffer);
      expect(key).toBe('q');
    });

    test('should parse number keys', () => {
      const buffer = Buffer.from('1');
      const key = inputHandler.parseKey(buffer);
      expect(key).toBe('1');
    });

    test('should parse special characters', () => {
      const buffer = Buffer.from('?');
      const key = inputHandler.parseKey(buffer);
      expect(key).toBe('?');
    });

    test('should return null for unrecognized keys', () => {
      const buffer = Buffer.from([255, 255]); // Invalid sequence
      const key = inputHandler.parseKey(buffer);
      expect(key).toBe(null);
    });
  });

  describe('StateManager Integration', () => {
    test('arrow up should call StateManager.moveUp()', () => {
      const moveUpSpy = jest.spyOn(stateManager, 'moveUp');
      const buffer = Buffer.from([27, 91, 65]); // ESC[A (up arrow)

      inputHandler.handleKeyPress(buffer);

      expect(moveUpSpy).toHaveBeenCalled();
    });

    test('arrow down should call StateManager.moveDown()', () => {
      const moveDownSpy = jest.spyOn(stateManager, 'moveDown');
      const buffer = Buffer.from([27, 91, 66]); // ESC[B (down arrow)

      inputHandler.handleKeyPress(buffer);

      expect(moveDownSpy).toHaveBeenCalled();
    });

    test('should update StateManager selectedIndex when moving up', () => {
      stateManager.setSelectedIndex(2);
      const buffer = Buffer.from([27, 91, 65]); // ESC[A (up arrow)

      inputHandler.handleKeyPress(buffer);

      expect(stateManager.getState().selectedIndex).toBe(1);
    });

    test('should update StateManager selectedIndex when moving down', () => {
      stateManager.setSelectedIndex(0);
      const buffer = Buffer.from([27, 91, 66]); // ESC[B (down arrow)

      inputHandler.handleKeyPress(buffer);

      expect(stateManager.getState().selectedIndex).toBe(1);
    });
  });

  describe('KeyboardMapper Integration', () => {
    test('should use KeyboardMapper to get action for key', () => {
      const getActionSpy = jest.spyOn(keyboardMapper, 'getAction');
      const buffer = Buffer.from('q'); // 'q' -> quit

      inputHandler.handleKeyPress(buffer);

      expect(getActionSpy).toHaveBeenCalledWith('q');
    });

    test('should emit correct event for mapped quit key', () => {
      const callback = jest.fn();
      inputHandler.on('escape', callback);

      const buffer = Buffer.from('q'); // 'q' -> quit

      inputHandler.handleKeyPress(buffer);

      expect(callback).toHaveBeenCalledWith({ key: 'q' });
    });

    test('should support custom keymaps', () => {
      const customMapper = new KeyboardMapper();
      customMapper.customizeKeymap({ 'x': 'custom-action' });

      const customHandler = new InputHandler(stateManager, customMapper);
      customHandler.stdin = mockStdin;

      const callback = jest.fn();
      customHandler.on('shortcut', callback);

      const buffer = Buffer.from('x');
      customHandler.handleKeyPress(buffer);

      expect(callback).toHaveBeenCalledWith({ key: 'x', action: 'custom-action' });
    });
  });

  describe('Event Emission', () => {
    test('should emit arrow-up event', () => {
      const callback = jest.fn();
      inputHandler.on('arrow-up', callback);

      const buffer = Buffer.from([27, 91, 65]); // ESC[A
      inputHandler.handleKeyPress(buffer);

      expect(callback).toHaveBeenCalledWith({ key: 'up' });
    });

    test('should emit arrow-down event', () => {
      const callback = jest.fn();
      inputHandler.on('arrow-down', callback);

      const buffer = Buffer.from([27, 91, 66]); // ESC[B
      inputHandler.handleKeyPress(buffer);

      expect(callback).toHaveBeenCalledWith({ key: 'down' });
    });

    test('should emit enter event', () => {
      const callback = jest.fn();
      inputHandler.on('enter', callback);

      const buffer = Buffer.from([13]); // Enter
      inputHandler.handleKeyPress(buffer);

      expect(callback).toHaveBeenCalledWith({ key: 'enter' });
    });

    test('should emit escape event for quit action', () => {
      const callback = jest.fn();
      inputHandler.on('escape', callback);

      const buffer = Buffer.from('q'); // 'q' -> quit
      inputHandler.handleKeyPress(buffer);

      expect(callback).toHaveBeenCalledWith({ key: 'q' });
    });

    test('should emit shortcut event for help', () => {
      const callback = jest.fn();
      inputHandler.on('shortcut', callback);

      const buffer = Buffer.from('h'); // 'h' -> help
      inputHandler.handleKeyPress(buffer);

      expect(callback).toHaveBeenCalledWith({ key: 'h', action: 'help' });
    });

    test('should emit shortcut event for refresh', () => {
      const callback = jest.fn();
      inputHandler.on('shortcut', callback);

      const buffer = Buffer.from('r'); // 'r' -> refresh
      inputHandler.handleKeyPress(buffer);

      expect(callback).toHaveBeenCalledWith({ key: 'r', action: 'refresh' });
    });

    test('should emit shortcut event for preview', () => {
      const callback = jest.fn();
      inputHandler.on('shortcut', callback);

      const buffer = Buffer.from('p'); // 'p' -> preview
      inputHandler.handleKeyPress(buffer);

      expect(callback).toHaveBeenCalledWith({ key: 'p', action: 'preview' });
    });

    test('should emit shortcut event for history', () => {
      const callback = jest.fn();
      inputHandler.on('shortcut', callback);

      const buffer = Buffer.from([127]); // backspace -> history
      inputHandler.handleKeyPress(buffer);

      expect(callback).toHaveBeenCalledWith({ key: 'backspace', action: 'history' });
    });

    test('should emit shortcut event for config', () => {
      const callback = jest.fn();
      inputHandler.on('shortcut', callback);

      const buffer = Buffer.from('c'); // 'c' -> config
      inputHandler.handleKeyPress(buffer);

      expect(callback).toHaveBeenCalledWith({ key: 'c', action: 'config' });
    });

    test('should emit shortcut event for direct selection (1-9)', () => {
      const callback = jest.fn();
      inputHandler.on('shortcut', callback);

      const buffer = Buffer.from('1'); // '1' -> select-1
      inputHandler.handleKeyPress(buffer);

      expect(callback).toHaveBeenCalledWith({
        key: '1',
        action: 'direct-select',
        value: 1
      });
    });

    test('should emit char event for unmapped keys', () => {
      const callback = jest.fn();
      inputHandler.on('char', callback);

      const buffer = Buffer.from('z'); // 'z' não mapeado
      inputHandler.handleKeyPress(buffer);

      expect(callback).toHaveBeenCalledWith({ key: 'z' });
    });

    test('should support multiple listeners for same event', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      inputHandler.on('arrow-up', callback1);
      inputHandler.on('arrow-up', callback2);

      const buffer = Buffer.from([27, 91, 65]); // ESC[A
      inputHandler.handleKeyPress(buffer);

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    test('should handle errors in listeners gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Test error');
      });
      const normalCallback = jest.fn();

      inputHandler.on('arrow-up', errorCallback);
      inputHandler.on('arrow-up', normalCallback);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const buffer = Buffer.from([27, 91, 65]); // ESC[A
      inputHandler.handleKeyPress(buffer);

      expect(errorCallback).toHaveBeenCalled();
      expect(normalCallback).toHaveBeenCalled(); // Não deve ser afetado pelo erro
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Listener Management', () => {
    test('on() should register listener', () => {
      const callback = jest.fn();
      inputHandler.on('arrow-up', callback);

      expect(inputHandler.listeners.has('arrow-up')).toBe(true);
      expect(inputHandler.listeners.get('arrow-up')).toContain(callback);
    });

    test('off() should remove listener', () => {
      const callback = jest.fn();
      inputHandler.on('arrow-up', callback);
      inputHandler.off('arrow-up', callback);

      expect(inputHandler.listeners.get('arrow-up')).not.toContain(callback);
    });

    test('off() should be safe when event type does not exist', () => {
      const callback = jest.fn();
      expect(() => inputHandler.off('non-existent', callback)).not.toThrow();
    });

    test('off() should be safe when callback does not exist', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      inputHandler.on('arrow-up', callback1);
      expect(() => inputHandler.off('arrow-up', callback2)).not.toThrow();
    });
  });

  describe('Cleanup', () => {
    test('cleanup() should stop input handler', () => {
      inputHandler.start();
      inputHandler.cleanup();

      expect(inputHandler.isActive).toBe(false);
      expect(inputHandler.rawMode).toBe(false);
    });

    test('cleanup() should clear all listeners', () => {
      inputHandler.on('arrow-up', jest.fn());
      inputHandler.on('arrow-down', jest.fn());
      inputHandler.on('enter', jest.fn());

      inputHandler.cleanup();

      expect(inputHandler.listeners.size).toBe(0);
    });

    test('cleanup() should reset key buffer', () => {
      inputHandler.keyBuffer = 'test';
      inputHandler.cleanup();

      expect(inputHandler.keyBuffer).toBe('');
    });

    test('cleanup() should be safe to call multiple times', () => {
      inputHandler.cleanup();
      expect(() => inputHandler.cleanup()).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('should handle null buffer gracefully', () => {
      expect(() => inputHandler.handleKeyPress(null)).not.toThrow();
    });

    test('should handle empty buffer gracefully', () => {
      const buffer = Buffer.from([]);
      expect(() => inputHandler.handleKeyPress(buffer)).not.toThrow();
    });

    test('should handle rapid key presses', () => {
      const callback = jest.fn();
      inputHandler.on('arrow-up', callback);

      // Simula 10 pressionamentos rápidos
      for (let i = 0; i < 10; i++) {
        const buffer = Buffer.from([27, 91, 65]); // ESC[A
        inputHandler.handleKeyPress(buffer);
      }

      expect(callback).toHaveBeenCalledTimes(10);
    });

    test('should handle invalid action from KeyboardMapper', () => {
      // Mock getAction para retornar null
      jest.spyOn(keyboardMapper, 'getAction').mockReturnValue(null);

      const charCallback = jest.fn();
      inputHandler.on('char', charCallback);

      const buffer = Buffer.from('x');
      inputHandler.handleKeyPress(buffer);

      expect(charCallback).toHaveBeenCalledWith({ key: 'x' });
    });
  });

  describe('Statistics', () => {
    test('getStats() should return current state information', () => {
      inputHandler.on('arrow-up', jest.fn());
      inputHandler.on('arrow-down', jest.fn());
      inputHandler.start();

      const stats = inputHandler.getStats();

      expect(stats).toMatchObject({
        isActive: true,
        rawMode: true,
        isInteractive: true,
        listeners: {
          'arrow-up': 1,
          'arrow-down': 1
        }
      });
    });

    test('getStats() should show inactive state when not started', () => {
      const stats = inputHandler.getStats();

      expect(stats.isActive).toBe(false);
      expect(stats.rawMode).toBe(false);
    });
  });
});
