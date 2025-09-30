/**
 * MigrationVerifier - Verifica integridade da migração de workflows
 * Garante que ZERO elos foram perdidos durante a migração
 */

class MigrationVerifier {
  constructor(workflowService, idMapper, logger) {
    this.workflowService = workflowService;
    this.idMapper = idMapper;
    this.logger = logger;
  }

  /**
   * Verifica integridade completa da migração
   * @param {Array} originalWorkflows - Workflows originais
   * @returns {Promise<object>} Resultado da verificação
   */
  async verify(originalWorkflows) {
    this.logger.section('Verificando integridade da migração');

    const results = {
      passed: true,
      checks: {
        workflowCount: null,
        allWorkflowsCreated: null,
        referencesIntegrity: null,
        nodesIntegrity: null
      },
      issues: [],
      summary: {}
    };

    try {
      // Check 1: Contagem de workflows
      this.logger.info('Check 1: Verificando contagem de workflows...');
      results.checks.workflowCount = await this.verifyWorkflowCount(originalWorkflows);

      // Check 2: Todos os workflows foram criados
      this.logger.info('Check 2: Verificando criação de workflows...');
      results.checks.allWorkflowsCreated = this.verifyAllWorkflowsCreated(originalWorkflows);

      // Check 3: Integridade de referências
      this.logger.info('Check 3: Verificando integridade de referências...');
      results.checks.referencesIntegrity = await this.verifyReferencesIntegrity();

      // Check 4: Integridade de nodes
      this.logger.info('Check 4: Verificando integridade de nodes...');
      results.checks.nodesIntegrity = this.verifyNodesIntegrity(originalWorkflows);

      // Compila issues de todos os checks
      Object.values(results.checks).forEach(check => {
        if (check && check.issues) {
          results.issues.push(...check.issues);
        }
      });

      // Determina se passou
      results.passed = results.issues.length === 0;

      // Cria resumo
      results.summary = this.createSummary(results);

      // Loga resultado
      this.logResults(results);

      return results;
    } catch (error) {
      this.logger.error(`Erro durante verificação: ${error.message}`);
      results.passed = false;
      results.issues.push({
        severity: 'critical',
        message: `Erro durante verificação: ${error.message}`
      });
      return results;
    }
  }

  /**
   * Verifica se o número de workflows está correto
   * @param {Array} originalWorkflows - Workflows originais
   * @returns {Promise<object>} Resultado do check
   */
  async verifyWorkflowCount(originalWorkflows) {
    const result = {
      passed: false,
      issues: []
    };

    try {
      // Busca workflows criados no destino
      const destinationWorkflows = await this.workflowService.listWorkflows();

      const originalCount = originalWorkflows.length;
      const createdCount = this.idMapper.getAllMappings().length;
      const destinationCount = destinationWorkflows.length;

      result.originalCount = originalCount;
      result.createdCount = createdCount;
      result.destinationCount = destinationCount;

      // Verifica se todos foram criados
      if (createdCount === originalCount) {
        result.passed = true;
        this.logger.success(`  ${createdCount}/${originalCount} workflows criados`);
      } else {
        result.passed = false;
        result.issues.push({
          severity: 'high',
          message: `Esperado ${originalCount} workflows, mas apenas ${createdCount} foram criados`
        });
        this.logger.error(`  ${createdCount}/${originalCount} workflows criados`);
      }
    } catch (error) {
      result.issues.push({
        severity: 'critical',
        message: `Erro ao verificar contagem: ${error.message}`
      });
    }

    return result;
  }

  /**
   * Verifica se todos os workflows originais foram criados
   * @param {Array} originalWorkflows - Workflows originais
   * @returns {object} Resultado do check
   */
  verifyAllWorkflowsCreated(originalWorkflows) {
    const result = {
      passed: true,
      issues: [],
      missingWorkflows: []
    };

    for (const workflow of originalWorkflows) {
      const mapped = this.idMapper.hasName(workflow.name);

      if (!mapped) {
        result.passed = false;
        result.missingWorkflows.push(workflow.name);
        result.issues.push({
          severity: 'high',
          message: `Workflow não foi criado: "${workflow.name}"`
        });
      }
    }

    if (result.passed) {
      this.logger.success(`  Todos os ${originalWorkflows.length} workflows foram criados`);
    } else {
      this.logger.error(`  ${result.missingWorkflows.length} workflows não foram criados`);
    }

    return result;
  }

  /**
   * Verifica integridade de referências entre workflows
   * @returns {Promise<object>} Resultado do check
   */
  async verifyReferencesIntegrity() {
    const result = {
      passed: true,
      issues: [],
      brokenReferences: []
    };

    try {
      // Busca todos os workflows criados
      const workflows = await this.fetchCreatedWorkflows();

      // Verifica cada workflow
      for (const workflow of workflows) {
        const issues = this.checkWorkflowReferences(workflow);

        if (issues.length > 0) {
          result.passed = false;
          result.brokenReferences.push({
            workflowName: workflow.name,
            workflowId: workflow.id,
            issues
          });

          issues.forEach(issue => {
            result.issues.push({
              severity: 'critical',
              message: `Referência quebrada em "${workflow.name}": ${issue.message}`
            });
          });
        }
      }

      if (result.passed) {
        this.logger.success(`  Todas as referências estão íntegras`);
      } else {
        this.logger.error(`  ${result.brokenReferences.length} workflows com referências quebradas`);
      }
    } catch (error) {
      result.issues.push({
        severity: 'critical',
        message: `Erro ao verificar referências: ${error.message}`
      });
    }

    return result;
  }

  /**
   * Verifica referências em um workflow específico
   * @param {object} workflow - Workflow para verificar
   * @returns {Array} Lista de issues encontradas
   */
  checkWorkflowReferences(workflow) {
    const issues = [];

    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      return issues;
    }

    for (const node of workflow.nodes) {
      if (node.type === 'n8n-nodes-base.executeWorkflow') {
        const issue = this.verifyExecuteWorkflowNode(node);
        if (issue) {
          issues.push(issue);
        }
      }
    }

    return issues;
  }

  /**
   * Verifica node do tipo executeWorkflow
   * @param {object} node - Node para verificar
   * @returns {object|null} Issue ou null
   */
  verifyExecuteWorkflowNode(node) {
    if (!node.parameters || !node.parameters.workflowId) {
      return {
        nodeName: node.name,
        message: 'Node executeWorkflow sem workflowId'
      };
    }

    const workflowId = node.parameters.workflowId;

    // Se é objeto, verifica se tem value válido
    if (typeof workflowId === 'object' && workflowId !== null) {
      if (!workflowId.value) {
        return {
          nodeName: node.name,
          message: 'workflowId.value está vazio'
        };
      }

      // Verifica se o ID referenciado existe no mapeamento
      const exists = this.idMapper.newIdToWorkflow.has(workflowId.value);
      if (!exists) {
        return {
          nodeName: node.name,
          referencedId: workflowId.value,
          referencedName: workflowId.cachedResultName,
          message: `ID referenciado não existe no mapeamento: ${workflowId.value}`
        };
      }
    }

    return null;
  }

  /**
   * Verifica integridade de nodes (contagem)
   * @param {Array} originalWorkflows - Workflows originais
   * @returns {object} Resultado do check
   */
  verifyNodesIntegrity(originalWorkflows) {
    const result = {
      passed: true,
      issues: [],
      mismatches: []
    };

    for (const original of originalWorkflows) {
      const newId = this.idMapper.getIdByName(original.name);

      if (!newId) {
        continue; // Já reportado em outro check
      }

      const created = this.idMapper.getWorkflow(newId);

      if (created) {
        const originalNodeCount = original.nodes ? original.nodes.length : 0;
        const createdNodeCount = created.nodes ? created.nodes.length : 0;

        if (originalNodeCount !== createdNodeCount) {
          result.passed = false;
          result.mismatches.push({
            workflowName: original.name,
            originalNodes: originalNodeCount,
            createdNodes: createdNodeCount
          });

          result.issues.push({
            severity: 'medium',
            message: `"${original.name}": ${originalNodeCount} nodes originais, ${createdNodeCount} nodes criados`
          });
        }
      }
    }

    if (result.passed) {
      this.logger.success(`  Contagem de nodes está correta em todos os workflows`);
    } else {
      this.logger.warn(`  ${result.mismatches.length} workflows com divergência de nodes`);
    }

    return result;
  }

  /**
   * Busca workflows criados do n8n
   * @returns {Promise<Array>} Workflows criados
   */
  async fetchCreatedWorkflows() {
    const mappings = this.idMapper.getAllMappings();
    const workflows = [];

    for (const mapping of mappings) {
      try {
        const workflow = await this.workflowService.getWorkflow(mapping.newId);
        workflows.push(workflow);
      } catch (error) {
        this.logger.warn(`Erro ao buscar workflow ${mapping.newId}: ${error.message}`);
      }
    }

    return workflows;
  }

  /**
   * Cria resumo da verificação
   * @param {object} results - Resultados dos checks
   * @returns {object} Resumo
   */
  createSummary(results) {
    const summary = {
      status: results.passed ? 'PASSED' : 'FAILED',
      totalChecks: Object.keys(results.checks).length,
      passedChecks: 0,
      failedChecks: 0,
      totalIssues: results.issues.length,
      issuesBySeverity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      }
    };

    // Conta checks que passaram
    Object.values(results.checks).forEach(check => {
      if (check && check.passed) {
        summary.passedChecks++;
      } else {
        summary.failedChecks++;
      }
    });

    // Conta issues por severidade
    results.issues.forEach(issue => {
      const severity = issue.severity || 'medium';
      summary.issuesBySeverity[severity]++;
    });

    return summary;
  }

  /**
   * Loga resultados da verificação
   * @param {object} results - Resultados
   */
  logResults(results) {
    this.logger.header('RESULTADO DA VERIFICAÇÃO');

    if (results.passed) {
      this.logger.success(`Status: ${results.summary.status}`);
      this.logger.success(`Checks: ${results.summary.passedChecks}/${results.summary.totalChecks} passaram`);
      this.logger.success('Migração concluída com sucesso! ZERO elos perdidos.');
    } else {
      this.logger.error(`Status: ${results.summary.status}`);
      this.logger.error(`Checks: ${results.summary.failedChecks}/${results.summary.totalChecks} falharam`);
      this.logger.error(`Total de issues: ${results.summary.totalIssues}`);

      // Loga issues por severidade
      const { issuesBySeverity } = results.summary;
      if (issuesBySeverity.critical > 0) {
        this.logger.error(`  Críticas: ${issuesBySeverity.critical}`);
      }
      if (issuesBySeverity.high > 0) {
        this.logger.error(`  Altas: ${issuesBySeverity.high}`);
      }
      if (issuesBySeverity.medium > 0) {
        this.logger.warn(`  Médias: ${issuesBySeverity.medium}`);
      }
      if (issuesBySeverity.low > 0) {
        this.logger.info(`  Baixas: ${issuesBySeverity.low}`);
      }

      // Loga primeiras issues
      const maxIssuesToShow = 10;
      if (results.issues.length > 0) {
        this.logger.warn(`\nPrimeiras ${Math.min(maxIssuesToShow, results.issues.length)} issues:`);
        results.issues.slice(0, maxIssuesToShow).forEach((issue, i) => {
          this.logger.warn(`  ${i + 1}. [${issue.severity}] ${issue.message}`);
        });

        if (results.issues.length > maxIssuesToShow) {
          this.logger.warn(`  ... e mais ${results.issues.length - maxIssuesToShow} issues`);
        }
      }
    }

    console.log('='.repeat(50));
  }
}

module.exports = MigrationVerifier;
