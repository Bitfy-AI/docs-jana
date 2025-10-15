/**
 * @fileoverview Unit tests for StateManager MENU_MODES constants
 * @module state-manager-modes.test
 */

const StateManager = require('../../src/ui/menu/components/StateManager');
const { MENU_MODES } = require('../../src/ui/menu/components/StateManager');

describe('StateManager - MENU_MODES Constants', () => {
  let stateManager;

  beforeEach(() => {
    stateManager = new StateManager([
      { command: 'test1', label: 'Test 1' },
      { command: 'test2', label: 'Test 2' }
    ]);
  });

  describe('MENU_MODES constant', () => {
    test('should be frozen (immutable)', () => {
      expect(Object.isFrozen(MENU_MODES)).toBe(true);
    });

    test('should have all required modes', () => {
      expect(MENU_MODES.NAVIGATION).toBe('navigation');
      expect(MENU_MODES.PREVIEW).toBe('preview');
      expect(MENU_MODES.HISTORY).toBe('history');
      expect(MENU_MODES.CONFIG).toBe('config');
      expect(MENU_MODES.HELP).toBe('help');
      expect(MENU_MODES.EXECUTING).toBe('executing');
    });

    test('should prevent modification', () => {
      // In non-strict mode, assignment to frozen object fails silently
      // In strict mode, it throws TypeError
      MENU_MODES.NEW_MODE = 'new';
      expect(MENU_MODES.NEW_MODE).toBeUndefined();

      // Verify object is still frozen
      expect(Object.isFrozen(MENU_MODES)).toBe(true);
    });
  });

  describe('setMode() with constants', () => {
    test('should accept MENU_MODES.NAVIGATION', () => {
      expect(() => stateManager.setMode(MENU_MODES.NAVIGATION)).not.toThrow();
      expect(stateManager.getState().mode).toBe('navigation');
    });

    test('should accept MENU_MODES.PREVIEW', () => {
      expect(() => stateManager.setMode(MENU_MODES.PREVIEW)).not.toThrow();
      expect(stateManager.getState().mode).toBe('preview');
    });

    test('should accept MENU_MODES.EXECUTING', () => {
      expect(() => stateManager.setMode(MENU_MODES.EXECUTING)).not.toThrow();
      expect(stateManager.getState().mode).toBe('executing');
    });

    test('should still accept string literals (backward compat)', () => {
      expect(() => stateManager.setMode('navigation')).not.toThrow();
      expect(() => stateManager.setMode('preview')).not.toThrow();
      expect(() => stateManager.setMode('executing')).not.toThrow();
    });

    test('should reject invalid mode', () => {
      expect(() => stateManager.setMode('invalid'))
        .toThrow(/Invalid mode: invalid/);
    });

    test('should provide helpful error with valid modes', () => {
      try {
        stateManager.setMode('badmode');
        fail('Should have thrown');
      } catch (error) {
        expect(error.message).toContain('navigation');
        expect(error.message).toContain('preview');
        expect(error.message).toContain('executing');
        expect(error.message).toContain('Use MENU_MODES constants');
      }
    });
  });

  describe('reset() with constants', () => {
    test('should reset to NAVIGATION mode', () => {
      stateManager.setMode(MENU_MODES.EXECUTING);
      stateManager.reset();

      expect(stateManager.getState().mode).toBe(MENU_MODES.NAVIGATION);
    });
  });

  describe('Mode transitions', () => {
    test('should allow NAVIGATION → PREVIEW', () => {
      stateManager.setMode(MENU_MODES.NAVIGATION);
      expect(() => stateManager.setMode(MENU_MODES.PREVIEW)).not.toThrow();
    });

    test('should allow PREVIEW → EXECUTING', () => {
      stateManager.setMode(MENU_MODES.PREVIEW);
      expect(() => stateManager.setMode(MENU_MODES.EXECUTING)).not.toThrow();
    });

    test('should allow EXECUTING → NAVIGATION', () => {
      stateManager.setMode(MENU_MODES.EXECUTING);
      expect(() => stateManager.setMode(MENU_MODES.NAVIGATION)).not.toThrow();
    });

    test('should allow any mode → NAVIGATION (escape/cancel)', () => {
      const modes = [
        MENU_MODES.PREVIEW,
        MENU_MODES.HISTORY,
        MENU_MODES.CONFIG,
        MENU_MODES.HELP,
        MENU_MODES.EXECUTING
      ];

      modes.forEach(mode => {
        stateManager.setMode(mode);
        expect(() => stateManager.setMode(MENU_MODES.NAVIGATION)).not.toThrow();
        expect(stateManager.getState().mode).toBe(MENU_MODES.NAVIGATION);
      });
    });
  });

  describe('Constructor initialization', () => {
    test('should start in NAVIGATION mode', () => {
      const newManager = new StateManager([]);
      expect(newManager.getState().mode).toBe(MENU_MODES.NAVIGATION);
    });
  });
});
