/**
 * Gerador de sugestões de IDs corretos
 * @module services/validation/IDSuggestionEngine
 */

import type { DuplicateInfo, EnrichedDuplicateInfo } from '../../types/validation';

/**
 * Gera sugestões automáticas de IDs corretos baseadas em padrões sequenciais
 */
export class IDSuggestionEngine {
  /**
   * Enriquece duplicatas com sugestões de IDs corretos
   * @param duplicates - Duplicatas detectadas
   * @param idMap - Map de todos os IDs (para validar sugestão)
   * @returns Duplicatas enriquecidas com sugestões
   */
  public enrichWithSuggestions(
    duplicates: DuplicateInfo[],
    idMap: Map<string, string[]>
  ): EnrichedDuplicateInfo[] {
    const usedIDs = new Set(idMap.keys());

    return duplicates.map((duplicate) => {
      const suggestions: string[] = [];

      // Gera múltiplas sugestões (até 3) para cada duplicata
      // Precisa de (count - 1) sugestões, pois 1 workflow mantém o ID original
      const neededSuggestions = Math.min(duplicate.count - 1, 3);

      for (let i = 0; i < neededSuggestions; i++) {
        const suggestion = this.suggestNextID(
          duplicate.internalID,
          new Set([...usedIDs, ...suggestions])
        );
        if (suggestion) {
          suggestions.push(suggestion);
        }
      }

      return {
        ...duplicate,
        suggestions,
      };
    });
  }

  /**
   * Gera sugestão para um ID específico
   * @param internalID - ID duplicado
   * @param usedIDs - Set de IDs já usados
   * @returns ID sugerido ou null se não conseguir gerar
   */
  public suggestNextID(internalID: string, usedIDs: Set<string>): string | null {
    // Parse: (ERR-OUT-001) → prefix="ERR-OUT", number=1
    const match = internalID.match(/\(([A-Z]+-[A-Z]+)-(\d{3})\)/);

    if (!match) {
      // Padrão não reconhecido, não consegue sugerir
      return null;
    }

    const [, prefix, numberStr] = match;
    const currentNumber = parseInt(numberStr, 10);

    // Primeiro, tenta encontrar gaps na sequência
    for (let i = 1; i < currentNumber; i++) {
      const candidate = `(${prefix}-${this.padNumber(i, 3)})`;
      if (!usedIDs.has(candidate)) {
        return candidate;
      }
    }

    // Se não há gaps, incrementa sequencialmente
    for (let i = currentNumber + 1; i <= 999; i++) {
      const candidate = `(${prefix}-${this.padNumber(i, 3)})`;
      if (!usedIDs.has(candidate)) {
        return candidate;
      }
    }

    // Esgotou todos os números até 999
    return null;
  }

  /**
   * Adiciona zero-padding a um número
   * @param num - Número
   * @param length - Tamanho total desejado
   * @returns String com padding
   */
  private padNumber(num: number, length: number): string {
    return String(num).padStart(length, '0');
  }

  /**
   * Valida se uma sugestão é válida (não está em uso)
   * @param suggestion - ID sugerido
   * @param usedIDs - Set de IDs em uso
   * @returns true se sugestão é válida
   */
  public isValidSuggestion(suggestion: string, usedIDs: Set<string>): boolean {
    return !usedIDs.has(suggestion);
  }
}
