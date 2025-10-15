/**
 * MenuOrchestrator - Coordenador central do menu interativo
 *
 * Responsável por:
 * - Inicializar e coordenar todos os 8 componentes do menu
 * - Gerenciar o ciclo de vida do menu (start → navigation → execution → cleanup)
 * - Orquestrar fluxo entre modos (navigation, preview, history, config, help)
 * - Integrar entrada do usuário com atualizações de estado e renderização
 * - Executar comandos e registrar no histórico
 *
 * Components integrated:
 * 1. StateManager - Gerenciamento de estado
 * 2. ConfigManager - Configurações do usuário
 * 3. CommandHistory - Histórico de execução
 * 4. ThemeEngine - Sistema de temas e cores
 * 5. AnimationEngine - Animações e spinners
 * 6. KeyboardMapper - Mapeamento de atalhos
 * 7. InputHandler - Captura de entrada
 * 8. UIRenderer - Renderização de interface
 *
 * Requirements: REQ-11 (Modularização e Coordenação)
 */

const StateManager = require('./StateManager');
const ConfigManager = require('./ConfigManager');
const CommandHistory = require('./CommandHistory');
const ThemeEngine = require('../utils/ThemeEngine');
const AnimationEngine = require('../utils/AnimationEngine');
const KeyboardMapper = require('../utils/KeyboardMapper');
const InputHandler = require('./InputHandler');
const UIRenderer = require('./UIRenderer');
const CommandExecutor = require('./CommandExecutor');
const ErrorHandler = require('../utils/ErrorHandler');
const MenuLogger = require('../utils/MenuLogger');
const { getAllOptions } = require('../config/menu-options');

/**
 * @class MenuOrchestrator
 * @description Coordenador central do menu interativo que integra e orquestra todos os 8 componentes
 * do sistema de menu. Gerencia o ciclo de vida completo: inicialização → navegação → execução → cleanup.
 *
 * Componentes integrados:
 * - StateManager: Gerenciamento de estado
 * - ConfigManager: Configurações do usuário
 * - CommandHistory: Histórico de execução
 * - ThemeEngine: Sistema de temas e cores
 * - AnimationEngine: Animações e spinners
 * - KeyboardMapper: Mapeamento de atalhos
 * - InputHandler: Captura de entrada
 * - UIRenderer: Renderização de interface
 *
 * @example
 * // Uso básico
 * const menu = new MenuOrchestrator({
 *   menuOptions: [
 *     { command: 'download', label: 'Download workflows', icon: '📥' },
 *     { command: 'upload', label: 'Upload workflows', icon: '📤' }
 *   ]
 * });
 *
 * await menu.initialize();
 * const result = await menu.show();
 * console.log('Selected:', result.option.command);
 * await menu.shutdown();
 *
 * @example
 * // Uso com configuração customizada
 * const menu = new MenuOrchestrator({
 *   menuOptions: getAllOptions(),
 *   config: {
 *     theme: 'dark',
 *     animationsEnabled: false,
 *     verbose: true
 *   }
 * });
 */
class MenuOrchestrator {
  /**
   * Cria instância do MenuOrchestrator
   * @param {Object} [options={}] - Opções de configuração
   * @param {Array} [options.menuOptions] - Array de opções do menu (usa padrão se omitido)
   * @param {Object} [options.config] - Configuração customizada (sobrescreve preferências do usuário)
   */
  constructor(options = {}) {
    this.menuOptions = options.menuOptions || getAllOptions();
    this.customConfig = options.config || {};

    // Componentes (inicializados em initialize())
    this.stateManager = null;
    this.configManager = null;
    this.commandHistory = null;
    this.themeEngine = null;
    this.animationEngine = null;
    this.keyboardMapper = null;
    this.inputHandler = null;
    this.uiRenderer = null;
    this.commandExecutor = null;
    this.errorHandler = null;
    this.logger = null;

    // Estado de execução
    this.isRunning = false;
    this.isShuttingDown = false;
    this.currentMode = 'navigation';

    // Resolvers para promises de seleção
    this.selectionResolver = null;

    // Terminal resize handler
    this.handleResize = this.onTerminalResize.bind(this);
    this.handleInterrupt = this.onInterrupt.bind(this);
  }

  /**
   * Inicializa todos os 9 componentes do menu na ordem correta
   * Sequência: Logger → ErrorHandler → ConfigManager → CommandHistory → ThemeEngine →
   * AnimationEngine → KeyboardMapper → StateManager → InputHandler → UIRenderer → CommandExecutor
   *
   * @returns {Promise<void>}
   * @throws {Error} Se inicialização falhar (ex: erro ao carregar tema)
   *
   * @example
   * const menu = new MenuOrchestrator({ menuOptions });
   * await menu.initialize();
   * // Menu pronto para uso com todos os componentes carregados
   */
  async initialize() {
    if (this.isRunning) {
      throw new Error('Menu already running');
    }

    try {
      // 0. Logger e ErrorHandler - Inicializa primeiro para ter logging desde o início
      this.logger = new MenuLogger({
        level: process.env.DEBUG ? 'debug' : 'info',
        enabled: true
      });

      this.errorHandler = new ErrorHandler({
        debug: process.env.DEBUG === 'true',
        logger: this.logger
      });

      this.logger.info('Initializing MenuOrchestrator...');
      this.logger.startTimer('menu-initialization');

      // 1. ConfigManager - Carrega preferências do usuário
      this.configManager = new ConfigManager();
      await this.configManager.load();

      // Merge com configuração customizada
      const userPrefs = this.configManager.get('preferences');
      const config = { ...userPrefs, ...this.customConfig };

      // 2. CommandHistory - Carrega histórico de execução
      this.commandHistory = new CommandHistory();
      await this.commandHistory.load();

      // 3. ThemeEngine - Inicializa sistema de temas
      this.themeEngine = new ThemeEngine();
      await this.themeEngine.initialize();
      await this.themeEngine.loadTheme(config.theme || 'default');

      // 4. AnimationEngine - Inicializa animações
      this.animationEngine = new AnimationEngine(config);

      // 5. KeyboardMapper - Inicializa mapeamento de atalhos
      this.keyboardMapper = new KeyboardMapper();
      if (config.keyboardShortcuts) {
        try {
          this.keyboardMapper.customizeKeymap(config.keyboardShortcuts);
        } catch (error) {
          console.warn('Failed to apply custom keyboard shortcuts:', error.message);
        }
      }

      // 6. StateManager - Inicializa estado do menu
      this.stateManager = new StateManager(this.enrichMenuOptions());
      this.attachStateObservers();

      // 7. InputHandler - Inicializa captura de entrada
      this.inputHandler = new InputHandler(this.stateManager, this.keyboardMapper);
      this.attachInputHandlers();

      // 8. UIRenderer - Inicializa renderizador
      this.uiRenderer = new UIRenderer({
        themeEngine: this.themeEngine,
        animationEngine: this.animationEngine,
        keyboardMapper: this.keyboardMapper
      });

      // 9. CommandExecutor - Inicializa executor de comandos
      this.commandExecutor = new CommandExecutor({
        verbose: config.verbose || false,
        debug: process.env.DEBUG === 'true'
      });

      // 10. Setup signal handlers para graceful shutdown
      this.setupSignalHandlers();

      this.isRunning = true;

      const initDuration = this.logger.endTimer('menu-initialization');
      this.logger.info(`MenuOrchestrator initialized successfully in ${initDuration}ms`);
    } catch (error) {
      // Usa error handler se disponível
      if (this.errorHandler) {
        const errorResponse = this.errorHandler.handle(error, { phase: 'initialization' });
        const userMessage = this.errorHandler.formatUserMessage(errorResponse);
        console.error(userMessage);
      } else {
        console.error(`Failed to initialize menu: ${error.message}`);
      }

      // Cleanup em caso de erro durante inicialização
      await this.cleanup();
      throw new Error(`Failed to initialize menu: ${error.message}`);
    }
  }

  /**
   * Enriquece opções do menu com dados do histórico
   * @private
   * @returns {Array} Opções enriquecidas
   */
  enrichMenuOptions() {
    return this.menuOptions.map(option => {
      const lastExecution = this.commandHistory.getLastExecution(option.command);
      return {
        ...option,
        lastExecution
      };
    });
  }

  /**
   * Anexa observers ao StateManager para atualizar UI
   * @private
   */
  attachStateObservers() {
    this.stateManager.subscribe((_eventType, _data) => {
      // Re-renderiza UI quando estado muda (exceto durante execução)
      if (!this.stateManager.getState().isExecuting) {
        this.updateDisplay();
      }
    });
  }

  /**
   * Anexa handlers de entrada ao InputHandler
   * @private
   */
  attachInputHandlers() {
    // Enter - Seleção/Execução
    this.inputHandler.on('enter', async () => {
      await this.handleSelection();
    });

    // Escape - Voltar/Sair
    this.inputHandler.on('escape', async () => {
      await this.handleEscape();
    });

    // Atalhos
    this.inputHandler.on('shortcut', async (data) => {
      await this.handleShortcut(data);
    });

    // Arrow keys - Já tratadas pelo InputHandler + StateManager automaticamente
    this.inputHandler.on('arrow-up', () => {
      // StateManager já atualizou, apenas re-renderiza
      this.updateDisplay();
    });

    this.inputHandler.on('arrow-down', () => {
      // StateManager já atualizou, apenas re-renderiza
      this.updateDisplay();
    });
  }

  /**
   * Exibe o menu interativo e aguarda seleção do usuário (main entry point)
   *
   * @param {Object} [options={}] - Opções de exibição
   * @param {Array} [options.menuOptions] - Sobrescreve opções do menu temporariamente
   * @returns {Promise<Object>} Promise que resolve quando usuário selecionar ou cancelar
   * @returns {Promise<{action: string, option?: Object, success?: boolean}>}
   * @throws {Error} Se terminal não for interativo
   *
   * @example
   * // Uso básico
   * const menu = new MenuOrchestrator({ menuOptions });
   * await menu.initialize();
   * const result = await menu.show();
   *
   * if (result.action === 'executed') {
   *   console.log(`Executou: ${result.option.command}`);
   * } else if (result.action === 'cancelled') {
   *   console.log('Usuário cancelou');
   * } else if (result.action === 'exit') {
   *   console.log('Usuário saiu');
   * }
   *
   * @example
   * // Com opções temporárias
   * const result = await menu.show({
   *   menuOptions: [
   *     { command: 'option1', label: 'Opção 1' },
   *     { command: 'option2', label: 'Opção 2' }
   *   ]
   * });
   */
  async show(options = {}) {
    // Inicializa se necessário
    if (!this.isRunning) {
      await this.initialize();
    }

    // Atualiza opções se fornecidas
    if (options.menuOptions) {
      this.menuOptions = options.menuOptions;
      this.stateManager.setOptions(this.enrichMenuOptions());
    }

    // Verifica se terminal é interativo
    if (!this.inputHandler.isInteractive()) {
      throw new Error('Terminal is not interactive. Cannot display menu.');
    }

    // Inicia captura de entrada
    this.inputHandler.start();

    // Renderiza menu inicial
    this.updateDisplay();

    // Aguarda seleção do usuário
    return new Promise((resolve) => {
      this.selectionResolver = resolve;
    });
  }

  /**
   * Atualiza display baseado no estado atual
   * @private
   */
  updateDisplay() {
    if (this.isShuttingDown) {
      return;
    }

    const state = this.stateManager.getState();
    this.uiRenderer.render(state);
  }

  /**
   * Processa seleção do usuário (Enter pressionado)
   * @private
   */
  async handleSelection() {
    const state = this.stateManager.getState();
    const selectedOption = state.options[state.selectedIndex];

    // Se estamos em modo especial (preview, history, etc), volta para navigation
    if (state.mode !== 'navigation') {
      this.switchMode('navigation');
      return;
    }

    // Comandos especiais (não executam, apenas mudam modo)
    if (selectedOption.command === 'history') {
      await this.showHistory();
      return;
    }

    if (selectedOption.command === 'config') {
      await this.showConfig();
      return;
    }

    if (selectedOption.command === 'help') {
      this.switchMode('help');
      return;
    }

    if (selectedOption.command === 'exit') {
      await this.shutdown();
      if (this.selectionResolver) {
        this.selectionResolver({ action: 'exit', option: selectedOption });
      }
      return;
    }

    // Mostrar preview se configurado
    const config = this.configManager.get('preferences');
    if (config.showPreviews && selectedOption.preview) {
      this.switchMode('preview');
      return;
    }

    // Executar comando
    await this.executeCommand(selectedOption);
  }

  /**
   * Processa tecla Escape (voltar/sair)
   * @private
   */
  async handleEscape() {
    const state = this.stateManager.getState();

    // Se estamos em modo especial, volta para navigation
    if (state.mode !== 'navigation') {
      this.switchMode('navigation');
      return;
    }

    // Se estamos em navigation, sai
    await this.shutdown();
    if (this.selectionResolver) {
      this.selectionResolver({ action: 'cancelled' });
    }
  }

  /**
   * Processa atalho de teclado
   * @private
   */
  async handleShortcut(data) {
    const { action, value } = data;

    switch (action) {
    case 'help':
      this.switchMode('help');
      break;

    case 'history':
      await this.showHistory();
      break;

    case 'config':
      await this.showConfig();
      break;

    case 'refresh':
      // Re-enriquece opções com histórico atualizado
      this.stateManager.setOptions(this.enrichMenuOptions());
      this.updateDisplay();
      break;

    case 'preview': {
      const state = this.stateManager.getState();
      const option = state.options[state.selectedIndex];
      if (option.preview) {
        this.switchMode('preview');
      }
      break;
    }

    case 'direct-select':
      // Seleção direta por número (1-9)
      if (typeof value === 'number' && value >= 1 && value <= this.menuOptions.length) {
        this.stateManager.setSelectedIndex(value - 1);
        await this.handleSelection();
      }
      break;

    default:
      // Atalho não reconhecido, ignora
      break;
    }
  }

  /**
   * Muda o modo de exibição do menu
   *
   * @param {string} mode - Novo modo ('navigation', 'preview', 'history', 'config', 'help')
   *
   * @example
   * // Mostrar histórico de comandos
   * menu.switchMode('history');
   *
   * @example
   * // Voltar para navegação normal
   * menu.switchMode('navigation');
   */
  switchMode(mode) {
    // Prepara dados específicos do modo antes de mudar
    if (mode === 'history') {
      this.stateManager.state.history = this.commandHistory.getRecent(10);
    } else if (mode === 'config') {
      this.stateManager.state.config = this.configManager.get('preferences');
    }

    this.stateManager.setMode(mode);
    this.currentMode = mode;
    this.updateDisplay();
  }

  /**
   * Mostra histórico de comandos
   * @private
   */
  async showHistory() {
    this.switchMode('history');
  }

  /**
   * Mostra tela de configurações
   * @private
   */
  async showConfig() {
    this.switchMode('config');
  }

  /**
   * Executa comando selecionado com spinner, logging e tratamento de erros
   *
   * @param {Object} option - Opção do menu selecionada
   * @param {string} option.command - Nome do comando a executar
   * @param {string} option.label - Label amigável do comando
   * @returns {Promise<void>}
   *
   * @example
   * // Executado automaticamente quando usuário pressiona Enter em uma opção
   * // Mas pode ser chamado manualmente:
   * const option = { command: 'download', label: 'Download workflows' };
   * await menu.executeCommand(option);
   * // Exibe spinner, executa comando, registra no histórico, mostra resultado
   */
  async executeCommand(option) {
    const startTime = Date.now();
    this.logger?.info(`Executing command: ${option.command}`);
    this.logger?.startTimer(`command-execution-${option.command}`);

    try {
      // Marca como executando
      this.stateManager.setExecuting(option.command);

      // Mostra spinner
      await this.animationEngine.showSpinner(`Executando ${option.label}...`);

      // Executa comando real através do CommandExecutor
      await this.executeRealCommand(option);

      const duration = Date.now() - startTime;
      this.logger?.endTimer(`command-execution-${option.command}`);

      // Registra no histórico
      this.commandHistory.add({
        commandName: option.command,
        exitCode: 0,
        duration,
      });

      // Salva histórico
      await this.commandHistory.save();

      // Para spinner com sucesso
      this.animationEngine.stopSpinner('success', `${option.label} concluído!`);

      // Limpa estado de execução
      this.stateManager.clearExecuting();

      // Atualiza opções com novo histórico
      this.stateManager.setOptions(this.enrichMenuOptions());

      // Volta para menu ou retorna baseado em configuração
      const config = this.configManager.get('preferences');
      if (config.returnToMenuAfterExecution !== false) {
        // Aguarda um momento para usuário ver o feedback
        await new Promise(resolve => setTimeout(resolve, 1500));
        this.updateDisplay();
      } else {
        // Retorna imediatamente
        if (this.selectionResolver) {
          this.selectionResolver({ action: 'executed', option, success: true });
        }
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger?.endTimer(`command-execution-${option.command}`);

      // Trata erro com ErrorHandler
      const errorResponse = this.errorHandler?.handle(error, {
        command: option.command,
        phase: 'execution'
      }) || {
        message: error.message,
        suggestion: 'Tente novamente ou verifique a configuração.'
      };

      this.logger?.error('Command execution failed', error, {
        command: option.command,
        duration
      });

      // Registra erro no histórico
      this.commandHistory.add({
        commandName: option.command,
        exitCode: 1,
        duration,
        error: error.message
      });

      await this.commandHistory.save();

      // Para spinner com erro
      const errorMessage = this.errorHandler
        ? `${errorResponse.message}\n${errorResponse.suggestion}`
        : error.message;
      this.animationEngine.stopSpinner('error', `Erro: ${errorMessage}`);

      // Limpa estado de execução
      this.stateManager.clearExecuting();

      // Atualiza display
      await new Promise(resolve => setTimeout(resolve, 2000));
      this.stateManager.setOptions(this.enrichMenuOptions());
      this.updateDisplay();
    }
  }

  /**
   * Executa comando real através do CommandExecutor
   * @private
   */
  async executeRealCommand(option) {
    // Se é comando especial do menu (history, config, help, exit), não executa
    const specialCommands = ['history', 'config', 'help', 'exit'];
    if (specialCommands.includes(option.command)) {
      throw new Error(`Cannot execute special command: ${option.command}`);
    }

    // Executa comando real
    const result = await this.commandExecutor.execute(option.command, [], {});

    if (!result.success) {
      throw new Error(result.message);
    }

    return result;
  }

  /**
   * Configura handlers para sinais de sistema (SIGINT, SIGTERM) e resize
   * Requirements: REQ-21 (Graceful Shutdown), REQ-20 (Terminal Resize)
   * @private
   */
  setupSignalHandlers() {
    // SIGINT (Ctrl+C) - Graceful shutdown
    process.on('SIGINT', this.handleInterrupt);

    // SIGTERM - Graceful shutdown
    process.on('SIGTERM', this.handleInterrupt);

    // Terminal resize
    process.stdout.on('resize', this.handleResize);
  }

  /**
   * Remove handlers de sinais
   * @private
   */
  removeSignalHandlers() {
    process.removeListener('SIGINT', this.handleInterrupt);
    process.removeListener('SIGTERM', this.handleInterrupt);

    if (process.stdout.removeListener) {
      process.stdout.removeListener('resize', this.handleResize);
    }
  }

  /**
   * Handler para interrupção (Ctrl+C)
   * Requirements: REQ-21 (Graceful Shutdown on Ctrl+C)
   * @private
   */
  async onInterrupt() {
    if (this.isShuttingDown) {
      return;
    }

    console.log('\n\n🛑 Recebido sinal de interrupção (Ctrl+C)...');
    console.log('⏳ Salvando estado e encerrando graciosamente...\n');

    await this.shutdown();
    process.exit(0);
  }

  /**
   * Handler para redimensionamento do terminal
   * Requirements: REQ-20 (Terminal Resize Handling)
   * @private
   */
  onTerminalResize() {
    if (this.isShuttingDown || !this.isRunning) {
      return;
    }

    // Re-renderiza com novo tamanho de terminal
    try {
      this.updateDisplay();
    } catch (error) {
      // Ignora erros de renderização durante resize
      if (this.commandExecutor?.debug) {
        console.error('[MenuOrchestrator] Resize render error:', error.message);
      }
    }
  }

  /**
   * Encerra o menu graciosamente salvando estado e limpando recursos
   * Salva histórico, configurações, para animações, remove signal handlers
   *
   * @returns {Promise<void>}
   *
   * @example
   * const menu = new MenuOrchestrator({ menuOptions });
   * await menu.initialize();
   * await menu.show();
   * await menu.shutdown(); // Sempre chamar ao final
   *
   * @example
   * // Shutdown automático ao pressionar 'q' ou Escape
   * // Ou ao receber SIGINT (Ctrl+C) ou SIGTERM
   */
  async shutdown() {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;

    try {
      // Remove signal handlers
      this.removeSignalHandlers();

      // Para captura de entrada
      if (this.inputHandler) {
        this.inputHandler.stop();
      }

      // Para animações
      if (this.animationEngine) {
        this.animationEngine.cleanup();
      }

      // Salva histórico
      if (this.commandHistory) {
        await this.commandHistory.save();
      }

      // Salva configurações
      if (this.configManager) {
        await this.configManager.save();
      }

      // Limpa tela
      if (this.uiRenderer) {
        this.uiRenderer.clear();
        console.log('Menu encerrado. Até logo!');
      }
    } catch (error) {
      console.error('Error during shutdown:', error.message);
    } finally {
      this.isRunning = false;
      this.isShuttingDown = false;
    }
  }

  /**
   * Cleanup completo incluindo remoção de referências (para testes e error recovery)
   *
   * @returns {Promise<void>}
   *
   * @example
   * // Usado em testes para limpar entre execuções
   * afterEach(async () => {
   *   await menu.cleanup();
   * });
   *
   * @example
   * // Usado em error recovery durante inicialização
   * try {
   *   await menu.initialize();
   * } catch (error) {
   *   await menu.cleanup();
   *   throw error;
   * }
   */
  async cleanup() {
    await this.shutdown();

    // Limpa referências
    this.stateManager = null;
    this.configManager = null;
    this.commandHistory = null;
    this.themeEngine = null;
    this.animationEngine = null;
    this.keyboardMapper = null;
    this.inputHandler = null;
    this.uiRenderer = null;
  }

  /**
   * Obtém estado atual do menu (para debugging e testes)
   *
   * @returns {Object|null} Estado atual ou null se não inicializado
   * @returns {Object} state.options - Opções do menu
   * @returns {number} state.selectedIndex - Índice selecionado
   * @returns {string} state.mode - Modo atual
   * @returns {boolean} state.isExecuting - Se está executando comando
   *
   * @example
   * const state = menu.getState();
   * console.log(`Modo atual: ${state.mode}`);
   * console.log(`Opção selecionada: ${state.options[state.selectedIndex].label}`);
   */
  getState() {
    return this.stateManager?.getState() || null;
  }

  /**
   * Verifica se menu está rodando (inicializado e ativo)
   *
   * @returns {boolean} True se menu está ativo
   *
   * @example
   * if (menu.isActive()) {
   *   console.log('Menu está rodando');
   * } else {
   *   await menu.initialize();
   * }
   */
  isActive() {
    return this.isRunning;
  }
}

module.exports = MenuOrchestrator;
