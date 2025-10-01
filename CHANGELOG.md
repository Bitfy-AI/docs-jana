# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0] - 2025-10-01

### Added

- **CLI Architecture Refactor**: Complete architectural refactoring with three-layer design
  - **Orchestration Layer** (`index.js`): ServiceContainer, CommandOrchestrator, executeCommand() API
  - **Service Locator Pattern**: Centralized service management with lazy instantiation
  - **Programmatic API**: index.js can be used outside CLI context
  - **Performance**: ~1ms average orchestration overhead (measured)

- **Project Organization**:
  - `scripts/` directory for test and admin scripts (22 files reorganized)
  - `docs/` directory for technical documentation (10 files moved)
  - `examples/` directory with CLI examples (simple-cli, n8n-import)
  - Comprehensive READMEs at all levels

- **Documentation**:
  - **[CLI-ARCHITECTURE.md](docs/architecture/CLI-ARCHITECTURE.md)**: Complete architecture documentation
  - **[SERVICE-FACTORY.md](docs/architecture/SERVICE-FACTORY.md)**: Service management patterns
  - **[LEARNING-CLI.md](LEARNING-CLI.md)**: 445-line CLI internals guide
  - **[scripts/README.md](scripts/README.md)**: 350+ line scripts documentation
  - **[docs/README.md](docs/README.md)**: 240-line documentation index
  - Updated [src/commands/README.md](src/commands/README.md) with orchestration integration

- **Testing**:
  - `test-orchestration.js`: 19 comprehensive tests (100% passing)
  - `test-programmatic-usage.js`: 6 API usage tests (100% passing)
  - `test-performance.js`: Performance benchmarks (1.08ms average, 97.8% under 50ms budget)
  - Husky pre-commit hooks: 100% compatible

- **Interactive CLI**: Menu system when run without arguments
- **Argument Parsing**: Enhanced with `--verbose`, `--debug`, `--dry-run` flags

### Changed

- **cli.js**: Refactored to thin CLI interface layer (user interaction only)
- **index.js**: New orchestration layer with ServiceContainer and CommandOrchestrator (468 lines)
- **.gitignore**: Fixed critical bug - docs/ directory was being ignored
- **README.md**: Added Architecture section with three-layer diagram

### Fixed

- **Critical .gitignore bug**: docs/ was being ignored, blocking technical documentation from git
  - Changed generic `docs/` rule to specific `outline-docs/` and `downloaded-docs/`
  - All technical documentation now properly tracked

- **ConfigManager instantiation**: Fixed bug in loadConfiguration() where ConfigManager was called as static class instead of being instantiated

### Migration

**⚠️ ZERO BREAKING CHANGES** - This release is 100% backward compatible:
- ✅ All existing CLI commands work unchanged
- ✅ All npm/pnpm scripts work unchanged
- ✅ All environment variables work unchanged
- ✅ All configuration files work unchanged
- ✅ All business logic (src/) unchanged

**New capabilities (non-breaking)**:
- index.js can now be used programmatically:
  ```javascript
  const { executeCommand } = require('./index.js');
  const result = await executeCommand({ command: 'n8n:download', args: [], flags: {}, env: process.env });
  ```

### Technical Details

**Architecture Layers**:
1. **CLI Layer** (cli.js): User interface, argument parsing, display
2. **Orchestration Layer** (index.js): ServiceContainer, CommandOrchestrator, lifecycle management
3. **Business Logic Layer** (src/): Commands, services, utilities (unchanged)

**Performance Metrics**:
- Orchestration overhead: 1.08ms average (100 iterations)
- Service instantiation: Lazy (only when needed)
- Memory cleanup: Automatic after each command

**Files Added**: 9 new files (1,500+ lines documentation and tests)
**Files Modified**: 7 core files (cli.js, index.js, README.md, etc.)
**Files Moved**: 22 files reorganized (scripts, docs)

## [2.1.0] - 2025-10-01

### Added

- **Folder filtering for uploads**: New `--folder` / `-F` flag to upload workflows from specific tag folders
- **Upload history tracking**: Automatic logging of last 50 upload operations in `.upload-history.json`
- **Tag management system**: Auto-detection and creation of tags from folder structure
- **Multi-instance support**: Separate environment variables for source and target N8N instances
- **Upload history display**: Shows last 3 upload operations at command start
- **Source folder detection**: Workflows remember their origin folder for tag assignment

### Fixed

- **Critical pagination bug**: Fixed workflow download stopping at 100 workflows instead of fetching all pages
  - Root cause: `nextCursor` was checked on wrong object (`data` array instead of `response` object)
  - Impact: Now successfully downloads all workflows (194 instead of 100)
  - Location: `src/services/workflow-service.js` line 60

### Changed

- **Download organization**: Workflows now organized by tag in separate folders (`workflows/{tag}/`)
- **Upload process**: Enhanced 3-phase upload with ID remapping and tag synchronization
- **Documentation**: Comprehensive README updates with new features and usage examples

### Technical Details

#### Pagination Fix
```javascript
// BEFORE (bugado):
const data = response.data || response;
const nextCursor = !Array.isArray(data) ? data.nextCursor : null;

// AFTER (corrigido):
const workflows = Array.isArray(response) ? response : (response.data || []);
const nextCursor = response.nextCursor || null;
```

## [2.0.0] - 2025-09-30

### Added

- Migrated to pnpm package manager
- Removed node_modules and package-lock.json
- Added pnpm-workspace.yaml
- Updated package.json with pnpm configuration

### Changed

- Project structure refactored for better organization
- Removed legacy folder and unimplemented commands
- Improved logger with compact JSON format
- Centralized architecture with unified patterns

### Fixed

- Improved filename sanitization in OutlineService
- Removed JSON indentation in logger maskSensitive

## [1.0.0] - Initial Release

### Added

- N8N workflow download/upload functionality
- Outline documentation integration
- Basic CLI interface
- Environment-based configuration
- Logger and HTTP client utilities
- Authentication strategies (API key and Basic Auth)
