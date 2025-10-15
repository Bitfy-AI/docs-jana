/**
 * InputHandler - Captura e processamento de entrada do usuário
 *
 * Responsável por:
 * - Capturar entrada do teclado via stdin
 * - Integrar com KeyboardMapper para mapeamento de ações
 * - Integrar com StateManager para atualização de estado
 * - Suportar modo raw para captura imediata de teclas
 * - Lidar com terminais não-interativos
 * - Cleanup gracioso ao sair
 *
 * Requirements: REQ-1 (Navegação com Setas), REQ-6 (Atalhos de Teclado)
 */

const readline = require('readline');
const KeyboardMapper = require('../utils/KeyboardMapper');

class InputHandler {
  /**
   * @param {StateManager} stateManager - Gerenciador de estado do menu
   * @param {KeyboardMapper} keyboardMapper - Mapeador de teclas (opcional)
   */
  constructor(stateManager, keyboardMapper = null) {
    if (!stateManager) {
      throw new Error('StateManager is required');
    }

    this.stateManager = stateManager;
    this.keyboardMapper = keyboardMapper || new KeyboardMapper();

    // Estado interno
    this.isActive = false;
    this.rawMode = false;
    this.listeners = new Map(); // event type -> callbacks
    this.keyBuffer = '';

    // Referências para cleanup
    this.stdin = process.stdin;
    this.rl = null;
  }

  /**
   * Verifica se o terminal é interativo
   * @returns {boolean} True se terminal é interativo
   */
  isInteractive() {
    // Terminal é interativo se stdin é um TTY
    return Boolean(this.stdin.isTTY);
  }

  /**
   * Inicia a captura de entrada
   */
  start() {
    if (this.isActive) {
      return;
    }

    if (!this.isInteractive()) {
      throw new Error('Cannot start InputHandler: terminal is not interactive');
    }

    // Configura stdin para modo raw (captura imediata de teclas)
    this.enableRawMode();

    // Configura listener de dados
    this.stdin.on('data', this.handleKeyPress.bind(this));

    this.isActive = true;
  }

  /**
   * Para a captura de entrada
   */
  stop() {
    if (!this.isActive) {
      return;
    }

    // Remove listener de dados
    this.stdin.removeListener('data', this.handleKeyPress.bind(this));

    // Desabilita modo raw
    this.disableRawMode();

    this.isActive = false;
  }

  /**
   * Habilita modo raw (captura imediata de teclas)
   * @private
   */
  enableRawMode() {
    if (this.rawMode || !this.stdin.isTTY) {
      return;
    }

    this.stdin.setRawMode(true);
    this.stdin.resume();
    this.rawMode = true;
  }

  /**
   * Desabilita modo raw
   * @private
   */
  disableRawMode() {
    if (!this.rawMode || !this.stdin.isTTY) {
      return;
    }

    this.stdin.setRawMode(false);
    this.stdin.pause();
    this.rawMode = false;
  }

  /**
   * Processa tecla pressionada
   * @private
   * @param {Buffer} buffer - Buffer com dados da tecla
   */
  handleKeyPress(buffer) {
    const key = this.parseKey(buffer);

    if (!key) {
      return;
    }

    // Obtém ação do KeyboardMapper
    const action = this.keyboardMapper.getAction(key);

    // Processa ações de navegação integradas com StateManager
    if (action === 'navigate-up') {
      this.stateManager.moveUp();
      this.emit('arrow-up', { key });
    } else if (action === 'navigate-down') {
      this.stateManager.moveDown();
      this.emit('arrow-down', { key });
    } else if (action === 'select') {
      this.emit('enter', { key });
    } else if (action === 'quit') {
      this.emit('escape', { key });
    } else if (action === 'help') {
      this.emit('shortcut', { key, action: 'help' });
    } else if (action === 'refresh') {
      this.emit('shortcut', { key, action: 'refresh' });
    } else if (action === 'preview') {
      this.emit('shortcut', { key, action: 'preview' });
    } else if (action === 'history') {
      this.emit('shortcut', { key, action: 'history' });
    } else if (action === 'config') {
      this.emit('shortcut', { key, action: 'config' });
    } else if (action && action.startsWith('select-')) {
      // Seleção direta por número (1-9)
      const number = parseInt(action.replace('select-', ''), 10);
      this.emit('shortcut', { key, action: 'direct-select', value: number });
    } else if (action) {
      // Atalho customizado
      this.emit('shortcut', { key, action });
    } else {
      // Caractere não mapeado
      this.emit('char', { key });
    }
  }

  /**
   * Converte buffer para string de tecla normalizada
   * @private
   * @param {Buffer} buffer - Buffer com dados da tecla
   * @returns {string|null} Nome da tecla normalizado
   */
  parseKey(buffer) {
    // Valida buffer
    if (!buffer || buffer.length === 0) {
      return null;
    }

    const str = buffer.toString();
    const bytes = [...buffer];

    // Ctrl+C (SIGINT)
    if (bytes[0] === 3) {
      return 'ctrl-c';
    }

    // ESC ou ESC + sequence (arrow keys, etc.)
    if (bytes[0] === 27) {
      // ESC sozinho
      if (bytes.length === 1) {
        return 'escape';
      }

      // ESC sequence (arrow keys, etc.)
      if (bytes[1] === 91) {
        // Arrow keys: ESC[A (up), ESC[B (down), ESC[C (right), ESC[D (left)
        if (bytes[2] === 65) return 'up';
        if (bytes[2] === 66) return 'down';
        if (bytes[2] === 67) return 'right';
        if (bytes[2] === 68) return 'left';
      }
    }

    // Enter/Return
    if (bytes[0] === 13 || bytes[0] === 10) {
      return 'enter';
    }

    // Space
    if (bytes[0] === 32) {
      return 'space';
    }

    // Backspace
    if (bytes[0] === 127 || bytes[0] === 8) {
      return 'backspace';
    }

    // Tab
    if (bytes[0] === 9) {
      return 'tab';
    }

    // Caractere normal (letra, número, símbolo)
    if (str.length === 1 && str.charCodeAt(0) >= 32 && str.charCodeAt(0) < 127) {
      return str.toLowerCase();
    }

    // Tecla não reconhecida
    return null;
  }

  /**
   * Aguarda próxima entrada do usuário
   * @returns {Promise<Object>} Promise que resolve com UserInput
   */
  waitForInput() {
    return new Promise((resolve) => {
      const handler = (type, data) => {
        // Remove listener temporário
        this.off(type, handler);

        resolve({
          type,
          key: data.key,
          action: data.action,
          value: data.value
        });
      };

      // Registra listeners temporários para todos os tipos
      this.on('arrow-up', handler.bind(this, 'arrow-up'));
      this.on('arrow-down', handler.bind(this, 'arrow-down'));
      this.on('enter', handler.bind(this, 'enter'));
      this.on('escape', handler.bind(this, 'escape'));
      this.on('shortcut', handler.bind(this, 'shortcut'));
      this.on('char', handler.bind(this, 'char'));
    });
  }

  /**
   * Registra callback para tipo de entrada
   * @param {string} eventType - Tipo de evento (arrow-up, arrow-down, enter, escape, shortcut, char)
   * @param {Function} callback - Callback a executar
   */
  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }

    this.listeners.get(eventType).push(callback);
  }

  /**
   * Remove callback de tipo de entrada
   * @param {string} eventType - Tipo de evento
   * @param {Function} callback - Callback a remover
   */
  off(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      return;
    }

    const callbacks = this.listeners.get(eventType);
    const index = callbacks.indexOf(callback);

    if (index !== -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * Emite evento para listeners registrados
   * @private
   * @param {string} eventType - Tipo de evento
   * @param {Object} data - Dados do evento
   */
  emit(eventType, data) {
    if (!this.listeners.has(eventType)) {
      return;
    }

    const callbacks = this.listeners.get(eventType);

    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in InputHandler listener for ${eventType}:`, error);
      }
    });
  }

  /**
   * Cleanup completo (para shutdown gracioso)
   */
  cleanup() {
    this.stop();
    this.listeners.clear();
    this.keyBuffer = '';
  }

  /**
   * Obtém estatísticas de listeners ativos (para debug)
   * @returns {Object} Estatísticas
   */
  getStats() {
    const stats = {
      isActive: this.isActive,
      rawMode: this.rawMode,
      isInteractive: this.isInteractive(),
      listeners: {}
    };

    for (const [type, callbacks] of this.listeners.entries()) {
      stats.listeners[type] = callbacks.length;
    }

    return stats;
  }
}

module.exports = InputHandler;
