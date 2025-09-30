/**
 * Quality Verifier - UltraThink Agent
 * Verifies and validates the quality of generated documentation
 */

class QualityVerifier {
  constructor(logger) {
    this.logger = logger;
    this.issues = [];
    this.warnings = [];
    this.suggestions = [];
  }

  /**
   * Verify documentation quality (UltraThink analysis)
   * @param {Array} workflows - Processed workflows
   * @param {string} markdown - Generated markdown
   * @returns {object} Verification report
   */
  verify(workflows, markdown) {
    this.logger.section('🧠 UltraThink: Iniciando verificação de qualidade...\n');

    this.issues = [];
    this.warnings = [];
    this.suggestions = [];

    // Run all verification checks
    this.checkCompleteness(workflows);
    this.checkDescriptionQuality(workflows);
    this.checkMarkdownStructure(markdown);
    this.checkConsistency(workflows);
    this.checkAccessibility(workflows);

    const report = this.generateReport();
    this.printReport(report);

    return report;
  }

  /**
   * Check if all workflows have descriptions
   * @param {Array} workflows - Workflows
   */
  checkCompleteness(workflows) {
    this.logger.debug('🔍 Verificando completude...');

    const withoutDescription = workflows.filter(w => !w.hasDescription);

    if (withoutDescription.length > 0) {
      const percentage = Math.round((withoutDescription.length / workflows.length) * 100);

      if (percentage > 50) {
        this.issues.push({
          type: 'completeness',
          severity: 'high',
          message: `${withoutDescription.length} workflows (${percentage}%) sem descrição`,
          affected: withoutDescription.map(w => w.name),
        });
      } else if (percentage > 20) {
        this.warnings.push({
          type: 'completeness',
          severity: 'medium',
          message: `${withoutDescription.length} workflows (${percentage}%) sem descrição`,
          affected: withoutDescription.map(w => w.name),
        });
      } else {
        this.suggestions.push({
          type: 'completeness',
          message: `Considere adicionar descrições para ${withoutDescription.length} workflows`,
          affected: withoutDescription.map(w => w.name),
        });
      }
    }
  }

  /**
   * Check description quality
   * @param {Array} workflows - Workflows
   */
  checkDescriptionQuality(workflows) {
    this.logger.debug('🔍 Verificando qualidade das descrições...');

    workflows.forEach(workflow => {
      if (!workflow.firstStickyNote) return;

      const content = workflow.firstStickyNote;
      const wordCount = content.split(/\s+/).length;

      // Too short
      if (wordCount < 5) {
        this.warnings.push({
          type: 'description_quality',
          severity: 'low',
          message: `Descrição muito curta em "${workflow.name}" (${wordCount} palavras)`,
          workflow: workflow.name,
        });
      }

      // Check for placeholder text
      const placeholders = ['lorem ipsum', 'todo', 'tbd', 'fixme', 'xxx'];
      const lowerContent = content.toLowerCase();

      placeholders.forEach(placeholder => {
        if (lowerContent.includes(placeholder)) {
          this.warnings.push({
            type: 'description_quality',
            severity: 'medium',
            message: `Texto placeholder encontrado em "${workflow.name}": "${placeholder}"`,
            workflow: workflow.name,
          });
        }
      });
    });
  }

  /**
   * Check markdown structure and formatting
   * @param {string} markdown - Markdown content
   */
  checkMarkdownStructure(markdown) {
    this.logger.debug('🔍 Verificando estrutura do markdown...');

    const lines = markdown.split('\n');

    // Check for proper headers
    const headerPattern = /^#{1,6}\s+.+/;
    const headers = lines.filter(line => headerPattern.test(line));

    if (headers.length < 3) {
      this.warnings.push({
        type: 'markdown_structure',
        severity: 'low',
        message: 'Poucas seções (headers) no documento',
      });
    }

    // Check for broken links
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    const links = markdown.match(linkPattern);

    if (links) {
      links.forEach(link => {
        if (link.includes('](http') && !link.includes('](https')) {
          this.suggestions.push({
            type: 'markdown_structure',
            message: 'Considere usar HTTPS em vez de HTTP para links externos',
          });
        }
      });
    }

    // Check line length (readability)
    const longLines = lines.filter(line =>
      !line.startsWith('#') &&
      !line.startsWith('```') &&
      line.length > 120
    );

    if (longLines.length > 10) {
      this.suggestions.push({
        type: 'markdown_structure',
        message: `${longLines.length} linhas muito longas (>120 caracteres) - dificulta leitura`,
      });
    }
  }

  /**
   * Check consistency across workflows
   * @param {Array} workflows - Workflows
   */
  checkConsistency(workflows) {
    this.logger.debug('🔍 Verificando consistência...');

    // Check naming conventions
    const namingPatterns = {
      brackets: /^\[.+\]/,
      parentheses: /^\(.+\)/,
    };

    const withBrackets = workflows.filter(w => namingPatterns.brackets.test(w.name)).length;
    const withParentheses = workflows.filter(w => namingPatterns.parentheses.test(w.name)).length;
    const total = workflows.length;

    if (withBrackets > 0 && withBrackets < total * 0.8) {
      this.suggestions.push({
        type: 'consistency',
        message: `Inconsistência na nomenclatura: ${withBrackets}/${total} workflows usam colchetes [...]`,
      });
    }

    if (withParentheses > 0 && withParentheses < total * 0.8) {
      this.suggestions.push({
        type: 'consistency',
        message: `Inconsistência na nomenclatura: ${withParentheses}/${total} workflows usam parênteses (...)`,
      });
    }
  }

  /**
   * Check accessibility and readability
   * @param {Array} workflows - Workflows
   */
  checkAccessibility(workflows) {
    this.logger.debug('🔍 Verificando acessibilidade...');

    // Check for descriptive names
    const shortNames = workflows.filter(w => w.name.length < 10);

    if (shortNames.length > workflows.length * 0.3) {
      this.suggestions.push({
        type: 'accessibility',
        message: `${shortNames.length} workflows têm nomes muito curtos - considere nomes mais descritivos`,
      });
    }

    // Check tag usage
    const withoutTags = workflows.filter(w => !w.tags || w.tags.length === 0);

    if (withoutTags.length > 0) {
      this.suggestions.push({
        type: 'accessibility',
        message: `${withoutTags.length} workflows sem tags - dificulta organização e busca`,
      });
    }
  }

  /**
   * Generate verification report
   * @returns {object} Report
   */
  generateReport() {
    const totalIssues = this.issues.length + this.warnings.length;
    const score = this.calculateQualityScore();

    return {
      score,
      grade: this.getGrade(score),
      issues: this.issues,
      warnings: this.warnings,
      suggestions: this.suggestions,
      summary: {
        criticalIssues: this.issues.length,
        warnings: this.warnings.length,
        suggestions: this.suggestions.length,
        total: totalIssues + this.suggestions.length,
      },
    };
  }

  /**
   * Calculate quality score (0-100)
   * @returns {number} Score
   */
  calculateQualityScore() {
    let score = 100;

    // Deduct points for issues
    this.issues.forEach(issue => {
      if (issue.severity === 'high') score -= 15;
      else if (issue.severity === 'medium') score -= 10;
      else score -= 5;
    });

    // Deduct points for warnings
    this.warnings.forEach(warning => {
      if (warning.severity === 'medium') score -= 5;
      else score -= 2;
    });

    // Slight deduction for suggestions
    score -= Math.min(this.suggestions.length * 0.5, 10);

    return Math.max(0, Math.round(score));
  }

  /**
   * Get quality grade
   * @param {number} score - Quality score
   * @returns {string} Grade
   */
  getGrade(score) {
    if (score >= 90) return 'A - Excelente';
    if (score >= 80) return 'B - Bom';
    if (score >= 70) return 'C - Satisfatório';
    if (score >= 60) return 'D - Regular';
    return 'F - Precisa melhorias';
  }

  /**
   * Print verification report
   * @param {object} report - Report
   */
  printReport(report) {
    this.logger.header('🧠 UltraThink - Relatório de Qualidade');

    this.logger.info(`\n📊 Pontuação: ${report.score}/100 - ${report.grade}\n`);

    if (report.issues.length > 0) {
      this.logger.error(`🔴 Problemas Críticos: ${report.issues.length}`);
      report.issues.forEach(issue => {
        this.logger.error(`   - ${issue.message}`);
      });
      console.log('');
    }

    if (report.warnings.length > 0) {
      this.logger.warn(`🟡 Avisos: ${report.warnings.length}`);
      report.warnings.slice(0, 5).forEach(warning => {
        this.logger.warn(`   - ${warning.message}`);
      });
      if (report.warnings.length > 5) {
        this.logger.warn(`   ... e mais ${report.warnings.length - 5} avisos`);
      }
      console.log('');
    }

    if (report.suggestions.length > 0) {
      this.logger.info(`💡 Sugestões: ${report.suggestions.length}`);
      report.suggestions.slice(0, 5).forEach(suggestion => {
        this.logger.info(`   - ${suggestion.message}`);
      });
      if (report.suggestions.length > 5) {
        this.logger.info(`   ... e mais ${report.suggestions.length - 5} sugestões`);
      }
      console.log('');
    }

    if (report.score === 100) {
      this.logger.success('🎉 Documentação perfeita! Nenhum problema encontrado.\n');
    }

    this.logger.info('='.repeat(50) + '\n');
  }
}

module.exports = QualityVerifier;