/**
 * @file UIRenderer.test.js
 * @description Comprehensive tests for refactored UIRenderer with Phase 4 visual components
 *
 * Tests cover:
 * - Constructor and dependency injection
 * - Header rendering with modern borders
 * - Options rendering with IconMapper integration
 * - Footer rendering with layout responsiveness
 * - Description rendering with LayoutManager
 * - Resize detection and re-rendering
 * - Visual feedback enhancements
 * - Backwards compatibility
 */

const UIRenderer = require('../../../../../src/ui/menu/components/UIRenderer');

describe('UIRenderer - Phase 4 Refactored', () => {
  let mockThemeEngine;
  let mockAnimationEngine;
  let mockKeyboardMapper;
  let mockBorderRenderer;
  let mockLayoutManager;
  let mockIconMapper;
  let mockTerminalDetector;

  beforeEach(() => {
    // Mock ThemeEngine
    mockThemeEngine = {
      chalk: {
        level: 3
      },
      colorSupport: 3,
      colorize: jest.fn((text, color, bgColor) => `[${color}]${text}[/${color}]`),
      format: jest.fn((text, style) => `<${style}>${text}</${style}>`),
      colorizeBorder: jest.fn((border, type) => `[border-${type}]${border}[/border-${type}]`)
    };

    // Mock AnimationEngine
    mockAnimationEngine = {
      start: jest.fn(),
      stop: jest.fn()
    };

    // Mock KeyboardMapper
    mockKeyboardMapper = {
      getAllShortcuts: jest.fn(() => [
        { key: '↑↓', action: 'navigate', description: 'Navigate options' },
        { key: 'Enter', action: 'select', description: 'Select option' },
        { key: 'h', action: 'help', description: 'Show help' },
        { key: 'q', action: 'quit', description: 'Quit menu' }
      ])
    };

    // Mock TerminalDetector
    mockTerminalDetector = {
      detect: jest.fn(() => ({
        supportsUnicode: true,
        supportsEmojis: true,
        colorLevel: 3,
        width: 100,
        height: 30,
        platform: 'linux',
        isCi: false,
        terminalType: 'xterm-256color'
      })),
      supportsUnicode: jest.fn(() => true),
      supportsEmojis: jest.fn(() => true),
      getColorLevel: jest.fn(() => 3),
      getDimensions: jest.fn(() => ({ width: 100, height: 30 })),
      onResize: jest.fn()
    };

    // Mock BorderRenderer
    mockBorderRenderer = {
      renderTopBorder: jest.fn((width, style) => `╔${'═'.repeat(width - 2)}╗`),
      renderBottomBorder: jest.fn((width, style) => `╚${'═'.repeat(width - 2)}╝`),
      renderSeparator: jest.fn((width, style) => `├${'─'.repeat(width - 2)}┤`),
      renderBox: jest.fn((text, options) => `[BOX: ${text}]`),
      getCharSet: jest.fn((style) => ({
        topLeft: '╔',
        topRight: '╗',
        bottomLeft: '╚',
        bottomRight: '╝',
        horizontal: '═',
        vertical: '║'
      }))
    };

    // Mock LayoutManager
    mockLayoutManager = {
      getLayoutMode: jest.fn(() => 'standard'),
      getContentWidth: jest.fn(() => 76),
      getHorizontalPadding: jest.fn(() => 2),
      getVerticalSpacing: jest.fn(() => 1),
      truncateText: jest.fn((text, maxWidth) => text.substring(0, maxWidth)),
      wrapText: jest.fn((text, maxWidth) => {
        // Simple word wrap simulation
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';

        words.forEach(word => {
          if ((currentLine + word).length <= maxWidth) {
            currentLine += (currentLine ? ' ' : '') + word;
          } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
          }
        });

        if (currentLine) lines.push(currentLine);
        return lines;
      }),
      centerText: jest.fn((text, width) => {
        const padding = Math.floor((width - text.length) / 2);
        return ' '.repeat(padding) + text + ' '.repeat(padding);
      })
    };

    // Mock IconMapper
    mockIconMapper = {
      getIcon: jest.fn((actionType) => {
        const icons = {
          settings: '⚙️',
          download: '📥',
          upload: '📤',
          docs: '📋',
          stats: '📊',
          refresh: '🔄',
          help: '❓',
          exit: '🚪',
          info: '•'
        };
        return icons[actionType] || '•';
      }),
      getStatusIcon: jest.fn((status) => {
        const statusIcons = {
          success: '✓',
          error: '✗',
          warning: '⚠',
          info: '•',
          neutral: '•'
        };
        return statusIcons[status] || '•';
      }),
      getSelectionIndicator: jest.fn(() => '▶'),
      getCategoryIcon: jest.fn((category) => '•'),
      registerIcon: jest.fn()
    };
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with required dependencies', () => {
      const renderer = new UIRenderer({
        themeEngine: mockThemeEngine,
        animationEngine: mockAnimationEngine,
        keyboardMapper: mockKeyboardMapper,
        borderRenderer: mockBorderRenderer,
        layoutManager: mockLayoutManager,
        iconMapper: mockIconMapper,
        terminalDetector: mockTerminalDetector
      });

      expect(renderer.themeEngine).toBe(mockThemeEngine);
      expect(renderer.animationEngine).toBe(mockAnimationEngine);
      expect(renderer.keyboardMapper).toBe(mockKeyboardMapper);
      expect(renderer.borderRenderer).toBe(mockBorderRenderer);
      expect(renderer.layoutManager).toBe(mockLayoutManager);
      expect(renderer.iconMapper).toBe(mockIconMapper);
      expect(renderer.terminalDetector).toBe(mockTerminalDetector);
    });

    it('should throw error if ThemeEngine is missing', () => {
      expect(() => {
        new UIRenderer({
          themeEngine: null,
          animationEngine: mockAnimationEngine,
          keyboardMapper: mockKeyboardMapper
        });
      }).toThrow('ThemeEngine is required');
    });

    it('should throw error if AnimationEngine is missing', () => {
      expect(() => {
        new UIRenderer({
          themeEngine: mockThemeEngine,
          animationEngine: null,
          keyboardMapper: mockKeyboardMapper
        });
      }).toThrow('AnimationEngine is required');
    });

    it('should throw error if KeyboardMapper is missing', () => {
      expect(() => {
        new UIRenderer({
          themeEngine: mockThemeEngine,
          animationEngine: mockAnimationEngine,
          keyboardMapper: null
        });
      }).toThrow('KeyboardMapper is required');
    });

    it('should auto-create visual components if not provided (backwards compatibility)', () => {
      const renderer = new UIRenderer({
        themeEngine: mockThemeEngine,
        animationEngine: mockAnimationEngine,
        keyboardMapper: mockKeyboardMapper
      });

      expect(renderer.terminalDetector).toBeDefined();
      expect(renderer.borderRenderer).toBeDefined();
      expect(renderer.layoutManager).toBeDefined();
      expect(renderer.iconMapper).toBeDefined();
    });

    it('should setup resize listener on initialization', () => {
      const renderer = new UIRenderer({
        themeEngine: mockThemeEngine,
        animationEngine: mockAnimationEngine,
        keyboardMapper: mockKeyboardMapper,
        terminalDetector: mockTerminalDetector
      });

      expect(mockTerminalDetector.onResize).toHaveBeenCalled();
    });

    it('should initialize legacy icon fallbacks for backwards compatibility', () => {
      const renderer = new UIRenderer({
        themeEngine: mockThemeEngine,
        animationEngine: mockAnimationEngine,
        keyboardMapper: mockKeyboardMapper,
        iconMapper: mockIconMapper,
        terminalDetector: mockTerminalDetector
      });

      expect(renderer.icons).toBeDefined();
      expect(renderer.icons.settings).toBe('⚙️');
      expect(renderer.icons.download).toBe('📥');
      expect(renderer.statusSymbols).toBeDefined();
      expect(renderer.statusSymbols.success).toBe('✓');
    });
  });

  describe('renderHeader() - Phase 4 Task 13', () => {
    let renderer;

    beforeEach(() => {
      renderer = new UIRenderer({
        themeEngine: mockThemeEngine,
        animationEngine: mockAnimationEngine,
        keyboardMapper: mockKeyboardMapper,
        borderRenderer: mockBorderRenderer,
        layoutManager: mockLayoutManager,
        iconMapper: mockIconMapper,
        terminalDetector: mockTerminalDetector
      });
    });

    it('should render header with modern double borders', () => {
      const header = renderer.renderHeader();

      expect(mockBorderRenderer.renderTopBorder).toHaveBeenCalledWith(76, 'double');
      expect(mockBorderRenderer.renderBottomBorder).toHaveBeenCalledWith(76, 'double');
      expect(mockBorderRenderer.renderSeparator).toHaveBeenCalledWith(76, 'single');
      expect(header).toContain('╔');
      expect(header).toContain('╚');
    });

    it('should center title and subtitle', () => {
      renderer.renderHeader();

      expect(mockLayoutManager.centerText).toHaveBeenCalledWith('DOCS-JANA CLI', 76);
      expect(mockLayoutManager.centerText).toHaveBeenCalledWith('Documentation & Workflow Management', 76);
    });

    it('should apply theme colors to borders', () => {
      renderer.renderHeader();

      expect(mockThemeEngine.colorizeBorder).toHaveBeenCalledWith(expect.any(String), 'primary');
      expect(mockThemeEngine.colorizeBorder).toHaveBeenCalledWith(expect.any(String), 'secondary');
    });

    it('should format title with bold and selected color', () => {
      renderer.renderHeader();

      expect(mockThemeEngine.colorize).toHaveBeenCalledWith(expect.any(String), 'selected');
      expect(mockThemeEngine.format).toHaveBeenCalledWith(expect.any(String), 'bold');
    });

    it('should format subtitle with dimText color', () => {
      renderer.renderHeader();

      expect(mockThemeEngine.colorize).toHaveBeenCalledWith(expect.any(String), 'dimText');
    });
  });

  describe('renderOptions() - Phase 4 Task 14', () => {
    let renderer;
    const mockOptions = [
      {
        label: 'Download Documentation',
        actionType: 'download',
        category: 'action',
        shortcut: 'd',
        description: 'Download latest docs'
      },
      {
        label: 'Upload Changes',
        actionType: 'upload',
        category: 'action',
        shortcut: 'u',
        description: 'Upload modified docs'
      },
      {
        label: 'Settings',
        actionType: 'settings',
        category: 'utility',
        shortcut: 's',
        description: 'Configure settings',
        lastExecution: {
          status: 'success',
          timestamp: new Date(Date.now() - 60000),
          duration: 150
        }
      }
    ];

    beforeEach(() => {
      renderer = new UIRenderer({
        themeEngine: mockThemeEngine,
        animationEngine: mockAnimationEngine,
        keyboardMapper: mockKeyboardMapper,
        borderRenderer: mockBorderRenderer,
        layoutManager: mockLayoutManager,
        iconMapper: mockIconMapper,
        terminalDetector: mockTerminalDetector
      });
    });

    it('should render all options with icons from IconMapper', () => {
      const output = renderer.renderOptions(mockOptions, 0);

      expect(mockIconMapper.getIcon).toHaveBeenCalledWith('download');
      expect(mockIconMapper.getIcon).toHaveBeenCalledWith('upload');
      expect(mockIconMapper.getIcon).toHaveBeenCalledWith('settings');
      expect(output).toContain('📥');
      expect(output).toContain('📤');
      expect(output).toContain('⚙️');
    });

    it('should show selection indicator for selected option', () => {
      const output = renderer.renderOptions(mockOptions, 1);

      expect(mockIconMapper.getSelectionIndicator).toHaveBeenCalled();
      // Selected option should have indicator
      const lines = output.split('\n');
      const selectedLine = lines.find(line => line.includes('Upload Changes'));
      expect(selectedLine).toContain('▶');
    });

    it('should render status indicator for options with lastExecution', () => {
      const output = renderer.renderOptions(mockOptions, 0);

      // Option with lastExecution should show status
      expect(mockIconMapper.getStatusIcon).toHaveBeenCalledWith('success');
      expect(output).toContain('✓');
    });

    it('should apply selected styling to selected option', () => {
      renderer.renderOptions(mockOptions, 0);

      expect(mockThemeEngine.colorize).toHaveBeenCalledWith(expect.any(String), 'selectedText', 'selected');
      expect(mockThemeEngine.format).toHaveBeenCalledWith(expect.any(String), 'bold');
    });

    it('should apply category colors to unselected options', () => {
      renderer.renderOptions(mockOptions, 2);

      // Should colorize based on category
      expect(mockThemeEngine.colorize).toHaveBeenCalled();
    });

    it('should throw error if selectedIndex is invalid', () => {
      expect(() => {
        renderer.renderOptions(mockOptions, -1);
      }).toThrow('Invalid selectedIndex');

      expect(() => {
        renderer.renderOptions(mockOptions, 999);
      }).toThrow('Invalid selectedIndex');
    });

    it('should handle empty options array gracefully', () => {
      const output = renderer.renderOptions([], 0);

      expect(output).toContain('No options available');
    });
  });

  describe('renderFooter() - Phase 4 Task 15', () => {
    let renderer;

    beforeEach(() => {
      renderer = new UIRenderer({
        themeEngine: mockThemeEngine,
        animationEngine: mockAnimationEngine,
        keyboardMapper: mockKeyboardMapper,
        borderRenderer: mockBorderRenderer,
        layoutManager: mockLayoutManager,
        iconMapper: mockIconMapper,
        terminalDetector: mockTerminalDetector
      });
    });

    it('should render footer with modern borders', () => {
      const footer = renderer.renderFooter();

      expect(mockBorderRenderer.renderTopBorder).toHaveBeenCalledWith(76, 'single');
      expect(mockBorderRenderer.renderBottomBorder).toHaveBeenCalledWith(76, 'single');
    });

    it('should render shortcuts centered in footer', () => {
      const footer = renderer.renderFooter();

      expect(mockLayoutManager.centerText).toHaveBeenCalled();
      expect(footer).toContain('Navegar');
      expect(footer).toContain('Selecionar');
    });

    it('should render compact shortcuts in compact mode', () => {
      mockLayoutManager.getLayoutMode.mockReturnValue('compact');

      const footer = renderer.renderFooter();

      expect(footer).toContain('Nav');
      expect(footer).toContain('Sel');
    });

    it('should show terminal info in expanded mode', () => {
      mockLayoutManager.getLayoutMode.mockReturnValue('expanded');

      const footer = renderer.renderFooter();

      expect(mockTerminalDetector.detect).toHaveBeenCalled();
      expect(footer).toContain('Terminal:');
      expect(footer).toContain('100x30');
      expect(footer).toContain('Unicode:');
    });

    it('should not show terminal info in standard mode', () => {
      mockLayoutManager.getLayoutMode.mockReturnValue('standard');

      const footer = renderer.renderFooter();

      expect(footer).not.toContain('Terminal:');
    });

    it('should apply muted border colors', () => {
      renderer.renderFooter();

      expect(mockThemeEngine.colorizeBorder).toHaveBeenCalledWith(expect.any(String), 'muted');
    });

    it('should apply dimText color to shortcuts', () => {
      renderer.renderFooter();

      expect(mockThemeEngine.colorize).toHaveBeenCalledWith(expect.any(String), 'dimText');
    });
  });

  describe('renderDescription() - Phase 4 Task 16', () => {
    let renderer;
    const mockOption = {
      label: 'Test Option',
      description: 'This is a long description that should be wrapped properly using the LayoutManager\'s intelligent text wrapping functionality to ensure readability across different terminal widths.'
    };

    beforeEach(() => {
      renderer = new UIRenderer({
        themeEngine: mockThemeEngine,
        animationEngine: mockAnimationEngine,
        keyboardMapper: mockKeyboardMapper,
        borderRenderer: mockBorderRenderer,
        layoutManager: mockLayoutManager,
        iconMapper: mockIconMapper,
        terminalDetector: mockTerminalDetector
      });
    });

    it('should render description with modern borders', () => {
      const output = renderer.renderDescription(mockOption);

      expect(mockBorderRenderer.renderSeparator).toHaveBeenCalledWith(76, 'single');
      expect(output).toContain('├');
    });

    it('should wrap text using LayoutManager', () => {
      renderer.renderDescription(mockOption);

      expect(mockLayoutManager.wrapText).toHaveBeenCalledWith(mockOption.description, expect.any(Number));
    });

    it('should apply accent border color to separators', () => {
      renderer.renderDescription(mockOption);

      expect(mockThemeEngine.colorizeBorder).toHaveBeenCalledWith(expect.any(String), 'accent');
    });

    it('should format description title with highlight color and bold', () => {
      renderer.renderDescription(mockOption);

      expect(mockThemeEngine.colorize).toHaveBeenCalledWith('Descrição:', 'highlight');
      expect(mockThemeEngine.format).toHaveBeenCalledWith(expect.any(String), 'bold');
    });

    it('should return empty string if option has no description', () => {
      const output = renderer.renderDescription({ label: 'Test' });

      expect(output).toBe('');
    });

    it('should return empty string if option is null', () => {
      const output = renderer.renderDescription(null);

      expect(output).toBe('');
    });
  });

  describe('Resize Detection - Phase 4 Task 17', () => {
    it('should setup resize listener on initialization', () => {
      const renderer = new UIRenderer({
        themeEngine: mockThemeEngine,
        animationEngine: mockAnimationEngine,
        keyboardMapper: mockKeyboardMapper,
        terminalDetector: mockTerminalDetector
      });

      expect(mockTerminalDetector.onResize).toHaveBeenCalled();
    });

    it('should invalidate cache and re-render on resize', () => {
      const renderer = new UIRenderer({
        themeEngine: mockThemeEngine,
        animationEngine: mockAnimationEngine,
        keyboardMapper: mockKeyboardMapper,
        terminalDetector: mockTerminalDetector,
        borderRenderer: mockBorderRenderer,
        layoutManager: mockLayoutManager,
        iconMapper: mockIconMapper
      });

      // Simulate initial render
      const mockState = {
        options: [{ label: 'Test', actionType: 'info', category: 'info' }],
        selectedIndex: 0,
        mode: 'navigation'
      };

      renderer.render(mockState);

      // Get the resize callback
      const resizeCallback = mockTerminalDetector.onResize.mock.calls[0][0];

      // Set cached output
      renderer.cachedOutput = 'cached content';

      // Trigger resize
      resizeCallback();

      // Cache should be invalidated
      expect(renderer.cachedOutput).toBeNull();
    });
  });

  describe('render() - Main Method', () => {
    let renderer;

    beforeEach(() => {
      renderer = new UIRenderer({
        themeEngine: mockThemeEngine,
        animationEngine: mockAnimationEngine,
        keyboardMapper: mockKeyboardMapper,
        borderRenderer: mockBorderRenderer,
        layoutManager: mockLayoutManager,
        iconMapper: mockIconMapper,
        terminalDetector: mockTerminalDetector
      });
    });

    it('should save state for resize re-rendering', () => {
      const mockState = {
        options: [{ label: 'Test', actionType: 'info', category: 'info' }],
        selectedIndex: 0,
        mode: 'navigation'
      };

      renderer.render(mockState);

      expect(renderer.lastState).toBeDefined();
      expect(renderer.lastState.options).toEqual(mockState.options);
      expect(renderer.lastState.selectedIndex).toBe(0);
      expect(renderer.lastState.timestamp).toBeDefined();
    });

    it('should throw error if state is invalid', () => {
      expect(() => {
        renderer.render(null);
      }).toThrow('Invalid state: options array is required');

      expect(() => {
        renderer.render({});
      }).toThrow('Invalid state: options array is required');

      expect(() => {
        renderer.render({ options: 'not an array' });
      }).toThrow('Invalid state: options array is required');
    });

    it('should render navigation mode by default', () => {
      const mockState = {
        options: [{ label: 'Test', actionType: 'info', category: 'info' }],
        selectedIndex: 0,
        mode: 'navigation'
      };

      const spy = jest.spyOn(renderer, 'renderNavigationMode');
      renderer.render(mockState);

      expect(spy).toHaveBeenCalledWith(mockState);
    });

    it('should render different modes correctly', () => {
      const mockState = {
        options: [{ label: 'Test', actionType: 'info', category: 'info' }],
        selectedIndex: 0,
        mode: 'preview'
      };

      const spy = jest.spyOn(renderer, 'renderPreviewMode');
      renderer.render(mockState);

      expect(spy).toHaveBeenCalledWith(mockState);
    });
  });

  describe('Backwards Compatibility', () => {
    it('should work without visual components (auto-creation)', () => {
      expect(() => {
        new UIRenderer({
          themeEngine: mockThemeEngine,
          animationEngine: mockAnimationEngine,
          keyboardMapper: mockKeyboardMapper
        });
      }).not.toThrow();
    });

    it('should maintain legacy icons property', () => {
      const renderer = new UIRenderer({
        themeEngine: mockThemeEngine,
        animationEngine: mockAnimationEngine,
        keyboardMapper: mockKeyboardMapper,
        iconMapper: mockIconMapper,
        terminalDetector: mockTerminalDetector
      });

      expect(renderer.icons.settings).toBeDefined();
      expect(renderer.icons.download).toBeDefined();
      expect(renderer.icons.success).toBeDefined();
    });

    it('should maintain legacy wrapText method', () => {
      const renderer = new UIRenderer({
        themeEngine: mockThemeEngine,
        animationEngine: mockAnimationEngine,
        keyboardMapper: mockKeyboardMapper,
        layoutManager: mockLayoutManager,
        terminalDetector: mockTerminalDetector
      });

      const wrapped = renderer.wrapText('short text', 50);

      expect(wrapped).toBeDefined();
      expect(mockLayoutManager.wrapText).toHaveBeenCalled();
    });
  });

  describe('No Color Support Fallback', () => {
    beforeEach(() => {
      mockThemeEngine.chalk = null;
      mockThemeEngine.colorSupport = 0;
      mockThemeEngine.colorizeBorder = null; // No colorizeBorder method when no color support
    });

    it('should render header without colors', () => {
      const renderer = new UIRenderer({
        themeEngine: mockThemeEngine,
        animationEngine: mockAnimationEngine,
        keyboardMapper: mockKeyboardMapper,
        borderRenderer: mockBorderRenderer,
        layoutManager: mockLayoutManager,
        iconMapper: mockIconMapper,
        terminalDetector: mockTerminalDetector
      });

      const header = renderer.renderHeader();

      expect(header).toContain('DOCS-JANA CLI');
      // colorizeBorder is null when no color support, so borders are rendered plain
      expect(header).toContain('╔');
    });

    it('should render options without colors', () => {
      const renderer = new UIRenderer({
        themeEngine: mockThemeEngine,
        animationEngine: mockAnimationEngine,
        keyboardMapper: mockKeyboardMapper,
        borderRenderer: mockBorderRenderer,
        layoutManager: mockLayoutManager,
        iconMapper: mockIconMapper,
        terminalDetector: mockTerminalDetector
      });

      const output = renderer.renderOptions(
        [{ label: 'Test', actionType: 'info', category: 'info' }],
        0
      );

      expect(output).toContain('Test');
    });
  });
});
