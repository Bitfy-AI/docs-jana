#!/usr/bin/env node

/**
 * N8N Workflow Migration Tool
 * Faz upload de workflows n8n preservando dependências e referências
 *
 * Uso:
 *   node upload-n8n-workflows.js <caminho-dos-workflows>
 *   node upload-n8n-workflows.js <caminho-dos-workflows> --dry-run
 *   node upload-n8n-workflows.js <caminho-dos-workflows> --tag=jana
 *
 * Fases da migração:
 *   1. Inicialização - Carregar configs e autenticar
 *   2. Análise de dependências - Construir grafo e ordenação topológica
 *   3. Upload sequencial - Criar workflows na ordem correta
 *   4. Atualização de referências - Atualizar IDs dos workflows
 *   5. Verificação - Validar integridade (ZERO elos perdidos)
 */

const path = require('path');
const fs = require('fs');

// Importa utilitários
const EnvLoader = require('./src/utils/env-loader');
const Logger = require('./src/utils/logger');
const HttpClient = require('./src/utils/http-client');
const WorkflowLoader = require('./src/utils/workflow-loader');
const IdMapper = require('./src/utils/id-mapper');

// Importa serviços
const AuthFactory = require('./src/auth/auth-factory');
const WorkflowService = require('./src/services/workflow-service');
const DependencyAnalyzer = require('./src/services/dependency-analyzer');
const WorkflowUploadService = require('./src/services/workflow-upload-service');
const ReferenceUpdater = require('./src/services/reference-updater');
const MigrationVerifier = require('./src/services/migration-verifier');

/**
 * Configuração do script
 */
class MigrationConfig {
  constructor() {
    this.sourcePath = null;
    this.dryRun = false;
    this.skipExisting = true;
    this.activateWorkflows = false;
    this.verify = true;
    this.tag = null;
    this.logLevel = 'info';
    this.saveReport = true;
  }

  static fromArgs(args) {
    const config = new MigrationConfig();

    // Parse argumentos
    for (let i = 2; i < args.length; i++) {
      const arg = args[i];

      if (arg.startsWith('--')) {
        const [key, value] = arg.substring(2).split('=');

        switch (key) {
          case 'dry-run':
            config.dryRun = true;
            break;
          case 'skip-existing':
            config.skipExisting = value !== 'false';
            break;
          case 'activate':
            config.activateWorkflows = true;
            break;
          case 'no-verify':
            config.verify = false;
            break;
          case 'tag':
            config.tag = value;
            break;
          case 'log-level':
            config.logLevel = value;
            break;
          case 'no-report':
            config.saveReport = false;
            break;
          default:
            console.warn(`Opção desconhecida: --${key}`);
        }
      } else if (!config.sourcePath) {
        config.sourcePath = arg;
      }
    }

    return config;
  }

  validate() {
    const errors = [];

    if (!this.sourcePath) {
      errors.push('Caminho dos workflows não especificado');
    } else if (!fs.existsSync(this.sourcePath)) {
      errors.push(`Caminho não encontrado: ${this.sourcePath}`);
    }

    return errors;
  }
}

/**
 * Classe principal de migração
 */
class WorkflowMigration {
  constructor(config) {
    this.config = config;
    this.logger = new Logger({ logLevel: config.logLevel });
    this.startTime = Date.now();
  }

  /**
   * Executa migração completa
   */
  async run() {
    try {
      this.logger.header('N8N WORKFLOW MIGRATION TOOL');
      this.logConfiguration();

      // FASE 1: Inicialização
      await this.phase1_initialization();

      // FASE 2: Análise de dependências
      const { orderedWorkflows, graph } = await this.phase2_dependencyAnalysis();

      // FASE 3: Upload sequencial
      const uploadResult = await this.phase3_sequentialUpload(orderedWorkflows);

      // FASE 4: Atualização de referências
      await this.phase4_referenceUpdate(orderedWorkflows);

      // FASE 5: Verificação
      if (this.config.verify && !this.config.dryRun) {
        await this.phase5_verification();
      }

      // Salva relatório
      if (this.config.saveReport) {
        await this.saveReport(uploadResult, graph);
      }

      // Resumo final
      this.showFinalSummary();

      process.exit(0);
    } catch (error) {
      this.logger.error(`Erro durante migração: ${error.message}`);
      console.error(error);
      process.exit(1);
    }
  }

  /**
   * FASE 1: Inicialização
   */
  async phase1_initialization() {
    this.logger.header('FASE 1: INICIALIZAÇÃO');

    // Carrega .env
    this.logger.info('Carregando configurações...');
    EnvLoader.load();

    // Valida credenciais
    const credentials = {
      apiKey: process.env.N8N_API_KEY,
      username: process.env.N8N_USERNAME,
      password: process.env.N8N_PASSWORD
    };

    if (!AuthFactory.validate(credentials)) {
      throw new Error(
        'Credenciais inválidas. Configure N8N_API_KEY ou N8N_USERNAME + N8N_PASSWORD no .env'
      );
    }

    // Cria instâncias
    this.authStrategy = AuthFactory.create(credentials);
    this.httpClient = new HttpClient(process.env.N8N_URL);
    this.workflowService = new WorkflowService(
      this.httpClient,
      this.authStrategy,
      this.logger
    );

    this.logger.success('Autenticação configurada');
    this.logger.info(`URL: ${process.env.N8N_URL}`);
    this.logger.info(`Método: ${this.authStrategy.constructor.name}`);

    // Carrega workflows
    this.logger.info('\nCarregando workflows do sistema de arquivos...');
    const loader = new WorkflowLoader(this.logger);
    let workflows = await loader.load(this.config.sourcePath);

    // Aplica filtros
    if (this.config.tag) {
      workflows = loader.filterWorkflows(workflows, { tag: this.config.tag });
    }

    if (workflows.length === 0) {
      throw new Error('Nenhum workflow encontrado para migrar');
    }

    this.workflows = workflows;

    // Estatísticas
    const stats = loader.getStatistics(workflows);
    this.logger.success(`${workflows.length} workflows carregados`);
    this.logger.info(`Ativos: ${stats.active} | Inativos: ${stats.inactive}`);
    this.logger.info(`Tags: ${stats.tags.join(', ')}`);
  }

  /**
   * FASE 2: Análise de dependências
   */
  async phase2_dependencyAnalysis() {
    this.logger.header('FASE 2: ANÁLISE DE DEPENDÊNCIAS');

    const analyzer = new DependencyAnalyzer(this.logger);
    const result = analyzer.analyze(this.workflows);

    // Pré-validação: Verificar se todas as referências existem
    this.logger.info('Verificando integridade das referências...');
    const preValidation = this.preValidateReferences(result);

    if (!preValidation.passed) {
      this.logger.error('PRÉ-VALIDAÇÃO FALHOU: Referências quebradas detectadas!');
      preValidation.issues.forEach(issue => {
        this.logger.error(`  ❌ ${issue}`);
      });

      if (!this.config.dryRun && !this.config.forceUpload) {
        throw new Error('Pré-validação falhou. Use --force para ignorar.');
      }
    } else {
      this.logger.success('Todas as referências são válidas ✓');
    }

    if (!result.hasValidOrder) {
      this.logger.error('AVISO: Detectado ciclo de dependências!');
      this.logger.warn('Os workflows serão criados, mas referências podem estar incorretas.');

      if (!this.config.dryRun) {
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });

        const answer = await new Promise(resolve => {
          readline.question('Deseja continuar? (s/N): ', resolve);
        });

        readline.close();

        if (answer.toLowerCase() !== 's') {
          throw new Error('Operação cancelada pelo usuário');
        }
      }
    }

    // Workflows ordenados
    const orderedWorkflows = analyzer.getOrderedWorkflows(result.order);

    this.logger.success(`Ordem de upload calculada: ${orderedWorkflows.length} workflows`);

    return { orderedWorkflows, graph: result.graph };
  }

  /**
   * FASE 3: Upload sequencial
   */
  async phase3_sequentialUpload(orderedWorkflows) {
    this.logger.header('FASE 3: UPLOAD SEQUENCIAL');

    const idMapper = new IdMapper(this.logger);
    const uploadService = new WorkflowUploadService(
      this.workflowService,
      idMapper,
      this.logger
    );

    const result = await uploadService.uploadBatch(orderedWorkflows, {
      dryRun: this.config.dryRun,
      skipExisting: this.config.skipExisting,
      activateWorkflows: this.config.activateWorkflows,
      delayBetweenUploads: 500
    });

    this.idMapper = idMapper;
    this.uploadService = uploadService;

    return result;
  }

  /**
   * FASE 4: Atualização de referências
   */
  async phase4_referenceUpdate(orderedWorkflows) {
    this.logger.header('FASE 4: ATUALIZAÇÃO DE REFERÊNCIAS');

    if (this.config.dryRun) {
      this.logger.info('Modo dry-run: pulando atualização real de referências');
      return;
    }

    const referenceUpdater = new ReferenceUpdater(this.idMapper, this.logger);

    // Atualiza referências em todos os workflows
    const updatedWorkflows = referenceUpdater.updateBatch(orderedWorkflows);

    // Faz update na API
    await this.uploadService.updateBatch(updatedWorkflows);

    this.logger.success('Referências atualizadas com sucesso');
  }

  /**
   * FASE 5: Verificação
   */
  async phase5_verification() {
    this.logger.header('FASE 5: VERIFICAÇÃO DE INTEGRIDADE');

    const verifier = new MigrationVerifier(
      this.workflowService,
      this.idMapper,
      this.logger
    );

    const result = await verifier.verify(this.workflows);

    if (!result.passed) {
      this.logger.error('Verificação FALHOU! Existem problemas na migração.');
      throw new Error('Falha na verificação de integridade');
    }

    this.logger.success('Verificação PASSOU! Migração concluída com sucesso.');
  }

  /**
   * Salva relatório da migração
   */
  async saveReport(uploadResult, graph) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportPath = path.join(
        process.cwd(),
        `migration-report-${timestamp}.json`
      );

      const report = {
        timestamp: new Date().toISOString(),
        config: this.config,
        duration: this.getDuration(),
        upload: uploadResult,
        mappings: this.idMapper.toJSON(),
        graph: graph.toJSON()
      };

      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

      this.logger.success(`Relatório salvo: ${reportPath}`);
    } catch (error) {
      this.logger.warn(`Erro ao salvar relatório: ${error.message}`);
    }
  }

  /**
   * Exibe configuração
   */
  logConfiguration() {
    console.log('Configuração:');
    console.log(`  Origem: ${this.config.sourcePath}`);
    console.log(`  Modo: ${this.config.dryRun ? 'DRY RUN (simulação)' : 'REAL'}`);
    console.log(`  Pular existentes: ${this.config.skipExisting ? 'Sim' : 'Não'}`);
    console.log(`  Ativar workflows: ${this.config.activateWorkflows ? 'Sim' : 'Não'}`);
    console.log(`  Verificar: ${this.config.verify ? 'Sim' : 'Não'}`);
    if (this.config.tag) {
      console.log(`  Filtrar por tag: ${this.config.tag}`);
    }
    console.log('');
  }

  /**
   * Resumo final
   */
  showFinalSummary() {
    this.logger.header('RESUMO FINAL');

    const duration = this.getDuration();

    console.log(`Duração total: ${duration}`);
    console.log(`Workflows processados: ${this.workflows.length}`);

    if (this.config.dryRun) {
      console.log('\nModo DRY RUN: nenhuma alteração foi feita no servidor.');
      console.log('Execute sem --dry-run para realizar a migração real.');
    } else {
      console.log('\nMigração concluída com sucesso!');
    }

    console.log('');
  }

  /**
   * Retorna duração formatada
   */
  getDuration() {
    const elapsed = Date.now() - this.startTime;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  }

  /**
   * Pré-valida referências antes do upload
   * Verifica se todos os workflows referenciados existem na lista
   */
  preValidateReferences(analysisResult) {
    const issues = [];
    const workflowNames = new Set(this.workflows.map(w => w.name));

    // Verificar cada dependência
    for (const [workflowId, deps] of analysisResult.graph.dependencies.entries()) {
      const workflow = analysisResult.graph.getWorkflow(workflowId);

      for (const depName of deps) {
        if (!workflowNames.has(depName)) {
          issues.push(
            `Workflow "${workflow.name}" referencia "${depName}" que não existe na lista`
          );
        }
      }
    }

    return {
      passed: issues.length === 0,
      issues
    };
  }
}

/**
 * Função principal
 */
async function main() {
  // Parse configuração
  const config = MigrationConfig.fromArgs(process.argv);

  // Valida configuração
  const errors = config.validate();
  if (errors.length > 0) {
    console.error('Erro na configuração:');
    errors.forEach(error => console.error(`  - ${error}`));
    console.error('\nUso:');
    console.error('  node upload-n8n-workflows.js <caminho-dos-workflows> [opções]');
    console.error('\nOpções:');
    console.error('  --dry-run              Simula migração sem fazer alterações');
    console.error('  --skip-existing=false  Não pula workflows existentes');
    console.error('  --activate             Ativa workflows após criação');
    console.error('  --no-verify            Pula verificação de integridade');
    console.error('  --tag=<tag>            Filtra workflows por tag');
    console.error('  --log-level=<level>    Nível de log (debug, info, warn, error)');
    console.error('  --no-report            Não salva relatório JSON');
    console.error('\nExemplos:');
    console.error('  node upload-n8n-workflows.js ./workflows --dry-run');
    console.error('  node upload-n8n-workflows.js ./workflows --tag=jana');
    console.error('  node upload-n8n-workflows.js ./workflows --activate');
    process.exit(1);
  }

  // Executa migração
  const migration = new WorkflowMigration(config);
  await migration.run();
}

// Executa
if (require.main === module) {
  main().catch(error => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });
}

module.exports = { WorkflowMigration, MigrationConfig };
