# Services Integration Guide

## Overview

Este documento descreve a integração completa dos services na CLI do **docs-jana**. O sistema utiliza uma arquitetura de services para separar responsabilidades e permitir reutilização de código.

## Architecture

```
src/
├── commands/           # CLI commands (entry points)
│   ├── n8n-download.js     ✅ Uses: validation-wrapper
│   ├── n8n-upload.js       ✅ Uses: id-mapping, workflow-id-remapper, upload-history
│   ├── n8n-verify.js       ✅ Uses: migration-verifier
│   └── n8n-validate.js     ✅ Uses: validation-wrapper
│
└── services/           # Business logic services
    ├── id-mapping-service.js        ✅ ID mapping (old → new)
    ├── workflow-id-remapper.js      ✅ Remap executeWorkflow references
    ├── upload-history-service.js    ✅ Track upload history
    ├── validation-wrapper.js        ✅ Validate duplicate IDs
    ├── migration-verifier.js        ✅ Verify migration integrity
    └── reference-updater.js         ⚠️  Available but not integrated yet
```

## Available Services

### 1. IDMappingService (`id-mapping-service.js`)

**Purpose**: Maps old workflow IDs to new workflow IDs during upload/migration.

**Used By**:
- `n8n-upload.js` ✅
- `n8n-verify.js` ✅

**Key Methods**:
```javascript
const idMappingService = new IDMappingService(logger);

// Add mapping
idMappingService.addMapping(oldId, newId, workflowName);

// Get new ID
const newId = idMappingService.getNewId(oldId);

// Save to file
await idMappingService.saveToFile('./path/to/_id-mapping.json');

// Load from file
await idMappingService.loadFromFile('./path/to/_id-mapping.json');

// Get statistics
const count = idMappingService.getMappingCount();
```

**File Format** (`_id-mapping.json`):
```json
{
  "metadata": {
    "totalMappings": 42,
    "savedAt": "2025-10-18T18:00:00.000Z"
  },
  "mappings": {
    "old-workflow-id-123": {
      "newId": "new-workflow-id-456",
      "workflowName": "My Workflow",
      "timestamp": "2025-10-18T18:00:00.000Z"
    }
  }
}
```

**Integration Pattern**:
```javascript
// Phase 1: Upload workflows
const results = await workflowService.uploadWorkflows(workflows);

// Phase 2: Build ID mapping
const idMappingService = new IDMappingService(logger);
results.created.forEach(result => {
  idMappingService.addMapping(result.oldId, result.newId, result.name);
});

// Phase 3: Save mapping
await idMappingService.saveToFile(mappingFilePath);
```

---

### 2. WorkflowIDRemapper (`workflow-id-remapper.js`)

**Purpose**: Updates `executeWorkflow` node references to use new workflow IDs.

**Used By**:
- `n8n-upload.js` ✅

**Key Methods**:
```javascript
const remapper = new WorkflowIDRemapper(logger);

// Find executeWorkflow nodes
const nodes = remapper.findExecuteWorkflowNodes(workflow);

// Remap workflow references
const remappedWorkflow = remapper.remapWorkflowReferences(workflow, idMapping);

// Validate remapping
const validation = remapper.validateRemapping(workflow, idMapping);
```

**Node Types Supported**:
- `n8n-nodes-base.executeWorkflow` (standard workflow execution)
- `@n8n/n8n-nodes-langchain.toolWorkflow` (LangChain workflow tool)

**Integration Pattern**:
```javascript
// After Phase 1 upload, remap references
const remapper = new WorkflowIDRemapper(logger);

for (const workflow of workflows) {
  const remappedWorkflow = remapper.remapWorkflowReferences(workflow, idMapping);

  // Re-upload with corrected references
  await workflowService.uploadWorkflow(remappedWorkflow, true);
}
```

---

### 3. UploadHistoryService (`upload-history-service.js`)

**Purpose**: Tracks upload history for auditing and debugging.

**Used By**:
- `n8n-upload.js` ✅

**Key Methods**:
```javascript
const uploadHistory = new UploadHistoryService(logger);

// Load history
await uploadHistory.load();

// Add entry
uploadHistory.addEntry({
  action: 'upload',
  summary: {
    total: 42,
    succeeded: 40,
    failed: 2,
    folder: 'jana'
  },
  details: '40/42 workflows uploaded successfully'
});

// Save history
await uploadHistory.save();

// Format last N entries
const display = uploadHistory.formatLastN(3);
console.log(display);
```

**History File** (`.jana/upload-history.json`):
```json
{
  "version": "1.0.0",
  "entries": [
    {
      "timestamp": "2025-10-18T18:00:00.000Z",
      "action": "upload",
      "summary": {
        "total": 42,
        "succeeded": 40,
        "failed": 2,
        "folder": "jana"
      },
      "details": "40/42 workflows uploaded successfully to https://n8n.example.com"
    }
  ]
}
```

---

### 4. WorkflowValidator (`validation-wrapper.js`)

**Purpose**: Validates workflows for duplicate internal IDs (e.g., `(AAA-BBB-001)`).

**Used By**:
- `n8n-download.js` ✅
- `n8n-validate.js` ✅

**Key Methods**:
```javascript
const validator = new WorkflowValidator(logger);

// Validate workflows
const result = validator.validate(workflows, {
  skipValidation: false,
  strict: true  // Throw error if duplicates found
});

// Check result
if (result.valid) {
  console.log('No duplicates found');
} else {
  console.log(`Found ${result.duplicates.length} duplicates`);
  result.messages.forEach(msg => console.log(msg));
}
```

**Configuration** (`.jana/config.json`):
```json
{
  "validation": {
    "idPattern": "\\([A-Z]+-[A-Z]+-\\d{3}\\)",
    "strict": true,
    "maxDuplicates": 100,
    "logPath": ".jana/logs/validation.log"
  }
}
```

**Integration Pattern**:
```javascript
// In n8n:download
const validator = new WorkflowValidator(logger);

try {
  const result = validator.validate(workflows, {
    skipValidation: false,
    strict: true
  });

  if (!result.valid) {
    logger.error('Validation failed - duplicates found');
    process.exit(1);
  }
} catch (error) {
  if (error.name === 'ValidationError') {
    error.messages.forEach(msg => console.error(msg));
    logger.info(`Details saved to: ${error.logPath}`);
    process.exit(1);
  }
  throw error;
}
```

---

### 5. MigrationVerifier (`migration-verifier.js`)

**Purpose**: Verifies migration integrity after upload (ZERO broken links guarantee).

**Used By**:
- `n8n-verify.js` ✅

**Verification Checks**:
1. **Workflow Count** - All original workflows were created
2. **Workflow Creation** - No workflows missing
3. **Reference Integrity** - All executeWorkflow references are valid
4. **Nodes Integrity** - Node counts match between original and created

**Key Methods**:
```javascript
const verifier = new MigrationVerifier(workflowService, idMappingService, logger);

// Run verification
const results = await verifier.verify(originalWorkflows);

// Check results
if (results.passed) {
  console.log('✅ Migration verified successfully');
} else {
  console.log(`❌ ${results.summary.failedChecks} checks failed`);
  results.issues.forEach(issue => {
    console.log(`[${issue.severity}] ${issue.message}`);
  });
}
```

**Integration Pattern**:
```javascript
// After n8n:upload completes

// 1. Load original workflows
const originalWorkflows = readWorkflowFiles(inputDir);

// 2. Load ID mapping
await idMappingService.loadFromFile('./_id-mapping.json');

// 3. Verify migration
const verifier = new MigrationVerifier(workflowService, idMappingService, logger);
const results = await verifier.verify(originalWorkflows);

// 4. Report results
if (!results.passed) {
  process.exit(1);
}
```

---

### 6. ReferenceUpdater (`reference-updater.js`)

**Purpose**: Alternative/enhanced version of WorkflowIDRemapper with recursive object traversal.

**Status**: ⚠️ **Not integrated yet** (available for future use)

**Key Differences from WorkflowIDRemapper**:
- Recursive object traversal (finds workflowId anywhere in workflow structure)
- Circular reference detection
- Depth limit protection (max 50 levels)
- Priority-based resolution (cachedResultName first, then old ID)

**Potential Use Case**:
Could replace or complement `WorkflowIDRemapper` if more robust reference updating is needed.

---

## CLI Commands

### n8n:download
**Purpose**: Download workflows from N8N

**Services Used**:
- ✅ `WorkflowValidator` - Validates for duplicate IDs

**Example**:
```bash
# Download all workflows
docs-jana n8n:download

# Download with tag filter
docs-jana n8n:download --tag production

# Skip validation (not recommended)
docs-jana n8n:download --skip-validation
```

---

### n8n:upload
**Purpose**: Upload workflows to N8N with ID remapping

**Services Used**:
- ✅ `IDMappingService` - Maps old → new IDs
- ✅ `WorkflowIDRemapper` - Remaps executeWorkflow references
- ✅ `UploadHistoryService` - Tracks upload history

**Phases**:
1. **Phase 1**: Initial upload (N8N assigns new IDs)
2. **Phase 2**: Remap workflow references
3. **Phase 3**: Re-upload with corrected references

**Example**:
```bash
# Upload workflows
docs-jana n8n:upload --input ./n8n/workflows

# Dry-run (test without uploading)
docs-jana n8n:upload --input ./workflows --dry-run

# Force overwrite existing workflows
docs-jana n8n:upload --input ./workflows --force

# Skip ID remapping (if no executeWorkflow nodes)
docs-jana n8n:upload --input ./workflows --skip-remap
```

**Output Files**:
- `_id-mapping.json` - ID mappings (old → new)
- `.jana/upload-history.json` - Upload history

---

### n8n:verify ⭐ NEW
**Purpose**: Verify migration integrity after upload

**Services Used**:
- ✅ `MigrationVerifier` - Runs 4 verification checks
- ✅ `IDMappingService` - Loads ID mappings

**Example**:
```bash
# Verify migration
docs-jana n8n:verify --input ./n8n/workflows

# Use custom mapping file
docs-jana n8n:verify --input ./workflows --mapping ./custom-mapping.json
```

**Requirements**:
- Must run **after** `n8n:upload`
- Requires `_id-mapping.json` from upload
- Requires original workflow files

**Exit Codes**:
- `0` - Verification passed
- `1` - Verification failed

---

### n8n:validate ⭐ NEW
**Purpose**: Validate workflows for duplicate IDs (without downloading)

**Services Used**:
- ✅ `WorkflowValidator` - Validates duplicate IDs

**Example**:
```bash
# Validate all workflows
docs-jana n8n:validate

# Validate specific tag
docs-jana n8n:validate --tag production

# Validate SOURCE N8N instance
docs-jana n8n:validate --source

# Save report to file
docs-jana n8n:validate --output ./validation-report.json
```

**Advantages over n8n:download**:
- ⚡ Faster (doesn't download files)
- 🔍 Same validation engine
- 📊 Can save custom reports

**Exit Codes**:
- `0` - No duplicates found
- `1` - Duplicates detected

---

## Workflow Examples

### Complete Migration Workflow

```bash
# Step 1: Validate source N8N for duplicates
docs-jana n8n:validate --source --tag jana

# Step 2: Download workflows
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

### Debug Failed Upload

```bash
# Check upload history
cat .jana/upload-history.json

# Verify what was uploaded
docs-jana n8n:verify --input ./n8n/workflows

# Re-upload with force
docs-jana n8n:upload --input ./n8n/workflows --force
```

---

## Service Integration Summary

| Service | Used By | Status | Purpose |
|---------|---------|--------|---------|
| IDMappingService | n8n-upload, n8n-verify | ✅ Integrated | Map old → new IDs |
| WorkflowIDRemapper | n8n-upload | ✅ Integrated | Remap executeWorkflow refs |
| UploadHistoryService | n8n-upload | ✅ Integrated | Track upload history |
| WorkflowValidator | n8n-download, n8n-validate | ✅ Integrated | Validate duplicate IDs |
| MigrationVerifier | n8n-verify | ✅ Integrated | Verify migration integrity |
| ReferenceUpdater | (none) | ⚠️ Available | Enhanced ref updating |

---

## Future Enhancements

### Potential Improvements

1. **Integrate ReferenceUpdater**
   - Could replace or complement WorkflowIDRemapper
   - More robust recursive traversal
   - Better circular reference handling

2. **Add n8n:rollback Command**
   - Use UploadHistoryService to track what was uploaded
   - Delete uploaded workflows
   - Restore previous state

3. **Add n8n:diff Command**
   - Compare local workflows vs N8N instance
   - Show what changed since last upload
   - Detect configuration drift

4. **Enhanced Validation**
   - Validate workflow node configurations
   - Check for broken credentials references
   - Detect missing environment variables

---

## Troubleshooting

### Error: "ID mapping file not found"

**Problem**: `n8n:verify` can't find `_id-mapping.json`

**Solution**:
```bash
# Run n8n:upload first to generate mapping
docs-jana n8n:upload --input ./workflows

# Then run verify
docs-jana n8n:verify --input ./workflows
```

### Error: "Validation failed - duplicates found"

**Problem**: Duplicate internal IDs detected

**Solution**:
```bash
# Get detailed report
docs-jana n8n:validate --output ./report.json

# Review duplicates
cat .jana/logs/validation.log

# Fix duplicates in N8N
# Then re-download
docs-jana n8n:download
```

### Error: "Verification failed - broken references"

**Problem**: executeWorkflow nodes have invalid references

**Solution**:
```bash
# Check ID mapping
cat ./n8n/workflows/_id-mapping.json

# Re-run upload with remapping
docs-jana n8n:upload --input ./workflows --force

# Verify again
docs-jana n8n:verify --input ./workflows
```

---

## Best Practices

1. **Always validate before download**
   ```bash
   docs-jana n8n:validate --source
   ```

2. **Always verify after upload**
   ```bash
   docs-jana n8n:verify --input ./workflows
   ```

3. **Use dry-run first**
   ```bash
   docs-jana n8n:upload --input ./workflows --dry-run
   ```

4. **Keep ID mappings**
   - Never delete `_id-mapping.json`
   - Commit to version control
   - Use for debugging

5. **Monitor upload history**
   ```bash
   cat .jana/upload-history.json
   ```

---

## Conclusion

O sistema de services está completamente integrado na CLI, proporcionando:

✅ **Validação** - Detect duplicate IDs before problems occur
✅ **Mapeamento** - Track old → new ID mappings automatically
✅ **Remapeamento** - Update workflow references correctly
✅ **Verificação** - Guarantee ZERO broken links after migration
✅ **Histórico** - Track all upload operations for auditing

**Status**: All core services are integrated and tested. System is production-ready!

---

**Version**: 1.0.0
**Last Updated**: 2025-10-18
**Author**: Claude Code + Vinicius
