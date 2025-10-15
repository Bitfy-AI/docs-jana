/**
 * @fileoverview Core data models for N8N Transfer System
 *
 * This module provides TypeScript-like interfaces via JSDoc and runtime validation
 * using Zod schemas for all core data structures used in the transfer system.
 *
 * @module n8n-transfer/core/types
 * @author Jana Team
 * @version 1.0.0
 */

const { z } = require('zod');

// =============================================================================
// TYPESCRIPT/JSDOC TYPE DEFINITIONS
// =============================================================================

/**
 * N8N Workflow representation (matches N8N API schema)
 *
 * @typedef {Object} Workflow
 * @property {string} [id] - N8N workflow ID (undefined for new workflows)
 * @property {string} name - Workflow name (required, non-empty)
 * @property {Node[]} nodes - Array of workflow nodes (at least one node required)
 * @property {Object.<string, Connection>} connections - Node connections mapping
 * @property {Tag[]} [tags] - Tags for organization and categorization
 * @property {boolean} [active=false] - Is workflow active? Defaults to false
 * @property {Object} [settings] - Workflow execution settings
 * @property {string} [versionId] - Workflow version identifier
 * @property {string} [createdAt] - ISO 8601 timestamp of creation
 * @property {string} [updatedAt] - ISO 8601 timestamp of last update
 *
 * @example
 * const workflow = {
 *   id: '123',
 *   name: 'Customer Onboarding Flow',
 *   nodes: [
 *     {
 *       id: 'node-1',
 *       name: 'Start',
 *       type: 'n8n-nodes-base.start',
 *       typeVersion: 1,
 *       position: [250, 300],
 *       parameters: {}
 *     }
 *   ],
 *   connections: {
 *     'Start': {
 *       main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]]
 *     }
 *   },
 *   tags: [{ id: '1', name: 'production' }],
 *   active: true,
 *   settings: { executionOrder: 'v1' },
 *   createdAt: '2025-10-01T10:00:00.000Z',
 *   updatedAt: '2025-10-02T15:30:00.000Z'
 * };
 */

/**
 * N8N Workflow Node
 *
 * Represents a single node in an N8N workflow. Each node has a unique ID,
 * type, configuration parameters, and optional credentials.
 *
 * @typedef {Object} Node
 * @property {string} id - Unique node identifier (e.g., 'node-1', 'http-request-node')
 * @property {string} name - Human-readable node name
 * @property {string} type - Node type identifier (e.g., 'n8n-nodes-base.httpRequest')
 * @property {number} [typeVersion=1] - Node type version (defaults to 1)
 * @property {[number, number]} position - [x, y] canvas coordinates
 * @property {Object.<string, any>} parameters - Node configuration parameters
 * @property {Object.<string, string>} [credentials] - Credential references (e.g., { httpHeaderAuth: 'my-api-key' })
 *
 * @example
 * const httpNode = {
 *   id: 'http-req-1',
 *   name: 'Fetch Customer Data',
 *   type: 'n8n-nodes-base.httpRequest',
 *   typeVersion: 1,
 *   position: [500, 300],
 *   parameters: {
 *     method: 'GET',
 *     url: 'https://api.example.com/customers',
 *     authentication: 'headerAuth'
 *   },
 *   credentials: {
 *     httpHeaderAuth: 'my-api-credentials'
 *   }
 * };
 */

/**
 * Connection between workflow nodes
 *
 * Defines how data flows between nodes in an N8N workflow.
 *
 * @typedef {Object} Connection
 * @property {string} sourceNodeId - Source node identifier
 * @property {number} [sourceOutputIndex=0] - Output index from source node (default: 0)
 * @property {string} targetNodeId - Target node identifier
 * @property {number} [targetInputIndex=0] - Input index to target node (default: 0)
 *
 * @example
 * const connection = {
 *   sourceNodeId: 'Start',
 *   sourceOutputIndex: 0,
 *   targetNodeId: 'HTTP Request',
 *   targetInputIndex: 0
 * };
 */

/**
 * Workflow Tag
 *
 * Tags are used for organizing and categorizing workflows in N8N.
 *
 * @typedef {Object} Tag
 * @property {string} [id] - Tag ID (assigned by N8N)
 * @property {string} name - Tag name (e.g., 'production', 'customer-service', 'v2')
 * @property {string} [createdAt] - ISO 8601 timestamp of tag creation
 * @property {string} [updatedAt] - ISO 8601 timestamp of last update
 *
 * @example
 * const tag = {
 *   id: 'tag-123',
 *   name: 'production',
 *   createdAt: '2025-10-01T10:00:00.000Z',
 *   updatedAt: '2025-10-01T10:00:00.000Z'
 * };
 */

/**
 * Transfer State
 *
 * Represents the current state of an ongoing or completed workflow transfer operation.
 * Used for progress tracking, resumability, and error recovery.
 *
 * @typedef {Object} TransferState
 * @property {Workflow} workflow - The workflow being transferred
 * @property {'pending'|'validating'|'transferring'|'completed'|'skipped'|'failed'} status - Current transfer status
 * @property {string} [source] - Source N8N instance URL
 * @property {string} [target] - Target N8N instance URL
 * @property {string} [reason] - Reason for skip/failure (e.g., 'duplicate', 'validation-failed')
 * @property {Object} [validation] - Validation results
 * @property {boolean} validation.passed - Whether validation passed
 * @property {Array<{code: string, message: string, severity: 'error'|'warning'}>} [validation.errors] - Validation errors/warnings
 *
 * @example
 * const transferState = {
 *   workflow: { id: '123', name: 'My Workflow', nodes: [...], connections: {} },
 *   status: 'transferring',
 *   source: 'https://source.n8n.io',
 *   target: 'https://target.n8n.io',
 *   validation: {
 *     passed: true,
 *     errors: []
 *   }
 * };
 */

/**
 * Transfer Summary
 *
 * Comprehensive summary of a transfer operation including statistics,
 * transferred/skipped/failed workflows, and error details.
 *
 * @typedef {Object} TransferSummary
 * @property {number} total - Total workflows found in source
 * @property {number} transferred - Number of workflows successfully transferred
 * @property {number} skipped - Number of workflows skipped (duplicates, filtered, invalid)
 * @property {number} failed - Number of workflows that failed to transfer
 * @property {number} [duplicates] - Number of workflows skipped due to duplication
 * @property {number} duration - Total transfer duration in milliseconds
 * @property {Array<{workflow: string, error: string, code: string}>} [errors] - Detailed error list for failed transfers
 * @property {ReportFile[]} [reports] - Array of generated report files
 *
 * @example
 * const summary = {
 *   total: 50,
 *   transferred: 45,
 *   skipped: 3,
 *   failed: 2,
 *   duplicates: 3,
 *   duration: 120000, // 2 minutes
 *   errors: [
 *     {
 *       workflow: 'Failed Workflow 1',
 *       error: 'Invalid workflow structure: missing required nodes',
 *       code: 'VALIDATION_ERROR'
 *     },
 *     {
 *       workflow: 'Failed Workflow 2',
 *       error: 'Network timeout while transferring',
 *       code: 'NETWORK_TIMEOUT'
 *     }
 *   ],
 *   reports: [
 *     {
 *       reporter: 'markdown-reporter',
 *       path: '/path/to/report.md',
 *       format: 'markdown'
 *     }
 *   ]
 * };
 */

/**
 * Report File
 *
 * Represents a generated report file from a reporter plugin.
 *
 * @typedef {Object} ReportFile
 * @property {string} reporter - Nome do reporter que gerou o arquivo
 * @property {string} path - Caminho completo do arquivo de relatório
 * @property {string} format - Formato do relatório (markdown, json, csv, etc)
 *
 * @example
 * const reportFile = {
 *   reporter: 'markdown-reporter',
 *   path: '/path/to/transfer-report-2025-10-03.md',
 *   format: 'markdown'
 * };
 */

/**
 * Validation Result
 *
 * Resultado de uma operação de validação standalone de workflows.
 * Retornado pelo método TransferManager.validate().
 *
 * @typedef {Object} ValidationResult
 * @property {number} total - Total de workflows validados
 * @property {number} valid - Workflows válidos (sem issues)
 * @property {number} invalid - Workflows inválidos (com issues)
 * @property {number} errors - Total de erros encontrados
 * @property {number} warnings - Total de warnings encontrados
 * @property {Array<Object>} issues - Lista de issues por workflow
 * @property {string} issues[].workflow - Nome do workflow
 * @property {string} issues[].workflowId - ID do workflow
 * @property {Array<Object>} issues[].issues - Issues encontrados no workflow
 * @property {string[]} validators - Nomes dos validators utilizados
 *
 * @example
 * const result = {
 *   total: 10,
 *   valid: 8,
 *   invalid: 2,
 *   errors: 3,
 *   warnings: 1,
 *   issues: [
 *     {
 *       workflow: 'Problematic Workflow',
 *       workflowId: '123',
 *       issues: [
 *         {
 *           validator: 'integrity-validator',
 *           phase: 'standalone',
 *           message: 'Missing required node: Start',
 *           severity: 'error'
 *         },
 *         {
 *           validator: 'integrity-validator',
 *           phase: 'standalone',
 *           message: 'Deprecated node type detected',
 *           severity: 'warning'
 *         }
 *       ]
 *     }
 *   ],
 *   validators: ['integrity-validator', 'schema-validator']
 * };
 */

/**
 * Transfer Options
 *
 * Configuration options for workflow transfer operations. Allows filtering
 * workflows by various criteria and customizing transfer behavior.
 *
 * @typedef {Object} TransferOptions
 * @property {Object} [filters] - Filtros de seleção de workflows
 * @property {string[]} [filters.workflowIds] - IDs específicos de workflows para transferir
 * @property {string[]} [filters.workflowNames] - Nomes específicos de workflows para transferir
 * @property {string[]} [filters.tags] - Incluir apenas workflows com essas tags
 * @property {string[]} [filters.excludeTags] - Excluir workflows com essas tags
 * @property {boolean} [dryRun=false] - Modo simulação (valida mas não transfere de fato)
 * @property {number} [parallelism=3] - Número de transferências paralelas (1-10)
 * @property {string} [deduplicator='standard-deduplicator'] - Nome do plugin deduplicator a usar
 * @property {string[]} [validators=['integrity-validator']] - Nomes dos plugins validators a usar
 * @property {string[]} [reporters=['markdown-reporter']] - Nomes dos plugins reporters a usar
 * @property {boolean} [skipCredentials=false] - Pular workflows com credenciais (evita falhas de auth)
 *
 * @example
 * // Transferência simples com defaults
 * const options = {};
 *
 * @example
 * // Transferência com filtros
 * const options = {
 *   filters: {
 *     tags: ['production'],
 *     excludeTags: ['deprecated']
 *   },
 *   dryRun: false
 * };
 *
 * @example
 * // Transferência customizada
 * const options = {
 *   filters: { workflowIds: ['123', '456'] },
 *   parallelism: 5,
 *   deduplicator: 'fuzzy-deduplicator',
 *   validators: ['integrity-validator', 'schema-validator'],
 *   reporters: ['markdown-reporter', 'json-reporter'],
 *   skipCredentials: true
 * };
 */

// =============================================================================
// ZOD RUNTIME VALIDATION SCHEMAS
// =============================================================================

/**
 * Zod schema for validating Tag objects
 * Note: Not using .strict() to allow additional N8N tag fields
 */
const TagSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Tag name cannot be empty'),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

/**
 * Zod schema for validating Node objects
 * Note: Not using .strict() to allow additional N8N node fields
 */
const NodeSchema = z.object({
  id: z.string().min(1, 'Node ID is required'),
  name: z.string().min(1, 'Node name is required'),
  type: z.string().min(1, 'Node type is required'),
  typeVersion: z.number().int().positive().default(1),
  position: z.tuple([z.number(), z.number()]),
  parameters: z.record(z.any()),
  credentials: z.record(z.any()).optional(),
});

/**
 * Zod schema for validating Connection objects
 */
const ConnectionSchema = z.object({
  sourceNodeId: z.string().min(1, 'Source node ID is required'),
  sourceOutputIndex: z.number().int().nonnegative().default(0),
  targetNodeId: z.string().min(1, 'Target node ID is required'),
  targetInputIndex: z.number().int().nonnegative().default(0),
}).strict();

/**
 * Zod schema for validating Workflow objects
 * Note: Not using .strict() to allow additional N8N API fields
 * Note: Using z.any() for nested structures to avoid Zod v4 compatibility issues
 */
const WorkflowSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Workflow name is required'),
  nodes: z.array(z.any()).min(1, 'Workflow must have at least one node'),
  connections: z.any(), // N8N uses complex nested connection structure
  tags: z.array(z.any()).optional().default([]),
  active: z.boolean().optional().default(false),
  settings: z.any().optional(),
  versionId: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

/**
 * Zod schema for validating TransferState objects
 */
const TransferStateSchema = z.object({
  workflow: WorkflowSchema,
  status: z.enum(['pending', 'validating', 'transferring', 'completed', 'skipped', 'failed']),
  source: z.string().url().optional(),
  target: z.string().url().optional(),
  reason: z.string().optional(),
  validation: z.object({
    passed: z.boolean(),
    errors: z.array(z.object({
      code: z.string(),
      message: z.string(),
      severity: z.enum(['error', 'warning']),
    })).optional(),
  }).optional(),
}).strict();

/**
 * Zod schema for validating TransferSummary objects
 */
const TransferSummarySchema = z.object({
  total: z.number().int().nonnegative(),
  transferred: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  duplicates: z.number().int().nonnegative().optional(),
  duration: z.number().int().nonnegative(), // Duration in milliseconds
  errors: z.array(z.object({
    workflow: z.string(),
    error: z.string(),
    code: z.string(),
  })).optional(),
}).strict();

/**
 * Zod schema for validating TransferOptions objects
 */
const TransferOptionsSchema = z.object({
  filters: z.object({
    workflowIds: z.array(z.string()).optional(),
    workflowNames: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    excludeTags: z.array(z.string()).optional(),
  }).optional().default({}),
  dryRun: z.boolean().default(false),
  parallelism: z.number().int().min(1).max(10).default(3),
  deduplicator: z.string().default('standard-deduplicator'),
  validators: z.array(z.string()).default(['integrity-validator']),
  reporters: z.array(z.string()).default(['markdown-reporter']),
  skipCredentials: z.boolean().default(false),
}).strict();

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validates a Workflow object against the WorkflowSchema
 *
 * @param {any} data - Data to validate
 * @returns {{success: true, data: Workflow} | {success: false, error: z.ZodError}} Validation result
 *
 * @example
 * const result = validateWorkflow({ name: 'Test', nodes: [...], connections: {} });
 * if (result.success) {
 *   console.log('Valid workflow:', result.data);
 * } else {
 *   console.error('Validation errors:', result.error.issues);
 * }
 */
function validateWorkflow(data) {
  return WorkflowSchema.safeParse(data);
}

/**
 * Validates a Node object against the NodeSchema
 *
 * @param {any} data - Data to validate
 * @returns {{success: true, data: Node} | {success: false, error: z.ZodError}} Validation result
 *
 * @example
 * const result = validateNode({ id: 'node-1', name: 'Start', type: 'n8n-nodes-base.start', position: [0, 0], parameters: {} });
 * if (!result.success) {
 *   console.error('Invalid node:', result.error.issues);
 * }
 */
function validateNode(data) {
  return NodeSchema.safeParse(data);
}

/**
 * Validates a Connection object against the ConnectionSchema
 *
 * @param {any} data - Data to validate
 * @returns {{success: true, data: Connection} | {success: false, error: z.ZodError}} Validation result
 *
 * @example
 * const result = validateConnection({ sourceNodeId: 'Start', targetNodeId: 'End' });
 * if (result.success) {
 *   console.log('Valid connection');
 * }
 */
function validateConnection(data) {
  return ConnectionSchema.safeParse(data);
}

/**
 * Validates a Tag object against the TagSchema
 *
 * @param {any} data - Data to validate
 * @returns {{success: true, data: Tag} | {success: false, error: z.ZodError}} Validation result
 *
 * @example
 * const result = validateTag({ name: 'production' });
 * if (result.success) {
 *   console.log('Valid tag');
 * }
 */
function validateTag(data) {
  return TagSchema.safeParse(data);
}

/**
 * Validates a TransferState object against the TransferStateSchema
 *
 * @param {any} data - Data to validate
 * @returns {{success: true, data: TransferState} | {success: false, error: z.ZodError}} Validation result
 *
 * @example
 * const result = validateTransferState({
 *   workflow: myWorkflow,
 *   status: 'transferring',
 *   source: 'https://source.n8n.io',
 *   target: 'https://target.n8n.io'
 * });
 */
function validateTransferState(data) {
  return TransferStateSchema.safeParse(data);
}

/**
 * Validates a TransferSummary object against the TransferSummarySchema
 *
 * @param {any} data - Data to validate
 * @returns {{success: true, data: TransferSummary} | {success: false, error: z.ZodError}} Validation result
 *
 * @example
 * const result = validateTransferSummary({
 *   total: 50,
 *   transferred: 45,
 *   skipped: 3,
 *   failed: 2,
 *   duration: 120000
 * });
 */
function validateTransferSummary(data) {
  return TransferSummarySchema.safeParse(data);
}

/**
 * Validates a TransferOptions object against the TransferOptionsSchema
 *
 * @param {any} data - Data to validate
 * @returns {{success: true, data: TransferOptions} | {success: false, error: z.ZodError}} Validation result
 *
 * @example
 * const result = validateTransferOptions({
 *   filters: { tags: ['production'] },
 *   dryRun: true,
 *   parallelism: 5
 * });
 * if (result.success) {
 *   console.log('Valid options:', result.data);
 * } else {
 *   console.error('Validation errors:', result.error.issues);
 * }
 */
function validateTransferOptions(data) {
  return TransferOptionsSchema.safeParse(data);
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Zod Schemas
  WorkflowSchema,
  NodeSchema,
  ConnectionSchema,
  TagSchema,
  TransferStateSchema,
  TransferSummarySchema,
  TransferOptionsSchema,

  // Validation Functions
  validateWorkflow,
  validateNode,
  validateConnection,
  validateTag,
  validateTransferState,
  validateTransferSummary,
  validateTransferOptions,
};
