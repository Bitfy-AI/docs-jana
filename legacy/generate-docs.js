#!/usr/bin/env node

/**
 * N8N Workflow Documentation Generator
 * Generates markdown documentation from workflow sticky notes
 *
 * Architecture:
 * - 3 parallel workers processing workflows
 * - Sticky note extraction
 * - Markdown generation
 * - UltraThink quality verification
 */

const fs = require('fs');
const path = require('path');

const Logger = require('./src/utils/logger');
const FileManager = require('./src/utils/file-manager');
const StickyNoteExtractor = require('./src/services/sticky-note-extractor');
const WorkerPool = require('./src/services/worker-pool');
const MarkdownGenerator = require('./src/services/markdown-generator');
const QualityVerifier = require('./src/services/quality-verifier');

/**
 * Documentation Generator Application
 */
class DocGeneratorApp {
  constructor() {
    this.logger = new Logger({ logLevel: 'info' });
    this.fileManager = new FileManager(this.logger);
    this.extractor = new StickyNoteExtractor(this.logger);
    this.workerPool = new WorkerPool(3, this.logger); // 3 parallel workers
    this.markdownGenerator = new MarkdownGenerator(this.logger);
    this.qualityVerifier = new QualityVerifier(this.logger);

    this.workflowDir = null;
    this.outputDir = path.join(process.cwd(), 'docs');
  }

  /**
   * Find most recent workflow backup directory
   * @returns {string|null} Directory path
   */
  findWorkflowDirectory() {
    const cwd = process.cwd();
    const entries = fs.readdirSync(cwd);

    const workflowDirs = entries
      .filter(entry => entry.startsWith('n8n-workflows-'))
      .filter(entry => {
        const fullPath = path.join(cwd, entry);
        return fs.statSync(fullPath).isDirectory();
      })
      .sort()
      .reverse(); // Most recent first

    if (workflowDirs.length === 0) {
      return null;
    }

    return path.join(cwd, workflowDirs[0]);
  }

  /**
   * Load workflow JSON files
   * @param {string} directory - Directory path
   * @returns {Array} Array of workflows
   */
  loadWorkflows(directory) {
    const files = fs.readdirSync(directory);
    const workflowFiles = files.filter(file =>
      file.endsWith('.json') && !file.startsWith('_')
    );

    this.logger.info(`📦 Encontrados ${workflowFiles.length} workflows\n`);

    const workflows = [];

    for (const file of workflowFiles) {
      try {
        const filePath = path.join(directory, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const workflow = JSON.parse(content);
        workflows.push({ ...workflow, _filename: file });
      } catch (error) {
        this.logger.error(`Erro ao carregar ${file}: ${error.message}`);
      }
    }

    return workflows;
  }

  /**
   * Process single workflow (used by worker pool)
   * @param {object} workflow - Workflow data
   * @param {number} workerId - Worker ID
   * @returns {object} Processed workflow
   */
  async processWorkflow(workflow, workerId) {
    // Simulate some processing time to show parallel execution
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));

    return this.extractor.processWorkflow(workflow);
  }

  /**
   * Run the documentation generation
   */
  async run() {
    try {
      this.logger.header('📚 N8N Workflow Documentation Generator');
      this.logger.info('🚀 Iniciando geração de documentação...\n');

      // Step 1: Find workflow directory
      this.logger.section('Localizando workflows...');
      this.workflowDir = this.findWorkflowDirectory();

      if (!this.workflowDir) {
        this.logger.error('❌ Nenhum diretório de workflows encontrado');
        this.logger.info('💡 Execute primeiro: node download-n8n-workflows.js');
        process.exit(1);
      }

      this.logger.success(`Diretório: ${path.basename(this.workflowDir)}\n`);

      // Step 2: Load workflows
      this.logger.section('Carregando workflows...');
      const workflows = this.loadWorkflows(this.workflowDir);

      if (workflows.length === 0) {
        this.logger.error('❌ Nenhum workflow encontrado');
        process.exit(1);
      }

      // Step 3: Process workflows in parallel with 3 workers
      this.logger.section('Processando workflows com 3 workers paralelos...');
      const processedWorkflows = await this.workerPool.process(
        workflows,
        (workflow, workerId) => this.processWorkflow(workflow, workerId)
      );

      // Step 4: Generate markdown
      this.logger.section('\nGerando documentação markdown...');
      const markdown = this.markdownGenerator.generate(processedWorkflows, {
        title: 'N8N Workflows - Documentação Jana',
        includeMetadata: true,
        includeStats: true,
        groupByTag: false,
      });

      this.logger.success('Markdown gerado com sucesso\n');

      // Step 5: Quality verification (UltraThink)
      const qualityReport = this.qualityVerifier.verify(processedWorkflows, markdown);

      // Step 6: Save documentation
      this.logger.section('Salvando documentação...');

      // Create docs directory
      if (!fs.existsSync(this.outputDir)) {
        fs.mkdirSync(this.outputDir, { recursive: true });
        this.logger.folder(this.outputDir);
      }

      // Save main documentation
      const docPath = path.join(this.outputDir, 'workflows.md');
      fs.writeFileSync(docPath, markdown, 'utf8');
      this.logger.success(`Documentação salva: ${docPath}`);

      // Save quality report
      const reportPath = path.join(this.outputDir, 'quality-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(qualityReport, null, 2), 'utf8');
      this.logger.success(`Relatório de qualidade: ${reportPath}\n`);

      // Final summary
      this.printSummary(processedWorkflows, docPath, qualityReport);

      // Exit code based on quality
      const exitCode = qualityReport.score >= 70 ? 0 : 1;
      process.exit(exitCode);

    } catch (error) {
      this.logger.error(`\n❌ Erro fatal: ${error.message}`);
      console.error(error.stack);
      process.exit(1);
    }
  }

  /**
   * Print final summary
   * @param {Array} workflows - Processed workflows
   * @param {string} docPath - Documentation path
   * @param {object} qualityReport - Quality report
   */
  printSummary(workflows, docPath, qualityReport) {
    const fileSize = fs.statSync(docPath).size;

    this.logger.header('📊 RESUMO FINAL');

    this.logger.summary({
      '📝 Workflows processados': workflows.length,
      '✅ Com descrição': workflows.filter(w => w.hasDescription).length,
      '⚠️ Sem descrição': workflows.filter(w => !w.hasDescription).length,
      '📄 Arquivo gerado': path.basename(docPath),
      '💾 Tamanho': this.fileManager.formatBytes(fileSize),
      '🎯 Qualidade': `${qualityReport.score}/100 - ${qualityReport.grade}`,
    });

    if (qualityReport.score >= 90) {
      this.logger.success('🎉 Excelente! Documentação de alta qualidade.');
    } else if (qualityReport.score >= 70) {
      this.logger.warn('⚠️ Boa documentação, mas há espaço para melhorias.');
    } else {
      this.logger.error('❌ Documentação precisa de melhorias significativas.');
    }

    console.log('');
  }
}

/**
 * Application entry point
 */
async function main() {
  const app = new DocGeneratorApp();
  await app.run();
}

// Run the application
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Erro não tratado:', error);
    process.exit(1);
  });
}

module.exports = DocGeneratorApp;