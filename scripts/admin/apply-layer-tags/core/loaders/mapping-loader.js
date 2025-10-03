/**
 * MappingLoader - Carregamento e validação de arquivo de mapeamento
 *
 * Responsável por ler o arquivo JSON de mapeamento de workflows,
 * validar os dados e transformar para o formato interno utilizado
 * pelo sistema.
 *
 * @module loaders/mapping-loader
 */

const fs = require('fs');
const path = require('path');
const DataValidator = require('../validators/data-validator');
const { PATHS, LAYERS } = require('../../config/config');

/**
 * Item de workflow processado internamente
 * @typedef {Object} WorkflowItem
 * @property {string} id - ID do workflow no n8n
 * @property {string} name - Nome do workflow
 * @property {string} code - Código único do workflow
 * @property {string} layer - Layer arquitetural (A-F)
 * @property {string} layerDescription - Descrição da layer
 * @property {string} tag - Tag a aplicar
 * @property {string} status - Status do processamento ('pending', 'processing', 'success', 'failed', 'skipped')
 */

/**
 * Resultado do carregamento do mapping
 * @typedef {Object} LoadResult
 * @property {boolean} success - Se o carregamento foi bem-sucedido
 * @property {Array<WorkflowItem>} data - Dados carregados (vazio se sucesso=false)
 * @property {Array<Object>} errors - Lista de erros (vazio se sucesso=true)
 */

class MappingLoader {
  /**
   * Cria uma instância do MappingLoader
   */
  constructor() {
    this.validator = new DataValidator();
  }

  /**
   * Carrega e valida o arquivo de mapeamento JSON
   *
   * Realiza as seguintes operações:
   * 1. Lê o arquivo JSON do disco
   * 2. Faz parse do conteúdo
   * 3. Valida os dados usando DataValidator
   * 4. Retorna resultado estruturado
   *
   * @param {string} [filePath] - Caminho do arquivo (padrão: config.PATHS.mappingFile)
   * @returns {LoadResult} Resultado do carregamento
   *
   * @example
   * const loader = new MappingLoader();
   * const result = loader.loadMappingFile();
   * if (result.success) {
   *   console.log(`Carregados ${result.data.length} workflows`);
   * } else {
   *   console.error('Erros:', result.errors);
   * }
   */
  loadMappingFile(filePath = PATHS.mappingFile) {
    try {
      // Verificar se arquivo existe
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          data: [],
          errors: [{
            field: 'file',
            value: filePath,
            message: `Arquivo de mapeamento não encontrado: ${filePath}`
          }]
        };
      }

      // Ler conteúdo do arquivo
      const fileContent = fs.readFileSync(filePath, 'utf-8');

      // Parse JSON
      let mappingData;
      try {
        mappingData = JSON.parse(fileContent);
      } catch (parseError) {
        return {
          success: false,
          data: [],
          errors: [{
            field: 'json',
            value: parseError.message,
            message: `JSON inválido: ${parseError.message}`
          }]
        };
      }

      // Validar dados usando DataValidator
      const validationResult = this.validator.validateMappingArray(mappingData);
      if (!validationResult.isValid) {
        return {
          success: false,
          data: [],
          errors: validationResult.errors
        };
      }

      // Retornar sucesso com dados brutos
      return {
        success: true,
        data: mappingData,
        errors: []
      };

    } catch (error) {
      return {
        success: false,
        data: [],
        errors: [{
          field: 'file',
          value: error.message,
          message: `Erro ao carregar arquivo: ${error.message}`
        }]
      };
    }
  }

  /**
   * Transforma dados do mapping para formato interno WorkflowItem
   *
   * Converte o formato do JSON de mapeamento para a estrutura
   * interna utilizada pelo processador de workflows.
   *
   * @param {Array<Object>} mappingData - Dados brutos do mapping
   * @returns {Array<WorkflowItem>} Array de WorkflowItems processados
   *
   * @example
   * const loader = new MappingLoader();
   * const result = loader.loadMappingFile();
   * if (result.success) {
   *   const workflowItems = loader.transformToWorkflowItems(result.data);
   *   console.log(workflowItems[0]);
   *   // {
   *   //   id: '84ZeQA0cA24Umeli',
   *   //   name: 'banco atualizacao workflow',
   *   //   code: 'BCO-ATU-001',
   *   //   layer: 'A',
   *   //   layerDescription: 'Pontes - Integracoes entre componentes',
   *   //   tag: 'jana',
   *   //   status: 'pending'
   *   // }
   * }
   */
  transformToWorkflowItems(mappingData) {
    return mappingData.map(item => {
      // Normalizar nome (trim)
      const normalizedName = item.name.new.trim();

      // Obter descrição da layer do config
      const layerDescription = LAYERS[item.layer] || 'Descrição não disponível';

      return {
        id: item.id,
        name: normalizedName,
        code: item.code,
        layer: item.layer,
        layerDescription,
        tag: item.tag,
        status: 'pending'
      };
    });
  }

  /**
   * Carrega o mapping e transforma para formato interno em uma única operação
   *
   * Combina loadMappingFile() e transformToWorkflowItems() em uma
   * única chamada conveniente.
   *
   * @param {string} [filePath] - Caminho do arquivo (padrão: config.PATHS.mappingFile)
   * @returns {LoadResult} Resultado com data contendo WorkflowItems transformados
   *
   * @example
   * const loader = new MappingLoader();
   * const result = loader.loadAndTransform();
   * if (result.success) {
   *   console.log(`Carregados ${result.data.length} workflows prontos para processar`);
   *   result.data.forEach(item => {
   *     console.log(`${item.code} - ${item.name} [${item.layer}]`);
   *   });
   * }
   */
  loadAndTransform(filePath = PATHS.mappingFile) {
    const loadResult = this.loadMappingFile(filePath);

    if (!loadResult.success) {
      return loadResult;
    }

    // Transformar dados para formato interno
    const transformedData = this.transformToWorkflowItems(loadResult.data);

    return {
      success: true,
      data: transformedData,
      errors: []
    };
  }

  /**
   * Retorna estatísticas sobre o mapping carregado
   *
   * @param {Array<WorkflowItem>} workflowItems - Items de workflow
   * @returns {Object} Estatísticas agregadas
   *
   * @example
   * const loader = new MappingLoader();
   * const result = loader.loadAndTransform();
   * if (result.success) {
   *   const stats = loader.getStatistics(result.data);
   *   console.log(stats);
   *   // {
   *   //   total: 31,
   *   //   byLayer: { A: 5, B: 8, C: 6, D: 4, E: 5, F: 3 },
   *   //   byTag: { jana: 31 }
   *   // }
   * }
   */
  getStatistics(workflowItems) {
    const stats = {
      total: workflowItems.length,
      byLayer: {},
      byTag: {}
    };

    // Contar por layer
    workflowItems.forEach(item => {
      stats.byLayer[item.layer] = (stats.byLayer[item.layer] || 0) + 1;
      stats.byTag[item.tag] = (stats.byTag[item.tag] || 0) + 1;
    });

    return stats;
  }
}

module.exports = MappingLoader;
