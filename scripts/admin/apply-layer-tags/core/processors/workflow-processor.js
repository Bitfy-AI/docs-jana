/**
 * WorkflowProcessor - Processamento paralelo de workflows com aplicacao de tags
 *
 * Responsavel por:
 * - Processar workflows individualmente ou em batch
 * - Suportar modo dry-run (simulacao sem API calls)
 * - Paralelizacao com limite de concorrencia (max 5 simultaneos)
 * - Retry automatico (3 tentativas com exponential backoff)
 * - Tratamento de erros especificos (404, 409, 429, 5xx)
 * - Callback de progresso para tracking
 *
 * Performance Target: 31 workflows em ~5-6 segundos (speedup 3x vs sequencial)
 *
 * @module core/processors/workflow-processor
 */

const { CONCURRENCY_CONFIG, RETRY_CONFIG } = require('../../config/config');
const { sleep, calculateBackoff } = require('../../utils/helpers');
const Logger = require('../../../../../src/utils/logger');

/**
 * Classe WorkflowProcessor para processar workflows com tags
 */
class WorkflowProcessor {
  /**
   * Cria instancia do WorkflowProcessor
   *
   * @param {TagService} tagService - Servico de tags (injetado)
   * @param {Logger} logger - Logger para registrar operacoes (opcional)
   * @param {Object} config - Configuracoes de processamento (opcional)
   * @param {number} config.maxConcurrent - Maximo de workflows simultaneos (padrao: 5)
   * @param {boolean} config.dryRun - Modo dry-run ativo (padrao: false)
   *
   * @example
   * const processor = new WorkflowProcessor(tagService, logger, { maxConcurrent: 5, dryRun: false });
   * const result = await processor.processWorkflow(workflowItem, tagId);
   */
  constructor(tagService, logger = null, config = {}) {
    if (!tagService) {
      throw new Error('TagService is required');
    }

    this.tagService = tagService;
    this.logger = logger || new Logger({ logLevel: 'info' });

    // Configuracoes
    this.config = {
      maxConcurrent: config.maxConcurrent || CONCURRENCY_CONFIG.maxConcurrent || 5,
      dryRun: config.dryRun || false
    };

    // Estatisticas
    this.stats = {
      totalProcessed: 0,
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
      dryRunCount: 0,
      totalRetries: 0
    };
  }

  /**
   * Processa um workflow individual
   *
   * Fluxo:
   * 1. Valida workflowItem
   * 2. Dry-run: simula aplicacao (sem API call)
   * 3. Producao: aplica tag via TagService com retry automatico
   * 4. Trata erros especificos: 404, 409, 429, 5xx
   * 5. Retorna ProcessingResult com status, duration, retries
   *
   * @param {Object} workflowItem - Item do mapeamento com { id, name: { new }, code, layer, tag }
   * @param {string} tagId - ID da tag a aplicar
   * @param {boolean} [dryRun=false] - Modo dry-run (simulacao)
   * @returns {Promise<ProcessingResult>} Resultado do processamento
   *
   * @example
   * const result = await processor.processWorkflow(
   *   { id: '123', name: { new: 'Workflow Test' }, code: 'TST-001', layer: 'C', tag: 'jana' },
   *   'tagId123',
   *   false
   * );
   * console.log(result.status); // 'success', 'failed', 'skipped', 'dry-run'
   */
  async processWorkflow(workflowItem, tagId, dryRun = false) {
    const startTime = Date.now();
    let retries = 0;
    let lastError = null;

    const workflowId = workflowItem.id;
    const workflowName = workflowItem.name?.new || workflowItem.name || 'Unknown';
    const workflowCode = workflowItem.code || 'N/A';

    try {
      // Validacao do workflowItem
      if (!workflowId) {
        throw new Error('workflowId is required');
      }

      // Modo DRY-RUN: Simular aplicacao sem chamar API
      if (dryRun || this.config.dryRun) {
        this.logger.info(`[DRY-RUN] Simulando aplicacao de tag ao workflow ${workflowCode} (${workflowName})`);

        // Simular delay de API (~100-200ms)
        await sleep(100 + Math.random() * 100);

        this.stats.dryRunCount++;

        return {
          workflowId,
          workflowName,
          workflowCode,
          status: 'dry-run',
          message: 'Tag application simulated (dry-run mode)',
          error: null,
          duration: Date.now() - startTime,
          retries: 0
        };
      }

      // Modo PRODUCAO: Aplicar tag via TagService com retry
      let attempt = 0;
      const maxRetries = RETRY_CONFIG.maxRetries;

      while (attempt < maxRetries) {
        try {
          this.logger.info(`Aplicando tag ao workflow ${workflowCode} (${workflowName})... [tentativa ${attempt + 1}/${maxRetries}]`);

          // Chamar TagService para aplicar tag
          const workflow = await this.tagService.applyTagToWorkflow(workflowId, tagId);

          // Sucesso!
          this.stats.successCount++;
          this.stats.totalRetries += retries;

          this.logger.success(`Tag aplicada com sucesso ao workflow ${workflowCode} (${workflowName})`);

          return {
            workflowId,
            workflowName,
            workflowCode,
            status: 'success',
            message: 'Tag applied successfully',
            error: null,
            duration: Date.now() - startTime,
            retries
          };

        } catch (error) {
          lastError = error;
          retries++;

          const statusCode = this._extractStatusCode(error);

          // Erros que NAO devem fazer retry
          if (statusCode === 401) {
            // Autenticacao invalida - falha imediata
            this.logger.error(`Erro 401 (Auth): ${error.message}`);
            throw error;
          }

          if (statusCode === 404) {
            // Workflow nao encontrado - pular
            this.logger.warn(`Workflow ${workflowCode} nao encontrado (404), pulando...`);
            this.stats.skippedCount++;

            return {
              workflowId,
              workflowName,
              workflowCode,
              status: 'skipped',
              message: 'Workflow not found (404)',
              error: error.message,
              duration: Date.now() - startTime,
              retries
            };
          }

          if (statusCode === 409) {
            // Tag ja aplicada - considerar sucesso
            this.logger.warn(`Tag ja aplicada ao workflow ${workflowCode} (409), considerando sucesso`);
            this.stats.successCount++;

            return {
              workflowId,
              workflowName,
              workflowCode,
              status: 'success',
              message: 'Tag already applied (409)',
              error: null,
              duration: Date.now() - startTime,
              retries
            };
          }

          // Erros que DEVEM fazer retry (429, 5xx, network errors)
          const shouldRetry = this._shouldRetry(error, statusCode);

          if (!shouldRetry || attempt >= maxRetries - 1) {
            // Esgotou retries ou erro nao recuperavel
            this.logger.error(`Falha ao aplicar tag ao workflow ${workflowCode} apos ${attempt + 1} tentativas: ${error.message}`);
            throw error;
          }

          // Calcular backoff e aguardar
          const delay = calculateBackoff(attempt, RETRY_CONFIG.baseDelay);
          this.logger.warn(`Retry ${attempt + 1}/${maxRetries} para workflow ${workflowCode} em ${Math.floor(delay)}ms...`);

          await sleep(delay);
          attempt++;
        }
      }

      // Se chegou aqui, esgotou retries
      throw lastError || new Error('Max retries exceeded');

    } catch (error) {
      // Erro definitivo apos retries
      this.stats.failedCount++;
      this.stats.totalRetries += retries;

      this.logger.error(`FALHA ao processar workflow ${workflowCode}: ${error.message}`);

      return {
        workflowId,
        workflowName,
        workflowCode,
        status: 'failed',
        message: `Failed after ${retries} retries`,
        error: error.message,
        duration: Date.now() - startTime,
        retries
      };
    } finally {
      this.stats.totalProcessed++;
    }
  }

  /**
   * Processa batch de workflows com concorrencia limitada
   *
   * Usa Promise pool pattern para limitar a 5 workflows simultaneos.
   * Divide workflows em batches e processa cada batch em paralelo.
   *
   * Performance: 31 workflows em ~5-6 segundos (vs 15s sequencial)
   *
   * @param {Array<Object>} workflowItems - Array de workflow items
   * @param {string} tagId - ID da tag a aplicar
   * @param {Object} options - Opcoes de processamento
   * @param {boolean} [options.dryRun=false] - Modo dry-run
   * @param {Function} [options.onProgress] - Callback de progresso (current, total, result)
   * @returns {Promise<BatchResult>} Resultado agregado do batch
   *
   * @example
   * const results = await processor.processBatch(workflows, tagId, {
   *   dryRun: false,
   *   onProgress: (current, total, result) => {
   *     console.log(`Progresso: ${current}/${total} - Status: ${result.status}`);
   *   }
   * });
   * console.log(results.summary); // { total: 31, success: 31, failed: 0, skipped: 0 }
   */
  async processBatch(workflowItems, tagId, options = {}) {
    const startTime = Date.now();
    const dryRun = options.dryRun || this.config.dryRun || false;
    const onProgress = options.onProgress || (() => {});

    const total = workflowItems.length;
    let current = 0;

    this.logger.info(`Iniciando processamento de ${total} workflows em modo ${dryRun ? 'DRY-RUN' : 'PRODUCAO'}`);
    this.logger.info(`Concorrencia maxima: ${this.config.maxConcurrent} workflows simultaneos`);

    // Array para armazenar todos os resultados
    const results = [];

    // Processar workflows com concorrencia limitada usando Promise pool
    const pool = [];

    for (const workflowItem of workflowItems) {
      // Criar promise para processar workflow
      const promise = this.processWorkflow(workflowItem, tagId, dryRun)
        .then(result => {
          current++;

          // Chamar callback de progresso
          onProgress(current, total, result);

          // Remover promise concluida do pool
          const index = pool.indexOf(promise);
          if (index > -1) {
            pool.splice(index, 1);
          }

          return result;
        })
        .catch(error => {
          current++;

          const errorResult = {
            workflowId: workflowItem.id,
            workflowName: workflowItem.name?.new || 'Unknown',
            workflowCode: workflowItem.code || 'N/A',
            status: 'failed',
            message: 'Processing failed',
            error: error.message,
            duration: 0,
            retries: 0
          };

          onProgress(current, total, errorResult);

          // Remover promise concluida do pool
          const index = pool.indexOf(promise);
          if (index > -1) {
            pool.splice(index, 1);
          }

          return errorResult;
        });

      pool.push(promise);
      results.push(promise);

      // Limitar concorrencia: aguardar se pool atingiu limite
      if (pool.length >= this.config.maxConcurrent) {
        await Promise.race(pool);
      }
    }

    // Aguardar todas as promises restantes
    const finalResults = await Promise.all(results);

    const duration = Date.now() - startTime;

    // Agregar resultados
    const summary = {
      total: finalResults.length,
      success: finalResults.filter(r => r.status === 'success').length,
      failed: finalResults.filter(r => r.status === 'failed').length,
      skipped: finalResults.filter(r => r.status === 'skipped').length,
      dryRun: finalResults.filter(r => r.status === 'dry-run').length
    };

    // Calcular estatisticas de performance
    const totalDuration = finalResults.reduce((sum, r) => sum + r.duration, 0);
    const totalRetries = finalResults.reduce((sum, r) => sum + r.retries, 0);
    const avgDuration = finalResults.length > 0 ? Math.floor(totalDuration / finalResults.length) : 0;

    this.logger.info(`Batch processado: ${summary.success} sucesso, ${summary.failed} falhas, ${summary.skipped} pulados`);
    this.logger.info(`Tempo total: ${(duration / 1000).toFixed(2)}s | Tempo medio: ${avgDuration}ms/workflow`);

    return {
      results: finalResults,
      summary,
      performance: {
        totalDuration: duration,
        averageDuration: avgDuration,
        totalRetries,
        speedup: this._calculateSpeedup(duration, finalResults.length)
      }
    };
  }

  /**
   * Retorna estatisticas de processamento
   *
   * @returns {Object} Estatisticas com total, sucessos, falhas, skipped, dry-run
   *
   * @example
   * const stats = processor.getStats();
   * console.log(stats); // { totalProcessed: 31, successCount: 31, failedCount: 0, ... }
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Reseta estatisticas de processamento
   *
   * @example
   * processor.resetStats();
   */
  resetStats() {
    this.stats = {
      totalProcessed: 0,
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
      dryRunCount: 0,
      totalRetries: 0
    };
  }

  // ========== METODOS PRIVADOS ==========

  /**
   * Extrai status code de erro
   * @private
   */
  _extractStatusCode(error) {
    if (error.statusCode) {
      return error.statusCode;
    }

    // Extrair de mensagem (ex: "HTTP 404: Not Found")
    const match = error.message && error.message.match(/(\d{3})/);
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * Verifica se erro deve fazer retry
   * @private
   */
  _shouldRetry(error, statusCode) {
    // Retry em rate limit (429)
    if (statusCode === 429) {
      return true;
    }

    // Retry em erros de servidor (5xx)
    if (statusCode >= 500 && statusCode < 600) {
      return true;
    }

    // Retry em erros de rede
    if (error.code && ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'].includes(error.code)) {
      return true;
    }

    return false;
  }

  /**
   * Calcula speedup da paralelizacao vs sequencial
   * @private
   */
  _calculateSpeedup(parallelDuration, workflowCount) {
    // Assumir 150ms medio por workflow em sequencial
    const sequentialEstimate = workflowCount * 150;
    const speedup = sequentialEstimate / parallelDuration;

    return parseFloat(speedup.toFixed(2));
  }
}

/**
 * @typedef {Object} ProcessingResult
 * @property {string} workflowId - ID do workflow
 * @property {string} workflowName - Nome do workflow
 * @property {string} workflowCode - Codigo do workflow (ex: BCO-ATU-001)
 * @property {'success'|'failed'|'skipped'|'dry-run'} status - Status do processamento
 * @property {string} message - Mensagem descritiva
 * @property {string|null} error - Mensagem de erro (se houver)
 * @property {number} duration - Duracao em milissegundos
 * @property {number} retries - Numero de tentativas
 */

/**
 * @typedef {Object} BatchResult
 * @property {ProcessingResult[]} results - Array de resultados individuais
 * @property {Object} summary - Sumario agregado
 * @property {number} summary.total - Total de workflows
 * @property {number} summary.success - Total de sucessos
 * @property {number} summary.failed - Total de falhas
 * @property {number} summary.skipped - Total de pulados
 * @property {number} summary.dryRun - Total de dry-run
 * @property {Object} performance - Metricas de performance
 * @property {number} performance.totalDuration - Duracao total em ms
 * @property {number} performance.averageDuration - Duracao media em ms
 * @property {number} performance.totalRetries - Total de retries
 * @property {number} performance.speedup - Speedup vs sequencial
 */

module.exports = WorkflowProcessor;
