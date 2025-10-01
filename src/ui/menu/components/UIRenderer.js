/**
 * UIRenderer - Renderiza interface visual do menu interativo
 *
 * Responsável por:
 * - Renderizar menu completo com opções e descrições
 * - Aplicar temas e cores via ThemeEngine
 * - Exibir ícones, status, e indicadores visuais
 * - Renderizar modos especiais (preview, history, config, help)
 * - Gerenciar animações via AnimationEngine
 * - Adaptar a diferentes tamanhos de terminal
 *
 * Requirements: REQ-2, REQ-3, REQ-4, REQ-5, REQ-6
 */

const cliTable = require('cli-table3');

class UIRenderer {
  /**
   * @param {Object} dependencies - Dependências injetadas
   * @param {ThemeEngine} dependencies.themeEngine - Engine de temas
   * @param {AnimationEngine} dependencies.animationEngine - Engine de animações
   * @param {KeyboardMapper} dependencies.keyboardMapper - Mapeador de atalhos
   */
  constructor({ themeEngine, animationEngine, keyboardMapper }) {
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

    // Ícones Unicode padrão
    this.icons = {
      settings: '⚙️',
      download: '📥',
      upload: '📤',
      docs: '📋',
      stats: '📊',
      refresh: '🔄',
      help: '❓',
      exit: '🚪',
      success: '✓',
      error: '✗',
      warning: '⚠',
      info: '•'
    };

    // Status indicators
    this.statusSymbols = {
      success: '✓',
      error: '✗',
      warning: '⚠',
      neutral: '•'
    };

    // Cache para otimização
    this.cachedOutput = null;
    this.lastState = null;
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
   * Renderiza header do menu
   * Requirements: 2.4
   */
  renderHeader() {
    const title = 'DOCS-JANA CLI';
    const subtitle = 'Documentation & Workflow Management';

    if (!this.themeEngine.chalk) {
      return `\n${title}\n${subtitle}\n`;
    }

    const formattedTitle = this.themeEngine.format(
      this.themeEngine.colorize(title, 'selected'),
      'bold'
    );
    const formattedSubtitle = this.themeEngine.colorize(subtitle, 'dim');

    return `\n${formattedTitle}\n${formattedSubtitle}\n`;
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
   * Renderiza uma única opção
   * @private
   */
  renderOption(option, isSelected, index) {
    const icon = option.icon || this.icons.info;
    const label = option.label || option.command || 'Unknown';
    const shortcut = option.shortcut ? `[${option.shortcut}]` : `[${index + 1}]`;

    // Renderizar status da última execução
    const statusIndicator = this.renderStatusIndicator(option.lastExecution);

    // Montar linha
    let line = `  ${icon}  ${shortcut} ${label} ${statusIndicator}`;

    // Aplicar cores e formatação
    if (!this.themeEngine.chalk || this.themeEngine.colorSupport === 0) {
      // Fallback: usar ▶ para selecionado, > também funciona
      return isSelected ? `▶ ${line}` : `  ${line}`;
    }

    if (isSelected) {
      // Opção selecionada: fundo destacado + negrito
      line = this.themeEngine.format(
        this.themeEngine.colorize(line, 'selected'),
        'bold'
      );
      return `▶ ${line}`;
    } else {
      // Opção normal: cor baseada em categoria
      const color = this.getCategoryColor(option.category);
      line = this.themeEngine.colorize(line, color);
      return `  ${line}`;
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
   * Renderiza descrição detalhada da opção selecionada
   * Requirements: 5.1, 5.2, 5.4, 5.5
   *
   * @param {Object} option - Opção selecionada
   */
  renderDescription(option) {
    if (!option || !option.description) {
      return '';
    }

    const lines = [];
    lines.push(''); // Linha vazia
    lines.push('─'.repeat(60)); // Separador

    // Título da descrição
    const title = 'Descrição:';
    lines.push(this.themeEngine.chalk
      ? this.themeEngine.format(title, 'bold')
      : title
    );

    // Descrição (quebrada em múltiplas linhas se necessário)
    const wrappedDescription = this.wrapText(option.description, 58);
    lines.push(wrappedDescription);

    lines.push('─'.repeat(60)); // Separador
    return lines.join('\n');
  }

  /**
   * Quebra texto em múltiplas linhas
   * Requirements: 5.5
   * @private
   */
  wrapText(text, maxWidth = 58) {
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
   * Renderiza footer com atalhos de teclado
   * Requirements: 7.1
   */
  renderFooter() {
    const shortcuts = [
      { key: '↑↓', desc: 'Navegar' },
      { key: 'Enter', desc: 'Selecionar' },
      { key: 'h', desc: 'Ajuda' },
      { key: 'q', desc: 'Sair' }
    ];

    const shortcutText = shortcuts
      .map(s => `${s.key}: ${s.desc}`)
      .join('  |  ');

    if (!this.themeEngine.chalk) {
      return `\n${shortcutText}\n`;
    }

    const formatted = this.themeEngine.colorize(shortcutText, 'dim');
    return `\n${formatted}\n`;
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
}

module.exports = UIRenderer;
