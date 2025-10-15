/**
 * TagLayerOrchestrator - Coordenador Principal do Fluxo de Execucao
 *
 * Responsavel por orquestrar todas as etapas do processo de aplicacao de tags:
 * 1. Validar ambiente e credenciais
 * 2. Testar conectividade com API n8n
 * 3. Carregar mapeamento de workflows
 * 4. Garantir que tag existe (criar se necessario)
 * 5. Processar workflows (batch paralelo)
 * 6. Gerar relatorio consolidado
 *
 * Utiliza Dependency Injection para facilitar testes e reutilizacao.
 *
 * @module core/orchestrator
 */

const { validateEnvironment } = require('./validators/environment-validator');
const MappingLoader = require('./loaders/mapping-loader');
const TagService = require('./services/tag-service');
const WorkflowProcessor = require('./processors/workflow-processor');
const ReportGenerator = require('./services/report-generator');
const ProgressTracker = require('../utils/progress-tracker');
const Logger = require('../../../../src/utils/logger');
const { formatTimestamp, formatDuration } = require('../utils/helpers');

/**
 * Resultado da execucao completa
 * @typedef {Object} ExecutionResult
 * @property {boolean} success - Se execucao foi bem-sucedida
 * @property {Object} summary - Sumario de resultados
 * @property {number} summary.total - Total de workflows processados
 * @property {number} summary.success - Total de sucessos
 * @property {number} summary.failed - Total de falhas
 * @property {number} summary.skipped - Total de ignorados
 * @property {number} summary.dryRun - Total em dry-run
 * @property {Array<Object>} results - Array de resultados individuais
 * @property {Object} performance - Metricas de performance
 * @property {number} performance.totalDuration - Duracao total em ms
 * @property {number} performance.averageDuration - Duracao media em ms
 * @property {string} reportPath - Caminho do relatorio gerado
 * @property {Array<string>} errors - Lista de erros (vazia se sucesso)
 */

class TagLayerOrchestrator {
  /**
   * Cria instancia do orquestrador
   *
   * Aceita dependencias via construtor (Dependency Injection).
   * Se nao fornecidas, cria instancias padrao.
   *
   * @param {Object} dependencies - Dependencias injetadas
   * @param {MappingLoader} [dependencies.mappingLoader] - Loader de mapeamento
   * @param {TagService} [dependencies.tagService] - Servico de tags
   * @param {WorkflowProcessor} [dependencies.workflowProcessor] - Processador de workflows
   * @param {ReportGenerator} [dependencies.reportGenerator] - Gerador de relatorios
   * @param {Logger} [dependencies.logger] - Logger
   *
   * @example
   * const orchestrator = new TagLayerOrchestrator();
   * const result = await orchestrator.execute({ dryRun: false, verbose: true });
   */
  constructor(dependencies = {}) {
    // Dependencias (Dependency Injection)
    this.mappingLoader = dependencies.mappingLoader || new MappingLoader();
    this.tagService = dependencies.tagService || new TagService();
    this.reportGenerator = dependencies.reportGenerator || new ReportGenerator();
    this.logger = dependencies.logger || new Logger({ logLevel: 'info' });

    // WorkflowProcessor sera criado depois com TagService injetado
    this.workflowProcessor = dependencies.workflowProcessor || null;

    // Estado interno
    this.validationResult = null;
    this.tagData = null;
  }

  /**
   * Valida ambiente (variáveis de ambiente e credenciais)
   *
   * Verifica:
   * - Presença de SOURCE_N8N_URL
   * - Presença de SOURCE_N8N_API_KEY
   * - Formato válido das credenciais
   *
   * @returns {Promise<Object>} Resultado da validacao { success, errors, credentials }
   * @throws {Error} Se validacao falhar
   *
   * @example
   * const validation = await orchestrator.validateEnvironment();
   * if (!validation.success) {
   *   console.error(validation.errors);
   * }
   */
  async validateEnvironment() {
    this.logger.info('Validando ambiente e credenciais...');

    try {
      const result = await validateEnvironment();

      if (!result.success) {
        this.logger.error('Falha na validacao do ambiente');
        result.errors.forEach(error => {
          this.logger.error(`  - ${error}`);
        });
      } else {
        this.logger.success('Ambiente validado com sucesso');
      }

      this.validationResult = result;
      return result;
    } catch (error) {
      this.logger.error('Erro ao validar ambiente:', error.message);
      throw error;
    }
  }

  /**
   * Testa conectividade com API n8n
   *
   * Faz chamada simples à API para verificar:
   * - Conectividade de rede
   * - Autenticacao valida
   * - API acessivel
   *
   * @returns {Promise<boolean>} true se conectividade OK, false caso contrario
   *
   * @example
   * const canConnect = await orchestrator.testConnection();
   * if (!canConnect) {
   *   console.error('Nao foi possivel conectar a API n8n');
   * }
   */
  async testConnection() {
    this.logger.info('Testando conectividade com API n8n...');

    try {
      // Tentar listar tags como teste de conectividade
      await this.tagService.listTags();
      this.logger.success('Conectividade com API n8n OK');
      return true;
    } catch (error) {
      this.logger.error('Falha ao conectar com API n8n:', error.message);
      return false;
    }
  }

  /**
   * Carrega mapeamento de workflows do arquivo JSON
   *
   * Realiza:
   * - Leitura do arquivo rename-mapping-atualizado.json
   * - Validacao dos dados
   * - Transformacao para formato interno
   *
   * @returns {Promise<Object>} Resultado do carregamento { success, data, errors }
   * @throws {Error} Se carregamento falhar
   *
   * @example
   * const mapping = await orchestrator.loadMapping();
   * console.log(`Carregados ${mapping.data.length} workflows`);
   */
  async loadMapping() {
    this.logger.info('Carregando mapeamento de workflows...');

    try {
      const result = this.mappingLoader.loadAndTransform();

      if (!result.success) {
        this.logger.error('Falha ao carregar mapeamento');
        result.errors.forEach(error => {
          this.logger.error(`  - ${error.message || error}`);
        });
        return result;
      }

      this.logger.success(`Mapeamento carregado: ${result.data.length} workflows`);

      // Exibir estatisticas
      const stats = this.mappingLoader.getStatistics(result.data);
      this.logger.info('Distribuicao por layer:');
      Object.entries(stats.byLayer).forEach(([layer, count]) => {
        this.logger.info(`  - Layer ${layer}: ${count} workflows`);
      });

      return result;
    } catch (error) {
      this.logger.error('Erro ao carregar mapeamento:', error.message);
      throw error;
    }
  }

  /**
   * Garante que tag existe (cria se necessario)
   *
   * @param {string} tagName - Nome da tag (ex: 'jana')
   * @returns {Promise<Object>} Tag existente ou criada
   * @throws {Error} Se falhar ao garantir tag
   *
   * @example
   * const tag = await orchestrator.ensureTag('jana');
   * console.log(`Tag ID: ${tag.id}`);
   */
  async ensureTag(tagName) {
    this.logger.info(`Garantindo que tag '${tagName}' existe...`);

    try {
      const tag = await this.tagService.ensureTagExists(tagName);
      this.logger.success(`Tag '${tagName}' pronta (ID: ${tag.id})`);
      this.tagData = tag;
      return tag;
    } catch (error) {
      this.logger.error(`Falha ao garantir tag '${tagName}':`, error.message);
      throw error;
    }
  }

  /**
   * Processa workflows (batch paralelo)
   *
   * Realiza processamento em batch com:
   * - Concorrencia limitada (max 5 simultaneos)
   * - Progress tracking em tempo real
   * - Retry automatico em falhas
   *
   * @param {Array<Object>} workflowItems - Array de workflow items
   * @param {string} tagId - ID da tag a aplicar
   * @param {Object} options - Opcoes de processamento
   * @param {boolean} options.dryRun - Modo dry-run
   * @param {boolean} options.quiet - Modo silencioso (sem progress bar)
   * @returns {Promise<Object>} Resultado do batch { results, summary, performance }
   *
   * @example
   * const batchResult = await orchestrator.processWorkflows(workflows, tagId, {
   *   dryRun: false,
   *   quiet: false
   * });
   */
  async processWorkflows(workflowItems, tagId, options = {}) {
    const dryRun = options.dryRun || false;
    const quiet = options.quiet || false;

    this.logger.info(`Iniciando processamento de ${workflowItems.length} workflows...`);
    this.logger.info(`Modo: ${dryRun ? 'DRY-RUN (simulacao)' : 'PRODUCAO'}`);

    // Criar WorkflowProcessor se nao foi injetado
    if (!this.workflowProcessor) {
      this.workflowProcessor = new WorkflowProcessor(
        this.tagService,
        this.logger,
        { maxConcurrent: 5, dryRun }
      );
    }

    // Criar progress tracker
    const progressTracker = new ProgressTracker(workflowItems.length, {
      enabled: !quiet
    });

    progressTracker.start();

    // Processar batch com callback de progresso
    const batchResult = await this.workflowProcessor.processBatch(
      workflowItems,
      tagId,
      {
        dryRun,
        onProgress: (current, total, result) => {
          progressTracker.update(result);
        }
      }
    );

    progressTracker.complete();

    // Logar sumario
    this.logger.info('Processamento concluido:');
    this.logger.info(`  - Total: ${batchResult.summary.total}`);
    this.logger.info(`  - Sucesso: ${batchResult.summary.success}`);
    this.logger.info(`  - Falhas: ${batchResult.summary.failed}`);
    this.logger.info(`  - Ignorados: ${batchResult.summary.skipped}`);

    return batchResult;
  }

  /**
   * Gera relatorio consolidado
   *
   * Cria relatorio em Markdown com:
   * - Sumario executivo
   * - Estatisticas por layer
   * - Lista de sucessos/falhas
   * - Metricas de performance
   *
   * @param {Array<Object>} results - Array de resultados
   * @param {Object} metadata - Metadados da execucao
   * @returns {Promise<string>} Caminho do relatorio salvo
   *
   * @example
   * const reportPath = await orchestrator.generateReport(results, {
   *   mode: 'production',
   *   timestamp: '2025-10-02T19:30:00Z',
   *   duration: 5800
   * });
   */
  async generateReport(results, metadata) {
    this.logger.info('Gerando relatorio consolidado...');

    try {
      // Adicionar layer aos resultados se estiver faltando
      const enrichedResults = results.map(result => {
        // Buscar workflow item original para pegar a layer
        const workflowItem = this.workflowItems?.find(w => w.id === result.workflowId);
        return {
          ...result,
          layer: result.layer || workflowItem?.layer || 'Unknown',
          name: result.workflowName || result.name || 'Unknown'
        };
      });

      const reportContent = this.reportGenerator.generateMarkdownReport(
        enrichedResults,
        metadata
      );

      const reportPath = this.reportGenerator.saveReport(reportContent);

      this.logger.success(`Relatorio salvo em: ${reportPath}`);

      return reportPath;
    } catch (error) {
      this.logger.error('Erro ao gerar relatorio:', error.message);
      throw error;
    }
  }

  /**
   * Executa fluxo completo de aplicacao de tags
   *
   * Orquestra todas as etapas:
   * 1. Validar ambiente
   * 2. Testar conexao
   * 3. Carregar mapeamento
   * 4. Garantir tag existe
   * 5. Processar workflows
   * 6. Gerar relatorio
   *
   * @param {Object} options - Opcoes de execucao
   * @param {boolean} [options.dryRun=false] - Modo dry-run (simulacao)
   * @param {boolean} [options.verbose=false] - Logs detalhados
   * @param {boolean} [options.quiet=false] - Modo silencioso (apenas erros)
   * @param {string} [options.tagName='jana'] - Nome da tag a aplicar
   * @returns {Promise<ExecutionResult>} Resultado da execucao completa
   *
   * @example
   * const orchestrator = new TagLayerOrchestrator();
   * const result = await orchestrator.execute({
   *   dryRun: false,
   *   verbose: true,
   *   quiet: false,
   *   tagName: 'jana'
   * });
   *
   * if (result.success) {
   *   console.log('Execucao completa com sucesso!');
   *   console.log(`Relatorio: ${result.reportPath}`);
   * }
   */
  async execute(options = {}) {
    const startTime = Date.now();
    const timestamp = formatTimestamp();

    const dryRun = options.dryRun || false;
    const verbose = options.verbose || false;
    const quiet = options.quiet || false;
    const tagName = options.tagName || 'jana';

    // Ajustar nivel de log
    if (verbose) {
      this.logger.setLogLevel('debug');
    } else if (quiet) {
      this.logger.setLogLevel('error');
    }

    this.logger.info('='.repeat(60));
    this.logger.info('Tag Layer Application - Orchestrator');
    this.logger.info('='.repeat(60));
    this.logger.info(`Timestamp: ${timestamp}`);
    this.logger.info(`Modo: ${dryRun ? 'DRY-RUN' : 'PRODUCTION'}`);
    this.logger.info('='.repeat(60));
    this.logger.info('');

    const errors = [];

    try {
      // ETAPA 1: Validar ambiente
      this.logger.info('[1/6] Validando ambiente e credenciais...');
      const envValidation = await this.validateEnvironment();

      if (!envValidation.success) {
        return {
          success: false,
          summary: { total: 0, success: 0, failed: 0, skipped: 0, dryRun: 0 },
          results: [],
          performance: { totalDuration: 0, averageDuration: 0 },
          reportPath: null,
          errors: envValidation.errors
        };
      }
      this.logger.info('');

      // ETAPA 2: Testar conexao
      this.logger.info('[2/6] Testando conectividade com API n8n...');
      const canConnect = await this.testConnection();

      if (!canConnect) {
        return {
          success: false,
          summary: { total: 0, success: 0, failed: 0, skipped: 0, dryRun: 0 },
          results: [],
          performance: { totalDuration: 0, averageDuration: 0 },
          reportPath: null,
          errors: ['Falha ao conectar com API n8n']
        };
      }
      this.logger.info('');

      // ETAPA 3: Carregar mapeamento
      this.logger.info('[3/6] Carregando mapeamento de workflows...');
      const mappingResult = await this.loadMapping();

      if (!mappingResult.success) {
        return {
          success: false,
          summary: { total: 0, success: 0, failed: 0, skipped: 0, dryRun: 0 },
          results: [],
          performance: { totalDuration: 0, averageDuration: 0 },
          reportPath: null,
          errors: mappingResult.errors.map(e => e.message || e)
        };
      }

      this.workflowItems = mappingResult.data;
      this.logger.info('');

      // ETAPA 4: Garantir tag existe
      this.logger.info(`[4/6] Garantindo que tag '${tagName}' existe...`);
      const tag = await this.ensureTag(tagName);
      this.logger.info('');

      // ETAPA 5: Processar workflows
      this.logger.info('[5/6] Processando workflows...');
      const batchResult = await this.processWorkflows(
        this.workflowItems,
        tag.id,
        { dryRun, quiet }
      );
      this.logger.info('');

      // ETAPA 6: Gerar relatorio
      this.logger.info('[6/6] Gerando relatorio consolidado...');
      const duration = Date.now() - startTime;
      const reportPath = await this.generateReport(batchResult.results, {
        timestamp,
        mode: dryRun ? 'dry-run' : 'production',
        duration
      });
      this.logger.info('');

      // Resultado final
      this.logger.info('='.repeat(60));
      this.logger.success('Execucao concluida com sucesso!');
      this.logger.info(`Duracao total: ${formatDuration(duration)}`);
      this.logger.info(`Relatorio: ${reportPath}`);
      this.logger.info('='.repeat(60));

      return {
        success: batchResult.summary.failed === 0,
        summary: batchResult.summary,
        results: batchResult.results,
        performance: {
          totalDuration: duration,
          averageDuration: batchResult.performance.averageDuration
        },
        reportPath,
        errors: []
      };

    } catch (error) {
      this.logger.error('');
      this.logger.error('='.repeat(60));
      this.logger.error('ERRO FATAL NA EXECUCAO');
      this.logger.error('='.repeat(60));
      this.logger.error(`Mensagem: ${error.message}`);
      if (verbose) {
        this.logger.error(`Stack trace: ${error.stack}`);
      }
      this.logger.error('='.repeat(60));

      return {
        success: false,
        summary: { total: 0, success: 0, failed: 0, skipped: 0, dryRun: 0 },
        results: [],
        performance: { totalDuration: Date.now() - startTime, averageDuration: 0 },
        reportPath: null,
        errors: [error.message]
      };
    }
  }
}

module.exports = TagLayerOrchestrator;
