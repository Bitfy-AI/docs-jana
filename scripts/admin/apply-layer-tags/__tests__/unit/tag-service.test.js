/**
 * Unit Tests - TagService
 *
 * Testes para gerenciamento de tags via API n8n.
 * Cobre listagem, criação, aplicação de tags e cache.
 *
 * @module __tests__/unit/tag-service.test
 */

const TagService = require('../../core/services/tag-service');

describe('TagService', () => {
  let tagService;
  let mockHttpClient;
  let mockLogger;

  beforeEach(() => {
    // Mock HttpClient
    mockHttpClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      extractStatusCode: jest.fn(),
      getStats: jest.fn().mockReturnValue({
        totalRequests: 0,
        retriedRequests: 0,
        failedRequests: 0
      })
    };

    // Mock Logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      success: jest.fn()
    };

    tagService = new TagService(mockHttpClient, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with provided HttpClient and Logger', () => {
      expect(tagService.httpClient).toBe(mockHttpClient);
      expect(tagService.logger).toBe(mockLogger);
    });

    it('should initialize cache properties', () => {
      expect(tagService._tagsCache).toBeNull();
      expect(tagService._cacheTimestamp).toBeNull();
      expect(tagService._cacheTTL).toBe(30000); // Default TTL
    });
  });

  describe('listTags', () => {
    describe('cache miss', () => {
      it('should fetch tags from API on first call', async () => {
        const mockTags = [
          { id: '1', name: 'jana', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
          { id: '2', name: 'production', createdAt: '2024-01-02', updatedAt: '2024-01-02' }
        ];

        mockHttpClient.get.mockResolvedValue({ data: mockTags });

        const tags = await tagService.listTags();

        expect(mockHttpClient.get).toHaveBeenCalledWith('/api/v1/tags');
        expect(tags).toEqual(mockTags);
        expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Cache miss'));
        expect(tagService._tagsCache).toEqual(mockTags);
        expect(tagService._cacheTimestamp).toBeTruthy();
      });

      it('should handle API response without data wrapper', async () => {
        const mockTags = [{ id: '1', name: 'jana' }];

        mockHttpClient.get.mockResolvedValue(mockTags); // Direct array

        const tags = await tagService.listTags();

        expect(tags).toEqual(mockTags);
      });
    });

    describe('cache hit', () => {
      it('should return cached tags on second call within TTL', async () => {
        const mockTags = [{ id: '1', name: 'jana' }];

        mockHttpClient.get.mockResolvedValue({ data: mockTags });

        // First call - cache miss
        const tags1 = await tagService.listTags();

        // Reset mocks
        jest.clearAllMocks();

        // Second call - cache hit
        const tags2 = await tagService.listTags();

        expect(mockHttpClient.get).not.toHaveBeenCalled();
        expect(tags2).toEqual(tags1);
        expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Cache hit'));
      });

      it('should log cache age in seconds', async () => {
        const mockTags = [{ id: '1', name: 'jana' }];

        mockHttpClient.get.mockResolvedValue({ data: mockTags });

        // First call
        await tagService.listTags();

        // Wait 1 second
        await new Promise(resolve => setTimeout(resolve, 1100));

        // Second call - should show cache age
        await tagService.listTags();

        const cacheHitCall = mockLogger.debug.mock.calls.find(call =>
          call[0].includes('Cache hit')
        );
        expect(cacheHitCall).toBeTruthy();
        expect(cacheHitCall[0]).toMatch(/idade:\s*\d+s/);
      });
    });

    describe('cache expiration', () => {
      it('should refetch tags after cache TTL expires', async () => {
        const mockTags = [{ id: '1', name: 'jana' }];

        mockHttpClient.get.mockResolvedValue({ data: mockTags });

        // First call
        await tagService.listTags();

        // Manually expire cache
        tagService._cacheTimestamp = Date.now() - (tagService._cacheTTL + 1000);

        jest.clearAllMocks();

        // Second call - cache expired
        await tagService.listTags();

        expect(mockHttpClient.get).toHaveBeenCalledWith('/api/v1/tags');
        expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Cache miss'));
      });
    });

    describe('error handling', () => {
      it('should throw error if API call fails', async () => {
        mockHttpClient.get.mockRejectedValue(new Error('Network error'));

        await expect(tagService.listTags()).rejects.toThrow('Falha ao listar tags');
        expect(mockLogger.error).toHaveBeenCalled();
      });
    });
  });

  describe('checkTagExists', () => {
    it('should return true if tag exists', async () => {
      const mockTags = [
        { id: '1', name: 'jana' },
        { id: '2', name: 'production' }
      ];

      mockHttpClient.get.mockResolvedValue({ data: mockTags });

      const exists = await tagService.checkTagExists('jana');

      expect(exists).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('existe'));
    });

    it('should return false if tag does not exist', async () => {
      const mockTags = [{ id: '1', name: 'jana' }];

      mockHttpClient.get.mockResolvedValue({ data: mockTags });

      const exists = await tagService.checkTagExists('nonexistent');

      expect(exists).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('nao existe'));
    });

    it('should handle empty tags array', async () => {
      mockHttpClient.get.mockResolvedValue({ data: [] });

      const exists = await tagService.checkTagExists('jana');

      expect(exists).toBe(false);
    });

    it('should propagate errors from listTags', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Network error'));

      await expect(tagService.checkTagExists('jana')).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getTagIdByName', () => {
    it('should return tag ID for existing tag', async () => {
      const mockTags = [
        { id: 'abc123', name: 'jana' },
        { id: 'def456', name: 'production' }
      ];

      mockHttpClient.get.mockResolvedValue({ data: mockTags });

      const tagId = await tagService.getTagIdByName('jana');

      expect(tagId).toBe('abc123');
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('encontrada com ID'));
    });

    it('should return null for non-existent tag', async () => {
      const mockTags = [{ id: 'abc123', name: 'jana' }];

      mockHttpClient.get.mockResolvedValue({ data: mockTags });

      const tagId = await tagService.getTagIdByName('nonexistent');

      expect(tagId).toBeNull();
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('nao encontrada'));
    });

    it('should handle empty tags array', async () => {
      mockHttpClient.get.mockResolvedValue({ data: [] });

      const tagId = await tagService.getTagIdByName('jana');

      expect(tagId).toBeNull();
    });
  });

  describe('createTag', () => {
    it('should create new tag successfully', async () => {
      const mockTag = { id: 'abc123', name: 'new-tag', createdAt: '2024-01-01' };

      mockHttpClient.post.mockResolvedValue({ data: mockTag });

      const tag = await tagService.createTag('new-tag');

      expect(mockHttpClient.post).toHaveBeenCalledWith('/api/v1/tags', { name: 'new-tag' });
      expect(tag).toEqual(mockTag);
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Criando tag'));
      expect(mockLogger.success).toHaveBeenCalledWith(expect.stringContaining('criada com sucesso'));
    });

    it('should invalidate cache after creating tag', async () => {
      const mockTag = { id: 'abc123', name: 'new-tag' };

      // Set cache first
      tagService._tagsCache = [{ id: '1', name: 'old' }];
      tagService._cacheTimestamp = Date.now();

      mockHttpClient.post.mockResolvedValue({ data: mockTag });

      await tagService.createTag('new-tag');

      expect(tagService._tagsCache).toBeNull();
      expect(tagService._cacheTimestamp).toBeNull();
    });

    it('should handle 409 Conflict (tag already exists)', async () => {
      const existingTag = { id: 'abc123', name: 'existing-tag' };

      // First call to create tag fails with 409
      mockHttpClient.post.mockRejectedValue(new Error('Conflict'));
      mockHttpClient.extractStatusCode.mockReturnValue(409);

      // Mock getTagIdByName to return existing tag ID
      mockHttpClient.get.mockResolvedValue({ data: [existingTag] });

      const tag = await tagService.createTag('existing-tag');

      expect(tag).toEqual(existingTag);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('ja existe'));
    });

    it('should throw error for other failures', async () => {
      mockHttpClient.post.mockRejectedValue(new Error('Server error'));
      mockHttpClient.extractStatusCode.mockReturnValue(500);

      await expect(tagService.createTag('new-tag')).rejects.toThrow('Falha ao criar tag');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('ensureTagExists', () => {
    it('should return existing tag if found', async () => {
      const existingTag = { id: 'abc123', name: 'jana' };

      mockHttpClient.get.mockResolvedValue({ data: [existingTag] });

      const tag = await tagService.ensureTagExists('jana');

      expect(tag).toEqual(existingTag);
      expect(mockHttpClient.post).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('ja existe'));
    });

    it('should create tag if not found', async () => {
      const newTag = { id: 'abc123', name: 'new-tag' };

      // First call to listTags returns empty
      mockHttpClient.get.mockResolvedValue({ data: [] });

      // createTag creates new tag
      mockHttpClient.post.mockResolvedValue({ data: newTag });

      const tag = await tagService.ensureTagExists('new-tag');

      expect(mockHttpClient.post).toHaveBeenCalledWith('/api/v1/tags', { name: 'new-tag' });
      expect(tag).toEqual(newTag);
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('nao existe, criando'));
    });

    it('should propagate errors', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Network error'));

      await expect(tagService.ensureTagExists('jana')).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('applyTagToWorkflow', () => {
    it('should apply tag to workflow successfully', async () => {
      const mockWorkflow = {
        id: 'workflow123',
        name: 'Test Workflow',
        tags: [{ id: 'tag123', name: 'jana' }]
      };

      mockHttpClient.put.mockResolvedValue({ data: mockWorkflow });

      const workflow = await tagService.applyTagToWorkflow('workflow123', 'tag123');

      expect(mockHttpClient.put).toHaveBeenCalledWith(
        '/api/v1/workflows/workflow123/tags',
        { tagIds: ['tag123'] }
      );
      expect(workflow).toEqual(mockWorkflow);
      expect(mockLogger.success).toHaveBeenCalledWith(expect.stringContaining('sucesso'));
    });

    it('should handle 404 Not Found error', async () => {
      mockHttpClient.put.mockRejectedValue(new Error('Not found'));
      mockHttpClient.extractStatusCode.mockReturnValue(404);

      await expect(
        tagService.applyTagToWorkflow('nonexistent', 'tag123')
      ).rejects.toThrow('nao encontrado (404)');

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('404'));
    });

    it('should handle 401 Unauthorized error', async () => {
      mockHttpClient.put.mockRejectedValue(new Error('Unauthorized'));
      mockHttpClient.extractStatusCode.mockReturnValue(401);

      await expect(
        tagService.applyTagToWorkflow('workflow123', 'tag123')
      ).rejects.toThrow('Credenciais invalidas');

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('401'));
    });

    it('should log warning for 429 Rate Limit', async () => {
      mockHttpClient.put.mockRejectedValue(new Error('Rate limit'));
      mockHttpClient.extractStatusCode.mockReturnValue(429);

      await expect(
        tagService.applyTagToWorkflow('workflow123', 'tag123')
      ).rejects.toThrow();

      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('429'));
    });
  });

  describe('applyMultipleTags', () => {
    it('should apply multiple tags to workflow successfully', async () => {
      const mockWorkflow = {
        id: 'workflow123',
        tags: [
          { id: 'tag1', name: 'jana' },
          { id: 'tag2', name: 'production' },
          { id: 'tag3', name: 'critical' }
        ]
      };

      mockHttpClient.put.mockResolvedValue({ data: mockWorkflow });

      const workflow = await tagService.applyMultipleTags('workflow123', ['tag1', 'tag2', 'tag3']);

      expect(mockHttpClient.put).toHaveBeenCalledWith(
        '/api/v1/workflows/workflow123/tags',
        { tagIds: ['tag1', 'tag2', 'tag3'] }
      );
      expect(workflow).toEqual(mockWorkflow);
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('3 tags'));
      expect(mockLogger.success).toHaveBeenCalledWith(expect.stringContaining('3 tags aplicadas'));
    });

    it('should reject empty tagIds array', async () => {
      await expect(
        tagService.applyMultipleTags('workflow123', [])
      ).rejects.toThrow('array nao vazio');
    });

    it('should reject non-array tagIds', async () => {
      await expect(
        tagService.applyMultipleTags('workflow123', 'not-an-array')
      ).rejects.toThrow('array nao vazio');
    });

    it('should handle errors similar to applyTagToWorkflow', async () => {
      mockHttpClient.put.mockRejectedValue(new Error('Not found'));
      mockHttpClient.extractStatusCode.mockReturnValue(404);

      await expect(
        tagService.applyMultipleTags('nonexistent', ['tag1', 'tag2'])
      ).rejects.toThrow('nao encontrado');
    });
  });

  describe('hasTag', () => {
    it('should return true if workflow has tag', () => {
      const workflow = {
        id: 'workflow123',
        tags: [{ id: 'tag123', name: 'jana' }]
      };

      const hasTag = tagService.hasTag(workflow, 'tag123');

      expect(hasTag).toBe(true);
    });

    it('should return true if tag is string ID in array', () => {
      const workflow = {
        id: 'workflow123',
        tags: ['tag123', 'tag456']
      };

      const hasTag = tagService.hasTag(workflow, 'tag123');

      expect(hasTag).toBe(true);
    });

    it('should return false if workflow does not have tag', () => {
      const workflow = {
        id: 'workflow123',
        tags: [{ id: 'tag123', name: 'jana' }]
      };

      const hasTag = tagService.hasTag(workflow, 'nonexistent');

      expect(hasTag).toBe(false);
    });

    it('should return false if workflow has no tags property', () => {
      const workflow = { id: 'workflow123' };

      const hasTag = tagService.hasTag(workflow, 'tag123');

      expect(hasTag).toBe(false);
    });

    it('should return false if workflow is null', () => {
      const hasTag = tagService.hasTag(null, 'tag123');

      expect(hasTag).toBe(false);
    });

    it('should return false if tags is not an array', () => {
      const workflow = {
        id: 'workflow123',
        tags: 'not-an-array'
      };

      const hasTag = tagService.hasTag(workflow, 'tag123');

      expect(hasTag).toBe(false);
    });
  });

  describe('clearCache', () => {
    it('should clear cache data', () => {
      tagService._tagsCache = [{ id: '1', name: 'jana' }];
      tagService._cacheTimestamp = Date.now();

      tagService.clearCache();

      expect(tagService._tagsCache).toBeNull();
      expect(tagService._cacheTimestamp).toBeNull();
      expect(mockLogger.debug).toHaveBeenCalledWith('Cache de tags limpo');
    });
  });

  describe('getStats', () => {
    it('should return HttpClient stats', () => {
      const mockStats = {
        totalRequests: 10,
        retriedRequests: 2,
        failedRequests: 0
      };

      mockHttpClient.getStats.mockReturnValue(mockStats);

      const stats = tagService.getStats();

      expect(stats).toEqual(mockStats);
      expect(mockHttpClient.getStats).toHaveBeenCalled();
    });
  });
});
