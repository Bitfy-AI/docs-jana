/**
 * Plugin Registry for n8n-transfer
 *
 * Sistema de registro e descoberta automática de plugins para o n8n-transfer.
 * Gerencia plugins de deduplicação, validação e geração de relatórios,
 * permitindo registro manual e auto-discovery de plugins customizados.
 *
 * @module n8n-transfer/core/plugin-registry
 * @author docs-jana
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const { BasePlugin } = require('../plugins/index.js');

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Estatísticas do registry de plugins
 *
 * @typedef {Object} RegistryStats
 * @property {number} total - Total de plugins registrados
 * @property {number} enabled - Quantidade de plugins habilitados
 * @property {number} disabled - Quantidade de plugins desabilitados
 * @property {Object} byType - Contagem por tipo de plugin
 * @property {number} byType.deduplicator - Quantidade de deduplicadores
 * @property {number} byType.validator - Quantidade de validadores
 * @property {number} byType.reporter - Quantidade de reporters
 */

/**
 * Resultado da descoberta de plugins
 *
 * @typedef {Object} DiscoveryResult
 * @property {number} total - Total de arquivos encontrados
 * @property {number} loaded - Quantidade de plugins carregados
 * @property {number} failed - Quantidade de falhas
 * @property {string[]} plugins - Lista de nomes de plugins descobertos
 * @property {Object[]} errors - Lista de erros que ocorreram
 */

// ============================================================================
// PluginRegistry Class
// ============================================================================

/**
 * Sistema de registro e gerenciamento de plugins
 *
 * O PluginRegistry é responsável por:
 * - Registrar plugins manualmente via register()
 * - Descobrir e carregar plugins automaticamente de diretórios
 * - Validar plugins usando BasePlugin como interface
 * - Gerenciar ciclo de vida (enable/disable)
 * - Fornecer busca e filtragem de plugins
 *
 * @class PluginRegistry
 *
 * @example
 * // Uso básico
 * const registry = new PluginRegistry();
 *
 * // Registro manual
 * const myPlugin = new CustomValidator();
 * registry.register(myPlugin);
 *
 * // Auto-discovery
 * registry.discover('./plugins/validators');
 *
 * // Buscar plugin
 * const plugin = registry.get('custom-validator');
 * if (plugin && plugin.isEnabled()) {
 *   const result = plugin.validate(workflow);
 * }
 *
 * @example
 * // Uso avançado com filtragem
 * const registry = new PluginRegistry();
 * registry.discover('./plugins');
 *
 * // Listar por tipo
 * const validators = registry.listByType('validator');
 * validators.forEach(validator => {
 *   console.log(`${validator.getName()} v${validator.getVersion()}`);
 * });
 *
 * // Estatísticas
 * const stats = registry.getStats();
 * console.log(`Total: ${stats.total}, Habilitados: ${stats.enabled}`);
 */
class PluginRegistry {
  /**
   * Cria uma nova instância do PluginRegistry
   *
   * @constructor
   *
   * @example
   * const registry = new PluginRegistry();
   */
  constructor() {
    /**
     * Mapa de plugins registrados
     * @type {Map<string, BasePlugin>}
     * @private
     */
    this._plugins = new Map();

    /**
     * Mapa de plugins por tipo para busca rápida
     * @type {Map<string, Set<string>>}
     * @private
     */
    this._pluginsByType = new Map();
    this._pluginsByType.set('deduplicator', new Set());
    this._pluginsByType.set('validator', new Set());
    this._pluginsByType.set('reporter', new Set());
  }

  /**
   * Registra um plugin manualmente
   *
   * Valida o plugin usando BasePlugin e adiciona ao registry.
   * Se um plugin com o mesmo nome já existir, lança erro.
   *
   * @param {BasePlugin} plugin - Instância do plugin a ser registrado
   * @throws {Error} Se plugin não for uma instância de BasePlugin
   * @throws {Error} Se plugin com mesmo nome já estiver registrado
   * @throws {Error} Se plugin não implementar métodos obrigatórios
   *
   * @example
   * const myPlugin = new CustomValidator();
   * registry.register(myPlugin);
   *
   * @example
   * // Registro com validação de tipo
   * class MyDeduplicator extends BasePlugin {
   *   constructor() {
   *     super('my-dedup', '1.0.0', 'deduplicator');
   *   }
   *   isDuplicate(workflow, existingWorkflows) {
   *     return existingWorkflows.some(w => w.id === workflow.id);
   *   }
   * }
   * const dedup = new MyDeduplicator();
   * registry.register(dedup);
   */
  register(plugin) {
    // Validar que é instância de BasePlugin
    if (!(plugin instanceof BasePlugin)) {
      throw new Error(
        'Plugin deve ser uma instância de BasePlugin. ' +
        'Use: class MyPlugin extends BasePlugin { ... }'
      );
    }

    // Validar métodos obrigatórios baseado no tipo
    this._validatePluginInterface(plugin);

    // Verificar duplicatas
    const pluginName = plugin.getName();
    if (this._plugins.has(pluginName)) {
      throw new Error(
        `Plugin '${pluginName}' já está registrado. ` +
        'Use um nome único ou chame unregister() primeiro.'
      );
    }

    // Registrar plugin
    this._plugins.set(pluginName, plugin);

    // Adicionar ao índice por tipo
    const type = plugin.getType();
    this._pluginsByType.get(type).add(pluginName);
  }

  /**
   * Busca um plugin por nome
   *
   * A busca é case-insensitive para facilitar o uso.
   *
   * @param {string} name - Nome do plugin
   * @returns {BasePlugin|null} Plugin encontrado ou null
   *
   * @example
   * const plugin = registry.get('custom-validator');
   * if (plugin) {
   *   console.log(`Encontrado: ${plugin.getName()} v${plugin.getVersion()}`);
   * }
   *
   * @example
   * // Busca case-insensitive
   * registry.register(new MyPlugin('My-Validator', '1.0.0', 'validator'));
   * const plugin1 = registry.get('my-validator'); // encontra
   * const plugin2 = registry.get('MY-VALIDATOR'); // encontra
   * const plugin3 = registry.get('My-Validator'); // encontra
   */
  get(name) {
    if (!name || typeof name !== 'string') {
      return null;
    }

    // Busca exata primeiro
    if (this._plugins.has(name)) {
      return this._plugins.get(name);
    }

    // Busca case-insensitive
    const lowerName = name.toLowerCase();
    for (const [key, plugin] of this._plugins.entries()) {
      if (key.toLowerCase() === lowerName) {
        return plugin;
      }
    }

    return null;
  }

  /**
   * Descobre e carrega plugins automaticamente de um diretório
   *
   * Escaneia o diretório especificado em busca de arquivos .js,
   * tenta carregar cada arquivo e validar se é um plugin válido.
   * Plugins válidos são automaticamente registrados.
   *
   * @param {string} directory - Caminho absoluto ou relativo do diretório
   * @returns {DiscoveryResult} Resultado da descoberta
   * @throws {Error} Se diretório não existir ou não for acessível
   *
   * @example
   * // Descobrir plugins em diretório
   * const result = registry.discover('./plugins/validators');
   * console.log(`Carregados: ${result.loaded}/${result.total}`);
   * result.errors.forEach(err => console.error(err.message));
   *
   * @example
   * // Descobrir recursivamente
   * const dirs = ['./plugins/validators', './plugins/deduplicators', './plugins/reporters'];
   * dirs.forEach(dir => {
   *   const result = registry.discover(dir);
   *   console.log(`${dir}: ${result.loaded} plugins carregados`);
   * });
   */
  discover(directory) {
    const result = {
      total: 0,
      loaded: 0,
      failed: 0,
      plugins: [],
      errors: []
    };

    // Validar que diretório existe
    if (!fs.existsSync(directory)) {
      throw new Error(`Diretório não encontrado: ${directory}`);
    }

    const stats = fs.statSync(directory);
    if (!stats.isDirectory()) {
      throw new Error(`Caminho não é um diretório: ${directory}`);
    }

    // Ler arquivos do diretório
    const files = fs.readdirSync(directory);
    const jsFiles = files.filter(file => file.endsWith('.js'));

    result.total = jsFiles.length;

    // Tentar carregar cada arquivo
    for (const file of jsFiles) {
      const filePath = path.join(directory, file);

      try {
        // Require do arquivo
        const module = require(filePath);

        // Tentar extrair plugin do módulo
        const plugin = this._extractPluginFromModule(module, file);

        if (plugin) {
          // Validar e registrar
          this.register(plugin);
          result.loaded++;
          result.plugins.push(plugin.getName());
        } else {
          result.failed++;
          result.errors.push({
            file,
            message: 'Módulo não exporta plugin válido'
          });
        }
      } catch (error) {
        result.failed++;
        result.errors.push({
          file,
          message: error.message,
          stack: error.stack
        });
      }
    }

    return result;
  }

  /**
   * Lista todos os plugins de um tipo específico
   *
   * @param {'deduplicator'|'validator'|'reporter'} type - Tipo de plugin
   * @returns {BasePlugin[]} Array de plugins do tipo especificado
   *
   * @example
   * // Listar todos os validadores
   * const validators = registry.listByType('validator');
   * validators.forEach(v => {
   *   console.log(`${v.getName()}: ${v.getDescription()}`);
   * });
   *
   * @example
   * // Executar todos os validadores habilitados
   * const validators = registry.listByType('validator')
   *   .filter(v => v.isEnabled());
   *
   * for (const validator of validators) {
   *   const result = validator.validate(workflow);
   *   if (!result.valid) {
   *     console.error(`Validação falhou: ${result.errors.join(', ')}`);
   *   }
   * }
   */
  listByType(type) {
    const validTypes = ['deduplicator', 'validator', 'reporter'];
    if (!validTypes.includes(type)) {
      throw new Error(`Tipo inválido: ${type}. Use: ${validTypes.join(', ')}`);
    }

    const pluginNames = this._pluginsByType.get(type);
    return Array.from(pluginNames).map(name => this._plugins.get(name));
  }

  /**
   * Retorna todos os plugins registrados
   *
   * @returns {BasePlugin[]} Array com todos os plugins
   *
   * @example
   * const allPlugins = registry.getAll();
   * console.log(`Total de plugins: ${allPlugins.length}`);
   *
   * @example
   * // Listar info de todos os plugins
   * registry.getAll().forEach(plugin => {
   *   const info = plugin.getInfo();
   *   console.log(JSON.stringify(info, null, 2));
   * });
   */
  getAll() {
    return Array.from(this._plugins.values());
  }

  /**
   * Remove um plugin do registry
   *
   * @param {string} name - Nome do plugin a ser removido
   * @returns {boolean} true se plugin foi removido, false se não foi encontrado
   *
   * @example
   * if (registry.unregister('old-validator')) {
   *   console.log('Plugin removido com sucesso');
   * }
   *
   * @example
   * // Remover todos os plugins desabilitados
   * registry.getAll().forEach(plugin => {
   *   if (!plugin.isEnabled()) {
   *     registry.unregister(plugin.getName());
   *   }
   * });
   */
  unregister(name) {
    const plugin = this.get(name);

    if (!plugin) {
      return false;
    }

    // Remover do mapa principal
    this._plugins.delete(plugin.getName());

    // Remover do índice por tipo
    const type = plugin.getType();
    this._pluginsByType.get(type).delete(plugin.getName());

    return true;
  }

  /**
   * Remove todos os plugins do registry
   *
   * @example
   * registry.clear();
   * console.log(registry.getStats().total); // 0
   */
  clear() {
    this._plugins.clear();
    this._pluginsByType.get('deduplicator').clear();
    this._pluginsByType.get('validator').clear();
    this._pluginsByType.get('reporter').clear();
  }

  /**
   * Retorna estatísticas do registry
   *
   * @returns {RegistryStats} Estatísticas do registry
   *
   * @example
   * const stats = registry.getStats();
   * console.log(`
   *   Total: ${stats.total}
   *   Habilitados: ${stats.enabled}
   *   Desabilitados: ${stats.disabled}
   *   Deduplicadores: ${stats.byType.deduplicator}
   *   Validadores: ${stats.byType.validator}
   *   Reporters: ${stats.byType.reporter}
   * `);
   */
  getStats() {
    const plugins = this.getAll();

    return {
      total: plugins.length,
      enabled: plugins.filter(p => p.isEnabled()).length,
      disabled: plugins.filter(p => !p.isEnabled()).length,
      byType: {
        deduplicator: this._pluginsByType.get('deduplicator').size,
        validator: this._pluginsByType.get('validator').size,
        reporter: this._pluginsByType.get('reporter').size
      }
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Valida que o plugin implementa a interface obrigatória do seu tipo
   *
   * @private
   * @param {BasePlugin} plugin - Plugin a ser validado
   * @throws {Error} Se plugin não implementar métodos obrigatórios
   */
  _validatePluginInterface(plugin) {
    const type = plugin.getType();
    const requiredMethods = {
      'deduplicator': ['isDuplicate'],
      'validator': ['validate'],
      'reporter': ['generate']
    };

    const methods = requiredMethods[type] || [];
    const missing = methods.filter(method => typeof plugin[method] !== 'function');

    if (missing.length > 0) {
      throw new Error(
        `Plugin '${plugin.getName()}' do tipo '${type}' deve implementar os métodos: ${missing.join(', ')}`
      );
    }
  }

  /**
   * Extrai plugin de um módulo carregado
   *
   * Tenta diferentes padrões de exportação:
   * - module.exports = new Plugin()
   * - module.exports = Plugin (class)
   * - module.exports.default = Plugin
   *
   * @private
   * @param {*} module - Módulo carregado via require()
   * @param {string} _filename - Nome do arquivo (para mensagens de erro)
   * @returns {BasePlugin|null} Plugin extraído ou null
   */
  _extractPluginFromModule(module, _filename) {
    // Caso 1: Módulo exporta instância direta
    if (module instanceof BasePlugin) {
      return module;
    }

    // Caso 2: Módulo exporta classe
    if (typeof module === 'function' && module.prototype instanceof BasePlugin) {
      return new module();
    }

    // Caso 3: Módulo exporta { default: Plugin }
    if (module.default) {
      if (module.default instanceof BasePlugin) {
        return module.default;
      }
      if (typeof module.default === 'function' && module.default.prototype instanceof BasePlugin) {
        return new module.default();
      }
    }

    // Caso 4: Módulo exporta { Plugin: Plugin }
    const exportedKeys = Object.keys(module);
    for (const key of exportedKeys) {
      const exported = module[key];

      if (exported instanceof BasePlugin) {
        return exported;
      }

      if (typeof exported === 'function' && exported.prototype instanceof BasePlugin) {
        return new exported();
      }
    }

    return null;
  }
}

// ============================================================================
// Exports
// ============================================================================

module.exports = PluginRegistry;
