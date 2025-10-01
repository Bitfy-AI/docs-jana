# Legacy Scripts

This directory contains the original standalone scripts that have been superseded by the unified CLI (`cli.js`).

## ⚠️ Deprecated

These scripts are **deprecated** and maintained only for backward compatibility.

**Please use the new unified CLI instead:**

```bash
# Instead of:
node legacy/download-n8n-workflows.js

# Use:
docs-jana n8n:download
# or
npm run n8n:download
```

## Migration Guide

| Old Script | New CLI Command |
|------------|----------------|
| `download-n8n-workflows.js` | `docs-jana n8n:download` |
| `upload-n8n-workflows.js` | `docs-jana n8n:upload` |
| `download-outline-docs.js` | `docs-jana outline:download` |
| `generate-docs.js` | `docs-jana docs:generate` |
| `test-migration.js` | `docs-jana test:migration` |
| `test-outline-integration.js` | `docs-jana test:outline` |

## Why Deprecated?

1. **Unified Interface**: All commands now accessible through single CLI
2. **Better UX**: Improved help, error messages, and feedback
3. **Consistency**: Standardized argument parsing across all commands
4. **Maintainability**: Single codebase, easier to maintain
5. **Extensibility**: Easy to add new commands

## Removal Timeline

- **v2.0.0** (current): Scripts moved to `legacy/` directory
- **v2.1.0** (planned): Scripts will show deprecation warning
- **v3.0.0** (planned): Scripts will be removed entirely

## Need Help?

See main [README.md](../README.md) for complete documentation of the new CLI.
