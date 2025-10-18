/**
 * Serviço de validação de workflows
 * @module services/validation/WorkflowValidationService
 */

import type {
  N8NWorkflow,
  ValidationResult,
  ValidationConfig,
  ValidationReport,
} from '../../types/validation';
import { InternalIDExtractor } from './InternalIDExtractor';
import { DuplicateIDDetector } from './DuplicateIDDetector';
import { IDSuggestionEngine } from './IDSuggestionEngine';
import { ErrorMessageFormatter } from './ErrorMessageFormatter';

/**
 * Erro de validação lançado quando duplicatas são detectadas
 */
export class ValidationError extends Error {
  constructor(
    public readonly messages: string[],
    public readonly duplicates: any[]
  ) {
    super('Validation failed: duplicate IDs detected');
    this.name = 'ValidationError';
  }
}

/**
 * Interface para logger (compatível com Winston)
 */
export interface Logger {
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
}

/**
 * Logger console simples (fallback se Winston não disponível)
 */
class ConsoleLogger implements Logger {
  info(message: string, meta?: any): void {
    console.log(`[INFO] ${message}`, meta || '');
  }

  warn(message: string, meta?: any): void {
    console.warn(`[WARN] ${message}`, meta || '');
  }

  error(message: string, meta?: any): void {
    console.error(`[ERROR] ${message}`, meta || '');
  }
}

/**
 * Serviço principal de validação de workflows
 * Orquestra todos os componentes de validação
 */
export class WorkflowValidationService {
  private idExtractor: InternalIDExtractor;
  private duplicateDetector: DuplicateIDDetector;
  private suggestionEngine: IDSuggestionEngine;
  private messageFormatter: ErrorMessageFormatter;
  private logger: Logger;

  constructor(
    config: ValidationConfig,
    logger?: Logger
  ) {
    this.idExtractor = new InternalIDExtractor(config);
    this.duplicateDetector = new DuplicateIDDetector();
    this.suggestionEngine = new IDSuggestionEngine();
    this.messageFormatter = new ErrorMessageFormatter();
    this.logger = logger || new ConsoleLogger();
  }

  /**
   * Valida workflows baixados para detectar IDs duplicados
   * @param workflows - Array de workflows do n8n
   * @returns Resultado de validação
   * @throws {ValidationError} Se duplicatas forem encontradas
   */
  public validateWorkflows(workflows: N8NWorkflow[]): ValidationResult {
    const startTime = performance.now();

    this.logger.info('Starting workflow validation', {
      totalWorkflows: workflows.length,
    });

    // 1. Extrai IDs internos
    const idMap = this.idExtractor.extractInternalIDs(workflows);

    this.logger.info('Internal IDs extracted', {
      uniqueIDs: idMap.size,
      workflowsWithIDs: Array.from(idMap.values()).reduce((sum, ids) => sum + ids.length, 0),
    });

    // 2. Detecta duplicatas
    const duplicates = this.duplicateDetector.findDuplicates(idMap);

    if (duplicates.length === 0) {
      const duration = performance.now() - startTime;

      this.logger.info('Validation successful - no duplicates found', {
        duration_ms: Math.round(duration),
        totalWorkflows: workflows.length,
      });

      return {
        valid: true,
        duplicates: [],
        totalWorkflows: workflows.length,
        validatedAt: new Date(),
      };
    }

    // 3. Enriquece com sugestões
    const enrichedDuplicates = this.suggestionEngine.enrichWithSuggestions(duplicates, idMap);

    // 4. Formata mensagens
    const formattedMessages = this.messageFormatter.format(enrichedDuplicates);

    const duration = performance.now() - startTime;

    this.logger.error('Validation failed - duplicates detected', {
      duration_ms: Math.round(duration),
      totalDuplicates: duplicates.length,
      affectedWorkflows: this.duplicateDetector.countAffectedWorkflows(duplicates),
      duplicates: enrichedDuplicates.map((d) => ({
        id: d.internalID,
        count: d.count,
      })),
    });

    // Lança erro com detalhes
    throw new ValidationError(formattedMessages, enrichedDuplicates);
  }

  /**
   * Valida workflows e retorna apenas relatório (sem throw)
   * @param workflows - Array de workflows do n8n
   * @returns Relatório de validação
   */
  public validateWorkflowsNonBlocking(workflows: N8NWorkflow[]): ValidationReport {
    try {
      const result = this.validateWorkflows(workflows);

      return {
        timestamp: new Date().toISOString(),
        totalWorkflows: result.totalWorkflows,
        duplicatesFound: 0,
        duplicates: [],
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          timestamp: new Date().toISOString(),
          totalWorkflows: workflows.length,
          duplicatesFound: error.duplicates.length,
          duplicates: error.duplicates,
        };
      }

      throw error; // Re-throw se não for ValidationError
    }
  }

  /**
   * Gera relatório de validação formatado
   * @param workflows - Array de workflows
   * @returns Relatório em formato string
   */
  public generateReport(workflows: N8NWorkflow[]): string {
    const report = this.validateWorkflowsNonBlocking(workflows);

    const lines: string[] = [];

    lines.push(this.messageFormatter.formatLogHeader(report.duplicatesFound, report.totalWorkflows));

    if (report.duplicatesFound > 0) {
      const messages = this.messageFormatter.format(report.duplicates);
      lines.push(...messages);
    } else {
      lines.push('✅ Nenhuma duplicata encontrada\n');
    }

    return lines.join('\n');
  }
}
