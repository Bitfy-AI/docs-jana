/**
 * DataValidator - Validação de schemas de dados
 *
 * Valida estruturas de dados do mapping de workflows, incluindo
 * campos obrigatórios, formatos e tipos.
 *
 * @module validators/data-validator
 */

const { LAYERS, DEFAULT_LAYER } = require('../../config/config');

/**
 * Resultado de validação
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Se a validação passou
 * @property {Array<Object>} errors - Lista de erros encontrados
 * @property {Array<Object>} warnings - Lista de warnings encontrados
 * @property {string} errors[].field - Campo que falhou na validação
 * @property {*} errors[].value - Valor que causou a falha
 * @property {string} errors[].message - Mensagem descritiva do erro
 * @property {boolean} hasDefaultLayer - Se layer padrão foi aplicada
 * @property {string} appliedLayer - Layer final aplicada (pode ser padrão)
 */

/**
 * Item de mapeamento de workflow
 * @typedef {Object} MappingItem
 * @property {Object} name - Objeto com nomes do workflow
 * @property {string} name.new - Nome novo do workflow
 * @property {string} code - Código único do workflow (formato: XXX-XXX-NNN)
 * @property {string} layer - Layer arquitetural (A-F)
 * @property {string} id - ID do workflow no n8n
 * @property {string} tag - Tag a ser aplicada
 */

class DataValidator {
  /**
   * Valida um item individual do mapping
   *
   * @param {MappingItem} item - Item a ser validado
   * @returns {ValidationResult} Resultado da validação
   *
   * @example
   * const validator = new DataValidator();
   * const result = validator.validateMappingItem({
   *   name: { new: 'Workflow Nome' },
   *   code: 'BCO-ATU-001',
   *   layer: 'A',
   *   id: '84ZeQA0cA24Umeli',
   *   tag: 'jana'
   * });
   * console.log(result.isValid); // true
   */
  validateMappingItem(item) {
    const errors = [];
    const warnings = [];
    let hasDefaultLayer = false;
    let appliedLayer = item.layer;

    // Validar campo name.new
    if (!item.name || typeof item.name.new !== 'string' || item.name.new.trim() === '') {
      errors.push({
        field: 'name.new',
        value: item.name?.new,
        message: 'Campo name.new é obrigatório e deve ser uma string não vazia'
      });
    }

    // Validar campo code
    const codeRegex = /^[A-Z]{3}-[A-Z]{3}-\d{3}$/;
    if (!item.code || typeof item.code !== 'string') {
      errors.push({
        field: 'code',
        value: item.code,
        message: 'Campo code é obrigatório e deve ser uma string'
      });
    } else if (!codeRegex.test(item.code)) {
      errors.push({
        field: 'code',
        value: item.code,
        message: 'Campo code deve seguir o formato XXX-XXX-NNN (ex: BCO-ATU-001)'
      });
    }

    // Validar campo layer (permite undefined - usa padrão)
    const layerValidation = this.validateLayer(item.layer);
    if (!layerValidation.isValid) {
      // Se layer undefined ou inválida, usar layer padrão
      if (!item.layer || item.layer === undefined || item.layer === null || item.layer === '') {
        hasDefaultLayer = true;
        appliedLayer = DEFAULT_LAYER;
        warnings.push({
          field: 'layer',
          value: item.layer,
          message: `Layer não definida para workflow "${item.name?.new || item.id}". Usando layer padrão: ${DEFAULT_LAYER} (${LAYERS[DEFAULT_LAYER]})`
        });
      } else {
        // Layer inválida (não undefined)
        errors.push(...layerValidation.errors);
      }
    }

    // Validar campo id
    if (!item.id || typeof item.id !== 'string' || item.id.trim() === '') {
      errors.push({
        field: 'id',
        value: item.id,
        message: 'Campo id é obrigatório e deve ser uma string não vazia'
      });
    }

    // Validar campo tag
    if (!item.tag || typeof item.tag !== 'string' || item.tag.trim() === '') {
      errors.push({
        field: 'tag',
        value: item.tag,
        message: 'Campo tag é obrigatório e deve ser uma string não vazia'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      hasDefaultLayer,
      appliedLayer
    };
  }

  /**
   * Valida um array completo de items do mapping
   *
   * Verifica se todos os items são válidos e se não há duplicatas
   * de IDs ou códigos.
   *
   * @param {Array<MappingItem>} items - Array de items a validar
   * @returns {ValidationResult} Resultado da validação com erros agregados
   *
   * @example
   * const validator = new DataValidator();
   * const result = validator.validateMappingArray([
   *   { name: { new: 'WF1' }, code: 'BCO-ATU-001', layer: 'A', id: 'id1', tag: 'jana' },
   *   { name: { new: 'WF2' }, code: 'BCO-ATU-002', layer: 'B', id: 'id2', tag: 'jana' }
   * ]);
   */
  validateMappingArray(items) {
    const errors = [];
    const warnings = [];

    // Validar se array não está vazio
    if (!Array.isArray(items)) {
      errors.push({
        field: 'array',
        value: items,
        message: 'Input deve ser um array'
      });
      return { isValid: false, errors, warnings };
    }

    if (items.length === 0) {
      errors.push({
        field: 'array',
        value: [],
        message: 'Array não pode estar vazio'
      });
      return { isValid: false, errors, warnings };
    }

    // Validar cada item individualmente
    items.forEach((item, index) => {
      const itemValidation = this.validateMappingItem(item);

      // Agregar erros
      if (!itemValidation.isValid) {
        itemValidation.errors.forEach(error => {
          errors.push({
            ...error,
            index,
            message: `Item[${index}]: ${error.message}`
          });
        });
      }

      // Agregar warnings
      if (itemValidation.warnings && itemValidation.warnings.length > 0) {
        itemValidation.warnings.forEach(warning => {
          warnings.push({
            ...warning,
            index,
            message: `Item[${index}]: ${warning.message}`
          });
        });
      }

      // Aplicar layer padrão se necessário
      if (itemValidation.hasDefaultLayer) {
        item.layer = itemValidation.appliedLayer;
      }
    });

    // Detectar IDs duplicados
    const ids = items.map(item => item.id).filter(Boolean);
    const duplicateIds = this._findDuplicates(ids);
    if (duplicateIds.length > 0) {
      duplicateIds.forEach(duplicateId => {
        const indices = items
          .map((item, idx) => (item.id === duplicateId ? idx : -1))
          .filter(idx => idx !== -1);
        errors.push({
          field: 'id',
          value: duplicateId,
          message: `ID duplicado encontrado: '${duplicateId}' nos índices [${indices.join(', ')}]`
        });
      });
    }

    // Detectar códigos duplicados
    const codes = items.map(item => item.code).filter(Boolean);
    const duplicateCodes = this._findDuplicates(codes);
    if (duplicateCodes.length > 0) {
      duplicateCodes.forEach(duplicateCode => {
        const indices = items
          .map((item, idx) => (item.code === duplicateCode ? idx : -1))
          .filter(idx => idx !== -1);
        errors.push({
          field: 'code',
          value: duplicateCode,
          message: `Código duplicado encontrado: '${duplicateCode}' nos índices [${indices.join(', ')}]`
        });
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Valida se a layer é válida (A-F)
   *
   * @param {string} layer - Layer a validar
   * @returns {ValidationResult} Resultado da validação
   *
   * @example
   * const validator = new DataValidator();
   * const result = validator.validateLayer('A');
   * console.log(result.isValid); // true
   */
  validateLayer(layer) {
    const errors = [];

    if (!layer || typeof layer !== 'string') {
      errors.push({
        field: 'layer',
        value: layer,
        message: 'Campo layer é obrigatório e deve ser uma string'
      });
    } else if (!LAYERS[layer]) {
      const validLayers = Object.keys(LAYERS).join(', ');
      errors.push({
        field: 'layer',
        value: layer,
        message: `Layer inválida: '${layer}'. Esperado uma das seguintes: ${validLayers}`
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Valida formato de ID de workflow do n8n
   *
   * @param {string} id - ID a validar
   * @returns {ValidationResult} Resultado da validação
   *
   * @example
   * const validator = new DataValidator();
   * const result = validator.validateWorkflowId('84ZeQA0cA24Umeli');
   * console.log(result.isValid); // true
   */
  validateWorkflowId(id) {
    const errors = [];

    if (!id || typeof id !== 'string') {
      errors.push({
        field: 'id',
        value: id,
        message: 'ID de workflow é obrigatório e deve ser uma string'
      });
    } else if (id.length !== 16) {
      errors.push({
        field: 'id',
        value: id,
        message: `ID de workflow inválido: deve ter 16 caracteres (recebido: ${id.length})`
      });
    } else if (!/^[A-Za-z0-9]+$/.test(id)) {
      errors.push({
        field: 'id',
        value: id,
        message: 'ID de workflow inválido: deve conter apenas caracteres alfanuméricos'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Encontra duplicatas em um array
   *
   * @private
   * @param {Array<*>} array - Array a verificar
   * @returns {Array<*>} Array com valores duplicados (sem repetições)
   */
  _findDuplicates(array) {
    const seen = new Set();
    const duplicates = new Set();

    array.forEach(item => {
      if (seen.has(item)) {
        duplicates.add(item);
      } else {
        seen.add(item);
      }
    });

    return Array.from(duplicates);
  }
}

module.exports = DataValidator;
