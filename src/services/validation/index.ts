/**
 * Barrel export para módulo de validação
 * @module services/validation
 */

// Services
export { ConfigReader } from './ConfigReader';
export { InternalIDExtractor } from './InternalIDExtractor';
export { DuplicateIDDetector } from './DuplicateIDDetector';
export { IDSuggestionEngine } from './IDSuggestionEngine';
export { ErrorMessageFormatter } from './ErrorMessageFormatter';
export { WorkflowValidationService, ValidationError } from './WorkflowValidationService';

// Errors
export {
  ValidationErrorBase,
  N8NConnectionError,
  ConfigError,
  InvalidIDPatternError,
} from './errors';

// Re-export types
export type {
  N8NWorkflow,
  ValidationConfig,
  ValidationResult,
  ValidationReport,
  DuplicateInfo,
  EnrichedDuplicateInfo,
} from '../../types/validation';

export { ExitCode, ErrorCode, DEFAULT_VALIDATION_CONFIG } from '../../types/validation';
