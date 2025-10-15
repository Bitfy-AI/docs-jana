/**
 * IntegrityValidator - Plugin de validação de integridade de workflows n8n
 *
 * Valida workflows antes da transferência para garantir integridade estrutural,
 * verificando nodes, connections, credenciais e detectando problemas como nodes
 * órfãos e dependências circulares.
 *
 * @module n8n-transfer/plugins/validators/integrity-validator
 * @author docs-jana
 * @version 1.0.0
 */

const { BasePlugin } = require('../index');

/**
 * Validador de integridade de workflows
 *
 * Realiza validações abrangentes de estrutura e integridade de workflows n8n,
 * incluindo:
 * - Presença de pelo menos 1 node
 * - Validação de connections (IDs de nodes válidos)
 * - Verificação de credenciais em nodes que as requerem
 * - Detecção de nodes órfãos (não conectados)
 * - Detecção de dependências circulares em connections
 *
 * @class IntegrityValidator
 * @extends BasePlugin
 *
 * @example
 * const { IntegrityValidator } = require('./validators/integrity-validator');
 *
 * const validator = new IntegrityValidator();
 * const workflow = {
 *   name: 'My Workflow',
 *   nodes: [
 *     { id: 'node1', name: 'Start', type: 'n8n-nodes-base.start', credentials: {} },
 *     { id: 'node2', name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest', credentials: { httpApi: { id: '1' } } }
 *   ],
 *   connections: {
 *     node1: {
 *       main: [[{ node: 'node2', type: 'main', index: 0 }]]
 *     }
 *   }
 * };
 *
 * const result = validator.validate(workflow);
 * if (result.valid) {
 *   console.log('Workflow válido!');
 * } else {
 *   console.error('Erros encontrados:', result.errors);
 * }
 *
 * @example
 * // Workflow inválido com node órfão
 * const invalidWorkflow = {
 *   name: 'Invalid Workflow',
 *   nodes: [
 *     { id: 'node1', name: 'Start', type: 'n8n-nodes-base.start' },
 *     { id: 'node2', name: 'Isolated Node', type: 'n8n-nodes-base.set' } // órfão
 *   ],
 *   connections: {} // sem connections
 * };
 *
 * const result = validator.validate(invalidWorkflow);
 * console.log(result.valid); // false
 * console.log(result.warnings); // ['Node "Isolated Node" (node2) está órfão - não possui connections de entrada ou saída']
 */
class IntegrityValidator extends BasePlugin {
  /**
   * Cria uma nova instância do IntegrityValidator
   *
   * @example
   * const validator = new IntegrityValidator();
   * console.log(validator.getName()); // 'integrity-validator'
   * console.log(validator.getType()); // 'validator'
   */
  constructor() {
    super('integrity-validator', '1.0.0', 'validator');
    this.setDescription('Valida integridade estrutural de workflows n8n (nodes, connections, credenciais, nodes órfãos, dependências circulares)');

    // Validar que o método validate está implementado
    this.validateImplementation(['validate']);
  }

  /**
   * Valida a integridade de um workflow n8n
   *
   * Executa todas as validações de integridade e retorna resultado estruturado
   * com erros, warnings e metadata.
   *
   * @param {Object} workflow - Workflow a ser validado
   * @param {string} workflow.name - Nome do workflow
   * @param {Array<Object>} workflow.nodes - Array de nodes do workflow
   * @param {Object} workflow.connections - Objeto de connections entre nodes
   * @param {Object} [workflow.settings] - Configurações do workflow
   * @param {Array<Object>} [workflow.tags] - Tags associadas ao workflow
   *
   * @returns {ValidationResult} Resultado da validação
   *
   * @example
   * const result = validator.validate(workflow);
   * console.log(result);
   * // {
   * //   valid: true,
   * //   errors: [],
   * //   warnings: ['Node "Disabled Node" (node3) está desabilitado'],
   * //   metadata: {
   * //     workflowName: 'My Workflow',
   * //     nodeCount: 3,
   * //     connectionCount: 2,
   * //     credentialNodeCount: 1,
   * //     orphanedNodeCount: 0,
   * //     circularDependencies: false,
   * //     validatedAt: '2025-01-15T10:30:00.000Z'
   * //   }
   * // }
   */
  validate(workflow) {
    const errors = [];
    const warnings = [];
    const metadata = {
      workflowName: workflow.name || 'Unnamed Workflow',
      nodeCount: workflow.nodes?.length || 0,
      connectionCount: 0,
      credentialNodeCount: 0,
      orphanedNodeCount: 0,
      circularDependencies: false,
      validatedAt: new Date().toISOString()
    };

    // Validação 1: Workflow tem pelo menos 1 node
    if (!this._validateHasNodes(workflow, errors)) {
      // Se não há nodes, não faz sentido validar connections
      return {
        valid: errors.length === 0,
        errors,
        warnings,
        metadata
      };
    }

    // Validação 2: Todas as connections referenciam node IDs válidos
    const connectionCount = this._validateConnections(workflow, errors, warnings);
    metadata.connectionCount = connectionCount;

    // Validação 3: Nodes com credenciais têm dados de credenciais
    const credentialNodeCount = this._validateCredentials(workflow, errors, warnings);
    metadata.credentialNodeCount = credentialNodeCount;

    // Validação 4: Detectar nodes órfãos (não conectados)
    const orphanedNodeCount = this._detectOrphanedNodes(workflow, warnings);
    metadata.orphanedNodeCount = orphanedNodeCount;

    // Validação 5: Detectar dependências circulares
    const hasCircularDeps = this._detectCircularDependencies(workflow, errors);
    metadata.circularDependencies = hasCircularDeps;

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metadata
    };
  }

  /**
   * Valida se o workflow possui pelo menos 1 node
   *
   * @private
   * @param {Object} workflow - Workflow a validar
   * @param {string[]} errors - Array de erros (modificado in-place)
   * @returns {boolean} true se possui nodes, false caso contrário
   *
   * @example
   * const errors = [];
   * const hasNodes = validator._validateHasNodes({ nodes: [] }, errors);
   * console.log(hasNodes); // false
   * console.log(errors); // ['Workflow não possui nodes - é necessário pelo menos 1 node']
   */
  _validateHasNodes(workflow, errors) {
    if (!workflow.nodes || !Array.isArray(workflow.nodes) || workflow.nodes.length === 0) {
      errors.push('Workflow não possui nodes - é necessário pelo menos 1 node');
      return false;
    }
    return true;
  }

  /**
   * Valida que todas as connections referenciam node IDs válidos
   *
   * Verifica se todos os node IDs nas connections existem na lista de nodes
   * do workflow. Detecta connections órfãs e inválidas.
   *
   * @private
   * @param {Object} workflow - Workflow a validar
   * @param {string[]} errors - Array de erros (modificado in-place)
   * @param {string[]} warnings - Array de warnings (modificado in-place)
   * @returns {number} Quantidade de connections válidas encontradas
   *
   * @example
   * const errors = [];
   * const warnings = [];
   * const workflow = {
   *   nodes: [
   *     { id: 'node1', name: 'Start' },
   *     { id: 'node2', name: 'End' }
   *   ],
   *   connections: {
   *     node1: {
   *       main: [[{ node: 'node2', type: 'main', index: 0 }]]
   *     },
   *     node3: { // ID inválido
   *       main: [[{ node: 'node2', type: 'main', index: 0 }]]
   *     }
   *   }
   * };
   * const count = validator._validateConnections(workflow, errors, warnings);
   * console.log(count); // 1
   * console.log(errors); // ['Connection de source node "node3" referencia node inexistente']
   */
  _validateConnections(workflow, errors, warnings) {
    if (!workflow.connections || typeof workflow.connections !== 'object') {
      warnings.push('Workflow não possui connections definidas');
      return 0;
    }

    // Criar Set de IDs válidos para lookup O(1)
    const validNodeIds = new Set(workflow.nodes.map(node => node.id));
    let connectionCount = 0;

    // Iterar por cada source node nas connections
    for (const [sourceNodeId, connectionTypes] of Object.entries(workflow.connections)) {
      // Validar que source node ID existe
      if (!validNodeIds.has(sourceNodeId)) {
        errors.push(`Connection de source node "${sourceNodeId}" referencia node inexistente`);
        continue;
      }

      // Validar connections de cada tipo (main, ai, etc.)
      for (const [connectionType, connectionArrays] of Object.entries(connectionTypes)) {
        if (!Array.isArray(connectionArrays)) {
          warnings.push(`Connection type "${connectionType}" em node "${sourceNodeId}" não é um array`);
          continue;
        }

        // Cada connectionType pode ter múltiplos arrays de connections (outputs múltiplos)
        for (let outputIndex = 0; outputIndex < connectionArrays.length; outputIndex++) {
          const connectionsForOutput = connectionArrays[outputIndex];

          if (!Array.isArray(connectionsForOutput)) {
            warnings.push(`Connection output ${outputIndex} em node "${sourceNodeId}" não é um array`);
            continue;
          }

          // Validar cada connection individual
          for (const connection of connectionsForOutput) {
            if (!connection || typeof connection !== 'object') {
              warnings.push(`Connection inválida (não é objeto) em node "${sourceNodeId}"`);
              continue;
            }

            // Validar que target node ID existe
            if (!connection.node) {
              errors.push(`Connection em node "${sourceNodeId}" não possui propriedade "node" (target node ID)`);
              continue;
            }

            if (!validNodeIds.has(connection.node)) {
              errors.push(`Connection de node "${sourceNodeId}" para "${connection.node}" referencia target node inexistente`);
              continue;
            }

            connectionCount++;
          }
        }
      }
    }

    return connectionCount;
  }

  /**
   * Valida que nodes com credenciais possuem dados de credenciais
   *
   * Verifica se nodes que requerem credenciais (geralmente nodes de API, HTTP, etc.)
   * possuem a propriedade credentials definida e não vazia.
   *
   * @private
   * @param {Object} workflow - Workflow a validar
   * @param {string[]} errors - Array de erros (modificado in-place)
   * @param {string[]} warnings - Array de warnings (modificado in-place)
   * @returns {number} Quantidade de nodes com credenciais encontrados
   *
   * @example
   * const errors = [];
   * const warnings = [];
   * const workflow = {
   *   nodes: [
   *     { id: 'node1', name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest', credentials: {} },
   *     { id: 'node2', name: 'API Call', type: 'n8n-nodes-base.api', credentials: { apiAuth: { id: '1' } } }
   *   ]
   * };
   * const count = validator._validateCredentials(workflow, errors, warnings);
   * console.log(count); // 1
   * console.log(warnings); // ['Node "HTTP Request" (node1) possui propriedade credentials vazia']
   */
  _validateCredentials(workflow, errors, warnings) {
    let credentialNodeCount = 0;

    for (const node of workflow.nodes) {
      // Verificar se node possui propriedade credentials
      if (node.credentials && typeof node.credentials === 'object') {
        const credentialKeys = Object.keys(node.credentials);

        if (credentialKeys.length === 0) {
          warnings.push(`Node "${node.name}" (${node.id}) possui propriedade credentials vazia`);
        } else {
          credentialNodeCount++;

          // Validar que cada credential tem estrutura válida
          for (const [credType, credData] of Object.entries(node.credentials)) {
            if (!credData || typeof credData !== 'object') {
              warnings.push(`Node "${node.name}" (${node.id}) possui credential "${credType}" inválida (não é objeto)`);
              continue;
            }

            // Validação básica: credential deve ter ID ou name
            if (!credData.id && !credData.name) {
              warnings.push(`Node "${node.name}" (${node.id}) possui credential "${credType}" sem ID ou nome`);
            }
          }
        }
      }

      // Verificar se node está desabilitado (warning, não erro)
      if (node.disabled === true) {
        warnings.push(`Node "${node.name}" (${node.id}) está desabilitado`);
      }
    }

    return credentialNodeCount;
  }

  /**
   * Detecta nodes órfãos (não conectados)
   *
   * Identifica nodes que não possuem nenhuma connection de entrada ou saída.
   * Nodes órfãos podem indicar workflows incompletos ou mal configurados.
   *
   * @private
   * @param {Object} workflow - Workflow a validar
   * @param {string[]} warnings - Array de warnings (modificado in-place)
   * @returns {number} Quantidade de nodes órfãos encontrados
   *
   * @example
   * const warnings = [];
   * const workflow = {
   *   nodes: [
   *     { id: 'node1', name: 'Start' },
   *     { id: 'node2', name: 'Isolated' }, // órfão
   *     { id: 'node3', name: 'End' }
   *   ],
   *   connections: {
   *     node1: {
   *       main: [[{ node: 'node3' }]]
   *     }
   *   }
   * };
   * const orphanCount = validator._detectOrphanedNodes(workflow, warnings);
   * console.log(orphanCount); // 1
   * console.log(warnings); // ['Node "Isolated" (node2) está órfão - não possui connections de entrada ou saída']
   */
  _detectOrphanedNodes(workflow, warnings) {
    if (!workflow.connections || Object.keys(workflow.connections).length === 0) {
      // Se não há connections, todos os nodes são órfãos (exceto se houver apenas 1 node)
      if (workflow.nodes.length > 1) {
        warnings.push(`Workflow possui ${workflow.nodes.length} nodes mas nenhuma connection - todos os nodes estão órfãos`);
        return workflow.nodes.length;
      }
      return 0;
    }

    // Criar Sets de nodes com connections de entrada e saída
    const nodesWithOutgoingConnections = new Set();
    const nodesWithIncomingConnections = new Set();

    for (const [sourceNodeId, connectionTypes] of Object.entries(workflow.connections)) {
      nodesWithOutgoingConnections.add(sourceNodeId);

      for (const connectionArrays of Object.values(connectionTypes)) {
        if (!Array.isArray(connectionArrays)) continue;

        for (const connectionsForOutput of connectionArrays) {
          if (!Array.isArray(connectionsForOutput)) continue;

          for (const connection of connectionsForOutput) {
            if (connection && connection.node) {
              nodesWithIncomingConnections.add(connection.node);
            }
          }
        }
      }
    }

    // Detectar nodes órfãos (sem entrada E sem saída)
    let orphanedCount = 0;
    for (const node of workflow.nodes) {
      const hasOutgoing = nodesWithOutgoingConnections.has(node.id);
      const hasIncoming = nodesWithIncomingConnections.has(node.id);

      if (!hasOutgoing && !hasIncoming) {
        warnings.push(`Node "${node.name}" (${node.id}) está órfão - não possui connections de entrada ou saída`);
        orphanedCount++;
      }
    }

    return orphanedCount;
  }

  /**
   * Detecta dependências circulares em connections
   *
   * Utiliza algoritmo DFS (Depth-First Search) para detectar ciclos no grafo
   * de connections. Dependências circulares podem causar loops infinitos em
   * execução de workflows.
   *
   * @private
   * @param {Object} workflow - Workflow a validar
   * @param {string[]} errors - Array de erros (modificado in-place)
   * @returns {boolean} true se há dependências circulares, false caso contrário
   *
   * @example
   * const errors = [];
   * const workflow = {
   *   nodes: [
   *     { id: 'node1', name: 'A' },
   *     { id: 'node2', name: 'B' },
   *     { id: 'node3', name: 'C' }
   *   ],
   *   connections: {
   *     node1: { main: [[{ node: 'node2' }]] },
   *     node2: { main: [[{ node: 'node3' }]] },
   *     node3: { main: [[{ node: 'node1' }]] } // ciclo: node1 -> node2 -> node3 -> node1
   *   }
   * };
   * const hasCircular = validator._detectCircularDependencies(workflow, errors);
   * console.log(hasCircular); // true
   * console.log(errors); // ['Dependência circular detectada: node1 -> node2 -> node3 -> node1']
   */
  _detectCircularDependencies(workflow, errors) {
    if (!workflow.connections || Object.keys(workflow.connections).length === 0) {
      return false;
    }

    // Construir grafo de adjacências
    const graph = this._buildConnectionGraph(workflow);

    // DFS com detecção de ciclos
    const visited = new Set();
    const recursionStack = new Set();
    const nodeMap = new Map(workflow.nodes.map(node => [node.id, node]));

    /**
     * DFS recursivo para detectar ciclos
     *
     * @param {string} nodeId - ID do node atual
     * @param {string[]} path - Caminho percorrido até o momento
     * @returns {boolean} true se encontrou ciclo
     */
    const dfs = (nodeId, path) => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const neighbors = graph.get(nodeId) || [];
      for (const neighborId of neighbors) {
        if (!visited.has(neighborId)) {
          if (dfs(neighborId, [...path])) {
            return true;
          }
        } else if (recursionStack.has(neighborId)) {
          // Ciclo detectado!
          const cycleStartIndex = path.indexOf(neighborId);
          const cyclePath = path.slice(cycleStartIndex);
          cyclePath.push(neighborId); // completar o ciclo

          // Construir mensagem com nomes de nodes
          const cycleNames = cyclePath.map(id => {
            const node = nodeMap.get(id);
            return node ? `"${node.name}" (${id})` : id;
          });

          errors.push(`Dependência circular detectada: ${cycleNames.join(' -> ')}`);
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    // Executar DFS a partir de cada node não visitado
    for (const node of workflow.nodes) {
      if (!visited.has(node.id)) {
        if (dfs(node.id, [])) {
          return true; // Encontrou ciclo
        }
      }
    }

    return false;
  }

  /**
   * Constrói grafo de adjacências a partir das connections
   *
   * @private
   * @param {Object} workflow - Workflow
   * @returns {Map<string, string[]>} Grafo representado como Map (nodeId -> [targetNodeIds])
   *
   * @example
   * const graph = validator._buildConnectionGraph(workflow);
   * console.log(graph.get('node1')); // ['node2', 'node3']
   */
  _buildConnectionGraph(workflow) {
    const graph = new Map();

    for (const [sourceNodeId, connectionTypes] of Object.entries(workflow.connections)) {
      if (!graph.has(sourceNodeId)) {
        graph.set(sourceNodeId, []);
      }

      for (const connectionArrays of Object.values(connectionTypes)) {
        if (!Array.isArray(connectionArrays)) continue;

        for (const connectionsForOutput of connectionArrays) {
          if (!Array.isArray(connectionsForOutput)) continue;

          for (const connection of connectionsForOutput) {
            if (connection && connection.node) {
              graph.get(sourceNodeId).push(connection.node);
            }
          }
        }
      }
    }

    return graph;
  }
}

module.exports = IntegrityValidator;
