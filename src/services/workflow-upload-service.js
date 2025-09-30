/**
 * WorkflowUploadService - Gerencia o processo de upload de workflows para n8n
 * Implementa criação sequencial respeitando dependências
 */

class WorkflowUploadService {
  constructor(workflowService, idMapper, logger) {
    this.workflowService = workflowService;
    this.idMapper = idMapper;
    this.logger = logger;

    // Estatísticas
    this.stats = {
      attempted: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0
    };

    // Resultados detalhados
    this.results = {
      success: [],
      failed: [],
      skipped: []
    };
  }

  /**
   * Faz upload de workflows em ordem sequencial
   * @param {Array} orderedWorkflows - Workflows na ordem correta (pós ordenação topológica)
   * @param {object} options - Opções de upload
   * @returns {Promise<object>} Resultado do upload
   */
  async uploadBatch(orderedWorkflows, options = {}) {
    const {
      dryRun = false,
      skipExisting = true,
      activateWorkflows = false,
      delayBetweenUploads = 500 // ms entre uploads
    } = options;

    this.logger.section(
      dryRun ? 'Simulação de upload (DRY RUN)' : 'Iniciando upload de workflows'
    );

    // Obtém workflows existentes no destino (se skipExisting)
    let existingWorkflows = [];
    if (skipExisting && !dryRun) {
      this.logger.info('Verificando workflows existentes no destino...');
      try {
        existingWorkflows = await this.workflowService.listWorkflows();
        this.logger.info(`${existingWorkflows.length} workflows encontrados no destino`);
      } catch (error) {
        this.logger.warn(`Erro ao listar workflows existentes: ${error.message}`);
      }
    }

    // Cria mapa de nomes existentes
    const existingNames = new Set(
      existingWorkflows.map(wf => wf.name)
    );

    // Upload sequencial
    for (let i = 0; i < orderedWorkflows.length; i++) {
      const workflow = orderedWorkflows[i];

      this.logger.progress(
        i + 1,
        orderedWorkflows.length,
        `Processando: ${workflow.name}`
      );

      // Verifica se já existe
      if (skipExisting && existingNames.has(workflow.name)) {
        this.logger.warn(`  Workflow já existe, pulando: ${workflow.name}`);

        // CRÍTICO: Registrar workflow existente no IdMapper
        const existingWorkflow = existingWorkflows.find(wf => wf.name === workflow.name);
        if (existingWorkflow) {
          this.idMapper.register(
            workflow.id,           // ID antigo (do arquivo)
            workflow.name,         // Nome
            existingWorkflow.id,   // ID novo (no destino)
            existingWorkflow       // Dados completos
          );
          this.logger.debug(`  Mapeamento registrado: ${workflow.id} -> ${existingWorkflow.id}`);
        } else {
          this.logger.error(`  Workflow existe mas não foi encontrado na lista!`);
        }

        this.stats.skipped++;
        this.results.skipped.push({
          name: workflow.name,
          reason: 'Já existe no destino'
        });
        continue;
      }

      // Tenta fazer upload
      try {
        this.stats.attempted++;

        if (dryRun) {
          // Modo simulação
          this.logger.info(`  [DRY RUN] Criaria: ${workflow.name}`);

          // Simula ID gerado
          const fakeId = `fake-${Date.now()}-${i}`;
          this.idMapper.register(workflow.id, workflow.name, fakeId, {
            ...workflow,
            id: fakeId
          });

          this.stats.succeeded++;
          this.results.success.push({
            name: workflow.name,
            oldId: workflow.id,
            newId: fakeId,
            dryRun: true
          });
        } else {
          // Upload real
          const created = await this.uploadWorkflow(workflow, activateWorkflows);

          // Registra mapeamento
          this.idMapper.register(
            workflow.id,
            workflow.name,
            created.id,
            created
          );

          this.stats.succeeded++;
          this.results.success.push({
            name: workflow.name,
            oldId: workflow.id,
            newId: created.id,
            active: created.active
          });

          this.logger.success(`  Criado: ${workflow.name} (${created.id})`);

          // Delay entre uploads para não sobrecarregar API
          if (delayBetweenUploads > 0 && i < orderedWorkflows.length - 1) {
            await this.sleep(delayBetweenUploads);
          }
        }
      } catch (error) {
        this.stats.failed++;
        this.results.failed.push({
          name: workflow.name,
          oldId: workflow.id,
          error: error.message
        });

        this.logger.error(`  Erro ao criar ${workflow.name}: ${error.message}`);

        // Decide se continua ou para
        if (options.stopOnError) {
          this.logger.error('Parando upload devido a erro (stopOnError=true)');
          break;
        }
      }
    }

    this.logger.success('Upload concluído');
    this.logStatistics();

    return {
      statistics: this.getStatistics(),
      results: this.results
    };
  }

  /**
   * Faz upload de um único workflow
   * @param {object} workflow - Workflow para fazer upload
   * @param {boolean} activate - Se deve ativar o workflow
   * @returns {Promise<object>} Workflow criado
   */
  async uploadWorkflow(workflow, activate = false) {
    // Prepara dados para criação
    const workflowData = this.prepareWorkflowForUpload(workflow, activate);

    // Cria workflow via API
    const created = await this.workflowService.createWorkflow(workflowData);

    return created;
  }

  /**
   * Prepara workflow para upload (remove campos desnecessários)
   * @param {object} workflow - Workflow original
   * @param {boolean} activate - Se deve ativar
   * @returns {object} Workflow preparado
   */
  prepareWorkflowForUpload(workflow, activate) {
    // Remove campos que não devem ser enviados
    const prepared = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: workflow.settings,
      staticData: workflow.staticData,
      tags: workflow.tags,
      active: activate
    };

    // Remove campos undefined/null
    Object.keys(prepared).forEach(key => {
      if (prepared[key] === undefined || prepared[key] === null) {
        delete prepared[key];
      }
    });

    return prepared;
  }

  /**
   * Atualiza workflow existente
   * @param {string} workflowId - ID do workflow
   * @param {object} workflowData - Dados para atualizar
   * @returns {Promise<object>} Workflow atualizado
   */
  async updateWorkflow(workflowId, workflowData) {
    this.logger.debug(`Atualizando workflow ${workflowId}`);
    return await this.workflowService.updateWorkflow(workflowId, workflowData);
  }

  /**
   * Atualiza múltiplos workflows (fase 4 da migração)
   * @param {Array} workflows - Workflows com referências atualizadas
   * @returns {Promise<object>} Resultado da atualização
   */
  async updateBatch(workflows) {
    this.logger.section('Atualizando workflows com novas referências');

    const results = {
      updated: [],
      failed: []
    };

    for (let i = 0; i < workflows.length; i++) {
      const workflow = workflows[i];

      this.logger.progress(
        i + 1,
        workflows.length,
        `Atualizando: ${workflow.name}`
      );

      try {
        // Busca o novo ID do workflow
        const newId = this.idMapper.getIdByName(workflow.name);

        if (!newId) {
          throw new Error('Workflow não encontrado no mapeamento');
        }

        // Prepara dados para atualização
        const updateData = this.prepareWorkflowForUpload(workflow, workflow.active);

        // Atualiza via API
        const updated = await this.updateWorkflow(newId, updateData);

        results.updated.push({
          name: workflow.name,
          id: newId
        });

        this.logger.success(`  Atualizado: ${workflow.name}`);
      } catch (error) {
        results.failed.push({
          name: workflow.name,
          error: error.message
        });

        this.logger.error(`  Erro ao atualizar ${workflow.name}: ${error.message}`);
      }
    }

    this.logger.success('Atualização concluída');
    this.logger.info(`Atualizados: ${results.updated.length}`);
    if (results.failed.length > 0) {
      this.logger.warn(`Falhas: ${results.failed.length}`);
    }

    return results;
  }

  /**
   * Utilitário para sleep
   * @param {number} ms - Milissegundos
   * @returns {Promise} Promise que resolve após delay
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retorna estatísticas de upload
   * @returns {object} Estatísticas
   */
  getStatistics() {
    return {
      ...this.stats,
      successRate: this.stats.attempted > 0
        ? ((this.stats.succeeded / this.stats.attempted) * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Loga estatísticas
   */
  logStatistics() {
    const stats = this.getStatistics();

    this.logger.info(`Total processados: ${stats.attempted}`);
    this.logger.info(`Sucesso: ${stats.succeeded}`);

    if (stats.skipped > 0) {
      this.logger.info(`Pulados: ${stats.skipped}`);
    }

    if (stats.failed > 0) {
      this.logger.warn(`Falhas: ${stats.failed}`);
    }

    this.logger.info(`Taxa de sucesso: ${stats.successRate}`);
  }

  /**
   * Reseta estatísticas
   */
  resetStatistics() {
    this.stats = {
      attempted: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0
    };

    this.results = {
      success: [],
      failed: [],
      skipped: []
    };
  }
}

module.exports = WorkflowUploadService;
