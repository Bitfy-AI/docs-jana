/**
 * WorkflowLoader - Carrega workflows de arquivos JSON
 * Suporta arquivo único ou diretório com múltiplos workflows
 */

const fs = require('fs');
const path = require('path');

class WorkflowLoader {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Carrega workflows de um arquivo ou diretório
   * @param {string} sourcePath - Caminho do arquivo ou diretório
   * @returns {Promise<Array>} Array de workflows carregados
   */
  async load(sourcePath) {
    this.logger.section('Carregando workflows');

    try {
      const stats = fs.statSync(sourcePath);

      if (stats.isDirectory()) {
        return await this.loadFromDirectory(sourcePath);
      } else if (stats.isFile()) {
        return await this.loadFromFile(sourcePath);
      } else {
        throw new Error(`Caminho inválido: ${sourcePath}`);
      }
    } catch (error) {
      this.logger.error(`Erro ao carregar workflows: ${error.message}`);
      throw error;
    }
  }

  /**
   * Carrega workflows de um diretório
   * @param {string} dirPath - Caminho do diretório
   * @returns {Promise<Array>} Array de workflows
   */
  async loadFromDirectory(dirPath) {
    this.logger.info(`Carregando workflows do diretório: ${dirPath}`);

    const files = fs.readdirSync(dirPath);
    const jsonFiles = files.filter(file =>
      file.endsWith('.json') && !file.includes('_backup-log')
    );

    this.logger.info(`Encontrados ${jsonFiles.length} arquivos JSON`);

    const workflows = [];
    const errors = [];

    for (const file of jsonFiles) {
      const filePath = path.join(dirPath, file);

      try {
        const workflow = await this.loadFromFile(filePath);

        if (Array.isArray(workflow)) {
          workflows.push(...workflow);
        } else {
          workflows.push(workflow);
        }
      } catch (error) {
        errors.push({ file, error: error.message });
        this.logger.warn(`Erro ao carregar ${file}: ${error.message}`);
      }
    }

    this.logger.success(`${workflows.length} workflows carregados com sucesso`);

    if (errors.length > 0) {
      this.logger.warn(`${errors.length} arquivos com erro`);
    }

    return workflows;
  }

  /**
   * Carrega workflow(s) de um arquivo JSON
   * @param {string} filePath - Caminho do arquivo
   * @returns {Promise<object|Array>} Workflow ou array de workflows
   */
  async loadFromFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const json = JSON.parse(content);

      // Valida estrutura mínima do workflow
      if (Array.isArray(json)) {
        return json.filter(wf => this.validateWorkflow(wf));
      } else if (this.validateWorkflow(json)) {
        return json;
      } else {
        throw new Error('Estrutura de workflow inválida');
      }
    } catch (error) {
      throw new Error(`Erro ao ler ${path.basename(filePath)}: ${error.message}`);
    }
  }

  /**
   * Valida estrutura básica de um workflow
   * @param {object} workflow - Workflow para validar
   * @returns {boolean} True se válido
   */
  validateWorkflow(workflow) {
    if (!workflow || typeof workflow !== 'object') {
      return false;
    }

    // Campos obrigatórios
    const requiredFields = ['name', 'nodes'];

    for (const field of requiredFields) {
      if (!workflow[field]) {
        this.logger.warn(`Workflow sem campo obrigatório: ${field}`);
        return false;
      }
    }

    // Valida que nodes é um array
    if (!Array.isArray(workflow.nodes)) {
      this.logger.warn('Campo "nodes" não é um array');
      return false;
    }

    return true;
  }

  /**
   * Filtra workflows por critérios
   * @param {Array} workflows - Array de workflows
   * @param {object} filters - Filtros a aplicar
   * @returns {Array} Workflows filtrados
   */
  filterWorkflows(workflows, filters = {}) {
    let filtered = [...workflows];

    // Filtrar por tag
    if (filters.tag) {
      const tagLower = filters.tag.toLowerCase();
      filtered = filtered.filter(wf => {
        if (!wf.tags || !Array.isArray(wf.tags)) return false;

        return wf.tags.some(tag => {
          const tagName = typeof tag === 'string' ? tag : tag.name;
          return tagName && tagName.toLowerCase() === tagLower;
        });
      });
      this.logger.info(`Filtrados ${filtered.length} workflows com tag "${filters.tag}"`);
    }

    // Filtrar por nome (regex)
    if (filters.namePattern) {
      const regex = new RegExp(filters.namePattern, 'i');
      filtered = filtered.filter(wf => regex.test(wf.name));
      this.logger.info(`Filtrados ${filtered.length} workflows com padrão "${filters.namePattern}"`);
    }

    // Filtrar por IDs específicos
    if (filters.ids && Array.isArray(filters.ids)) {
      filtered = filtered.filter(wf => filters.ids.includes(wf.id));
      this.logger.info(`Filtrados ${filtered.length} workflows com IDs específicos`);
    }

    // Excluir workflows inativos
    if (filters.activeOnly) {
      filtered = filtered.filter(wf => wf.active !== false);
      this.logger.info(`Excluídos workflows inativos: ${filtered.length} restantes`);
    }

    return filtered;
  }

  /**
   * Retorna estatísticas dos workflows carregados
   * @param {Array} workflows - Array de workflows
   * @returns {object} Estatísticas
   */
  getStatistics(workflows) {
    const stats = {
      total: workflows.length,
      active: 0,
      inactive: 0,
      withTags: 0,
      withoutTags: 0,
      totalNodes: 0,
      avgNodes: 0,
      tags: new Set()
    };

    workflows.forEach(wf => {
      // Status
      if (wf.active) stats.active++;
      else stats.inactive++;

      // Tags
      if (wf.tags && wf.tags.length > 0) {
        stats.withTags++;
        wf.tags.forEach(tag => {
          const tagName = typeof tag === 'string' ? tag : tag.name;
          if (tagName) stats.tags.add(tagName);
        });
      } else {
        stats.withoutTags++;
      }

      // Nodes
      if (wf.nodes) {
        stats.totalNodes += wf.nodes.length;
      }
    });

    stats.avgNodes = workflows.length > 0
      ? (stats.totalNodes / workflows.length).toFixed(1)
      : 0;

    stats.tags = Array.from(stats.tags);

    return stats;
  }
}

module.exports = WorkflowLoader;
