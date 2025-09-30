/**
 * ReferenceUpdater - Atualiza referências de workflow IDs nos nodes
 * Implementa atualização recursiva seguindo o padrão do código de referência
 */

class ReferenceUpdater {
  constructor(idMapper, logger) {
    this.idMapper = idMapper;
    this.logger = logger;

    // Estatísticas
    this.stats = {
      workflowsProcessed: 0,
      referencesUpdated: 0,
      referencesFailed: 0,
      nodesProcessed: 0
    };
  }

  /**
   * Atualiza referências em um workflow
   * @param {object} workflow - Workflow do n8n
   * @returns {object} Workflow atualizado
   */
  updateWorkflow(workflow) {
    this.logger.debug(`Atualizando referências em: ${workflow.name}`);

    // Clona workflow para não modificar o original
    const updated = JSON.parse(JSON.stringify(workflow));

    // Atualiza recursivamente todos os nodes
    if (updated.nodes && Array.isArray(updated.nodes)) {
      for (const node of updated.nodes) {
        this.updateNode(node);
        this.stats.nodesProcessed++;
      }
    }

    this.stats.workflowsProcessed++;

    return updated;
  }

  /**
   * Atualiza referências em um node
   * @param {object} node - Node do workflow
   */
  updateNode(node) {
    // A recursão já vai processar executeWorkflow nodes
    // Removido chamada direta para evitar processamento duplicado
    this.updateObjectRecursively(node);
  }

  /**
   * Atualiza node do tipo executeWorkflow
   * @param {object} node - Node executeWorkflow
   */
  updateExecuteWorkflowNode(node) {
    if (!node.parameters || !node.parameters.workflowId) {
      return;
    }

    const workflowId = node.parameters.workflowId;

    // Caso 1: workflowId é um objeto com value e cachedResultName
    if (typeof workflowId === 'object' && workflowId !== null) {
      this.updateWorkflowIdObject(workflowId);
    }

    // Caso 2: workflowId é uma string (ID direto)
    else if (typeof workflowId === 'string') {
      const newId = this.idMapper.resolve(workflowId);
      if (newId) {
        node.parameters.workflowId = newId;
        this.stats.referencesUpdated++;
        this.logger.debug(`  Atualizado workflowId: ${workflowId} -> ${newId}`);
      } else {
        this.stats.referencesFailed++;
        this.logger.warn(`  Falha ao atualizar workflowId: ${workflowId}`);
      }
    }
  }

  /**
   * Atualiza objeto workflowId com value e cachedResultName
   * PRIORIZA busca por nome (cachedResultName)
   * @param {object} workflowIdObj - Objeto workflowId
   */
  updateWorkflowIdObject(workflowIdObj) {
    const oldId = workflowIdObj.value;
    const cachedName = workflowIdObj.cachedResultName;

    // PRIORIDADE: Buscar por nome (cachedResultName)
    let newId = null;

    if (cachedName) {
      newId = this.idMapper.getIdByName(cachedName);

      if (newId) {
        this.logger.debug(`  Mapeado por NOME: "${cachedName}" -> ${newId}`);
      }
    }

    // FALLBACK: Buscar por ID antigo
    if (!newId && oldId) {
      newId = this.idMapper.getIdByOldId(oldId);

      if (newId) {
        this.logger.debug(`  Mapeado por ID: ${oldId} -> ${newId}`);
      }
    }

    // Atualiza o value se encontrou mapeamento
    if (newId) {
      workflowIdObj.value = newId;
      this.stats.referencesUpdated++;
      this.logger.debug(`  Atualizado: "${cachedName}" | ${oldId} -> ${newId}`);
    } else {
      this.stats.referencesFailed++;
      this.logger.warn(`  Falha ao mapear: "${cachedName}" (${oldId})`);
    }
  }

  /**
   * Atualiza recursivamente todos os objetos procurando por workflowId
   * Segue o padrão do código de referência do usuário
   * @param {object|Array} obj - Objeto ou array para processar
   * @param {number} depth - Profundidade atual da recursão (para evitar stack overflow)
   */
  updateObjectRecursively(obj, depth = 0) {
    // Limite de profundidade para evitar stack overflow
    const MAX_DEPTH = 50;
    if (depth > MAX_DEPTH) {
      this.logger.warn(`  Profundidade máxima (${MAX_DEPTH}) atingida - parando recursão`);
      return;
    }

    if (!obj || typeof obj !== 'object') {
      return;
    }

    // Se é um array, processa cada elemento
    if (Array.isArray(obj)) {
      for (const item of obj) {
        this.updateObjectRecursively(item, depth + 1);
      }
      return;
    }

    // Se é um objeto, processa cada propriedade
    for (const key in obj) {
      const value = obj[key];

      // Caso especial: encontrou propriedade workflowId
      if (key === 'workflowId' && typeof value === 'object' && value !== null) {
        // Verifica se tem a estrutura esperada
        if (value.value || value.cachedResultName) {
          this.updateWorkflowIdObject(value);
        }
      }

      // Continua recursão
      if (typeof value === 'object' && value !== null) {
        this.updateObjectRecursively(value, depth + 1);
      }
    }
  }

  /**
   * Atualiza múltiplos workflows em lote
   * @param {Array} workflows - Array de workflows
   * @returns {Array} Workflows atualizados
   */
  updateBatch(workflows) {
    this.logger.section('Atualizando referências de workflows');

    const updated = [];

    for (let i = 0; i < workflows.length; i++) {
      const workflow = workflows[i];

      this.logger.progress(
        i + 1,
        workflows.length,
        `Atualizando: ${workflow.name}`
      );

      const updatedWorkflow = this.updateWorkflow(workflow);
      updated.push(updatedWorkflow);
    }

    this.logger.success('Referências atualizadas com sucesso');
    this.logStatistics();

    return updated;
  }

  /**
   * Valida se todas as referências foram atualizadas
   * @param {object} workflow - Workflow para validar
   * @returns {object} Resultado da validação
   */
  validateReferences(workflow) {
    const issues = [];

    const checkObject = (obj, path = '') => {
      if (!obj || typeof obj !== 'object') {
        return;
      }

      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          checkObject(item, `${path}[${index}]`);
        });
        return;
      }

      for (const key in obj) {
        const value = obj[key];
        const currentPath = path ? `${path}.${key}` : key;

        // Verifica workflowId
        if (key === 'workflowId' && typeof value === 'object' && value !== null) {
          if (value.value && value.cachedResultName) {
            // Verifica se o ID foi atualizado
            const newId = this.idMapper.getIdByName(value.cachedResultName);
            if (newId && value.value !== newId) {
              issues.push({
                path: currentPath,
                name: value.cachedResultName,
                currentId: value.value,
                expectedId: newId,
                message: 'ID não corresponde ao mapeamento esperado'
              });
            }
          }
        }

        if (typeof value === 'object' && value !== null) {
          checkObject(value, currentPath);
        }
      }
    };

    checkObject(workflow);

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Retorna estatísticas de atualização
   * @returns {object} Estatísticas
   */
  getStatistics() {
    return {
      ...this.stats,
      successRate: this.stats.referencesUpdated + this.stats.referencesFailed > 0
        ? ((this.stats.referencesUpdated /
            (this.stats.referencesUpdated + this.stats.referencesFailed)) * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Loga estatísticas
   */
  logStatistics() {
    const stats = this.getStatistics();

    this.logger.info(`Workflows processados: ${stats.workflowsProcessed}`);
    this.logger.info(`Nodes processados: ${stats.nodesProcessed}`);
    this.logger.info(`Referências atualizadas: ${stats.referencesUpdated}`);

    if (stats.referencesFailed > 0) {
      this.logger.warn(`Referências não encontradas: ${stats.referencesFailed}`);
    }

    this.logger.info(`Taxa de sucesso: ${stats.successRate}`);
  }

  /**
   * Reseta estatísticas
   */
  resetStatistics() {
    this.stats = {
      workflowsProcessed: 0,
      referencesUpdated: 0,
      referencesFailed: 0,
      nodesProcessed: 0
    };
  }
}

module.exports = ReferenceUpdater;
