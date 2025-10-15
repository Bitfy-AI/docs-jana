/**
 * AnimationEngine - Gerencia animações e spinners para o menu interativo
 *
 * Responsável por:
 * - Exibir spinners durante operações assíncronas (usando ora)
 * - Controlar animações sutis de transição
 * - Respeitar preferências do usuário para animações
 * - Garantir performance adequada (< 200ms)
 */

class AnimationEngine {
  constructor(config = {}) {
    this.config = {
      animationsEnabled: config.animationsEnabled !== false,
      animationSpeed: config.animationSpeed || 'normal',
      ...config
    };

    // Referência ao spinner atual
    this.currentSpinner = null;

    // Cache de módulo ora (ESM)
    this.oraModule = null;
  }

  /**
   * Carrega módulo ora dinamicamente (ESM)
   * @private
   * @returns {Promise<Object>} Módulo ora
   */
  async _loadOra() {
    if (this.oraModule) {
      return this.oraModule;
    }

    try {
      // Se em ambiente de teste com ora mockado
      if (process.env.NODE_ENV === 'test' && global.__mockOra) {
        this.oraModule = { default: global.__mockOra };
        return this.oraModule;
      }

      // ora é ESM, precisamos importar dinamicamente
      this.oraModule = await import('ora');
      return this.oraModule;
    } catch (error) {
      // Fallback: retornar objeto mock se ora não estiver disponível
      this.oraModule = {
        default: () => ({
          start: () => {},
          stop: () => {},
          succeed: () => {},
          fail: () => {},
          warn: () => {},
          info: () => {},
          text: ''
        })
      };
      return this.oraModule;
    }
  }

  /**
   * Exibe spinner de loading
   * @param {string} text - Texto a exibir ao lado do spinner
   * @returns {Promise<void>}
   */
  async showSpinner(text) {
    if (!this.isEnabled()) {
      // Se animações desabilitadas, apenas log simples
      if (process.env.NODE_ENV !== 'test') {
        console.log(text);
      }
      return;
    }

    try {
      const ora = await this._loadOra();

      // Se já existe spinner, para antes de criar novo
      if (this.currentSpinner) {
        this.currentSpinner.stop();
      }

      this.currentSpinner = ora.default({
        text,
        spinner: this._getSpinnerType(),
        color: 'cyan'
      });

      this.currentSpinner.start();
    } catch (error) {
      // Fallback: log simples se spinner falhar
      if (process.env.NODE_ENV !== 'test') {
        console.log(text);
      }
    }
  }

  /**
   * Atualiza texto do spinner em execução
   * @param {string} text - Novo texto a exibir
   */
  updateSpinner(text) {
    if (!this.isEnabled() || !this.currentSpinner) {
      return;
    }

    this.currentSpinner.text = text;
  }

  /**
   * Para o spinner com símbolo de status
   * @param {'success'|'error'|'warning'|'info'} symbol - Tipo de símbolo
   * @param {string} text - Mensagem final
   */
  stopSpinner(symbol = 'success', text = '') {
    if (!this.currentSpinner) {
      // Se não há spinner, apenas loga a mensagem
      if (text && process.env.NODE_ENV !== 'test') {
        console.log(text);
      }
      return;
    }

    try {
      switch (symbol) {
      case 'success':
        this.currentSpinner.succeed(text);
        break;
      case 'error':
        this.currentSpinner.fail(text);
        break;
      case 'warning':
        this.currentSpinner.warn(text);
        break;
      case 'info':
        this.currentSpinner.info(text);
        break;
      default:
        this.currentSpinner.stop();
        if (text && process.env.NODE_ENV !== 'test') {
          console.log(text);
        }
      }
    } catch (error) {
      // Fallback
      if (text && process.env.NODE_ENV !== 'test') {
        console.log(text);
      }
    } finally {
      this.currentSpinner = null;
    }
  }

  /**
   * Animação de transição suave entre estados
   * @param {number} from - Estado anterior
   * @param {number} to - Novo estado
   * @returns {Promise<void>}
   */
  async animateTransition(from, to) {
    if (!this.isEnabled()) {
      return;
    }

    // Transição sutil com delay baseado na velocidade configurada
    const delay = this._getTransitionDelay();

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, delay);
    });
  }

  /**
   * Wrapper conveniente para executar operação com spinner
   * @param {string} message - Mensagem a exibir durante operação
   * @param {Function} operation - Função assíncrona a executar
   * @returns {Promise<any>} Resultado da operação
   */
  async withSpinner(message, operation) {
    try {
      await this.showSpinner(message);
      const result = await operation();
      this.stopSpinner('success', 'Concluído!');
      return result;
    } catch (error) {
      this.stopSpinner('error', `Erro: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verifica se animações estão habilitadas
   * @returns {boolean}
   */
  isEnabled() {
    // Desabilitar em ambientes não-interativos (CI/CD)
    if (!process.stdout.isTTY) {
      return false;
    }

    return this.config.animationsEnabled;
  }

  /**
   * Habilita ou desabilita animações
   * @param {boolean} enabled - Novo estado
   */
  setEnabled(enabled) {
    this.config.animationsEnabled = enabled;

    // Se desabilitando e há spinner rodando, para
    if (!enabled && this.currentSpinner) {
      this.currentSpinner.stop();
      this.currentSpinner = null;
    }
  }

  /**
   * Define velocidade das animações
   * @param {'slow'|'normal'|'fast'} speed - Nova velocidade
   */
  setSpeed(speed) {
    if (['slow', 'normal', 'fast'].includes(speed)) {
      this.config.animationSpeed = speed;
    }
  }

  /**
   * Respeita preferências do usuário
   * @param {Object} preferences - Preferências do usuário
   */
  respectUserPreferences(preferences) {
    if (preferences.animationsEnabled !== undefined) {
      this.config.animationsEnabled = preferences.animationsEnabled;
    }

    if (preferences.animationSpeed) {
      this.setSpeed(preferences.animationSpeed);
    }
  }

  /**
   * Obtém tipo de spinner baseado na velocidade configurada
   * @private
   * @returns {string}
   */
  _getSpinnerType() {
    const speedMap = {
      slow: 'dots',
      normal: 'dots2',
      fast: 'line'
    };

    return speedMap[this.config.animationSpeed] || 'dots2';
  }

  /**
   * Obtém delay de transição baseado na velocidade
   * @private
   * @returns {number} Delay em milissegundos
   */
  _getTransitionDelay() {
    const delayMap = {
      slow: 150,
      normal: 100,
      fast: 50
    };

    const delay = delayMap[this.config.animationSpeed] || 100;

    // Garantir que não excede 200ms (requisito de performance)
    return Math.min(delay, 200);
  }

  /**
   * Limpa estado (útil para testes)
   */
  cleanup() {
    if (this.currentSpinner) {
      this.currentSpinner.stop();
      this.currentSpinner = null;
    }
  }
}

module.exports = AnimationEngine;
