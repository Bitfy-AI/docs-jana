/**
 * Extrator de IDs internos de workflows do n8n
 * @module services/validation/InternalIDExtractor
 */

import type { N8NWorkflow, ValidationConfig } from '../../types/validation';

/**
 * Extrator de IDs internos usando regex configurável
 */
export class InternalIDExtractor {
  private readonly ID_PATTERN: RegExp;

  /**
   * @param config - Configuração de validação
   */
  constructor(config: ValidationConfig) {
    // Compila regex uma vez no constructor para performance
    const pattern = config.idPattern || String.raw`\([A-Z]+-[A-Z]+-\d{3}\)`;
    this.ID_PATTERN = new RegExp(pattern, 'gi'); // Case-insensitive
  }

  /**
   * Extrai IDs internos de todos os workflows
   * @param workflows - Array de workflows do n8n
   * @returns Map de ID interno para array de IDs n8n
   */
  public extractInternalIDs(workflows: N8NWorkflow[]): Map<string, string[]> {
    const idMap = new Map<string, string[]>();

    for (const workflow of workflows) {
      const internalID = this.extractSingleID(workflow);

      if (internalID) {
        if (!idMap.has(internalID)) {
          idMap.set(internalID, []);
        }
        idMap.get(internalID)!.push(workflow.id);
      }
    }

    return idMap;
  }

  /**
   * Extrai ID interno de um único workflow
   * @param workflow - Workflow individual
   * @returns ID interno ou null se não encontrado
   */
  public extractSingleID(workflow: N8NWorkflow): string | null {
    // Reset regex lastIndex para garantir match correto
    this.ID_PATTERN.lastIndex = 0;

    // 1. Procura ID no nome do workflow (prioridade)
    const nameMatch = this.extractFromString(workflow.name);
    if (nameMatch) {
      return this.normalizeID(nameMatch);
    }

    // 2. Fallback: procura em tags (se disponível)
    if (workflow.tags && workflow.tags.length > 0) {
      const tagsString = workflow.tags.join(' ');
      const tagMatch = this.extractFromString(tagsString);
      if (tagMatch) {
        return this.normalizeID(tagMatch);
      }
    }

    // 3. Não encontrou ID válido
    return null;
  }

  /**
   * Extrai ID de uma string usando regex
   * @param text - Texto para buscar
   * @returns ID encontrado ou null
   */
  private extractFromString(text: string): string | null {
    this.ID_PATTERN.lastIndex = 0; // Reset
    const match = this.ID_PATTERN.exec(text);
    return match ? match[0] : null;
  }

  /**
   * Normaliza ID (uppercase e trim)
   * @param id - ID bruto
   * @returns ID normalizado
   */
  private normalizeID(id: string): string {
    return id.trim().toUpperCase();
  }

  /**
   * Retorna o padrão regex usado
   */
  public getPattern(): RegExp {
    return this.ID_PATTERN;
  }
}
