# Coding Standards - docs-jana

## Overview

Este documento define os padrões de código para o projeto docs-jana, garantindo consistência, qualidade e manutenibilidade.

## Language & Runtime

- **Language**: JavaScript (ES6+)
- **Runtime**: Node.js >= 14.0.0
- **Package Manager**: pnpm >= 8.0.0
- **Code Style**: ESLint + Prettier

## File Organization

### Project Structure

```
docs-jana/
├── src/                      # Source code
│   ├── commands/            # CLI commands
│   ├── services/            # Business logic services
│   ├── lib/                 # Shared utilities
│   │   ├── auth/           # Authentication utilities
│   │   ├── validation/     # Input validation
│   │   └── utils/          # General utilities
│   └── config/             # Configuration files
├── __tests__/              # Test files
├── .claude/                # Claude Code workflow
└── cli.js                  # CLI entry point
```

### File Naming Conventions

#### JavaScript Files
- **Services**: PascalCase + `Service.js` suffix
  - Example: `N8NService.js`, `OutlineService.js`
- **Utilities**: camelCase + `.js`
  - Example: `fileUtils.js`, `stringHelpers.js`
- **Commands**: kebab-case + `.js`
  - Example: `n8n-download.js`, `outline-upload.js`
- **Tests**: Same as source + `.test.js`
  - Example: `N8NService.test.js`, `fileUtils.test.js`

#### Other Files
- **Markdown**: UPPERCASE or kebab-case
  - Example: `README.md`, `migration-guide.md`
- **Config**: lowercase with dots
  - Example: `.eslintrc.json`, `jest.config.js`
- **JSON**: kebab-case
  - Example: `package.json`, `upload-history.json`

## Code Style

### ESLint Configuration

```json
{
  "extends": "eslint:recommended",
  "env": {
    "node": true,
    "es6": true,
    "jest": true
  },
  "parserOptions": {
    "ecmaVersion": 2021
  }
}
```

### Prettier Configuration

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80
}
```

## JavaScript Patterns

### Variable Declarations

```javascript
// ✅ Use const by default
const MAX_RETRIES = 3;
const config = loadConfig();

// ✅ Use let when reassignment is needed
let retryCount = 0;
let currentState = 'idle';

// ❌ Avoid var
var oldStyle = 'avoid this';
```

### Naming Conventions

```javascript
// Constants: UPPER_SNAKE_CASE
const API_BASE_URL = 'https://api.example.com';
const MAX_UPLOAD_SIZE = 1024 * 1024 * 10;

// Variables/Functions: camelCase
const userName = 'john';
const getUserData = () => {};

// Classes: PascalCase
class WorkflowService {}
class ApiClient {}

// Private members: _prefix (convention)
class Service {
  _privateMethod() {}
  _internalState = null;
}

// Boolean variables: is/has/should prefix
const isValid = true;
const hasPermission = false;
const shouldRetry = true;
```

### Functions

#### Arrow Functions (Preferred for callbacks/short functions)
```javascript
// ✅ Good
const double = (x) => x * 2;
const process = async (data) => {
  const result = await transform(data);
  return result;
};

// ✅ Multi-line with implicit return
const createUser = (name, email) => ({
  id: generateId(),
  name,
  email,
  createdAt: new Date(),
});
```

#### Regular Functions (Use for methods and complex functions)
```javascript
// ✅ Good - clear and documented
/**
 * Fetches workflow data from N8N API
 * @param {string} workflowId - The workflow ID
 * @returns {Promise<Object>} Workflow data
 * @throws {Error} If workflow not found
 */
async function fetchWorkflow(workflowId) {
  if (!workflowId) {
    throw new Error('Workflow ID required');
  }

  const response = await api.get(`/workflows/${workflowId}`);
  return response.data;
}
```

### Error Handling

#### Always Handle Errors
```javascript
// ✅ Good - proper error handling
async function uploadWorkflow(workflow) {
  try {
    const validated = validateWorkflow(workflow);
    const result = await api.upload(validated);
    return { success: true, data: result };
  } catch (error) {
    logger.error('Upload failed', { error, workflowId: workflow.id });
    return {
      success: false,
      error: error.message,
      code: error.code || 'UPLOAD_FAILED',
    };
  }
}

// ❌ Bad - swallowing errors
async function uploadWorkflow(workflow) {
  try {
    await api.upload(workflow);
  } catch (error) {
    // Silent failure - BAD!
  }
}
```

#### Custom Error Classes
```javascript
// ✅ Define custom errors for better handling
class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

class ApiError extends Error {
  constructor(message, statusCode, response) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.response = response;
  }
}

// Usage
if (!workflow.id) {
  throw new ValidationError('Workflow ID required', 'id');
}
```

### Async/Await

```javascript
// ✅ Good - clean async/await
async function processWorkflows(workflowIds) {
  const workflows = await Promise.all(
    workflowIds.map((id) => fetchWorkflow(id))
  );

  for (const workflow of workflows) {
    await validateAndUpload(workflow);
  }

  return { processed: workflows.length };
}

// ✅ Good - error handling with async/await
async function safeProcess(data) {
  try {
    const result = await processData(data);
    return { success: true, result };
  } catch (error) {
    logger.error('Processing failed', error);
    return { success: false, error: error.message };
  }
}

// ❌ Bad - mixing promises and async/await
async function mixedApproach(id) {
  return fetchData(id).then((data) => {
    return processData(data);
  });
}
```

### Object and Array Operations

#### Destructuring
```javascript
// ✅ Good - use destructuring
const { id, name, nodes } = workflow;
const [first, second, ...rest] = items;

// ✅ Good - with defaults
const { timeout = 5000, retries = 3 } = config;

// ✅ Good - nested destructuring
const {
  metadata: { createdAt, updatedAt },
} = workflow;
```

#### Spread Operator
```javascript
// ✅ Good - object merging
const defaults = { timeout: 5000, retries: 3 };
const config = { ...defaults, ...userConfig };

// ✅ Good - array concatenation
const allItems = [...existingItems, ...newItems];

// ✅ Good - shallow copy
const workflowCopy = { ...workflow };
```

#### Array Methods
```javascript
// ✅ Good - functional approach
const activeWorkflows = workflows
  .filter((w) => w.active)
  .map((w) => ({ id: w.id, name: w.name }))
  .sort((a, b) => a.name.localeCompare(b.name));

// ✅ Good - find instead of filter[0]
const workflow = workflows.find((w) => w.id === targetId);

// ✅ Good - some/every for boolean checks
const hasActive = workflows.some((w) => w.active);
const allValid = workflows.every((w) => validateWorkflow(w));
```

### Optional Chaining and Nullish Coalescing

```javascript
// ✅ Good - optional chaining
const nodeName = workflow?.nodes?.[0]?.name;
const execute = service?.execute?.();

// ✅ Good - nullish coalescing
const timeout = config.timeout ?? 5000;
const name = user.name ?? 'Anonymous';

// ❌ Bad - old style
const nodeName =
  workflow && workflow.nodes && workflow.nodes[0]
    ? workflow.nodes[0].name
    : undefined;
```

## Documentation

### JSDoc Comments

```javascript
/**
 * Uploads a workflow to N8N
 *
 * @param {Object} workflow - The workflow object to upload
 * @param {string} workflow.id - Workflow ID
 * @param {string} workflow.name - Workflow name
 * @param {Array} workflow.nodes - Array of workflow nodes
 * @param {Object} [options] - Optional configuration
 * @param {boolean} [options.overwrite=false] - Whether to overwrite existing
 * @param {number} [options.timeout=5000] - Request timeout in milliseconds
 * @returns {Promise<Object>} Upload result
 * @throws {ValidationError} If workflow is invalid
 * @throws {ApiError} If upload fails
 *
 * @example
 * const result = await uploadWorkflow({
 *   id: 'wf-123',
 *   name: 'My Workflow',
 *   nodes: []
 * });
 */
async function uploadWorkflow(workflow, options = {}) {
  // Implementation
}
```

### Inline Comments

```javascript
// ✅ Good - explain WHY, not WHAT
// Retry with exponential backoff to handle temporary network issues
const result = await retryWithBackoff(operation);

// ✅ Good - explain complex logic
// Sort by priority (high=1, medium=2, low=3) then by creation date
workflows.sort(
  (a, b) => a.priority - b.priority || a.createdAt - b.createdAt
);

// ❌ Bad - stating the obvious
// Increment counter
counter++;
```

## Class Design

### Service Classes

```javascript
/**
 * Service for interacting with N8N API
 */
class N8NService {
  /**
   * Creates an N8N service instance
   * @param {Object} config - Service configuration
   * @param {string} config.apiUrl - N8N API base URL
   * @param {string} config.apiKey - N8N API key
   */
  constructor(config) {
    this.apiUrl = config.apiUrl;
    this.apiKey = config.apiKey;
    this.client = this._createClient();
  }

  /**
   * Fetches all workflows
   * @returns {Promise<Array>} List of workflows
   */
  async getWorkflows() {
    try {
      const response = await this.client.get('/workflows');
      return response.data;
    } catch (error) {
      throw new ApiError('Failed to fetch workflows', error.status, error);
    }
  }

  /**
   * Private method to create HTTP client
   * @private
   */
  _createClient() {
    // Implementation
  }
}
```

### Utility Modules

```javascript
/**
 * Utility functions for file operations
 * @module fileUtils
 */

/**
 * Sanitizes a filename by removing invalid characters
 * @param {string} filename - The filename to sanitize
 * @returns {string} Sanitized filename
 */
export function sanitizeFilename(filename) {
  return filename.replace(/[^a-z0-9.-]/gi, '-').toLowerCase();
}

/**
 * Ensures a directory exists, creating it if necessary
 * @param {string} dirPath - Directory path
 * @returns {Promise<void>}
 */
export async function ensureDir(dirPath) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}
```

## Validation

### Input Validation

```javascript
/**
 * Validates workflow object
 * @param {Object} workflow - Workflow to validate
 * @throws {ValidationError} If validation fails
 */
function validateWorkflow(workflow) {
  if (!workflow) {
    throw new ValidationError('Workflow is required');
  }

  if (!workflow.id || typeof workflow.id !== 'string') {
    throw new ValidationError('Workflow ID must be a string', 'id');
  }

  if (!workflow.name || workflow.name.trim().length === 0) {
    throw new ValidationError('Workflow name is required', 'name');
  }

  if (!Array.isArray(workflow.nodes)) {
    throw new ValidationError('Workflow nodes must be an array', 'nodes');
  }
}
```

### Type Checking with JSDoc

```javascript
/**
 * @typedef {Object} Workflow
 * @property {string} id - Workflow ID
 * @property {string} name - Workflow name
 * @property {boolean} active - Whether workflow is active
 * @property {Node[]} nodes - Array of nodes
 * @property {Object} connections - Node connections
 */

/**
 * @typedef {Object} Node
 * @property {string} id - Node ID
 * @property {string} type - Node type
 * @property {Object} parameters - Node parameters
 */

/**
 * Processes a workflow
 * @param {Workflow} workflow - The workflow to process
 * @returns {Promise<Workflow>} Processed workflow
 */
async function processWorkflow(workflow) {
  // TypeScript-like type safety with JSDoc
}
```

## Performance Best Practices

### Avoid Unnecessary Operations

```javascript
// ✅ Good - early return
function processUser(user) {
  if (!user) return null;
  if (!user.active) return null;

  return expensiveOperation(user);
}

// ❌ Bad - nested conditions
function processUser(user) {
  if (user) {
    if (user.active) {
      return expensiveOperation(user);
    }
  }
  return null;
}
```

### Efficient Loops

```javascript
// ✅ Good - use appropriate method
const hasError = items.some((item) => item.error);
const allValid = items.every((item) => item.valid);

// ❌ Bad - unnecessary full iteration
let hasError = false;
for (const item of items) {
  if (item.error) hasError = true;
}
```

### Memoization

```javascript
// ✅ Good - cache expensive computations
const cache = new Map();

function expensiveComputation(input) {
  if (cache.has(input)) {
    return cache.get(input);
  }

  const result = performExpensiveOperation(input);
  cache.set(input, result);
  return result;
}
```

## Security Best Practices

### Never Log Sensitive Data

```javascript
// ✅ Good - sanitize logs
logger.info('User authenticated', {
  userId: user.id,
  email: maskEmail(user.email),
});

// ❌ Bad - logging secrets
logger.info('API call', { apiKey, password });
```

### Validate All Input

```javascript
// ✅ Good - validate and sanitize
function createWorkflow(data) {
  const validated = validateWorkflowData(data);
  const sanitized = sanitizeWorkflowData(validated);
  return saveWorkflow(sanitized);
}
```

### Use Environment Variables for Secrets

```javascript
// ✅ Good
const apiKey = process.env.N8N_API_KEY;
const dbPassword = process.env.DB_PASSWORD;

// ❌ Bad
const apiKey = 'sk-1234567890abcdef';
```

## Git Commit Standards

### Conventional Commits

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style changes (formatting, etc)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples**:
```
feat(n8n): add bulk upload command

Implements batch upload functionality for N8N workflows.
Includes progress bar and error recovery.

Closes #123

fix(outline): handle special characters in titles

Sanitize document titles to prevent API errors when
special characters are present.

test(services): add N8NService unit tests

Increases coverage for N8NService from 60% to 85%
```

## Code Review Checklist

Before submitting code for review:

- [ ] Code follows style guide
- [ ] All tests pass
- [ ] New code has tests
- [ ] Coverage >= 80%
- [ ] No console.log statements
- [ ] Error handling implemented
- [ ] JSDoc comments added
- [ ] No hardcoded secrets
- [ ] Input validation added
- [ ] Performance considered
- [ ] Security reviewed

---

**Last Updated**: 2024-10-01
**Version**: 1.0.0
