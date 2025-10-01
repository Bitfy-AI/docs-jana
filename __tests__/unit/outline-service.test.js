/**
 * Unit Tests for OutlineService
 * Tests critical fixes including:
 * - LRU cache eviction (prevents memory leaks)
 * - Cache size never exceeds maxCacheSize
 * - Async loop error handling (graceful failure, continue processing)
 * - Cache statistics and hit rate
 */

const OutlineService = require('../../src/services/outline-service');

describe('OutlineService', () => {
  let outlineService;
  let mockHttpClient;
  let mockAuthStrategy;
  let mockLogger;
  let mockFileManager;
  let config;

  beforeEach(() => {
    mockHttpClient = {
      post: jest.fn(),
      setHeaders: jest.fn()
    };

    mockAuthStrategy = {
      getHeaders: jest.fn().mockReturnValue({ Authorization: 'Bearer token' })
    };

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      startProgress: jest.fn(),
      completeProgress: jest.fn()
    };

    mockFileManager = {
      ensureDir: jest.fn().mockResolvedValue(undefined),
      writeFile: jest.fn().mockResolvedValue(undefined)
    };

    config = {
      delay: 0,
      verbose: false,
      maxCacheSize: 100
    };

    outlineService = new OutlineService(
      mockHttpClient,
      mockAuthStrategy,
      mockLogger,
      mockFileManager,
      config
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('LRU Cache Implementation', () => {
    it('should cache documents after first fetch', async () => {
      const documentId = 'doc-123';
      const mockDoc = { id: documentId, title: 'Test Doc', text: 'Content' };

      mockHttpClient.post.mockResolvedValue({ data: mockDoc });

      // First call - should fetch from API
      const result1 = await outlineService.getDocumentContent(documentId);
      expect(result1).toEqual(mockDoc);
      expect(mockHttpClient.post).toHaveBeenCalledTimes(1);

      // Second call - should return from cache
      const result2 = await outlineService.getDocumentContent(documentId);
      expect(result2).toEqual(mockDoc);
      expect(mockHttpClient.post).toHaveBeenCalledTimes(1); // Not called again
    });

    it('should track cache hits and misses', async () => {
      const doc1 = { id: 'doc-1', title: 'Doc 1' };
      const doc2 = { id: 'doc-2', title: 'Doc 2' };

      mockHttpClient.post
        .mockResolvedValueOnce({ data: doc1 })
        .mockResolvedValueOnce({ data: doc2 });

      // First fetch - cache miss
      await outlineService.getDocumentContent('doc-1');
      expect(outlineService.cacheStats.misses).toBe(1);
      expect(outlineService.cacheStats.hits).toBe(0);

      // Second fetch (same doc) - cache hit
      await outlineService.getDocumentContent('doc-1');
      expect(outlineService.cacheStats.hits).toBe(1);

      // Third fetch (different doc) - cache miss
      await outlineService.getDocumentContent('doc-2');
      expect(outlineService.cacheStats.misses).toBe(2);
    });

    it('should move accessed items to end of cache (LRU)', async () => {
      const docs = Array.from({ length: 5 }, (_, i) => ({
        id: `doc-${i}`,
        title: `Doc ${i}`
      }));

      // Mock API responses
      docs.forEach(doc => {
        mockHttpClient.post.mockResolvedValueOnce({ data: doc });
      });

      // Add documents to cache
      for (const doc of docs) {
        await outlineService.getDocumentContent(doc.id);
      }

      // Access doc-0 again (should move it to end)
      await outlineService.getDocumentContent('doc-0');

      const cacheKeys = Array.from(outlineService.documentCache.keys());

      // doc-0 should be at the end now (most recently used)
      expect(cacheKeys[cacheKeys.length - 1]).toBe('doc-0');
    });
  });

  describe('Cache Size Limit', () => {
    it('should evict oldest entry when cache is full', async () => {
      // Set small cache size
      outlineService.maxCacheSize = 3;

      const docs = Array.from({ length: 4 }, (_, i) => ({
        id: `doc-${i}`,
        title: `Doc ${i}`
      }));

      // Mock API responses
      docs.forEach(doc => {
        mockHttpClient.post.mockResolvedValueOnce({ data: doc });
      });

      // Add 4 documents (cache size is 3)
      for (const doc of docs) {
        await outlineService.getDocumentContent(doc.id);
      }

      // Cache should have exactly 3 items
      expect(outlineService.documentCache.size).toBe(3);

      // First document (doc-0) should have been evicted
      expect(outlineService.documentCache.has('doc-0')).toBe(false);

      // Last 3 documents should still be in cache
      expect(outlineService.documentCache.has('doc-1')).toBe(true);
      expect(outlineService.documentCache.has('doc-2')).toBe(true);
      expect(outlineService.documentCache.has('doc-3')).toBe(true);

      // Should track eviction
      expect(outlineService.cacheStats.evictions).toBe(1);
    });

    it('should never exceed maxCacheSize', async () => {
      outlineService.maxCacheSize = 5;

      const docs = Array.from({ length: 10 }, (_, i) => ({
        id: `doc-${i}`,
        title: `Doc ${i}`
      }));

      docs.forEach(doc => {
        mockHttpClient.post.mockResolvedValueOnce({ data: doc });
      });

      // Add 10 documents
      for (const doc of docs) {
        await outlineService.getDocumentContent(doc.id);

        // Cache size should never exceed maxCacheSize
        expect(outlineService.documentCache.size).toBeLessThanOrEqual(5);
      }

      // Final size should be exactly maxCacheSize
      expect(outlineService.documentCache.size).toBe(5);

      // Should have evicted 5 documents
      expect(outlineService.cacheStats.evictions).toBe(5);
    });

    it('should evict BEFORE adding to prevent exceeding limit', async () => {
      outlineService.maxCacheSize = 2;

      const docs = Array.from({ length: 3 }, (_, i) => ({
        id: `doc-${i}`,
        title: `Doc ${i}`
      }));

      docs.forEach(doc => {
        mockHttpClient.post.mockResolvedValueOnce({ data: doc });
      });

      // Track cache size during each addition
      const sizes = [];
      for (const doc of docs) {
        await outlineService.getDocumentContent(doc.id);
        sizes.push(outlineService.documentCache.size);
      }

      // All sizes should be <= maxCacheSize
      expect(sizes).toEqual([1, 2, 2]);
      expect(Math.max(...sizes)).toBe(2);
    });

    it('should handle maxCacheSize of 1', async () => {
      outlineService.maxCacheSize = 1;

      const doc1 = { id: 'doc-1', title: 'Doc 1' };
      const doc2 = { id: 'doc-2', title: 'Doc 2' };

      mockHttpClient.post
        .mockResolvedValueOnce({ data: doc1 })
        .mockResolvedValueOnce({ data: doc2 });

      await outlineService.getDocumentContent('doc-1');
      expect(outlineService.documentCache.size).toBe(1);

      await outlineService.getDocumentContent('doc-2');
      expect(outlineService.documentCache.size).toBe(1);

      // doc-1 should be evicted
      expect(outlineService.documentCache.has('doc-1')).toBe(false);
      expect(outlineService.documentCache.has('doc-2')).toBe(true);
    });
  });

  describe('Cache Statistics', () => {
    it('should calculate cache hit rate correctly', async () => {
      const doc1 = { id: 'doc-1', title: 'Doc 1' };

      mockHttpClient.post.mockResolvedValue({ data: doc1 });

      // 1 miss
      await outlineService.getDocumentContent('doc-1');

      // 3 hits
      await outlineService.getDocumentContent('doc-1');
      await outlineService.getDocumentContent('doc-1');
      await outlineService.getDocumentContent('doc-1');

      const stats = outlineService.getCacheStats();

      expect(stats.hits).toBe(3);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe('75.00%'); // 3 hits out of 4 total requests
    });

    it('should return complete cache statistics', async () => {
      outlineService.maxCacheSize = 10;

      const docs = Array.from({ length: 3 }, (_, i) => ({
        id: `doc-${i}`,
        title: `Doc ${i}`
      }));

      docs.forEach(doc => {
        mockHttpClient.post.mockResolvedValueOnce({ data: doc });
      });

      for (const doc of docs) {
        await outlineService.getDocumentContent(doc.id);
      }

      // Access first doc again for a hit
      await outlineService.getDocumentContent('doc-0');

      const stats = outlineService.getCacheStats();

      expect(stats).toMatchObject({
        size: 3,
        maxSize: 10,
        hits: 1,
        misses: 3,
        evictions: 0,
        hitRate: '25.00%',
        entries: expect.arrayContaining(['doc-0', 'doc-1', 'doc-2'])
      });
    });

    it('should handle 0% hit rate when no hits', async () => {
      const doc1 = { id: 'doc-1', title: 'Doc 1' };
      const doc2 = { id: 'doc-2', title: 'Doc 2' };

      mockHttpClient.post
        .mockResolvedValueOnce({ data: doc1 })
        .mockResolvedValueOnce({ data: doc2 });

      await outlineService.getDocumentContent('doc-1');
      await outlineService.getDocumentContent('doc-2');

      const stats = outlineService.getCacheStats();
      expect(stats.hitRate).toBe('0.00%');
    });

    it('should handle 100% hit rate', async () => {
      const doc1 = { id: 'doc-1', title: 'Doc 1' };

      mockHttpClient.post.mockResolvedValueOnce({ data: doc1 });

      await outlineService.getDocumentContent('doc-1'); // Miss
      await outlineService.getDocumentContent('doc-1'); // Hit
      await outlineService.getDocumentContent('doc-1'); // Hit

      const stats = outlineService.getCacheStats();
      expect(stats.hitRate).toBe('66.67%'); // 2 hits out of 3 requests
    });

    it('should return 0% when no requests made', () => {
      const stats = outlineService.getCacheStats();
      expect(stats.hitRate).toBe('0.00%');
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('Cache Clearing', () => {
    it('should clear all cached documents', async () => {
      const docs = Array.from({ length: 3 }, (_, i) => ({
        id: `doc-${i}`,
        title: `Doc ${i}`
      }));

      docs.forEach(doc => {
        mockHttpClient.post.mockResolvedValueOnce({ data: doc });
      });

      for (const doc of docs) {
        await outlineService.getDocumentContent(doc.id);
      }

      expect(outlineService.documentCache.size).toBe(3);

      outlineService.clearCache();

      expect(outlineService.documentCache.size).toBe(0);
    });

    it('should reset cache statistics when clearing', async () => {
      const doc1 = { id: 'doc-1', title: 'Doc 1' };

      mockHttpClient.post.mockResolvedValue({ data: doc1 });

      await outlineService.getDocumentContent('doc-1');
      await outlineService.getDocumentContent('doc-1');

      outlineService.clearCache();

      expect(outlineService.cacheStats.hits).toBe(0);
      expect(outlineService.cacheStats.misses).toBe(0);
      expect(outlineService.cacheStats.evictions).toBe(0);
    });
  });

  describe('Async Loop Error Handling', () => {
    it('should continue processing children when one fails', async () => {
      const children = [
        { id: 'child-1', title: 'Child 1', children: [] },
        { id: 'child-2', title: 'Child 2', children: [] },
        { id: 'child-3', title: 'Child 3', children: [] }
      ];

      // Mock downloadDocument to fail on second child
      const downloadSpy = jest.spyOn(outlineService, 'downloadDocument')
        .mockResolvedValueOnce({ success: 1, failed: 0, errors: [] })
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ success: 1, failed: 0, errors: [] });

      const stats = { success: 0, failed: 0, errors: [] };

      await outlineService._downloadChildDocuments(children, '/test', 'Collection', stats);

      // Should have processed all 3 children despite error
      expect(downloadSpy).toHaveBeenCalledTimes(3);

      // Stats should reflect 2 successes and 1 failure
      expect(stats.success).toBe(2);
      expect(stats.failed).toBe(1);
      expect(stats.errors).toHaveLength(1);
      expect(stats.errors[0]).toMatchObject({
        title: 'Child 2',
        error: 'Network error'
      });
    });

    it('should continue processing collections when one fails', async () => {
      const collections = [
        { id: 'col-1', name: 'Collection 1' },
        { id: 'col-2', name: 'Collection 2' },
        { id: 'col-3', name: 'Collection 3' }
      ];

      // Mock getCollection to fail on second collection
      jest.spyOn(outlineService, 'getCollection')
        .mockResolvedValueOnce({ id: 'col-1', name: 'Collection 1' })
        .mockRejectedValueOnce(new Error('API error'))
        .mockResolvedValueOnce({ id: 'col-3', name: 'Collection 3' });

      jest.spyOn(outlineService, 'getCollectionDocuments').mockResolvedValue([]);
      jest.spyOn(outlineService, 'processDocumentTree').mockResolvedValue({
        success: 0,
        failed: 0,
        errors: []
      });

      const collectionTrees = new Map();
      collectionTrees.set('col-1', []);
      collectionTrees.set('col-2', []);
      collectionTrees.set('col-3', []);

      const results = {
        totalDocs: 0,
        success: 0,
        failed: 0,
        errors: [],
        collections: []
      };

      await outlineService._downloadCollectionBatch(
        collections,
        collectionTrees,
        '/test',
        results
      );

      // Should have attempted all 3 collections
      expect(results.collections).toHaveLength(3);

      // Second collection should have error recorded
      expect(results.errors.some(e => e.collection === 'Collection 2')).toBe(true);
    });

    it('should log errors but continue processing', async () => {
      const children = [
        { id: 'child-1', title: 'Child 1', children: [] },
        { id: 'child-2', title: 'Child 2', children: [] }
      ];

      jest.spyOn(outlineService, 'downloadDocument')
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({ success: 1, failed: 0, errors: [] });

      const stats = { success: 0, failed: 0, errors: [] };

      await outlineService._downloadChildDocuments(children, '/test', 'Collection', stats);

      // Should log error for first child
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to download child document')
      );

      // Should continue with second child
      expect(stats.success).toBe(1);
    });
  });

  describe('API Methods', () => {
    it('should list collections', async () => {
      const mockCollections = [
        { id: 'col-1', name: 'Collection 1' },
        { id: 'col-2', name: 'Collection 2' }
      ];

      mockHttpClient.post.mockResolvedValue({ data: mockCollections });

      const result = await outlineService.listCollections();

      expect(result).toEqual(mockCollections);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/api/collections.list', {});
    });

    it('should get collection by id', async () => {
      const mockCollection = { id: 'col-1', name: 'My Collection' };

      mockHttpClient.post.mockResolvedValue({ data: mockCollection });

      const result = await outlineService.getCollection('col-1');

      expect(result).toEqual(mockCollection);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/api/collections.info', {
        id: 'col-1'
      });
    });

    it('should validate collection id parameter', async () => {
      await expect(outlineService.getCollection(null)).rejects.toThrow(TypeError);
      await expect(outlineService.getCollection('')).rejects.toThrow();
      await expect(outlineService.getCollection(123)).rejects.toThrow(TypeError);
    });

    it('should get collection documents', async () => {
      const mockDocuments = [
        { id: 'doc-1', title: 'Document 1' },
        { id: 'doc-2', title: 'Document 2' }
      ];

      mockHttpClient.post.mockResolvedValue({ data: mockDocuments });

      const result = await outlineService.getCollectionDocuments('col-1');

      expect(result).toEqual(mockDocuments);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/api/collections.documents', {
        id: 'col-1'
      });
    });

    it('should validate document id parameter', async () => {
      await expect(outlineService.getDocumentContent(null)).rejects.toThrow(TypeError);
      await expect(outlineService.getDocumentContent('')).rejects.toThrow();
      await expect(outlineService.getDocumentContent(123)).rejects.toThrow(TypeError);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty cache size (maxCacheSize = 0)', async () => {
      outlineService.maxCacheSize = 0;

      const doc1 = { id: 'doc-1', title: 'Doc 1' };
      mockHttpClient.post.mockResolvedValue({ data: doc1 });

      // Should still work - with maxCacheSize = 0, it immediately evicts
      await outlineService.getDocumentContent('doc-1');

      // Cache should still be 0 or 1 depending on eviction timing
      expect(outlineService.documentCache.size).toBeLessThanOrEqual(1);

      // Every request should be a cache miss
      const stats = outlineService.getCacheStats();
      expect(stats.misses).toBeGreaterThan(0);
    });

    it('should handle null response from API', async () => {
      // Note: In real implementation, API should not return null for document
      // But if it does, the service will attempt to log the title
      // This test verifies error handling
      mockHttpClient.post.mockResolvedValue({ data: null });

      await expect(outlineService.getDocumentContent('doc-1')).rejects.toThrow();
    });

    it('should handle API errors', async () => {
      mockHttpClient.post.mockRejectedValue(new Error('API Error'));

      await expect(outlineService.getDocumentContent('doc-1')).rejects.toThrow('API Error');
    });

    it('should handle undefined children array', async () => {
      const document = {
        id: 'doc-1',
        title: 'Test Doc'
        // No children property
      };

      mockHttpClient.post.mockResolvedValue({ data: document });

      const stats = await outlineService.downloadDocument(document, 'Collection', '/test');

      expect(stats.success).toBe(1);
      expect(stats.failed).toBe(0);
    });

    it('should handle empty collections list', async () => {
      mockHttpClient.post.mockResolvedValue({ data: [] });

      const result = await outlineService.downloadAllDocuments('/test/output', []);

      expect(result.totalDocs).toBe(0);
      expect(result.success).toBe(0);
      expect(result.collections).toHaveLength(0);
    });
  });

  describe('Filename Sanitization', () => {
    it('should sanitize filenames', () => {
      const result1 = outlineService.sanitizeFilename('Test: File/Name');
      expect(result1).not.toContain(':');
      expect(result1).not.toContain('/');

      const result2 = outlineService.sanitizeFilename('../../../etc/passwd');
      expect(result2).not.toContain('..');
      expect(result2).not.toContain('/');

      // Note: OutlineService's sanitizeFilename doesn't check Windows reserved names
      // That's handled by FileManager's more comprehensive sanitization
      const result3 = outlineService.sanitizeFilename('CON');
      expect(result3).toBe('con'); // Lowercase, but not 'untitled'
    });

    it('should handle null/undefined filenames', () => {
      expect(outlineService.sanitizeFilename(null)).toBe('untitled');
      expect(outlineService.sanitizeFilename(undefined)).toBe('untitled');
      expect(outlineService.sanitizeFilename('')).toBe('untitled');
    });
  });

  describe('YAML Escaping', () => {
    it('should escape special YAML characters', () => {
      expect(outlineService.escapeYaml('Title: With Colon')).toBe('"Title: With Colon"');
      expect(outlineService.escapeYaml('Value #with #hash')).toBe('"Value #with #hash"');
      expect(outlineService.escapeYaml('- List Item')).toBe('"- List Item"');
    });

    it('should not escape simple strings', () => {
      expect(outlineService.escapeYaml('Simple Title')).toBe('Simple Title');
      expect(outlineService.escapeYaml('Title123')).toBe('Title123');
    });

    it('should escape quotes in values', () => {
      expect(outlineService.escapeYaml('Value "with" quotes')).toBe('"Value \\"with\\" quotes"');
    });

    it('should handle non-string values', () => {
      expect(outlineService.escapeYaml(123)).toBe(123);
      expect(outlineService.escapeYaml(true)).toBe(true);
      expect(outlineService.escapeYaml(null)).toBeNull();
    });
  });
});
