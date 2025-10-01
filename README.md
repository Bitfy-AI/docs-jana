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

# Install dependencies
npm install

# Make CLI globally available (optional)
npm link
```

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
# Download all workflows
docs-jana n8n:download

# Download with tag filter
docs-jana n8n:download --tag production

# Download to specific directory
docs-jana n8n:download --output ./my-workflows

# Alternative: use npm script
npm run n8n:download
```

#### Upload Workflows

```bash
# Dry-run (test without uploading)
docs-jana n8n:upload --input ./workflows --dry-run

# Upload workflows
docs-jana n8n:upload --input ./workflows

# Upload with tag filter and activate
docs-jana n8n:upload --input ./workflows --tag production --activate

# Skip existing workflows
docs-jana n8n:upload --input ./workflows --skip-existing
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
├── src/
│   ├── commands/               # CLI command implementations
│   │   ├── n8n-download.js
│   │   ├── n8n-upload.js
│   │   ├── outline-download.js
│   │   ├── docs-generate.js
│   │   ├── test-migration.js
│   │   └── test-outline.js
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
│   └── models/                 # Data models
├── __tests__/                  # Test suites
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .claude/                    # Claude Code specs
│   └── specs/
│       └── code-quality-improvements/
└── docs/                       # Generated documentation
```

### Design Patterns

- **Command Pattern**: Each CLI command is a separate module
- **Factory Pattern**: Auth strategies created via factory
- **Strategy Pattern**: Multiple authentication methods
- **Dependency Injection**: Services receive dependencies via constructor
- **Service Layer**: Business logic separated from CLI logic

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
