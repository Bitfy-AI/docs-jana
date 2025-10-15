/**
 * Unit Tests - ProgressTracker
 *
 * Testes para rastreamento e exibição de progresso.
 * Cobre cálculo de ETA, throughput, formatação de barra e atualização.
 *
 * @module __tests__/unit/progress-tracker.test
 */

const ProgressTracker = require('../../utils/progress-tracker');

// Mock console output
let consoleOutput = [];
const mockStdout = {
  write: jest.fn((str) => consoleOutput.push(str))
};
const mockConsoleLog = jest.fn((str) => consoleOutput.push(str));

describe('ProgressTracker', () => {
  let tracker;

  beforeEach(() => {
    consoleOutput = [];
    process.stdout.write = mockStdout.write;
    console.log = mockConsoleLog;
    tracker = new ProgressTracker(100, { enabled: true, barWidth: 30 });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with total and options', () => {
      expect(tracker.total).toBe(100);
      expect(tracker.current).toBe(0);
      expect(tracker.enabled).toBe(true);
      expect(tracker.barWidth).toBe(30);
    });

    it('should use default bar width if not provided', () => {
      const defaultTracker = new ProgressTracker(50);
      expect(defaultTracker.barWidth).toBe(30);
    });

    it('should allow disabling progress', () => {
      const disabledTracker = new ProgressTracker(50, { enabled: false });
      expect(disabledTracker.enabled).toBe(false);
    });
  });

  describe('start', () => {
    it('should set start time and current to 0', () => {
      tracker.start();

      expect(tracker.startTime).toBeTruthy();
      expect(tracker.current).toBe(0);
    });

    it('should not render if disabled', () => {
      const disabledTracker = new ProgressTracker(50, { enabled: false });
      disabledTracker.start();

      expect(mockStdout.write).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    beforeEach(() => {
      tracker.start();
      jest.clearAllMocks();
      consoleOutput = [];
    });

    it('should increment current counter', () => {
      tracker.update({ code: 'TST-001' });
      expect(tracker.current).toBe(1);

      tracker.update({ code: 'TST-002' });
      expect(tracker.current).toBe(2);
    });

    it('should render progress bar', () => {
      tracker.update({ code: 'TST-001' });
      expect(mockStdout.write).toHaveBeenCalled();
    });

    it('should not update if disabled', () => {
      const disabledTracker = new ProgressTracker(50, { enabled: false });
      disabledTracker.update({ code: 'TST-001' });

      expect(disabledTracker.current).toBe(0);
    });
  });

  describe('complete', () => {
    beforeEach(() => {
      tracker.start();
      // Simulate some progress
      for (let i = 0; i < 100; i++) {
        tracker.update({ code: `TST-${i}` });
      }
      jest.clearAllMocks();
      consoleOutput = [];
    });

    it('should display completion message', () => {
      tracker.complete();

      expect(mockConsoleLog).toHaveBeenCalled();
      const message = mockConsoleLog.mock.calls[0][0];
      expect(message).toContain('✓');
      expect(message).toContain('100/100');
      expect(message).toContain('workflows processados');
    });

    it('should not display if disabled', () => {
      const disabledTracker = new ProgressTracker(50, { enabled: false });
      disabledTracker.start();
      disabledTracker.complete();

      expect(mockConsoleLog).not.toHaveBeenCalled();
    });
  });

  describe('_calculateETA', () => {
    it('should calculate ETA based on current progress', () => {
      tracker.start();
      tracker.current = 25; // 25% complete

      // Mock elapsed time (e.g., 1 second)
      tracker.startTime = Date.now() - 1000;

      const eta = tracker._calculateETA();

      // ETA should be approximately 3 seconds (75% remaining at current rate)
      expect(eta).toBeGreaterThan(2000);
      expect(eta).toBeLessThan(4000);
    });

    it('should return null if current is 0', () => {
      tracker.start();
      tracker.current = 0;

      const eta = tracker._calculateETA();
      expect(eta).toBeNull();
    });

    it('should return null if current equals total', () => {
      tracker.start();
      tracker.current = 100;

      const eta = tracker._calculateETA();
      expect(eta).toBeNull();
    });

    it('should return null if not started', () => {
      tracker.current = 50;

      const eta = tracker._calculateETA();
      expect(eta).toBeNull();
    });
  });

  describe('_calculateThroughput', () => {
    it('should calculate workflows per second', () => {
      tracker.start();
      tracker.current = 10;

      // Mock elapsed time (e.g., 2 seconds)
      tracker.startTime = Date.now() - 2000;

      const throughput = tracker._calculateThroughput();

      // Throughput should be approximately 5 workflows/second
      expect(throughput).toBeGreaterThan(4);
      expect(throughput).toBeLessThan(6);
    });

    it('should return null if current is 0', () => {
      tracker.start();
      tracker.current = 0;

      const throughput = tracker._calculateThroughput();
      expect(throughput).toBeNull();
    });

    it('should return null if not started', () => {
      tracker.current = 50;

      const throughput = tracker._calculateThroughput();
      expect(throughput).toBeNull();
    });
  });

  describe('_formatProgressBar', () => {
    it('should format progress bar at 0%', () => {
      const bar = tracker._formatProgressBar(0);
      expect(bar).toBe('[░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]');
      expect(bar).toHaveLength(32); // 30 chars + 2 brackets
    });

    it('should format progress bar at 50%', () => {
      const bar = tracker._formatProgressBar(50);
      const filled = bar.match(/█/g)?.length || 0;
      const empty = bar.match(/░/g)?.length || 0;

      expect(filled).toBe(15);
      expect(empty).toBe(15);
    });

    it('should format progress bar at 100%', () => {
      const bar = tracker._formatProgressBar(100);
      expect(bar).toBe('[██████████████████████████████]');
      expect(bar).toHaveLength(32);
    });

    it('should format progress bar at 77%', () => {
      const bar = tracker._formatProgressBar(77);
      const filled = bar.match(/█/g)?.length || 0;
      expect(filled).toBe(23);
    });
  });

  describe('_clearLine', () => {
    it('should write clear line escape sequence', () => {
      tracker._clearLine();
      expect(mockStdout.write).toHaveBeenCalledWith('\r\x1b[K');
    });
  });

  describe('render', () => {
    beforeEach(() => {
      tracker.start();
      tracker.current = 50;
      jest.clearAllMocks();
      consoleOutput = [];
    });

    it('should render progress line with all components', () => {
      tracker.render({ code: 'TST-001' });

      expect(mockStdout.write).toHaveBeenCalled();
      const lastCall = mockStdout.write.mock.calls[mockStdout.write.mock.calls.length - 1];
      const rendered = lastCall ? lastCall[0] : '';
      expect(rendered).toContain('Processing workflows');
      expect(rendered).toContain('50/100');
      expect(rendered).toContain('50%');
      expect(rendered).toContain('TST-001');
    });

    it('should include ETA when not complete', () => {
      tracker.current = 50;
      tracker.startTime = Date.now() - 5000; // 5 seconds elapsed
      tracker.render({ code: 'TST-001' });

      const lastCall = mockStdout.write.mock.calls[mockStdout.write.mock.calls.length - 1];
      const rendered = lastCall ? lastCall[0] : '';
      expect(rendered).toContain('ETA');
    });

    it('should include throughput', () => {
      tracker.current = 50;
      tracker.startTime = Date.now() - 10000; // 10 seconds elapsed
      tracker.render({ code: 'TST-001' });

      const lastCall = mockStdout.write.mock.calls[mockStdout.write.mock.calls.length - 1];
      const rendered = lastCall ? lastCall[0] : '';
      expect(rendered).toContain('wf/s');
    });

    it('should not render if disabled', () => {
      const disabledTracker = new ProgressTracker(50, { enabled: false });
      disabledTracker.render({ code: 'TST-001' });

      expect(mockStdout.write).not.toHaveBeenCalled();
    });
  });
});
