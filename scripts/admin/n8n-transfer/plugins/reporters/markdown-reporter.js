/**
 * MarkdownReporter Plugin
 *
 * Generates professional Markdown reports for N8N workflow transfer operations.
 * Creates comprehensive reports with statistics, tables, and error details.
 *
 * @module n8n-transfer/plugins/reporters/markdown-reporter
 * @author docs-jana
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const { BasePlugin } = require('../index');

/**
 * MarkdownReporter - Generates Markdown transfer reports
 *
 * Creates beautifully formatted Markdown reports with:
 * - Header with timestamp and duration
 * - Summary statistics (total, transferred, skipped, failed)
 * - Tables of transferred workflows
 * - Tables of skipped workflows with reasons
 * - Detailed error information
 * - Footer with completion status
 *
 * Reports are saved to the reports/ directory with timestamped filenames.
 *
 * @class MarkdownReporter
 * @extends BasePlugin
 *
 * @example
 * const reporter = new MarkdownReporter();
 * const report = reporter.generate(transferResult);
 * console.log('Report generated:', report);
 */
class MarkdownReporter extends BasePlugin {
  /**
   * Creates a new MarkdownReporter instance
   *
   * @constructor
   * @example
   * const reporter = new MarkdownReporter();
   * reporter.setOptions({ outputDir: './custom-reports' });
   */
  constructor() {
    super('markdown-reporter', '1.0.0', 'reporter');
    this.setDescription('Gera relatórios de transferência em formato Markdown profissional');
    this.setOptions({
      outputDir: path.join(__dirname, '../../reports'),
      includeTimestamp: true,
      includeEmojis: true
    });

    // Validate implementation
    this.validateImplementation(['generate']);
  }

  /**
   * Generates a comprehensive Markdown report from transfer results
   *
   * @param {Object} transferResult - Transfer operation result
   * @param {number} transferResult.total - Total workflows processed
   * @param {number} transferResult.transferred - Successfully transferred workflows
   * @param {number} transferResult.skipped - Skipped workflows (duplicates, filtered)
   * @param {number} transferResult.failed - Failed workflows
   * @param {number} [transferResult.duplicates] - Duplicate workflows count
   * @param {number} transferResult.duration - Operation duration in milliseconds
   * @param {Array<{workflow: string, error: string, code: string}>} [transferResult.errors] - Error details
   * @param {Array<{name: string, id: string, status: string}>} [transferResult.workflows] - Workflow details
   * @param {string} [transferResult.sourceUrl] - Source N8N instance URL
   * @param {string} [transferResult.targetUrl] - Target N8N instance URL
   * @param {Date} [transferResult.startTime] - Transfer start time
   * @param {Date} [transferResult.endTime] - Transfer end time
   *
   * @returns {string} Path to the generated Markdown report file
   *
   * @throws {Error} If transferResult is invalid or missing required fields
   *
   * @example
   * const transferResult = {
   *   total: 50,
   *   transferred: 45,
   *   skipped: 3,
   *   failed: 2,
   *   duplicates: 3,
   *   duration: 120000,
   *   sourceUrl: 'https://source.n8n.io',
   *   targetUrl: 'https://target.n8n.io',
   *   workflows: [...],
   *   errors: [...]
   * };
   * const reportPath = reporter.generate(transferResult);
   */
  generate(transferResult) {
    // Validate input
    this._validateTransferResult(transferResult);

    // Generate report content
    const reportContent = this._buildReportContent(transferResult);

    // Save report to file
    const reportPath = this._saveReport(reportContent);

    return reportPath;
  }

  /**
   * Validates transfer result object
   *
   * @private
   * @param {Object} transferResult - Transfer result to validate
   * @throws {Error} If validation fails
   */
  _validateTransferResult(transferResult) {
    if (!transferResult || typeof transferResult !== 'object') {
      throw new Error('transferResult deve ser um objeto válido');
    }

    const requiredFields = ['total', 'transferred', 'skipped', 'failed', 'duration'];
    const missingFields = requiredFields.filter(field =>
      typeof transferResult[field] !== 'number'
    );

    if (missingFields.length > 0) {
      throw new Error(
        `transferResult está faltando campos obrigatórios: ${missingFields.join(', ')}`
      );
    }
  }

  /**
   * Builds complete Markdown report content
   *
   * @private
   * @param {Object} transferResult - Transfer result object
   * @returns {string} Complete Markdown report
   */
  _buildReportContent(transferResult) {
    const sections = [
      this._buildHeader(transferResult),
      this._buildSummary(transferResult),
      this._buildTransferredWorkflows(transferResult),
      this._buildSkippedWorkflows(transferResult),
      this._buildFailedWorkflows(transferResult),
      this._buildErrorDetails(transferResult),
      this._buildFooter(transferResult)
    ];

    return sections.filter(Boolean).join('\n\n');
  }

  /**
   * Builds report header section
   *
   * @private
   * @param {Object} transferResult - Transfer result object
   * @returns {string} Header Markdown
   */
  _buildHeader(transferResult) {
    const useEmojis = this.getOption('includeEmojis', true);
    const icon = useEmojis ? '📊 ' : '';

    const timestamp = transferResult.startTime
      ? new Date(transferResult.startTime).toISOString()
      : new Date().toISOString();

    const duration = this._formatDuration(transferResult.duration);

    const sourceUrl = transferResult.sourceUrl || 'N/A';
    const targetUrl = transferResult.targetUrl || 'N/A';

    return `# ${icon}Relatório de Transferência N8N

**Data de Execução:** ${timestamp}
**Duração:** ${duration}
**Origem (SOURCE):** \`${sourceUrl}\`
**Destino (TARGET):** \`${targetUrl}\`

---`;
  }

  /**
   * Builds summary statistics section
   *
   * @private
   * @param {Object} transferResult - Transfer result object
   * @returns {string} Summary Markdown
   */
  _buildSummary(transferResult) {
    const useEmojis = this.getOption('includeEmojis', true);

    const successRate = transferResult.total > 0
      ? ((transferResult.transferred / transferResult.total) * 100).toFixed(1)
      : '0.0';

    const icons = useEmojis ? {
      total: '📋',
      success: '✅',
      skipped: '⏭️',
      failed: '❌',
      duplicate: '🔄'
    } : {
      total: '',
      success: '',
      skipped: '',
      failed: '',
      duplicate: ''
    };

    return `## ${icons.total} Resumo da Operação

| Métrica | Quantidade | Percentual |
|---------|------------|------------|
| ${icons.total} **Total de Workflows** | ${transferResult.total} | 100% |
| ${icons.success} **Transferidos com Sucesso** | ${transferResult.transferred} | ${successRate}% |
| ${icons.skipped} **Pulados** | ${transferResult.skipped} | ${this._calcPercentage(transferResult.skipped, transferResult.total)}% |
| ${icons.failed} **Falhas** | ${transferResult.failed} | ${this._calcPercentage(transferResult.failed, transferResult.total)}% |
${transferResult.duplicates !== undefined ? `| ${icons.duplicate} **Duplicatas Detectadas** | ${transferResult.duplicates} | ${this._calcPercentage(transferResult.duplicates, transferResult.total)}% |` : ''}`;
  }

  /**
   * Builds transferred workflows table
   *
   * @private
   * @param {Object} transferResult - Transfer result object
   * @returns {string} Transferred workflows Markdown table
   */
  _buildTransferredWorkflows(transferResult) {
    if (!transferResult.workflows || transferResult.workflows.length === 0) {
      return null;
    }

    const transferred = transferResult.workflows.filter(
      w => w.status === 'transferred' || w.status === 'completed'
    );

    if (transferred.length === 0) {
      return null;
    }

    const useEmojis = this.getOption('includeEmojis', true);
    const icon = useEmojis ? '✅ ' : '';

    const rows = transferred.map((w, index) => {
      const sourceId = w.sourceId || w.id || 'N/A';
      const targetId = w.targetId || w.newId || 'N/A';
      const name = w.name || 'Sem nome';

      return `| ${index + 1} | ${name} | \`${sourceId}\` | \`${targetId}\` |`;
    }).join('\n');

    return `## ${icon}Workflows Transferidos

| # | Nome do Workflow | ID Origem | ID Destino |
|---|------------------|-----------|------------|
${rows}`;
  }

  /**
   * Builds skipped workflows table
   *
   * @private
   * @param {Object} transferResult - Transfer result object
   * @returns {string} Skipped workflows Markdown table
   */
  _buildSkippedWorkflows(transferResult) {
    if (!transferResult.workflows || transferResult.workflows.length === 0) {
      return null;
    }

    const skipped = transferResult.workflows.filter(w => w.status === 'skipped');

    if (skipped.length === 0) {
      return null;
    }

    const useEmojis = this.getOption('includeEmojis', true);
    const icon = useEmojis ? '⏭️ ' : '';

    const rows = skipped.map((w, index) => {
      const name = w.name || 'Sem nome';
      const reason = w.reason || w.skipReason || 'Não especificado';

      return `| ${index + 1} | ${name} | ${reason} |`;
    }).join('\n');

    return `## ${icon}Workflows Pulados

| # | Nome do Workflow | Motivo |
|---|------------------|--------|
${rows}`;
  }

  /**
   * Builds failed workflows table
   *
   * @private
   * @param {Object} transferResult - Transfer result object
   * @returns {string} Failed workflows Markdown table
   */
  _buildFailedWorkflows(transferResult) {
    if (!transferResult.workflows || transferResult.workflows.length === 0) {
      return null;
    }

    const failed = transferResult.workflows.filter(w => w.status === 'failed');

    if (failed.length === 0) {
      return null;
    }

    const useEmojis = this.getOption('includeEmojis', true);
    const icon = useEmojis ? '❌ ' : '';

    const rows = failed.map((w, index) => {
      const name = w.name || 'Sem nome';
      const error = w.error || w.errorMessage || 'Erro desconhecido';

      return `| ${index + 1} | ${name} | ${error} |`;
    }).join('\n');

    return `## ${icon}Workflows com Falha

| # | Nome do Workflow | Erro |
|---|------------------|------|
${rows}`;
  }

  /**
   * Builds error details section
   *
   * @private
   * @param {Object} transferResult - Transfer result object
   * @returns {string} Error details Markdown
   */
  _buildErrorDetails(transferResult) {
    if (!transferResult.errors || transferResult.errors.length === 0) {
      return null;
    }

    const useEmojis = this.getOption('includeEmojis', true);
    const icon = useEmojis ? '🔍 ' : '';

    const errorList = transferResult.errors.map((err, index) => {
      const workflow = err.workflow || 'Desconhecido';
      const error = err.error || err.message || 'Erro desconhecido';
      const code = err.code || 'UNKNOWN_ERROR';

      return `${index + 1}. **${workflow}**
   - **Código:** \`${code}\`
   - **Mensagem:** ${error}`;
    }).join('\n\n');

    return `## ${icon}Detalhes dos Erros

${errorList}`;
  }

  /**
   * Builds report footer section
   *
   * @private
   * @param {Object} transferResult - Transfer result object
   * @returns {string} Footer Markdown
   */
  _buildFooter(transferResult) {
    const useEmojis = this.getOption('includeEmojis', true);

    const hasErrors = transferResult.failed > 0;
    const status = hasErrors ? 'completada com erros' : 'completada com sucesso';
    const icon = hasErrors
      ? (useEmojis ? '⚠️' : '!')
      : (useEmojis ? '✅' : '✓');

    const endTime = transferResult.endTime
      ? new Date(transferResult.endTime).toISOString()
      : new Date().toISOString();

    return `---

## ${icon} Status Final

Transferência **${status}** em ${endTime}

${hasErrors ? `\n> ⚠️ **Atenção:** ${transferResult.failed} workflow(s) falharam durante a transferência. Verifique os detalhes dos erros acima.` : ''}

---

*Relatório gerado automaticamente pelo N8N Transfer System*
*Markdown Reporter v${this.getVersion()}*`;
  }

  /**
   * Saves report to file with timestamped filename
   *
   * @private
   * @param {string} content - Report Markdown content
   * @returns {string} Path to saved report file
   * @throws {Error} If file cannot be saved
   */
  _saveReport(content) {
    const outputDir = this.getOption('outputDir');
    const includeTimestamp = this.getOption('includeTimestamp', true);

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate filename
    const timestamp = includeTimestamp
      ? this._generateTimestamp()
      : 'latest';
    const filename = `transfer-report-${timestamp}.md`;
    const filePath = path.join(outputDir, filename);

    // Write file
    try {
      fs.writeFileSync(filePath, content, 'utf8');
      return filePath;
    } catch (error) {
      throw new Error(`Falha ao salvar relatório: ${error.message}`);
    }
  }

  /**
   * Generates timestamp string for filename
   *
   * @private
   * @returns {string} Timestamp in format YYYY-MM-DD-HHmmss
   */
  _generateTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}-${hours}${minutes}${seconds}`;
  }

  /**
   * Formats duration in milliseconds to human-readable string
   *
   * @private
   * @param {number} ms - Duration in milliseconds
   * @returns {string} Formatted duration (e.g., "2m 30s", "1h 15m 30s")
   */
  _formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      const remainingMinutes = minutes % 60;
      const remainingSeconds = seconds % 60;
      return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Calculates percentage
   *
   * @private
   * @param {number} value - Numerator value
   * @param {number} total - Denominator value
   * @returns {string} Percentage formatted to 1 decimal place
   */
  _calcPercentage(value, total) {
    if (total === 0) return '0.0';
    return ((value / total) * 100).toFixed(1);
  }
}

module.exports = MarkdownReporter;
