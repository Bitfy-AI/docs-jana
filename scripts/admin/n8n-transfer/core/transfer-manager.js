/**
 * @fileoverview TransferManager - Orquestrador central do sistema de transferência N8N
 *
 * Esta classe coordena todos os componentes do sistema (ConfigLoader, PluginRegistry, HttpClient, Logger)
 * e gerencia o ciclo de vida completo de transferências de workflows entre servidores N8N.
 *
 * @module core/transfer-manager
 * @requires ./config-loader
 * @requires ./plugin-registry
 * @requires ./http-client
 * @requires ./logger
 * @requires ./types
 */

const path = require('path');
const ConfigLoader = require('./config-loader');
const PluginRegistry = require('./plugin-registry');
const HttpClient = require('./http-client');
const Logger = require('./logger');
const { validateTransferOptions } = require('./types');

/**
 * Status possíveis de transferência
 * @enum {string}
 */
const TransferStatus = {
  IDLE: 'idle',
  RUNNING: 'running',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  FAILED: 'failed'
};

/**
 * TransferManager - Orquestrador central do sistema de transferência
 *
 * Responsável por:
 * - Inicializar e coordenar todos os componentes do sistema
 * - Gerenciar estado e progresso de transferências
 * - Orquestrar validações, deduplicação e transferências
 * - Fornecer API para plugins e comandos CLI
 *
 * @class
 * @example
 * // Criar TransferManager com .env
 * const manager = new TransferManager('.env');
 *
 * // Executar transferência
 * const result = await manager.transfer({
 *   filters: { tags: ['production'] },
 *   dryRun: false
 * });
 *
 * // Verificar progresso
 * const progress = manager.getProgress();
 * console.log(`${progress.percentage}% completo`);
 */
class TransferManager {
  /**
   * Cria uma instância do TransferManager
   *
   * @param {string|Object} config - Path para arquivo .env ou objeto de configuração
   * @param {Object} [options={}] - Opções adicionais
   * @param {Logger} [options.logger] - Instância de Logger customizada
   * @param {PluginRegistry} [options.pluginRegistry] - PluginRegistry customizado
   * @throws {Error} Se configuração for inválida ou SOURCE/TARGET não estiverem definidos
   *
   * @example
   * // Com path para .env
   * const manager = new TransferManager('.env');
   *
   * @example
   * // Com objeto de configuração
   * const manager = new TransferManager({
   *   SOURCE: { url: 'https://source.com', apiKey: 'key1' },
   *   TARGET: { url: 'https://target.com', apiKey: 'key2' }
   * });
   *
   * @example
   * // Com logger customizado
   * const manager = new TransferManager('.env', {
   *   logger: new Logger({ level: 'debug' })
   * });
   */
  constructor(config, options = {}) {
    // Validar parâmetros
    if (!config) {
      throw new Error('TransferManager requires config parameter (string path or object)');
    }

    // Inicializar logger (injetado ou criar novo)
    this.logger = options.logger || new Logger();

    this.logger.info('Initializing TransferManager...');

    try {
      // Carregar configuração
      if (typeof config === 'string') {
        this.logger.debug(`Loading config from file: ${config}`);
        this.config = ConfigLoader.load(config);
      } else if (typeof config === 'object') {
        this.logger.debug('Using provided config object');
        this.config = config;
      } else {
        throw new Error('Config must be a string (file path) or object');
      }

      // Validar que SOURCE e TARGET existem
      this._validateConfig(this.config);

      // Inicializar HttpClients (um para SOURCE, outro para TARGET)
      this.logger.debug('Initializing HttpClients for SOURCE and TARGET');
      this.sourceClient = new HttpClient({
        baseUrl: this.config.SOURCE.url,
        apiKey: this.config.SOURCE.apiKey,
        logger: this.logger
      });
      this.targetClient = new HttpClient({
        baseUrl: this.config.TARGET.url,
        apiKey: this.config.TARGET.apiKey,
        logger: this.logger
      });

      // Inicializar PluginRegistry (injetado ou auto-discover)
      if (options.pluginRegistry) {
        this.logger.debug('Using injected PluginRegistry');
        this.pluginRegistry = options.pluginRegistry;
      } else {
        this.logger.debug('Creating PluginRegistry with auto-discovery');
        const pluginsDir = path.join(__dirname, '..', 'plugins');
        this.pluginRegistry = new PluginRegistry(pluginsDir);
      }

      // Inicializar state management
      this._initializeState();

      this.logger.info('TransferManager initialized successfully', {
        source: this._maskUrl(this.config.SOURCE.url),
        target: this._maskUrl(this.config.TARGET.url),
        pluginsCount: this.pluginRegistry.getAll().length
      });

    } catch (error) {
      this.logger.error('Failed to initialize TransferManager', { error: error.message });
      throw error;
    }
  }

  /**
   * Valida configuração obrigatória
   *
   * @private
   * @param {Object} config - Configuração a validar
   * @throws {Error} Se configuração estiver incompleta ou inválida
   */
  _validateConfig(config) {
    // Validar SOURCE
    if (!config.SOURCE) {
      throw new Error('Configuration missing SOURCE server definition');
    }
    if (!config.SOURCE.url) {
      throw new Error('SOURCE.url is required');
    }
    if (!config.SOURCE.apiKey) {
      throw new Error('SOURCE.apiKey is required');
    }

    // Validar TARGET
    if (!config.TARGET) {
      throw new Error('Configuration missing TARGET server definition');
    }
    if (!config.TARGET.url) {
      throw new Error('TARGET.url is required');
    }
    if (!config.TARGET.apiKey) {
      throw new Error('TARGET.apiKey is required');
    }

    // Warning se SOURCE e TARGET são iguais
    if (config.SOURCE.url === config.TARGET.url) {
      this.logger.warn('SOURCE and TARGET URLs are identical - this may cause issues');
    }
  }

  /**
   * Inicializa state management interno
   *
   * @private
   */
  _initializeState() {
    /**
     * Estado de progresso da transferência
     * @private
     * @type {Object}
     */
    this._progress = {
      total: 0,
      processed: 0,
      transferred: 0,
      skipped: 0,
      failed: 0,
      percentage: 0,
      status: TransferStatus.IDLE
    };

    /**
     * Flag de cancelamento
     * @private
     * @type {boolean}
     */
    this._cancelRequested = false;

    /**
     * Signal handlers para cancelamento
     * @private
     * @type {Object|null}
     */
    this._signalHandlers = null;

    /**
     * Plugins carregados para transferência atual
     * @private
     * @type {Object}
     */
    this._plugins = {
      deduplicator: null,
      validators: [],
      reporters: []
    };
  }

  /**
   * Mascara URL para logging seguro (esconde API key)
   *
   * @private
   * @param {string} url - URL completa
   * @returns {string} URL mascarada
   */
  _maskUrl(url) {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    } catch {
      return url;
    }
  }

  /**
   * Configura signal handlers para cancelamento via Ctrl+C
   * @private
   */
  _setupSignalHandlers() {
    // Armazenar handlers para poder remover depois
    this._signalHandlers = {
      sigint: () => {
        this.logger.warn('\n⚠️  Received SIGINT (Ctrl+C). Cancelling transfer...');
        this.cancel();
      },
      sigterm: () => {
        this.logger.warn('\n⚠️  Received SIGTERM. Cancelling transfer...');
        this.cancel();
      }
    };

    process.on('SIGINT', this._signalHandlers.sigint);
    process.on('SIGTERM', this._signalHandlers.sigterm);

    this.logger.debug('Signal handlers configured for graceful cancellation');
  }

  /**
   * Remove signal handlers
   * @private
   */
  _removeSignalHandlers() {
    if (this._signalHandlers) {
      process.removeListener('SIGINT', this._signalHandlers.sigint);
      process.removeListener('SIGTERM', this._signalHandlers.sigterm);
      this._signalHandlers = null;
      this.logger.debug('Signal handlers removed');
    }
  }

  /**
   * Executa transferência de workflows do SOURCE para TARGET
   *
   * Esta é a função principal que orquestra todo o processo de transferência:
   * - Valida opções e conectividade (Task 20)
   * - Carrega plugins apropriados (Task 21)
   * - Busca workflows com filtros aplicados (Task 21)
   * - Executa deduplicação e validação (Task 22)
   * - Transfere workflows (ou simula em dry-run) (Task 22)
   * - Gera relatórios (Task 23)
   *
   * @async
   * @param {import('./types').TransferOptions} [options={}] - Opções de transferência
   * @returns {Promise<import('./types').TransferSummary>} Resumo da transferência
   * @throws {Error} Se validação falhar
   *
   * @example
   * // Transferência simples com defaults
   * const result = await manager.transfer();
   *
   * @example
   * // Com filtros
   * const result = await manager.transfer({
   *   filters: { tags: ['production'] },
   *   dryRun: true
   * });
   *
   * @example
   * // Transferência customizada
   * const result = await manager.transfer({
   *   filters: { workflowIds: ['123', '456'] },
   *   parallelism: 5,
   *   deduplicator: 'fuzzy-deduplicator',
   *   validators: ['integrity-validator', 'schema-validator'],
   *   reporters: ['markdown-reporter', 'json-reporter']
   * });
   *
   * @example
   * // Dry-run mode - simulate transfer without creating workflows
   * const result = await manager.transfer({
   *   filters: { tags: ['production'] },
   *   dryRun: true
   * });
   * console.log(`[DRY-RUN] Would transfer ${result.transferred} workflows`);
   * console.log(`Dry-run flag: ${result.dryRun}`); // true
   */
  async transfer(options = {}) {
    const startTime = Date.now();

    // PARTE 1: VALIDAÇÃO (Task 20)
    this.logger.info('Starting transfer operation...');

    // Setup signal handlers para Ctrl+C
    this._setupSignalHandlers();

    try {
      // 1. Validar TransferOptions usando Zod
      const validatedOptions = this._validateTransferOptions(options);

      // 2. Atualizar status
      this._progress.status = TransferStatus.RUNNING;

      // 3. Testar conectividade SOURCE e TARGET
      this.logger.info('Testing connectivity...');
      await this._testConnectivity();

      this.logger.info('Validation successful. Starting transfer...');

      // PARTE 2: CARREGAMENTO DE PLUGINS (Task 21)
      this.logger.info('Loading plugins...');
      const plugins = await this._loadPlugins(validatedOptions);
      this._plugins = plugins;

      this.logger.info('Plugins loaded successfully', {
        deduplicator: plugins.deduplicator.getName(),
        validators: plugins.validators.map(v => v.getName()),
        reporters: plugins.reporters.map(r => r.getName())
      });

      // PARTE 3: FETCHING DE WORKFLOWS (Task 22)
      this.logger.info('Fetching workflows...');
      const { sourceWorkflows, targetWorkflows } = await this._fetchWorkflows(validatedOptions);

      this.logger.info('Workflows fetched successfully', {
        sourceCount: sourceWorkflows.length,
        targetCount: targetWorkflows.length
      });

      // Verificar se há workflows para processar
      if (sourceWorkflows.length === 0) {
        this.logger.warn('No workflows found matching filters. Transfer aborted.');
        this._progress.status = TransferStatus.COMPLETED;

        // Cleanup signal handlers
        this._removeSignalHandlers();

        return this._buildTransferSummary([], 0, validatedOptions);
      }

      // PARTE 4: LOOP PRINCIPAL DE PROCESSAMENTO
      this.logger.info('Starting workflow processing...');

      // Inicializar progresso
      this._progress.total = sourceWorkflows.length;
      this._progress.processed = 0;
      this._progress.transferred = 0;
      this._progress.skipped = 0;
      this._progress.failed = 0;

      // Processar workflows (sequencial ou paralelo)
      let processedWorkflows;
      if (validatedOptions.parallelism > 1) {
        processedWorkflows = await this._processWorkflowsBatch(
          sourceWorkflows,
          targetWorkflows,
          plugins,
          validatedOptions
        );
      } else {
        // Fallback para sequencial (parallelism = 1)
        processedWorkflows = await this._processWorkflowsSequential(
          sourceWorkflows,
          targetWorkflows,
          plugins,
          validatedOptions
        );
      }

      // Finalizar
      const duration = Date.now() - startTime;
      this._progress.status = this._cancelRequested ? TransferStatus.CANCELLED : TransferStatus.COMPLETED;

      this.logger.info('Transfer completed', {
        total: this._progress.total,
        transferred: this._progress.transferred,
        skipped: this._progress.skipped,
        failed: this._progress.failed,
        duration: `${duration}ms`
      });

      // Construir summary
      const summary = this._buildTransferSummary(processedWorkflows, duration, validatedOptions);

      // Mensagem final de dry-run
      if (validatedOptions.dryRun) {
        this.logger.info('========================================');
        this.logger.info('🔍 DRY-RUN MODE COMPLETED');
        this.logger.info('No workflows were actually transferred.');
        this.logger.info('This was a simulation. Use dryRun: false to execute real transfer.');
        this.logger.info('========================================');
      }

      // Gerar relatórios
      if (this._plugins.reporters && this._plugins.reporters.length > 0) {
        try {
          const reportFiles = await this.generateReports(summary, this._plugins.reporters);
          summary.reports = reportFiles;

          this.logger.info('Report paths:', {
            reports: reportFiles.map(r => r.path)
          });
        } catch (error) {
          this.logger.error('Report generation failed', { error: error.message });
          // Não falha a transferência se relatórios falharem
        }
      }

      // Cleanup signal handlers
      this._removeSignalHandlers();

      return summary;

    } catch (error) {
      this._progress.status = TransferStatus.FAILED;
      this.logger.error('Transfer operation failed', { error: error.message });

      // Cleanup signal handlers
      this._removeSignalHandlers();

      throw error;
    }
  }

  /**
   * Valida TransferOptions usando Zod
   *
   * @private
   * @param {Object} options - Opções de transferência a validar
   * @returns {import('./types').TransferOptions} Opções validadas com defaults aplicados
   * @throws {Error} Se validação falhar
   */
  _validateTransferOptions(options) {
    this.logger.debug('Validating transfer options...', { options });

    const result = validateTransferOptions(options);

    if (!result.success) {
      const errors = result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ');
      const errorMessage = `TransferOptions validation failed: ${errors}`;
      this.logger.error(errorMessage, { zodErrors: result.error.issues });
      throw new Error(errorMessage);
    }

    this.logger.debug('Transfer options validated successfully', { validatedOptions: result.data });
    return result.data;
  }

  /**
   * Testa conectividade com SOURCE e TARGET
   *
   * @private
   * @throws {Error} Se conexão falhar
   */
  async _testConnectivity() {
    try {
      // Testar SOURCE
      this.logger.debug('Testing SOURCE connectivity...');
      const sourceResult = await this.sourceClient.testConnection();

      if (!sourceResult.success) {
        throw new Error(`SOURCE connection failed: ${sourceResult.error}. ${sourceResult.suggestion || ''}`);
      }

      this.logger.info('✓ SOURCE connection successful');

      // Testar TARGET
      this.logger.debug('Testing TARGET connectivity...');
      const targetResult = await this.targetClient.testConnection();

      if (!targetResult.success) {
        throw new Error(`TARGET connection failed: ${targetResult.error}. ${targetResult.suggestion || ''}`);
      }

      this.logger.info('✓ TARGET connection successful');

    } catch (error) {
      this.logger.error('Connectivity test failed', { error: error.message });
      this._progress.status = TransferStatus.FAILED;
      throw new Error(`Connectivity test failed: ${error.message}`);
    }
  }

  /**
   * Carrega plugins necessários para a transferência
   *
   * @private
   * @param {import('./types').TransferOptions} options - Opções validadas
   * @returns {Promise<Object>} Objeto com plugins carregados
   * @returns {Object} Object.deduplicator - Deduplicator plugin
   * @returns {Array} Object.validators - Array de validator plugins
   * @returns {Array} Object.reporters - Array de reporter plugins
   * @throws {Error} Se plugin deduplicator não for encontrado
   */
  async _loadPlugins(options) {
    const plugins = {
      deduplicator: null,
      validators: [],
      reporters: []
    };

    // 1. Carregar Deduplicator (obrigatório, 1 apenas)
    this.logger.debug(`Loading deduplicator: ${options.deduplicator}`);
    plugins.deduplicator = this.pluginRegistry.get(options.deduplicator, 'deduplicator');

    if (!plugins.deduplicator) {
      throw new Error(`Deduplicator plugin not found: ${options.deduplicator}`);
    }

    if (!plugins.deduplicator.isEnabled()) {
      this.logger.warn(`Deduplicator ${options.deduplicator} is disabled. Enabling...`);
      plugins.deduplicator.enable();
    }

    // 2. Carregar Validators (opcional, múltiplos)
    for (const validatorName of options.validators) {
      this.logger.debug(`Loading validator: ${validatorName}`);
      const validator = this.pluginRegistry.get(validatorName, 'validator');

      if (!validator) {
        this.logger.warn(`Validator plugin not found: ${validatorName}. Skipping...`);
        continue;
      }

      if (!validator.isEnabled()) {
        this.logger.warn(`Validator ${validatorName} is disabled. Enabling...`);
        validator.enable();
      }

      plugins.validators.push(validator);
    }

    // 3. Carregar Reporters (opcional, múltiplos)
    for (const reporterName of options.reporters) {
      this.logger.debug(`Loading reporter: ${reporterName}`);
      const reporter = this.pluginRegistry.get(reporterName, 'reporter');

      if (!reporter) {
        this.logger.warn(`Reporter plugin not found: ${reporterName}. Skipping...`);
        continue;
      }

      if (!reporter.isEnabled()) {
        this.logger.warn(`Reporter ${reporterName} is disabled. Enabling...`);
        reporter.enable();
      }

      plugins.reporters.push(reporter);
    }

    // 4. Validar que pelo menos 1 plugin de cada tipo foi carregado
    if (!plugins.deduplicator) {
      throw new Error('No deduplicator plugin loaded');
    }

    if (plugins.validators.length === 0) {
      this.logger.warn('No validators loaded. Validation will be skipped.');
    }

    if (plugins.reporters.length === 0) {
      this.logger.warn('No reporters loaded. Reports will not be generated.');
    }

    return plugins;
  }

  /**
   * Busca workflows do SOURCE e TARGET aplicando filtros
   *
   * @private
   * @param {import('./types').TransferOptions} options - Opções validadas
   * @returns {Promise<Object>} Objeto com arrays de workflows
   * @returns {Array} Object.sourceWorkflows - Workflows do SOURCE filtrados
   * @returns {Array} Object.targetWorkflows - Workflows do TARGET para deduplicação
   * @throws {Error} Se fetching falhar
   */
  async _fetchWorkflows(options) {
    try {
      // 1. Buscar todos workflows do SOURCE
      this.logger.debug('Fetching SOURCE workflows...');
      const allSourceWorkflows = await this.sourceClient.getWorkflows();
      this.logger.info(`Fetched ${allSourceWorkflows.length} workflows from SOURCE`);

      // 2. Aplicar filtros aos workflows do SOURCE
      const sourceWorkflows = this._applyFilters(allSourceWorkflows, options.filters);
      this.logger.info(`After filters: ${sourceWorkflows.length} workflows selected`);

      // 3. Buscar todos workflows do TARGET (para deduplicação)
      this.logger.debug('Fetching TARGET workflows for deduplication...');
      const targetWorkflows = await this.targetClient.getWorkflows();
      this.logger.info(`Fetched ${targetWorkflows.length} workflows from TARGET`);

      return { sourceWorkflows, targetWorkflows };

    } catch (error) {
      this.logger.error('Failed to fetch workflows', { error: error.message });
      this._progress.status = TransferStatus.FAILED;
      throw new Error(`Workflow fetching failed: ${error.message}`);
    }
  }

  /**
   * Aplica filtros a lista de workflows
   *
   * @private
   * @param {Array} workflows - Lista de workflows
   * @param {Object} filters - Filtros a aplicar
   * @returns {Array} Workflows filtrados
   */
  _applyFilters(workflows, filters = {}) {
    let filtered = [...workflows];

    // Filtro 1: workflowIds específicos
    if (filters.workflowIds && filters.workflowIds.length > 0) {
      this.logger.debug(`Applying filter: workflowIds (${filters.workflowIds.length} IDs)`);
      filtered = filtered.filter(w => filters.workflowIds.includes(w.id));
    }

    // Filtro 2: workflowNames específicos
    if (filters.workflowNames && filters.workflowNames.length > 0) {
      this.logger.debug(`Applying filter: workflowNames (${filters.workflowNames.length} names)`);
      filtered = filtered.filter(w => filters.workflowNames.includes(w.name));
    }

    // Filtro 3: Incluir workflows com tags específicas (OR - qualquer tag match)
    if (filters.tags && filters.tags.length > 0) {
      this.logger.debug(`Applying filter: tags (${filters.tags.length} tags)`);
      filtered = filtered.filter(w => {
        if (!w.tags || w.tags.length === 0) return false;
        return filters.tags.some(tag => w.tags.includes(tag));
      });
    }

    // Filtro 4: Excluir workflows com tags específicas (OR - qualquer tag match)
    if (filters.excludeTags && filters.excludeTags.length > 0) {
      this.logger.debug(`Applying filter: excludeTags (${filters.excludeTags.length} tags)`);
      filtered = filtered.filter(w => {
        if (!w.tags || w.tags.length === 0) return true; // Sem tags = não excluir
        return !filters.excludeTags.some(tag => w.tags.includes(tag));
      });
    }

    this.logger.debug(`Filters applied: ${workflows.length} → ${filtered.length} workflows`);
    return filtered;
  }

  /**
   * Processa workflows sequencialmente (parallelism = 1)
   * @private
   * @param {Array} workflows - Workflows a processar
   * @param {Array} targetWorkflows - Workflows do TARGET
   * @param {Object} plugins - Plugins carregados
   * @param {import('./types').TransferOptions} options - Opções validadas
   * @returns {Promise<Array>} Workflows processados
   */
  async _processWorkflowsSequential(workflows, targetWorkflows, plugins, options) {
    const processedWorkflows = [];

    this.logger.info('Processing workflows sequentially (parallelism = 1)');

    for (const workflow of workflows) {
      // Verificar cancelamento
      if (this._cancelRequested) {
        this.logger.warn('Transfer cancelled by user');
        break;
      }

      try {
        const result = await this._processWorkflow(workflow, targetWorkflows, plugins, options);
        processedWorkflows.push(result);

        // Atualizar contadores
        if (result.status === 'transferred') this._progress.transferred++;
        else if (result.status === 'skipped') this._progress.skipped++;
        else if (result.status === 'failed') this._progress.failed++;

      } catch (error) {
        this.logger.error(`Failed to process workflow: ${workflow.name}`, { error: error.message });
        processedWorkflows.push({
          name: workflow.name,
          sourceId: workflow.id,
          status: 'failed',
          error: error.message
        });
        this._progress.failed++;
      }

      // Atualizar progresso
      this._progress.processed++;
      this._updateProgress();
    }

    return processedWorkflows;
  }

  /**
   * Processa workflows em batches paralelos
   * @private
   * @param {Array} workflows - Workflows a processar
   * @param {Array} targetWorkflows - Workflows do TARGET
   * @param {Object} plugins - Plugins carregados
   * @param {import('./types').TransferOptions} options - Opções validadas
   * @returns {Promise<Array>} Workflows processados
   */
  async _processWorkflowsBatch(workflows, targetWorkflows, plugins, options) {
    const parallelism = options.parallelism || 3;
    const processedWorkflows = [];

    this.logger.info(`Processing workflows with parallelism: ${parallelism}`);

    // Processar em batches
    for (let i = 0; i < workflows.length; i += parallelism) {
      // Verificar cancelamento
      if (this._cancelRequested) {
        this.logger.warn('Transfer cancelled by user');
        break;
      }

      const batch = workflows.slice(i, i + parallelism);
      this.logger.debug(`Processing batch ${Math.floor(i / parallelism) + 1}: ${batch.length} workflow(s)`);

      // Processar batch em paralelo
      const batchPromises = batch.map(workflow =>
        this._processWorkflow(workflow, targetWorkflows, plugins, options)
          .catch(error => {
            // Capturar erro individual sem falhar batch
            this.logger.error(`Failed to process workflow: ${workflow.name}`, { error: error.message });
            return {
              name: workflow.name,
              sourceId: workflow.id,
              status: 'failed',
              error: error.message
            };
          })
      );

      // Aguardar batch completar
      const batchResults = await Promise.all(batchPromises);

      // Atualizar contadores e progresso
      for (const result of batchResults) {
        processedWorkflows.push(result);

        if (result.status === 'transferred') this._progress.transferred++;
        else if (result.status === 'skipped') this._progress.skipped++;
        else if (result.status === 'failed') this._progress.failed++;

        this._progress.processed++;
        this._updateProgress();
      }
    }

    return processedWorkflows;
  }

  /**
   * Processa um workflow individual
   *
   * @private
   * @param {Object} workflow - Workflow a processar
   * @param {Array} targetWorkflows - Workflows do TARGET
   * @param {Object} plugins - Plugins carregados
   * @param {import('./types').TransferOptions} options - Opções validadas
   * @returns {Promise<Object>} Resultado do processamento
   */
  async _processWorkflow(workflow, targetWorkflows, plugins, options) {
    this.logger.debug(`Processing workflow: ${workflow.name} (${workflow.id})`);

    // ETAPA 1: Deduplication Check
    const isDuplicate = plugins.deduplicator.isDuplicate(workflow, targetWorkflows);

    if (isDuplicate) {
      const reason = plugins.deduplicator.getReason();
      this.logger.info(`Skipping duplicate workflow: ${workflow.name}`, { reason });
      return {
        name: workflow.name,
        sourceId: workflow.id,
        status: 'skipped',
        reason: reason || 'Duplicate detected'
      };
    }

    // ETAPA 2: Pre-validation
    const validationErrors = this._runValidators(workflow, plugins.validators, 'pre');

    if (validationErrors.length > 0) {
      const errorMsg = validationErrors.map(e => e.message).join('; ');
      this.logger.warn(`Validation failed for workflow: ${workflow.name}`, { errors: validationErrors });
      return {
        name: workflow.name,
        sourceId: workflow.id,
        status: 'skipped',
        reason: `Validation failed: ${errorMsg}`
      };
    }

    // ETAPA 3: Detecção de credenciais (opcional)
    if (options.skipCredentials) {
      const hasCredentials = this._hasCredentials(workflow);
      if (hasCredentials) {
        this.logger.info(`Skipping workflow with credentials: ${workflow.name}`);
        return {
          name: workflow.name,
          sourceId: workflow.id,
          status: 'skipped',
          reason: 'Workflow contains credentials (skipCredentials=true)'
        };
      }
    }

    // ETAPA 4: Transfer ou Simulate (dry-run)
    if (options.dryRun) {
      this.logger.info(`[DRY-RUN] Would transfer workflow: ${workflow.name}`);
      return {
        name: workflow.name,
        sourceId: workflow.id,
        targetId: 'simulated',
        status: 'transferred',
        simulated: true
      };
    } else {
      // Transfer real
      this.logger.info(`Transferring workflow: ${workflow.name}`);
      const created = await this.targetClient.createWorkflow(workflow);

      this.logger.info(`✓ Workflow transferred successfully: ${workflow.name}`, {
        sourceId: workflow.id,
        targetId: created.id
      });

      return {
        name: workflow.name,
        sourceId: workflow.id,
        targetId: created.id,
        status: 'transferred'
      };
    }
  }

  /**
   * Executa validators em um workflow
   *
   * @private
   * @param {Object} workflow - Workflow a validar
   * @param {Array} validators - Array de validators
   * @param {string} phase - Fase de validação ('pre', 'post' ou 'standalone')
   * @returns {Array} Array de erros de validação com severidade
   */
  _runValidators(workflow, validators, phase = 'pre') {
    const errors = [];

    for (const validator of validators) {
      try {
        const result = validator.validate(workflow);

        // Processar erros com severidade 'error'
        if (!result.valid) {
          errors.push(...result.errors.map(err => ({
            validator: validator.getName(),
            phase,
            message: err,
            severity: 'error'
          })));
        }

        // Processar warnings com severidade 'warning'
        if (result.warnings && result.warnings.length > 0) {
          errors.push(...result.warnings.map(warn => ({
            validator: validator.getName(),
            phase,
            message: warn,
            severity: 'warning'
          })));

          this.logger.debug(`Validator warnings from ${validator.getName()}`, {
            warnings: result.warnings
          });
        }

      } catch (error) {
        this.logger.error(`Validator ${validator.getName()} threw error`, { error: error.message });
        errors.push({
          validator: validator.getName(),
          phase,
          message: `Validator error: ${error.message}`,
          severity: 'error'
        });
      }
    }

    return errors;
  }

  /**
   * Detecta se workflow contém credenciais
   *
   * @private
   * @param {Object} workflow - Workflow a verificar
   * @returns {boolean} True se contém credenciais
   */
  _hasCredentials(workflow) {
    // Verificar se nodes têm credentials
    if (!workflow.nodes || workflow.nodes.length === 0) {
      return false;
    }

    for (const node of workflow.nodes) {
      if (node.credentials && Object.keys(node.credentials).length > 0) {
        return true;
      }
    }

    return false;
  }

  /**
   * Atualiza progresso com percentual calculado
   *
   * @private
   */
  _updateProgress() {
    if (this._progress.total > 0) {
      this._progress.percentage = Math.round((this._progress.processed / this._progress.total) * 100);
    }

    this.logger.debug('Progress updated', {
      processed: this._progress.processed,
      total: this._progress.total,
      percentage: this._progress.percentage
    });
  }

  /**
   * Constrói resumo da transferência
   *
   * @private
   * @param {Array} processedWorkflows - Workflows processados
   * @param {number} duration - Duração em ms
   * @param {import('./types').TransferOptions} options - Opções validadas
   * @returns {Object} TransferSummary
   */
  _buildTransferSummary(processedWorkflows, duration, options) {
    const now = new Date();
    const startTime = new Date(now.getTime() - duration);

    return {
      total: this._progress.total,
      transferred: this._progress.transferred,
      skipped: this._progress.skipped,
      failed: this._progress.failed,
      processed: this._progress.processed,
      duration,
      workflows: processedWorkflows,
      startTime,
      endTime: now,
      sourceUrl: this.config.SOURCE.url,
      targetUrl: this.config.TARGET.url,
      dryRun: options.dryRun || false,
      cancelled: this._cancelRequested
    };
  }

  /**
   * Gera relatórios da transferência usando reporters carregados
   *
   * @param {Object} transferSummary - Resumo da transferência
   * @param {Array} reporters - Array de reporter plugins
   * @returns {Promise<Array>} Array de ReportFile com paths
   *
   * @example
   * const reports = await manager.generateReports(summary, reporters);
   * reports.forEach(report => {
   *   console.log(`Report generated: ${report.path}`);
   * });
   */
  async generateReports(transferSummary, reporters) {
    if (!reporters || reporters.length === 0) {
      this.logger.warn('No reporters configured. Skipping report generation.');
      return [];
    }

    this.logger.info(`Generating reports with ${reporters.length} reporter(s)...`);

    const reportFiles = [];

    for (const reporter of reporters) {
      try {
        this.logger.debug(`Generating report with ${reporter.getName()}...`);

        const reportPath = reporter.generate(transferSummary);

        reportFiles.push({
          reporter: reporter.getName(),
          path: reportPath,
          format: this._getReporterFormat(reporter.getName())
        });

        this.logger.info(`✓ Report generated: ${reportPath}`, {
          reporter: reporter.getName()
        });

      } catch (error) {
        this.logger.error(`Failed to generate report with ${reporter.getName()}`, {
          error: error.message
        });
        // Continua gerando outros relatórios mesmo se um falhar
      }
    }

    this.logger.info(`Report generation completed. ${reportFiles.length} report(s) generated.`);

    return reportFiles;
  }

  /**
   * Determina formato do relatório baseado no nome do reporter
   * @private
   * @param {string} reporterName - Nome do reporter
   * @returns {string} Formato (markdown, json, csv, etc)
   */
  _getReporterFormat(reporterName) {
    if (reporterName.includes('markdown')) return 'markdown';
    if (reporterName.includes('json')) return 'json';
    if (reporterName.includes('csv')) return 'csv';
    return 'unknown';
  }

  /**
   * Valida workflows do SOURCE sem transferir
   *
   * Executa validações em workflows do SOURCE sem executar transferência.
   * Útil para verificar integridade antes de iniciar processo de transferência.
   *
   * @async
   * @param {Object} [options={}] - Opções de validação
   * @param {Object} [options.filters] - Filtros de workflows (mesmos do transfer)
   * @param {string[]} [options.validators] - Validators a usar (default: ['integrity-validator'])
   * @returns {Promise<import('./types').ValidationResult>} Resultado da validação
   * @throws {Error} Se validação falhar de forma crítica
   *
   * @example
   * const result = await manager.validate({
   *   filters: { tags: ['production'] },
   *   validators: ['integrity-validator', 'schema-validator']
   * });
   *
   * console.log(`Validated ${result.total} workflows`);
   * console.log(`Found ${result.errors} errors, ${result.warnings} warnings`);
   * result.issues.forEach(issue => console.log(issue));
   */
  async validate(options = {}) {
    this.logger.info('Starting validation operation...');

    // 1. Validar options
    const validatedOptions = {
      filters: options.filters || {},
      validators: options.validators || ['integrity-validator']
    };

    // 2. Testar conectividade SOURCE apenas
    this.logger.info('Testing SOURCE connectivity...');
    try {
      const sourceResult = await this.sourceClient.testConnection();
      if (!sourceResult.success) {
        throw new Error(`SOURCE connection failed: ${sourceResult.error}. ${sourceResult.suggestion || ''}`);
      }
      this.logger.info('✓ SOURCE connection successful');
    } catch (error) {
      this.logger.error('SOURCE connectivity test failed', { error: error.message });
      throw new Error(`SOURCE connectivity test failed: ${error.message}`);
    }

    // 3. Carregar validators
    this.logger.info('Loading validators...');
    const validators = [];

    for (const validatorName of validatedOptions.validators) {
      const validator = this.pluginRegistry.get(validatorName, 'validator');
      if (!validator) {
        this.logger.warn(`Validator not found: ${validatorName}. Skipping...`);
        continue;
      }

      if (!validator.isEnabled()) {
        this.logger.debug(`Enabling validator: ${validatorName}`);
        validator.enable();
      }

      validators.push(validator);
    }

    if (validators.length === 0) {
      throw new Error('No validators loaded. Cannot perform validation.');
    }

    this.logger.info(`Loaded ${validators.length} validator(s)`);

    // 4. Fetch workflows do SOURCE
    this.logger.info('Fetching workflows from SOURCE...');
    const allWorkflows = await this.sourceClient.getWorkflows();
    const workflows = this._applyFilters(allWorkflows, validatedOptions.filters);

    this.logger.info(`Validating ${workflows.length} workflow(s)...`);

    // 5. Validar cada workflow
    const issues = [];
    let totalErrors = 0;
    let totalWarnings = 0;

    for (const workflow of workflows) {
      const validationErrors = this._runValidators(workflow, validators, 'standalone');

      if (validationErrors.length > 0) {
        issues.push({
          workflow: workflow.name,
          workflowId: workflow.id,
          issues: validationErrors
        });
        totalErrors += validationErrors.filter(e => e.severity === 'error').length;
        totalWarnings += validationErrors.filter(e => e.severity === 'warning').length;
      }
    }

    // 6. Construir resultado
    const result = {
      total: workflows.length,
      valid: workflows.length - issues.length,
      invalid: issues.length,
      errors: totalErrors,
      warnings: totalWarnings,
      issues,
      validators: validators.map(v => v.getName())
    };

    this.logger.info('Validation completed', {
      total: result.total,
      valid: result.valid,
      invalid: result.invalid,
      errors: result.errors,
      warnings: result.warnings
    });

    return result;
  }

  /**
   * Retorna progresso atual da transferência
   *
   * @returns {Object} Estado de progresso
   * @property {number} total - Total de workflows a processar
   * @property {number} processed - Workflows processados
   * @property {number} transferred - Workflows transferidos com sucesso
   * @property {number} skipped - Workflows pulados (duplicados)
   * @property {number} failed - Workflows que falharam
   * @property {number} percentage - Percentual completo (0-100)
   * @property {string} status - Status atual (idle|running|completed|cancelled|failed)
   *
   * @example
   * const progress = manager.getProgress();
   * console.log(`Status: ${progress.status}`);
   * console.log(`Progress: ${progress.processed}/${progress.total} (${progress.percentage}%)`);
   * console.log(`Transferred: ${progress.transferred}, Skipped: ${progress.skipped}, Failed: ${progress.failed}`);
   */
  getProgress() {
    return { ...this._progress };
  }

  /**
   * Solicita cancelamento graceful da transferência
   *
   * A transferência será cancelada após completar o workflow atual.
   * Não aborta operações em andamento imediatamente.
   *
   * @returns {boolean} True se cancelamento foi solicitado, false se não há operação em andamento
   *
   * @example
   * // Em outro contexto/thread
   * const cancelled = manager.cancel();
   * if (cancelled) {
   *   console.log('Cancellation requested');
   * }
   */
  cancel() {
    if (this._progress.status !== TransferStatus.RUNNING) {
      this.logger.warn('No transfer in progress. Cannot cancel.');
      return false;
    }

    this._cancelRequested = true;
    this.logger.warn('⚠️  Transfer cancellation requested. Will stop after current workflow...');
    return true;
  }

  /**
   * Registra plugin em runtime
   *
   * Permite adicionar plugins customizados depois que TransferManager já foi instanciado.
   * Útil para plugins dinâmicos ou testes.
   *
   * @param {Object} plugin - Plugin a registrar (deve implementar interface apropriada)
   * @throws {Error} Se plugin for inválido
   *
   * @example
   * // Registrar custom deduplicator
   * const customPlugin = {
   *   type: 'deduplicator',
   *   name: 'custom-fuzzy',
   *   version: '1.0.0',
   *   execute: async (workflow, existingWorkflows) => { ... }
   * };
   * manager.registerPlugin(customPlugin);
   */
  registerPlugin(plugin) {
    try {
      this.pluginRegistry.register(plugin);
      this.logger.info(`Plugin registered: ${plugin.name} (${plugin.type})`);
    } catch (error) {
      this.logger.error(`Failed to register plugin: ${error.message}`);
      throw error;
    }
  }

  /**
   * Retorna instância do PluginRegistry
   *
   * Útil para inspecionar plugins disponíveis ou interagir diretamente com registry.
   *
   * @returns {PluginRegistry} Instância do PluginRegistry
   *
   * @example
   * const registry = manager.getPluginRegistry();
   * const allPlugins = registry.getAll();
   * console.log(`Total plugins: ${allPlugins.length}`);
   */
  getPluginRegistry() {
    return this.pluginRegistry;
  }

  /**
   * Retorna instância do Logger
   *
   * Útil para logging adicional ou configurar níveis de log.
   *
   * @returns {Logger} Instância do Logger
   *
   * @example
   * const logger = manager.getLogger();
   * logger.setLevel('debug');
   * logger.debug('Custom debug message');
   */
  getLogger() {
    return this.logger;
  }
}

module.exports = TransferManager;
