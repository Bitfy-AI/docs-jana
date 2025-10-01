# Folder Filter Implementation for n8n-upload

## Summary

Modified `src/commands/n8n-upload.js` to add folder filtering capabilities and automatic tag detection from source folders.

## Changes Made

### 1. Added Folder Filter Property

**Location:** Constructor (line 82)

```javascript
this.folderFilter = null;
```

### 2. Updated parseArgs() Method

**Location:** parseArgs() method (lines 112-114)

Added new command-line argument:
- `--folder, -F <name>` : Filter workflows from specific subfolder

```javascript
case '--folder':
case '-F':
  this.folderFilter = args[++i];
  break;
```

### 3. Updated Help Text

**Location:** printHelp() method (line 145)

Added documentation for the new flag:
```
--folder, -F <name>   Filter workflows from specific subfolder (optional)
```

Added example usage:
```bash
# Upload workflows from specific subfolder only
docs-jana n8n:upload --input ./workflows --folder jana
```

### 4. Modified readWorkflowFiles() Method

**Location:** readWorkflowFiles() method (lines 302-372)

Key improvements:

#### a. Folder Filtering
- If `--folder` flag is provided, it joins the filter to the input directory
- Logs: `📂 Filtrando workflows da pasta: {folderFilter}`

```javascript
if (this.folderFilter) {
  inputDir = path.join(inputDir, this.folderFilter);
  this.logger.info(`📂 Filtrando workflows da pasta: ${this.folderFilter}`);
}
```

#### b. Recursive Directory Reading
- Now reads subdirectories recursively
- Uses `fs.readdirSync(dir, { withFileTypes: true })` for better performance
- Maintains relative paths for proper organization

```javascript
const readDir = (dir, relativePath = '') => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      readDir(fullPath, relPath);  // Recursive call
    } else if (entry.isFile()) {
      // Process JSON files
    }
  }
};
```

#### c. Source Folder Detection
- Extracts source folder name from file path
- Adds `sourceFolder` property to each workflow object
- Falls back to parent directory name if no folder filter is used

```javascript
const sourceFolder = relativePath || this.folderFilter || path.basename(path.dirname(fullPath));

workflows.push({
  file: entry.name,
  filePath: relPath,
  sourceFolder,
  ...workflow
});
```

### 5. Enhanced _extractTagNames() Method

**Location:** _extractTagNames() method (lines 918-940)

Updated to use `sourceFolder` as a default tag:

```javascript
// Use sourceFolder as default tag if no tags exist
if (tags.length === 0 && workflow.sourceFolder) {
  tags.push(workflow.sourceFolder);
}
```

## Use Cases

### 1. Filter by Folder
Upload only workflows from a specific subfolder:
```bash
docs-jana n8n:upload --input ./workflows --folder jana
```

This will:
- Read only from `./workflows/jana/`
- Set `sourceFolder` to "jana" for all workflows
- Use "jana" as default tag if no tags exist

### 2. Recursive Reading
Upload all workflows from nested directories:
```bash
docs-jana n8n:upload --input ./workflows
```

This will:
- Read all JSON files recursively from `./workflows/` and subdirectories
- Preserve folder structure information in `sourceFolder`
- Auto-tag workflows based on their source folder

### 3. Automatic Tagging
When using `--sync-tags` flag:
```bash
docs-jana n8n:upload --input ./workflows --folder jana --sync-tags
```

Workflows without tags will automatically get tagged with their source folder name ("jana").

## Backward Compatibility

All changes maintain backward compatibility:
- Existing usage without `--folder` flag works exactly as before
- Non-recursive behavior maintained for flat directory structures
- Workflows with existing tags remain unchanged

## Technical Details

### File Properties Added to Workflows

Each workflow object now includes:
- `file`: Original filename (e.g., "workflow-123.json")
- `filePath`: Relative path from input directory (e.g., "jana/workflow-123.json")
- `sourceFolder`: Name of source folder (e.g., "jana")

### Edge Cases Handled

1. **No folder filter**: Uses parent directory name as sourceFolder
2. **Flat directory structure**: sourceFolder is the parent directory name
3. **Nested directories**: sourceFolder tracks the immediate parent folder
4. **Existing tags**: sourceFolder tag only added if no tags exist

## Testing Recommendations

Test the following scenarios:

1. Upload from specific folder:
   ```bash
   docs-jana n8n:upload --input ./workflows --folder jana --dry-run
   ```

2. Upload all workflows recursively:
   ```bash
   docs-jana n8n:upload --input ./workflows --dry-run
   ```

3. Test tag sync with folder detection:
   ```bash
   docs-jana n8n:upload --input ./workflows --folder jana --sync-tags --dry-run
   ```

4. Test backward compatibility (existing usage):
   ```bash
   docs-jana n8n:upload --input ./workflows --dry-run
   ```

## Files Modified

- `src/commands/n8n-upload.js` - Main implementation

## Lines Changed

- Constructor: Added `folderFilter` property (line 82)
- parseArgs(): Added folder flag handling (lines 112-114)
- printHelp(): Updated documentation (line 145, 183)
- readWorkflowFiles(): Complete rewrite for recursive reading and filtering (lines 302-372)
- _extractTagNames(): Enhanced with sourceFolder fallback (lines 918-940)
