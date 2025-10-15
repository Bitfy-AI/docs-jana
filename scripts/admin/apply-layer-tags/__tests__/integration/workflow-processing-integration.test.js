/**
 * Integration Tests - Workflow Processing
 *
 * Testes de integração focados no processamento de workflows:
 * - Processamento de batch com TagService real (mockado)
 * - Tratamento de 409 Conflict como sucesso
 * - Retry automático em 429 Rate Limit
 * - Tratamento de erros 404, 401, 5xx
 *
 * @module __tests__/integration/workflow-processing-integration.test
 */

const WorkflowProcessor = require('../../core/processors/workflow-processor');
const TagService = require('../../core/services/tag-service');
const Logger = require('../../../../../src/utils/logger');

describe('Workflow Processing Integration', () => {
  let processor;
  let mockTagService;
  let mockLogger;
  let mockHttpClient;

  beforeEach(() => {
    // Mock Logger
    mockLogger = {
      info: jest.fn(),
      success: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

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

    // Criar TagService com HttpClient mockado
    mockTagService = new TagService(mockHttpClient, mockLogger);

    // Criar WorkflowProcessor com TagService mockado
    processor = new WorkflowProcessor(mockTagService, mockLogger, {
      maxConcurrent: 5,
      dryRun: false
    });
  });

  describe('processBatch with real TagService', () => {
    it('should process batch with successful API calls', async () => {
      // Setup: Mock HTTP client para retornar sucesso
      mockHttpClient.put.mockResolvedValue({
        data: {
          id: '84ZeQA0cA24Umeli',
          name: 'Workflow Test 1',
          tags: [{ id: 'tag123', name: 'jana' }]
        }
      });

      const workflowItems = [
        {
          id: '84ZeQA0cA24Umeli',
          name: { new: 'Workflow Test 1' },
          code: 'BCO-ATU-001',
          layer: 'C',
          tag: 'jana'
        },
        {
          id: '94ZeQA0cA24Umelj',
          name: { new: 'Workflow Test 2' },
          code: 'BCO-ATU-002',
          layer: 'C',
          tag: 'jana'
        }
      ];

      // Execute: processar batch
      const result = await processor.processBatch(
        workflowItems,
        'tag123',
        { dryRun: false }
      );

      // Validate: tags aplicadas via API
      expect(result.summary.total).toBe(2);
      expect(result.summary.success).toBe(2);
      expect(result.summary.failed).toBe(0);
      expect(mockHttpClient.put).toHaveBeenCalledTimes(2);
      expect(mockHttpClient.put).toHaveBeenCalledWith(
        '/api/v1/workflows/84ZeQA0cA24Umeli/tags',
        { tagIds: ['tag123'] }
      );
      expect(mockHttpClient.put).toHaveBeenCalledWith(
        '/api/v1/workflows/94ZeQA0cA24Umelj/tags',
        { tagIds: ['tag123'] }
      );
    });

    it('should process batch with concurrency limit', async () => {
      // Setup: Mock HTTP client com delay para testar concorrência
      mockHttpClient.put.mockImplementation(async () => {
        // Simular delay de API (~100ms)
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
          data: {
            id: 'workflow123',
            tags: [{ id: 'tag123', name: 'jana' }]
          }
        };
      });

      // Criar 10 workflows para testar pool de concorrência
      const workflowItems = Array.from({ length: 10 }, (_, i) => ({
        id: `workflow-${i}`,
        name: { new: `Workflow ${i}` },
        code: `BCO-ATU-${String(i).padStart(3, '0')}`,
        layer: 'C',
        tag: 'jana'
      }));

      // Execute: processar batch com concorrência 5
      const startTime = Date.now();
      const result = await processor.processBatch(
        workflowItems,
        'tag123',
        { dryRun: false }
      );
      const duration = Date.now() - startTime;

      // Validate: processamento paralelo
      expect(result.summary.total).toBe(10);
      expect(result.summary.success).toBe(10);

      // Com concorrência 5, 10 workflows devem levar ~200ms (2 batches de 5)
      // Sequencial levaria ~1000ms (10 * 100ms)
      expect(duration).toBeLessThan(500); // Speedup significativo
      expect(result.performance.speedup).toBeGreaterThan(1);
    });

    it('should aggregate results from batch processing', async () => {
      // Setup: Mock API com sucessos e falhas
      mockHttpClient.put
        .mockResolvedValueOnce({
          data: { id: '1', tags: [{ id: 'tag123' }] }
        })
        .mockRejectedValueOnce(
          Object.assign(new Error('404 Not Found'), { statusCode: 404 })
        )
        .mockResolvedValueOnce({
          data: { id: '3', tags: [{ id: 'tag123' }] }
        });

      mockHttpClient.extractStatusCode.mockReturnValue(404);

      const workflowItems = [
        {
          id: '1',
          name: { new: 'Workflow 1' },
          code: 'BCO-ATU-001',
          layer: 'C',
          tag: 'jana'
        },
        {
          id: '2',
          name: { new: 'Workflow 2' },
          code: 'BCO-ATU-002',
          layer: 'C',
          tag: 'jana'
        },
        {
          id: '3',
          name: { new: 'Workflow 3' },
          code: 'BCO-ATU-003',
          layer: 'C',
          tag: 'jana'
        }
      ];

      // Execute: processar batch
      const result = await processor.processBatch(
        workflowItems,
        'tag123',
        { dryRun: false }
      );

      // Validate: resultados agregados corretamente
      expect(result.summary.total).toBe(3);
      expect(result.summary.success).toBe(2);
      expect(result.summary.skipped).toBe(1); // 404 é tratado como skipped
      expect(result.results).toHaveLength(3);

      // Workflow 1: sucesso
      expect(result.results[0].status).toBe('success');

      // Workflow 2: skipped (404)
      expect(result.results[1].status).toBe('skipped');
      expect(result.results[1].error).toContain('404');

      // Workflow 3: sucesso
      expect(result.results[2].status).toBe('success');
    });
  });

  describe('handle 409 Conflict as success', () => {
    it('should treat 409 Conflict as success', async () => {
      // Setup: Mock 409 response (tag já aplicada)
      mockHttpClient.put.mockRejectedValue(
        Object.assign(new Error('409 Conflict - Tag already applied'), {
          statusCode: 409
        })
      );

      mockHttpClient.extractStatusCode.mockReturnValue(409);

      const workflowItem = {
        id: '84ZeQA0cA24Umeli',
        name: { new: 'Workflow Test' },
        code: 'BCO-ATU-001',
        layer: 'C',
        tag: 'jana'
      };

      // Execute: processar workflow
      const result = await processor.processWorkflow(
        workflowItem,
        'tag123',
        false
      );

      // Validate: status = 'success'
      expect(result.status).toBe('success');
      expect(result.message).toContain('already applied');
      expect(result.error).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('ja aplicada')
      );
    });

    it('should count 409 as success in batch summary', async () => {
      // Setup: Mock mix de 200 e 409
      mockHttpClient.put
        .mockResolvedValueOnce({
          data: { id: '1', tags: [{ id: 'tag123' }] }
        })
        .mockRejectedValueOnce(
          Object.assign(new Error('409 Conflict'), { statusCode: 409 })
        )
        .mockResolvedValueOnce({
          data: { id: '3', tags: [{ id: 'tag123' }] }
        });

      mockHttpClient.extractStatusCode.mockImplementation(error => {
        return error.statusCode || null;
      });

      const workflowItems = [
        {
          id: '1',
          name: { new: 'Workflow 1' },
          code: 'BCO-ATU-001',
          layer: 'C',
          tag: 'jana'
        },
        {
          id: '2',
          name: { new: 'Workflow 2' },
          code: 'BCO-ATU-002',
          layer: 'C',
          tag: 'jana'
        },
        {
          id: '3',
          name: { new: 'Workflow 3' },
          code: 'BCO-ATU-003',
          layer: 'C',
          tag: 'jana'
        }
      ];

      // Execute: processar batch
      const result = await processor.processBatch(
        workflowItems,
        'tag123',
        { dryRun: false }
      );

      // Validate: todos contados como sucesso
      expect(result.summary.total).toBe(3);
      expect(result.summary.success).toBe(3);
      expect(result.summary.failed).toBe(0);
    });
  });

  describe('retry on 429 Rate Limit', () => {
    it('should retry on 429 Rate Limit and succeed', async () => {
      // Setup: Mock 429 na primeira tentativa, sucesso na segunda
      mockHttpClient.put
        .mockRejectedValueOnce(
          Object.assign(new Error('429 Too Many Requests'), {
            statusCode: 429
          })
        )
        .mockResolvedValueOnce({
          data: { id: '84ZeQA0cA24Umeli', tags: [{ id: 'tag123' }] }
        });

      mockHttpClient.extractStatusCode.mockImplementation(error => {
        return error?.statusCode || null;
      });

      const workflowItem = {
        id: '84ZeQA0cA24Umeli',
        name: { new: 'Workflow Test' },
        code: 'BCO-ATU-001',
        layer: 'C',
        tag: 'jana'
      };

      // Execute: processar workflow
      const result = await processor.processWorkflow(
        workflowItem,
        'tag123',
        false
      );

      // Validate: retry happened, success
      expect(result.status).toBe('success');
      expect(result.retries).toBe(1);
      expect(mockHttpClient.put).toHaveBeenCalledTimes(2);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Retry')
      );
    });

    it('should retry multiple times on consecutive 429 errors', async () => {
      // Setup: Mock 429 duas vezes, depois sucesso
      mockHttpClient.put
        .mockRejectedValueOnce(
          Object.assign(new Error('429 Too Many Requests'), {
            statusCode: 429
          })
        )
        .mockRejectedValueOnce(
          Object.assign(new Error('429 Too Many Requests'), {
            statusCode: 429
          })
        )
        .mockResolvedValueOnce({
          data: { id: '84ZeQA0cA24Umeli', tags: [{ id: 'tag123' }] }
        });

      mockHttpClient.extractStatusCode.mockImplementation(error => {
        return error?.statusCode || null;
      });

      const workflowItem = {
        id: '84ZeQA0cA24Umeli',
        name: { new: 'Workflow Test' },
        code: 'BCO-ATU-001',
        layer: 'C',
        tag: 'jana'
      };

      // Execute: processar workflow
      const result = await processor.processWorkflow(
        workflowItem,
        'tag123',
        false
      );

      // Validate: múltiplos retries
      expect(result.status).toBe('success');
      expect(result.retries).toBe(2);
      expect(mockHttpClient.put).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries exceeded', async () => {
      // Setup: Mock 429 em todas as tentativas (4x = 1 inicial + 3 retries)
      mockHttpClient.put.mockRejectedValue(
        Object.assign(new Error('429 Too Many Requests'), {
          statusCode: 429
        })
      );

      mockHttpClient.extractStatusCode.mockReturnValue(429);

      const workflowItem = {
        id: '84ZeQA0cA24Umeli',
        name: { new: 'Workflow Test' },
        code: 'BCO-ATU-001',
        layer: 'C',
        tag: 'jana'
      };

      // Execute: processar workflow
      const result = await processor.processWorkflow(
        workflowItem,
        'tag123',
        false
      );

      // Validate: falhou após esgotar retries
      expect(result.status).toBe('failed');
      expect(result.retries).toBeGreaterThan(0);
      expect(result.error).toContain('429');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('FALHA')
      );
    });
  });

  describe('error handling for specific HTTP status codes', () => {
    it('should skip workflow on 404 Not Found', async () => {
      // Setup: Mock 404 response
      mockHttpClient.put.mockRejectedValue(
        Object.assign(new Error('404 Not Found'), { statusCode: 404 })
      );

      mockHttpClient.extractStatusCode.mockReturnValue(404);

      const workflowItem = {
        id: '84ZeQA0cA24Umeli',
        name: { new: 'Workflow Test' },
        code: 'BCO-ATU-001',
        layer: 'C',
        tag: 'jana'
      };

      // Execute: processar workflow
      const result = await processor.processWorkflow(
        workflowItem,
        'tag123',
        false
      );

      // Validate: skipped
      expect(result.status).toBe('skipped');
      expect(result.message).toContain('404');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('nao encontrado')
      );
    });

    it('should fail immediately on 401 Unauthorized', async () => {
      // Setup: Mock 401 response
      mockHttpClient.put.mockRejectedValue(
        Object.assign(new Error('401 Unauthorized'), { statusCode: 401 })
      );

      mockHttpClient.extractStatusCode.mockReturnValue(401);

      const workflowItem = {
        id: '84ZeQA0cA24Umeli',
        name: { new: 'Workflow Test' },
        code: 'BCO-ATU-001',
        layer: 'C',
        tag: 'jana'
      };

      // Execute: processar workflow
      const result = await processor.processWorkflow(
        workflowItem,
        'tag123',
        false
      );

      // Validate: falhou imediatamente, sem retry adicional
      // Nota: retries é incrementado antes de verificar o status, então será 1
      expect(result.status).toBe('failed');
      expect(result.retries).toBe(1);
      expect(result.error).toContain('401');
      expect(mockHttpClient.put).toHaveBeenCalledTimes(1); // Apenas 1 tentativa
    });

    it('should retry on 500 Internal Server Error', async () => {
      // Setup: Mock 500 depois sucesso
      mockHttpClient.put
        .mockRejectedValueOnce(
          Object.assign(new Error('500 Internal Server Error'), {
            statusCode: 500
          })
        )
        .mockResolvedValueOnce({
          data: { id: '84ZeQA0cA24Umeli', tags: [{ id: 'tag123' }] }
        });

      mockHttpClient.extractStatusCode.mockImplementation(error => {
        return error?.statusCode || null;
      });

      const workflowItem = {
        id: '84ZeQA0cA24Umeli',
        name: { new: 'Workflow Test' },
        code: 'BCO-ATU-001',
        layer: 'C',
        tag: 'jana'
      };

      // Execute: processar workflow
      const result = await processor.processWorkflow(
        workflowItem,
        'tag123',
        false
      );

      // Validate: retry em erro 5xx
      expect(result.status).toBe('success');
      expect(result.retries).toBe(1);
      expect(mockHttpClient.put).toHaveBeenCalledTimes(2);
    });

    it('should retry on network errors', async () => {
      // Setup: Mock erro de rede depois sucesso
      const networkError = new Error('Connection reset by peer');
      networkError.code = 'ECONNRESET';
      // Importante: não incluir statusCode nem números na mensagem

      // Mockar o TagService diretamente (que é o que WorkflowProcessor chama)
      mockTagService.applyTagToWorkflow = jest.fn()
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          id: '84ZeQA0cA24Umeli',
          tags: [{ id: 'tag123' }]
        });

      const workflowItem = {
        id: '84ZeQA0cA24Umeli',
        name: { new: 'Workflow Test' },
        code: 'BCO-ATU-001',
        layer: 'C',
        tag: 'jana'
      };

      // Execute: processar workflow
      const result = await processor.processWorkflow(
        workflowItem,
        'tag123',
        false
      );

      // Validate: retry em erro de rede
      expect(result.status).toBe('success');
      expect(result.retries).toBe(1);
      expect(mockTagService.applyTagToWorkflow).toHaveBeenCalledTimes(2);
    });
  });

  describe('performance metrics', () => {
    it('should track duration and retries in batch processing', async () => {
      // Setup: Mock API calls com variação de retries
      mockHttpClient.put
        .mockResolvedValueOnce({
          data: { id: '1', tags: [{ id: 'tag123' }] }
        })
        .mockRejectedValueOnce(
          Object.assign(new Error('429'), { statusCode: 429 })
        )
        .mockResolvedValueOnce({
          data: { id: '2', tags: [{ id: 'tag123' }] }
        })
        .mockResolvedValueOnce({
          data: { id: '3', tags: [{ id: 'tag123' }] }
        });

      mockHttpClient.extractStatusCode.mockImplementation(error => {
        return error?.statusCode || null;
      });

      const workflowItems = [
        {
          id: '1',
          name: { new: 'Workflow 1' },
          code: 'BCO-ATU-001',
          layer: 'C',
          tag: 'jana'
        },
        {
          id: '2',
          name: { new: 'Workflow 2' },
          code: 'BCO-ATU-002',
          layer: 'C',
          tag: 'jana'
        },
        {
          id: '3',
          name: { new: 'Workflow 3' },
          code: 'BCO-ATU-003',
          layer: 'C',
          tag: 'jana'
        }
      ];

      // Execute: processar batch
      const result = await processor.processBatch(
        workflowItems,
        'tag123',
        { dryRun: false }
      );

      // Validate: métricas de performance
      expect(result.performance.totalDuration).toBeGreaterThan(0);
      expect(result.performance.averageDuration).toBeGreaterThan(0);
      expect(result.performance.totalRetries).toBe(1); // Workflow 2 teve 1 retry
      expect(result.performance.speedup).toBeGreaterThan(0);
    });
  });
});
