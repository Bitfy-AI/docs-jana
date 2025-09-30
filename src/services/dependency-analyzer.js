/**
 * DependencyAnalyzer - Analisa dependências entre workflows n8n
 * Constrói grafo de dependências e determina ordem de upload
 */

const WorkflowGraph = require('../models/workflow-graph');

class DependencyAnalyzer {
  constructor(logger) {
    this.logger = logger;
    this.graph = new WorkflowGraph();
  }

  /**
   * Analisa dependências de um array de workflows
   * @param {Array} workflows - Array de workflows do n8n
   * @returns {object} Resultado da análise com ordem de upload
   */
  analyze(workflows) {
    this.logger.section('Analisando dependências entre workflows');

    // Fase 1: Adiciona todos os workflows ao grafo
    this.logger.info('Fase 1: Indexando workflows...');
    for (const workflow of workflows) {
      this.graph.addWorkflow(workflow);
    }
    this.logger.success(`${workflows.length} workflows indexados`);

    // Fase 2: Extrai dependências de cada workflow
    this.logger.info('Fase 2: Extraindo dependências...');
    let totalDependencies = 0;

    for (const workflow of workflows) {
      const dependencies = this.extractDependencies(workflow);
      totalDependencies += dependencies.length;

      // Adiciona dependências ao grafo
      for (const depName of dependencies) {
        const depId = this.graph.getIdByName(depName);

        if (depId) {
          this.graph.addDependency(workflow.id, depId);
          this.logger.debug(`"${workflow.name}" depende de "${depName}"`);
        } else {
          this.logger.warn(
            `Dependência não encontrada: "${depName}" (referenciado por "${workflow.name}")`
          );
        }
      }
    }

    this.logger.success(`${totalDependencies} dependências encontradas`);

    // Fase 3: Ordenação topológica
    this.logger.info('Fase 3: Calculando ordem de upload...');
    const sortResult = this.graph.topologicalSort();

    if (!sortResult.hasValidOrder) {
      this.logger.error('Detectado ciclo de dependências!');
      this.logger.warn('Workflows com dependência circular:');
      sortResult.cycles.forEach(cycle => {
        cycle.forEach(id => {
          const wf = this.graph.getWorkflow(id);
          this.logger.warn(`  - ${wf ? wf.name : id}`);
        });
      });
    } else {
      this.logger.success('Ordem de upload calculada com sucesso');
    }

    // Estatísticas
    const stats = this.graph.getStatistics();
    this.logger.info(`Workflows sem dependências: ${stats.workflowsWithoutDependencies}`);
    this.logger.info(`Média de dependências por workflow: ${stats.avgDependencies}`);
    this.logger.info(`Máximo de dependências: ${stats.maxDependencies}`);

    return {
      order: sortResult.order,
      cycles: sortResult.cycles,
      hasValidOrder: sortResult.hasValidOrder,
      graph: this.graph,
      statistics: stats
    };
  }

  /**
   * Extrai nomes de workflows dependidos a partir dos nodes
   * @param {object} workflow - Workflow do n8n
   * @returns {Array<string>} Array de nomes de workflows dependidos
   */
  extractDependencies(workflow) {
    const dependencies = new Set();

    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      return [];
    }

    for (const node of workflow.nodes) {
      // Busca por nodes do tipo "executeWorkflow"
      if (node.type === 'n8n-nodes-base.executeWorkflow') {
        const depName = this.extractWorkflowName(node);

        if (depName) {
          dependencies.add(depName);
        }
      }
    }

    return Array.from(dependencies);
  }

  /**
   * Extrai nome do workflow referenciado em um node executeWorkflow
   * @param {object} node - Node do tipo executeWorkflow
   * @returns {string|null} Nome do workflow ou null
   */
  extractWorkflowName(node) {
    if (!node.parameters) {
      return null;
    }

    const params = node.parameters;

    // Estratégia 1: Buscar em workflowId.cachedResultName
    if (params.workflowId && params.workflowId.cachedResultName) {
      return params.workflowId.cachedResultName;
    }

    // Estratégia 2: Buscar em workflowId se for string
    // REMOVIDO: Se workflowId é string, é um ID, não um nome
    // Não podemos usar para determinar dependências de forma confiável
    if (typeof params.workflowId === 'string') {
      this.logger.debug(`    workflowId é string (ID): ${params.workflowId} - não pode determinar nome`);
      return null;
    }

    // Estratégia 3: Buscar em source (workflows mais antigos)
    if (params.source && typeof params.source === 'string') {
      return params.source;
    }

    return null;
  }

  /**
   * Retorna workflows em ordem de upload (do grafo)
   * @param {Array<string>} orderIds - Array de IDs na ordem correta
   * @returns {Array<object>} Array de workflows ordenados
   */
  getOrderedWorkflows(orderIds) {
    return orderIds
      .map(id => this.graph.getWorkflow(id))
      .filter(wf => wf !== null);
  }

  /**
   * Gera relatório de dependências
   * @returns {object} Relatório formatado
   */
  generateReport() {
    const stats = this.graph.getStatistics();
    const sortResult = this.graph.topologicalSort();

    const report = {
      summary: {
        totalWorkflows: stats.totalWorkflows,
        totalDependencies: stats.totalDependencies,
        avgDependencies: stats.avgDependencies,
        maxDependencies: stats.maxDependencies,
        workflowsWithoutDependencies: stats.workflowsWithoutDependencies,
        hasCircularDependencies: !sortResult.hasValidOrder
      },
      uploadOrder: [],
      circularDependencies: [],
      dependencyTree: []
    };

    // Ordem de upload
    for (let i = 0; i < sortResult.order.length; i++) {
      const id = sortResult.order[i];
      const wf = this.graph.getWorkflow(id);

      if (wf) {
        report.uploadOrder.push({
          position: i + 1,
          name: wf.name,
          id: wf.id,
          dependencies: this.graph.getDependencies(id).length,
          dependents: this.graph.getDependents(id).length
        });
      }
    }

    // Ciclos de dependência
    if (sortResult.cycles.length > 0) {
      sortResult.cycles.forEach(cycle => {
        const cycleNames = cycle.map(id => {
          const wf = this.graph.getWorkflow(id);
          return wf ? wf.name : id;
        });
        report.circularDependencies.push(cycleNames);
      });
    }

    // Árvore de dependências
    for (const [id] of this.graph.workflows) {
      const wf = this.graph.getWorkflow(id);
      const deps = this.graph.getDependencies(id);

      if (wf) {
        report.dependencyTree.push({
          name: wf.name,
          id: wf.id,
          dependencies: deps.map(depId => {
            const depWf = this.graph.getWorkflow(depId);
            return depWf ? depWf.name : depId;
          })
        });
      }
    }

    return report;
  }

  /**
   * Retorna o grafo construído
   * @returns {WorkflowGraph} Grafo de dependências
   */
  getGraph() {
    return this.graph;
  }
}

module.exports = DependencyAnalyzer;
