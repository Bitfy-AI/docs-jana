/**
 * Formatador de mensagens de erro de validação
 * @module services/validation/ErrorMessageFormatter
 */

import type { EnrichedDuplicateInfo } from '../../types/validation';

/**
 * Formata mensagens de erro claras e acionáveis para o usuário
 */
export class ErrorMessageFormatter {
  /**
   * Formata mensagens de erro para duplicatas
   * @param duplicates - Duplicatas enriquecidas
   * @returns Array de mensagens formatadas
   */
  public format(duplicates: EnrichedDuplicateInfo[]): string[] {
    const messages: string[] = [];

    // Header
    messages.push('');
    messages.push(`❌ Detectadas ${duplicates.length} duplicatas de ID interno:`);
    messages.push('');

    // Formata cada duplicata
    for (const duplicate of duplicates) {
      messages.push(this.formatSingle(duplicate));
    }

    // Footer com instrução
    messages.push('💡 Corrija os IDs duplicados no n8n e execute o download novamente.');
    messages.push('');

    return messages;
  }

  /**
   * Formata mensagem para uma única duplicata
   * @param duplicate - Info da duplicata
   * @returns Mensagem formatada
   */
  public formatSingle(duplicate: EnrichedDuplicateInfo): string {
    const { internalID, n8nIDs, suggestions } = duplicate;

    let message = `📍 ID interno: ${internalID}\n`;
    message += `   Encontrado em ${n8nIDs.length} workflows:\n`;

    n8nIDs.forEach((n8nID, index) => {
      message += `   ${index + 1}. Workflow n8n ID: ${n8nID}\n`;

      // Adiciona sugestão (exceto para o primeiro, que mantém o ID original)
      if (index > 0 && suggestions[index - 1]) {
        message += `      → Sugestão: Alterar para ${suggestions[index - 1]}\n`;
      }
    });

    return message;
  }

  /**
   * Formata mensagem compacta (uma linha por duplicata)
   * @param duplicates - Duplicatas enriquecidas
   * @returns Array de mensagens compactas
   */
  public formatCompact(duplicates: EnrichedDuplicateInfo[]): string[] {
    return duplicates.map((dup) => {
      const suggestion = dup.suggestions[0] || 'N/A';
      return `Encontrado ID ${dup.internalID} em ${dup.count} workflows. Sugestão: ${suggestion}`;
    });
  }

  /**
   * Formata mensagem de sucesso (sem duplicatas)
   * @param totalWorkflows - Total de workflows validados
   * @returns Mensagem de sucesso
   */
  public formatSuccess(totalWorkflows: number): string[] {
    return [
      '',
      '✅ Download concluído com sucesso',
      `📊 Total de workflows: ${totalWorkflows}`,
      '✔️  Nenhuma duplicata detectada',
      '💾 Workflows salvos em: .jana/workflows/',
      '',
    ];
  }

  /**
   * Formata header de log para arquivo
   * @param duplicatesCount - Número de duplicatas
   * @param totalWorkflows - Total de workflows
   * @returns Header formatado
   */
  public formatLogHeader(duplicatesCount: number, totalWorkflows: number): string {
    return [
      '═'.repeat(60),
      `Validação de Workflows - ${new Date().toISOString()}`,
      '═'.repeat(60),
      `Total de workflows: ${totalWorkflows}`,
      `Duplicatas encontradas: ${duplicatesCount}`,
      '═'.repeat(60),
      '',
    ].join('\n');
  }
}
