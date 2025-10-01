# Testing Standards - docs-jana

## Overview

Este documento define os padrões de testes para o projeto docs-jana, garantindo qualidade, consistência e manutenibilidade do código.

## Testing Framework Stack

### Primary Tools
- **Unit/Integration**: Jest 29.x
- **E2E Testing**: Playwright (quando necessário)
- **Coverage**: Jest built-in coverage (via Istanbul)
- **Mocking**: Jest mocks + manual mocks when needed

### Configuration
- Config file: `jest.config.js`
- Test directory: `__tests__/`
- Coverage threshold: 80% minimum

## Test Organization

### Directory Structure

```
__tests__/
├── unit/                    # Unit tests
│   ├── services/           # Service layer tests
│   ├── utils/              # Utility function tests
│   └── commands/           # Command tests
├── integration/            # Integration tests
│   ├── api/               # API integration tests
│   └── database/          # Database integration tests
├── e2e/                   # End-to-end tests
│   └── workflows/         # Complete workflow tests
├── __fixtures__/          # Test data and fixtures
│   ├── workflows/         # Sample workflow files
│   └── responses/         # Mock API responses
└── __mocks__/             # Manual mocks
    ├── services/          # Service mocks
    └── external/          # External dependency mocks
```

## Naming Conventions

### Test Files
- Unit tests: `{module-name}.test.js`
- Integration tests: `{feature-name}.integration.test.js`
- E2E tests: `{workflow-name}.e2e.test.js`

### Test Suites
```javascript
describe('ServiceName', () => {
  describe('methodName', () => {
    it('should return expected result when given valid input', () => {
      // Test implementation
    });

    it('should throw error when given invalid input', () => {
      // Test implementation
    });
  });
});
```

### Test Naming Pattern
```
should [expected behavior] when [condition]
```

Examples:
- ✅ `should return workflow data when file exists`
- ✅ `should throw error when file is not found`
- ✅ `should sanitize filename when special characters present`
- ❌ `test workflow loading`
- ❌ `it works`

## Test Structure (AAA Pattern)

```javascript
it('should return processed data when valid input provided', () => {
  // Arrange - Setup test data and dependencies
  const input = { id: '123', name: 'test' };
  const mockService = jest.fn().mockResolvedValue({ success: true });

  // Act - Execute the code under test
  const result = processData(input, mockService);

  // Assert - Verify the results
  expect(result).toEqual({ success: true });
  expect(mockService).toHaveBeenCalledWith(input);
});
```

## Testing Levels

### 1. Unit Tests (80% of tests)

**Purpose**: Test individual functions/methods in isolation

**Characteristics**:
- Fast execution (< 10ms per test)
- No external dependencies
- Use mocks for dependencies
- Focus on business logic

**Example**:
```javascript
describe('sanitizeFilename', () => {
  it('should remove special characters from filename', () => {
    // Arrange
    const input = 'test@file#name$.txt';
    const expected = 'test-file-name-.txt';

    // Act
    const result = sanitizeFilename(input);

    // Assert
    expect(result).toBe(expected);
  });

  it('should handle empty string', () => {
    expect(sanitizeFilename('')).toBe('');
  });

  it('should preserve valid characters', () => {
    const input = 'valid-filename_123.txt';
    expect(sanitizeFilename(input)).toBe(input);
  });
});
```

### 2. Integration Tests (15% of tests)

**Purpose**: Test component interactions and external integrations

**Characteristics**:
- Test multiple components together
- May use real databases/APIs (in test environment)
- Slower than unit tests
- Focus on integration points

**Example**:
```javascript
describe('N8NService Integration', () => {
  let service;
  let mockApiClient;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
    service = new N8NService(mockApiClient);
  });

  it('should fetch and process workflow data', async () => {
    // Arrange
    const workflowId = 'test-workflow-id';
    mockApiClient.get.mockResolvedValue({
      data: { id: workflowId, name: 'Test Workflow' }
    });

    // Act
    const result = await service.getWorkflow(workflowId);

    // Assert
    expect(result).toMatchObject({
      id: workflowId,
      name: 'Test Workflow'
    });
    expect(mockApiClient.get).toHaveBeenCalledWith(
      `/workflows/${workflowId}`
    );
  });
});
```

### 3. E2E Tests (5% of tests)

**Purpose**: Test complete user workflows end-to-end

**Characteristics**:
- Test entire features
- Closest to real user behavior
- Slowest tests
- Focus on critical paths

**Example**:
```javascript
describe('Workflow Upload E2E', () => {
  it('should complete full workflow upload process', async () => {
    // Arrange
    const testWorkflow = loadFixture('sample-workflow.json');
    const uploadService = new UploadService();

    // Act
    await uploadService.uploadWorkflow(testWorkflow);

    // Assert
    const uploaded = await uploadService.getWorkflow(testWorkflow.id);
    expect(uploaded).toMatchObject(testWorkflow);
    expect(uploadService.getHistory()).toContainEqual({
      id: testWorkflow.id,
      status: 'success'
    });
  });
});
```

## Coverage Requirements

### Minimum Coverage Targets
- **Overall**: 80%
- **Statements**: 80%
- **Branches**: 75%
- **Functions**: 80%
- **Lines**: 80%

### What to Cover
1. **Critical Paths** (100% coverage required):
   - Authentication logic
   - Data validation
   - Error handling
   - Business rules

2. **Standard Code** (80% coverage):
   - Service methods
   - Utility functions
   - API endpoints

3. **Low Priority** (50% coverage acceptable):
   - Configuration files
   - Constants
   - Type definitions

### Coverage Commands
```bash
# Run tests with coverage
pnpm test:coverage

# Watch mode with coverage
pnpm test:coverage:watch

# Generate HTML coverage report
pnpm test:coverage -- --coverage --coverageReporters=html
```

## Mocking Standards

### When to Mock
- External API calls
- Database operations
- File system operations
- Time-dependent code
- Random number generation
- Complex dependencies

### When NOT to Mock
- Simple utility functions
- Pure functions
- Internal business logic
- Data transformations

### Mock Examples

#### Mock External Service
```javascript
jest.mock('../services/N8NService', () => ({
  getWorkflows: jest.fn().mockResolvedValue([
    { id: '1', name: 'Workflow 1' }
  ]),
  uploadWorkflow: jest.fn().mockResolvedValue({ success: true })
}));
```

#### Mock File System
```javascript
jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue('file content'),
  writeFile: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined)
}));
```

#### Mock Date/Time
```javascript
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2024-01-01'));
});

afterEach(() => {
  jest.useRealTimers();
});
```

## Test Data Management

### Fixtures
Store reusable test data in `__tests__/__fixtures__/`:

```javascript
// __tests__/__fixtures__/workflows.js
export const sampleWorkflow = {
  id: 'workflow-123',
  name: 'Test Workflow',
  nodes: [/* ... */],
  connections: {}
};

export const workflowList = [
  sampleWorkflow,
  { id: 'workflow-456', name: 'Another Workflow' }
];
```

Usage:
```javascript
import { sampleWorkflow } from '../__fixtures__/workflows';

it('should process workflow', () => {
  const result = processWorkflow(sampleWorkflow);
  expect(result.id).toBe('workflow-123');
});
```

### Test Builders
For complex objects, use test builders:

```javascript
class WorkflowBuilder {
  constructor() {
    this.workflow = {
      id: 'default-id',
      name: 'Default Workflow',
      nodes: [],
      connections: {}
    };
  }

  withId(id) {
    this.workflow.id = id;
    return this;
  }

  withName(name) {
    this.workflow.name = name;
    return this;
  }

  build() {
    return this.workflow;
  }
}

// Usage
const workflow = new WorkflowBuilder()
  .withId('custom-id')
  .withName('Custom Workflow')
  .build();
```

## Async Testing

### Promises
```javascript
it('should resolve with data', async () => {
  const result = await fetchData();
  expect(result).toBeDefined();
});

it('should reject with error', async () => {
  await expect(fetchInvalidData()).rejects.toThrow('Invalid data');
});
```

### Callbacks (avoid if possible)
```javascript
it('should call callback with result', (done) => {
  fetchDataWithCallback((error, result) => {
    expect(error).toBeNull();
    expect(result).toBeDefined();
    done();
  });
});
```

## Error Testing

### Test Error Cases
```javascript
describe('Error Handling', () => {
  it('should throw ValidationError for invalid input', () => {
    expect(() => validateInput(null)).toThrow(ValidationError);
    expect(() => validateInput(null)).toThrow('Input cannot be null');
  });

  it('should handle async errors', async () => {
    await expect(async () => {
      await processInvalidData();
    }).rejects.toThrow('Processing failed');
  });

  it('should return error response for API errors', async () => {
    mockApi.get.mockRejectedValue(new Error('API Error'));

    const result = await service.fetchData();

    expect(result.success).toBe(false);
    expect(result.error).toBe('API Error');
  });
});
```

## Performance Testing

### Test Execution Time
```javascript
it('should complete within 100ms', async () => {
  const start = Date.now();
  await fastOperation();
  const duration = Date.now() - start;

  expect(duration).toBeLessThan(100);
});
```

### Memory Leaks
```javascript
describe('Memory Management', () => {
  it('should not leak memory on repeated calls', () => {
    const initialMemory = process.memoryUsage().heapUsed;

    // Perform operation 1000 times
    for (let i = 0; i < 1000; i++) {
      performOperation();
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;

    // Memory increase should be reasonable
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB
  });
});
```

## Best Practices

### DOs
✅ Write tests before or alongside code (TDD/TBD)
✅ Test behavior, not implementation
✅ Keep tests simple and readable
✅ Use descriptive test names
✅ Follow AAA pattern (Arrange, Act, Assert)
✅ Test edge cases and error conditions
✅ Mock external dependencies
✅ Clean up after tests (afterEach/afterAll)
✅ Use beforeEach for common setup
✅ Test one thing per test
✅ Make tests independent
✅ Use snapshot testing sparingly

### DON'Ts
❌ Don't test third-party libraries
❌ Don't write tests that depend on other tests
❌ Don't use real external services
❌ Don't test implementation details
❌ Don't ignore failing tests
❌ Don't have too many mocks (indicates poor design)
❌ Don't write tests just for coverage
❌ Don't use random data (unless testing randomness)
❌ Don't leave console.log in tests
❌ Don't skip tests without good reason

## Continuous Integration

### CI Test Requirements
```yaml
# Required checks before merge
- All tests must pass
- Coverage must be >= 80%
- No skipped tests without justification
- Test execution time < 5 minutes
```

### Test Commands for CI
```json
{
  "scripts": {
    "test:ci": "jest --ci --coverage --maxWorkers=2",
    "test:ci:verbose": "jest --ci --coverage --verbose",
    "test:ci:update-snapshots": "jest --ci --updateSnapshot"
  }
}
```

## Troubleshooting

### Common Issues

#### Tests Timeout
```javascript
// Increase timeout for slow tests
jest.setTimeout(10000); // 10 seconds

it('slow operation', async () => {
  await slowOperation();
}, 10000); // Per-test timeout
```

#### Flaky Tests
```javascript
// Use waitFor for async state changes
import { waitFor } from '@testing-library/react';

await waitFor(() => {
  expect(element).toBeInTheDocument();
});
```

#### Mock Not Working
```javascript
// Clear mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});

// Or reset all mocks
beforeEach(() => {
  jest.resetAllMocks();
});
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Test Driven Development](https://martinfowler.com/bliki/TestDrivenDevelopment.html)

---

**Last Updated**: 2024-10-01
**Version**: 1.0.0
