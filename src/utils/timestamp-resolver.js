/**
 * TimestampResolver - Resolução de Placeholder {timestamp}
 *
 * Esta classe fornece funcionalidades para resolver o placeholder {timestamp}
 * para valores reais, buscando timestamps de downloads anteriores ou gerando novos.
 *
 * Estratégia de resolução (em ordem de prioridade):
 * 1. Usar timestamp explícito fornecido no contexto
 * 2. Buscar timestamp mais recente em diretórios existentes
 * 3. Gerar novo timestamp no formato YYYYMMDD-HHMMSS
 *
 * @module timestamp-resolver
 * @example
 * // Resolver com timestamp explícito
 * TimestampResolver.resolve({ explicitTimestamp: '20251016-171935' })
 * // '20251016-171935'
 *
 * // Resolver buscando timestamp mais recente
 * TimestampResolver.resolve({ baseDir: './' })
 * // '20251016-171935' (mais recente encontrado)
 */

const fs = require('fs');
const path = require('path');

/**
 * Classe para resolução do placeholder {timestamp}
 */
class TimestampResolver {
  /**
   * Resolve placeholder {timestamp} para valor real
   *
   * Ordem de prioridade:
   * 1. context.explicitTimestamp - se fornecido, usar diretamente
   * 2. Buscar timestamp mais recente em baseDir
   * 3. Gerar novo timestamp
   *
   * @param {Object} context - Contexto com informações para resolução
   * @param {string} [context.baseDir=process.cwd()] - Diretório base para buscar timestamps
   * @param {string} [context.explicitTimestamp] - Timestamp explícito fornecido
   * @returns {string} Timestamp no formato YYYYMMDD-HHMMSS
   * @throws {Error} Se timestamp explícito for inválido
   *
   * @example
   * // Usar timestamp explícito
   * TimestampResolver.resolve({ explicitTimestamp: '20251016-171935' })
   * // '20251016-171935'
   *
   * // Buscar timestamp mais recente
   * TimestampResolver.resolve({ baseDir: './' })
   * // '20251016-171935' (timestamp do diretório mais recente)
   *
   * // Gerar novo timestamp (quando nenhum encontrado)
   * TimestampResolver.resolve({ baseDir: './empty-dir' })
   * // '20251016-172530' (timestamp atual gerado)
   */
  static resolve(context = {}) {
    const { baseDir = process.cwd(), explicitTimestamp } = context;

    // 1. Usar timestamp explícito se fornecido
    if (explicitTimestamp) {
      if (!this.isValidFormat(explicitTimestamp)) {
        throw new Error(
          `Invalid timestamp format: "${explicitTimestamp}"\n` +
          '   Expected format: YYYYMMDD-HHMMSS\n' +
          '   Example: 20251016-171935'
        );
      }
      return explicitTimestamp;
    }

    // 2. Buscar timestamp mais recente em diretórios
    const DIRECTORY_PATTERN = /n8n-workflows-(\d{8}-\d{6})/;
    const latestTimestamp = this.findLatestTimestamp(baseDir, DIRECTORY_PATTERN);

    if (latestTimestamp) {
      return latestTimestamp;
    }

    // 3. Gerar novo timestamp
    return this.generate();
  }

  /**
   * Busca o timestamp mais recente em diretórios
   *
   * Percorre todos os diretórios no baseDir e extrai timestamps
   * usando o pattern fornecido. Retorna o timestamp mais recente.
   *
   * @param {string} baseDir - Diretório base para buscar
   * @param {RegExp} pattern - Pattern regex para extrair timestamp (deve ter capture group)
   * @returns {string|null} Timestamp encontrado ou null se nenhum
   *
   * @example
   * // Buscar em diretório com workflows
   * const timestamp = TimestampResolver.findLatestTimestamp(
   *   './',
   *   /n8n-workflows-(\d{8}-\d{6})/
   * );
   * // '20251016-171935'
   */
  static findLatestTimestamp(baseDir, pattern) {
    try {
      // Verificar se diretório existe
      if (!fs.existsSync(baseDir)) {
        return null;
      }

      // Listar entradas do diretório
      const entries = fs.readdirSync(baseDir, { withFileTypes: true });

      // Extrair timestamps de diretórios que correspondem ao pattern
      const timestamps = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const match = entry.name.match(pattern);
          if (match && match[1]) {
            const timestamp = match[1];
            if (this.isValidFormat(timestamp)) {
              timestamps.push({
                timestamp,
                path: path.join(baseDir, entry.name),
                mtime: fs.statSync(path.join(baseDir, entry.name)).mtime
              });
            }
          }
        }
      }

      // Se nenhum timestamp encontrado
      if (timestamps.length === 0) {
        return null;
      }

      // Ordenar por mtime (mais recente primeiro)
      timestamps.sort((a, b) => b.mtime - a.mtime);

      // Retornar timestamp mais recente
      return timestamps[0].timestamp;

    } catch (error) {
      // Em caso de erro (permissão, etc), retornar null
      return null;
    }
  }

  /**
   * Gera um novo timestamp no formato YYYYMMDD-HHMMSS
   *
   * Usa a data/hora atual do sistema.
   *
   * @returns {string} Timestamp gerado no formato YYYYMMDD-HHMMSS
   *
   * @example
   * TimestampResolver.generate()
   * // '20251016-172530'
   */
  static generate() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${year}${month}${day}-${hours}${minutes}${seconds}`;
  }

  /**
   * Valida formato de timestamp
   *
   * Verifica se timestamp está no formato YYYYMMDD-HHMMSS.
   *
   * @param {string} timestamp - Timestamp para validar
   * @returns {boolean} true se formato válido
   *
   * @example
   * TimestampResolver.isValidFormat('20251016-171935') // true
   * TimestampResolver.isValidFormat('2025-10-16') // false
   * TimestampResolver.isValidFormat('invalid') // false
   */
  static isValidFormat(timestamp) {
    if (!timestamp || typeof timestamp !== 'string') {
      return false;
    }

    const TIMESTAMP_PATTERN = /^(\d{8})-(\d{6})$/;
    return TIMESTAMP_PATTERN.test(timestamp);
  }

  /**
   * Converte timestamp para Date object
   *
   * Útil para comparações e ordenação.
   *
   * @param {string} timestamp - Timestamp no formato YYYYMMDD-HHMMSS
   * @returns {Date|null} Date object ou null se formato inválido
   *
   * @example
   * const date = TimestampResolver.toDate('20251016-171935');
   * // Date object para 2025-10-16 17:19:35
   */
  static toDate(timestamp) {
    if (!this.isValidFormat(timestamp)) {
      return null;
    }

    const TIMESTAMP_PATTERN = /^(\d{8})-(\d{6})$/;
    const match = timestamp.match(TIMESTAMP_PATTERN);
    const dateStr = match[1]; // YYYYMMDD
    const timeStr = match[2]; // HHMMSS

    const year = parseInt(dateStr.substring(0, 4), 10);
    const month = parseInt(dateStr.substring(4, 6), 10) - 1; // Month is 0-indexed
    const day = parseInt(dateStr.substring(6, 8), 10);

    const hours = parseInt(timeStr.substring(0, 2), 10);
    const minutes = parseInt(timeStr.substring(2, 4), 10);
    const seconds = parseInt(timeStr.substring(4, 6), 10);

    return new Date(year, month, day, hours, minutes, seconds);
  }

  /**
   * Formata timestamp para exibição legível
   *
   * Converte YYYYMMDD-HHMMSS para formato mais amigável.
   *
   * @param {string} timestamp - Timestamp no formato YYYYMMDD-HHMMSS
   * @returns {string} Timestamp formatado (ex: "2025-10-16 17:19:35")
   *
   * @example
   * TimestampResolver.format('20251016-171935')
   * // '2025-10-16 17:19:35'
   */
  static format(timestamp) {
    const date = this.toDate(timestamp);
    if (!date) {
      return timestamp;
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
}

module.exports = TimestampResolver;
