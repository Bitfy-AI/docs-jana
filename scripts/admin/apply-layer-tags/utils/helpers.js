/**
 * Helpers Utilities
 *
 * Funcoes utilitarias para delay, backoff exponencial,
 * formatacao de tempo e outras operacoes auxiliares.
 *
 * @module utils/helpers
 */

/**
 * Aguarda um periodo de tempo especificado
 *
 * @param {number} ms - Milissegundos para aguardar
 * @returns {Promise<void>} Promise que resolve apos o delay
 *
 * @example
 * await sleep(1000); // Aguarda 1 segundo
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calcula delay para exponential backoff com jitter
 *
 * Formula: baseDelay * 2^attempt + jitter aleatorio
 * - Tentativa 0: 1s + jitter
 * - Tentativa 1: 2s + jitter
 * - Tentativa 2: 4s + jitter
 *
 * @param {number} attempt - Numero da tentativa (0-based)
 * @param {number} baseDelay - Delay base em milissegundos
 * @returns {number} Delay calculado em milissegundos
 *
 * @example
 * const delay = calculateBackoff(0, 1000); // ~1000-2000ms
 * const delay = calculateBackoff(1, 1000); // ~2000-3000ms
 * const delay = calculateBackoff(2, 1000); // ~4000-5000ms
 */
function calculateBackoff(attempt, baseDelay) {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 1000; // 0-1000ms de jitter
  return Math.floor(exponentialDelay + jitter);
}

/**
 * Formata duracao em milissegundos para string legivel
 *
 * @param {number} ms - Duracao em milissegundos
 * @returns {string} Duracao formatada (ex: "5s", "1m 30s", "2h 15m")
 *
 * @example
 * formatDuration(1500);      // "1.5s"
 * formatDuration(65000);     // "1m 5s"
 * formatDuration(3661000);   // "1h 1m 1s"
 */
function formatDuration(ms) {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    const remainingSeconds = seconds % 60;
    return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
  }

  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  // Menos de 1 minuto - mostrar com decimais
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Gera timestamp formatado no padrao ISO 8601
 *
 * @returns {string} Timestamp no formato YYYY-MM-DDTHH:mm:ss.sssZ
 *
 * @example
 * const timestamp = formatTimestamp();
 * // "2025-10-02T19:30:45.123Z"
 */
function formatTimestamp() {
  return new Date().toISOString();
}

module.exports = {
  sleep,
  calculateBackoff,
  formatDuration,
  formatTimestamp
};
