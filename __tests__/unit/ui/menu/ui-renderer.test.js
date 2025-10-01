/**
 * UIRenderer Unit Tests
 *
 * Tests for rendering all modes, theme integration, icons, status indicators,
 * keyboard shortcuts display, and terminal width responsiveness.
 *
 * Requirements: REQ-2, REQ-3, REQ-4, REQ-5, REQ-6
 */

const UIRenderer = require('../../../../src/ui/menu/components/UIRenderer');
const ThemeEngine = require('../../../../src/ui/menu/utils/ThemeEngine');
const AnimationEngine = require('../../../../src/ui/menu/utils/AnimationEngine');
const KeyboardMapper = require('../../../../src/ui/menu/utils/KeyboardMapper');

describe('UIRenderer', () => {
  let uiRenderer;
  let themeEngine;
  let animationEngine;
  let keyboardMapper;

  // Mock stdout to capture output
  let originalStdoutWrite;
  let capturedOutput;

  beforeAll(async () => {
    // Initialize ThemeEngine once for all tests
    themeEngine = new ThemeEngine();
    await themeEngine.initialize();

    animationEngine = new AnimationEngine({ animationsEnabled: true });
    keyboardMapper = new KeyboardMapper();
  });

  beforeEach(() => {
    // Create fresh instance for each test
    uiRenderer = new UIRenderer({
      themeEngine,
      animationEngine,
      keyboardMapper
    });

    // Capture stdout
    capturedOutput = '';
    originalStdoutWrite = process.stdout.write;
    process.stdout.write = (chunk) => {
      capturedOutput += chunk.toString();
      return true;
    };
  });

  afterEach(() => {
    // Restore stdout
    process.stdout.write = originalStdoutWrite;
    capturedOutput = '';
  });

  describe('Constructor and Dependencies', () => {
    test('should throw error if ThemeEngine is missing', () => {
      expect(() => {
        new UIRenderer({
          animationEngine,
          keyboardMapper
        });
      }).toThrow('ThemeEngine is required');
    });

    test('should throw error if AnimationEngine is missing', () => {
      expect(() => {
        new UIRenderer({
          themeEngine,
          keyboardMapper
        });
      }).toThrow('AnimationEngine is required');
    });

    test('should throw error if KeyboardMapper is missing', () => {
      expect(() => {
        new UIRenderer({
          themeEngine,
          animationEngine
        });
      }).toThrow('KeyboardMapper is required');
    });

    test('should initialize with all dependencies', () => {
      expect(uiRenderer.themeEngine).toBe(themeEngine);
      expect(uiRenderer.animationEngine).toBe(animationEngine);
      expect(uiRenderer.keyboardMapper).toBe(keyboardMapper);
    });

    test('should have default icons defined', () => {
      expect(uiRenderer.icons).toBeDefined();
      expect(uiRenderer.icons.settings).toBe('⚙️');
      expect(uiRenderer.icons.download).toBe('📥');
      expect(uiRenderer.icons.upload).toBe('📤');
      expect(uiRenderer.icons.help).toBe('❓');
      expect(uiRenderer.icons.exit).toBe('🚪');
    });

    test('should have status symbols defined', () => {
      expect(uiRenderer.statusSymbols).toBeDefined();
      expect(uiRenderer.statusSymbols.success).toBe('✓');
      expect(uiRenderer.statusSymbols.error).toBe('✗');
      expect(uiRenderer.statusSymbols.warning).toBe('⚠');
    });
  });

  describe('Header Rendering', () => {
    test('should render header with title', () => {
      const header = uiRenderer.renderHeader();
      expect(header).toContain('DOCS-JANA CLI');
      expect(header).toContain('Documentation & Workflow Management');
    });

    test('should render header without chalk when chalk is unavailable', () => {
      const originalChalk = uiRenderer.themeEngine.chalk;
      uiRenderer.themeEngine.chalk = null;

      const header = uiRenderer.renderHeader();
      expect(header).toContain('DOCS-JANA CLI');

      uiRenderer.themeEngine.chalk = originalChalk;
    });
  });

  describe('Options Rendering', () => {
    const mockOptions = [
      {
        key: '1',
        command: 'n8n:download',
        label: 'Download workflows',
        description: 'Download all workflows from N8N',
        icon: '📥',
        category: 'action',
        shortcut: 'd'
      },
      {
        key: '2',
        command: 'n8n:upload',
        label: 'Upload workflows',
        description: 'Upload workflows to N8N',
        icon: '📤',
        category: 'action',
        shortcut: 'u'
      },
      {
        key: '3',
        command: 'help',
        label: 'Help',
        description: 'Show help',
        icon: '❓',
        category: 'info',
        shortcut: 'h'
      }
    ];

    test('should render options list', () => {
      const output = uiRenderer.renderOptions(mockOptions, 0);
      expect(output).toContain('Download workflows');
      expect(output).toContain('Upload workflows');
      expect(output).toContain('Help');
    });

    test('should highlight selected option', () => {
      const output = uiRenderer.renderOptions(mockOptions, 1);
      expect(output).toContain('Upload workflows');
      // Selected option should have indicator
      expect(output).toContain('▶');
    });

    test('should display icons for each option', () => {
      const output = uiRenderer.renderOptions(mockOptions, 0);
      expect(output).toContain('📥');
      expect(output).toContain('📤');
      expect(output).toContain('❓');
    });

    test('should display shortcuts', () => {
      const output = uiRenderer.renderOptions(mockOptions, 0);
      expect(output).toContain('[d]');
      expect(output).toContain('[u]');
      expect(output).toContain('[h]');
    });

    test('should throw error for invalid selectedIndex', () => {
      expect(() => {
        uiRenderer.renderOptions(mockOptions, -1);
      }).toThrow('Invalid selectedIndex');

      expect(() => {
        uiRenderer.renderOptions(mockOptions, 10);
      }).toThrow('Invalid selectedIndex');
    });

    test('should return message for empty options', () => {
      const output = uiRenderer.renderOptions([], 0);
      expect(output).toContain('No options available');
    });

    test('should render options with last execution status', () => {
      const optionsWithStatus = [
        {
          ...mockOptions[0],
          lastExecution: {
            status: 'success',
            timestamp: new Date().toISOString()
          }
        }
      ];

      const output = uiRenderer.renderOptions(optionsWithStatus, 0);
      expect(output).toContain('✓'); // Success symbol
    });
  });

  describe('Status Indicators', () => {
    test('should render success status indicator', () => {
      const lastExecution = {
        status: 'success',
        timestamp: new Date(Date.now() - 5 * 60000).toISOString() // 5 minutes ago
      };

      const indicator = uiRenderer.renderStatusIndicator(lastExecution);
      expect(indicator).toContain('✓');
      expect(indicator).toContain('há 5 min');
    });

    test('should render error status indicator', () => {
      const lastExecution = {
        status: 'failure',
        timestamp: new Date(Date.now() - 120 * 60000).toISOString() // 2 hours ago
      };

      const indicator = uiRenderer.renderStatusIndicator(lastExecution);
      expect(indicator).toContain('✗');
      expect(indicator).toContain('há 2h');
    });

    test('should return empty string when no last execution', () => {
      const indicator = uiRenderer.renderStatusIndicator(null);
      expect(indicator).toBe('');
    });
  });

  describe('Relative Time Calculation', () => {
    test('should return "agora" for recent timestamps', () => {
      const timestamp = new Date().toISOString();
      const relative = uiRenderer.getRelativeTime(timestamp);
      expect(relative).toBe('agora');
    });

    test('should return minutes for timestamps within an hour', () => {
      const timestamp = new Date(Date.now() - 30 * 60000).toISOString();
      const relative = uiRenderer.getRelativeTime(timestamp);
      expect(relative).toBe('há 30 min');
    });

    test('should return hours for timestamps within a day', () => {
      const timestamp = new Date(Date.now() - 5 * 60 * 60000).toISOString();
      const relative = uiRenderer.getRelativeTime(timestamp);
      expect(relative).toBe('há 5h');
    });

    test('should return days for older timestamps', () => {
      const timestamp = new Date(Date.now() - 3 * 24 * 60 * 60000).toISOString();
      const relative = uiRenderer.getRelativeTime(timestamp);
      expect(relative).toBe('há 3d');
    });
  });

  describe('Description Rendering', () => {
    test('should render description for option', () => {
      const option = {
        label: 'Test Command',
        description: 'This is a test description for the command'
      };

      const output = uiRenderer.renderDescription(option);
      expect(output).toContain('Descrição:');
      expect(output).toContain('This is a test description');
      expect(output).toContain('─'.repeat(60));
    });

    test('should wrap long descriptions', () => {
      const longDescription = 'This is a very long description that should be wrapped across multiple lines to ensure readability in the terminal interface and maintain proper formatting.';

      const option = {
        label: 'Test',
        description: longDescription
      };

      const output = uiRenderer.renderDescription(option);
      expect(output).toContain('This is a very long description');
      expect(output.split('\n').length).toBeGreaterThan(3);
    });

    test('should return empty string for missing description', () => {
      const output = uiRenderer.renderDescription({});
      expect(output).toBe('');
    });
  });

  describe('Footer Rendering', () => {
    test('should render footer with keyboard shortcuts', () => {
      const footer = uiRenderer.renderFooter();
      expect(footer).toContain('Navegar');
      expect(footer).toContain('Selecionar');
      expect(footer).toContain('Ajuda');
      expect(footer).toContain('Sair');
    });

    test('should display arrow keys', () => {
      const footer = uiRenderer.renderFooter();
      expect(footer).toContain('↑↓');
    });
  });

  describe('Navigation Mode Rendering', () => {
    test('should render complete navigation mode', () => {
      const state = {
        mode: 'navigation',
        selectedIndex: 0,
        options: [
          {
            key: '1',
            label: 'Test Option',
            description: 'Test description',
            icon: '⚙️',
            category: 'action'
          }
        ],
        isExecuting: false
      };

      const output = uiRenderer.render(state);
      expect(output).toContain('DOCS-JANA CLI');
      expect(output).toContain('Test Option');
      expect(output).toContain('Test description');
    });

    test('should throw error for invalid state', () => {
      expect(() => {
        uiRenderer.render(null);
      }).toThrow('Invalid state');

      expect(() => {
        uiRenderer.render({});
      }).toThrow('Invalid state');
    });
  });

  describe('Preview Mode Rendering', () => {
    test('should render preview with command details', () => {
      const preview = {
        shellCommand: 'docs-jana n8n:download',
        affectedPaths: ['/path/to/workflows'],
        estimatedDuration: 10,
        warning: 'This may take a while'
      };

      const option = {
        label: 'Download Workflows',
        command: 'n8n:download',
        preview
      };

      const output = uiRenderer.renderPreview(preview, option);
      expect(output).toContain('PREVIEW DO COMANDO');
      expect(output).toContain('docs-jana n8n:download');
      expect(output).toContain('/path/to/workflows');
      expect(output).toContain('~10s');
      expect(output).toContain('This may take a while');
    });

    test('should render preview without optional fields', () => {
      const preview = {
        shellCommand: 'test-command'
      };

      const option = {
        label: 'Test',
        preview
      };

      const output = uiRenderer.renderPreview(preview, option);
      expect(output).toContain('PREVIEW DO COMANDO');
      expect(output).toContain('test-command');
    });

    test('should render preview mode with state', () => {
      const state = {
        mode: 'preview',
        selectedIndex: 0,
        options: [
          {
            label: 'Test',
            preview: {
              shellCommand: 'test'
            }
          }
        ]
      };

      const output = uiRenderer.render(state);
      expect(output).toContain('PREVIEW DO COMANDO');
    });
  });

  describe('History Mode Rendering', () => {
    test('should render history with execution records', () => {
      const history = [
        {
          commandName: 'n8n:download',
          status: 'success',
          timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
          duration: 5000
        },
        {
          commandName: 'outline:download',
          status: 'failure',
          timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
          duration: 1000
        }
      ];

      const output = uiRenderer.renderHistory(history);
      expect(output).toContain('HISTÓRICO DE COMANDOS');
      expect(output).toContain('n8n:download');
      expect(output).toContain('outline:download');
      expect(output).toContain('✓'); // Success
      expect(output).toContain('✗'); // Failure
    });

    test('should render empty history message', () => {
      const output = uiRenderer.renderEmptyHistory();
      expect(output).toContain('HISTÓRICO DE COMANDOS');
      expect(output).toContain('Nenhum comando executado');
    });

    test('should limit history to 10 entries', () => {
      const history = Array(20).fill(null).map((_, i) => ({
        commandName: `command-${i}`,
        status: 'success',
        timestamp: new Date().toISOString(),
        duration: 1000
      }));

      const output = uiRenderer.renderHistory(history);
      const lines = output.split('\n');
      // Should only show first 10 + headers
      expect(output).toContain('command-0');
      expect(output).toContain('command-9');
      expect(output).not.toContain('command-15');
    });

    test('should render history mode with state', () => {
      const state = {
        mode: 'history',
        selectedIndex: 0,
        options: [],
        history: [
          {
            commandName: 'test',
            status: 'success',
            timestamp: new Date().toISOString(),
            duration: 100
          }
        ]
      };

      const output = uiRenderer.render(state);
      expect(output).toContain('HISTÓRICO DE COMANDOS');
    });
  });

  describe('Config Mode Rendering', () => {
    test('should render config with all settings', () => {
      const config = {
        theme: 'dark',
        animationsEnabled: true,
        animationSpeed: 'fast',
        iconsEnabled: true,
        showDescriptions: true,
        showPreviews: false
      };

      const output = uiRenderer.renderConfig(config);
      expect(output).toContain('CONFIGURAÇÕES');
      expect(output).toContain('Tema: dark');
      expect(output).toContain('Animações: Habilitadas');
      expect(output).toContain('Velocidade: fast');
      expect(output).toContain('Ícones: Habilitados');
      expect(output).toContain('Descrições: Sim');
      expect(output).toContain('Previews: Não');
    });

    test('should render config mode with state', () => {
      const state = {
        mode: 'config',
        selectedIndex: 0,
        options: [],
        config: {
          theme: 'default',
          animationsEnabled: true
        }
      };

      const output = uiRenderer.render(state);
      expect(output).toContain('CONFIGURAÇÕES');
    });
  });

  describe('Help Mode Rendering', () => {
    test('should render help with shortcuts', () => {
      const shortcuts = [
        { key: 'up', action: 'navigate-up', description: 'Move para cima' },
        { key: 'down', action: 'navigate-down', description: 'Move para baixo' },
        { key: 'enter', action: 'select', description: 'Selecionar' }
      ];

      const output = uiRenderer.renderHelp(shortcuts);
      expect(output).toContain('AJUDA - ATALHOS DE TECLADO');
      expect(output).toContain('navigate-up');
      expect(output).toContain('navigate-down');
      expect(output).toContain('select');
    });

    test('should render help mode with state', () => {
      const state = {
        mode: 'help',
        selectedIndex: 0,
        options: []
      };

      const output = uiRenderer.render(state);
      expect(output).toContain('AJUDA - ATALHOS DE TECLADO');
    });
  });

  describe('Category Color Mapping', () => {
    test('should map action category to normal color', () => {
      const color = uiRenderer.getCategoryColor('action');
      expect(color).toBe('normal');
    });

    test('should map info category to info color', () => {
      const color = uiRenderer.getCategoryColor('info');
      expect(color).toBe('info');
    });

    test('should map destructive category to error color', () => {
      const color = uiRenderer.getCategoryColor('destructive');
      expect(color).toBe('error');
    });

    test('should map utility category to dim color', () => {
      const color = uiRenderer.getCategoryColor('utility');
      expect(color).toBe('dim');
    });

    test('should default to normal for unknown category', () => {
      const color = uiRenderer.getCategoryColor('unknown');
      expect(color).toBe('normal');
    });
  });

  describe('Text Wrapping', () => {
    test('should wrap text at specified width', () => {
      const text = 'This is a very long text that needs to be wrapped to fit within the terminal width properly';
      const wrapped = uiRenderer.wrapText(text, 30);

      const lines = wrapped.split('\n');
      lines.forEach(line => {
        // Account for 2-space indent
        expect(line.length).toBeLessThanOrEqual(32);
      });
    });

    test('should handle text shorter than max width', () => {
      const text = 'Short text';
      const wrapped = uiRenderer.wrapText(text, 50);
      expect(wrapped).toBe('  Short text');
    });

    test('should handle empty text', () => {
      const wrapped = uiRenderer.wrapText('', 50);
      expect(wrapped).toBe('');
    });
  });

  describe('Screen Clearing', () => {
    test('should clear screen', () => {
      uiRenderer.clear();
      expect(capturedOutput).toContain('\x1Bc');
    });
  });

  describe('Terminal Width Detection', () => {
    test('should get terminal width', () => {
      const width = uiRenderer.getTerminalWidth();
      expect(typeof width).toBe('number');
      expect(width).toBeGreaterThan(0);
    });

    test('should default to 80 if columns unavailable', () => {
      const originalColumns = process.stdout.columns;
      process.stdout.columns = undefined;

      const width = uiRenderer.getTerminalWidth();
      expect(width).toBe(80);

      process.stdout.columns = originalColumns;
    });
  });

  describe('Color Support Detection', () => {
    test('should detect color support', () => {
      const supportsColor = uiRenderer.supportsColor();
      expect(typeof supportsColor).toBe('boolean');
    });
  });

  describe('Edge Cases', () => {
    test('should handle option without icon', () => {
      const option = {
        label: 'No Icon',
        category: 'action'
      };

      const output = uiRenderer.renderOption(option, false, 0);
      expect(output).toContain('No Icon');
      expect(output).toContain('•'); // Default icon
    });

    test('should handle option without label', () => {
      const option = {
        command: 'test-command',
        category: 'action'
      };

      const output = uiRenderer.renderOption(option, false, 0);
      expect(output).toContain('test-command');
    });

    test('should handle missing preview in preview mode', () => {
      const state = {
        mode: 'preview',
        selectedIndex: 0,
        options: [
          {
            label: 'Test',
            description: 'No preview'
          }
        ]
      };

      const output = uiRenderer.render(state);
      // Should fallback to navigation mode
      expect(output).toContain('DOCS-JANA CLI');
    });

    test('should handle unknown mode', () => {
      const state = {
        mode: 'unknown',
        selectedIndex: 0,
        options: [
          {
            label: 'Test',
            description: 'Test'
          }
        ]
      };

      const output = uiRenderer.render(state);
      // Should default to navigation mode
      expect(output).toContain('DOCS-JANA CLI');
    });
  });

  describe('Integration with Dependencies', () => {
    test('should use ThemeEngine for colorization when chalk is available', () => {
      // Only test if chalk is actually available
      if (!themeEngine.chalk || themeEngine.colorSupport === 0) {
        // Skip this test in fallback mode
        expect(themeEngine.colorSupport).toBe(0);
        return;
      }

      const originalColorize = themeEngine.colorize;
      let colorizeCallCount = 0;

      themeEngine.colorize = (text, type) => {
        colorizeCallCount++;
        return originalColorize.call(themeEngine, text, type);
      };

      const state = {
        mode: 'navigation',
        selectedIndex: 0,
        options: [
          {
            label: 'Test',
            description: 'Test',
            icon: '⚙️',
            category: 'action'
          }
        ]
      };

      uiRenderer.render(state);
      expect(colorizeCallCount).toBeGreaterThan(0);

      themeEngine.colorize = originalColorize;
    });

    test('should use KeyboardMapper for shortcuts', () => {
      const state = {
        mode: 'help',
        selectedIndex: 0,
        options: []
      };

      const output = uiRenderer.render(state);
      // Should call keyboardMapper.getAllShortcuts()
      expect(output).toContain('AJUDA');
    });
  });
});
