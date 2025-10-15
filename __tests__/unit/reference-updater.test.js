/**
 * Unit Tests for ReferenceUpdater
 * Tests critical fixes including:
 * - Circular reference detection
 * - Deep object traversal
 * - Max depth limit (50 levels)
 * - Workflow ID updates with priority-based resolution
 */

const ReferenceUpdater = require('../../src/services/reference-updater');

describe('ReferenceUpdater', () => {
  let updater;
  let mockIdMapper;
  let mockLogger;

  beforeEach(() => {
    mockIdMapper = {
      resolve: jest.fn(),
      getIdByName: jest.fn(),
      getIdByOldId: jest.fn()
    };

    mockLogger = {
      debug: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      section: jest.fn(),
      progress: jest.fn(),
      success: jest.fn()
    };

    updater = new ReferenceUpdater(mockIdMapper, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Circular Reference Detection', () => {
    it('should detect and handle circular references', () => {
      const circularObj = { name: 'test' };
      circularObj.self = circularObj; // Create circular reference

      // Should not throw or cause infinite loop
      expect(() => {
        updater.updateObjectRecursively(circularObj);
      }).not.toThrow();

      // Should log a debug message about circular reference
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Referência circular detectada')
      );
    });

    it('should handle complex circular references', () => {
      const obj1 = { id: 1 };
      const obj2 = { id: 2, parent: obj1 };
      obj1.child = obj2; // obj1 -> obj2 -> obj1

      expect(() => {
        updater.updateObjectRecursively(obj1);
      }).not.toThrow();
    });

    it('should handle circular references in arrays', () => {
      const arr = [1, 2, 3];
      arr.push(arr); // Array contains itself

      expect(() => {
        updater.updateObjectRecursively(arr);
      }).not.toThrow();
    });

    it('should process the same object in different paths without false circular detection', () => {
      const shared = { value: 'shared' };
      const obj = {
        branch1: shared,
        branch2: shared // Same object referenced twice, but not circular
      };

      // Should be able to process both references
      expect(() => {
        updater.updateObjectRecursively(obj);
      }).not.toThrow();
    });
  });

  describe('Deep Object Traversal', () => {
    it('should traverse nested objects', () => {
      mockIdMapper.getIdByName.mockReturnValue('new-id-123');

      const workflow = {
        level1: {
          level2: {
            level3: {
              workflowId: {
                value: 'old-id',
                cachedResultName: 'Test Workflow'
              }
            }
          }
        }
      };

      updater.updateObjectRecursively(workflow);

      expect(workflow.level1.level2.level3.workflowId.value).toBe('new-id-123');
      expect(mockIdMapper.getIdByName).toHaveBeenCalledWith('Test Workflow');
    });

    it('should traverse arrays within objects', () => {
      mockIdMapper.getIdByName.mockReturnValue('new-id-123');

      const workflow = {
        nodes: [
          {
            parameters: {
              workflowId: {
                value: 'old-id-1',
                cachedResultName: 'Workflow 1'
              }
            }
          },
          {
            parameters: {
              workflowId: {
                value: 'old-id-2',
                cachedResultName: 'Workflow 2'
              }
            }
          }
        ]
      };

      updater.updateObjectRecursively(workflow);

      expect(workflow.nodes[0].parameters.workflowId.value).toBe('new-id-123');
      expect(workflow.nodes[1].parameters.workflowId.value).toBe('new-id-123');
    });

    it('should handle mixed nesting (objects and arrays)', () => {
      mockIdMapper.getIdByName.mockReturnValue('new-id-123');

      const workflow = {
        data: [
          {
            nested: {
              array: [
                {
                  workflowId: {
                    value: 'old-id',
                    cachedResultName: 'Test'
                  }
                }
              ]
            }
          }
        ]
      };

      updater.updateObjectRecursively(workflow);

      expect(workflow.data[0].nested.array[0].workflowId.value).toBe('new-id-123');
    });
  });

  describe('Max Depth Limit', () => {
    it('should stop recursion at MAX_DEPTH (50 levels)', () => {
      // Create deeply nested object (51 levels)
      const deepObj = { workflowId: { value: 'test', cachedResultName: 'Test' } };
      let current = deepObj;

      for (let i = 0; i < 50; i++) {
        current.nested = { workflowId: { value: 'test', cachedResultName: 'Test' } };
        current = current.nested;
      }

      // Should not throw, but should log warning at max depth
      expect(() => {
        updater.updateObjectRecursively(deepObj);
      }).not.toThrow();

      // Should log warning about max depth
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Profundidade máxima')
      );
    });

    it('should process objects within depth limit', () => {
      mockIdMapper.getIdByName.mockReturnValue('new-id-123');

      // Create nested object at exactly 49 levels (within limit)
      const obj = { value: 'root' };
      let current = obj;

      for (let i = 0; i < 48; i++) {
        current.nested = { value: `level-${i}` };
        current = current.nested;
      }

      // Add workflowId at level 49
      current.workflowId = {
        value: 'old-id',
        cachedResultName: 'Test Workflow'
      };

      updater.updateObjectRecursively(obj);

      // Should update successfully
      expect(current.workflowId.value).toBe('new-id-123');
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe('Workflow ID Updates', () => {
    it('should update workflowId object with priority for name-based lookup', () => {
      mockIdMapper.getIdByName.mockReturnValue('new-id-by-name');
      mockIdMapper.getIdByOldId.mockReturnValue('new-id-by-id');

      const workflowIdObj = {
        value: 'old-id-123',
        cachedResultName: 'My Workflow'
      };

      updater.updateWorkflowIdObject(workflowIdObj);

      // Should prioritize name-based lookup
      expect(mockIdMapper.getIdByName).toHaveBeenCalledWith('My Workflow');
      expect(workflowIdObj.value).toBe('new-id-by-name');
      expect(updater.stats.referencesUpdated).toBe(1);
    });

    it('should fallback to ID-based lookup when name lookup fails', () => {
      mockIdMapper.getIdByName.mockReturnValue(null); // Name lookup fails
      mockIdMapper.getIdByOldId.mockReturnValue('new-id-by-id');

      const workflowIdObj = {
        value: 'old-id-123',
        cachedResultName: 'Unknown Workflow'
      };

      updater.updateWorkflowIdObject(workflowIdObj);

      expect(mockIdMapper.getIdByName).toHaveBeenCalledWith('Unknown Workflow');
      expect(mockIdMapper.getIdByOldId).toHaveBeenCalledWith('old-id-123');
      expect(workflowIdObj.value).toBe('new-id-by-id');
      expect(updater.stats.referencesUpdated).toBe(1);
    });

    it('should track failed references when both lookups fail', () => {
      mockIdMapper.getIdByName.mockReturnValue(null);
      mockIdMapper.getIdByOldId.mockReturnValue(null);

      const workflowIdObj = {
        value: 'old-id-123',
        cachedResultName: 'Unknown Workflow'
      };

      updater.updateWorkflowIdObject(workflowIdObj);

      expect(workflowIdObj.value).toBe('old-id-123'); // Unchanged
      expect(updater.stats.referencesFailed).toBe(1);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should handle workflowId without cachedResultName', () => {
      mockIdMapper.getIdByOldId.mockReturnValue('new-id-by-id');

      const workflowIdObj = {
        value: 'old-id-123'
        // No cachedResultName
      };

      updater.updateWorkflowIdObject(workflowIdObj);

      expect(mockIdMapper.getIdByOldId).toHaveBeenCalledWith('old-id-123');
      expect(workflowIdObj.value).toBe('new-id-by-id');
    });

    it('should update string workflowId directly', () => {
      mockIdMapper.resolve.mockReturnValue('new-id-456');

      const node = {
        type: 'executeWorkflow',
        parameters: {
          workflowId: 'old-id-123'
        }
      };

      updater.updateExecuteWorkflowNode(node);

      expect(mockIdMapper.resolve).toHaveBeenCalledWith('old-id-123');
      expect(node.parameters.workflowId).toBe('new-id-456');
      expect(updater.stats.referencesUpdated).toBe(1);
    });
  });

  describe('Workflow Processing', () => {
    it('should process workflow and update all nodes', () => {
      mockIdMapper.getIdByName.mockReturnValue('new-id-123');

      const workflow = {
        name: 'Test Workflow',
        nodes: [
          {
            type: 'node1',
            parameters: {
              workflowId: {
                value: 'old-id-1',
                cachedResultName: 'Workflow 1'
              }
            }
          },
          {
            type: 'node2',
            parameters: {
              workflowId: {
                value: 'old-id-2',
                cachedResultName: 'Workflow 2'
              }
            }
          }
        ]
      };

      const updated = updater.updateWorkflow(workflow);

      expect(updated.nodes[0].parameters.workflowId.value).toBe('new-id-123');
      expect(updated.nodes[1].parameters.workflowId.value).toBe('new-id-123');
      expect(updater.stats.workflowsProcessed).toBe(1);
      expect(updater.stats.nodesProcessed).toBe(2);
    });

    it('should not modify original workflow object', () => {
      mockIdMapper.getIdByName.mockReturnValue('new-id-123');

      const original = {
        name: 'Test',
        nodes: [
          {
            parameters: {
              workflowId: {
                value: 'old-id',
                cachedResultName: 'Test'
              }
            }
          }
        ]
      };

      const updated = updater.updateWorkflow(original);

      // Original should remain unchanged
      expect(original.nodes[0].parameters.workflowId.value).toBe('old-id');
      // Updated should be changed
      expect(updated.nodes[0].parameters.workflowId.value).toBe('new-id-123');
    });

    it('should handle workflow without nodes array', () => {
      const workflow = {
        name: 'Empty Workflow'
      };

      expect(() => {
        const updated = updater.updateWorkflow(workflow);
        expect(updated.name).toBe('Empty Workflow');
      }).not.toThrow();
    });
  });

  describe('Batch Processing', () => {
    it('should update multiple workflows', () => {
      mockIdMapper.getIdByName.mockReturnValue('new-id');

      const workflows = [
        {
          name: 'Workflow 1',
          nodes: [
            { parameters: { workflowId: { value: 'old-1', cachedResultName: 'Test 1' } } }
          ]
        },
        {
          name: 'Workflow 2',
          nodes: [
            { parameters: { workflowId: { value: 'old-2', cachedResultName: 'Test 2' } } }
          ]
        }
      ];

      const updated = updater.updateBatch(workflows);

      expect(updated).toHaveLength(2);
      expect(updated[0].nodes[0].parameters.workflowId.value).toBe('new-id');
      expect(updated[1].nodes[0].parameters.workflowId.value).toBe('new-id');
      expect(updater.stats.workflowsProcessed).toBe(2);
    });
  });

  describe('Statistics', () => {
    it('should track all statistics correctly', () => {
      mockIdMapper.getIdByName.mockReturnValueOnce('new-id-1').mockReturnValueOnce(null);
      mockIdMapper.getIdByOldId.mockReturnValue(null);

      const workflow = {
        name: 'Test',
        nodes: [
          { parameters: { workflowId: { value: 'old-1', cachedResultName: 'Success' } } },
          { parameters: { workflowId: { value: 'old-2', cachedResultName: 'Fail' } } }
        ]
      };

      updater.updateWorkflow(workflow);

      const stats = updater.getStatistics();
      expect(stats.workflowsProcessed).toBe(1);
      expect(stats.nodesProcessed).toBe(2);
      expect(stats.referencesUpdated).toBe(1);
      expect(stats.referencesFailed).toBe(1);
      expect(stats.successRate).toBe('50.00%');
    });

    it('should reset statistics', () => {
      updater.stats.workflowsProcessed = 5;
      updater.stats.referencesUpdated = 10;
      updater.stats.referencesFailed = 2;
      updater.stats.nodesProcessed = 15;

      updater.resetStatistics();

      expect(updater.stats.workflowsProcessed).toBe(0);
      expect(updater.stats.referencesUpdated).toBe(0);
      expect(updater.stats.referencesFailed).toBe(0);
      expect(updater.stats.nodesProcessed).toBe(0);
    });

    it('should calculate 0% success rate when no references processed', () => {
      const stats = updater.getStatistics();
      expect(stats.successRate).toBe('0%');
    });

    it('should calculate 100% success rate', () => {
      mockIdMapper.getIdByName.mockReturnValue('new-id');

      const workflow = {
        nodes: [
          { parameters: { workflowId: { value: 'old-1', cachedResultName: 'Test 1' } } },
          { parameters: { workflowId: { value: 'old-2', cachedResultName: 'Test 2' } } }
        ]
      };

      updater.updateWorkflow(workflow);

      const stats = updater.getStatistics();
      expect(stats.successRate).toBe('100.00%');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null objects gracefully', () => {
      expect(() => {
        updater.updateObjectRecursively(null);
      }).not.toThrow();
    });

    it('should handle undefined objects gracefully', () => {
      expect(() => {
        updater.updateObjectRecursively(undefined);
      }).not.toThrow();
    });

    it('should handle primitive values', () => {
      expect(() => {
        updater.updateObjectRecursively('string');
        updater.updateObjectRecursively(123);
        updater.updateObjectRecursively(true);
      }).not.toThrow();
    });

    it('should handle empty objects', () => {
      expect(() => {
        updater.updateObjectRecursively({});
      }).not.toThrow();
    });

    it('should handle empty arrays', () => {
      expect(() => {
        updater.updateObjectRecursively([]);
      }).not.toThrow();
    });

    it('should handle workflowId without value or cachedResultName', () => {
      const obj = {
        workflowId: {} // Empty object
      };

      expect(() => {
        updater.updateObjectRecursively(obj);
      }).not.toThrow();

      expect(updater.stats.referencesUpdated).toBe(0);
      expect(updater.stats.referencesFailed).toBe(0);
    });

    it('should skip executeWorkflow nodes without parameters', () => {
      const node = {
        type: 'executeWorkflow'
        // No parameters
      };

      expect(() => {
        updater.updateExecuteWorkflowNode(node);
      }).not.toThrow();
    });

    it('should skip executeWorkflow nodes without workflowId', () => {
      const node = {
        type: 'executeWorkflow',
        parameters: {
          someOtherParam: 'value'
        }
      };

      expect(() => {
        updater.updateExecuteWorkflowNode(node);
      }).not.toThrow();
    });
  });

  describe('Validation', () => {
    it('should validate references correctly', () => {
      mockIdMapper.getIdByName.mockReturnValue('expected-id');

      const workflow = {
        nodes: [
          {
            parameters: {
              workflowId: {
                value: 'expected-id',
                cachedResultName: 'Test Workflow'
              }
            }
          }
        ]
      };

      const result = updater.validateReferences(workflow);

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect invalid references', () => {
      mockIdMapper.getIdByName.mockReturnValue('expected-id');

      const workflow = {
        nodes: [
          {
            parameters: {
              workflowId: {
                value: 'wrong-id',
                cachedResultName: 'Test Workflow'
              }
            }
          }
        ]
      };

      const result = updater.validateReferences(workflow);

      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toMatchObject({
        name: 'Test Workflow',
        currentId: 'wrong-id',
        expectedId: 'expected-id'
      });
    });
  });
});
