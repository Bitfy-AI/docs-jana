/**
 * Report Generator - Geracao de Relatorios em Markdown
 *
 * Gera relatorios consolidados apos execucao do script,
 * incluindo sumario executivo, estatisticas por layer,
 * lista de sucessos/falhas e metricas de performance.
 *
 * @module core/services/report-generator
 */

const fs = require('fs');
const path = require('path');
const { LAYERS, PATHS } = require('../../config/config');
const { formatDuration, formatTimestamp } = require('../../utils/helpers');

class ReportGenerator {
  /**
   * Cria instancia do gerador de relatorios
   *
   * @param {Object} config - Configuracao do gerador
   */
  constructor(config = {}) {
    this.config = config;
    this.outputDir = PATHS.outputDir;
  }

  /**
   * Gera relatorio completo em Markdown
   *
   * Estrutura do relatorio:
   * - Header (titulo, timestamp, modo)
   * - Sumario Executivo (total, sucesso, falhas, duracao)
   * - Estatisticas por Layer (contagem e percentual)
   * - Workflows Processados com Sucesso
   * - Workflows com Falha (se houver)
   * - Metricas de Performance
   *
   * @param {Array<Object>} results - Array de resultados de processamento
   * @param {Object} metadata - Metadados da execucao (timestamp, modo, duracao)
   * @returns {string} Relatorio em formato Markdown
   *
   * @example
   * const report = generator.generateMarkdownReport(results, {
   *   timestamp: '2025-10-02T19:30:00Z',
   *   mode: 'production',
   *   duration: 5800
   * });
   */
  generateMarkdownReport(results, metadata) {
    const sections = [];

    // Header
    sections.push(this._generateHeader(metadata));

    // Sumario Executivo
    sections.push(this._generateSummary(results, metadata));

    // Estatisticas por Layer
    sections.push(this._generateLayerStats(results));

    // Lista de Sucessos
    const successes = results.filter(r => r.status === 'success');
    if (successes.length > 0) {
      sections.push(this._generateSuccessList(successes));
    }

    // Lista de Falhas
    const failures = results.filter(r => r.status === 'failed');
    if (failures.length > 0) {
      sections.push(this._generateFailureList(failures));
    }

    // Metricas de Performance
    sections.push(this._generatePerformanceMetrics(results, metadata));

    return sections.join('\n\n---\n\n');
  }

  /**
   * Salva relatorio em arquivo com timestamp
   *
   * Formato do nome: apply-tags-report-YYYY-MM-DD-HHmmss.md
   * Diretorio: output/
   *
   * @param {string} reportContent - Conteudo do relatorio em Markdown
   * @param {string} [customFilename] - Nome customizado (opcional)
   * @returns {string} Caminho completo do arquivo salvo
   *
   * @example
   * const filePath = generator.saveReport(reportContent);
   * console.log(`Relatorio salvo em: ${filePath}`);
   */
  saveReport(reportContent, customFilename = null) {
    // Garantir que diretorio existe
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    // Gerar nome do arquivo com timestamp
    const filename = customFilename || this._generateFilename();
    const filePath = path.join(this.outputDir, filename);

    // Salvar arquivo
    fs.writeFileSync(filePath, reportContent, 'utf8');

    return filePath;
  }

  /**
   * Agrupa resultados por layer
   *
   * @param {Array<Object>} results - Array de resultados
   * @returns {Map<string, Array<Object>>} Map de layer para resultados
   *
   * @example
   * const grouped = generator.groupByLayer(results);
   * console.log(grouped.get('A')); // [workflow1, workflow2, ...]
   */
  groupByLayer(results) {
    const grouped = new Map();

    // Inicializar todas as layers
    Object.keys(LAYERS).forEach(layer => {
      grouped.set(layer, []);
    });

    // Agrupar resultados
    results.forEach(result => {
      const layer = result.layer || 'Unknown';
      if (!grouped.has(layer)) {
        grouped.set(layer, []);
      }
      grouped.get(layer).push(result);
    });

    return grouped;
  }

  /**
   * Imprime relatorio no console com cores
   *
   * @param {string} content - Conteudo do relatorio
   */
  printToConsole(content) {
    // Colorir com ANSI escape codes
    const colorized = content
      .replace(/^# .+$/gm, '\x1b[1m\x1b[36m$&\x1b[0m')        // Headers em cyan bold
      .replace(/^## .+$/gm, '\x1b[1m\x1b[34m$&\x1b[0m')       // Subheaders em blue bold
      .replace(/✅/g, '\x1b[32m✅\x1b[0m')                      // Checkmarks em verde
      .replace(/❌/g, '\x1b[31m❌\x1b[0m')                      // X em vermelho
      .replace(/⚠️/g, '\x1b[33m⚠️\x1b[0m')                     // Warning em amarelo
      .replace(/(\d+(?:\.\d+)?%)/g, '\x1b[1m$1\x1b[0m');      // Percentuais em bold

    console.log(colorized);
  }

  // ==================== METODOS PRIVADOS ====================

  /**
   * Gera header do relatorio
   * @private
   */
  _generateHeader(metadata) {
    const mode = metadata.mode === 'dry-run' ? '(DRY-RUN MODE)' : '(PRODUCTION)';

    return `# Tag Layer Application Report ${mode}

**Gerado em:** ${metadata.timestamp || formatTimestamp()}
**Modo de execucao:** ${metadata.mode || 'production'}
**Duracao total:** ${formatDuration(metadata.duration || 0)}`;
  }

  /**
   * Gera sumario executivo
   * @private
   */
  _generateSummary(results, metadata) {
    const total = results.length;
    const successes = results.filter(r => r.status === 'success').length;
    const failures = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped').length;

    const successRate = total > 0 ? ((successes / total) * 100).toFixed(1) : '0.0';
    const throughput = metadata.duration > 0
      ? (total / (metadata.duration / 1000)).toFixed(2)
      : '0.00';

    return `## Sumario Executivo

- **Total workflows processados:** ${total}
- **Sucesso:** ${successes} (${successRate}%)
- **Falhas:** ${failures} (${((failures / total) * 100).toFixed(1)}%)
- **Ignorados:** ${skipped} (${((skipped / total) * 100).toFixed(1)}%)
- **Duracao total:** ${formatDuration(metadata.duration || 0)}
- **Performance:** ${throughput} workflows/s`;
  }

  /**
   * Gera estatisticas por layer
   * @private
   */
  _generateLayerStats(results) {
    const grouped = this.groupByLayer(results);
    const total = results.length;

    let table = `## Estatisticas por Layer

| Layer | Descricao | Total | Sucesso | Falha | % do Total |
|-------|-----------|-------|---------|-------|------------|`;

    Object.entries(LAYERS).forEach(([layer, description]) => {
      const layerResults = grouped.get(layer) || [];
      const layerTotal = layerResults.length;
      const layerSuccesses = layerResults.filter(r => r.status === 'success').length;
      const layerFailures = layerResults.filter(r => r.status === 'failed').length;
      const percentage = total > 0 ? ((layerTotal / total) * 100).toFixed(1) : '0.0';

      table += `\n| ${layer} | ${description} | ${layerTotal} | ${layerSuccesses} | ${layerFailures} | ${percentage}% |`;
    });

    return table;
  }

  /**
   * Gera lista de workflows processados com sucesso
   * @private
   */
  _generateSuccessList(successes) {
    const sorted = successes.sort((a, b) => a.name.localeCompare(b.name));

    let list = `## Workflows Processados com Sucesso (${successes.length})

| Nome | Codigo | Layer | Duracao |
|------|--------|-------|---------|`;

    sorted.forEach(result => {
      const duration = formatDuration(result.duration || 0);
      list += `\n| ✅ ${result.name} | ${result.code} | ${result.layer} | ${duration} |`;
    });

    return list;
  }

  /**
   * Gera lista de workflows com falha
   * @private
   */
  _generateFailureList(failures) {
    const sorted = failures.sort((a, b) => a.name.localeCompare(b.name));

    let list = `## Workflows com Falha (${failures.length})

| Nome | Codigo | Layer | Motivo |
|------|--------|-------|--------|`;

    sorted.forEach(result => {
      const error = result.error || 'Unknown error';
      list += `\n| ❌ ${result.name} | ${result.code} | ${result.layer} | ${error} |`;
    });

    return list;
  }

  /**
   * Gera metricas de performance
   * @private
   */
  _generatePerformanceMetrics(results, metadata) {
    const durations = results
      .filter(r => r.duration)
      .map(r => r.duration);

    const avgDuration = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0;

    const minDuration = durations.length > 0 ? Math.min(...durations) : 0;
    const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;

    const retries = results.filter(r => r.attempts && r.attempts > 1).length;

    return `## Metricas de Performance

- **Tempo medio por workflow:** ${formatDuration(avgDuration)}
- **Tempo minimo:** ${formatDuration(minDuration)}
- **Tempo maximo:** ${formatDuration(maxDuration)}
- **Workflows com retry:** ${retries}
- **Total de tentativas:** ${results.reduce((sum, r) => sum + (r.attempts || 1), 0)}`;
  }

  /**
   * Gera nome do arquivo com timestamp
   * @private
   */
  _generateFilename() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `apply-tags-report-${year}-${month}-${day}-${hours}${minutes}${seconds}.md`;
  }
}

module.exports = ReportGenerator;
