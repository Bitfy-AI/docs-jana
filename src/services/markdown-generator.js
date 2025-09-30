/**
 * Markdown Generator Service
 * Generates markdown documentation from workflow data
 */

class MarkdownGenerator {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Generate markdown documentation from processed workflows
   * @param {Array} workflows - Array of processed workflow data
   * @param {object} options - Generation options
   * @returns {string} Markdown content
   */
  generate(workflows, options = {}) {
    const {
      title = 'N8N Workflows - Documentação',
      includeMetadata = true,
      includeStats = true,
      groupByTag = false,
    } = options;

    let markdown = '';

    // Header
    markdown += this.generateHeader(title);
    markdown += '\n\n';

    // Statistics
    if (includeStats) {
      markdown += this.generateStatistics(workflows);
      markdown += '\n\n';
    }

    // Workflows
    if (groupByTag) {
      markdown += this.generateGroupedByTag(workflows, includeMetadata);
    } else {
      markdown += this.generateWorkflowList(workflows, includeMetadata);
    }

    // Footer
    markdown += this.generateFooter();

    return markdown;
  }

  /**
   * Generate header section
   * @param {string} title - Document title
   * @returns {string} Markdown header
   */
  generateHeader(title) {
    const date = new Date().toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return `# ${title}

> 📅 Gerado em: ${date}
> 🤖 Gerado automaticamente pelo N8N Workflow Backup Tool`;
  }

  /**
   * Generate statistics section
   * @param {Array} workflows - Workflows array
   * @returns {string} Markdown statistics
   */
  generateStatistics(workflows) {
    const total = workflows.length;
    const withDescription = workflows.filter(w => w.hasDescription).length;
    const withoutDescription = total - withDescription;
    const active = workflows.filter(w => w.active).length;
    const inactive = total - active;

    const allTags = new Set();
    workflows.forEach(w => {
      if (w.tags && Array.isArray(w.tags)) {
        w.tags.forEach(tag => {
          const tagName = typeof tag === 'string' ? tag : tag.name;
          if (tagName) allTags.add(tagName);
        });
      }
    });

    return `## 📊 Estatísticas

| Métrica | Valor |
|---------|-------|
| Total de Workflows | ${total} |
| Com Descrição | ${withDescription} (${this.percentage(withDescription, total)}%) |
| Sem Descrição | ${withoutDescription} (${this.percentage(withoutDescription, total)}%) |
| Ativos | ${active} (${this.percentage(active, total)}%) |
| Inativos | ${inactive} (${this.percentage(inactive, total)}%) |
| Tags Únicas | ${allTags.size} |`;
  }

  /**
   * Generate workflow list
   * @param {Array} workflows - Workflows array
   * @param {boolean} includeMetadata - Include metadata
   * @returns {string} Markdown list
   */
  generateWorkflowList(workflows, includeMetadata) {
    let markdown = '## 📝 Workflows\n\n';

    // Sort by name
    const sorted = [...workflows].sort((a, b) => a.name.localeCompare(b.name));

    sorted.forEach((workflow, index) => {
      markdown += this.generateWorkflowEntry(workflow, index + 1, includeMetadata);
      markdown += '\n---\n\n';
    });

    return markdown;
  }

  /**
   * Generate single workflow entry
   * @param {object} workflow - Workflow data
   * @param {number} index - Index number
   * @param {boolean} includeMetadata - Include metadata
   * @returns {string} Markdown entry
   */
  generateWorkflowEntry(workflow, index, includeMetadata) {
    let markdown = `### ${index}. ${workflow.name}\n\n`;

    // Status badge
    const statusBadge = workflow.active ? '🟢 Ativo' : '🔴 Inativo';
    markdown += `**Status:** ${statusBadge}\n\n`;

    // Tags
    if (workflow.tags && workflow.tags.length > 0) {
      const tagNames = workflow.tags.map(tag =>
        typeof tag === 'string' ? tag : tag.name
      ).filter(Boolean);

      if (tagNames.length > 0) {
        markdown += `**Tags:** ${tagNames.map(t => `\`${t}\``).join(', ')}\n\n`;
      }
    }

    // First sticky note (description)
    if (workflow.firstStickyNote) {
      markdown += '**Descrição:**\n\n';
      markdown += this.formatStickyNote(workflow.firstStickyNote);
      markdown += '\n\n';
    } else {
      markdown += '> ⚠️ *Sem descrição (sticky note não encontrado)*\n\n';
    }

    // Metadata
    if (includeMetadata) {
      markdown += '<details>\n';
      markdown += '<summary>📋 Metadados</summary>\n\n';
      markdown += '```json\n';
      markdown += JSON.stringify({
        id: workflow.id,
        nodeCount: workflow.nodeCount,
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt,
      }, null, 2);
      markdown += '\n```\n';
      markdown += '</details>\n\n';
    }

    return markdown;
  }

  /**
   * Format sticky note content
   * @param {string} content - Sticky note content
   * @returns {string} Formatted content
   */
  formatStickyNote(content) {
    // If content starts with markdown headers, keep as is
    if (content.trim().startsWith('#')) {
      return content;
    }

    // Otherwise, wrap in blockquote
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n\n');
  }

  /**
   * Generate workflows grouped by tag
   * @param {Array} workflows - Workflows array
   * @param {boolean} includeMetadata - Include metadata
   * @returns {string} Markdown
   */
  generateGroupedByTag(workflows, includeMetadata) {
    const grouped = {};

    workflows.forEach(workflow => {
      const tags = workflow.tags || [];
      const tagNames = tags.map(tag =>
        typeof tag === 'string' ? tag : tag.name
      ).filter(Boolean);

      if (tagNames.length === 0) {
        tagNames.push('Sem Tag');
      }

      tagNames.forEach(tag => {
        if (!grouped[tag]) {
          grouped[tag] = [];
        }
        grouped[tag].push(workflow);
      });
    });

    let markdown = '## 📝 Workflows por Tag\n\n';

    Object.keys(grouped).sort().forEach(tag => {
      markdown += `### 🏷️ ${tag}\n\n`;
      grouped[tag].forEach((workflow, index) => {
        markdown += this.generateWorkflowEntry(workflow, index + 1, includeMetadata);
        markdown += '\n';
      });
      markdown += '\n';
    });

    return markdown;
  }

  /**
   * Generate footer
   * @returns {string} Footer markdown
   */
  generateFooter() {
    return `\n---

*Documentação gerada automaticamente pelo N8N Workflow Backup Tool*`;
  }

  /**
   * Calculate percentage
   * @param {number} value - Value
   * @param {number} total - Total
   * @returns {number} Percentage
   */
  percentage(value, total) {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  }
}

module.exports = MarkdownGenerator;