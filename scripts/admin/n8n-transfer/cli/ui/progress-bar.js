/**
 * @fileoverview Progress bar component com estimativa de tempo
 */

const cliProgress = require('cli-progress');

class ProgressBar {
  /**
   * Cria instância de progress bar
   * @param {number} total - Total de items
   * @param {object} [options={}] - Opções customizadas
   * @param {string} [options.format] - Formato customizado da barra
   * @param {string} [options.barCompleteChar] - Caractere de barra completa
   * @param {string} [options.barIncompleteChar] - Caractere de barra incompleta
   * @param {boolean} [options.hideCursor] - Se deve esconder cursor
   */
  constructor(total, options = {}) {
    this.total = total;
    this.current = 0;
    this.startTime = Date.now();

    this.bar = new cliProgress.SingleBar({
      format: options.format || '{bar} {percentage}% | {value}/{total} | ETA: {eta}s | {status}',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true,
      ...options
    }, cliProgress.Presets.shades_classic);

    this.bar.start(total, 0, {
      status: 'Iniciando...'
    });
  }

  /**
   * Incrementa progresso
   * @param {number} [value=1] - Incremento
   * @param {string} [status=''] - Status text
   */
  increment(value = 1, status = '') {
    this.current += value;

    const payload = { status };

    // Calcular ETA
    const elapsed = Date.now() - this.startTime;
    const avgTimePerItem = elapsed / this.current;
    const remaining = this.total - this.current;
    const eta = Math.round((avgTimePerItem * remaining) / 1000);

    payload.eta = eta > 0 ? eta : 0;

    this.bar.update(this.current, payload);
  }

  /**
   * Para progress bar
   */
  stop() {
    this.bar.stop();
  }

  /**
   * Atualiza total (se mudou)
   * @param {number} newTotal - Novo total
   */
  setTotal(newTotal) {
    this.total = newTotal;
    this.bar.setTotal(newTotal);
  }
}

module.exports = ProgressBar;
