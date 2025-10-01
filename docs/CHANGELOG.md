# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
