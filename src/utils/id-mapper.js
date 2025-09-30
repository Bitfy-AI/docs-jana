/**
 * IdMapper - Mapeia IDs de workflows antigos para novos
 * Implementa estratégia de busca por NOME (prioridade) e fallback por ID
 */

class IdMapper {
  constructor(logger) {
    this.logger = logger;

    // Mapa principal: nome -> novo ID (PRIORIDADE)
    this.nameToNewId = new Map();

    // Mapa auxiliar: ID antigo -> novo ID
    this.oldIdToNewId = new Map();

    // Mapa reverso: novo ID -> workflow completo
    this.newIdToWorkflow = new Map();

    // Estatísticas
    this.stats = {
      totalMapped: 0,
      mappedByName: 0,
      mappedById: 0,
      notFound: 0
    };
  }

  /**
   * Registra um mapeamento de workflow
   * @param {string} oldId - ID antigo do workflow
   * @param {string} name - Nome do workflow
   * @param {string} newId - Novo ID atribuído pelo n8n
   * @param {object} workflow - Workflow completo criado
   */
  register(oldId, name, newId, workflow) {
    // Mapeamento por nome (PRIORIDADE)
    this.nameToNewId.set(name, newId);

    // Mapeamento por ID antigo
    this.oldIdToNewId.set(oldId, newId);

    // Armazena workflow completo
    this.newIdToWorkflow.set(newId, workflow);

    this.stats.totalMapped++;

    this.logger.debug(`Mapeado: "${name}" | ${oldId} -> ${newId}`);
  }

  /**
   * Busca novo ID por nome do workflow (PRIORIDADE)
   * @param {string} name - Nome do workflow
   * @returns {string|null} Novo ID ou null
   */
  getIdByName(name) {
    const newId = this.nameToNewId.get(name);

    if (newId) {
      this.stats.mappedByName++;
      return newId;
    }

    return null;
  }

  /**
   * Busca novo ID por ID antigo (FALLBACK)
   * @param {string} oldId - ID antigo do workflow
   * @returns {string|null} Novo ID ou null
   */
  getIdByOldId(oldId) {
    const newId = this.oldIdToNewId.get(oldId);

    if (newId) {
      this.stats.mappedById++;
      return newId;
    }

    return null;
  }

  /**
   * Busca novo ID com estratégia inteligente
   * Tenta primeiro por nome (cachedResultName), depois por ID antigo
   * @param {string} oldId - ID antigo
   * @param {string} cachedResultName - Nome do workflow (se disponível)
   * @returns {string|null} Novo ID ou null
   */
  resolve(oldId, cachedResultName = null) {
    // Prioridade 1: Buscar por nome
    if (cachedResultName) {
      const newId = this.getIdByName(cachedResultName);
      if (newId) {
        return newId;
      }
    }

    // Prioridade 2: Buscar por ID antigo
    const newId = this.getIdByOldId(oldId);
    if (newId) {
      return newId;
    }

    // Não encontrado
    this.stats.notFound++;
    this.logger.warn(`ID não encontrado: ${oldId} (${cachedResultName || 'sem nome'})`);
    return null;
  }

  /**
   * Busca workflow completo por novo ID
   * @param {string} newId - Novo ID do workflow
   * @returns {object|null} Workflow completo ou null
   */
  getWorkflow(newId) {
    return this.newIdToWorkflow.get(newId) || null;
  }

  /**
   * Verifica se um nome já foi mapeado
   * @param {string} name - Nome do workflow
   * @returns {boolean} True se já existe mapeamento
   */
  hasName(name) {
    return this.nameToNewId.has(name);
  }

  /**
   * Verifica se um ID antigo já foi mapeado
   * @param {string} oldId - ID antigo
   * @returns {boolean} True se já existe mapeamento
   */
  hasOldId(oldId) {
    return this.oldIdToNewId.has(oldId);
  }

  /**
   * Retorna lista de todos os mapeamentos
   * @returns {Array} Array de mapeamentos
   */
  getAllMappings() {
    const mappings = [];

    for (const [name, newId] of this.nameToNewId.entries()) {
      // Encontra ID antigo correspondente
      let oldId = null;
      for (const [oId, nId] of this.oldIdToNewId.entries()) {
        if (nId === newId) {
          oldId = oId;
          break;
        }
      }

      mappings.push({
        name,
        oldId,
        newId
      });
    }

    return mappings;
  }

  /**
   * Exporta mapeamentos para arquivo JSON
   * @returns {object} Mapeamentos em formato JSON
   */
  toJSON() {
    return {
      timestamp: new Date().toISOString(),
      statistics: this.getStatistics(),
      mappings: this.getAllMappings()
    };
  }

  /**
   * Retorna estatísticas de uso do mapper
   * @returns {object} Estatísticas
   */
  getStatistics() {
    return {
      totalMapped: this.stats.totalMapped,
      mappedByName: this.stats.mappedByName,
      mappedById: this.stats.mappedById,
      notFound: this.stats.notFound,
      successRate: this.stats.totalMapped > 0
        ? ((this.stats.mappedByName + this.stats.mappedById) / this.stats.totalMapped * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Reseta estatísticas de uso (mantém mapeamentos)
   */
  resetStats() {
    this.stats = {
      totalMapped: this.stats.totalMapped,
      mappedByName: 0,
      mappedById: 0,
      notFound: 0
    };
  }

  /**
   * Limpa todos os mapeamentos
   */
  clear() {
    this.nameToNewId.clear();
    this.oldIdToNewId.clear();
    this.newIdToWorkflow.clear();
    this.stats = {
      totalMapped: 0,
      mappedByName: 0,
      mappedById: 0,
      notFound: 0
    };
  }
}

module.exports = IdMapper;
