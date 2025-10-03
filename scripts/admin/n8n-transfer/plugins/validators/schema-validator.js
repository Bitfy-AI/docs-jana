/**
 * @fileoverview Schema Validator Plugin for N8N Transfer System
 *
 * This plugin validates N8N workflows against the complete N8N workflow schema
 * using Zod schemas defined in core/types.js. It ensures that workflows meet
 * all structural requirements before transfer.
 *
 * @module n8n-transfer/plugins/validators/schema-validator
 * @author Jana Team
 * @version 1.0.0
 */

const { BasePlugin } = require('../index');
const { WorkflowSchema } = require('../../core/types');

/**
 * Schema Validator Plugin
 *
 * Validates N8N workflows against the complete workflow schema using Zod.
 * This validator ensures that all required fields are present, data types
 * are correct, and the workflow structure is valid according to N8N API specs.
 *
 * @class SchemaValidator
 * @extends BasePlugin
 *
 * @example
 * const { SchemaValidator } = require('./plugins/validators/schema-validator');
 *
 * const validator = new SchemaValidator();
 * const result = validator.validate({
 *   name: 'My Workflow',
 *   nodes: [{ id: 'node-1', name: 'Start', type: 'n8n-nodes-base.start', position: [0, 0], parameters: {} }],
 *   connections: {}
 * });
 *
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * }
 */
class SchemaValidator extends BasePlugin {
  /**
   * Creates a new SchemaValidator instance
   *
   * @constructor
   *
   * @example
   * const validator = new SchemaValidator();
   * console.log(validator.getName()); // 'schema-validator'
   * console.log(validator.getType()); // 'validator'
   */
  constructor() {
    super('schema-validator', '1.0.0', 'validator');
    this.setDescription(
      'Validates N8N workflows against complete workflow schema using Zod. ' +
      'Ensures all required fields are present and data types are correct.'
    );
  }

  /**
   * Validates a workflow against the N8N workflow schema
   *
   * This method uses the WorkflowSchema from core/types.js to perform
   * comprehensive validation of the workflow structure. It checks:
   * - Required fields (name, nodes, connections)
   * - Data types for all fields
   * - Array constraints (e.g., nodes must have at least 1 element)
   * - Nested object structures
   *
   * @param {Object} workflow - The workflow object to validate
   * @returns {ValidationResult} Validation result with errors and warnings
   * @returns {boolean} ValidationResult.valid - true if workflow is valid
   * @returns {string[]} ValidationResult.errors - Array of error messages (if any)
   * @returns {string[]} ValidationResult.warnings - Array of warning messages (if any)
   * @returns {Object} [ValidationResult.metadata] - Additional validation metadata
   *
   * @example
   * // Valid workflow
   * const validWorkflow = {
   *   name: 'Customer Onboarding',
   *   nodes: [
   *     { id: 'start', name: 'Start', type: 'n8n-nodes-base.start', position: [0, 0], parameters: {} }
   *   ],
   *   connections: {}
   * };
   * const result = validator.validate(validWorkflow);
   * console.log(result.valid); // true
   *
   * @example
   * // Invalid workflow - missing name
   * const invalidWorkflow = {
   *   nodes: [],
   *   connections: {}
   * };
   * const result = validator.validate(invalidWorkflow);
   * console.log(result.valid); // false
   * console.log(result.errors); // ['Workflow name is required', 'Workflow must have at least one node']
   *
   * @example
   * // Invalid workflow - incorrect data types
   * const invalidWorkflow = {
   *   name: 'Test',
   *   nodes: 'not-an-array',
   *   connections: {}
   * };
   * const result = validator.validate(invalidWorkflow);
   * console.log(result.valid); // false
   * console.log(result.errors); // ['Expected array, received string']
   */
  validate(workflow) {
    // Initialize result structure
    const result = {
      valid: false,
      errors: [],
      warnings: [],
      metadata: {
        validator: 'schema-validator',
        version: this.version,
        timestamp: new Date().toISOString()
      }
    };

    // Check if workflow is provided
    if (!workflow) {
      result.errors.push('Workflow object is required');
      return result;
    }

    // Perform Zod schema validation
    const validationResult = WorkflowSchema.safeParse(workflow);

    if (validationResult.success) {
      // Validation passed
      result.valid = true;
      result.metadata.workflowName = validationResult.data.name;
      result.metadata.nodeCount = validationResult.data.nodes?.length || 0;
      result.metadata.tagCount = validationResult.data.tags?.length || 0;
      result.metadata.isActive = validationResult.data.active || false;

      // Add warnings for optional best practices
      if (!validationResult.data.tags || validationResult.data.tags.length === 0) {
        result.warnings.push(
          'Workflow has no tags. Consider adding tags for better organization.'
        );
      }

      if (!validationResult.data.settings) {
        result.warnings.push(
          'Workflow has no settings defined. Default settings will be used.'
        );
      }

    } else {
      // Validation failed - format Zod errors
      result.valid = false;
      result.errors = this._formatZodErrors(validationResult.error);

      // Add metadata about what was validated (if possible)
      if (workflow.name) {
        result.metadata.attemptedWorkflowName = workflow.name;
      }
    }

    return result;
  }

  /**
   * Formats Zod validation errors into user-friendly messages
   *
   * Transforms Zod's internal error format into clear, actionable error messages
   * that can be displayed to users or logged for debugging.
   *
   * @private
   * @param {import('zod').ZodError} zodError - Zod error object
   * @returns {string[]} Array of formatted error messages
   *
   * @example
   * // Internal use only
   * const errors = this._formatZodErrors(zodError);
   * // Returns: ['Workflow name is required', 'Expected array at nodes, received string']
   */
  _formatZodErrors(zodError) {
    const errors = [];

    for (const issue of zodError.issues) {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
      let message = '';

      switch (issue.code) {
      case 'invalid_type':
        // Use Zod's message directly for better compatibility with Zod v4
        message = `${issue.message} at '${path}'`;
        break;

      case 'too_small':
        // Use Zod's message directly
        message = `Field '${path}' is too small: ${issue.message}`;
        break;

      case 'too_big':
        // Use Zod's message directly
        message = `Field '${path}' is too big: ${issue.message}`;
        break;

      case 'invalid_string':
        message = `Field '${path}' has invalid format: ${issue.validation}`;
        break;

      case 'unrecognized_keys':
        message = `Unrecognized key(s) in '${path}': ${issue.keys.join(', ')}`;
        break;

      case 'invalid_enum_value':
        message = `Invalid value for '${path}'. Expected one of: ${issue.options.join(', ')}`;
        break;

      case 'invalid_value':
        // Zod v4 enum error
        message = `Invalid value for '${path}'. Expected one of: ${issue.values.join(', ')}`;
        break;

      case 'custom':
        message = issue.message;
        break;

      default:
        // Fallback to Zod's default message
        message = `Validation error at '${path}': ${issue.message}`;
        break;
      }

      errors.push(message);
    }

    return errors;
  }

  /**
   * Gets information about what this validator checks
   *
   * Returns a detailed description of all validations performed by this plugin.
   *
   * @returns {Object} Information about validator checks
   * @returns {string[]} Object.requiredFields - List of required fields
   * @returns {string[]} Object.validatedStructures - List of structures validated
   * @returns {string[]} Object.warnings - List of warnings that may be issued
   *
   * @example
   * const validator = new SchemaValidator();
   * const info = validator.getValidationInfo();
   * console.log(info.requiredFields); // ['name', 'nodes', 'connections']
   */
  getValidationInfo() {
    return {
      requiredFields: [
        'name',
        'nodes',
        'connections'
      ],
      optionalFields: [
        'id',
        'tags',
        'active',
        'settings',
        'versionId',
        'createdAt',
        'updatedAt'
      ],
      validatedStructures: [
        'Complete workflow schema',
        'Node structures (if present)',
        'Connection structures (if present)',
        'Tag structures (if present)'
      ],
      warnings: [
        'Missing tags (best practice)',
        'Missing settings (best practice)'
      ],
      errorFormats: [
        'Type mismatches (e.g., string instead of array)',
        'Missing required fields',
        'Invalid array sizes (e.g., empty nodes array)',
        'Invalid field formats'
      ]
    };
  }
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
  SchemaValidator
};
