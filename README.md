# 📚 Docs-Jana - Unified Documentation & Workflow Management CLI

> Modern, unified command-line interface for managing N8N workflows and Outline documentation

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/jana-team/docs-jana)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)](https://nodejs.org)

---

## 🌟 Features

- **🔄 N8N Workflow Management**: Download, upload, and migrate workflows between instances
- **📄 Outline Integration**: Download and manage documentation from Outline
- **📝 Auto Documentation**: Generate markdown docs from workflow sticky notes
- **🧪 Testing Tools**: Built-in migration and integration testing
- **⚡ Modern CLI**: Unified interface with intuitive commands
- **🎨 Clean Architecture**: Factory patterns, DI, and service layers
- **🔒 Secure**: Environment-based configuration, no hardcoded secrets

---

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/jana-team/docs-jana.git
cd docs-jana

# Install dependencies with pnpm
pnpm install

# Make CLI globally available (optional)
pnpm link --global
```

> **Note:** This project uses pnpm for package management. Install pnpm globally with: `npm install -g pnpm`

### Configuration

Create a `.env` file in the project root:

```bash
# N8N Configuration
N8N_BASE_URL=https://n8n.example.com
N8N_API_KEY=your-api-key-here

# Outline Configuration
OUTLINE_API_URL=https://outline.example.com/api
OUTLINE_API_TOKEN=your-token-here

# Optional
LOG_LEVEL=info
```

### Basic Usage

```bash
# Show help
docs-jana help

# Show version
docs-jana version

# List all available commands
docs-jana
```

---

## 📖 Commands

### N8N Workflows

#### Download Workflows

```bash
# Download all workflows organized by tags
docs-jana n8n:download --source --no-tag-filter --output ./workflows

# Download with tag filter
docs-jana n8n:download --source --tag jana --output ./workflows

# Download to specific directory
docs-jana n8n:download --output ./my-workflows

# Alternative: use npm script
npm run n8n:download
```

**Features:**
- ✅ **Automatic pagination**: Downloads all workflows (no limit)
- ✅ **Tag organization**: Creates folders by tag (workflows/{tag}/)
- ✅ **Source flag**: Use `--source` to download from source instance

#### Upload Workflows with Advanced Features

```bash
# 1. Validate before uploading (dry-run)
docs-jana n8n:upload --input ./workflows --folder jana --dry-run

# 2. Upload specific folder with tag sync
docs-jana n8n:upload --input ./workflows --folder jana --sync-tags

# 3. Force overwrite existing workflows
docs-jana n8n:upload --input ./workflows --folder jana --sync-tags --force

# 4. Upload all workflows without folder filter
docs-jana n8n:upload --input ./workflows --sync-tags

# 5. Skip ID remapping (if no executeWorkflow nodes)
docs-jana n8n:upload --input ./workflows --folder jana --skip-remap
```

**Features:**
- ✅ **Folder filtering**: Upload only workflows from specific tag folder
- ✅ **Automatic ID remapping**: Updates executeWorkflow node references (3-phase process)
- ✅ **Tag management**: Auto-detects tags from folder name, creates/links them
- ✅ **Upload history**: Tracks last 3 upload operations (saved in `.upload-history.json`)
- ✅ **Dry-run mode**: Validate workflows before uploading
- ✅ **Reference analysis**: Detects missing workflow dependencies
- ✅ **Progress reporting**: Real-time progress with detailed error reports

**3-Phase Upload Process:**
1. **Phase 1**: Initial upload (N8N assigns new IDs)
2. **Phase 2**: ID remapping (updates workflow references)
3. **Phase 3**: Re-upload with corrected references

**Upload History Display:**
```
📋 Últimas ações:
✅ [01/10 14:30] jana: 28/30 workflows uploaded
⚠️  [01/10 12:15] no-tag: 100/150 workflows uploaded (50 failed)
✅ [30/09 18:00] v1.0.1: 6/6 workflows uploaded
```

### Outline Documentation

#### Download Documentation

```bash
# Download all docs
docs-jana outline:download

# Download to specific directory
docs-jana outline:download --output ./docs

# Download specific collections
docs-jana outline:download --collections "Engineering,Product"

# With custom delay between requests
docs-jana outline:download --delay 500

# Verbose logging
docs-jana outline:download --verbose
```

### Documentation Generation

#### Generate Markdown Docs

```bash
# Generate docs from workflows
docs-jana docs:generate

# Generate from specific directory
docs-jana docs:generate --input ./workflows --output ./documentation

# With quality verification
docs-jana docs:generate --verify
```

### Testing

#### Migration Tests

```bash
# Run migration tests
docs-jana test:migration

# Test with specific workflows
docs-jana test:migration --input ./workflows
```

#### Outline Integration Tests

```bash
# Run Outline integration tests
docs-jana test:outline
```

---

## 🏗️ Architecture

### Project Structure

```
docs-jana/
├── cli.js                      # Main CLI entry point
├── index.js                    # Orchestration layer (NEW)
├── src/
│   ├── commands/               # CLI command implementations
│   │   ├── n8n-download.js
│   │   ├── n8n-upload.js
│   │   └── outline-download.js
│   ├── services/               # Business logic services
│   │   ├── workflow-service.js
│   │   ├── outline-service.js
│   │   ├── migration-verifier.js
│   │   └── ...
│   ├── auth/                   # Authentication strategies
│   │   ├── auth-strategy.js
│   │   ├── api-key-strategy.js
│   │   ├── basic-auth-strategy.js
│   │   └── auth-factory.js
│   ├── utils/                  # Utility modules
│   │   ├── logger.js
│   │   ├── http-client.js
│   │   ├── file-manager.js
│   │   ├── config-manager.js
│   │   └── ...
│   ├── models/                 # Data models
│   └── tests/                  # (moved to /scripts)
├── __tests__/                  # Jest test suites
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── scripts/                    # Utility scripts (NEW)
│   ├── test/                   # Test scripts
│   ├── admin/                  # Admin scripts
│   └── README.md               # Scripts documentation
├── examples/                   # CLI examples (NEW)
│   ├── n8n-import/             # N8N import example
│   └── simple-cli/             # Simple CLI example
├── docs/                       # Documentation (NEW)
│   ├── technical/              # Technical documentation
│   ├── architecture/           # Architecture docs (future)
│   └── README.md               # Documentation index
├── .claude/                    # Claude Code specs
│   └── specs/
│       └── cli-architecture-refactor/
└── test-orchestration.js       # Orchestration tests
```

### Design Patterns

- **Service Locator**: Centralized service management with lazy loading (index.js)
- **Command Pattern**: Each CLI command is a separate module
- **Factory Pattern**: Auth strategies created via factory
- **Strategy Pattern**: Multiple authentication methods
- **Dependency Injection**: Services receive dependencies via constructor
- **Service Layer**: Business logic separated from CLI logic
- **Orchestration**: Lifecycle management for command execution

### Architecture

The project follows a **three-layer architecture** that separates concerns and improves testability:

```
┌─────────────────────────────────────────┐
│  Layer 1: CLI Interface (cli.js)        │
│  - Parse arguments                      │
│  - Display help/version                 │
│  - Interactive menu                     │
│  - Invoke orchestration layer           │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│  Layer 2: Orchestration (index.js)      │
│  - ServiceContainer (Service Locator)   │
│  - CommandOrchestrator                  │
│  - Service lifecycle management         │
│  - Configuration loading                │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│  Layer 3: Business Logic (src/)         │
│  - Command handlers (src/commands/)     │
│  - Business services (src/services/)    │
│  - Utilities (src/utils/)               │
│  - Factories (src/factories/)           │
└─────────────────────────────────────────┘
```

**Key Components:**

- **[cli.js](cli.js)**: Command-line interface entry point
  - Minimal business logic
  - User-facing interactions
  - Calls `executeCommand()` from index.js

- **[index.js](index.js)**: Orchestration layer (468 lines)
  - `ServiceContainer`: Service Locator with lazy instantiation
  - `CommandOrchestrator`: Lifecycle management (initialize → run → cleanup)
  - `executeCommand()`: Public API for command execution

**Performance:**
- Orchestration overhead: **~1ms average** (measured across 100 iterations)
- Lazy instantiation: Services only created when needed
- Resource cleanup: Automatic cleanup after each execution

**Learn More:**
- **[CLI Architecture](docs/architecture/CLI-ARCHITECTURE.md)** - Comprehensive architecture documentation
- **[Service Factory](docs/architecture/SERVICE-FACTORY.md)** - Service management patterns

---

## 📚 Documentation

Comprehensive documentation for all aspects of the project.

### Documentation Hub
- **[Documentation Index](docs/README.md)** - Central documentation hub with links to all docs

### Key Documentation
- **[Technical Documentation](docs/technical/)** - Implementation guides and technical reports
- **[CLI Learning Guide](LEARNING-CLI.md)** - How the CLI works internally
- **[Scripts Documentation](scripts/README.md)** - Utility scripts guide
- **[Examples](examples/)** - CLI examples and templates

### Specs & Architecture
- **[KFC Specs](.claude/specs/)** - Feature specifications
- **[CLI Architecture Refactor](.claude/specs/cli-architecture-refactor/)** - Current refactoring spec

---

## 🛠️ Scripts & Utilities

Utility scripts for testing, administration, and maintenance.

### Script Categories
- **[Scripts Documentation](scripts/README.md)** - Complete scripts guide
- **[Test Scripts](scripts/test/)** - Testing and validation scripts
- **[Admin Scripts](scripts/admin/)** - Administrative utilities (⚠️ use with caution)

### Quick Access
```bash
# View all available scripts
cat scripts/README.md

# Run a test script
node scripts/test/test-tag-operations.js

# Admin operations (careful!)
node scripts/admin/cleanup-duplicates.js --dry-run
```

---

## 🔧 Development

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Watch mode
npm run test:watch
```

### Linting

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Pre-commit Hooks

The project uses Husky + lint-staged to automatically:
- Run ESLint on changed files
- Run Jest tests on related files
- Ensure code quality before commits

---

## 📊 Code Quality

### Current Metrics (Baseline)

- **Files**: 25 JavaScript files
- **Lines of Code**: 5,993 lines
- **Code Duplication**: 0.4% (20 lines)
- **Vulnerabilities**: 0
- **Test Coverage**: 80%+ target

### Quality Improvements in Progress

We're implementing systematic quality improvements including:
- Security fixes (path traversal, injection prevention)
- Memory leak prevention
- Race condition resolution
- Comprehensive test coverage
- Code refactoring and documentation

See [Code Quality Improvements Spec](.claude/specs/code-quality-improvements/) for details.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit: `git commit -m "feat: add my feature"`
6. Push: `git push origin feature/my-feature`
7. Create a Pull Request

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

---

## 📝 Environment Variables

### N8N Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `N8N_BASE_URL` | Yes | N8N instance URL |
| `N8N_API_KEY` | No* | API key for authentication |
| `N8N_USERNAME` | No* | Username for basic auth |
| `N8N_PASSWORD` | No* | Password for basic auth |

*Either API key or username/password required

### Outline Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `OUTLINE_API_URL` | Yes | Outline API URL |
| `OUTLINE_API_TOKEN` | Yes | Outline API token |

### Optional Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `info` | Logging level (debug, info, warn, error) |
| `MAX_RETRIES` | `3` | Max HTTP retry attempts |
| `TIMEOUT` | `30000` | HTTP request timeout (ms) |

### Multi-Instance Support

For migrating workflows between instances, use environment variable prefixes:

```bash
# Source instance (for download)
N8N_URL_SOURCE=https://source.n8n.com
N8N_API_KEY_SOURCE=source-api-key

# Target instance (for upload)
N8N_URL=https://target.n8n.com
N8N_API_KEY=target-api-key
```

---

## 🐛 Troubleshooting

### Common Issues

#### "Command not found: docs-jana"

Run `npm link` to make the CLI globally available, or use `node cli.js` directly.

#### "Configuration Error: N8N_BASE_URL is required"

Ensure you have a `.env` file with all required variables. See Configuration section.

#### "ECONNREFUSED" or connection errors

- Check that N8N/Outline instances are running and accessible
- Verify URLs in `.env` are correct
- Check firewall/network settings

### Debug Mode

Enable verbose logging for detailed output:

```bash
# Using --verbose flag
docs-jana n8n:download --verbose

# Using environment variable
DEBUG=* docs-jana n8n:download
```

---

## 📜 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- N8N team for the amazing workflow automation platform
- Outline team for the collaborative documentation tool
- Contributors and users of this project

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/jana-team/docs-jana/issues)
- **Discussions**: [GitHub Discussions](https://github.com/jana-team/docs-jana/discussions)
- **Email**: support@jana-team.com

---

## 🗺️ Roadmap

- [ ] Web UI for workflow management
- [ ] Webhook integration for auto-sync
- [ ] Cloud backup integration (S3, GCS)
- [ ] CI/CD pipeline templates
- [ ] Workflow version control
- [ ] Multi-instance sync
- [ ] GraphQL API
- [ ] Docker image

---

**Made with ❤️ by Jana Team**
