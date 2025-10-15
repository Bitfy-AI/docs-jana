# N8N Workflow References (Elo) - How They Work

## Overview

When uploading N8N workflows to a new instance, it's critical to preserve workflow IDs to maintain references between workflows. This document explains how workflow references work and how the upload process preserves them.

## What are Workflow References (Elo)?

In N8N, workflows can call other workflows using special nodes:

1. **executeWorkflow** (`n8n-nodes-base.executeWorkflow`) - Standard workflow execution
2. **toolWorkflow** (`@n8n/n8n-nodes-langchain.toolWorkflow`) - LangChain AI agent tools

These nodes create "elo" (links) between workflows, forming a workflow orchestration architecture.

## Workflow Reference Structure

### Example from Your Workflows

From the test results, we found **18 workflows** that are referenced by other workflows in your system.

#### Sample executeWorkflow Node:

```json
{
  "parameters": {
    "workflowId": {
      "__rl": true,
      "value": "H2uokpNckevszoVI",
      "mode": "list",
      "cachedResultName": "integracao-oauth-token (OAUTH-TKN-001))"
    }
  },
  "type": "n8n-nodes-base.executeWorkflow",
  "name": "E:AUT:Revalida token oAuth"
}
```

### Key Fields:

- **`__rl`**: Resource locator flag (always `true`)
- **`value`**: **THE ACTUAL WORKFLOW ID** - This MUST be preserved
- **`mode`**: Selection mode (typically `"list"`)
- **`cachedResultName`**: Human-readable name (for UI display only)

## How References Work

When Workflow A calls Workflow B:

1. Workflow A contains an executeWorkflow node
2. The node's `workflowId.value` stores Workflow B's ID
3. When executed, N8N looks up Workflow B using this ID
4. Workflow B is executed and results are returned to Workflow A

```
┌─────────────┐
│ Workflow A  │
│             │
│ ┌─────────┐ │
│ │ Execute │ │──────> workflowId.value = "B_ID"
│ │Workflow │ │                          ↓
│ └─────────┘ │                    ┌─────────────┐
└─────────────┘                    │ Workflow B  │
                                   │ id = "B_ID" │
                                   └─────────────┘
```

## Upload Process - How IDs are Preserved

### 1. Read Workflow Files

```javascript
const workflow = {
  "id": "iyOorVjd7ifKs9zs",
  "name": "[Jana] Time de agentes",
  "nodes": [
    {
      "type": "@n8n/n8n-nodes-langchain.toolWorkflow",
      "parameters": {
        "workflowId": {
          "value": "xxjdOgNFmgtNGhvs"  // Reference to another workflow
        }
      }
    }
  ]
}
```

### 2. Clean Payload (Preserves Nodes)

The `_cleanWorkflowPayload()` function removes unnecessary fields but **PRESERVES**:

- ✅ `name` - Workflow name
- ✅ `nodes` - **Contains all executeWorkflow references**
- ✅ `connections` - Node connections
- ✅ `settings` - Workflow settings
- ✅ `id` - Workflow ID (for ID preservation)

```javascript
_cleanWorkflowPayload(workflowData) {
  const allowedFields = ['name', 'nodes', 'connections', 'settings'];
  if (workflowData.id) {
    allowedFields.push('id');  // Preserve ID
  }
  // ... returns cleaned object with only these fields
}
```

### 3. Upload to N8N API

```javascript
// Nodes array is included unchanged
POST /api/v1/workflows
{
  "id": "iyOorVjd7ifKs9zs",       // Preserved ID
  "name": "[Jana] Time de agentes",
  "nodes": [                        // Nodes unchanged
    {
      "type": "@n8n/n8n-nodes-langchain.toolWorkflow",
      "parameters": {
        "workflowId": {
          "value": "xxjdOgNFmgtNGhvs"  // Reference preserved
        }
      }
    }
  ],
  "connections": { ... },
  "settings": { ... }
}
```

### 4. N8N Creates Workflow with Preserved ID

- N8N API receives the complete workflow data
- The `id` field tells N8N to use this specific ID
- All `nodes` are stored exactly as provided
- All `workflowId.value` references remain intact

## Critical Requirements for Upload

### ✅ DO:

1. **Upload ALL workflows BEFORE activating any**
   - Referenced workflows must exist before being called

2. **Preserve workflow IDs during upload**
   - Include `id` field in upload payload
   - Use the original ID from the downloaded workflow

3. **Keep nodes array unchanged**
   - Do NOT modify the nodes array
   - Do NOT modify workflowId parameters

4. **Upload in dependency order (optional but recommended)**
   - Upload "leaf" workflows first (those that don't call others)
   - Then upload workflows that call them

### ❌ DON'T:

1. **Don't let N8N auto-generate IDs**
   - This breaks all references

2. **Don't modify workflowId values**
   - Even small changes will break the link

3. **Don't activate workflows during upload**
   - Wait until all workflows are uploaded

4. **Don't skip the `nodes` field**
   - This would remove all workflow references

## Workflow Reference Map

Based on test results, here are the key workflows and their dependencies:

### Highly Referenced Workflows (Called Multiple Times):

- **BrobqIHcPHBeCUPN** - `(INS-BCO-001) fabrica-insere-banco`
  - Called by 2 workflows

- **rGrUV2QsLU9eCkoP** - `[Jana] (Banco) Buscar`
  - Called by 2 workflows

- **eSUHweIxuJ7p4LZF** - `[Jana] (Responde) Outros softwares`
  - Called by 2 workflows

- **89IzL0L8k2EcudI0** - `[Jana] Dividir Mensagens`
  - Called by 2 workflows

### Key Orchestration Workflows:

- **processamento-resposta-agente (PRC-RES-001)** - Calls 13 different workflows
- **3. (MAP-DBC-001) ponte-normalizacao-debouncer-agente** - Calls 5 workflows
- **[Jana] Time de agentes** - Calls 2 workflows (as LangChain tools)

## Verification

### Test Command:

```bash
node test-workflow-id-preservation.js
```

### What It Tests:

1. **Extract Workflow References** - Maps all workflow dependencies
2. **Verify workflowId Structure** - Confirms ID format
3. **Verify Nodes Preservation** - Ensures nodes aren't modified
4. **Verify Upload Payload** - Confirms nodes are in payload

### Expected Results:

```
✅ ANALYSIS SUMMARY:

1. Workflow References Found: 18
2. Node Preservation: PASS
3. workflowId Structure: Valid
```

## Implementation Status

### Current Upload Implementation:

| Feature | Status | Notes |
|---------|--------|-------|
| Includes `nodes` in payload | ✅ WORKING | Part of `_cleanWorkflowPayload` allowed fields |
| Preserves `nodes` array unchanged | ✅ WORKING | Deep copy without modification |
| Preserves `workflowId` parameters | ✅ WORKING | Stored in nodes, not modified |
| Attempts to preserve workflow ID | ✅ WORKING | Uses `id` field in payload |
| Tag processing | ✅ WORKING | Extracts and recreates tags |

### Code References:

**File**: `src/services/workflow-service.js`

```javascript
// Lines 352-379: Clean payload function
_cleanWorkflowPayload(workflowData) {
  const allowedFields = ['name', 'nodes', 'connections', 'settings'];
  if (workflowData.id) {
    allowedFields.push('id');  // ← Preserves ID
  }
  // ... includes 'nodes' in allowed fields ← Preserves references
}

// Lines 389-455: Upload function
async uploadWorkflow(workflowData, force = false) {
  const uploadData = this._cleanWorkflowPayload(workflowData);
  // ... uploads with ID and complete nodes array
}
```

## Troubleshooting

### If References Break After Upload:

1. **Check Workflow IDs**
   ```bash
   # Compare source and target workflow IDs
   Source ID: iyOorVjd7ifKs9zs
   Target ID: [should be same]
   ```

2. **Verify Node Content**
   ```javascript
   // Check if workflowId.value matches target workflow ID
   node.parameters.workflowId.value === targetWorkflow.id
   ```

3. **Check Upload Order**
   - Referenced workflows must exist before upload
   - Upload "dependencies first" if possible

4. **Verify N8N API Response**
   - Check if N8N accepted the `id` field
   - Some N8N versions may not support ID preservation

### Common Issues:

| Issue | Cause | Solution |
|-------|-------|----------|
| "Workflow not found" errors | Referenced workflow doesn't exist | Upload all workflows first |
| Different workflow IDs | N8N auto-generated new ID | Include `id` in upload payload |
| Node missing workflowId | Node was modified during upload | Don't modify `nodes` array |

## Conclusion

The current implementation **DOES preserve workflow references** correctly:

1. ✅ Nodes array is passed unchanged to N8N API
2. ✅ All workflowId parameters remain intact
3. ✅ Workflow IDs are preserved via `id` field
4. ✅ Upload process doesn't modify reference structure

**As long as:**
- All workflows are uploaded before activation
- Workflow IDs are preserved (via `id` field)
- Nodes array is not modified

**Then:**
- All workflow references (elo) will remain intact
- Workflows can successfully call each other
- The orchestration architecture is preserved

---

**Last Updated**: 2025-10-01
**Test Coverage**: 18 workflows, 18 referenced IDs, 25+ executeWorkflow nodes
