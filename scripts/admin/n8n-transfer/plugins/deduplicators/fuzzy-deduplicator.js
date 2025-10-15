/**
 * Fuzzy Deduplicator Plugin for n8n-transfer
 *
 * Identifica workflows duplicados usando algoritmo de Levenshtein distance
 * para comparação fuzzy de nomes de workflows. Permite configuração de
 * threshold de similaridade para ajustar sensibilidade da detecção.
 *
 * @module n8n-transfer/plugins/deduplicators/fuzzy-deduplicator
 * @author docs-jana
 * @version 1.0.0
 */

const { BasePlugin } = require('../index');

/**
 * Plugin de deduplicação usando fuzzy matching com Levenshtein distance
 *
 * Este plugin identifica workflows duplicados comparando a similaridade
 * entre nomes usando o algoritmo de Levenshtein distance. O algoritmo
 * calcula o número mínimo de edições (inserções, deleções, substituições)
 * necessárias para transformar uma string em outra.
 *
 * @class FuzzyDeduplicator
 * @extends BasePlugin
 *
 * @example
 * // Uso básico (threshold padrão: 0.85)
 * const deduplicator = new FuzzyDeduplicator();
 * const isDup = deduplicator.isDuplicate(workflow, existingWorkflows);
 *
 * @example
 * // Uso com threshold customizado (mais sensível)
 * const deduplicator = new FuzzyDeduplicator();
 * deduplicator.setOptions({ threshold: 0.95 });
 * const isDup = deduplicator.isDuplicate(workflow, existingWorkflows);
 *
 * @example
 * // Obter informações sobre a duplicata detectada
 * const deduplicator = new FuzzyDeduplicator();
 * if (deduplicator.isDuplicate(workflow, existingWorkflows)) {
 *   console.log(deduplicator.getReason());
 *   // Output: "Workflow similar encontrado: 'WorkflowA' (similaridade: 92.5%)"
 * }
 */
class FuzzyDeduplicator extends BasePlugin {
  /**
   * Cria nova instância do FuzzyDeduplicator
   *
   * @constructor
   *
   * @example
   * const deduplicator = new FuzzyDeduplicator();
   */
  constructor() {
    super('fuzzy-deduplicator', '1.0.0', 'deduplicator');

    this.setDescription(
      'Identifica workflows duplicados usando fuzzy matching com Levenshtein distance'
    );

    // Opções padrão
    this.setOptions({
      threshold: 0.85, // 85% de similaridade mínima
      compareFields: ['name'], // Campos a comparar (expansível no futuro)
      caseSensitive: false // Ignorar case por padrão
    });

    // Armazena informações sobre última duplicata encontrada
    this.lastMatch = null;

    // Valida que métodos obrigatórios estão implementados
    this.validateImplementation(['isDuplicate']);
  }

  /**
   * Calcula distância de Levenshtein entre duas strings
   *
   * Implementação do algoritmo de Levenshtein usando programação dinâmica.
   * Complexidade: O(m * n) onde m e n são os comprimentos das strings.
   *
   * O algoritmo cria uma matriz onde cada célula [i,j] representa o número
   * mínimo de operações necessárias para transformar os primeiros i caracteres
   * de str1 nos primeiros j caracteres de str2.
   *
   * @private
   * @param {string} str1 - Primeira string
   * @param {string} str2 - Segunda string
   * @returns {number} Distância de Levenshtein (número de edições)
   *
   * @example
   * const distance = this._levenshteinDistance('kitten', 'sitting');
   * console.log(distance); // 3
   * // Transformações: kitten → sitten → sittin → sitting
   *
   * @example
   * const distance = this._levenshteinDistance('hello', 'hello');
   * console.log(distance); // 0 (strings idênticas)
   */
  _levenshteinDistance(str1, str2) {
    // Validação de entrada
    if (typeof str1 !== 'string' || typeof str2 !== 'string') {
      throw new Error('Ambos os parâmetros devem ser strings');
    }

    // Normalização: remover espaços extras e converter case se necessário
    const caseSensitive = this.getOption('caseSensitive', false);
    const s1 = caseSensitive ? str1.trim() : str1.trim().toLowerCase();
    const s2 = caseSensitive ? str2.trim() : str2.trim().toLowerCase();

    // Casos base: strings vazias
    if (s1.length === 0) return s2.length;
    if (s2.length === 0) return s1.length;

    // Otimização: se strings são idênticas, distância é 0
    if (s1 === s2) return 0;

    const len1 = s1.length;
    const len2 = s2.length;

    // Criar matriz de programação dinâmica
    // matrix[i][j] = distância entre s1[0..i-1] e s2[0..j-1]
    const matrix = Array(len1 + 1)
      .fill(null)
      .map(() => Array(len2 + 1).fill(0));

    // Inicializar primeira coluna (transformar s1 em string vazia)
    for (let i = 0; i <= len1; i++) {
      matrix[i][0] = i;
    }

    // Inicializar primeira linha (transformar string vazia em s2)
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Preencher matriz usando programação dinâmica
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        // Custo de substituição: 0 se caracteres são iguais, 1 caso contrário
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;

        // Escolher operação de menor custo:
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // Deleção
          matrix[i][j - 1] + 1,      // Inserção
          matrix[i - 1][j - 1] + cost // Substituição
        );
      }
    }

    // Retornar distância final (canto inferior direito da matriz)
    return matrix[len1][len2];
  }

  /**
   * Calcula similaridade entre duas strings como ratio [0, 1]
   *
   * Converte distância de Levenshtein em ratio de similaridade:
   * - 0.0 = completamente diferentes
   * - 1.0 = idênticas
   *
   * Fórmula: similarity = 1 - (distance / maxLength)
   * onde maxLength é o comprimento da string mais longa.
   *
   * @private
   * @param {string} str1 - Primeira string
   * @param {string} str2 - Segunda string
   * @returns {number} Ratio de similaridade entre 0 e 1
   *
   * @example
   * const similarity = this._calculateSimilarity('hello', 'hallo');
   * console.log(similarity); // 0.8 (80% similar)
   *
   * @example
   * const similarity = this._calculateSimilarity('abc', 'xyz');
   * console.log(similarity); // 0.0 (0% similar)
   */
  _calculateSimilarity(str1, str2) {
    const distance = this._levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);

    // Evitar divisão por zero
    if (maxLength === 0) return 1.0;

    // Calcular ratio: quanto menor a distância, maior a similaridade
    const similarity = 1 - (distance / maxLength);

    return similarity;
  }

  /**
   * Verifica se workflow é duplicata de algum workflow existente
   *
   * Compara o workflow fornecido com a lista de workflows existentes
   * usando fuzzy matching. Se a similaridade de nomes exceder o threshold
   * configurado, considera como duplicata.
   *
   * @param {Object} workflow - Workflow a ser verificado
   * @param {string} workflow.name - Nome do workflow
   * @param {Object[]} existingWorkflows - Lista de workflows já existentes
   * @param {string} existingWorkflows[].name - Nome do workflow existente
   * @returns {boolean} true se duplicata detectada, false caso contrário
   *
   * @throws {Error} Se workflow ou existingWorkflows forem inválidos
   *
   * @example
   * const workflow = { name: 'Customer Onboarding v2' };
   * const existing = [
   *   { name: 'Customer Onboarding' },
   *   { name: 'Order Processing' }
   * ];
   * const isDup = deduplicator.isDuplicate(workflow, existing);
   * // true (similaridade alta entre nomes)
   *
   * @example
   * // Verificar após detecção de duplicata
   * if (deduplicator.isDuplicate(workflow, existing)) {
   *   console.log(deduplicator.getReason());
   *   // "Workflow similar encontrado: 'Customer Onboarding' (similaridade: 87.5%)"
   * }
   */
  isDuplicate(workflow, existingWorkflows) {
    // Validação de entrada
    if (!workflow || typeof workflow !== 'object') {
      throw new Error('Workflow deve ser um objeto válido');
    }

    if (!workflow.name || typeof workflow.name !== 'string') {
      throw new Error('Workflow deve possuir propriedade "name" do tipo string');
    }

    if (!Array.isArray(existingWorkflows)) {
      throw new Error('existingWorkflows deve ser um array');
    }

    // Reset de estado anterior
    this.lastMatch = null;

    // Se não há workflows existentes, não é duplicata
    if (existingWorkflows.length === 0) {
      return false;
    }

    // Obter threshold configurado
    const threshold = this.getOption('threshold', 0.85);

    // Validar threshold
    if (threshold < 0 || threshold > 1) {
      throw new Error('Threshold deve estar entre 0 e 1');
    }

    // Buscar melhor match (maior similaridade)
    let bestMatch = null;
    let highestSimilarity = 0;

    for (const existing of existingWorkflows) {
      // Validar workflow existente
      if (!existing || !existing.name || typeof existing.name !== 'string') {
        continue; // Skip workflows inválidos
      }

      // Calcular similaridade
      const similarity = this._calculateSimilarity(workflow.name, existing.name);

      // Atualizar melhor match
      if (similarity >= highestSimilarity) {
        highestSimilarity = similarity;
        bestMatch = {
          workflow: existing,
          similarity: similarity
        };
      }
    }

    // Verificar se melhor match excede threshold
    if (bestMatch && highestSimilarity >= threshold) {
      // Armazenar informações do match para getReason()
      this.lastMatch = bestMatch;
      return true;
    }

    return false;
  }

  /**
   * Retorna informações sobre última duplicata detectada
   *
   * Fornece descrição detalhada sobre o match encontrado,
   * incluindo nome do workflow similar e score de similaridade.
   *
   * @returns {string} Descrição do match ou mensagem padrão
   *
   * @example
   * if (deduplicator.isDuplicate(workflow, existingWorkflows)) {
   *   console.log(deduplicator.getReason());
   *   // "Workflow similar encontrado: 'Customer Onboarding' (similaridade: 92.5%)"
   * }
   *
   * @example
   * // Sem duplicata detectada
   * console.log(deduplicator.getReason());
   * // "Nenhuma duplicata detectada"
   */
  getReason() {
    if (!this.lastMatch) {
      return 'Nenhuma duplicata detectada';
    }

    const workflowName = this.lastMatch.workflow.name;
    const similarityPercent = (this.lastMatch.similarity * 100).toFixed(1);

    return `Workflow similar encontrado: '${workflowName}' (similaridade: ${similarityPercent}%)`;
  }
}

// ============================================================================
// Exports
// ============================================================================

module.exports = FuzzyDeduplicator;
