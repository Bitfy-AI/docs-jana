/**
 * Progress Tracker - Rastreamento e Exibicao de Progresso
 *
 * Exibe barra de progresso visual em tempo real com:
 * - Porcentagem de conclusao
 * - Contador (current/total)
 * - ETA (Estimated Time to Arrival)
 * - Throughput (workflows por segundo)
 * - Workflow atual sendo processado
 *
 * @module utils/progress-tracker
 */

const { formatDuration } = require('./helpers');

class ProgressTracker {
  /**
   * Cria instancia do rastreador de progresso
   *
   * @param {number} total - Total de itens a processar
   * @param {Object} options - Opcoes de configuracao
   * @param {boolean} options.enabled - Se progresso esta habilitado (false em --quiet)
   * @param {number} options.barWidth - Largura da barra de progresso (padrao: 30)
   *
   * @example
   * const tracker = new ProgressTracker(31, { enabled: true });
   * tracker.start();
   */
  constructor(total, options = {}) {
    this.total = total;
    this.current = 0;
    this.startTime = null;
    this.enabled = options.enabled !== false; // Habilitado por padrao
    this.barWidth = options.barWidth || 30;
    this.lastRenderedLine = null;
  }

  /**
   * Inicia rastreamento de progresso
   *
   * @example
   * tracker.start();
   * // Processing workflows [░░░░░░░░░░░░░░░░] 0/31 (0%)
   */
  start() {
    if (!this.enabled) return;

    this.startTime = Date.now();
    this.current = 0;
    this.render();
  }

  /**
   * Atualiza progresso com novo resultado
   *
   * Incrementa contador, recalcula ETA e renderiza barra atualizada.
   *
   * @param {Object} result - Resultado do processamento (opcional)
   * @param {string} result.name - Nome do workflow processado
   * @param {string} result.code - Codigo do workflow
   * @param {string} result.status - Status (success, failed, skipped)
   *
   * @example
   * tracker.update({
   *   name: 'Integracao banco atualizar',
   *   code: 'BCO-ATU-001',
   *   status: 'success'
   * });
   */
  update(result = {}) {
    if (!this.enabled) return;

    this.current++;
    this.render(result);
  }

  /**
   * Finaliza rastreamento e exibe mensagem de conclusao
   *
   * @example
   * tracker.complete();
   * // ✓ 31/31 workflows processed in 5.8s
   */
  complete() {
    if (!this.enabled) return;

    const duration = Date.now() - this.startTime;
    const formatted = formatDuration(duration);

    // Limpar linha anterior e exibir mensagem final
    this._clearLine();
    console.log(`\x1b[32m✓ ${this.total}/${this.total} workflows processados em ${formatted}\x1b[0m`);
  }

  /**
   * Renderiza barra de progresso
   *
   * Formato:
   * Processing workflows [████████░░] 24/31 (77%) | ETA: 1.2s | 5.2 wf/s | Current: BCO-ATU-001
   *
   * @param {Object} currentItem - Item atual sendo processado
   * @private
   */
  render(currentItem = {}) {
    if (!this.enabled) return;

    const percentage = this.total > 0 ? (this.current / this.total) * 100 : 0;
    const bar = this._formatProgressBar(percentage);
    const eta = this._calculateETA();
    const throughput = this._calculateThroughput();

    // Construir linha de progresso
    const parts = [
      `Processing workflows`,
      bar,
      `${this.current}/${this.total}`,
      `(${percentage.toFixed(0)}%)`,
    ];

    // Adicionar ETA se disponivel
    if (eta !== null && this.current < this.total) {
      parts.push(`| ETA: ${formatDuration(eta)}`);
    }

    // Adicionar throughput
    if (throughput !== null) {
      parts.push(`| ${throughput.toFixed(1)} wf/s`);
    }

    // Adicionar workflow atual
    if (currentItem.code) {
      parts.push(`| Current: ${currentItem.code}`);
    }

    const line = parts.join(' ');

    // Limpar linha anterior e exibir nova
    this._clearLine();
    process.stdout.write(line);

    this.lastRenderedLine = line;
  }

  /**
   * Calcula ETA (Estimated Time to Arrival) baseado em velocidade atual
   *
   * Formula: (tempo decorrido / itens processados) * itens restantes
   *
   * @returns {number|null} ETA em milissegundos ou null se nao calculavel
   *
   * @example
   * const eta = tracker.calculateETA(); // 1234 (ms)
   */
  _calculateETA() {
    if (!this.startTime || this.current === 0 || this.current >= this.total) {
      return null;
    }

    const elapsed = Date.now() - this.startTime;
    const avgTimePerItem = elapsed / this.current;
    const remaining = this.total - this.current;

    return Math.round(avgTimePerItem * remaining);
  }

  /**
   * Calcula throughput (workflows por segundo)
   *
   * @returns {number|null} Workflows por segundo ou null se nao calculavel
   *
   * @example
   * const throughput = tracker._calculateThroughput(); // 5.2 (wf/s)
   */
  _calculateThroughput() {
    if (!this.startTime || this.current === 0) {
      return null;
    }

    const elapsed = Date.now() - this.startTime;
    const elapsedSeconds = elapsed / 1000;

    return this.current / elapsedSeconds;
  }

  /**
   * Formata barra de progresso visual
   *
   * Caracteres:
   * - Filled: █ (U+2588)
   * - Empty: ░ (U+2591)
   *
   * @param {number} percentage - Percentual de progresso (0-100)
   * @returns {string} Barra formatada (ex: "[████████░░░░]")
   *
   * @example
   * const bar = tracker._formatProgressBar(75);
   * // "[██████████████████████░░░░░░░░]"
   */
  _formatProgressBar(percentage) {
    const filled = Math.round((percentage / 100) * this.barWidth);
    const empty = this.barWidth - filled;

    const filledBar = '█'.repeat(filled);
    const emptyBar = '░'.repeat(empty);

    return `[${filledBar}${emptyBar}]`;
  }

  /**
   * Limpa linha atual do console
   * @private
   */
  _clearLine() {
    // Move cursor para inicio da linha e limpa
    process.stdout.write('\r\x1b[K');
  }
}

module.exports = ProgressTracker;
