# Commands Directory

This directory contains all CLI command implementations for the Docs-Jana tool.

## Architecture

Each command follows a standard interface:

```javascript
class CommandName {
  static async execute(args) {
    // Command implementation
  }
}

module.exports = CommandName;
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

1. Create a new file in this directory: `my-command.js`
2. Implement the command class with `execute(args)` method
3. Register the command in `cli.js` COMMANDS registry
4. Add documentation to main README.md

Example:

```javascript
// my-command.js
class MyCommand {
  static async execute(args) {
    console.log('Executing my command with args:', args);
    // Implementation here
  }
}

module.exports = MyCommand;
```

```javascript
// In cli.js, add to COMMANDS object:
'my:command': {
  description: 'Description of my command',
  handler: () => require('./src/commands/my-command'),
  aliases: ['mycommand']
}
```

## Command Guidelines

- Use clear, descriptive names
- Provide `--help` option for each command
- Validate inputs early
- Provide progress feedback for long operations
- Handle errors gracefully
- Use environment variables for sensitive config
- Log important actions
- Return appropriate exit codes (0 = success, 1+ = error)
