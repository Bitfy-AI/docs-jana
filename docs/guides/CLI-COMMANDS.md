# 📟 CLI Commands Reference

Referência completa de todos os comandos disponíveis no docs-jana CLI.

---

## 📋 Índice de Comandos

### N8N Workflows
- [n8n:download](#n8ndownload) - Download workflows from N8N
- [n8n:upload](#n8nupload) - Upload workflows to N8N
- [n8n:verify](#n8nverify) ⭐ - Verify migration integrity
- [n8n:validate](#n8nvalidate) ⭐ - Validate for duplicate IDs
- [n8n:configure-target](#n8nconfigure-target) - Configure target N8N instance

### Outline Documentation
- [outline:download](#outlinedownload) - Download documentation from Outline

### Utility
- [help](#help) - Show help message
- [version](#version) - Show version information

---

## N8N Commands

### n8n:download

Download workflows from N8N instance to local files.

**Aliases**: `n8n:backup`, `download:n8n`

**Usage**:
```bash
docs-jana n8n:download [options]
```

**Options**:
```
--source              Download from SOURCE_N8N_URL instead of N8N_URL
--tag, -t <tag>       Filter workflows by tag
--no-tag-filter       Ignore N8N_TAG from .env and download all workflows
--output, -o <dir>    Output directory (default: ./n8n-workflows-TIMESTAMP)
--skip-validation     Skip ID duplicate validation (not recommended)
--help, -h            Show help message
```

**Environment Variables**:
```bash
SOURCE_N8N_URL        # Source N8N instance URL (for download)
SOURCE_N8N_API_KEY    # Source N8N API key (for download)
SOURCE_N8N_TAG        # Source N8N tag filter (for download)
N8N_URL               # Fallback N8N instance URL
N8N_API_KEY           # Fallback N8N API key
N8N_TAG               # Filter workflows by tag
```

**Examples**:
```bash
# Download all workflows organized by tag
docs-jana n8n:download --no-tag-filter

# Download workflows with specific tag
docs-jana n8n:download --tag production

# Download from SOURCE N8N instance
docs-jana n8n:download --source

# Download to specific directory
docs-jana n8n:download --output ./my-workflows
```

**Output**:
- Workflows saved to `n8n/workflows/` (or custom output dir)
- Organized by tags in subfolders
- Validation log in `.jana/logs/validation.log` (if duplicates found)

**Process**:
1. Fetch workflows from N8N API
2. Validate for duplicate internal IDs
3. Filter by tag (if specified)
4. Organize by tag/folder structure
5. Save to local files

---

### n8n:upload

Upload workflows to N8N with automatic ID remapping.

**Aliases**: `upload:n8n`, `n8n:restore`

**Usage**:
```bash
docs-jana n8n:upload [options]
```

**Options**:
```
--input, -i <dir>     Input directory with workflow JSON files (required)
--folder, -F <name>   Filter workflows from specific subfolder
--dry-run             Validate workflows without uploading
--force, -f           Overwrite existing workflows
--skip-remap          Skip ID remapping phase (default: false)
--sync-tags           Sync tags from source workflows to target N8N
--skip-errors         Continue on errors (default: true)
--help, -h            Show help message
```

**Environment Variables**:
```bash
TARGET_N8N_URL        # Target N8N instance URL (required for upload)
TARGET_N8N_API_KEY    # Target N8N API key (required)
TARGET_N8N_TAG        # Target N8N tag (future feature)
N8N_URL               # Fallback N8N instance URL
N8N_API_KEY           # Fallback N8N API key
N8N_INPUT_DIR         # Input directory path (optional)
N8N_DRY_RUN           # Enable dry-run mode (true/false)
N8N_FORCE             # Force overwrite (true/false)
N8N_SKIP_ERRORS       # Continue on errors (true/false, default: true)
```

**Examples**:
```bash
# Upload workflows with automatic ID remapping
docs-jana n8n:upload --input ./n8n-workflows-2025-10-01T13-27-51

# Upload workflows from specific subfolder only
docs-jana n8n:upload --input ./workflows --folder jana

# Test upload without making changes (dry-run)
docs-jana n8n:upload --input ./workflows --dry-run

# Upload without ID remapping (if no executeWorkflow nodes exist)
docs-jana n8n:upload --input ./workflows --skip-remap

# Force overwrite existing workflows
docs-jana n8n:upload --input ./workflows --force
```

**Output Files**:
- `_id-mapping.json` - Old → new ID mappings
- `.jana/upload-history.json` - Upload history

**Upload Process** (3 Phases):

**Phase 1: Initial Upload**
- Uploads all workflows to N8N
- N8N assigns new IDs to each workflow
- Builds old ID → new ID mapping
- Saves mapping to `_id-mapping.json`

**Phase 2: Reference Remapping**
- Loads all uploaded workflows from JSON files
- Updates all executeWorkflow node references with new IDs
- Validates all references can be resolved

**Phase 3: Re-upload**
- Re-uploads workflows with updated ID references
- Uses `--force` to overwrite existing workflows

---

### n8n:verify

⭐ **NEW** - Verify migration integrity after upload.

**Aliases**: `verify:n8n`, `n8n:check`

**Usage**:
```bash
docs-jana n8n:verify [options]
```

**Options**:
```
--input, -i <dir>     Input directory with original workflow files (required)
--mapping, -m <file>  ID mapping file (default: {input}/_id-mapping.json)
--help, -h            Show help message
```

**Environment Variables**:
```bash
TARGET_N8N_URL        # Target N8N instance URL (required)
TARGET_N8N_API_KEY    # Target N8N API key (required)
N8N_URL               # Fallback N8N instance URL
N8N_API_KEY           # Fallback N8N API key
```

**Examples**:
```bash
# Verify migration using default mapping file
docs-jana n8n:verify --input ./n8n/workflows

# Verify with custom mapping file
docs-jana n8n:verify --input ./workflows --mapping ./custom-mapping.json
```

**Verification Checks**:
1. **Workflow Count** - All original workflows were created
2. **Workflow Creation** - No workflows missing
3. **Reference Integrity** - All executeWorkflow references are valid
4. **Nodes Integrity** - Node counts match between original and created

**Exit Codes**:
- `0` - Verification passed (ZERO broken links)
- `1` - Verification failed (issues found)

**Requirements**:
- Must run **after** `n8n:upload`
- Requires `_id-mapping.json` from upload
- Requires original workflow files

**Use Case**:
```bash
# Complete workflow
docs-jana n8n:upload --input ./workflows
docs-jana n8n:verify --input ./workflows
# ✅ Migration verified with ZERO broken links!
```

---

### n8n:validate

⭐ **NEW** - Validate workflows for duplicate internal IDs (without downloading).

**Aliases**: `validate:n8n`, `n8n:check-ids`

**Usage**:
```bash
docs-jana n8n:validate [options]
```

**Options**:
```
--source              Validate SOURCE_N8N_URL instead of N8N_URL
--tag, -t <tag>       Filter workflows by tag before validation
--output, -o <file>   Save validation report to JSON file
--help, -h            Show help message
```

**Environment Variables**:
```bash
SOURCE_N8N_URL        # Source N8N instance URL (for --source flag)
SOURCE_N8N_API_KEY    # Source N8N API key (for --source flag)
N8N_URL               # N8N instance URL (default)
N8N_API_KEY           # N8N API key (default)
N8N_TAG               # Default tag filter (optional)
```

**Examples**:
```bash
# Validate all workflows in default N8N instance
docs-jana n8n:validate

# Validate only workflows with specific tag
docs-jana n8n:validate --tag production

# Validate SOURCE N8N instance
docs-jana n8n:validate --source

# Save validation report to file
docs-jana n8n:validate --output ./validation-report.json

# Validate specific tag and save report
docs-jana n8n:validate --tag jana --output ./jana-validation.json
```

**Validation Checks**:
- Duplicate internal IDs detection
- ID pattern matching (e.g., `(AAA-BBB-001)`)
- Workflow reference analysis
- Suggestion generation for duplicates

**Advantages over n8n:download**:
- ⚡ **Faster** - Doesn't download workflow files
- 🔍 **Same validation engine** - Uses WorkflowValidator
- 📊 **Custom reports** - Can save to JSON

**Exit Codes**:
- `0` - No duplicates found
- `1` - Duplicates detected

**Output Files**:
- `.jana/logs/validation.log` - Detailed validation log (default)
- Custom JSON report (if `--output` specified)

---

### n8n:configure-target

Configure target N8N instance for uploads.

**Aliases**: `n8n:config`, `config:n8n`

**Usage**:
```bash
docs-jana n8n:configure-target
```

Interactive command that prompts for:
- Target N8N URL
- Target N8N API Key
- Target N8N Tag (optional)

Saves configuration to `.env` file.

---

## Outline Commands

### outline:download

Download documentation from Outline knowledge base.

**Aliases**: `download:outline`

**Usage**:
```bash
docs-jana outline:download [options]
```

**Options**:
```
--output, -o <dir>    Output directory (default: ./outline-docs-TIMESTAMP)
--collections <list>  Filter by collections (comma-separated)
--help, -h            Show help message
```

**Environment Variables**:
```bash
OUTLINE_URL           # Outline instance URL
OUTLINE_API_TOKEN     # Outline API token
```

**Examples**:
```bash
# Download all documentation
docs-jana outline:download

# Download to specific directory
docs-jana outline:download --output ./docs

# Download specific collections
docs-jana outline:download --collections "Engineering,Product"
```

---

## Utility Commands

### help

Show help message with all available commands.

**Aliases**: `-h`, `--help`

**Usage**:
```bash
docs-jana help
docs-jana --help
docs-jana <command> --help  # Command-specific help
```

---

### version

Show version information.

**Aliases**: `-v`, `--version`

**Usage**:
```bash
docs-jana version
docs-jana --version
```

---

## 🔄 Complete Workflows

### Full Migration Workflow

```bash
# Step 1: Validate source for duplicates (preventive)
docs-jana n8n:validate --source --tag jana

# Step 2: Download workflows from source
docs-jana n8n:download --source --tag jana

# Step 3: Upload to target N8N
docs-jana n8n:upload --input ./n8n/workflows

# Step 4: Verify migration integrity
docs-jana n8n:verify --input ./n8n/workflows

# ✅ Migration complete with ZERO broken links!
```

### Validation-Only Workflow

```bash
# Quick check for duplicate IDs without downloading
docs-jana n8n:validate --tag production --output ./report.json

# Review report
cat ./report.json
```

### Dry-Run Before Upload

```bash
# Test upload without making changes
docs-jana n8n:upload --input ./workflows --dry-run

# Review what would be uploaded
# If OK, run actual upload
docs-jana n8n:upload --input ./workflows
```

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# N8N Configuration
N8N_URL=https://n8n.example.com
N8N_API_KEY=your-api-key
N8N_TAG=production

# Source N8N (for download)
SOURCE_N8N_URL=https://source.n8n.example.com
SOURCE_N8N_API_KEY=source-api-key
SOURCE_N8N_TAG=production

# Target N8N (for upload)
TARGET_N8N_URL=https://target.n8n.example.com
TARGET_N8N_API_KEY=target-api-key
TARGET_N8N_TAG=production

# Outline Configuration
OUTLINE_URL=https://outline.example.com
OUTLINE_API_TOKEN=your-api-token
```

### Configuration Files

- `.env` - Environment variables
- `.jana/config.json` - Validation configuration
- `.jana/upload-history.json` - Upload history

---

## 📊 Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Validation/verification failed |
| 2 | Configuration error |
| 3 | Network/API error |

---

## 🔗 Related Documentation

- [Services Integration Guide](services/INTEGRATION-GUIDE.md) - How services work internally
- [Migration Guide](MIGRATION-GUIDE.md) - Detailed migration process
- [Architecture](../architecture/ARCHITECTURE.md) - System architecture

---

**Última atualização**: 2025-10-18
**Versão**: 2.0.0
