/**
 * N8N Compare Command
 * Compara workflows locais com workflows no N8N target
 */

const EnvLoader = require('../utils/env-loader');
EnvLoader.load();

const Logger = require('../utils/logger');
const { HttpClientFactory } = require('../core/factories');
const ConfigManager = require('../utils/config-manager');
const AuthFactory = require('../auth/auth-factory');
const WorkflowService = require('../services/workflow-service');
const fs = require('fs');
const path = require('path');

class N8nCompareCommand {
  /**
   * Execute the compare command
   * @param {string[]} args - Command-line arguments
   */
  static async execute(args) {
    const app = new N8nCompareApp();

    if (args.includes('--help') || args.includes('-h')) {
      app.printHelp();
      return;
    }

    await app.run();
  }
}

class N8nCompareApp {
  constructor() {
    this.configManager = new ConfigManager();
    this.config = null;
    this.logger = null;
    this.workflowService = null;
  }

  printHelp() {
    console.log(`
N8N Compare Command - Compara workflows locais com N8N target

USO:
  pnpm start (selecione opção 3)

  OU

  node cli.js n8n:compare

DESCRIÇÃO:
  Compara workflows da pasta local (n8n/workflows/) com workflows no N8N de destino.

  Mostra:
  - Workflows NOVOS (não existem no N8N)
  - Workflows MODIFICADOS (têm versão diferente)
  - Workflows IDÊNTICOS (sem mudanças)

EXEMPLO DE VERSÕES:
  (AAA-AAA-001) = versão 1
  (AAA-AAA-002) = versão 2

  Se local tem versão 002 e target tem 001, significa que o local está mais atualizado.

CONFIGURAÇÃO NECESSÁRIA:
  - TARGET_N8N_URL deve estar configurado no .env
  - TARGET_N8N_API_KEY deve estar configurado no .env

  Use a opção "Configurar N8N Destino" no menu para configurar.
`);
  }

  initialize() {
    try {
      this.config = this.configManager.load();
      this.config.baseUrl = this.config.n8nUrl;
    } catch (error) {
      console.error('[ERRO] Falha ao carregar configuração:', error.message);
      console.error('\nDica: Configure o N8N de destino primeiro (opção 1 no menu)');
      throw error;
    }

    const validation = this.configManager.validate();
    if (!validation.valid) {
      console.error('[ERRO] Configuração inválida:\n');
      validation.errors.forEach(error => console.error(`   - ${error}`));
      console.error('\nDica: Configure o N8N de destino primeiro (opção 1 no menu)\n');
      throw new Error('Invalid configuration');
    }

    this.logger = new Logger({
      logLevel: 'info',
      enableColors: true
    });

    const authStrategy = AuthFactory.create(this.config);
    const httpClient = HttpClientFactory.create({
      baseUrl: this.config.baseUrl,
      headers: authStrategy.getHeaders(),
      maxRetries: 3,
      timeout: 30000
    });

    this.workflowService = new WorkflowService(httpClient, authStrategy, this.logger);
  }

  /**
   * Extrai versão do ID do workflow
   * @param {string} workflowId - ID do workflow
   * @returns {string|null} Versão extraída
   */
  extractVersion(workflowId) {
    if (!workflowId || typeof workflowId !== 'string') {
      return null;
    }

    // Padrões de versão em parênteses: (AAA-AAA-001), (v1), (v2.0)
    const versionMatch = workflowId.match(/\(([^)]+)\)/);
    if (versionMatch) {
      return versionMatch[1];
    }

    // Padrões de versão sem parênteses: workflow-v1, workflow-001
    const suffixMatch = workflowId.match(/[-_](v?\d+(?:\.\d+)*|[A-Z]{3}-[A-Z]{3}-\d{3})$/i);
    if (suffixMatch) {
      return suffixMatch[1];
    }

    return null;
  }

  /**
   * Carrega workflows locais da pasta n8n/workflows/
   * @returns {Array} Array de workflows locais
   */
  loadLocalWorkflows() {
    const workflowsDir = path.join(process.cwd(), 'n8n', 'workflows');

    if (!fs.existsSync(workflowsDir)) {
      console.error('[ERRO] Pasta n8n/workflows/ não encontrada!');
      console.error('\nDica: Execute "Baixar Workflows do N8N Source" primeiro (opção 2 no menu)\n');
      throw new Error('Workflows directory not found');
    }

    const files = fs.readdirSync(workflowsDir).filter(f => f.endsWith('.json'));

    if (files.length === 0) {
      console.error('[ERRO] Nenhum workflow encontrado em n8n/workflows/!');
      console.error('\nDica: Execute "Baixar Workflows do N8N Source" primeiro (opção 2 no menu)\n');
      throw new Error('No workflows found');
    }

    const workflows = [];

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(workflowsDir, file), 'utf-8');
        const workflow = JSON.parse(content);
        workflows.push(workflow);
      } catch (error) {
        console.warn(`[AVISO] Não foi possível ler ${file}: ${error.message}`);
      }
    }

    return workflows;
  }

  async run() {
    this.initialize();

    console.log('\nJANA WORKFLOWS - Comparar Workflows\n');
    console.log('='.repeat(70));
    console.log(`\nN8N Target: ${this.config.baseUrl}`);
    console.log('Pasta Local: n8n/workflows/\n');

    // Carrega workflows locais
    console.log('[1/3] Carregando workflows locais...');
    const localWorkflows = this.loadLocalWorkflows();
    console.log(`      Encontrados: ${localWorkflows.length} workflows locais\n`);

    // Busca workflows do target
    console.log('[2/3] Buscando workflows do N8N target...');
    const targetWorkflows = await this.workflowService.listWorkflows();
    console.log(`      Encontrados: ${targetWorkflows.length} workflows no target\n`);

    // Compara workflows
    console.log('[3/3] Comparando workflows...\n');

    const targetMap = new Map();
    targetWorkflows.forEach(wf => {
      targetMap.set(wf.name, wf);
    });

    const comparison = {
      new: [],
      modified: [],
      identical: [],
      versionChanges: []
    };

    for (const localWf of localWorkflows) {
      const targetWf = targetMap.get(localWf.name);

      if (!targetWf) {
        // Workflow novo
        comparison.new.push({
          name: localWf.name,
          localId: localWf.id,
          localVersion: this.extractVersion(localWf.id)
        });
      } else {
        // Workflow existe no target
        const localVersion = this.extractVersion(localWf.id);
        const targetVersion = this.extractVersion(targetWf.id);

        if (localWf.id === targetWf.id) {
          // IDs idênticos
          comparison.identical.push({
            name: localWf.name,
            id: localWf.id,
            version: localVersion
          });
        } else {
          // IDs diferentes - workflow foi modificado
          comparison.modified.push({
            name: localWf.name,
            localId: localWf.id,
            targetId: targetWf.id,
            localVersion,
            targetVersion
          });

          if (localVersion && targetVersion && localVersion !== targetVersion) {
            comparison.versionChanges.push({
              name: localWf.name,
              from: targetVersion,
              to: localVersion
            });
          }
        }
      }
    }

    // Exibe resultado
    console.log('='.repeat(70));
    console.log('\nRESULTADO DA COMPARAÇÃO\n');
    console.log('='.repeat(70));

    if (comparison.new.length > 0) {
      console.log(`\n[NOVOS] ${comparison.new.length} workflow(s) que NÃO existem no N8N:\n`);
      comparison.new.forEach(wf => {
        const versionInfo = wf.localVersion ? ` (${wf.localVersion})` : '';
        console.log(`   + ${wf.name}${versionInfo}`);
      });
    }

    if (comparison.modified.length > 0) {
      console.log(`\n[MODIFICADOS] ${comparison.modified.length} workflow(s) com DIFERENÇAS:\n`);
      comparison.modified.forEach(wf => {
        console.log(`   ~ ${wf.name}`);
        console.log(`     - No N8N Target: ${wf.targetVersion || wf.targetId}`);
        console.log(`     - Local (será enviado): ${wf.localVersion || wf.localId}`);
      });
    }

    if (comparison.identical.length > 0) {
      console.log(`\n[IDÊNTICOS] ${comparison.identical.length} workflow(s) SEM MUDANÇAS:\n`);
      comparison.identical.slice(0, 5).forEach(wf => {
        const versionInfo = wf.version ? ` (${wf.version})` : '';
        console.log(`   = ${wf.name}${versionInfo}`);
      });
      if (comparison.identical.length > 5) {
        console.log(`   ... e mais ${comparison.identical.length - 5} workflow(s)`);
      }
    }

    // Resumo final
    console.log('\n' + '='.repeat(70));
    console.log('\nRESUMO:');
    console.log(`  - ${comparison.new.length} novos`);
    console.log(`  - ${comparison.modified.length} modificados`);
    console.log(`  - ${comparison.identical.length} idênticos`);
    console.log(`  - TOTAL: ${localWorkflows.length} workflows locais`);

    if (comparison.new.length + comparison.modified.length > 0) {
      console.log('\n[PRÓXIMO PASSO]');
      console.log('  Use a opção 4 (Dry Run) para simular o envio');
      console.log('  ou opção 5 (Enviar) para fazer o upload de verdade.');
    } else {
      console.log('\n[TUDO OK] Todos os workflows locais já estão no N8N target!');
    }

    console.log('\n' + '='.repeat(70) + '\n');
  }
}

module.exports = N8nCompareCommand;
