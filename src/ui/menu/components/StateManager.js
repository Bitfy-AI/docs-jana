/**
 * StateManager - Gerenciamento de estado do menu interativo
 *
 * Responsável por manter e atualizar o estado do menu, incluindo:
 * - Opções disponíveis
 * - Índice selecionado
 * - Modo atual (navegação, preview, histórico, configuração)
 * - Estado de execução
 *
 * Implementa pattern Observer para notificar mudanças de estado.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

class StateManager {
  /**
   * @param {Object[]} options - Array de opções do menu
   */
  constructor(options = []) {
    this.state = {
      options: options,
      selectedIndex: 0,
      mode: 'navigation', // 'navigation' | 'preview' | 'history' | 'config'
      isExecuting: false,
      executingCommand: null
    };

    // Pattern Observer
    this.observers = [];
  }

  /**
   * Obtém o estado atual
   * @returns {Object} Estado atual do menu
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Obtém a opção atualmente selecionada
   * @returns {Object} Opção selecionada
   */
  getSelectedOption() {
    return this.state.options[this.state.selectedIndex];
  }

  /**
   * Define o índice selecionado (com validação)
   * @param {number} index - Novo índice
   */
  setSelectedIndex(index) {
    if (index < 0 || index >= this.state.options.length) {
      throw new Error(`Invalid index: ${index}. Must be between 0 and ${this.state.options.length - 1}`);
    }

    this.state.selectedIndex = index;
    this.notifyObservers('selectedIndexChanged', { index });
  }

  /**
   * Move seleção para cima (com navegação circular)
   * Requirements: 1.1, 1.2
   */
  moveUp() {
    const newIndex = this.state.selectedIndex === 0
      ? this.state.options.length - 1  // Circular: primeira → última
      : this.state.selectedIndex - 1;

    this.setSelectedIndex(newIndex);
  }

  /**
   * Move seleção para baixo (com navegação circular)
   * Requirements: 1.1, 1.2
   */
  moveDown() {
    const newIndex = this.state.selectedIndex === this.state.options.length - 1
      ? 0  // Circular: última → primeira
      : this.state.selectedIndex + 1;

    this.setSelectedIndex(newIndex);
  }

  /**
   * Define o modo do menu
   * @param {'navigation'|'preview'|'history'|'config'|'help'} mode - Novo modo
   */
  setMode(mode) {
    const validModes = ['navigation', 'preview', 'history', 'config', 'help'];

    if (!validModes.includes(mode)) {
      throw new Error(`Invalid mode: ${mode}. Must be one of: ${validModes.join(', ')}`);
    }

    this.state.mode = mode;
    this.notifyObservers('modeChanged', { mode });
  }

  /**
   * Marca início de execução de comando
   * @param {string} commandName - Nome do comando sendo executado
   */
  setExecuting(commandName) {
    this.state.isExecuting = true;
    this.state.executingCommand = commandName;
    this.notifyObservers('executionStarted', { commandName });
  }

  /**
   * Marca fim de execução de comando
   */
  clearExecuting() {
    this.state.isExecuting = false;
    this.state.executingCommand = null;
    this.notifyObservers('executionEnded', {});
  }

  /**
   * Atualiza as opções do menu
   * @param {Object[]} options - Novas opções
   */
  setOptions(options) {
    if (!Array.isArray(options) || options.length === 0) {
      throw new Error('Options must be a non-empty array');
    }

    this.state.options = options;

    // Ajusta selectedIndex se necessário
    if (this.state.selectedIndex >= options.length) {
      this.state.selectedIndex = 0;
    }

    this.notifyObservers('optionsChanged', { options });
  }

  /**
   * Registra um observer
   * @param {Function} observer - Callback que recebe (eventType, data)
   * @returns {Function} Função para remover o observer
   */
  subscribe(observer) {
    if (typeof observer !== 'function') {
      throw new Error('Observer must be a function');
    }

    this.observers.push(observer);

    // Retorna função de cleanup
    return () => this.unsubscribe(observer);
  }

  /**
   * Remove um observer
   * @param {Function} observer - Observer a remover
   */
  unsubscribe(observer) {
    this.observers = this.observers.filter(obs => obs !== observer);
  }

  /**
   * Notifica todos os observers
   * @private
   * @param {string} eventType - Tipo do evento
   * @param {Object} data - Dados do evento
   */
  notifyObservers(eventType, data) {
    this.observers.forEach(observer => {
      try {
        observer(eventType, data);
      } catch (error) {
        // Evita que erro em um observer quebre os outros
        console.error(`Error in observer for event ${eventType}:`, error);
      }
    });
  }

  /**
   * Reseta o estado para valores iniciais
   */
  reset() {
    this.state.selectedIndex = 0;
    this.state.mode = 'navigation';
    this.state.isExecuting = false;
    this.state.executingCommand = null;
    this.notifyObservers('stateReset', {});
  }
}

module.exports = StateManager;
