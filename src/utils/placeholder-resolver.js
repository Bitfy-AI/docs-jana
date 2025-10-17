/**
 * PlaceholderResolver - Resolução de Placeholders em Configurações
 *
 * Esta classe fornece funcionalidades para detectar, validar e resolver
 * placeholders dinâmicos em strings de configuração.
 *
 * Suporta placeholders no formato {placeholder_name} onde placeholder_name
 * deve começar com letra ou underscore e pode conter letras, números e underscores.
 *
 * @module placeholder-resolver
 * @example
 * // Detectar placeholders
 * PlaceholderResolver.hasPlaceholder('./dir-{timestamp}') // true
 *
 * // Validar formato
 * PlaceholderResolver.validateFormat('./dir-{timestamp}') // { valid: true, error: null }
 *
 * // Resolver placeholders
 * const context = { explicitTimestamp: '20251016-171935' };
 * PlaceholderResolver.resolve('./dir-{timestamp}', context) // './dir-20251016-171935'
 */

const TimestampResolver = require('./timestamp-resolver');

/**
 * Classe utilitária para resolução de placeholders
 */
class PlaceholderResolver {
  /**
   * Verifica se uma string contém placeholders
   *
   * @param {string} value - String para verificar
   * @returns {boolean} true se contém pelo menos um placeholder
   *
   * @example
   * PlaceholderResolver.hasPlaceholder('./dir-{timestamp}') // true
   * PlaceholderResolver.hasPlaceholder('./fixed-dir') // false
   * PlaceholderResolver.hasPlaceholder('./{env}-{timestamp}') // true
   */
  static hasPlaceholder(value) {
    if (!value || typeof value !== 'string') {
      return false;
    }

    const PLACEHOLDER_PATTERN = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
    return PLACEHOLDER_PATTERN.test(value);
  }

  /**
   * Extrai todos os placeholders de uma string
   *
   * @param {string} value - String para analisar
   * @returns {string[]} Array com nomes dos placeholders encontrados
   *
   * @example
   * PlaceholderResolver.extractPlaceholders('./dir-{timestamp}') // ['timestamp']
   * PlaceholderResolver.extractPlaceholders('./{env}-{timestamp}') // ['env', 'timestamp']
   * PlaceholderResolver.extractPlaceholders('./fixed-dir') // []
   */
  static extractPlaceholders(value) {
    if (!value || typeof value !== 'string') {
      return [];
    }

    const placeholders = [];
    const PLACEHOLDER_PATTERN = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
    const regex = new RegExp(PLACEHOLDER_PATTERN.source, 'g');
    let match;

    while ((match = regex.exec(value)) !== null) {
      placeholders.push(match[1]);
    }

    return placeholders;
  }

  /**
   * Valida formato de placeholders em uma string
   *
   * Verifica se:
   * - Placeholders estão corretamente fechados com {}
   * - Nomes de placeholders seguem o padrão válido
   * - Não há placeholders malformados (ex: {nome sem fechar)
   *
   * @param {string} value - String para validar
   * @returns {Object} Resultado da validação
   * @returns {boolean} returns.valid - true se formato válido
   * @returns {string|null} returns.error - Mensagem de erro se inválido, null caso contrário
   * @returns {string[]} returns.placeholders - Lista de placeholders encontrados
   *
   * @example
   * // Formato válido
   * PlaceholderResolver.validateFormat('./dir-{timestamp}')
   * // { valid: true, error: null, placeholders: ['timestamp'] }
   *
   * // Formato inválido - não fechado
   * PlaceholderResolver.validateFormat('./dir-{timestamp')
   * // { valid: false, error: 'Invalid placeholder format...', placeholders: [] }
   */
  static validateFormat(value) {
    if (!value || typeof value !== 'string') {
      return { valid: true, error: null, placeholders: [] };
    }

    // Verificar placeholders malformados (abertura sem fechamento)
    const openBraces = (value.match(/\{/g) || []).length;
    const closeBraces = (value.match(/\}/g) || []).length;

    if (openBraces !== closeBraces) {
      return {
        valid: false,
        error: `Invalid placeholder format in: "${value}"\n` +
               '   Expected format: {placeholder_name}\n' +
               `   Supported placeholders: ${Array.from(PlaceholderResolver.getResolvers().keys()).join(', ')}`,
        placeholders: []
      };
    }

    // Extrair e validar placeholders
    const placeholders = this.extractPlaceholders(value);

    // Verificar se existem caracteres { ou } fora de placeholders válidos
    let testValue = value;
    placeholders.forEach(p => {
      testValue = testValue.replace(new RegExp(`\\{${p}\\}`, 'g'), '');
    });

    if (testValue.includes('{') || testValue.includes('}')) {
      return {
        valid: false,
        error: `Invalid placeholder format in: "${value}"\n` +
               '   Placeholder names must start with letter/underscore\n' +
               '   and contain only alphanumeric characters and underscores',
        placeholders: []
      };
    }

    return {
      valid: true,
      error: null,
      placeholders
    };
  }

  /**
   * Resolve placeholders em uma string para seus valores reais
   *
   * Substitui cada placeholder encontrado pelo valor retornado pelo
   * resolver correspondente. Se um placeholder não tiver resolver registrado,
   * lança erro.
   *
   * @param {string} value - String com placeholders para resolver
   * @param {Object} context - Contexto com informações para resolução
   * @param {string} [context.baseDir] - Diretório base para buscar timestamps
   * @param {string} [context.explicitTimestamp] - Timestamp explícito fornecido
   * @param {Object} [context.customValues] - Valores customizados para placeholders
   * @returns {string} String com placeholders substituídos por valores reais
   * @throws {Error} Se placeholder não tiver resolver registrado
   * @throws {Error} Se resolver falhar ao obter valor
   *
   * @example
   * // Resolver timestamp explícito
   * const context = { explicitTimestamp: '20251016-171935' };
   * PlaceholderResolver.resolve('./dir-{timestamp}', context)
   * // './dir-20251016-171935'
   *
   * // Resolver com busca de timestamp
   * const context = { baseDir: './' };
   * PlaceholderResolver.resolve('./dir-{timestamp}', context)
   * // './dir-20251016-171935' (timestamp mais recente encontrado)
   */
  static resolve(value, context = {}) {
    if (!value || typeof value !== 'string') {
      return value;
    }

    // Se não tem placeholder, retornar original
    if (!this.hasPlaceholder(value)) {
      return value;
    }

    // Extrair placeholders
    const placeholders = this.extractPlaceholders(value);

    // Resolver cada placeholder
    let resolved = value;
    const resolvers = PlaceholderResolver.getResolvers();

    for (const placeholder of placeholders) {
      const resolver = resolvers.get(placeholder);

      if (!resolver) {
        throw new Error(
          `Unknown placeholder: {${placeholder}}\n` +
          `   Supported placeholders: ${Array.from(resolvers.keys()).join(', ')}\n` +
          '   💡 Check your configuration for typos'
        );
      }

      try {
        // Chamar resolver com contexto
        const resolvedValue = resolver(context);

        // Substituir placeholder pelo valor resolvido
        resolved = resolved.replace(
          new RegExp(`\\{${placeholder}\\}`, 'g'),
          resolvedValue
        );
      } catch (error) {
        throw new Error(
          `Failed to resolve placeholder {${placeholder}}\n` +
          `   Original value: ${value}\n` +
          `   Context: ${JSON.stringify(context, null, 2)}\n` +
          `   Reason: ${error.message}\n` +
          `   💡 Tip: ${this._getTipForPlaceholder(placeholder)}`
        );
      }
    }

    return resolved;
  }

  /**
   * Registra um novo resolver de placeholder
   *
   * Permite extensibilidade do sistema de placeholders.
   * O resolver deve ser uma função que recebe um contexto e retorna uma string.
   *
   * @param {string} name - Nome do placeholder (sem chaves)
   * @param {Function} resolver - Função que resolve o placeholder
   * @throws {Error} Se nome ou resolver inválidos
   *
   * @example
   * // Registrar novo placeholder
   * PlaceholderResolver.registerResolver('env', (context) => {
   *   return context.environment || 'development';
   * });
   *
   * // Usar novo placeholder
   * PlaceholderResolver.resolve('./dir-{env}', { environment: 'production' })
   * // './dir-production'
   */
  static registerResolver(name, resolver) {
    if (!name || typeof name !== 'string') {
      throw new Error('Placeholder name must be a non-empty string');
    }

    if (typeof resolver !== 'function') {
      throw new Error('Resolver must be a function');
    }

    // Validar que nome segue padrão válido
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      throw new Error(
        `Invalid placeholder name: "${name}"\n` +
        '   Name must start with letter/underscore and contain only alphanumeric characters and underscores'
      );
    }

    const resolvers = PlaceholderResolver.getResolvers();
    resolvers.set(name, resolver);
  }

  /**
   * Obtém o mapa de resolvers registrados
   * @returns {Map} Mapa de resolvers
   * @private
   */
  static getResolvers() {
    if (!PlaceholderResolver._resolvers) {
      PlaceholderResolver._resolvers = new Map([
        ['timestamp', TimestampResolver.resolve.bind(TimestampResolver)]
      ]);
    }
    return PlaceholderResolver._resolvers;
  }

  /**
   * Obtém dica específica para um placeholder
   *
   * @param {string} placeholder - Nome do placeholder
   * @returns {string} Dica para resolver o placeholder
   * @private
   */
  static _getTipForPlaceholder(placeholder) {
    const tips = {
      'timestamp': 'Run \'n8n:download\' first to create a timestamped directory, or provide explicit timestamp'
    };

    return tips[placeholder] || 'Check placeholder configuration and context';
  }

  /**
   * Lista todos os placeholders registrados
   *
   * @returns {string[]} Array com nomes dos placeholders disponíveis
   *
   * @example
   * PlaceholderResolver.listAvailable() // ['timestamp']
   */
  static listAvailable() {
    return Array.from(PlaceholderResolver.getResolvers().keys());
  }
}

module.exports = PlaceholderResolver;
