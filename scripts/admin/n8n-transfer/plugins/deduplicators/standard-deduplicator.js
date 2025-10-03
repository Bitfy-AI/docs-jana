/**
 * StandardDeduplicator Plugin
 *
 * Plugin de deduplicação padrão para o sistema n8n-transfer.
 * Identifica workflows duplicados comparando nome exato E tags (em qualquer ordem).
 *
 * @module n8n-transfer/plugins/deduplicators/standard-deduplicator
 * @author docs-jana
 * @version 1.0.0
 * @since 2025-01-03
 */

const { BasePlugin } = require('../index');

/**
 * StandardDeduplicator
 *
 * Plugin que identifica duplicatas de workflows através de comparação exata de:
 * - Nome do workflow (case-sensitive)
 * - Tags do workflow (arrays com mesmas tags, independente da ordem)
 *
 * Um workflow é considerado duplicata se AMBOS os critérios forem satisfeitos:
 * 1. Nome exatamente igual (string comparison)
 * 2. Mesmo conjunto de tags (array comparison desconsiderando ordem)
 *
 * @class StandardDeduplicator
 * @extends BasePlugin
 *
 * @example
 * // Uso básico
 * const { StandardDeduplicator } = require('./deduplicators/standard-deduplicator');
 *
 * const deduplicator = new StandardDeduplicator();
 *
 * const workflow = {
 *   name: 'Customer Onboarding',
 *   tags: ['automation', 'sales', 'crm']
 * };
 *
 * const existingWorkflows = [
 *   { name: 'Customer Onboarding', tags: ['sales', 'crm', 'automation'] },
 *   { name: 'Invoice Processing', tags: ['finance', 'automation'] }
 * ];
 *
 * const isDuplicate = deduplicator.isDuplicate(workflow, existingWorkflows);
 * console.log(isDuplicate); // true (nome e tags iguais)
 *
 * @example
 * // Workflow NÃO é duplicata se nome for diferente
 * const deduplicator = new StandardDeduplicator();
 *
 * const workflow = {
 *   name: 'Customer Onboarding V2',
 *   tags: ['automation', 'sales', 'crm']
 * };
 *
 * const existingWorkflows = [
 *   { name: 'Customer Onboarding', tags: ['automation', 'sales', 'crm'] }
 * ];
 *
 * console.log(deduplicator.isDuplicate(workflow, existingWorkflows)); // false
 *
 * @example
 * // Workflow NÃO é duplicata se tags forem diferentes
 * const deduplicator = new StandardDeduplicator();
 *
 * const workflow = {
 *   name: 'Customer Onboarding',
 *   tags: ['automation', 'marketing']
 * };
 *
 * const existingWorkflows = [
 *   { name: 'Customer Onboarding', tags: ['automation', 'sales'] }
 * ];
 *
 * console.log(deduplicator.isDuplicate(workflow, existingWorkflows)); // false
 *
 * @example
 * // Obter razão da duplicata
 * const deduplicator = new StandardDeduplicator();
 *
 * const workflow = {
 *   name: 'Customer Onboarding',
 *   tags: ['automation', 'sales']
 * };
 *
 * const existingWorkflows = [
 *   { name: 'Customer Onboarding', tags: ['sales', 'automation'] }
 * ];
 *
 * if (deduplicator.isDuplicate(workflow, existingWorkflows)) {
 *   const reason = deduplicator.getReason();
 *   console.log(reason);
 *   // "Workflow duplicado encontrado: nome 'Customer Onboarding' e tags ['automation', 'sales'] já existem"
 * }
 */
class StandardDeduplicator extends BasePlugin {
  /**
   * Cria uma nova instância do StandardDeduplicator
   *
   * Inicializa o plugin com configurações padrão:
   * - Nome: 'standard-deduplicator'
   * - Versão: '1.0.0'
   * - Tipo: 'deduplicator'
   * - Descrição: Identificador de duplicatas por nome e tags
   *
   * @constructor
   *
   * @example
   * const deduplicator = new StandardDeduplicator();
   * console.log(deduplicator.getName()); // 'standard-deduplicator'
   * console.log(deduplicator.getVersion()); // '1.0.0'
   * console.log(deduplicator.getType()); // 'deduplicator'
   */
  constructor() {
    super('standard-deduplicator', '1.0.0', 'deduplicator');

    this.setDescription(
      'Identifica workflows duplicados através de comparação exata de nome e tags (independente da ordem)'
    );

    // Validar que a implementação possui o método obrigatório isDuplicate
    this.validateImplementation(['isDuplicate', 'getReason']);

    /**
     * Armazena a razão da última verificação de duplicata
     * @private
     * @type {string|null}
     */
    this._lastReason = null;

    /**
     * Armazena o workflow duplicado encontrado na última verificação
     * @private
     * @type {Object|null}
     */
    this._lastDuplicateFound = null;
  }

  /**
   * Verifica se um workflow é duplicata de algum workflow existente
   *
   * Compara o workflow fornecido com uma lista de workflows existentes,
   * aplicando os seguintes critérios:
   *
   * 1. **Nome exato**: workflow.name === existing.name (case-sensitive)
   * 2. **Tags idênticas**: Arrays de tags contêm os mesmos elementos (ordem ignorada)
   *
   * Ambos os critérios devem ser satisfeitos para considerar duplicata.
   *
   * **Comportamento com valores ausentes:**
   * - Se workflow.tags for undefined/null, é tratado como array vazio []
   * - Se existing.tags for undefined/null, é tratado como array vazio []
   * - Workflows sem tags podem ser duplicatas se tiverem mesmo nome
   *
   * @param {Object} workflow - Workflow a ser verificado
   * @param {string} workflow.name - Nome do workflow
   * @param {string[]} [workflow.tags=[]] - Array de tags do workflow
   * @param {Object[]} existingWorkflows - Lista de workflows já existentes no destino
   *
   * @returns {boolean} true se o workflow é duplicata de algum existente, false caso contrário
   *
   * @example
   * // Duplicata encontrada (nome e tags iguais, ordem diferente)
   * const deduplicator = new StandardDeduplicator();
   *
   * const workflow = {
   *   name: 'Email Marketing',
   *   tags: ['marketing', 'email', 'automation']
   * };
   *
   * const existingWorkflows = [
   *   { name: 'Email Marketing', tags: ['automation', 'email', 'marketing'] }
   * ];
   *
   * console.log(deduplicator.isDuplicate(workflow, existingWorkflows)); // true
   *
   * @example
   * // NÃO é duplicata (tags diferentes)
   * const deduplicator = new StandardDeduplicator();
   *
   * const workflow = {
   *   name: 'Email Marketing',
   *   tags: ['marketing', 'email']
   * };
   *
   * const existingWorkflows = [
   *   { name: 'Email Marketing', tags: ['marketing', 'email', 'automation'] }
   * ];
   *
   * console.log(deduplicator.isDuplicate(workflow, existingWorkflows)); // false
   *
   * @example
   * // Workflows sem tags
   * const deduplicator = new StandardDeduplicator();
   *
   * const workflow = { name: 'Simple Workflow' };
   * const existingWorkflows = [{ name: 'Simple Workflow' }];
   *
   * console.log(deduplicator.isDuplicate(workflow, existingWorkflows)); // true
   *
   * @example
   * // Múltiplos workflows, encontra o duplicado correto
   * const deduplicator = new StandardDeduplicator();
   *
   * const workflow = {
   *   name: 'Data Sync',
   *   tags: ['integration', 'api']
   * };
   *
   * const existingWorkflows = [
   *   { name: 'Email Sender', tags: ['email'] },
   *   { name: 'Data Sync', tags: ['api', 'integration'] },  // Duplicata
   *   { name: 'Invoice Generator', tags: ['finance'] }
   * ];
   *
   * console.log(deduplicator.isDuplicate(workflow, existingWorkflows)); // true
   */
  isDuplicate(workflow, existingWorkflows) {
    // Reset estado interno
    this._lastReason = null;
    this._lastDuplicateFound = null;

    // Validação de entrada
    if (!workflow || typeof workflow !== 'object') {
      this._lastReason = 'Workflow inválido fornecido para verificação de duplicata';
      return false;
    }

    if (!Array.isArray(existingWorkflows)) {
      this._lastReason = 'Lista de workflows existentes inválida';
      return false;
    }

    // Normalizar tags do workflow (tratar undefined/null como array vazio)
    const workflowTags = this._normalizeTags(workflow.tags);
    const workflowName = workflow.name;

    // Iterar sobre workflows existentes buscando duplicata
    for (const existing of existingWorkflows) {
      // Verificar se nome é exatamente igual
      const nameMatches = existing.name === workflowName;

      if (!nameMatches) {
        continue; // Nome diferente, não é duplicata
      }

      // Nome é igual, verificar tags
      const existingTags = this._normalizeTags(existing.tags);
      const tagsMatch = this._areTagsEqual(workflowTags, existingTags);

      if (tagsMatch) {
        // Duplicata encontrada!
        this._lastDuplicateFound = existing;
        this._lastReason = this._buildDuplicateReason(workflowName, workflowTags);
        return true;
      }
    }

    // Nenhuma duplicata encontrada
    return false;
  }

  /**
   * Retorna a razão/justificativa da última verificação de duplicata
   *
   * Fornece uma mensagem descritiva explicando por que um workflow foi
   * identificado como duplicata (ou por que a verificação falhou).
   *
   * Este método deve ser chamado APÓS isDuplicate() para obter contexto
   * sobre a decisão tomada.
   *
   * @returns {string} Mensagem descritiva da razão da duplicata ou 'Nenhuma verificação realizada'
   *
   * @example
   * // Obter razão após encontrar duplicata
   * const deduplicator = new StandardDeduplicator();
   *
   * const workflow = {
   *   name: 'Customer Sync',
   *   tags: ['crm', 'integration']
   * };
   *
   * const existingWorkflows = [
   *   { name: 'Customer Sync', tags: ['integration', 'crm'] }
   * ];
   *
   * if (deduplicator.isDuplicate(workflow, existingWorkflows)) {
   *   console.log(deduplicator.getReason());
   *   // "Workflow duplicado encontrado: nome 'Customer Sync' e tags ['crm', 'integration'] já existem"
   * }
   *
   * @example
   * // Obter razão quando NÃO é duplicata
   * const deduplicator = new StandardDeduplicator();
   *
   * const workflow = { name: 'New Workflow', tags: ['new'] };
   * const existingWorkflows = [];
   *
   * deduplicator.isDuplicate(workflow, existingWorkflows);
   * console.log(deduplicator.getReason()); // 'Nenhuma verificação realizada'
   *
   * @example
   * // Uso em logging para debugging
   * const deduplicator = new StandardDeduplicator();
   * const isDup = deduplicator.isDuplicate(workflow, existing);
   *
   * console.log(`Duplicata: ${isDup}`);
   * console.log(`Razão: ${deduplicator.getReason()}`);
   */
  getReason() {
    return this._lastReason || 'Nenhuma verificação realizada';
  }

  /**
   * Obtém informações sobre o workflow duplicado encontrado
   *
   * Retorna o objeto do workflow existente que foi identificado como duplicata
   * na última chamada de isDuplicate(). Útil para logging, debugging e relatórios.
   *
   * @returns {Object|null} Workflow duplicado encontrado ou null se nenhuma duplicata
   *
   * @example
   * const deduplicator = new StandardDeduplicator();
   *
   * const workflow = { name: 'Test', tags: ['tag1'] };
   * const existing = [{ name: 'Test', tags: ['tag1'], id: 123 }];
   *
   * if (deduplicator.isDuplicate(workflow, existing)) {
   *   const duplicate = deduplicator.getDuplicateWorkflow();
   *   console.log(`Duplicata tem ID: ${duplicate.id}`); // "Duplicata tem ID: 123"
   * }
   */
  getDuplicateWorkflow() {
    return this._lastDuplicateFound;
  }

  /**
   * Normaliza array de tags
   *
   * Converte valores undefined/null para array vazio.
   * Garante que sempre trabalhamos com arrays válidos.
   *
   * @private
   * @param {string[]|undefined|null} tags - Array de tags ou valor ausente
   * @returns {string[]} Array normalizado (array vazio se tags for undefined/null)
   *
   * @example
   * this._normalizeTags(['a', 'b']); // ['a', 'b']
   * this._normalizeTags(undefined);   // []
   * this._normalizeTags(null);        // []
   * this._normalizeTags([]);          // []
   */
  _normalizeTags(tags) {
    if (!tags || !Array.isArray(tags)) {
      return [];
    }
    return tags;
  }

  /**
   * Compara dois arrays de tags verificando se possuem os mesmos elementos
   *
   * Ignora a ordem dos elementos. Usa Set para comparação eficiente.
   *
   * **Algoritmo:**
   * 1. Verifica se comprimentos são iguais (otimização)
   * 2. Converte ambos para Set (remove duplicatas e permite lookup O(1))
   * 3. Verifica se todos elementos de tags1 existem em tags2
   *
   * **Complexidade:** O(n + m) onde n e m são tamanhos dos arrays
   *
   * @private
   * @param {string[]} tags1 - Primeiro array de tags
   * @param {string[]} tags2 - Segundo array de tags
   * @returns {boolean} true se arrays possuem mesmos elementos, false caso contrário
   *
   * @example
   * this._areTagsEqual(['a', 'b'], ['b', 'a']);        // true (mesmos elementos)
   * this._areTagsEqual(['a', 'b'], ['a', 'b', 'c']);   // false (tamanhos diferentes)
   * this._areTagsEqual(['a'], ['b']);                   // false (elementos diferentes)
   * this._areTagsEqual([], []);                         // true (ambos vazios)
   * this._areTagsEqual(['a', 'a'], ['a']);              // false (duplicatas contam)
   */
  _areTagsEqual(tags1, tags2) {
    // Otimização: se tamanhos forem diferentes, não podem ser iguais
    if (tags1.length !== tags2.length) {
      return false;
    }

    // Se ambos vazios, são iguais
    if (tags1.length === 0) {
      return true;
    }

    // Converter para Sets e comparar
    const set1 = new Set(tags1);
    const set2 = new Set(tags2);

    // Verificar se Sets têm mesmo tamanho (garante que não há duplicatas diferentes)
    if (set1.size !== set2.size) {
      return false;
    }

    // Verificar se todos elementos de set1 existem em set2
    for (const tag of set1) {
      if (!set2.has(tag)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Constrói mensagem descritiva da razão da duplicata
   *
   * @private
   * @param {string} name - Nome do workflow duplicado
   * @param {string[]} tags - Tags do workflow duplicado
   * @returns {string} Mensagem descritiva
   *
   * @example
   * this._buildDuplicateReason('Test', ['tag1', 'tag2']);
   * // "Workflow duplicado encontrado: nome 'Test' e tags ['tag1', 'tag2'] já existem"
   *
   * @example
   * this._buildDuplicateReason('Simple', []);
   * // "Workflow duplicado encontrado: nome 'Simple' e tags [] já existem"
   */
  _buildDuplicateReason(name, tags) {
    const tagsStr = JSON.stringify(tags);
    return `Workflow duplicado encontrado: nome '${name}' e tags ${tagsStr} já existem`;
  }
}

// ============================================================================
// Exports
// ============================================================================

module.exports = StandardDeduplicator;
