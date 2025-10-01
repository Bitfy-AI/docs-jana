/**
 * Outline Service - Handles all Outline API operations
 *
 * This service provides a clean interface for interacting with the Outline API,
 * following the same architectural pattern as WorkflowService.
 *
 * Features:
 * - Dependency injection for testability
 * - Document caching to avoid redundant API calls
 * - Structured error handling with proper logging
 * - Clean separation of concerns
 */

class OutlineService {
  /**
   * Creates an instance of OutlineService
   *
   * @param {HttpClient} httpClient - HTTP client instance for making API requests
   * @param {TokenStrategy} authStrategy - Authentication strategy for Outline API
   * @param {Logger} logger - Logger instance for debug/info messages
   * @param {FileManager} fileManager - File manager instance for file operations
   * @param {object} config - Configuration object
   * @param {number} config.delay - Delay between API requests in milliseconds
   * @param {boolean} config.verbose - Enable verbose logging
   * @param {number} config.maxCacheSize - Tamanho máximo do cache (padrão: 1000)
   */
  constructor(httpClient, authStrategy, logger, fileManager, config = {}) {
    this.httpClient = httpClient;
    this.authStrategy = authStrategy;
    this.logger = logger;
    this.fileManager = fileManager;
    this.config = config;

    // Tamanho máximo do cache para prevenir vazamento de memória
    this.maxCacheSize = config.maxCacheSize || 1000;

    // Document cache to avoid re-fetching the same document
    // Key: documentId, Value: document data
    // Implementa LRU (Least Recently Used) através da ordem de inserção do Map
    this.documentCache = new Map();

    // Métricas do cache para monitoramento e debugging
    this.cacheStats = {
      hits: 0,       // Número de vezes que o documento foi encontrado no cache
      misses: 0,     // Número de vezes que o documento não estava no cache
      evictions: 0   // Número de vezes que documentos foram removidos para liberar espaço
    };

    // Set authentication headers on the HTTP client
    this.httpClient.setHeaders(this.authStrategy.getHeaders());
  }

  /**
   * List all collections (spaces) from Outline
   *
   * @returns {Promise<Array>} Array of collection objects
   * @throws {Error} If API request fails
   */
  async listCollections() {
    try {
      this.logger.debug('Fetching collections list from Outline API');

      const response = await this.httpClient.post('/api/collections.list', {});

      const collections = response.data || [];
      this.logger.debug(`Received ${collections.length} collections from Outline API`);

      return collections;
    } catch (error) {
      this.logger.error(`Failed to list collections: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get detailed information about a specific collection
   *
   * @param {string} collectionId - The ID of the collection to retrieve
   * @returns {Promise<object>} Collection data
   * @throws {TypeError} If collectionId is not a string
   * @throws {Error} If collectionId is empty or API request fails
   */
  async getCollection(collectionId) {
    // Validação de parâmetros
    if (!collectionId || typeof collectionId !== 'string') {
      throw new TypeError('collectionId é obrigatório e deve ser uma string');
    }

    if (collectionId.trim().length === 0) {
      throw new Error('collectionId não pode ser vazio');
    }

    try {
      this.logger.debug(`Fetching collection ${collectionId}`);

      const response = await this.httpClient.post('/api/collections.info', {
        id: collectionId
      });

      const collection = response.data;
      this.logger.debug(`Retrieved collection: ${collection.name}`);

      return collection;
    } catch (error) {
      this.logger.error(`Failed to get collection ${collectionId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all documents in a collection with their hierarchical structure
   *
   * This returns a tree structure of documents, preserving the parent-child
   * relationships that exist in Outline.
   *
   * @param {string} collectionId - The ID of the collection
   * @returns {Promise<Array>} Array of document objects in tree structure
   * @throws {TypeError} If collectionId is not a string
   * @throws {Error} If collectionId is empty or API request fails
   */
  async getCollectionDocuments(collectionId) {
    // Validação de parâmetros
    if (!collectionId || typeof collectionId !== 'string') {
      throw new TypeError('collectionId é obrigatório e deve ser uma string');
    }

    if (collectionId.trim().length === 0) {
      throw new Error('collectionId não pode ser vazio');
    }

    try {
      this.logger.debug(`Fetching documents for collection ${collectionId}`);

      const response = await this.httpClient.post('/api/collections.documents', {
        id: collectionId
      });

      const documents = response.data || [];
      this.logger.debug(`Retrieved ${documents.length} root documents from collection ${collectionId}`);

      return documents;
    } catch (error) {
      this.logger.error(`Failed to get collection documents for ${collectionId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get the full content of a specific document
   *
   * This method implements caching to avoid re-fetching documents that have
   * already been retrieved. The cache is stored in memory for the lifetime
   * of the service instance.
   *
   * Implementa cache LRU (Least Recently Used) com tamanho máximo:
   * - Cache hit: Move o item para o final (mais recente)
   * - Cache miss: Busca da API e adiciona ao cache
   * - Cache full: Remove o item mais antigo (primeiro) antes de adicionar novo
   *
   * @param {string} documentId - The ID of the document to retrieve
   * @returns {Promise<object>} Document data including content, metadata, etc.
   * @throws {TypeError} If documentId is not a string
   * @throws {Error} If documentId is empty or API request fails
   */
  async getDocumentContent(documentId) {
    // Validação de parâmetros
    if (!documentId || typeof documentId !== 'string') {
      throw new TypeError('documentId é obrigatório e deve ser uma string');
    }

    if (documentId.trim().length === 0) {
      throw new Error('documentId não pode ser vazio');
    }

    // Check cache first to avoid redundant API calls
    if (this.documentCache.has(documentId)) {
      // Cache HIT: incrementa contador e move para o final (mais recente)
      this.cacheStats.hits++;

      const document = this.documentCache.get(documentId);

      // Remove e re-insere para mover para o final do Map (LRU)
      this.documentCache.delete(documentId);
      this.documentCache.set(documentId, document);

      this.logger.debug(
        `Cache HIT: documento ${documentId} (hits: ${this.cacheStats.hits}, ` +
        `tamanho: ${this.documentCache.size}/${this.maxCacheSize})`
      );

      return document;
    }

    // Cache MISS: documento não está no cache
    this.cacheStats.misses++;

    try {
      this.logger.debug(
        `Cache MISS: buscando documento ${documentId} da API ` +
        `(misses: ${this.cacheStats.misses})`
      );

      const response = await this.httpClient.post('/api/documents.info', {
        id: documentId
      });

      const document = response.data;

      // Implementa eviction LRU se o cache estiver cheio
      if (this.documentCache.size >= this.maxCacheSize) {
        // Map mantém ordem de inserção, então o primeiro é o mais antigo
        const oldestKey = this.documentCache.keys().next().value;
        this.documentCache.delete(oldestKey);
        this.cacheStats.evictions++;

        this.logger.debug(
          `Cache EVICTION: removido documento ${oldestKey} ` +
          `(evictions: ${this.cacheStats.evictions}, ` +
          `tamanho: ${this.documentCache.size}/${this.maxCacheSize})`
        );
      }

      // Cache the document for future requests
      this.documentCache.set(documentId, document);

      this.logger.debug(
        `Documento ${documentId} adicionado ao cache: ${document.title} ` +
        `(tamanho: ${this.documentCache.size}/${this.maxCacheSize})`
      );

      return document;
    } catch (error) {
      this.logger.error(`Failed to get document content for ${documentId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clear the document cache
   *
   * Useful when you want to force fresh data from the API or free up memory.
   * Também reseta as métricas do cache.
   */
  clearCache() {
    const cacheSize = this.documentCache.size;
    this.documentCache.clear();

    // Reset cache statistics
    this.cacheStats.hits = 0;
    this.cacheStats.misses = 0;
    this.cacheStats.evictions = 0;

    this.logger.debug(
      `Cache limpo: ${cacheSize} documentos removidos, métricas resetadas`
    );
  }

  /**
   * Get cache statistics
   *
   * Retorna estatísticas completas do cache incluindo:
   * - size: Tamanho atual do cache
   * - maxSize: Tamanho máximo configurado
   * - hits: Número de cache hits
   * - misses: Número de cache misses
   * - evictions: Número de evictions realizadas
   * - hitRate: Taxa de acerto do cache (hits / total requests)
   * - entries: IDs dos documentos no cache
   *
   * @returns {object} Cache statistics including size, metrics, and hit rate
   */
  getCacheStats() {
    const totalRequests = this.cacheStats.hits + this.cacheStats.misses;
    const hitRate = totalRequests > 0
      ? (this.cacheStats.hits / totalRequests * 100).toFixed(2)
      : '0.00';

    return {
      size: this.documentCache.size,
      maxSize: this.maxCacheSize,
      hits: this.cacheStats.hits,
      misses: this.cacheStats.misses,
      evictions: this.cacheStats.evictions,
      hitRate: `${hitRate}%`,
      entries: Array.from(this.documentCache.keys())
    };
  }

  /**
   * Sanitize a filename to be safe for all operating systems
   *
   * This method removes or replaces dangerous characters that could cause
   * issues on Windows, Linux, or macOS file systems. It also protects against
   * path traversal attacks.
   *
   * Features:
   * - Removes special characters invalid in filenames (< > : " / \ | ? *)
   * - Replaces spaces with hyphens for consistency
   * - Converts to lowercase for uniformity
   * - Removes trailing dots (problematic on Windows)
   * - Protects against path traversal (removes .., /, \, leading dots)
   * - Limits length to 255 characters (safe for most filesystems)
   * - Handles empty/null input by returning 'untitled'
   *
   * @param {string} name - The filename to sanitize
   * @returns {string} Safe filename suitable for all OS
   *
   * @example
   * sanitizeFilename('My Document: Version 2.0')
   * // Returns: 'my-document--version-2-0'
   *
   * @example
   * sanitizeFilename('../../../etc/passwd')
   * // Returns: 'etcpasswd'
   *
   * @example
   * sanitizeFilename('')
   * // Returns: 'untitled'
   */
  sanitizeFilename(name) {
    // Handle null or undefined input
    if (!name) {
      return 'untitled';
    }

    // Remove or replace dangerous characters
    let sanitized = name
      .replace(/[<>:"/\\|?*]/g, '-')  // Replace filesystem-invalid characters
      .replace(/\s+/g, '-')            // Replace whitespace with hyphens
      .replace(/\.+$/, '')             // Remove trailing dots (Windows issue)
      .toLowerCase();                   // Normalize to lowercase

    // Path traversal protection: remove any path separators and parent directory references
    sanitized = sanitized
      .replace(/\.\./g, '')    // Remove parent directory references (..)
      .replace(/[\/\\]/g, '-') // Replace any remaining path separators
      .replace(/^\.+/, '');    // Remove leading dots

    // Ensure filename is not empty after sanitization
    if (!sanitized || sanitized.length === 0) {
      sanitized = 'untitled';
    }

    // Limit length to prevent filesystem issues
    // Most filesystems support 255 chars, but we use 255 to be safe
    if (sanitized.length > 255) {
      sanitized = sanitized.substring(0, 255);
    }

    return sanitized;
  }

  /**
   * Sanitize a complete path including collection name and document path
   *
   * This method constructs a safe file system path by sanitizing each component.
   * It's useful when creating nested directory structures for collections and
   * documents with hierarchical relationships.
   *
   * @param {string} collectionName - The name of the collection (becomes a folder)
   * @param {string} documentPath - The document path or name (optional)
   * @returns {string} Safe path with sanitized components joined by path separator
   *
   * @example
   * sanitizePath('Engineering Team', 'API Documentation')
   * // Returns: 'engineering-team/api-documentation'
   *
   * @example
   * sanitizePath('Sales & Marketing')
   * // Returns: 'sales---marketing'
   */
  sanitizePath(collectionName, documentPath = null) {
    const sanitizedCollection = this.sanitizeFilename(collectionName);

    if (!documentPath) {
      return sanitizedCollection;
    }

    // If documentPath contains path separators, sanitize each part
    const pathParts = documentPath.split(/[\/\\]/).filter(part => part.length > 0);
    const sanitizedParts = pathParts.map(part => this.sanitizeFilename(part));

    // Join collection name with sanitized document path
    return [sanitizedCollection, ...sanitizedParts].join('/');
  }

  /**
   * Escape special characters in YAML values to prevent injection
   *
   * This method ensures that string values used in YAML frontmatter are
   * properly escaped to prevent syntax errors or security issues. It wraps
   * values containing special YAML characters in quotes and escapes any
   * quotes or backslashes within the value.
   *
   * Special YAML characters that trigger escaping:
   * : # [ ] { } & * ! | > ' " % @ `
   *
   * Also escapes values that start with - or ? as these have special meaning in YAML.
   *
   * @param {any} value - The value to escape (typically a string)
   * @returns {any} Escaped value safe for use in YAML, or original value if not a string
   *
   * @example
   * escapeYaml('Simple Title')
   * // Returns: 'Simple Title'
   *
   * @example
   * escapeYaml('Title: With Colon')
   * // Returns: '"Title: With Colon"'
   *
   * @example
   * escapeYaml('Path with "quotes"')
   * // Returns: '"Path with \\"quotes\\""'
   *
   * @example
   * escapeYaml('- List Item')
   * // Returns: '"- List Item"'
   */
  escapeYaml(value) {
    // Only escape string values
    if (typeof value !== 'string') {
      return value;
    }

    // If the value contains special YAML characters, wrap in quotes and escape quotes
    if (/[:#\[\]{}&*!|>'\"%@`]/.test(value) || value.startsWith('-') || value.startsWith('?')) {
      // Escape backslashes first, then quotes
      const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      return `"${escaped}"`;
    }

    return value;
  }

  /**
   * Cria o diretório do documento se ele tiver filhos
   *
   * @private
   * @param {object} doc - Objeto do documento
   * @param {string} collectionName - Nome da coleção
   * @param {string} currentDir - Diretório atual
   * @returns {Promise<string>} Caminho do diretório criado
   */
  async _createDocumentDirectory(doc, collectionName, currentDir) {
    const sanitizedTitle = this.sanitizeFilename(doc.title);
    const subfolderPath = currentDir
      ? `${currentDir}/${sanitizedTitle}`
      : this.sanitizePath(collectionName, sanitizedTitle);

    await this.fileManager.ensureDir(subfolderPath);
    this.logger.debug(`Created subfolder: ${subfolderPath}`);

    return subfolderPath;
  }

  /**
   * Gera nome de arquivo sanitizado com sufixo de ID
   *
   * @private
   * @param {object} doc - Objeto do documento
   * @returns {string} Nome do arquivo com extensão .md
   */
  _generateDocumentFilename(doc) {
    const sanitizedTitle = this.sanitizeFilename(doc.title);
    const docIdSuffix = doc.id.substring(0, 8);
    return `${sanitizedTitle}-${docIdSuffix}.md`;
  }

  /**
   * Cria o conteúdo markdown do documento com frontmatter
   *
   * @private
   * @param {object} doc - Dados do documento da API
   * @returns {string} Markdown completo com frontmatter
   */
  _createDocumentMarkdown(doc) {
    return this._generateMarkdown(doc);
  }

  /**
   * Escreve o arquivo do documento com tratamento de erro
   *
   * @private
   * @param {string} filePath - Caminho completo do arquivo
   * @param {string} content - Conteúdo do arquivo
   * @returns {Promise<void>}
   */
  async _writeDocumentFile(filePath, content) {
    await this.fileManager.writeFile(filePath, content);
    this.logger.info(`Saved: ${filePath}`);
  }

  /**
   * Baixa documentos filhos recursivamente
   *
   * @private
   * @param {Array} children - Array de documentos filhos
   * @param {string} parentDir - Diretório pai
   * @param {string} collectionName - Nome da coleção
   * @param {object} stats - Objeto de estatísticas a ser atualizado
   * @returns {Promise<void>}
   */
  async _downloadChildDocuments(children, parentDir, collectionName, stats) {
    for (const child of children) {
      const childStats = await this.downloadDocument(child, collectionName, parentDir);

      // Agregação de estatísticas dos downloads filhos
      stats.success += childStats.success;
      stats.failed += childStats.failed;
      stats.errors.push(...childStats.errors);

      // Aplica delay configurável para evitar rate limiting
      if (this.config.delay && this.config.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, this.config.delay));
      }
    }
  }

  /**
   * Download a single document and save it as markdown with frontmatter
   *
   * This method handles the complete process of downloading a document,
   * including creating necessary directories, generating markdown with
   * YAML frontmatter, and recursively processing child documents.
   *
   * Features:
   * - Fetches document content using getDocumentContent()
   * - Creates subdirectories for documents with children
   * - Generates markdown files with YAML frontmatter (title, id, dates, parent)
   * - Adds document ID suffix to filenames to prevent collisions
   * - Recursively processes child documents maintaining folder hierarchy
   * - Tracks statistics (success/failure counts) for monitoring
   * - Handles errors gracefully without breaking the entire download
   *
   * @param {object} document - The document object from Outline API
   * @param {string} document.id - The unique document ID
   * @param {string} document.title - The document title
   * @param {Array} [document.children] - Optional array of child documents
   * @param {string} collectionName - The collection name (used for path sanitization)
   * @param {string} [parentPath=''] - The parent directory path (for nested documents)
   * @returns {Promise<object>} Statistics object with success/failed counts and errors
   *
   * @example
   * const stats = await service.downloadDocument(
   *   { id: 'abc123', title: 'My Doc', children: [] },
   *   'Engineering',
   *   'docs/engineering'
   * );
   * // Returns: { success: 1, failed: 0, errors: [] }
   *
   * @example
   * // Document with children creates a subfolder
   * const stats = await service.downloadDocument(
   *   { id: 'xyz789', title: 'Parent Doc', children: [childDoc1, childDoc2] },
   *   'Engineering',
   *   'docs/engineering'
   * );
   * // Creates: docs/engineering/parent-doc/parent-doc-xyz789.md
   * // And processes children inside: docs/engineering/parent-doc/
   */
  async downloadDocument(document, collectionName, parentPath = '') {
    try {
      // Busca o conteúdo completo do documento da API
      const content = await this.getDocumentContent(document.id);

      // Inicializa rastreamento de estatísticas
      const stats = { success: 1, failed: 0, errors: [] };

      // Se o documento tem filhos, cria um subdiretório para ele
      if (document.children && document.children.length > 0) {
        const subfolderPath = await this._createDocumentDirectory(document, collectionName, parentPath);
        const filename = this._generateDocumentFilename(document);
        const filepath = `${subfolderPath}/${filename}`;

        const markdown = this._createDocumentMarkdown(content);
        await this._writeDocumentFile(filepath, markdown);

        // Processa documentos filhos recursivamente no mesmo subdiretório
        await this._downloadChildDocuments(document.children, subfolderPath, collectionName, stats);
      } else {
        // Sem filhos - apenas salva o documento no diretório atual
        const basePath = parentPath || this.sanitizePath(collectionName);
        await this.fileManager.ensureDir(basePath);

        const filename = this._generateDocumentFilename(document);
        const filepath = `${basePath}/${filename}`;

        const markdown = this._createDocumentMarkdown(content);
        await this._writeDocumentFile(filepath, markdown);
      }

      return stats;
    } catch (error) {
      // Trata erros graciosamente - loga mas não quebra o processo inteiro de download
      this.logger.error(`Error downloading document "${document.title}": ${error.message}`);

      return {
        success: 0,
        failed: 1,
        errors: [{ title: document.title, error: error.message }]
      };
    }
  }

  /**
   * Process a document tree recursively and download all documents
   *
   * This method processes an array of documents (typically from a collection)
   * and downloads each one while maintaining the hierarchical structure.
   * It's the main orchestration method for downloading entire collections.
   *
   * Features:
   * - Recursively processes document hierarchy
   * - Downloads each document maintaining folder structure
   * - Processes child documents with updated paths
   * - Tracks aggregate statistics across all documents
   * - Handles errors without stopping the entire process
   *
   * @param {Array} documents - Array of document objects to process
   * @param {string} collectionName - The collection name (used for base path)
   * @param {string} [parentPath=''] - The parent directory path (for nested documents)
   * @returns {Promise<object>} Aggregate statistics with success/failed counts and errors
   *
   * @example
   * const documents = await service.getCollectionDocuments('collection-id');
   * const stats = await service.processDocumentTree(documents, 'Engineering');
   * console.log(`Downloaded ${stats.success} documents, ${stats.failed} failed`);
   * // Returns: { success: 15, failed: 2, errors: [...] }
   */
  async processDocumentTree(documents, collectionName, parentPath = '') {
    // Initialize aggregate statistics
    const stats = {
      success: 0,
      failed: 0,
      errors: []
    };

    // Process each document in the tree
    for (const document of documents) {
      const docStats = await this.downloadDocument(document, collectionName, parentPath);

      // Aggregate statistics from each document download
      stats.success += docStats.success;
      stats.failed += docStats.failed;
      stats.errors.push(...docStats.errors);

      // Apply configurable delay between documents to avoid rate limiting
      if (this.config.delay && this.config.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, this.config.delay));
      }
    }

    return stats;
  }

  /**
   * Filtra coleções baseado em array de IDs
   *
   * @private
   * @param {Array} collections - Array de todas as coleções
   * @param {Array<string>} filterIds - Array de IDs para filtrar
   * @returns {Array} Coleções filtradas
   */
  _filterCollections(collections, filterIds) {
    if (!filterIds || filterIds.length === 0) {
      return collections;
    }

    const originalCount = collections.length;
    const filtered = collections.filter(c => filterIds.includes(c.id));
    this.logger.info(`Filtradas ${filtered.length} de ${originalCount} coleções`);

    return filtered;
  }

  /**
   * Constrói cache de árvores de coleções e conta documentos (primeiro passo)
   *
   * @private
   * @param {Array} collections - Array de coleções
   * @returns {Promise<object>} Objeto com collectionTrees Map e totalDocuments count
   */
  async _buildCollectionTreeCache(collections) {
    const collectionTrees = new Map();
    let totalDocuments = 0;

    this.logger.info('Contando documentos...');

    for (const collection of collections) {
      try {
        const tree = await this.getCollectionDocuments(collection.id);
        // Armazena a árvore no cache para reutilização no segundo passo
        collectionTrees.set(collection.id, tree);
        this.logger.debug(`Árvore de documentos armazenada em cache para coleção "${collection.name}"`);

        const docCount = this._countDocuments(tree);
        totalDocuments += docCount;
        this.logger.debug(`Coleção "${collection.name}": ${docCount} documentos`);
      } catch (error) {
        this.logger.error(`Erro ao contar documentos da coleção "${collection.name}": ${error.message}`);
      }
    }

    this.logger.info(`Total de documentos a baixar: ${totalDocuments}`);

    return { collectionTrees, totalDocuments };
  }

  /**
   * Baixa documentos de um lote de coleções (segundo passo)
   *
   * @private
   * @param {Array} collections - Array de coleções
   * @param {Map} collectionTrees - Cache de árvores de documentos
   * @param {string} outputDir - Diretório de saída base
   * @param {object} results - Objeto de resultados a ser atualizado
   * @returns {Promise<void>}
   */
  async _downloadCollectionBatch(collections, collectionTrees, outputDir, results) {
    let processedCollections = 0;

    for (const collection of collections) {
      processedCollections++;

      try {
        this.logger.info(`[${processedCollections}/${collections.length}] Processando coleção: ${collection.name}`);

        // Obtém informações da coleção para metadados adicionais
        const collectionInfo = await this.getCollection(collection.id);

        // Cria diretório para esta coleção
        const collectionPath = this.sanitizePath(collection.name);
        const collectionDir = `${outputDir}/${collectionPath}`;
        await this.fileManager.ensureDir(collectionDir);
        this.logger.debug(`Criado diretório da coleção: ${collectionDir}`);

        // Recupera a árvore do cache ao invés de fazer nova chamada de API
        const tree = collectionTrees.get(collection.id);

        // Se não houver árvore no cache (erro no primeiro passo), pula esta coleção
        if (!tree) {
          this.logger.warn(`Árvore de documentos não encontrada em cache para coleção "${collection.name}", pulando...`);
          continue;
        }

        this.logger.debug(`Árvore de documentos recuperada do cache para coleção "${collection.name}"`);

        // Inicializa estatísticas no nível da coleção
        const collectionResults = {
          name: collection.name,
          id: collection.id,
          total: 0,
          success: 0,
          failed: 0
        };

        // Processa árvore de documentos para esta coleção
        const collectionStats = await this.processDocumentTree(tree, collection.name);

        // Atualiza estatísticas da coleção
        collectionResults.success = collectionStats.success;
        collectionResults.failed = collectionStats.failed;
        collectionResults.total = collectionStats.success + collectionStats.failed;

        // Atualiza estatísticas globais
        results.totalDocs += collectionResults.total;
        results.success += collectionStats.success;
        results.failed += collectionStats.failed;

        // Adiciona erros específicos da coleção à lista global de erros
        collectionStats.errors.forEach(err => {
          results.errors.push({
            collection: collection.name,
            ...err
          });
        });

        // Adiciona resultados da coleção ao resumo
        results.collections.push(collectionResults);

        this.logger.info(
          `Coleção "${collection.name}" concluída: ` +
          `${collectionResults.success} sucesso, ${collectionResults.failed} falhas`
        );

      } catch (error) {
        // Trata erros no nível da coleção graciosamente - loga mas continua com outras coleções
        this.logger.error(`Erro ao processar coleção "${collection.name}": ${error.message}`);

        results.errors.push({
          collection: collection.name,
          title: 'Processamento da Coleção',
          error: error.message
        });

        // Adiciona coleção falhada aos resultados com estatísticas zeradas
        results.collections.push({
          name: collection.name,
          id: collection.id,
          total: 0,
          success: 0,
          failed: 0
        });
      }
    }
  }

  /**
   * Gera estatísticas finais do download
   *
   * @private
   * @param {object} results - Objeto de resultados
   * @param {Array} collections - Array de coleções
   * @param {number} startTime - Timestamp de início
   * @param {string} outputDir - Diretório de saída
   * @returns {void}
   */
  _generateDownloadStats(results, collections, startTime, outputDir) {
    // Calcula tempo decorrido
    const elapsed = Date.now() - startTime;
    const elapsedSeconds = (elapsed / 1000).toFixed(2);

    // Loga resumo final
    this.logger.info('='.repeat(60));
    this.logger.info('Resumo do Download:');
    this.logger.info(`  Coleções: ${collections.length}`);
    this.logger.info(`  Total de Documentos: ${results.totalDocs}`);
    this.logger.info(`  Sucesso: ${results.success}`);
    this.logger.info(`  Falhas: ${results.failed}`);
    this.logger.info(`  Tempo decorrido: ${elapsedSeconds}s`);
    this.logger.info(`  Diretório de saída: ${outputDir}`);

    // Loga erros se ocorreram
    if (results.errors.length > 0) {
      this.logger.warn(`Total de erros: ${results.errors.length}`);
      results.errors.forEach(({ collection, title, error }) => {
        this.logger.error(`  - [${collection}] ${title}: ${error}`);
      });
    }

    this.logger.info('='.repeat(60));
  }

  /**
   * Download all documents from Outline with complete orchestration
   *
   * This is the main entry point for downloading all Outline documentation.
   * It orchestrates the entire download process including:
   * - Listing and filtering collections
   * - Creating output directory structure
   * - Processing each collection with its document tree
   * - Tracking global statistics and progress
   * - Handling errors gracefully (continue if one collection fails)
   *
   * The method implements a two-pass approach:
   * 1. First pass: Count all documents for progress tracking
   * 2. Second pass: Download all documents
   *
   * @param {string} outputDir - The base output directory for all downloads
   * @param {Array<string>} [collectionFilter=[]] - Optional array of collection IDs to filter
   * @returns {Promise<object>} Summary object with comprehensive statistics
   * @returns {number} return.totalDocs - Total number of documents processed
   * @returns {number} return.success - Number of successfully downloaded documents
   * @returns {number} return.failed - Number of failed downloads
   * @returns {Array} return.errors - Array of error objects with details
   * @returns {Array} return.collections - Per-collection statistics
   * @throws {TypeError} If outputDir is not a string or collectionFilter is not an array
   * @throws {Error} If outputDir is empty
   *
   * @example
   * const summary = await service.downloadAllDocuments('./docs');
   * console.log(`Downloaded ${summary.success} of ${summary.totalDocs} documents`);
   * // Returns: { totalDocs: 50, success: 48, failed: 2, errors: [...], collections: [...] }
   *
   * @example
   * // Filter specific collections
   * const summary = await service.downloadAllDocuments('./docs', ['collection-id-1', 'collection-id-2']);
   */
  async downloadAllDocuments(outputDir, collectionFilter = []) {
    // Validação de parâmetros
    if (!outputDir || typeof outputDir !== 'string') {
      throw new TypeError('outputDir é obrigatório e deve ser uma string');
    }

    if (outputDir.trim().length === 0) {
      throw new Error('outputDir não pode ser vazio');
    }

    if (!Array.isArray(collectionFilter)) {
      throw new TypeError('collectionFilter deve ser um array');
    }

    try {
      // Rastreia tempo de início para métricas de desempenho
      const startTime = Date.now();

      this.logger.info('Iniciando download de documentação do Outline com hierarquia completa...');

      // Garante que o diretório de saída existe
      await this.fileManager.ensureDir(outputDir);

      // Obtém todas as coleções (spaces) do Outline
      let collections = await this.listCollections();
      this.logger.info(`Encontradas ${collections.length} coleção(ões)`);

      // Aplica filtro de coleções se fornecido
      collections = this._filterCollections(collections, collectionFilter);

      // Trata caso onde nenhuma coleção foi encontrada
      if (collections.length === 0) {
        this.logger.warn('Nenhuma coleção encontrada ou nenhuma coleção corresponde ao filtro.');
        return {
          totalDocs: 0,
          success: 0,
          failed: 0,
          errors: [],
          collections: []
        };
      }

      // Inicializa objeto de resultados globais
      const results = {
        totalDocs: 0,
        success: 0,
        failed: 0,
        errors: [],
        collections: []
      };

      // Primeiro passo: conta todos os documentos e constrói cache
      const { collectionTrees, totalDocuments } = await this._buildCollectionTreeCache(collections);

      // Inicializa rastreamento de progresso se o logger suportar
      if (this.logger.startProgress) {
        this.logger.startProgress(totalDocuments, 'Baixando documentos do Outline');
      }

      // Segundo passo: baixa documentos de cada coleção
      await this._downloadCollectionBatch(collections, collectionTrees, outputDir, results);

      // Completa rastreamento de progresso se o logger suportar
      if (this.logger.completeProgress) {
        this.logger.completeProgress('Download concluído');
      }

      // Gera e loga estatísticas finais
      this._generateDownloadStats(results, collections, startTime, outputDir);

      return results;

    } catch (error) {
      this.logger.error(`Erro fatal durante o download: ${error.message}`);
      throw error;
    }
  }

  /**
   * Count total documents in a document tree recursively
   *
   * This is a helper method to count all documents including nested children
   * for progress tracking purposes.
   *
   * @private
   * @param {Array} docTree - Array of document objects (may contain children)
   * @returns {number} Total count of documents in the tree
   */
  _countDocuments(docTree) {
    let count = 0;

    for (const doc of docTree) {
      // Count this document
      count += 1;

      // Recursively count children if they exist
      if (doc.children && doc.children.length > 0) {
        count += this._countDocuments(doc.children);
      }
    }

    return count;
  }

  /**
   * Generate markdown content with YAML frontmatter from document data
   *
   * This is a private helper method that creates properly formatted markdown
   * with YAML frontmatter containing document metadata.
   *
   * Frontmatter includes:
   * - title: Document title (escaped for YAML)
   * - id: Document unique identifier
   * - created: Creation timestamp
   * - updated: Last update timestamp
   * - parent: Parent document ID (if exists)
   *
   * @private
   * @param {object} document - The document data from Outline API
   * @param {string} document.title - Document title
   * @param {string} document.id - Document ID
   * @param {string} document.createdAt - Creation timestamp
   * @param {string} document.updatedAt - Update timestamp
   * @param {string} [document.parentDocumentId] - Parent document ID (optional)
   * @param {string} document.text - Document markdown content
   * @returns {string} Complete markdown with frontmatter
   */
  _generateMarkdown(document) {
    // Build YAML frontmatter with escaped values
    const frontmatter = [
      '---',
      `title: ${this.escapeYaml(document.title)}`,
      `id: ${document.id}`,
      `created: ${document.createdAt}`,
      `updated: ${document.updatedAt}`
    ];

    // Add parent document ID if it exists
    if (document.parentDocumentId) {
      frontmatter.push(`parent: ${document.parentDocumentId}`);
    }

    frontmatter.push('---');

    // Combine frontmatter and document content
    return `${frontmatter.join('\n')}\n\n${document.text}`;
  }
}

module.exports = OutlineService;
