/**
 * Detector de IDs duplicados
 * @module services/validation/DuplicateIDDetector
 */

import type { DuplicateInfo } from '../../types/validation';

/**
 * Detector de IDs internos duplicados usando algoritmo O(n)
 */
export class DuplicateIDDetector {
  /**
   * Encontra todos os IDs duplicados
   * @param idMap - Map de ID interno para IDs n8n
   * @returns Array de duplicatas detectadas (ordenado por severidade)
   */
  public findDuplicates(idMap: Map<string, string[]>): DuplicateInfo[] {
    const duplicates: DuplicateInfo[] = [];

    for (const [internalID, n8nIDs] of idMap.entries()) {
      if (n8nIDs.length > 1) {
        duplicates.push({
          internalID,
          n8nIDs,
          count: n8nIDs.length,
        });
      }
    }

    // Ordena por número de duplicatas (maior primeiro = mais severo)
    return duplicates.sort((a, b) => b.count - a.count);
  }

  /**
   * Verifica se um ID específico está duplicado
   * @param internalID - ID interno para verificar
   * @param idMap - Map de referência
   * @returns true se duplicado
   */
  public isDuplicate(internalID: string, idMap: Map<string, string[]>): boolean {
    const n8nIDs = idMap.get(internalID);
    return n8nIDs !== undefined && n8nIDs.length > 1;
  }

  /**
   * Conta total de duplicatas únicas
   * @param duplicates - Array de duplicatas
   * @returns Número total de IDs duplicados
   */
  public countUniqueDuplicates(duplicates: DuplicateInfo[]): number {
    return duplicates.length;
  }

  /**
   * Conta total de workflows afetados por duplicatas
   * @param duplicates - Array de duplicatas
   * @returns Número total de workflows com IDs duplicados
   */
  public countAffectedWorkflows(duplicates: DuplicateInfo[]): number {
    return duplicates.reduce((total, dup) => total + dup.count, 0);
  }
}
