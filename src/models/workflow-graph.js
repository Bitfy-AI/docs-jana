/**
 * WorkflowGraph - Estrutura de dados para análise de dependências entre workflows
 * Implementa um grafo direcionado para ordenação topológica
 */

class WorkflowGraph {
  constructor() {
    // Mapa de workflows: id -> workflow completo
    this.workflows = new Map();

    // Mapa de nome -> id para busca rápida
    this.nameToId = new Map();

    // Grafo de dependências: id -> [ids de workflows que ele depende]
    this.dependencies = new Map();

    // Grafo reverso: id -> [ids de workflows que dependem dele]
    this.dependents = new Map();
  }

  /**
   * Adiciona um workflow ao grafo
   * @param {object} workflow - Workflow completo do n8n
   */
  addWorkflow(workflow) {
    const id = workflow.id;
    const name = workflow.name;

    // Validação: Verifica IDs duplicados
    if (this.workflows.has(id)) {
      throw new Error(`Workflow com ID duplicado: ${id} (nome: ${name})`);
    }

    // Validação: Verifica nomes duplicados
    if (this.nameToId.has(name)) {
      const existingId = this.nameToId.get(name);
      if (existingId !== id) {
        throw new Error(
          `Workflow com nome duplicado: "${name}" (IDs: ${existingId}, ${id})`
        );
      }
    }

    this.workflows.set(id, workflow);
    this.nameToId.set(name, id);

    // Inicializa arrays de dependências
    if (!this.dependencies.has(id)) {
      this.dependencies.set(id, []);
    }
    if (!this.dependents.has(id)) {
      this.dependents.set(id, []);
    }
  }

  /**
   * Adiciona uma dependência entre workflows
   * @param {string} fromId - ID do workflow que depende
   * @param {string} toId - ID do workflow dependido
   */
  addDependency(fromId, toId) {
    // Adiciona dependência
    if (!this.dependencies.has(fromId)) {
      this.dependencies.set(fromId, []);
    }
    if (!this.dependencies.get(fromId).includes(toId)) {
      this.dependencies.get(fromId).push(toId);
    }

    // Adiciona ao grafo reverso
    if (!this.dependents.has(toId)) {
      this.dependents.set(toId, []);
    }
    if (!this.dependents.get(toId).includes(fromId)) {
      this.dependents.get(toId).push(fromId);
    }
  }

  /**
   * Busca ID de workflow por nome
   * @param {string} name - Nome do workflow
   * @returns {string|null} ID do workflow ou null
   */
  getIdByName(name) {
    return this.nameToId.get(name) || null;
  }

  /**
   * Busca workflow por ID
   * @param {string} id - ID do workflow
   * @returns {object|null} Workflow ou null
   */
  getWorkflow(id) {
    return this.workflows.get(id) || null;
  }

  /**
   * Retorna todas as dependências de um workflow
   * @param {string} id - ID do workflow
   * @returns {Array<string>} Array de IDs das dependências
   */
  getDependencies(id) {
    return this.dependencies.get(id) || [];
  }

  /**
   * Retorna todos os workflows que dependem de um workflow
   * @param {string} id - ID do workflow
   * @returns {Array<string>} Array de IDs dos dependentes
   */
  getDependents(id) {
    return this.dependents.get(id) || [];
  }

  /**
   * Realiza ordenação topológica usando algoritmo de Kahn
   * @returns {object} { order: Array<string>, cycles: Array<Array<string>> }
   */
  topologicalSort() {
    const order = [];
    const inDegree = new Map();
    const queue = [];

    // Calcula grau de entrada de cada nó
    for (const id of this.workflows.keys()) {
      inDegree.set(id, this.getDependencies(id).length);

      // Adiciona workflows sem dependências na fila
      if (inDegree.get(id) === 0) {
        queue.push(id);
      }
    }

    // Processa fila
    while (queue.length > 0) {
      const current = queue.shift();
      order.push(current);

      // Reduz grau de entrada dos dependentes
      for (const dependent of this.getDependents(current)) {
        const newDegree = inDegree.get(dependent) - 1;
        inDegree.set(dependent, newDegree);

        if (newDegree === 0) {
          queue.push(dependent);
        }
      }
    }

    // Detecta ciclos: nós que não foram processados
    const unprocessed = [];
    for (const [id, degree] of inDegree.entries()) {
      if (degree > 0) {
        unprocessed.push(id);
      }
    }

    return {
      order,
      cycles: unprocessed.length > 0 ? [unprocessed] : [],
      hasValidOrder: unprocessed.length === 0
    };
  }

  /**
   * Retorna estatísticas do grafo
   * @returns {object} Estatísticas
   */
  getStatistics() {
    let totalDependencies = 0;
    let maxDependencies = 0;
    let workflowsWithoutDependencies = 0;

    for (const deps of this.dependencies.values()) {
      totalDependencies += deps.length;
      maxDependencies = Math.max(maxDependencies, deps.length);
      if (deps.length === 0) {
        workflowsWithoutDependencies++;
      }
    }

    return {
      totalWorkflows: this.workflows.size,
      totalDependencies,
      avgDependencies: this.workflows.size > 0
        ? (totalDependencies / this.workflows.size).toFixed(2)
        : 0,
      maxDependencies,
      workflowsWithoutDependencies
    };
  }

  /**
   * Exporta grafo para visualização
   * @returns {object} Estrutura para debugging
   */
  toJSON() {
    const nodes = [];
    const edges = [];

    for (const [id, workflow] of this.workflows.entries()) {
      nodes.push({
        id,
        name: workflow.name,
        dependencies: this.getDependencies(id).length,
        dependents: this.getDependents(id).length
      });

      for (const depId of this.getDependencies(id)) {
        const depWorkflow = this.getWorkflow(depId);
        edges.push({
          from: workflow.name,
          to: depWorkflow ? depWorkflow.name : depId,
          fromId: id,
          toId: depId
        });
      }
    }

    return { nodes, edges, statistics: this.getStatistics() };
  }
}

module.exports = WorkflowGraph;
