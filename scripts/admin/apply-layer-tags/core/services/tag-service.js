/**
 * TagService - Gerenciamento de tags via API n8n
 *
 * Responsavel por todas as operacoes relacionadas a tags:
 * - Listar tags existentes
 * - Verificar se tag existe
 * - Criar nova tag
 * - Aplicar tag a workflow
 *
 * Utiliza HttpClient para requisicoes com retry automatico e exponential backoff.
 *
 * @module core/services/tag-service
 */

const HttpClient = require('../../../../../src/utils/http-client');
const Logger = require('../../../../../src/utils/logger');
const { RETRY_CONFIG, API_CONFIG, CACHE_CONFIG } = require('../../config/config');

/**
 * Classe TagService para gerenciar operacoes de tags
 */
class TagService {
  /**
   * Cria uma instancia do TagService
   *
   * @param {HttpClient} httpClient - Cliente HTTP configurado (opcional)
   * @param {Logger} logger - Logger para registrar operacoes (opcional)
   *
   * @example
   * const tagService = new TagService();
   * const tag = await tagService.ensureTagExists('jana');
   */
  constructor(httpClient = null, logger = null) {
    // Reutilizar HttpClient existente ou criar novo
    this.httpClient = httpClient || new HttpClient(
      API_CONFIG.url,
      {
        'X-N8N-API-KEY': API_CONFIG.apiKey
      },
      RETRY_CONFIG
    );

    // Reutilizar Logger existente ou criar novo
    this.logger = logger || new Logger({ logLevel: 'info' });

    // Cache de tags para evitar requisicoes desnecessarias
    this._tagsCache = null;
    this._cacheTimestamp = null;
    this._cacheTTL = CACHE_CONFIG.tagCacheTTL; // Configuravel via config.js
  }

  /**
   * Lista todas as tags existentes
   *
   * Usa cache interno para reduzir requisicoes a API.
   * Cache valido por 30 segundos.
   *
   * @returns {Promise<Array>} Array de tags no formato { id, name, createdAt, updatedAt }
   * @throws {Error} Se falhar ao buscar tags apos retries
   *
   * @example
   * const tags = await tagService.listTags();
   * console.log(tags); // [{ id: '1', name: 'jana', ... }]
   */
  async listTags() {
    // Verificar cache
    const now = Date.now();
    if (this._tagsCache && this._cacheTimestamp && (now - this._cacheTimestamp) < this._cacheTTL) {
      const cacheAge = Math.floor((now - this._cacheTimestamp) / 1000);
      this.logger.debug(`Cache hit: Retornando ${this._tagsCache.length} tags do cache (idade: ${cacheAge}s)`);
      return this._tagsCache;
    }

    try {
      this.logger.debug('Cache miss: Buscando tags via API: GET /api/v1/tags');
      const response = await this.httpClient.get('/api/v1/tags');

      // A API n8n retorna { data: [...] }
      const tags = response.data || response || [];

      // Atualizar cache
      this._tagsCache = tags;
      this._cacheTimestamp = now;

      this.logger.debug(`Tags encontradas e cacheadas: ${tags.length} (TTL: ${this._cacheTTL}ms)`);
      return tags;
    } catch (error) {
      this.logger.error('Falha ao listar tags:', error.message);
      throw new Error(`Falha ao listar tags: ${error.message}`);
    }
  }

  /**
   * Verifica se uma tag existe pelo nome
   *
   * @param {string} tagName - Nome da tag a verificar
   * @returns {Promise<boolean>} true se tag existe, false caso contrario
   *
   * @example
   * const exists = await tagService.checkTagExists('jana');
   * console.log(exists); // true ou false
   */
  async checkTagExists(tagName) {
    try {
      const tags = await this.listTags();
      const tagExists = tags.some(tag => tag.name === tagName);

      this.logger.debug(`Tag '${tagName}' ${tagExists ? 'existe' : 'nao existe'}`);
      return tagExists;
    } catch (error) {
      this.logger.error(`Erro ao verificar existencia da tag '${tagName}':`, error.message);
      throw error;
    }
  }

  /**
   * Busca ID da tag pelo nome
   *
   * @param {string} tagName - Nome da tag
   * @returns {Promise<string|null>} ID da tag ou null se nao encontrada
   *
   * @example
   * const tagId = await tagService.getTagIdByName('jana');
   * console.log(tagId); // '84ZeQA0cA24Umeli' ou null
   */
  async getTagIdByName(tagName) {
    try {
      const tags = await this.listTags();
      const tag = tags.find(t => t.name === tagName);

      if (tag) {
        this.logger.debug(`Tag '${tagName}' encontrada com ID: ${tag.id}`);
        return tag.id;
      }

      this.logger.debug(`Tag '${tagName}' nao encontrada`);
      return null;
    } catch (error) {
      this.logger.error(`Erro ao buscar ID da tag '${tagName}':`, error.message);
      throw error;
    }
  }

  /**
   * Cria uma nova tag
   *
   * @param {string} tagName - Nome da tag a criar
   * @returns {Promise<Object>} Tag criada no formato { id, name, createdAt, updatedAt }
   * @throws {Error} Se falhar ao criar tag apos retries
   *
   * @example
   * const tag = await tagService.createTag('jana');
   * console.log(tag); // { id: '84ZeQA0cA24Umeli', name: 'jana', ... }
   */
  async createTag(tagName) {
    try {
      this.logger.info(`Criando tag: '${tagName}'`);

      const response = await this.httpClient.post('/api/v1/tags', {
        name: tagName
      });

      // Invalidar cache
      this._tagsCache = null;
      this._cacheTimestamp = null;

      const tag = response.data || response;
      this.logger.success(`Tag '${tagName}' criada com sucesso (ID: ${tag.id})`);

      return tag;
    } catch (error) {
      // Tratar erro 409 (Conflict) - Tag ja existe
      const statusCode = this.httpClient.extractStatusCode(error);

      if (statusCode === 409) {
        this.logger.warn(`Tag '${tagName}' ja existe (409 Conflict), buscando ID...`);

        // Buscar tag existente
        const tagId = await this.getTagIdByName(tagName);
        if (tagId) {
          const tags = await this.listTags();
          const existingTag = tags.find(t => t.id === tagId);
          return existingTag;
        }
      }

      this.logger.error(`Falha ao criar tag '${tagName}':`, error.message);
      throw new Error(`Falha ao criar tag '${tagName}': ${error.message}`);
    }
  }

  /**
   * Garante que uma tag existe (cria se necessario)
   *
   * Este e o metodo principal para garantir que uma tag esteja disponivel.
   * Primeiro verifica se a tag ja existe, se nao existir, cria.
   *
   * @param {string} tagName - Nome da tag
   * @returns {Promise<Object>} Tag existente ou recem-criada
   * @throws {Error} Se falhar ao garantir existencia da tag
   *
   * @example
   * const tag = await tagService.ensureTagExists('jana');
   * console.log(tag); // { id: '84ZeQA0cA24Umeli', name: 'jana', ... }
   */
  async ensureTagExists(tagName) {
    try {
      this.logger.debug(`Garantindo que tag '${tagName}' existe...`);

      // Verificar se tag ja existe
      const tagId = await this.getTagIdByName(tagName);

      if (tagId) {
        this.logger.debug(`Tag '${tagName}' ja existe (ID: ${tagId})`);
        const tags = await this.listTags();
        const existingTag = tags.find(t => t.id === tagId);
        return existingTag;
      }

      // Tag nao existe, criar
      this.logger.info(`Tag '${tagName}' nao existe, criando...`);
      const newTag = await this.createTag(tagName);

      return newTag;
    } catch (error) {
      this.logger.error(`Falha ao garantir existencia da tag '${tagName}':`, error.message);
      throw error;
    }
  }

  /**
   * Aplica tag a um workflow
   *
   * Utiliza PUT /api/v1/workflows/{id}/tags com payload { tagIds: [tagId] }
   * O HttpClient ja implementa retry automatico com exponential backoff.
   *
   * @param {string} workflowId - ID do workflow no formato n8n (16 chars alfanumericos)
   * @param {string} tagId - ID da tag a aplicar
   * @returns {Promise<Object>} Workflow atualizado com tag aplicada
   * @throws {Error} Se falhar ao aplicar tag apos retries
   *
   * @example
   * const workflow = await tagService.applyTagToWorkflow('84ZeQA0cA24Umeli', 'tag123');
   * console.log(workflow.tags); // [{ id: 'tag123', name: 'jana' }]
   */
  async applyTagToWorkflow(workflowId, tagId) {
    try {
      this.logger.info(`Aplicando tag (${tagId}) ao workflow (${workflowId})...`);

      // Endpoint: PUT /api/v1/workflows/{id}/tags
      const endpoint = `/api/v1/workflows/${workflowId}/tags`;
      const payload = {
        tagIds: [tagId]
      };

      const response = await this.httpClient.put(endpoint, payload);

      const workflow = response.data || response;
      this.logger.success(`Tag aplicada ao workflow ${workflowId} com sucesso`);

      return workflow;
    } catch (error) {
      const statusCode = this.httpClient.extractStatusCode(error);

      // Tratar erros especificos
      if (statusCode === 404) {
        this.logger.error(`Workflow ${workflowId} nao encontrado (404)`);
        throw new Error(`Workflow ${workflowId} nao encontrado (404)`);
      }

      if (statusCode === 401) {
        this.logger.error('Credenciais invalidas (401) - Verifique SOURCE_N8N_API_KEY');
        throw new Error('Credenciais invalidas (401) - Verifique SOURCE_N8N_API_KEY');
      }

      if (statusCode === 429) {
        this.logger.warn('Rate limit atingido (429) - Retry em andamento...');
      }

      this.logger.error(`Falha ao aplicar tag ao workflow ${workflowId}:`, error.message);
      throw new Error(`Falha ao aplicar tag ao workflow ${workflowId}: ${error.message}`);
    }
  }

  /**
   * Aplica multiplas tags a um workflow simultaneamente
   *
   * IMPORTANTE: A API n8n suporta aplicar multiplas tags de uma vez via PUT /api/v1/workflows/{id}/tags
   * com payload { tagIds: [id1, id2, ...] }
   *
   * @param {string} workflowId - ID do workflow no formato n8n (16 chars alfanumericos)
   * @param {Array<string>} tagIds - Array de IDs de tags a aplicar
   * @returns {Promise<Object>} Workflow atualizado com todas as tags aplicadas
   * @throws {Error} Se falhar ao aplicar tags apos retries
   *
   * @example
   * const workflow = await tagService.applyMultipleTags('84ZeQA0cA24Umeli', ['tag1', 'tag2', 'tag3']);
   * console.log(workflow.tags); // [{ id: 'tag1', ... }, { id: 'tag2', ... }, { id: 'tag3', ... }]
   */
  async applyMultipleTags(workflowId, tagIds) {
    if (!Array.isArray(tagIds) || tagIds.length === 0) {
      throw new Error('tagIds deve ser um array nao vazio');
    }

    try {
      this.logger.info(`Aplicando ${tagIds.length} tags ao workflow (${workflowId})...`);
      this.logger.debug(`Tag IDs: ${tagIds.join(', ')}`);

      // Endpoint: PUT /api/v1/workflows/{id}/tags
      const endpoint = `/api/v1/workflows/${workflowId}/tags`;
      const payload = {
        tagIds: tagIds
      };

      const response = await this.httpClient.put(endpoint, payload);

      const workflow = response.data || response;
      this.logger.success(`${tagIds.length} tags aplicadas ao workflow ${workflowId} com sucesso`);

      return workflow;
    } catch (error) {
      const statusCode = this.httpClient.extractStatusCode(error);

      // Tratar erros especificos
      if (statusCode === 404) {
        this.logger.error(`Workflow ${workflowId} nao encontrado (404)`);
        throw new Error(`Workflow ${workflowId} nao encontrado (404)`);
      }

      if (statusCode === 401) {
        this.logger.error('Credenciais invalidas (401) - Verifique SOURCE_N8N_API_KEY');
        throw new Error('Credenciais invalidas (401) - Verifique SOURCE_N8N_API_KEY');
      }

      if (statusCode === 429) {
        this.logger.warn('Rate limit atingido (429) - Retry em andamento...');
      }

      this.logger.error(`Falha ao aplicar multiplas tags ao workflow ${workflowId}:`, error.message);
      throw new Error(`Falha ao aplicar multiplas tags ao workflow ${workflowId}: ${error.message}`);
    }
  }

  /**
   * Verifica se um workflow ja possui uma tag especifica
   *
   * @param {Object} workflow - Objeto workflow com propriedade tags
   * @param {string} tagId - ID da tag a verificar
   * @returns {boolean} true se workflow ja possui a tag, false caso contrario
   *
   * @example
   * const hasTag = tagService.hasTag(workflow, 'tag123');
   * console.log(hasTag); // true ou false
   */
  hasTag(workflow, tagId) {
    if (!workflow || !workflow.tags || !Array.isArray(workflow.tags)) {
      return false;
    }

    return workflow.tags.some(tag => tag.id === tagId || tag === tagId);
  }

  /**
   * Limpa o cache interno de tags
   *
   * Util apos operacoes que modificam tags (criar, deletar).
   *
   * @example
   * tagService.clearCache();
   */
  clearCache() {
    this._tagsCache = null;
    this._cacheTimestamp = null;
    this.logger.debug('Cache de tags limpo');
  }

  /**
   * Retorna estatisticas do HttpClient
   *
   * Util para monitorar performance e retries.
   *
   * @returns {Object} Estatisticas no formato { totalRequests, retriedRequests, failedRequests }
   *
   * @example
   * const stats = tagService.getStats();
   * console.log(stats); // { totalRequests: 10, retriedRequests: 2, failedRequests: 0 }
   */
  getStats() {
    return this.httpClient.getStats();
  }
}

module.exports = TagService;
