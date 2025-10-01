# Commands Directory

This directory contains all CLI command implementations for the Docs-Jana tool.

## Architecture

Commands are invoked through the **CommandOrchestrator** in [`index.js`](../../index.js), which provides:
- **Service injection** via ServiceContainer
- **Configuration loading** via ConfigManager
- **Lifecycle management** (initialize → run → cleanup)

### Command Interface

Each command exports an `execute` function that receives:

```javascript
/**
 * @param {string[]} args - Command arguments
 * @param {Object} config - Loaded configuration object
 * @param {ServiceContainer} container - Service container for dependency resolution
 * @returns {Promise<Object>} Command result
 */
async function execute(args, config, container) {
  // Resolve services from container
  const logger = container.resolve('logger');
  const fileManager = container.resolve('fileManager');

  // Command implementation
  logger.info('Executing command');

  return { success: true };
}

module.exports = { execute };
```

## Available Commands

### N8N Commands

- **n8n-download.js**: Download workflows from N8N instance
- **n8n-upload.js**: Upload workflows to N8N instance

### Outline Commands

- **outline-download.js**: Download documentation from Outline

### Documentation Commands

- **docs-generate.js**: Generate markdown documentation from workflow sticky notes

### Test Commands

- **test-migration.js**: Run workflow migration tests
- **test-outline.js**: Run Outline integration tests

## Adding New Commands

### Step 1: Create Command Handler

Create a new file in this directory: `my-command.js`

```javascript
// src/commands/my-command.js

/**
 * Execute my custom command
 *
 * @param {string[]} args - Command arguments
 * @param {Object} config - Configuration object
 * @param {ServiceContainer} container - Service container
 * @returns {Promise<Object>} Command result
 */
async function execute(args, config, container) {
  // Resolve services from container
  const logger = container.resolve('logger');
  const httpClient = container.resolve('httpClient');
  const fileManager = container.resolve('fileManager');

  logger.info('Executing my custom command');

  // Your command logic here
  // ...

  return {
    success: true,
    message: 'Command completed',
    data: { /* your result data */ }
  };
}

module.exports = { execute };
```

### Step 2: Register Command

Add to `index.js` command map in `CommandOrchestrator.resolveCommandHandler()`:

```javascript
const commandMap = {
  'n8n:download': './src/commands/n8n-download',
  'n8n:upload': './src/commands/n8n-upload',
  'outline:download': './src/commands/outline-download',
  'my:command': './src/commands/my-command'  // Add here
};
```

### Step 3: Add Help Text

Add to `cli.js` help message in `printHelp()`:

```javascript
  My Commands:
    my:command            Description of my command
                          Aliases: my:cmd
```

### Step 4: Test

```bash
# Test CLI
node cli.js my:command --help

# Test programmatically
node -e "
const { executeCommand } = require('./index.js');
executeCommand({
  command: 'my:command',
  args: [],
  flags: {},
  env: process.env
}).then(r => console.log(r));
"
```

## Command Guidelines

- **Use clear, descriptive names** following pattern `category:action` (e.g., `n8n:download`)
- **Resolve dependencies from container** - Don't create services directly
- **Validate inputs early** - Check required config before processing
- **Provide progress feedback** for long operations using logger
- **Handle errors gracefully** - Return structured error objects
- **Use environment variables** for sensitive config via ConfigManager
- **Log important actions** using resolved logger service
- **Return structured results** - Always return `{ success, message, data }` format

### Best Practices

1. **Dependency Resolution**:
   ```javascript
   // ✅ Good: Resolve from container
   const logger = container.resolve('logger');

   // ❌ Bad: Direct instantiation
   const logger = new Logger();
   ```

2. **Configuration Access**:
   ```javascript
   // ✅ Good: Use provided config
   const apiKey = config.apiKey;

   // ❌ Bad: Read env directly
   const apiKey = process.env.API_KEY;
   ```

3. **Error Handling**:
   ```javascript
   // ✅ Good: Let orchestrator handle
   throw new Error('Invalid configuration');

   // ❌ Bad: process.exit
   process.exit(1);
   ```

### Learn More

- **[CLI Architecture](../../docs/architecture/CLI-ARCHITECTURE.md)** - Complete architecture documentation
- **[Service Factory](../../docs/architecture/SERVICE-FACTORY.md)** - Service management patterns
