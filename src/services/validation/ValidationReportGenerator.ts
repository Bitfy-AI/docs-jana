/**
 * Gerador de relatórios de validação em JSON
 * @module services/validation/ValidationReportGenerator
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import type { ValidationReport, EnrichedDuplicateInfo } from '../../types/validation';

/**
 * Gera relatórios de validação em formato JSON
 */
export class ValidationReportGenerator {
  private logPath: string;

  constructor(logPath: string = '.jana/logs/validation-errors.json') {
    this.logPath = logPath;
  }

  /**
   * Salva relatório de validação em arquivo JSON
   * @param report - Relatório de validação
   */
  public save(report: ValidationReport): void {
    // Garante que diretório existe
    const dir = dirname(this.logPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Escreve JSON formatado
    writeFileSync(
      this.logPath,
      JSON.stringify(report, null, 2),
      'utf-8'
    );
  }

  /**
   * Cria relatório de duplicatas
   * @param totalWorkflows - Total de workflows validados
   * @param duplicates - Array de duplicatas
   * @returns Relatório formatado
   */
  public createReport(
    totalWorkflows: number,
    duplicates: EnrichedDuplicateInfo[]
  ): ValidationReport {
    return {
      timestamp: new Date().toISOString(),
      totalWorkflows,
      duplicatesFound: duplicates.length,
      duplicates,
    };
  }

  /**
   * Salva relatório de sucesso (sem duplicatas)
   * @param totalWorkflows - Total de workflows validados
   */
  public saveSuccess(totalWorkflows: number): void {
    const report = this.createReport(totalWorkflows, []);
    this.save(report);
  }

  /**
   * Salva relatório de falha (com duplicatas)
   * @param totalWorkflows - Total de workflows validados
   * @param duplicates - Duplicatas detectadas
   */
  public saveFailure(totalWorkflows: number, duplicates: EnrichedDuplicateInfo[]): void {
    const report = this.createReport(totalWorkflows, duplicates);
    this.save(report);
  }

  /**
   * Retorna caminho do arquivo de log
   */
  public getLogPath(): string {
    return this.logPath;
  }
}
