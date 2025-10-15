/**
 * Plugin System for n8n-transfer
 *
 * Este módulo define as interfaces e classes base para o sistema de plugins
 * do n8n-transfer, permitindo extensibilidade através de deduplicadores,
 * validadores e geradores de relatórios customizados.
 *
 * @module n8n-transfer/plugins
 * @author docs-jana
 * @version 1.0.0
 */

// ============================================================================
// Type Definitions (TypeScript/JSDoc)
// ============================================================================

/**
 * Resultado de validação retornado por validadores
 *
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Indica se a validação passou
 * @property {string[]} [errors] - Lista de erros de validação (se houver)
 * @property {string[]} [warnings] - Lista de avisos (não bloqueiam execução)
 * @property {Object} [metadata] - Metadados adicionais sobre a validação
 */

/**
 * Contexto de transferência passado para plugins
 *
 * @typedef {Object} TransferContext
 * @property {Object[]} workflows - Lista de workflows sendo transferidos
 * @property {Object} config - Configuração da transferência
 * @property {Object} stats - Estatísticas da operação
 * @property {string} sourceUrl - URL do servidor de origem
 * @property {string} targetUrl - URL do servidor de destino
 */

/**
 * Resultado de uma operação de transferência
 *
 * @typedef {Object} TransferResult
 * @property {boolean} success - Indica se a transferência foi bem-sucedida
 * @property {number} totalWorkflows - Total de workflows processados
 * @property {number} successCount - Quantidade de workflows transferidos com sucesso
 * @property {number} failureCount - Quantidade de falhas
 * @property {number} duplicateCount - Quantidade de duplicatas encontradas
 * @property {Object[]} errors - Lista de erros que ocorreram
 * @property {Object} metadata - Metadados adicionais da transferência
 * @property {Date} startTime - Timestamp de início
 * @property {Date} endTime - Timestamp de conclusão
 */

// ============================================================================
// Base Plugin Interface
// ============================================================================

/**
 * Interface base para todos os plugins do n8n-transfer
 *
 * @interface Plugin
 * @property {string} name - Nome único do plugin
 * @property {string} version - Versão do plugin (semver format)
 * @property {'deduplicator'|'validator'|'reporter'} type - Tipo do plugin
 * @property {boolean} enabled - Se o plugin está habilitado
 * @property {string} [description] - Descrição do que o plugin faz
 * @property {Object} [options] - Opções de configuração do plugin
 *
 * @example
 * const plugin = {
 *   name: 'custom-deduplicator',
 *   version: '1.0.0',
 *   type: 'deduplicator',
 *   enabled: true,
 *   description: 'Identifica workflows duplicados por nome e tags'
 * };
 */

/**
 * @typedef {Object} Plugin
 * @property {string} name
 * @property {string} version
 * @property {'deduplicator'|'validator'|'reporter'} type
 * @property {boolean} enabled
 * @property {string} [description]
 * @property {Object} [options]
 */

// ============================================================================
// Deduplicator Plugin Interface
// ============================================================================

/**
 * Interface para plugins de deduplicação
 *
 * Plugins deste tipo são responsáveis por identificar workflows duplicados
 * antes da transferência, evitando re-uploads desnecessários.
 *
 * @interface Deduplicator
 * @extends Plugin
 * @property {'deduplicator'} type - Tipo fixo 'deduplicator'
 * @property {Function} isDuplicate - Método que verifica se um workflow é duplicata
 *
 * @example
 * // Implementação de um deduplicador por nome
 * class NameBasedDeduplicator extends BasePlugin {
 *   constructor() {
 *     super('name-deduplicator', '1.0.0', 'deduplicator');
 *   }
 *
 *   isDuplicate(workflow, existingWorkflows) {
 *     return existingWorkflows.some(existing =>
 *       existing.name === workflow.name
 *     );
 *   }
 * }
 *
 * @example
 * // Implementação de um deduplicador por ID e nome
 * class IdNameDeduplicator extends BasePlugin {
 *   constructor() {
 *     super('id-name-deduplicator', '1.0.0', 'deduplicator');
 *   }
 *
 *   isDuplicate(workflow, existingWorkflows) {
 *     return existingWorkflows.some(existing =>
 *       existing.id === workflow.id ||
 *       (existing.name === workflow.name && existing.nodes.length === workflow.nodes.length)
 *     );
 *   }
 * }
 */

/**
 * @typedef {Object} Deduplicator
 * @property {string} name
 * @property {string} version
 * @property {'deduplicator'} type
 * @property {boolean} enabled
 * @property {isDuplicateFunction} isDuplicate
 */

/**
 * Função que verifica se um workflow é duplicata
 *
 * @callback isDuplicateFunction
 * @param {Object} workflow - Workflow a ser verificado
 * @param {Object[]} existingWorkflows - Lista de workflows já existentes no destino
 * @returns {boolean} - true se o workflow é duplicata, false caso contrário
 *
 * @example
 * function isDuplicate(workflow, existingWorkflows) {
 *   // Verifica duplicata por nome e hash de conteúdo
 *   const workflowHash = generateHash(workflow.nodes);
 *   return existingWorkflows.some(existing => {
 *     const existingHash = generateHash(existing.nodes);
 *     return existing.name === workflow.name && existingHash === workflowHash;
 *   });
 * }
 */

// ============================================================================
// Validator Plugin Interface
// ============================================================================

/**
 * Interface para plugins de validação
 *
 * Plugins deste tipo validam workflows antes da transferência,
 * garantindo integridade e conformidade com regras de negócio.
 *
 * @interface Validator
 * @extends Plugin
 * @property {'validator'} type - Tipo fixo 'validator'
 * @property {Function} validate - Método que valida um workflow
 *
 * @example
 * // Validador que verifica se workflow tem nodes
 * class NodesValidator extends BasePlugin {
 *   constructor() {
 *     super('nodes-validator', '1.0.0', 'validator');
 *   }
 *
 *   validate(workflow) {
 *     if (!workflow.nodes || workflow.nodes.length === 0) {
 *       return {
 *         valid: false,
 *         errors: ['Workflow não possui nodes'],
 *         warnings: []
 *       };
 *     }
 *     return { valid: true, errors: [], warnings: [] };
 *   }
 * }
 *
 * @example
 * // Validador que verifica credenciais
 * class CredentialsValidator extends BasePlugin {
 *   constructor() {
 *     super('credentials-validator', '1.0.0', 'validator');
 *   }
 *
 *   validate(workflow) {
 *     const warnings = [];
 *     const errors = [];
 *
 *     workflow.nodes.forEach(node => {
 *       if (node.credentials && Object.keys(node.credentials).length === 0) {
 *         warnings.push(`Node ${node.name} possui credenciais vazias`);
 *       }
 *       if (node.disabled) {
 *         warnings.push(`Node ${node.name} está desabilitado`);
 *       }
 *     });
 *
 *     return {
 *       valid: errors.length === 0,
 *       errors,
 *       warnings,
 *       metadata: {
 *         nodesChecked: workflow.nodes.length
 *       }
 *     };
 *   }
 * }
 */

/**
 * @typedef {Object} Validator
 * @property {string} name
 * @property {string} version
 * @property {'validator'} type
 * @property {boolean} enabled
 * @property {validateFunction} validate
 */

/**
 * Função que valida um workflow
 *
 * @callback validateFunction
 * @param {Object} workflow - Workflow a ser validado
 * @returns {ValidationResult} - Resultado da validação
 *
 * @example
 * function validate(workflow) {
 *   const errors = [];
 *   const warnings = [];
 *
 *   // Validação obrigatória: nome não vazio
 *   if (!workflow.name || workflow.name.trim() === '') {
 *     errors.push('Nome do workflow é obrigatório');
 *   }
 *
 *   // Validação de aviso: tags recomendadas
 *   if (!workflow.tags || workflow.tags.length === 0) {
 *     warnings.push('Workflow sem tags - recomenda-se adicionar tags para organização');
 *   }
 *
 *   return {
 *     valid: errors.length === 0,
 *     errors,
 *     warnings,
 *     metadata: {
 *       workflowName: workflow.name,
 *       nodeCount: workflow.nodes?.length || 0
 *     }
 *   };
 * }
 */

// ============================================================================
// Reporter Plugin Interface
// ============================================================================

/**
 * Interface para plugins de geração de relatórios
 *
 * Plugins deste tipo geram relatórios customizados após a transferência,
 * permitindo análise e documentação dos resultados.
 *
 * @interface Reporter
 * @extends Plugin
 * @property {'reporter'} type - Tipo fixo 'reporter'
 * @property {Function} generate - Método que gera o relatório
 *
 * @example
 * // Reporter simples em formato texto
 * class TextReporter extends BasePlugin {
 *   constructor() {
 *     super('text-reporter', '1.0.0', 'reporter');
 *   }
 *
 *   generate(transferResult) {
 *     const lines = [
 *       '=== Relatório de Transferência n8n ===',
 *       `Data: ${new Date().toISOString()}`,
 *       `Total: ${transferResult.totalWorkflows} workflows`,
 *       `Sucesso: ${transferResult.successCount}`,
 *       `Falhas: ${transferResult.failureCount}`,
 *       `Duplicatas: ${transferResult.duplicateCount}`,
 *       '======================================'
 *     ];
 *     return lines.join('\n');
 *   }
 * }
 *
 * @example
 * // Reporter em formato JSON
 * class JsonReporter extends BasePlugin {
 *   constructor() {
 *     super('json-reporter', '1.0.0', 'reporter');
 *   }
 *
 *   generate(transferResult) {
 *     return JSON.stringify({
 *       timestamp: new Date().toISOString(),
 *       summary: {
 *         total: transferResult.totalWorkflows,
 *         success: transferResult.successCount,
 *         failure: transferResult.failureCount,
 *         duplicates: transferResult.duplicateCount
 *       },
 *       duration: transferResult.endTime - transferResult.startTime,
 *       errors: transferResult.errors.map(e => ({
 *         workflow: e.workflowName,
 *         message: e.message
 *       }))
 *     }, null, 2);
 *   }
 * }
 *
 * @example
 * // Reporter em formato Markdown
 * class MarkdownReporter extends BasePlugin {
 *   constructor() {
 *     super('markdown-reporter', '1.0.0', 'reporter');
 *   }
 *
 *   generate(transferResult) {
 *     const duration = transferResult.endTime - transferResult.startTime;
 *     const successRate = (transferResult.successCount / transferResult.totalWorkflows * 100).toFixed(2);
 *
 *     return `
 * # Relatório de Transferência n8n
 *
 * **Data:** ${new Date().toISOString()}
 * **Duração:** ${duration}ms
 *
 * ## Resumo
 *
 * - Total de workflows: ${transferResult.totalWorkflows}
 * - Transferidos com sucesso: ${transferResult.successCount} (${successRate}%)
 * - Falhas: ${transferResult.failureCount}
 * - Duplicatas ignoradas: ${transferResult.duplicateCount}
 *
 * ## Detalhes
 *
 * ${transferResult.errors.length > 0 ? '### Erros\n\n' + transferResult.errors.map((e, i) =>
 *   `${i + 1}. **${e.workflowName}**: ${e.message}`
 * ).join('\n') : 'Nenhum erro encontrado.'}
 *     `.trim();
 *   }
 * }
 */

/**
 * @typedef {Object} Reporter
 * @property {string} name
 * @property {string} version
 * @property {'reporter'} type
 * @property {boolean} enabled
 * @property {generateFunction} generate
 */

/**
 * Função que gera relatório
 *
 * @callback generateFunction
 * @param {TransferResult} transferResult - Resultado da transferência
 * @returns {string} - Relatório gerado (formato definido pelo plugin)
 *
 * @example
 * function generate(transferResult) {
 *   // Gera relatório CSV
 *   const headers = ['Workflow', 'Status', 'Erro'];
 *   const rows = transferResult.errors.map(e => [
 *     e.workflowName,
 *     'FALHA',
 *     e.message
 *   ]);
 *
 *   return [
 *     headers.join(','),
 *     ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
 *   ].join('\n');
 * }
 */

// ============================================================================
// BasePlugin Class
// ============================================================================

/**
 * Classe base para implementação de plugins
 *
 * Fornece funcionalidades comuns para todos os tipos de plugins,
 * incluindo gerenciamento de estado (enabled/disabled), versionamento
 * e métodos auxiliares.
 *
 * @class BasePlugin
 * @implements {Plugin}
 *
 * @example
 * // Criar plugin customizado estendendo BasePlugin
 * class CustomValidator extends BasePlugin {
 *   constructor() {
 *     super('custom-validator', '2.0.0', 'validator');
 *     this.options = {
 *       strictMode: true,
 *       maxNodes: 100
 *     };
 *   }
 *
 *   validate(workflow) {
 *     const errors = [];
 *
 *     if (this.options.strictMode && workflow.nodes.length > this.options.maxNodes) {
 *       errors.push(`Workflow possui ${workflow.nodes.length} nodes, máximo permitido: ${this.options.maxNodes}`);
 *     }
 *
 *     return {
 *       valid: errors.length === 0,
 *       errors,
 *       warnings: []
 *     };
 *   }
 * }
 *
 * const validator = new CustomValidator();
 * console.log(validator.getName()); // 'custom-validator'
 * console.log(validator.getVersion()); // '2.0.0'
 * console.log(validator.isEnabled()); // true
 */
class BasePlugin {
  /**
   * Cria uma nova instância de plugin
   *
   * @param {string} name - Nome único do plugin
   * @param {string} version - Versão do plugin (formato semver: X.Y.Z)
   * @param {'deduplicator'|'validator'|'reporter'} type - Tipo do plugin
   * @param {Object} [options={}] - Opções de configuração do plugin
   *
   * @throws {Error} Se name ou version não forem fornecidos
   * @throws {Error} Se type não for um dos tipos válidos
   *
   * @example
   * const plugin = new BasePlugin('my-plugin', '1.0.0', 'validator');
   *
   * @example
   * const pluginWithOptions = new BasePlugin('my-plugin', '1.0.0', 'deduplicator', {
   *   ignoreCase: true,
   *   compareFields: ['name', 'id']
   * });
   */
  constructor(name, version, type, options = {}) {
    if (!name || typeof name !== 'string') {
      throw new Error('Plugin name é obrigatório e deve ser uma string');
    }

    if (!version || typeof version !== 'string') {
      throw new Error('Plugin version é obrigatória e deve ser uma string');
    }

    const validTypes = ['deduplicator', 'validator', 'reporter'];
    if (!validTypes.includes(type)) {
      throw new Error(`Plugin type deve ser um de: ${validTypes.join(', ')}`);
    }

    this.name = name;
    this.version = version;
    this.type = type;
    this.enabled = true;
    this.options = options;
    this.description = '';
  }

  /**
   * Obtém o nome do plugin
   *
   * @returns {string} Nome do plugin
   *
   * @example
   * const plugin = new BasePlugin('my-validator', '1.0.0', 'validator');
   * console.log(plugin.getName()); // 'my-validator'
   */
  getName() {
    return this.name;
  }

  /**
   * Obtém a versão do plugin
   *
   * @returns {string} Versão do plugin
   *
   * @example
   * const plugin = new BasePlugin('my-validator', '2.1.3', 'validator');
   * console.log(plugin.getVersion()); // '2.1.3'
   */
  getVersion() {
    return this.version;
  }

  /**
   * Obtém o tipo do plugin
   *
   * @returns {'deduplicator'|'validator'|'reporter'} Tipo do plugin
   *
   * @example
   * const plugin = new BasePlugin('my-plugin', '1.0.0', 'reporter');
   * console.log(plugin.getType()); // 'reporter'
   */
  getType() {
    return this.type;
  }

  /**
   * Verifica se o plugin está habilitado
   *
   * @returns {boolean} true se habilitado, false caso contrário
   *
   * @example
   * const plugin = new BasePlugin('my-plugin', '1.0.0', 'validator');
   * console.log(plugin.isEnabled()); // true (habilitado por padrão)
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Habilita o plugin
   *
   * @returns {BasePlugin} Retorna this para permitir chaining
   *
   * @example
   * const plugin = new BasePlugin('my-plugin', '1.0.0', 'validator');
   * plugin.disable().enable();
   * console.log(plugin.isEnabled()); // true
   */
  enable() {
    this.enabled = true;
    return this;
  }

  /**
   * Desabilita o plugin
   *
   * Plugins desabilitados não são executados durante a transferência.
   *
   * @returns {BasePlugin} Retorna this para permitir chaining
   *
   * @example
   * const plugin = new BasePlugin('my-plugin', '1.0.0', 'validator');
   * plugin.disable();
   * console.log(plugin.isEnabled()); // false
   */
  disable() {
    this.enabled = false;
    return this;
  }

  /**
   * Define opções de configuração do plugin
   *
   * @param {Object} options - Objeto com opções de configuração
   * @returns {BasePlugin} Retorna this para permitir chaining
   *
   * @example
   * const plugin = new BasePlugin('my-plugin', '1.0.0', 'validator');
   * plugin.setOptions({ strictMode: true, maxErrors: 10 });
   */
  setOptions(options) {
    this.options = { ...this.options, ...options };
    return this;
  }

  /**
   * Obtém uma opção de configuração específica
   *
   * @param {string} key - Chave da opção
   * @param {*} [defaultValue] - Valor padrão se a opção não existir
   * @returns {*} Valor da opção ou defaultValue
   *
   * @example
   * const plugin = new BasePlugin('my-plugin', '1.0.0', 'validator', {
   *   maxNodes: 50
   * });
   * console.log(plugin.getOption('maxNodes')); // 50
   * console.log(plugin.getOption('minNodes', 1)); // 1 (default)
   */
  getOption(key, defaultValue = null) {
    return this.options[key] !== undefined ? this.options[key] : defaultValue;
  }

  /**
   * Define a descrição do plugin
   *
   * @param {string} description - Descrição do plugin
   * @returns {BasePlugin} Retorna this para permitir chaining
   *
   * @example
   * const plugin = new BasePlugin('my-plugin', '1.0.0', 'validator');
   * plugin.setDescription('Valida workflows quanto a nodes obrigatórios');
   */
  setDescription(description) {
    this.description = description;
    return this;
  }

  /**
   * Obtém a descrição do plugin
   *
   * @returns {string} Descrição do plugin
   *
   * @example
   * const plugin = new BasePlugin('my-plugin', '1.0.0', 'validator');
   * plugin.setDescription('Validador customizado');
   * console.log(plugin.getDescription()); // 'Validador customizado'
   */
  getDescription() {
    return this.description;
  }

  /**
   * Retorna informações completas do plugin
   *
   * @returns {Object} Objeto com todas as propriedades do plugin
   *
   * @example
   * const plugin = new BasePlugin('my-plugin', '1.0.0', 'validator');
   * console.log(plugin.getInfo());
   * // {
   * //   name: 'my-plugin',
   * //   version: '1.0.0',
   * //   type: 'validator',
   * //   enabled: true,
   * //   description: '',
   * //   options: {}
   * // }
   */
  getInfo() {
    return {
      name: this.name,
      version: this.version,
      type: this.type,
      enabled: this.enabled,
      description: this.description,
      options: this.options
    };
  }

  /**
   * Valida se o plugin implementa os métodos necessários
   *
   * Método auxiliar para validação em runtime. Útil para garantir
   * que subclasses implementam os métodos específicos do tipo.
   *
   * @param {string[]} requiredMethods - Lista de métodos que devem existir
   * @throws {Error} Se algum método obrigatório não estiver implementado
   *
   * @example
   * class MyValidator extends BasePlugin {
   *   constructor() {
   *     super('my-validator', '1.0.0', 'validator');
   *     this.validateImplementation(['validate']);
   *   }
   *
   *   validate(workflow) {
   *     return { valid: true, errors: [], warnings: [] };
   *   }
   * }
   */
  validateImplementation(requiredMethods) {
    const missing = requiredMethods.filter(method =>
      typeof this[method] !== 'function'
    );

    if (missing.length > 0) {
      throw new Error(
        `Plugin ${this.name} (type: ${this.type}) deve implementar os métodos: ${missing.join(', ')}`
      );
    }
  }
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
  // Classes
  BasePlugin,

  // Type definitions are exported via JSDoc and available for IDE autocomplete
  // No need to export typedef objects in runtime
};
