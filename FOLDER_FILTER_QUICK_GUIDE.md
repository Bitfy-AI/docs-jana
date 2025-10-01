# Quick Guide: Folder Filter for n8n-upload

## New Feature: Filter Workflows by Folder

You can now upload workflows from specific subfolders using the `--folder` flag.

## Basic Usage

### Upload from Specific Folder
```bash
docs-jana n8n:upload --input ./workflows --folder jana
```
**Result:** Only uploads workflows from `./workflows/jana/`

### Upload All Folders (Default Behavior)
```bash
docs-jana n8n:upload --input ./workflows
```
**Result:** Uploads all workflows recursively from `./workflows/` and subfolders

## Flag Options

| Flag | Short | Description | Example |
|------|-------|-------------|---------|
| `--folder` | `-F` | Filter by subfolder | `--folder jana` |
| `--folder` | `-F` | Filter by subfolder | `-F jana` |

## Common Scenarios

### 1. Upload Production Workflows Only
```bash
docs-jana n8n:upload --input ./workflows --folder production
```

### 2. Test Upload from Dev Folder
```bash
docs-jana n8n:upload --input ./workflows --folder dev --dry-run
```

### 3. Upload with Automatic Tagging
```bash
docs-jana n8n:upload --input ./workflows --folder jana --sync-tags
```
**Note:** Workflows without tags will automatically be tagged with "jana"

### 4. Force Update Specific Folder
```bash
docs-jana n8n:upload --input ./workflows --folder jana --force
```

## Automatic Tag Detection

Workflows are automatically tagged based on their source folder:

```
workflows/
├── jana/          → Tagged as "jana"
│   ├── workflow-1.json
│   └── workflow-2.json
├── production/    → Tagged as "production"
│   └── workflow-3.json
└── dev/           → Tagged as "dev"
    └── workflow-4.json
```

### Tag Priority
1. **Existing tags:** If workflow has tags, they are preserved
2. **Source folder:** If no tags exist, uses folder name as tag
3. **No tag:** If no tags and no `--sync-tags` flag, no tags added

## Directory Structure Examples

### Example 1: Filter Single Folder
```bash
# Directory structure:
workflows/
├── jana/
│   ├── workflow-a.json
│   └── workflow-b.json
└── other/
    └── workflow-c.json

# Command:
docs-jana n8n:upload --input ./workflows --folder jana

# Result: Uploads only workflow-a.json and workflow-b.json
```

### Example 2: Nested Folders
```bash
# Directory structure:
workflows/
└── jana/
    ├── prod/
    │   └── workflow-1.json
    └── dev/
        └── workflow-2.json

# Command:
docs-jana n8n:upload --input ./workflows --folder jana

# Result: Uploads both workflow-1.json and workflow-2.json recursively
```

## Error Handling

### Folder Not Found
```bash
docs-jana n8n:upload --input ./workflows --folder nonexistent
# Error: Input directory does not exist: /path/to/workflows/nonexistent
```

### No JSON Files Found
```bash
docs-jana n8n:upload --input ./workflows --folder empty
# Warning: No workflows to upload
```

## Compatibility

✅ Works with all existing flags:
- `--dry-run` - Test without uploading
- `--force` - Overwrite existing workflows
- `--skip-remap` - Skip ID remapping
- `--sync-tags` - Sync tags to N8N

## Tips

1. **Test first:** Always use `--dry-run` to preview changes
   ```bash
   docs-jana n8n:upload --input ./workflows --folder jana --dry-run
   ```

2. **Combine with tags:** Use `--sync-tags` for automatic organization
   ```bash
   docs-jana n8n:upload --input ./workflows --folder jana --sync-tags
   ```

3. **Check logs:** Look for the filter confirmation message:
   ```
   📂 Filtrando workflows da pasta: jana
   ```

4. **Verify structure:** Use help to see examples
   ```bash
   docs-jana n8n:upload --help
   ```

## Troubleshooting

### Issue: Wrong files uploaded
**Solution:** Check folder name spelling
```bash
# Wrong:
docs-jana n8n:upload --input ./workflows --folder Jana  # Case sensitive!

# Correct:
docs-jana n8n:upload --input ./workflows --folder jana
```

### Issue: No workflows found
**Solution:** Verify directory structure
```bash
# Check if folder exists:
ls ./workflows/jana

# Check for JSON files:
ls ./workflows/jana/*.json
```

### Issue: Tags not syncing
**Solution:** Add `--sync-tags` flag
```bash
docs-jana n8n:upload --input ./workflows --folder jana --sync-tags
```

## Advanced Usage

### Upload Multiple Folders (Sequential)
```bash
# Upload jana folder
docs-jana n8n:upload --input ./workflows --folder jana

# Then upload production folder
docs-jana n8n:upload --input ./workflows --folder production
```

### Filter + Force Update
```bash
# Overwrite all workflows in jana folder
docs-jana n8n:upload --input ./workflows --folder jana --force
```

### Filter + Skip Remap
```bash
# Upload without ID remapping (faster)
docs-jana n8n:upload --input ./workflows --folder jana --skip-remap
```

## Quick Reference

| Task | Command |
|------|---------|
| Upload specific folder | `--folder jana` |
| Test upload | `--folder jana --dry-run` |
| Force update folder | `--folder jana --force` |
| Auto-tag workflows | `--folder jana --sync-tags` |
| Upload all folders | _(omit --folder flag)_ |

## Need Help?

```bash
docs-jana n8n:upload --help
```

---

**Last Updated:** 2025-10-01
**Feature Version:** 1.0.0
