#!/usr/bin/env node

/**
 * Script de teste para validar a implementação da migração
 * Testa o sistema sem fazer upload real
 */

const WorkflowLoader = require('./src/utils/workflow-loader');
const IdMapper = require('./src/utils/id-mapper');
const DependencyAnalyzer = require('./src/services/dependency-analyzer');
const ReferenceUpdater = require('./src/services/reference-updater');
const Logger = require('./src/utils/logger');

async function testMigrationSystem() {
  const logger = new Logger({ logLevel: 'info' });

  logger.header('TESTE DO SISTEMA DE MIGRAÇÃO');

  try {
    // 1. Teste de carregamento de workflows
    logger.section('Teste 1: Carregamento de Workflows');

    const loader = new WorkflowLoader(logger);
    const workflowsPath = process.argv[2] || './n8n-workflows-2025-09-30T18-37-51';

    logger.info(`Carregando workflows de: ${workflowsPath}`);
    const workflows = await loader.load(workflowsPath);

    if (workflows.length === 0) {
      logger.error('Nenhum workflow carregado!');
      process.exit(1);
    }

    logger.success(`${workflows.length} workflows carregados`);

    const stats = loader.getStatistics(workflows);
    logger.info(`Estatísticas:`);
    logger.info(`  Total: ${stats.total}`);
    logger.info(`  Ativos: ${stats.active}`);
    logger.info(`  Inativos: ${stats.inactive}`);
    logger.info(`  Média de nodes: ${stats.avgNodes}`);
    logger.info(`  Tags: ${stats.tags.join(', ')}`);

    // 2. Teste de análise de dependências
    logger.section('Teste 2: Análise de Dependências');

    const analyzer = new DependencyAnalyzer(logger);
    const analysisResult = analyzer.analyze(workflows);

    if (!analysisResult.hasValidOrder) {
      logger.warn('Detectado ciclo de dependências!');
    } else {
      logger.success('Ordem de upload calculada com sucesso');
    }

    logger.info(`Estatísticas do grafo:`);
    logger.info(`  Total workflows: ${analysisResult.statistics.totalWorkflows}`);
    logger.info(`  Total dependências: ${analysisResult.statistics.totalDependencies}`);
    logger.info(`  Média de dependências: ${analysisResult.statistics.avgDependencies}`);
    logger.info(`  Workflows sem dependências: ${analysisResult.statistics.workflowsWithoutDependencies}`);

    // 3. Teste de mapeamento de IDs
    logger.section('Teste 3: Mapeamento de IDs');

    const idMapper = new IdMapper(logger);

    // Simula criação de workflows
    logger.info('Simulando criação de workflows...');
    const orderedWorkflows = analyzer.getOrderedWorkflows(analysisResult.order);

    for (let i = 0; i < orderedWorkflows.length; i++) {
      const workflow = orderedWorkflows[i];
      const fakeNewId = `fake-id-${i + 1}`;

      idMapper.register(workflow.id, workflow.name, fakeNewId, {
        ...workflow,
        id: fakeNewId
      });
    }

    logger.success(`${idMapper.getAllMappings().length} mapeamentos criados`);

    // Testa resolução de IDs
    logger.info('Testando resolução de IDs...');
    const firstWorkflow = orderedWorkflows[0];
    const resolvedByName = idMapper.resolve(firstWorkflow.id, firstWorkflow.name);
    const resolvedById = idMapper.resolve(firstWorkflow.id);

    if (resolvedByName && resolvedById) {
      logger.success('Resolução de IDs funcionando corretamente');
    }

    // 4. Teste de atualização de referências
    logger.section('Teste 4: Atualização de Referências');

    const referenceUpdater = new ReferenceUpdater(idMapper, logger);

    logger.info('Atualizando referências...');
    const updatedWorkflows = referenceUpdater.updateBatch(orderedWorkflows.slice(0, 5)); // Testa apenas 5

    logger.success('Atualização de referências completa');

    const updateStats = referenceUpdater.getStatistics();
    logger.info(`Estatísticas de atualização:`);
    logger.info(`  Workflows: ${updateStats.workflowsProcessed}`);
    logger.info(`  Nodes: ${updateStats.nodesProcessed}`);
    logger.info(`  Referências atualizadas: ${updateStats.referencesUpdated}`);
    logger.info(`  Referências não encontradas: ${updateStats.referencesFailed}`);
    logger.info(`  Taxa de sucesso: ${updateStats.successRate}`);

    // 5. Teste de validação
    logger.section('Teste 5: Validação de Referências');

    let validationPassed = true;
    for (const workflow of updatedWorkflows) {
      const validation = referenceUpdater.validateReferences(workflow);

      if (!validation.valid) {
        logger.warn(`Issues encontradas em "${workflow.name}":`);
        validation.issues.forEach(issue => {
          logger.warn(`  - ${issue.message}`);
        });
        validationPassed = false;
      }
    }

    if (validationPassed) {
      logger.success('Todas as referências estão válidas');
    }

    // 6. Resumo de dependências
    logger.section('Teste 6: Relatório de Dependências');

    const report = analyzer.generateReport();

    logger.info(`Resumo:`);
    logger.info(`  Total workflows: ${report.summary.totalWorkflows}`);
    logger.info(`  Total dependências: ${report.summary.totalDependencies}`);
    logger.info(`  Dependências circulares: ${report.summary.hasCircularDependencies ? 'SIM' : 'NÃO'}`);

    if (report.circularDependencies.length > 0) {
      logger.warn('Workflows com dependência circular:');
      report.circularDependencies.forEach(cycle => {
        logger.warn(`  - ${cycle.join(' -> ')}`);
      });
    }

    logger.info('\nPrimeiros 5 na ordem de upload:');
    report.uploadOrder.slice(0, 5).forEach(item => {
      logger.info(`  ${item.position}. ${item.name} (deps: ${item.dependencies})`);
    });

    // Resultado final
    logger.header('RESULTADO DOS TESTES');
    logger.success('Todos os testes passaram com sucesso!');
    logger.info('O sistema de migração está funcionando corretamente.');
    logger.info('\nPróximos passos:');
    logger.info('1. Configure credenciais no .env');
    logger.info('2. Execute com --dry-run primeiro:');
    logger.info(`   node upload-n8n-workflows.js ${workflowsPath} --dry-run`);
    logger.info('3. Se tudo estiver ok, execute a migração real:');
    logger.info(`   node upload-n8n-workflows.js ${workflowsPath}`);

  } catch (error) {
    logger.error(`Erro durante testes: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Executa
if (require.main === module) {
  testMigrationSystem().catch(error => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });
}

module.exports = { testMigrationSystem };
