/**
 * Testes unitários para StateManager
 * Requirements: 11.5
 */

const StateManager = require('../../../../src/ui/menu/components/StateManager');

describe('StateManager', () => {
  let stateManager;
  const mockOptions = [
    { key: '1', label: 'Option 1', command: 'cmd1' },
    { key: '2', label: 'Option 2', command: 'cmd2' },
    { key: '3', label: 'Option 3', command: 'cmd3' }
  ];

  beforeEach(() => {
    stateManager = new StateManager(mockOptions);
  });

  describe('Initialization', () => {
    test('should initialize with provided options', () => {
      const state = stateManager.getState();
      expect(state.options).toEqual(mockOptions);
      expect(state.selectedIndex).toBe(0);
      expect(state.mode).toBe('navigation');
      expect(state.isExecuting).toBe(false);
    });

    test('should initialize with empty options array', () => {
      const emptyManager = new StateManager([]);
      expect(emptyManager.getState().options).toEqual([]);
    });
  });

  describe('Navigation - moveUp()', () => {
    test('should move selection up by one', () => {
      stateManager.setSelectedIndex(2);
      stateManager.moveUp();
      expect(stateManager.getState().selectedIndex).toBe(1);
    });

    test('should wrap to last option when moving up from first (circular)', () => {
      // Requirement: 1.1, 1.2
      stateManager.setSelectedIndex(0);
      stateManager.moveUp();
      expect(stateManager.getState().selectedIndex).toBe(2); // Wraps to last
    });
  });

  describe('Navigation - moveDown()', () => {
    test('should move selection down by one', () => {
      stateManager.setSelectedIndex(0);
      stateManager.moveDown();
      expect(stateManager.getState().selectedIndex).toBe(1);
    });

    test('should wrap to first option when moving down from last (circular)', () => {
      // Requirement: 1.1, 1.2
      stateManager.setSelectedIndex(2);
      stateManager.moveDown();
      expect(stateManager.getState().selectedIndex).toBe(0); // Wraps to first
    });
  });

  describe('setSelectedIndex()', () => {
    test('should set valid index', () => {
      stateManager.setSelectedIndex(1);
      expect(stateManager.getState().selectedIndex).toBe(1);
    });

    test('should throw error for negative index', () => {
      expect(() => stateManager.setSelectedIndex(-1)).toThrow('Invalid index');
    });

    test('should throw error for out of bounds index', () => {
      expect(() => stateManager.setSelectedIndex(10)).toThrow('Invalid index');
    });

    test('should notify observers when index changes', () => {
      const observer = jest.fn();
      stateManager.subscribe(observer);

      stateManager.setSelectedIndex(1);

      expect(observer).toHaveBeenCalledWith('selectedIndexChanged', { index: 1 });
    });
  });

  describe('getSelectedOption()', () => {
    test('should return currently selected option', () => {
      stateManager.setSelectedIndex(1);
      const selected = stateManager.getSelectedOption();
      expect(selected).toEqual(mockOptions[1]);
    });
  });

  describe('Mode Management', () => {
    test('should set valid mode', () => {
      stateManager.setMode('preview');
      expect(stateManager.getState().mode).toBe('preview');
    });

    test('should throw error for invalid mode', () => {
      expect(() => stateManager.setMode('invalid')).toThrow('Invalid mode');
    });

    test('should notify observers when mode changes', () => {
      const observer = jest.fn();
      stateManager.subscribe(observer);

      stateManager.setMode('history');

      expect(observer).toHaveBeenCalledWith('modeChanged', { mode: 'history' });
    });

    test('should support all valid modes', () => {
      const modes = ['navigation', 'preview', 'history', 'config'];

      modes.forEach(mode => {
        expect(() => stateManager.setMode(mode)).not.toThrow();
        expect(stateManager.getState().mode).toBe(mode);
      });
    });
  });

  describe('Execution State', () => {
    test('should mark command as executing', () => {
      stateManager.setExecuting('n8n:download');

      const state = stateManager.getState();
      expect(state.isExecuting).toBe(true);
      expect(state.executingCommand).toBe('n8n:download');
    });

    test('should clear execution state', () => {
      stateManager.setExecuting('n8n:download');
      stateManager.clearExecuting();

      const state = stateManager.getState();
      expect(state.isExecuting).toBe(false);
      expect(state.executingCommand).toBe(null);
    });

    test('should notify observers when execution starts', () => {
      const observer = jest.fn();
      stateManager.subscribe(observer);

      stateManager.setExecuting('n8n:upload');

      expect(observer).toHaveBeenCalledWith('executionStarted', { commandName: 'n8n:upload' });
    });

    test('should notify observers when execution ends', () => {
      const observer = jest.fn();
      stateManager.subscribe(observer);

      stateManager.setExecuting('n8n:upload');
      observer.mockClear();

      stateManager.clearExecuting();

      expect(observer).toHaveBeenCalledWith('executionEnded', {});
    });
  });

  describe('Options Management', () => {
    test('should update options', () => {
      const newOptions = [{ key: 'a', label: 'New A' }];
      stateManager.setOptions(newOptions);

      expect(stateManager.getState().options).toEqual(newOptions);
    });

    test('should reset selectedIndex if out of bounds after options update', () => {
      stateManager.setSelectedIndex(2);

      const newOptions = [{ key: 'a', label: 'New A' }]; // Only 1 option
      stateManager.setOptions(newOptions);

      expect(stateManager.getState().selectedIndex).toBe(0);
    });

    test('should throw error for empty options array', () => {
      expect(() => stateManager.setOptions([])).toThrow('Options must be a non-empty array');
    });

    test('should throw error for non-array options', () => {
      expect(() => stateManager.setOptions('invalid')).toThrow('Options must be a non-empty array');
    });

    test('should notify observers when options change', () => {
      const observer = jest.fn();
      stateManager.subscribe(observer);

      const newOptions = [{ key: 'a', label: 'New A' }];
      stateManager.setOptions(newOptions);

      expect(observer).toHaveBeenCalledWith('optionsChanged', { options: newOptions });
    });
  });

  describe('Observer Pattern', () => {
    test('should subscribe observer', () => {
      const observer = jest.fn();
      stateManager.subscribe(observer);

      stateManager.setSelectedIndex(1);

      expect(observer).toHaveBeenCalled();
    });

    test('should unsubscribe observer', () => {
      const observer = jest.fn();
      stateManager.subscribe(observer);
      stateManager.unsubscribe(observer);

      stateManager.setSelectedIndex(1);

      expect(observer).not.toHaveBeenCalled();
    });

    test('should return cleanup function from subscribe', () => {
      const observer = jest.fn();
      const unsubscribe = stateManager.subscribe(observer);

      unsubscribe();
      stateManager.setSelectedIndex(1);

      expect(observer).not.toHaveBeenCalled();
    });

    test('should notify multiple observers', () => {
      const observer1 = jest.fn();
      const observer2 = jest.fn();

      stateManager.subscribe(observer1);
      stateManager.subscribe(observer2);

      stateManager.setSelectedIndex(1);

      expect(observer1).toHaveBeenCalled();
      expect(observer2).toHaveBeenCalled();
    });

    test('should continue notifying other observers if one throws error', () => {
      const errorObserver = jest.fn(() => { throw new Error('Observer error'); });
      const goodObserver = jest.fn();

      stateManager.subscribe(errorObserver);
      stateManager.subscribe(goodObserver);

      // Should not throw
      expect(() => stateManager.setSelectedIndex(1)).not.toThrow();

      expect(goodObserver).toHaveBeenCalled();
    });

    test('should throw error when subscribing non-function', () => {
      expect(() => stateManager.subscribe('not a function')).toThrow('Observer must be a function');
    });
  });

  describe('reset()', () => {
    test('should reset state to initial values', () => {
      stateManager.setSelectedIndex(2);
      stateManager.setMode('preview');
      stateManager.setExecuting('cmd');

      stateManager.reset();

      const state = stateManager.getState();
      expect(state.selectedIndex).toBe(0);
      expect(state.mode).toBe('navigation');
      expect(state.isExecuting).toBe(false);
      expect(state.executingCommand).toBe(null);
    });

    test('should notify observers when reset', () => {
      const observer = jest.fn();
      stateManager.subscribe(observer);

      stateManager.reset();

      expect(observer).toHaveBeenCalledWith('stateReset', {});
    });
  });

  describe('getState() immutability', () => {
    test('should return copy of state (not reference)', () => {
      const state1 = stateManager.getState();
      const state2 = stateManager.getState();

      expect(state1).not.toBe(state2); // Different objects
      expect(state1).toEqual(state2); // Same values
    });

    test('should not allow external mutation of state', () => {
      const state = stateManager.getState();
      state.selectedIndex = 999;

      expect(stateManager.getState().selectedIndex).toBe(0); // Unchanged
    });
  });
});
