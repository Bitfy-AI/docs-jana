/**
 * Worker Pool - Parallel processing with multiple workers
 * Processes workflows in parallel using a worker pool pattern
 */

class WorkerPool {
  constructor(workerCount, logger) {
    this.workerCount = workerCount;
    this.logger = logger;
    this.workers = [];
    this.queue = [];
    this.results = [];
    this.activeWorkers = 0;
    this.totalTasks = 0;
    this.completedTasks = 0;
  }

  /**
   * Process items in parallel with worker pool
   * @param {Array} items - Items to process
   * @param {Function} processFn - Function to process each item (async)
   * @returns {Promise<Array>} Array of results
   */
  async process(items, processFn) {
    this.queue = [...items];
    this.results = [];
    this.totalTasks = items.length;
    this.completedTasks = 0;
    this.activeWorkers = 0;

    if (this.queue.length === 0) {
      this.logger.warn('No items to process');
      return [];
    }

    this.logger.info(`🔄 Iniciando processamento paralelo com ${this.workerCount} workers`);
    this.logger.info(`📦 Total de itens: ${this.totalTasks}\n`);

    // Create workers
    const workerPromises = [];
    for (let i = 0; i < this.workerCount; i++) {
      workerPromises.push(this.createWorker(i + 1, processFn));
    }

    // Wait for all workers to complete
    await Promise.all(workerPromises);

    this.logger.success(`\n✅ Processamento concluído: ${this.completedTasks}/${this.totalTasks}`);

    return this.results;
  }

  /**
   * Create a worker that processes items from the queue
   * @param {number} workerId - Worker ID
   * @param {Function} processFn - Processing function
   * @returns {Promise<void>}
   */
  async createWorker(workerId, processFn) {
    this.logger.debug(`Worker ${workerId} iniciado`);

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) break;

      this.activeWorkers++;

      try {
        this.logger.info(`🔨 Worker ${workerId}: Processando item ${this.completedTasks + 1}/${this.totalTasks}`);

        const result = await processFn(item, workerId);

        this.results.push(result);
        this.completedTasks++;

        this.logger.success(`   ✓ Worker ${workerId}: Concluído (${this.completedTasks}/${this.totalTasks})`);

      } catch (error) {
        this.logger.error(`   ✗ Worker ${workerId}: Erro - ${error.message}`);

        // Still track as completed (but with error)
        this.results.push({
          error: error.message,
          item,
        });
        this.completedTasks++;

      } finally {
        this.activeWorkers--;
      }
    }

    this.logger.debug(`Worker ${workerId} finalizado`);
  }

  /**
   * Get processing statistics
   * @returns {object} Statistics
   */
  getStats() {
    const successful = this.results.filter(r => !r.error).length;
    const failed = this.results.filter(r => r.error).length;

    return {
      total: this.totalTasks,
      completed: this.completedTasks,
      successful,
      failed,
      remaining: this.queue.length,
      activeWorkers: this.activeWorkers,
    };
  }

  /**
   * Create a batch processor that splits work into chunks
   * @param {Array} items - Items to process
   * @param {Function} processFn - Processing function
   * @param {number} batchSize - Size of each batch
   * @returns {Promise<Array>} Results
   */
  async processBatches(items, processFn, batchSize = 5) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    this.logger.info(`📦 Dividido em ${batches.length} lotes de até ${batchSize} itens`);

    const allResults = [];

    for (let i = 0; i < batches.length; i++) {
      this.logger.section(`Processando lote ${i + 1}/${batches.length}`);
      const results = await this.process(batches[i], processFn);
      allResults.push(...results);
    }

    return allResults;
  }
}

module.exports = WorkerPool;