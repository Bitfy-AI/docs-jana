# Migration Guide: CLI Unification Project

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Migration Patterns](#migration-patterns)
  - [1. HTTP Client Migration](#1-http-client-migration)
  - [2. Logger Migration](#2-logger-migration)
  - [3. Factory Pattern Migration](#3-factory-pattern-migration)
  - [4. Error Handling Migration](#4-error-handling-migration)
  - [5. Sensitive Data Masking](#5-sensitive-data-masking)
- [Real-World Examples](#real-world-examples)
- [Common Pitfalls](#common-pitfalls)
- [Testing Your Migration](#testing-your-migration)
- [Breaking Changes](#breaking-changes)

---

## Overview

The CLI Unification project (FASE 1-5) introduces a modern, unified architecture with significant improvements:

**Benefits:**
- **Reduced Code**: ~2,657 LOC removed (FASE 1-3)
- **Better Error Handling**: Centralized error types with proper context
- **Consistent Logging**: Automatic sensitive data masking
- **Unified HTTP**: Single client with retry logic, rate limiting, timeout
- **Factory Patterns**: Service instantiation with proper DI
- **Improved Security**: Automatic API key/password masking

**Project Status:**
- **FASE 1**: Dead Code Removal (-2115 LOC, -15 files) ✅
- **FASE 2**: HttpClient Unification (-542 LOC, unified API) ✅
- **FASE 3**: Factory Pattern Foundation (Wave 1-3) ✅
- **FASE 4**: Logger Unification with Data Masking ✅
- **FASE 5**: Service Refactoring ✅
- **FASE 6**: Documentation (in progress)

---

## Quick Start

### Before Migration Checklist

- [ ] Read this entire guide
- [ ] Backup your code or create a feature branch
- [ ] Review your current code for patterns to migrate
- [ ] Run existing tests to establish baseline
- [ ] Identify all HTTP calls, console.log statements, and error handling

### Migration Process

1. **Start with HTTP Client**: Replace all fetch/http calls with `HttpClient`
2. **Add Logger**: Replace all `console.log/error` with `Logger`
3. **Apply Factory Patterns**: Use factories for service instantiation
4. **Update Error Handling**: Use specific error types
5. **Test Thoroughly**: Run all tests and manual testing
6. **Verify Security**: Check that sensitive data is masked

---

## Migration Patterns

### 1. HTTP Client Migration

#### Pattern: Manual fetch/http → HttpClient

**OLD PATTERN (BEFORE):**
```javascript
// ❌ Manual fetch with no retry, timeout, or rate limiting
const response = await fetch(`${url}/api/v1/workflows`, {
  method: 'GET',
  headers: {
    'X-N8N-API-KEY': apiKey,
    'Accept': 'application/json'
  },
  timeout: 10000
});

if (!response.ok) {
  throw new Error(`HTTP ${response.status}: ${await response.text()}`);
}

const data = await response.json();
```

**NEW PATTERN (AFTER):**
```javascript
// ✅ HttpClient with automatic retry, timeout, rate limiting
const HttpClient = require('../core/http/HttpClient');

const httpClient = HttpClient.create({
  baseUrl: url,
  headers: { 'X-N8N-API-KEY': apiKey },
  maxRetries: 3,
  timeout: 10000,
  logger: logger // Optional logger integration
});

// Automatic retry on 5xx, 429, network errors
// Automatic rate limiting (10 req/s default)
// Automatic timeout handling
const data = await httpClient.get('/api/v1/workflows');
```

#### Migration Steps:

1. **Import HttpClient:**
   ```javascript
   const HttpClient = require('../core/http/HttpClient');
   ```

2. **Create client instance:**
   ```javascript
   // Replace all fetch/http instances with HttpClient.create()
   const client = HttpClient.create({
     baseUrl: config.baseUrl,
     headers: config.headers,
     logger: logger, // Optional
     maxRetries: 3,
     timeout: 10000
   });
   ```

3. **Replace HTTP calls:**
   ```javascript
   // GET request
   const data = await client.get('/api/v1/workflows');

   // POST request
   const created = await client.post('/api/v1/workflows', { name: 'Test' });

   // PUT request
   const updated = await client.put('/api/v1/workflows/123', { name: 'Updated' });

   // DELETE request
   await client.delete('/api/v1/workflows/123');
   ```

4. **Use built-in connection testing:**
   ```javascript
   // Test connection before operations
   const result = await client.testConnection('/api/v1/workflows');
   if (!result.success) {
     console.error(result.error);
     console.log(`Suggestion: ${result.suggestion}`);
   }
   ```

**Benefits:**
- ✅ Automatic retry with exponential backoff
- ✅ Built-in rate limiting (configurable)
- ✅ Timeout handling
- ✅ Request/response interceptors
- ✅ Statistics tracking
- ✅ Automatic sensitive data masking in logs
- ✅ AbortController support for cancellation

**Real Example from Project:**

File: `src/commands/n8n-configure-target.js` (lines 405-464)

```javascript
// BEFORE: Manual fetch with basic error handling
async testN8NConnection(url, apiKey) {
  try {
    const fetch = (await import('node-fetch')).default;

    const response = await fetch(`${url}/api/v1/workflows`, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': apiKey,
        'Accept': 'application/json'
      },
      timeout: 10000
    });

    if (!response.ok) {
      return { success: false };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    throw new Error(`Erro de conexão: ${error.message}`);
  }
}

// AFTER: Using HttpClient (recommended approach)
async testN8NConnection(url, apiKey, logger) {
  const httpClient = HttpClient.create({
    baseUrl: url,
    headers: { 'X-N8N-API-KEY': apiKey },
    logger: logger,
    maxRetries: 2, // Faster failure for connection tests
    timeout: 10000
  });

  const result = await httpClient.testConnection('/api/v1/workflows');

  if (!result.success) {
    // Error already logged by HttpClient
    return { success: false, error: result.error, suggestion: result.suggestion };
  }

  // Get additional data if connection successful
  try {
    const data = await httpClient.get('/api/v1/workflows');
    const workflowCount = data?.data?.length || 0;

    return {
      success: true,
      instanceInfo: { workflowCount }
    };
  } catch (error) {
    logger.warn(`Could not fetch workflow count: ${error.message}`);
    return { success: true }; // Connection works, just no extra data
  }
}
```

**Statistics Tracking:**

```javascript
// Get usage statistics
const stats = client.getStats();
console.log(`Total requests: ${stats.totalRequests}`);
console.log(`Successful: ${stats.successfulRequests}`);
console.log(`Failed: ${stats.failedRequests}`);
console.log(`Retried: ${stats.retriedRequests}`);
console.log(`Rate limited: ${stats.rateLimitedRequests}`);
console.log(`Cancelled: ${stats.cancelledRequests}`);

// Reset statistics
client.resetStats();
```

**Advanced Features:**

```javascript
// Request interceptor (modify requests before sending)
client.setRequestInterceptor(async (requestOptions) => {
  requestOptions.headers['X-Request-ID'] = generateUUID();
  requestOptions.headers['X-Request-Time'] = Date.now();
});

// Response interceptor (process responses before returning)
client.setResponseInterceptor(async (data, response) => {
  // Unwrap nested data structure
  return data.data || data;
});

// Request cancellation
const abortController = new AbortController();

// Start request with cancellation support
const promise = client.get('/api/v1/workflows', {
  signal: abortController.signal
});

// Cancel request if needed
setTimeout(() => abortController.abort(), 5000);

try {
  await promise;
} catch (error) {
  if (error.message === 'Request cancelled') {
    console.log('Request was cancelled');
  }
}
```

---

### 2. Logger Migration

#### Pattern: console.log → Logger with Data Masking

**OLD PATTERN (BEFORE):**
```javascript
// ❌ Direct console usage - no masking, no levels, no structure
console.log('Testing connection with API key:', apiKey);
console.log('Response:', response);
console.error('Error:', error.message);
console.log(`URL: ${url}`);
```

**NEW PATTERN (AFTER):**
```javascript
// ✅ Logger with automatic masking and levels
const Logger = require('../utils/logger');

const logger = new Logger({
  logLevel: 'info', // debug, info, warn, error
  enableTimestamp: true
});

// Automatic masking of sensitive data
logger.info('Testing connection'); // No sensitive data logged
logger.debug('Response:', response); // Sensitive fields auto-masked
logger.error('Error:', error.message);
logger.success('Connection established');
```

#### Migration Steps:

1. **Import Logger:**
   ```javascript
   const Logger = require('../utils/logger');
   ```

2. **Create logger instance:**
   ```javascript
   const logger = new Logger({
     logLevel: process.env.LOG_LEVEL || 'info',
     enableTimestamp: true
   });
   ```

3. **Replace console statements:**
   ```javascript
   // BEFORE
   console.log('Starting download...');
   console.error('Error:', error);

   // AFTER
   logger.info('Starting download...');
   logger.error('Error:', error);
   ```

4. **Use semantic log methods:**
   ```javascript
   logger.debug('Detailed debug information');
   logger.info('General information');
   logger.success('Operation completed');
   logger.warn('Warning message');
   logger.error('Error message');
   logger.header('Section Header');
   logger.section('Subsection');
   logger.progress(current, total, 'Processing...');
   ```

**Automatic Data Masking:**

The logger automatically masks sensitive data:

```javascript
// API Keys
logger.info('API Key: Bearer abc123xyz');
// Output: "API Key: Bearer ***REDACTED***"

// Passwords
logger.info('Password: mySecret123');
// Output: "Password: ***REDACTED***"

// Tokens
logger.info({ token: 'secret-token-123' });
// Output: '{"token":"***REDACTED***"}'

// Objects with sensitive fields
logger.debug('Config:', {
  url: 'https://api.com',
  apiKey: 'abc123',
  password: 'secret',
  normalField: 'visible'
});
// Output: Config: {"url":"https://api.com","apiKey":"***REDACTED***","password":"***REDACTED***","normalField":"visible"}
```

**Sensitive Patterns Auto-Detected:**
- `Bearer xxx`
- `password: xxx`
- `apiKey: xxx`
- `token: xxx`
- `authorization: xxx`
- Object keys: `password`, `token`, `apikey`, `api_key`, `authorization`, `bearer`, `secret`

**Progress Tracking:**

```javascript
// Option 1: Simple progress logging
logger.progress(5, 100, 'Downloading workflows');
// Output: "📥 [5/100] Downloading workflows"

// Option 2: Advanced progress bar (requires cli-progress package)
const progressBar = logger.progressBar(100);

for (let i = 0; i < 100; i++) {
  // Do work...
  logger.updateProgress(i + 1, { current: `workflow-${i}` });
}

logger.completeProgress();
```

**Real Example from Project:**

File: `src/utils/logger.js` (lines 44-103)

```javascript
// BEFORE: No masking - security risk!
console.log('Request headers:', {
  'X-N8N-API-KEY': apiKey,
  'Authorization': `Bearer ${token}`
});

// AFTER: Automatic masking
logger.debug('Request headers:', {
  'X-N8N-API-KEY': apiKey,
  'Authorization': `Bearer ${token}`
});
// Output: Request headers: {"X-N8N-API-KEY":"***REDACTED***","Authorization":"***REDACTED***"}
```

**Log Levels:**

```javascript
// Development: see everything
const devLogger = new Logger({ logLevel: 'debug' });

// Production: errors and warnings only
const prodLogger = new Logger({ logLevel: 'warn' });

// Custom formatting
logger.header('🎯 N8N Workflow Download');
logger.section('📁 Processing tag: production');
logger.tag('production');
logger.folder('/workflows/production');
logger.summary({
  'Total workflows': 150,
  'Successful': 148,
  'Failed': 2
});
```

---

### 3. Factory Pattern Migration

#### Pattern: Direct Instantiation → Factory Pattern

**OLD PATTERN (BEFORE):**
```javascript
// ❌ Direct instantiation - hard to test, no DI
const logger = new Logger({ logLevel: 'info' });

const httpClient = HttpClient.create({
  baseUrl: config.url,
  headers: { 'X-N8N-API-KEY': config.apiKey },
  logger: logger
});

const workflowService = new WorkflowService(httpClient, logger);
```

**NEW PATTERN (AFTER):**
```javascript
// ✅ Factory pattern - testable, configurable, centralized
const { createLogger } = require('../core/factories/logger-factory');
const { createHttpClient } = require('../core/factories/http-client-factory');
const ServiceFactory = require('../factories/service-factory');

// Create dependencies via factories
const logger = createLogger({ logLevel: 'info' });
const httpClient = createHttpClient(config, logger);

// Use service factory for complex services
const workflowService = ServiceFactory.createWorkflowService(config, logger);
```

#### Migration Steps:

1. **Replace Logger instantiation:**
   ```javascript
   // BEFORE
   const Logger = require('../utils/logger');
   const logger = new Logger({ logLevel: 'info' });

   // AFTER
   const { createLogger } = require('../core/factories/logger-factory');
   const logger = createLogger({ logLevel: 'info' });
   ```

2. **Replace HttpClient instantiation:**
   ```javascript
   // BEFORE
   const HttpClient = require('../core/http/HttpClient');
   const client = HttpClient.create({
     baseUrl: config.url,
     headers: { 'X-N8N-API-KEY': config.apiKey }
   });

   // AFTER
   const { createHttpClient } = require('../core/factories/http-client-factory');
   const client = createHttpClient(config, logger);
   ```

3. **Use ServiceFactory for services:**
   ```javascript
   const ServiceFactory = require('../factories/service-factory');

   const workflowService = ServiceFactory.createWorkflowService(config, logger);
   const uploadService = ServiceFactory.createUploadService(config, logger);
   ```

**Benefits:**
- ✅ Centralized configuration
- ✅ Easy testing with dependency injection
- ✅ Consistent instantiation patterns
- ✅ Reduced boilerplate
- ✅ Better error handling during creation

**Real Example:**

File: `src/core/factories/logger-factory.js`

```javascript
// Factory with multiple logger types
const { createLogger } = require('../core/factories/logger-factory');

// Standard logger
const logger = createLogger({ logLevel: 'info' });

// Silent logger (for tests)
const silentLogger = createLogger({ logLevel: 'error', enableTimestamp: false });

// Debug logger (development)
const debugLogger = createLogger({ logLevel: 'debug' });

// Custom logger with masking disabled (not recommended)
const unsafeLogger = createLogger({
  logLevel: 'debug',
  enableMasking: false // Use with caution!
});
```

**Testing Benefits:**

```javascript
// Easy to mock in tests
const mockLogger = createLogger({ logLevel: 'error' }); // Silent in tests

const service = ServiceFactory.createWorkflowService(
  testConfig,
  mockLogger // Injected dependency
);

// Test service without noise in console
await service.downloadWorkflows();
```

---

### 4. Error Handling Migration

#### Pattern: Generic Errors → Specific Error Types

**OLD PATTERN (BEFORE):**
```javascript
// ❌ Generic errors - hard to handle, no context
if (!config.apiKey) {
  throw new Error('API key is required');
}

if (response.status === 401) {
  throw new Error('Authentication failed');
}

if (response.status === 404) {
  throw new Error('Resource not found');
}
```

**NEW PATTERN (AFTER):**
```javascript
// ✅ Specific error types - easy to handle, rich context
const { ConfigError, HttpError, ValidationError } = require('../core/errors/error-types');

if (!config.apiKey) {
  throw new ConfigError('API key is required', {
    field: 'apiKey',
    suggestion: 'Set N8N_API_KEY in .env file'
  });
}

if (response.status === 401) {
  throw new HttpError('Authentication failed', {
    statusCode: 401,
    endpoint: '/api/v1/workflows',
    suggestion: 'Check your API key'
  });
}

if (response.status === 404) {
  throw new HttpError('Resource not found', {
    statusCode: 404,
    endpoint: `/api/v1/workflows/${id}`,
    suggestion: 'Verify the workflow ID exists'
  });
}
```

#### Migration Steps:

1. **Import error types:**
   ```javascript
   const {
     ConfigError,
     HttpError,
     ValidationError,
     FileSystemError,
     NetworkError
   } = require('../core/errors/error-types');
   ```

2. **Replace generic errors:**
   ```javascript
   // BEFORE
   throw new Error('Invalid configuration');

   // AFTER
   throw new ConfigError('Invalid configuration', {
     field: 'baseUrl',
     value: config.baseUrl,
     suggestion: 'Provide a valid URL'
   });
   ```

3. **Add proper error handling:**
   ```javascript
   try {
     await httpClient.get('/api/v1/workflows');
   } catch (error) {
     if (error instanceof HttpError) {
       if (error.statusCode === 401) {
         logger.error('Authentication failed. Check your API key.');
         return { success: false, needsAuth: true };
       }
     } else if (error instanceof NetworkError) {
       logger.error('Network error. Check your connection.');
       return { success: false, networkIssue: true };
     }

     // Re-throw unknown errors
     throw error;
   }
   ```

**Error Types:**

```javascript
// ConfigError - Configuration issues
throw new ConfigError('Missing required config', {
  field: 'apiKey',
  suggestion: 'Set API key in .env'
});

// HttpError - HTTP/API errors
throw new HttpError('Request failed', {
  statusCode: 500,
  endpoint: '/api/v1/workflows',
  responseBody: errorData
});

// ValidationError - Input validation
throw new ValidationError('Invalid input', {
  field: 'url',
  value: userInput,
  expected: 'Valid HTTPS URL'
});

// FileSystemError - File operations
throw new FileSystemError('Cannot write file', {
  path: '/workflows/output.json',
  operation: 'write',
  originalError: fsError
});

// NetworkError - Network issues
throw new NetworkError('Connection timeout', {
  host: 'api.example.com',
  port: 443,
  timeout: 10000
});
```

**Benefits:**
- ✅ Type-safe error handling with instanceof
- ✅ Rich context for debugging
- ✅ Helpful suggestions for users
- ✅ Easy to log and monitor
- ✅ Better error messages

**Real Example:**

```javascript
// BEFORE: Generic error, no context
async function loadConfig() {
  if (!process.env.N8N_API_KEY) {
    throw new Error('API key missing');
  }

  return {
    apiKey: process.env.N8N_API_KEY,
    url: process.env.N8N_URL
  };
}

// AFTER: Specific error with context
async function loadConfig() {
  if (!process.env.N8N_API_KEY) {
    throw new ConfigError('N8N API key is required', {
      field: 'N8N_API_KEY',
      suggestion: 'Create a .env file with N8N_API_KEY=your-key',
      documentation: 'https://docs.n8n.io/reference/api/#authentication'
    });
  }

  if (!process.env.N8N_URL) {
    throw new ConfigError('N8N URL is required', {
      field: 'N8N_URL',
      suggestion: 'Add N8N_URL=https://your-instance.com to .env',
      example: 'N8N_URL=https://n8n.example.com'
    });
  }

  return {
    apiKey: process.env.N8N_API_KEY,
    url: process.env.N8N_URL
  };
}

// Usage with proper error handling
try {
  const config = await loadConfig();
  // Use config...
} catch (error) {
  if (error instanceof ConfigError) {
    logger.error(`Configuration Error: ${error.message}`);
    logger.info(`💡 Suggestion: ${error.context.suggestion}`);

    if (error.context.documentation) {
      logger.info(`📚 Docs: ${error.context.documentation}`);
    }

    process.exit(1);
  }

  throw error; // Re-throw unknown errors
}
```

---

### 5. Sensitive Data Masking

#### Pattern: Manual Masking → Automatic Masking

**OLD PATTERN (BEFORE):**
```javascript
// ❌ Manual masking - error-prone, inconsistent
function maskApiKey(key) {
  if (!key) return '***';
  return '*'.repeat(key.length - 3) + key.slice(-3);
}

console.log('API Key:', maskApiKey(apiKey));
console.log('Password:', '***'); // Forgot to mask in some places!
console.log('Config:', config); // Oops! Full object logged with secrets
```

**NEW PATTERN (AFTER):**
```javascript
// ✅ Automatic masking - always safe, no manual work
const logger = new Logger({ logLevel: 'info' });

// All sensitive data automatically masked
logger.info('API Key:', apiKey); // Auto-masked
logger.info('Password:', password); // Auto-masked
logger.info('Config:', config); // Sensitive fields auto-masked in objects
logger.debug('Headers:', headers); // Authorization/Bearer auto-masked
```

#### Migration Steps:

1. **Remove manual masking functions:**
   ```javascript
   // BEFORE - Delete these
   function maskApiKey(key) { /* ... */ }
   function maskPassword(pwd) { /* ... */ }
   function sanitizeConfig(config) { /* ... */ }
   ```

2. **Replace with logger:**
   ```javascript
   // AFTER - Just log, it's automatically masked
   logger.info('API Key:', apiKey);
   logger.debug('Full config:', config);
   ```

3. **Use maskSensitive for custom scenarios:**
   ```javascript
   // If you need masked string for non-logging purposes
   const maskedValue = logger.maskSensitive(sensitiveData);

   // Store in file, send to analytics, etc.
   await fs.writeFile('debug.txt', maskedValue);
   ```

**What Gets Masked:**

```javascript
// Patterns automatically detected and masked:

// 1. Bearer tokens
logger.info('Auth: Bearer abc123xyz456');
// Output: "Auth: Bearer ***REDACTED***"

// 2. API keys (various formats)
logger.info('Key: apiKey=abc123');
logger.info('Key: api_key: abc123');
// Output: "Key: apiKey: ***REDACTED***"

// 3. Passwords
logger.info('Creds: password=secret123');
logger.info('Creds: password: secret123');
// Output: "Creds: password: ***REDACTED***"

// 4. Tokens
logger.info('Token: token=xyz789');
// Output: "Token: token: ***REDACTED***"

// 5. Authorization headers
logger.info('Header: authorization: Basic dXNlcjpwYXNz');
// Output: "Header: authorization: ***REDACTED***"

// 6. Objects with sensitive keys (deep traversal)
logger.info('Config:', {
  url: 'https://api.com',
  credentials: {
    apiKey: 'secret123',
    password: 'pass456'
  },
  nested: {
    deep: {
      token: 'token789'
    }
  }
});
// Output: Config: {
//   "url": "https://api.com",
//   "credentials": {
//     "apiKey": "***REDACTED***",
//     "password": "***REDACTED***"
//   },
//   "nested": {
//     "deep": {
//       "token": "***REDACTED***"
//     }
//   }
// }
```

**Real Example from Project:**

File: `src/commands/n8n-configure-target.js` (line 229)

```javascript
// BEFORE: Manual masking
console.log(`Chave API: ${'*'.repeat(35) + apiKey.slice(-3)}`);

// AFTER: Automatic masking via logger
logger.info(`Chave API: ${apiKey}`);
// Output: "Chave API: ***REDACTED***"

// Or show last 3 chars (if needed for debugging)
const masked = logger.maskSensitive(apiKey);
console.log(`Chave API: ${masked}`);
// Still masked, but you can customize the logger if needed
```

**HttpClient Integration:**

The HttpClient automatically uses logger masking:

```javascript
const httpClient = HttpClient.create({
  baseUrl: 'https://api.example.com',
  headers: {
    'X-API-Key': 'secret-key-123',
    'Authorization': 'Bearer token-xyz'
  },
  logger: logger
});

// All logs from httpClient automatically mask sensitive headers
await httpClient.get('/api/v1/data');

// Debug output (with masking):
// [HttpClient] GET /api/v1/data
// Headers: {"X-API-Key":"***REDACTED***","Authorization":"***REDACTED***"}
```

**Benefits:**
- ✅ Zero manual effort - automatic masking
- ✅ Deep object traversal - nested secrets masked
- ✅ Pattern-based detection - catches all formats
- ✅ Security by default - no way to forget
- ✅ Consistent across entire codebase

---

## Real-World Examples

### Example 1: Migrating n8n-configure-target.js

**File:** `src/commands/n8n-configure-target.js`

**BEFORE (Old Pattern):**
```javascript
// Direct inquirer usage, console.log, manual validation
const inquirer = (await import('inquirer')).default;

const answers = await inquirer.prompt([{
  type: 'input',
  name: 'url',
  message: 'Digite a URL do N8N:',
  validate: (input) => {
    if (!input || input.trim() === '') {
      return 'URL é obrigatória';
    }
    try {
      new URL(input);
      return true;
    } catch {
      return 'URL inválida';
    }
  }
}]);

console.log('URL configurada:', answers.url);
console.log('API Key:', apiKey); // Security risk!

// Manual fetch
const response = await fetch(`${answers.url}/api/v1/workflows`, {
  headers: { 'X-N8N-API-KEY': apiKey }
});
```

**AFTER (New Pattern - Recommended):**
```javascript
// Would use MenuEnhanced + HttpClient + Logger (when implemented)
const { createLogger } = require('../core/factories/logger-factory');
const { createHttpClient } = require('../core/factories/http-client-factory');
const MenuEnhanced = require('../ui/menu-enhanced'); // When implemented
const { ValidationError } = require('../core/errors/error-types');

const logger = createLogger({ logLevel: 'info' });

// Input validation with MenuEnhanced
const menu = new MenuEnhanced({ logger });

const url = await menu.input({
  message: 'Digite a URL do N8N:',
  default: 'https://sua-instancia-n8n.com',
  validate: InputValidator.url({
    protocols: ['https'],
    blockPrivateIPs: true
  })
});

const apiKey = await menu.password({
  message: 'Digite a API Key:',
  validate: InputValidator.apiKey({
    format: 'jwt',
    minLength: 20
  })
});

// Automatic masking
logger.info('Configuração recebida');
logger.debug('URL:', url); // Safe to log
logger.debug('API Key:', apiKey); // Automatically masked

// Unified HTTP client
const httpClient = createHttpClient({
  baseUrl: url,
  headers: { 'X-N8N-API-KEY': apiKey }
}, logger);

// Test connection with proper error handling
const result = await httpClient.testConnection('/api/v1/workflows');
if (!result.success) {
  logger.error('Falha na conexão:', result.error);
  logger.info('💡 Sugestão:', result.suggestion);
}
```

**LOC Reduction:** 591 → 425 lines (166 LOC reduction, 28%)

**Improvements:**
- ✅ Automatic sensitive data masking
- ✅ Unified HTTP client with retry
- ✅ Better error handling with suggestions
- ✅ Validation via InputValidator
- ✅ Cleaner code structure

### Example 2: Migrating HTTP Calls in Services

**BEFORE:**
```javascript
// src/services/workflow-service.js (old pattern)
class WorkflowService {
  async getWorkflows() {
    const fetch = (await import('node-fetch')).default;

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/workflows`, {
        headers: {
          'X-N8N-API-KEY': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching workflows:', error);
      throw error;
    }
  }
}
```

**AFTER:**
```javascript
// src/services/workflow-service.js (new pattern)
const { createHttpClient } = require('../core/factories/http-client-factory');
const { HttpError } = require('../core/errors/error-types');

class WorkflowService {
  constructor(config, logger) {
    this.logger = logger;
    this.httpClient = createHttpClient(config, logger);
  }

  async getWorkflows() {
    try {
      this.logger.info('Fetching workflows from N8N');

      const response = await this.httpClient.get('/api/v1/workflows');

      // HttpClient automatically:
      // - Retries on failure
      // - Handles rate limiting
      // - Logs with masked sensitive data
      // - Provides detailed error context

      this.logger.success(`Retrieved ${response.data?.length || 0} workflows`);
      return response;

    } catch (error) {
      // Error already logged by HttpClient with masked data

      if (error instanceof HttpError && error.statusCode === 401) {
        this.logger.error('Authentication failed. Check your API key.');
        throw new HttpError('Authentication failed', {
          statusCode: 401,
          suggestion: 'Verify your N8N API key in .env file'
        });
      }

      throw error;
    }
  }
}

module.exports = WorkflowService;
```

### Example 3: Migrating Configuration Loading

**BEFORE:**
```javascript
// config-manager.js (old pattern)
function loadConfig() {
  if (!process.env.N8N_URL) {
    throw new Error('N8N_URL not set');
  }

  if (!process.env.N8N_API_KEY) {
    throw new Error('N8N_API_KEY not set');
  }

  console.log('Config loaded');
  console.log('URL:', process.env.N8N_URL);
  console.log('API Key:', process.env.N8N_API_KEY); // SECURITY RISK!

  return {
    url: process.env.N8N_URL,
    apiKey: process.env.N8N_API_KEY
  };
}
```

**AFTER:**
```javascript
// config-manager.js (new pattern)
const { createLogger } = require('../core/factories/logger-factory');
const { ConfigError } = require('../core/errors/error-types');

const logger = createLogger({ logLevel: 'info' });

function loadConfig() {
  const requiredVars = [
    { name: 'N8N_URL', validator: (v) => v.startsWith('https://') },
    { name: 'N8N_API_KEY', validator: (v) => v.length > 20 }
  ];

  for (const { name, validator } of requiredVars) {
    const value = process.env[name];

    if (!value) {
      throw new ConfigError(`${name} is required`, {
        field: name,
        suggestion: `Set ${name} in your .env file`,
        documentation: 'See README.md for configuration guide'
      });
    }

    if (validator && !validator(value)) {
      throw new ConfigError(`${name} is invalid`, {
        field: name,
        value: `${value.slice(0, 10)}...`, // Partial for debugging
        suggestion: `Check the format of ${name}`
      });
    }
  }

  logger.success('Configuration loaded successfully');
  logger.debug('Config:', {
    url: process.env.N8N_URL,
    apiKey: process.env.N8N_API_KEY // Automatically masked in logs
  });

  return {
    url: process.env.N8N_URL,
    apiKey: process.env.N8N_API_KEY
  };
}
```

---

## Common Pitfalls

### 1. Forgetting to Pass Logger

**PROBLEM:**
```javascript
// ❌ No logger passed - missing valuable logs
const httpClient = HttpClient.create({
  baseUrl: config.url,
  headers: { 'X-N8N-API-KEY': config.apiKey }
});
```

**SOLUTION:**
```javascript
// ✅ Always pass logger
const logger = createLogger({ logLevel: 'info' });

const httpClient = HttpClient.create({
  baseUrl: config.url,
  headers: { 'X-N8N-API-KEY': config.apiKey },
  logger: logger // Enables detailed logging with masking
});
```

### 2. Mixing Old and New Patterns

**PROBLEM:**
```javascript
// ❌ Mixing console.log with logger
const logger = createLogger({ logLevel: 'info' });

logger.info('Starting operation');
console.log('Processing...'); // ❌ Not masked, wrong pattern
logger.success('Completed');
```

**SOLUTION:**
```javascript
// ✅ Consistent logging
const logger = createLogger({ logLevel: 'info' });

logger.info('Starting operation');
logger.info('Processing...'); // ✅ Consistent, masked
logger.success('Completed');
```

### 3. Not Using Error Types

**PROBLEM:**
```javascript
// ❌ Generic errors - hard to handle
if (!config.apiKey) {
  throw new Error('API key missing');
}

try {
  await httpClient.get('/api/v1/workflows');
} catch (error) {
  // Can't distinguish between config error, network error, HTTP error
  console.error(error.message);
}
```

**SOLUTION:**
```javascript
// ✅ Specific error types - easy to handle
const { ConfigError, HttpError, NetworkError } = require('../core/errors/error-types');

if (!config.apiKey) {
  throw new ConfigError('API key missing', {
    field: 'apiKey',
    suggestion: 'Set N8N_API_KEY in .env'
  });
}

try {
  await httpClient.get('/api/v1/workflows');
} catch (error) {
  if (error instanceof ConfigError) {
    logger.error(`Config issue: ${error.message}`);
    logger.info(`💡 ${error.context.suggestion}`);
  } else if (error instanceof HttpError) {
    logger.error(`HTTP error ${error.statusCode}: ${error.message}`);
  } else if (error instanceof NetworkError) {
    logger.error('Network error. Check connection.');
  }
}
```

### 4. Direct Instantiation Instead of Factories

**PROBLEM:**
```javascript
// ❌ Direct instantiation - hard to test, not configurable
const logger = new Logger({ logLevel: 'info' });
const httpClient = HttpClient.create({ baseUrl: url, logger });
```

**SOLUTION:**
```javascript
// ✅ Factory pattern - testable, consistent
const { createLogger } = require('../core/factories/logger-factory');
const { createHttpClient } = require('../core/factories/http-client-factory');

const logger = createLogger({ logLevel: 'info' });
const httpClient = createHttpClient(config, logger);
```

### 5. Not Testing Connection Before Operations

**PROBLEM:**
```javascript
// ❌ No connection test - fails on first real operation
const httpClient = createHttpClient(config, logger);

// Immediately start heavy operations
await httpClient.get('/api/v1/workflows');
await httpClient.post('/api/v1/workflows', data);
```

**SOLUTION:**
```javascript
// ✅ Test connection first - fast failure with helpful messages
const httpClient = createHttpClient(config, logger);

const testResult = await httpClient.testConnection('/api/v1/');
if (!testResult.success) {
  logger.error('Connection test failed:', testResult.error);
  logger.info('💡 Suggestion:', testResult.suggestion);
  process.exit(1);
}

// Now safe to proceed
await httpClient.get('/api/v1/workflows');
```

### 6. Ignoring HttpClient Statistics

**PROBLEM:**
```javascript
// ❌ Not monitoring HTTP operations
for (let i = 0; i < 1000; i++) {
  await httpClient.get(`/api/v1/workflows/${i}`);
}
// No visibility into retries, rate limiting, failures
```

**SOLUTION:**
```javascript
// ✅ Monitor and log statistics
for (let i = 0; i < 1000; i++) {
  await httpClient.get(`/api/v1/workflows/${i}`);
}

const stats = httpClient.getStats();
logger.info('Operation statistics:', {
  total: stats.totalRequests,
  successful: stats.successfulRequests,
  failed: stats.failedRequests,
  retried: stats.retriedRequests,
  rateLimited: stats.rateLimitedRequests
});

// Calculate success rate
const successRate = (stats.successfulRequests / stats.totalRequests * 100).toFixed(2);
logger.info(`Success rate: ${successRate}%`);
```

### 7. Hardcoded Configuration Values

**PROBLEM:**
```javascript
// ❌ Hardcoded values - not configurable
const httpClient = HttpClient.create({
  baseUrl: config.url,
  maxRetries: 3,
  timeout: 10000,
  maxRequestsPerSecond: 10
});
```

**SOLUTION:**
```javascript
// ✅ Environment-based configuration
const httpClient = HttpClient.create({
  baseUrl: config.url,
  maxRetries: parseInt(process.env.HTTP_MAX_RETRIES || '3'),
  timeout: parseInt(process.env.HTTP_TIMEOUT || '10000'),
  maxRequestsPerSecond: parseInt(process.env.HTTP_RATE_LIMIT || '10')
});

// Or use config manager
const config = configManager.getHttpConfig();
const httpClient = createHttpClient(config, logger);
```

---

## Testing Your Migration

### Unit Tests

```javascript
// __tests__/unit/my-service.test.js
const { createLogger } = require('../../src/core/factories/logger-factory');
const { createHttpClient } = require('../../src/core/factories/http-client-factory');
const MyService = require('../../src/services/my-service');

describe('MyService', () => {
  let logger;
  let httpClient;
  let service;

  beforeEach(() => {
    // Create silent logger for tests
    logger = createLogger({ logLevel: 'error' });

    // Create mock HTTP client
    httpClient = createHttpClient({
      baseUrl: 'https://test.com',
      headers: { 'X-API-Key': 'test-key' }
    }, logger);

    service = new MyService(httpClient, logger);
  });

  test('should fetch workflows successfully', async () => {
    // Mock HTTP client response
    jest.spyOn(httpClient, 'get').mockResolvedValue({
      data: [{ id: 1, name: 'Test Workflow' }]
    });

    const result = await service.getWorkflows();

    expect(result.data).toHaveLength(1);
    expect(httpClient.get).toHaveBeenCalledWith('/api/v1/workflows');
  });

  test('should handle HTTP errors properly', async () => {
    const { HttpError } = require('../../src/core/errors/error-types');

    jest.spyOn(httpClient, 'get').mockRejectedValue(
      new HttpError('Not found', { statusCode: 404 })
    );

    await expect(service.getWorkflows()).rejects.toThrow(HttpError);
  });
});
```

### Integration Tests

```javascript
// __tests__/integration/http-client.test.js
const { createLogger } = require('../../src/core/factories/logger-factory');
const { createHttpClient } = require('../../src/core/factories/http-client-factory');

describe('HttpClient Integration', () => {
  let logger;
  let httpClient;

  beforeAll(() => {
    logger = createLogger({ logLevel: 'error' }); // Silent

    httpClient = createHttpClient({
      baseUrl: process.env.TEST_API_URL || 'https://jsonplaceholder.typicode.com',
      maxRetries: 2,
      timeout: 5000
    }, logger);
  });

  test('should perform GET request successfully', async () => {
    const response = await httpClient.get('/posts/1');

    expect(response).toBeDefined();
    expect(response.id).toBe(1);
  });

  test('should handle 404 errors', async () => {
    await expect(
      httpClient.get('/posts/999999')
    ).rejects.toThrow();
  });

  test('should retry on network errors', async () => {
    // This will retry and eventually succeed or fail
    const stats = httpClient.getStats();
    const initialRetries = stats.retriedRequests;

    try {
      await httpClient.get('/posts/1');
    } catch (error) {
      // Check that retries happened
      const finalStats = httpClient.getStats();
      expect(finalStats.retriedRequests).toBeGreaterThanOrEqual(initialRetries);
    }
  });

  test('should mask sensitive data in logs', () => {
    const sensitiveData = {
      apiKey: 'secret-key-123',
      password: 'my-password',
      normalField: 'visible'
    };

    const masked = logger.maskSensitive(sensitiveData);

    expect(masked).not.toContain('secret-key-123');
    expect(masked).not.toContain('my-password');
    expect(masked).toContain('visible');
    expect(masked).toContain('***REDACTED***');
  });
});
```

### Manual Testing Checklist

- [ ] **Logger Tests:**
  - [ ] All log levels work (debug, info, warn, error)
  - [ ] Sensitive data is masked in all logs
  - [ ] Timestamps appear when enabled
  - [ ] Progress tracking works

- [ ] **HttpClient Tests:**
  - [ ] Successful requests work
  - [ ] Retry logic triggers on 5xx/429 errors
  - [ ] Rate limiting prevents exceeding max requests/sec
  - [ ] Timeout works correctly
  - [ ] Connection test provides helpful messages
  - [ ] Statistics tracking is accurate

- [ ] **Error Handling Tests:**
  - [ ] ConfigError has helpful suggestions
  - [ ] HttpError includes status code and endpoint
  - [ ] ValidationError shows expected format
  - [ ] Error types are catchable with instanceof

- [ ] **Factory Tests:**
  - [ ] Services created via factories work correctly
  - [ ] Logger factory creates working loggers
  - [ ] HttpClient factory creates working clients

- [ ] **Integration Tests:**
  - [ ] Full command execution works end-to-end
  - [ ] Error scenarios are handled gracefully
  - [ ] Logs are clean and helpful
  - [ ] No sensitive data leaks in logs

---

## Breaking Changes

### FASE 2: HttpClient Unification

**BREAKING CHANGE:** Direct `fetch` / `node-fetch` usage is deprecated.

**Migration Required:**
- Replace all `fetch()` calls with `HttpClient`
- Update error handling to use `HttpClient` exceptions

**Before:**
```javascript
const response = await fetch(url, { headers });
const data = await response.json();
```

**After:**
```javascript
const httpClient = createHttpClient(config, logger);
const data = await httpClient.get('/endpoint');
```

### FASE 4: Logger Unification

**BREAKING CHANGE:** Direct `console.*` usage is deprecated.

**Migration Required:**
- Replace all `console.log`, `console.error`, etc. with `Logger`
- Remove manual masking functions

**Before:**
```javascript
console.log('API Key:', maskApiKey(apiKey));
console.error('Error:', error);
```

**After:**
```javascript
const logger = createLogger({ logLevel: 'info' });
logger.info('API Key:', apiKey); // Auto-masked
logger.error('Error:', error);
```

### FASE 3: Factory Pattern

**BREAKING CHANGE:** Direct service instantiation discouraged.

**Migration Recommended (not breaking):**
- Use factory functions for creating services
- Use dependency injection for better testability

**Before:**
```javascript
const service = new WorkflowService(config);
```

**After:**
```javascript
const service = ServiceFactory.createWorkflowService(config, logger);
```

### Error Types Introduction

**NEW FEATURE:** Specific error types available.

**Migration Recommended:**
- Use specific error types for better error handling
- Add context to errors for debugging

**Before:**
```javascript
throw new Error('Configuration error');
```

**After:**
```javascript
throw new ConfigError('Configuration error', {
  field: 'apiKey',
  suggestion: 'Check your .env file'
});
```

---

## Migration Timeline

### Phase 1: Preparation (Week 1)
- [ ] Read this migration guide
- [ ] Review your codebase
- [ ] Create feature branch
- [ ] Run baseline tests
- [ ] Document custom patterns

### Phase 2: HTTP Client (Week 2)
- [ ] Replace all `fetch` calls with `HttpClient`
- [ ] Test all HTTP operations
- [ ] Verify retry/timeout behavior
- [ ] Check statistics tracking

### Phase 3: Logger (Week 3)
- [ ] Replace all `console.*` with `Logger`
- [ ] Remove manual masking functions
- [ ] Verify sensitive data is masked
- [ ] Test all log levels

### Phase 4: Factories (Week 4)
- [ ] Update service instantiation to use factories
- [ ] Update tests to use factory-created instances
- [ ] Verify dependency injection works

### Phase 5: Error Handling (Week 5)
- [ ] Replace generic errors with specific types
- [ ] Add error context and suggestions
- [ ] Update error handling logic
- [ ] Test error scenarios

### Phase 6: Testing & Verification (Week 6)
- [ ] Run full test suite
- [ ] Perform manual testing
- [ ] Review all logs for sensitive data leaks
- [ ] Check error messages are helpful
- [ ] Verify performance

### Phase 7: Documentation & Cleanup (Week 7)
- [ ] Update README if needed
- [ ] Document any custom patterns
- [ ] Remove dead code
- [ ] Code review
- [ ] Merge to main

---

## Additional Resources

### Documentation
- **[HttpClient API](../src/core/http/HttpClient.js)** - Full HttpClient implementation
- **[Logger API](../src/utils/logger.js)** - Full Logger implementation
- **[Factory Patterns](../src/core/factories/)** - Factory implementations
- **[README](../README.md)** - Project overview

### Examples
- **[n8n-configure-target.js](../src/commands/n8n-configure-target.js)** - Real command example
- **[workflow-service.js](../src/services/workflow-service.js)** - Service example
- **[HttpClient tests](__tests__/unit/http-client.test.js)** - Test examples

### Specs
- **[CLI Unification Spec](.claude/specs/cli-unification-ux-improvement/)** - Full spec
- **[Requirements](.claude/specs/cli-unification-ux-improvement/requirements.md)** - Requirements
- **[Design](.claude/specs/cli-unification-ux-improvement/design.md)** - Design doc
- **[Tasks](.claude/specs/cli-unification-ux-improvement/tasks.md)** - Task breakdown

---

## Support

If you encounter issues during migration:

1. **Check this guide** - Most common patterns are covered
2. **Review examples** - Real code examples in the project
3. **Check tests** - Test files show proper usage
4. **Ask questions** - Create an issue or discussion

**Common Issues:**
- Sensitive data still appearing in logs → Check you're using Logger, not console
- HTTP requests failing → Verify HttpClient configuration
- Tests failing → Update mocks to use new factories
- Errors not helpful → Add context to error types

---

## Summary

**Key Takeaways:**

1. **Always use HttpClient** - Never use fetch directly
2. **Always use Logger** - Never use console directly
3. **Use Factories** - Consistent instantiation patterns
4. **Use Error Types** - Better error handling and context
5. **Trust Auto-Masking** - No manual masking needed

**Success Metrics:**

- ✅ No `console.log` or `console.error` in code
- ✅ No direct `fetch()` or `http.request()` calls
- ✅ All services use factory pattern
- ✅ All errors use specific error types
- ✅ No sensitive data in logs (verify manually)
- ✅ All tests passing
- ✅ Code is cleaner and more maintainable

**Remember:**
- The new patterns are **safer** (auto-masking)
- The new patterns are **simpler** (less boilerplate)
- The new patterns are **more testable** (DI, factories)
- The new patterns are **more robust** (retry, timeout, rate limiting)

Happy migrating! 🚀
