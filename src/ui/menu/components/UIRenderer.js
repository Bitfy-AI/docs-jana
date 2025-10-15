/**
 * @class UIRenderer
 * @description Renderizador visual do menu com suporte a múltiplos modos e temas.
 * Usa ThemeEngine para cores acessíveis (WCAG 2.1 AA) e AnimationEngine para feedback visual.
 * Integrado com BorderRenderer, LayoutManager, IconMapper e TerminalDetector para experiência visual moderna.
 *
 * Funcionalidades:
 * - Renderização de 5 modos (navigation, preview, history, config, help)
 * - Aplicação automática de temas com validação de contraste
 * - Bordas decorativas modernas com fallback automático (Unicode → ASCII)
 * - Ícones aprimorados com fallback em cascata (emoji → unicode → ascii → plain)
 * - Layout responsivo baseado em largura do terminal
 * - Histórico visual com timestamps relativos
 * - Tabelas formatadas com cli-table3
 * - Detecção e resposta a redimensionamento de terminal
 *
 * @example
 * // Criar renderer com novas dependências visuais
 * const renderer = new UIRenderer({
 *   themeEngine,
 *   animationEngine,
 *   keyboardMapper,
 *   borderRenderer,
 *   layoutManager,
 *   iconMapper,
 *   terminalDetector
 * });
 *
 * // Renderizar menu
 * const state = {
 *   options: menuOptions,
 *   selectedIndex: 0,
 *   mode: 'navigation',
 *   isExecuting: false
 * };
 * renderer.render(state);
 *
 * @example
 * // Limpar tela
 * renderer.clear();
 */

const cliTable = require('cli-table3');

class UIRenderer {
  /**
   * @param {Object} dependencies - Dependências injetadas
   * @param {ThemeEngine} dependencies.themeEngine - Engine de temas
   * @param {AnimationEngine} dependencies.animationEngine - Engine de animações
   * @param {KeyboardMapper} dependencies.keyboardMapper - Mapeador de atalhos
   * @param {BorderRenderer} [dependencies.borderRenderer] - Renderizador de bordas (opcional, criado automaticamente)
   * @param {LayoutManager} [dependencies.layoutManager] - Gerenciador de layout (opcional, criado automaticamente)
   * @param {IconMapper} [dependencies.iconMapper] - Mapeador de ícones (opcional, criado automaticamente)
   * @param {TerminalDetector} [dependencies.terminalDetector] - Detector de capabilities (opcional, criado automaticamente)
   */
  constructor({
    themeEngine,
    animationEngine,
    keyboardMapper,
    borderRenderer = null,
    layoutManager = null,
    iconMapper = null,
    terminalDetector = null
  }) {
    if (!themeEngine) {
      throw new Error('ThemeEngine is required');
    }
    if (!animationEngine) {
      throw new Error('AnimationEngine is required');
    }
    if (!keyboardMapper) {
      throw new Error('KeyboardMapper is required');
    }

    this.themeEngine = themeEngine;
    this.animationEngine = animationEngine;
    this.keyboardMapper = keyboardMapper;

    // Initialize visual components (auto-create if not provided for backwards compatibility)
    if (!terminalDetector) {
      const TerminalDetector = require('../visual/TerminalDetector');
      terminalDetector = new TerminalDetector();
    }
    this.terminalDetector = terminalDetector;

    if (!borderRenderer) {
      const BorderRenderer = require('../visual/BorderRenderer');
      const visualConstants = require('../config/visual-constants');
      borderRenderer = new BorderRenderer(this.terminalDetector, visualConstants, this.themeEngine);
    }
    this.borderRenderer = borderRenderer;

    if (!layoutManager) {
      const LayoutManager = require('../visual/LayoutManager');
      const visualConstants = require('../config/visual-constants');
      layoutManager = new LayoutManager(this.terminalDetector, visualConstants);
    }
    this.layoutManager = layoutManager;

    if (!iconMapper) {
      const IconMapper = require('../visual/IconMapper');
      iconMapper = new IconMapper(this.terminalDetector);
    }
    this.iconMapper = iconMapper;

    // Legacy icon fallback (kept for backwards compatibility)
    this.icons = {
      settings: this.iconMapper.getIcon('settings'),
      download: this.iconMapper.getIcon('download'),
      upload: this.iconMapper.getIcon('upload'),
      docs: this.iconMapper.getIcon('docs'),
      stats: this.iconMapper.getIcon('stats'),
      refresh: this.iconMapper.getIcon('refresh'),
      help: this.iconMapper.getIcon('help'),
      exit: this.iconMapper.getIcon('exit'),
      success: this.iconMapper.getStatusIcon('success'),
      error: this.iconMapper.getStatusIcon('error'),
      warning: this.iconMapper.getStatusIcon('warning'),
      info: this.iconMapper.getStatusIcon('info')
    };

    // Status indicators (using iconMapper)
    this.statusSymbols = {
      success: this.iconMapper.getStatusIcon('success'),
      error: this.iconMapper.getStatusIcon('error'),
      warning: this.iconMapper.getStatusIcon('warning'),
      neutral: this.iconMapper.getStatusIcon('neutral')
    };

    // Cache para otimização
    this.cachedOutput = null;
    this.lastState = null;

    // Setup resize listener
    this._setupResizeListener();
  }

  /**
   * Renderiza o menu completo
   * Requirements: 2.1, 2.2, 3.1, 5.1
   *
   * @param {Object} state - Estado atual do menu
   * @param {Array} state.options - Opções do menu
   * @param {number} state.selectedIndex - Índice selecionado
   * @param {string} state.mode - Modo atual
   * @param {boolean} state.isExecuting - Se está executando comando
   */
  render(state) {
    if (!state || !Array.isArray(state.options)) {
      throw new Error('Invalid state: options array is required');
    }

    // Save state for resize re-rendering
    this._updateLastState(state);

    // Renderizar baseado no modo
    switch (state.mode) {
    case 'navigation':
      return this.renderNavigationMode(state);
    case 'preview':
      return this.renderPreviewMode(state);
    case 'history':
      return this.renderHistoryMode(state);
    case 'config':
      return this.renderConfigMode(state);
    case 'help':
      return this.renderHelpMode(state);
    default:
      return this.renderNavigationMode(state);
    }
  }

  /**
   * Renderiza modo de navegação normal
   * @private
   */
  renderNavigationMode(state) {
    this.clear();

    const output = [];
    output.push(this.renderHeader());
    output.push(this.renderOptions(state.options, state.selectedIndex));
    output.push(this.renderDescription(state.options[state.selectedIndex]));
    output.push(this.renderFooter());

    const rendered = output.join('\n');
    process.stdout.write(rendered);
    return rendered;
  }

  /**
   * Renderiza header do menu com bordas decorativas modernas
   * Requirements: 2.4
   *
   * Usa BorderRenderer para criar cabeçalho com bordas Unicode/ASCII
   * com fallback automático baseado em capacidades do terminal.
   */
  renderHeader() {
    const title = 'DOCS-JANA CLI';
    const subtitle = 'Documentation & Workflow Management';
    const contentWidth = this.layoutManager.getContentWidth();

    const lines = [];

    // Top border (double style for header emphasis)
    const topBorder = this.borderRenderer.renderTopBorder(contentWidth, 'double');
    const coloredTopBorder = this.themeEngine.colorizeBorder
      ? this.themeEngine.colorizeBorder(topBorder, 'primary')
      : topBorder;
    lines.push(coloredTopBorder);

    // Title (centered and bold)
    const centeredTitle = this.layoutManager.centerText(title, contentWidth);
    const formattedTitle = this.themeEngine.format(
      this.themeEngine.colorize(centeredTitle, 'selected'),
      'bold'
    );
    lines.push(formattedTitle);

    // Separator line
    const separator = this.borderRenderer.renderSeparator(contentWidth, 'single');
    const coloredSeparator = this.themeEngine.colorizeBorder
      ? this.themeEngine.colorizeBorder(separator, 'secondary')
      : separator;
    lines.push(coloredSeparator);

    // Subtitle (centered and dimmed)
    const centeredSubtitle = this.layoutManager.centerText(subtitle, contentWidth);
    const formattedSubtitle = this.themeEngine.colorize(centeredSubtitle, 'dimText');
    lines.push(formattedSubtitle);

    // Bottom border
    const bottomBorder = this.borderRenderer.renderBottomBorder(contentWidth, 'double');
    const coloredBottomBorder = this.themeEngine.colorizeBorder
      ? this.themeEngine.colorizeBorder(bottomBorder, 'primary')
      : bottomBorder;
    lines.push(coloredBottomBorder);

    return '\n' + lines.join('\n') + '\n';
  }

  /**
   * Renderiza lista de opções com destaque visual
   * Requirements: 2.2, 2.3, 3.1, 4.3, 4.4
   *
   * @param {Array} options - Lista de opções
   * @param {number} selectedIndex - Índice selecionado
   */
  renderOptions(options, selectedIndex) {
    if (!Array.isArray(options) || options.length === 0) {
      return '\nNo options available\n';
    }

    if (selectedIndex < 0 || selectedIndex >= options.length) {
      throw new Error('Invalid selectedIndex');
    }

    const lines = [];
    lines.push(''); // Linha vazia antes das opções

    options.forEach((option, index) => {
      const isSelected = index === selectedIndex;
      const line = this.renderOption(option, isSelected, index);
      lines.push(line);
    });

    lines.push(''); // Linha vazia após opções
    return lines.join('\n');
  }

  /**
   * Renderiza uma única opção com ícones aprimorados e cores dinâmicas
   * Requirements: 2.2, 2.3, 3.1, 4.3, 4.4
   * @private
   */
  renderOption(option, isSelected, index) {
    // Get icon using IconMapper with automatic fallback
    const actionType = option.actionType || option.category || 'info';
    const icon = this.iconMapper.getIcon(actionType);

    const label = option.label || option.command || 'Unknown';
    const shortcut = option.shortcut ? `[${option.shortcut}]` : `[${index + 1}]`;

    // Renderizar status da última execução
    const statusIndicator = this.renderStatusIndicator(option.lastExecution);

    // Get selection indicator using IconMapper
    const selectionIndicator = isSelected
      ? this.iconMapper.getSelectionIndicator()
      : '  ';

    // Build line with proper spacing
    const parts = [
      icon,
      ' ',
      shortcut,
      ' ',
      label
    ];

    if (statusIndicator) {
      parts.push(' ');
      parts.push(statusIndicator);
    }

    let line = parts.join('');

    // Aplicar cores e formatação
    if (!this.themeEngine.chalk || this.themeEngine.colorSupport === 0) {
      // Fallback: sem cores, apenas indicador de seleção
      return `${selectionIndicator} ${line}`;
    }

    if (isSelected) {
      // Opção selecionada: fundo destacado + negrito + cor de texto específica
      line = this.themeEngine.format(
        this.themeEngine.colorize(line, 'selectedText', 'selected'),
        'bold'
      );
      return `${selectionIndicator} ${line}`;
    } else {
      // Opção normal: cor baseada em categoria com palette expandida
      const color = this.getCategoryColor(option.category);
      line = this.themeEngine.colorize(line, color);
      return `${selectionIndicator} ${line}`;
    }
  }

  /**
   * Renderiza indicador de status da última execução
   * Requirements: 4.4, 4.5
   * @private
   */
  renderStatusIndicator(lastExecution) {
    if (!lastExecution) {
      return '';
    }

    const symbol = lastExecution.status === 'success'
      ? this.statusSymbols.success
      : this.statusSymbols.error;

    const timeAgo = this.getRelativeTime(lastExecution.timestamp);

    if (!this.themeEngine.chalk) {
      return `(${symbol} ${timeAgo})`;
    }

    const color = lastExecution.status === 'success' ? 'success' : 'error';
    const formatted = this.themeEngine.colorize(`${symbol} ${timeAgo}`, color);
    return `(${formatted})`;
  }

  /**
   * Calcula tempo relativo (ex: "há 5 min")
   * Requirements: 4.4
   * @private
   */
  getRelativeTime(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'agora';
    if (diffMins < 60) return `há ${diffMins} min`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `há ${diffHours}h`;

    const diffDays = Math.floor(diffHours / 24);
    return `há ${diffDays}d`;
  }

  /**
   * Obtém cor baseada em categoria
   * Requirements: 2.4, 2.5, 2.6
   * @private
   */
  getCategoryColor(category) {
    const colorMap = {
      action: 'normal',
      info: 'info',
      destructive: 'error',
      utility: 'dim'
    };

    return colorMap[category] || 'normal';
  }

  /**
   * Renderiza descrição detalhada da opção selecionada com bordas modernas
   * Requirements: 5.1, 5.2, 5.4, 5.5
   *
   * @param {Object} option - Opção selecionada
   */
  renderDescription(option) {
    if (!option || !option.description) {
      return '';
    }

    const contentWidth = this.layoutManager.getContentWidth();
    const layoutMode = this.layoutManager.getLayoutMode();
    const lines = [];

    lines.push(''); // Linha vazia

    // Separator with border renderer
    const separator = this.borderRenderer.renderSeparator(contentWidth, 'single');
    const coloredSeparator = this.themeEngine.colorizeBorder
      ? this.themeEngine.colorizeBorder(separator, 'accent')
      : separator;
    lines.push(coloredSeparator);

    // Título da descrição
    const title = 'Descrição:';
    const formattedTitle = this.themeEngine.chalk
      ? this.themeEngine.format(this.themeEngine.colorize(title, 'highlight'), 'bold')
      : title;
    lines.push('  ' + formattedTitle);

    lines.push(''); // Linha vazia após título

    // Descrição usando LayoutManager para wrapping inteligente
    const descWidth = contentWidth - 4; // Account for padding
    const wrappedLines = this.layoutManager.wrapText(option.description, descWidth);

    wrappedLines.forEach(line => {
      lines.push('  ' + line);
    });

    lines.push(''); // Linha vazia antes do separador

    lines.push(coloredSeparator);
    return lines.join('\n');
  }

  /**
   * Quebra texto em múltiplas linhas (legacy method, now using LayoutManager)
   * Requirements: 5.5
   * @deprecated Use this.layoutManager.wrapText() instead
   * @private
   */
  wrapText(text, maxWidth = 58) {
    // Fallback to LayoutManager implementation
    if (this.layoutManager) {
      return this.layoutManager.wrapText(text, maxWidth).map(line => `  ${line}`).join('\n');
    }

    // Legacy implementation as fallback
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
    return lines.map(line => `  ${line}`).join('\n');
  }

  /**
   * Renderiza footer com atalhos de teclado e informações auxiliares
   * Requirements: 7.1
   *
   * Usa BorderRenderer para criar footer com bordas modernas e
   * LayoutManager para ajustar conteúdo à largura do terminal.
   */
  renderFooter() {
    const contentWidth = this.layoutManager.getContentWidth();
    const layoutMode = this.layoutManager.getLayoutMode();
    const lines = [];

    // Top border for footer
    const topBorder = this.borderRenderer.renderTopBorder(contentWidth, 'single');
    const coloredTopBorder = this.themeEngine.colorizeBorder
      ? this.themeEngine.colorizeBorder(topBorder, 'muted')
      : topBorder;
    lines.push(coloredTopBorder);

    // Shortcuts based on layout mode
    const shortcuts = layoutMode === 'compact'
      ? [
        { key: '↑↓', desc: 'Nav' },
        { key: '↵', desc: 'Sel' },
        { key: 'h', desc: 'Help' },
        { key: 'q', desc: 'Exit' }
      ]
      : [
        { key: '↑↓', desc: 'Navegar' },
        { key: 'Enter', desc: 'Selecionar' },
        { key: 'h', desc: 'Ajuda' },
        { key: 'q', desc: 'Sair' }
      ];

    const shortcutText = shortcuts
      .map(s => `${s.key}: ${s.desc}`)
      .join('  │  ');

    // Center shortcuts in footer
    const centeredShortcuts = this.layoutManager.centerText(shortcutText, contentWidth);

    if (!this.themeEngine.chalk) {
      lines.push(centeredShortcuts);
    } else {
      const formatted = this.themeEngine.colorize(centeredShortcuts, 'dimText');
      lines.push(formatted);
    }

    // Bottom border for footer
    const bottomBorder = this.borderRenderer.renderBottomBorder(contentWidth, 'single');
    const coloredBottomBorder = this.themeEngine.colorizeBorder
      ? this.themeEngine.colorizeBorder(bottomBorder, 'muted')
      : bottomBorder;
    lines.push(coloredBottomBorder);

    // Add terminal info in expanded mode
    if (layoutMode === 'expanded') {
      const capabilities = this.terminalDetector.detect();
      const infoText = `Terminal: ${capabilities.width}x${capabilities.height} │ Unicode: ${capabilities.supportsUnicode ? '✓' : '✗'} │ Colors: ${capabilities.colorLevel}`;
      const centeredInfo = this.layoutManager.centerText(infoText, contentWidth);
      const formattedInfo = this.themeEngine.colorize(centeredInfo, 'dimText');
      lines.push(formattedInfo);
    }

    return '\n' + lines.join('\n') + '\n';
  }

  /**
   * Renderiza status bar com último comando executado
   * Requirements: 4.3, 4.4
   */
  renderStatusBar(lastExecution) {
    if (!lastExecution) {
      return '';
    }

    const { commandName, status, timestamp } = lastExecution;
    const symbol = status === 'success' ? this.statusSymbols.success : this.statusSymbols.error;
    const timeAgo = this.getRelativeTime(timestamp);

    const text = `Último: ${symbol} ${commandName} (${timeAgo})`;

    if (!this.themeEngine.chalk) {
      return `\n${text}\n`;
    }

    const color = status === 'success' ? 'success' : 'error';
    const formatted = this.themeEngine.colorize(text, color);
    return `\n${formatted}\n`;
  }

  /**
   * Renderiza modo de preview
   * Requirements: 9.1, 9.2, 9.3, 9.4
   */
  renderPreviewMode(state) {
    this.clear();

    const option = state.options[state.selectedIndex];
    if (!option || !option.preview) {
      return this.renderNavigationMode(state);
    }

    return this.renderPreview(option.preview, option);
  }

  /**
   * Renderiza preview de comando
   * Requirements: 9.1, 9.2, 9.3, 9.4
   */
  renderPreview(preview, option) {
    const lines = [];

    // Header
    lines.push('');
    lines.push(this.themeEngine.format('PREVIEW DO COMANDO', 'bold'));
    lines.push('═'.repeat(60));
    lines.push('');

    // Nome do comando
    lines.push(`Comando: ${option.label || option.command}`);
    lines.push('');

    // Comando shell
    if (preview.shellCommand) {
      lines.push('Comando a executar:');
      lines.push(this.themeEngine.chalk
        ? this.themeEngine.colorize(`  $ ${preview.shellCommand}`, 'info')
        : `  $ ${preview.shellCommand}`
      );
      lines.push('');
    }

    // Arquivos/diretórios afetados
    if (preview.affectedPaths && preview.affectedPaths.length > 0) {
      lines.push('Arquivos/diretórios afetados:');
      preview.affectedPaths.forEach(path => {
        lines.push(`  • ${path}`);
      });
      lines.push('');
    }

    // Tempo estimado
    if (preview.estimatedDuration) {
      lines.push(`Tempo estimado: ~${preview.estimatedDuration}s`);
      lines.push('');
    }

    // Aviso (se houver)
    if (preview.warning) {
      const warning = this.themeEngine.chalk
        ? this.themeEngine.colorize(`⚠ ${preview.warning}`, 'warning')
        : `⚠ ${preview.warning}`;
      lines.push(warning);
      lines.push('');
    }

    lines.push('═'.repeat(60));
    lines.push('');
    lines.push('Pressione Enter para confirmar ou Esc para cancelar');
    lines.push('');

    const output = lines.join('\n');
    process.stdout.write(output);
    return output;
  }

  /**
   * Renderiza modo de histórico
   * Requirements: 8.2, 8.3, 8.4
   */
  renderHistoryMode(state) {
    this.clear();

    if (!state.history || state.history.length === 0) {
      return this.renderEmptyHistory();
    }

    return this.renderHistory(state.history);
  }

  /**
   * Renderiza histórico de execuções
   * Requirements: 8.2, 8.3, 8.4
   */
  renderHistory(history) {
    const lines = [];

    // Header
    lines.push('');
    lines.push(this.themeEngine.format('HISTÓRICO DE COMANDOS', 'bold'));
    lines.push('═'.repeat(60));
    lines.push('');

    // Criar tabela com cli-table3
    const table = new cliTable({
      head: ['Status', 'Comando', 'Quando', 'Duração'],
      style: {
        head: this.themeEngine.chalk ? [] : ['cyan'],
        border: this.themeEngine.chalk ? [] : ['gray']
      },
      colWidths: [8, 25, 12, 10]
    });

    history.slice(0, 10).forEach(record => {
      const status = record.status === 'success' ? this.statusSymbols.success : this.statusSymbols.error;
      const statusColored = this.themeEngine.chalk
        ? this.themeEngine.colorize(status, record.status === 'success' ? 'success' : 'error')
        : status;

      const timeAgo = this.getRelativeTime(record.timestamp);
      const duration = `${record.duration}ms`;

      table.push([statusColored, record.commandName, timeAgo, duration]);
    });

    lines.push(table.toString());
    lines.push('');
    lines.push('Pressione Esc para voltar ao menu');
    lines.push('');

    const output = lines.join('\n');
    process.stdout.write(output);
    return output;
  }

  /**
   * Renderiza histórico vazio
   * @private
   */
  renderEmptyHistory() {
    const lines = [];
    lines.push('');
    lines.push(this.themeEngine.format('HISTÓRICO DE COMANDOS', 'bold'));
    lines.push('═'.repeat(60));
    lines.push('');
    lines.push('  Nenhum comando executado ainda.');
    lines.push('');
    lines.push('Pressione Esc para voltar ao menu');
    lines.push('');

    const output = lines.join('\n');
    process.stdout.write(output);
    return output;
  }

  /**
   * Renderiza modo de configuração
   * Requirements: 10.1, 10.2, 10.3
   */
  renderConfigMode(state) {
    this.clear();

    if (!state.config) {
      return this.renderNavigationMode(state);
    }

    return this.renderConfig(state.config);
  }

  /**
   * Renderiza tela de configurações
   * Requirements: 10.1, 10.2, 10.3
   */
  renderConfig(config) {
    const lines = [];

    // Header
    lines.push('');
    lines.push(this.themeEngine.format('CONFIGURAÇÕES', 'bold'));
    lines.push('═'.repeat(60));
    lines.push('');

    // Opções de configuração
    const configOptions = [
      { key: 'Tema', value: config.theme || 'default' },
      { key: 'Animações', value: config.animationsEnabled ? 'Habilitadas' : 'Desabilitadas' },
      { key: 'Velocidade', value: config.animationSpeed || 'normal' },
      { key: 'Ícones', value: config.iconsEnabled ? 'Habilitados' : 'Desabilitados' },
      { key: 'Descrições', value: config.showDescriptions ? 'Sim' : 'Não' },
      { key: 'Previews', value: config.showPreviews ? 'Sim' : 'Não' }
    ];

    configOptions.forEach(option => {
      lines.push(`  ${option.key}: ${option.value}`);
    });

    lines.push('');
    lines.push('═'.repeat(60));
    lines.push('');
    lines.push('Pressione Esc para voltar ao menu');
    lines.push('');

    const output = lines.join('\n');
    process.stdout.write(output);
    return output;
  }

  /**
   * Renderiza modo de ajuda
   * Requirements: 7.3
   */
  renderHelpMode(state) {
    this.clear();

    const shortcuts = this.keyboardMapper.getAllShortcuts();
    return this.renderHelp(shortcuts);
  }

  /**
   * Renderiza tela de ajuda com atalhos
   * Requirements: 7.1, 7.3
   */
  renderHelp(shortcuts) {
    const lines = [];

    // Header
    lines.push('');
    lines.push(this.themeEngine.format('AJUDA - ATALHOS DE TECLADO', 'bold'));
    lines.push('═'.repeat(60));
    lines.push('');

    // Criar tabela de atalhos
    const table = new cliTable({
      head: ['Tecla', 'Ação', 'Descrição'],
      style: {
        head: this.themeEngine.chalk ? [] : ['cyan'],
        border: this.themeEngine.chalk ? [] : ['gray']
      },
      colWidths: [10, 20, 28]
    });

    shortcuts.forEach(shortcut => {
      table.push([shortcut.key, shortcut.action, shortcut.description]);
    });

    lines.push(table.toString());
    lines.push('');
    lines.push('Pressione Esc para voltar ao menu');
    lines.push('');

    const output = lines.join('\n');
    process.stdout.write(output);
    return output;
  }

  /**
   * Limpa a tela
   * Requirements: Renderização limpa
   */
  clear() {
    // Clear screen usando ANSI escape codes
    // \x1Bc - Reset completo do terminal
    process.stdout.write('\x1Bc');
  }

  /**
   * Obtém largura do terminal
   * @private
   */
  getTerminalWidth() {
    return process.stdout.columns || 80;
  }

  /**
   * Verifica se terminal suporta cores
   * @private
   */
  supportsColor() {
    return this.themeEngine.colorSupport > 0;
  }

  /**
   * Configura listener para redimensionamento de terminal
   * Requirements: Phase 4, Task 17
   * @private
   */
  _setupResizeListener() {
    if (!this.terminalDetector) {
      return;
    }

    // Setup debounced resize handler
    this.terminalDetector.onResize(() => {
      // Invalidate cache on resize
      this.cachedOutput = null;
      this.lastState = null;

      // Re-render if we have a last state
      if (this.lastState) {
        this.render(this.lastState);
      }
    });
  }

  /**
   * Atualiza o lastState para permitir re-renderização em resize
   * @private
   */
  _updateLastState(state) {
    this.lastState = {
      ...state,
      options: [...state.options],
      timestamp: Date.now()
    };
  }
}

module.exports = UIRenderer;
