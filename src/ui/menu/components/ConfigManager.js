/**
 * ConfigManager - Gerenciamento de configurações do usuário
 *
 * Responsável por gerenciar preferências do usuário, incluindo:
 * - Carregamento de configurações do arquivo ~/.docs-jana/config.json
 * - Salvamento de preferências personalizadas
 * - Validação de valores de configuração
 * - Migração de versões de configuração
 * - Valores padrão quando arquivo não existe
 *
 * Requirements: REQ-10 (Configuração Personalizável), REQ-11 (Modularização)
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

/**
 * Configuração padrão
 */
const DEFAULT_CONFIG = {
  version: '1.0',
  preferences: {
    theme: 'default',
    animationsEnabled: true,
    animationSpeed: 'normal',
    iconsEnabled: true,
    showDescriptions: true,
    showPreviews: true,
    historySize: 50,
    keyboardShortcuts: {
      help: ['h', '?'],
      exit: ['q', 'Escape'],
      rerun: ['r']
    }
  }
};

/**
 * Diretório de configuração do usuário
 */
const CONFIG_DIR = path.join(os.homedir(), '.docs-jana');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

class ConfigManager {
  constructor() {
    this.config = null;
    this.configPath = CONFIG_FILE;
  }

  /**
   * Carrega configurações do arquivo ou retorna configuração padrão
   * @returns {Promise<Object>} Configuração carregada
   */
  async load() {
    try {
      // Verifica se arquivo existe
      await fs.access(this.configPath);

      // Lê e parseia o arquivo
      const fileContent = await fs.readFile(this.configPath, 'utf-8');
      const loadedConfig = JSON.parse(fileContent);

      // Valida e migra se necessário
      this.config = this.validateAndMigrate(loadedConfig);

      return this.config;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Arquivo não existe, usa configuração padrão
        this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

        // Salva configuração padrão
        await this.save(this.config);

        return this.config;
      } else if (error instanceof SyntaxError) {
        // JSON corrompido, usa configuração padrão
        console.warn('Config file is corrupted. Using default configuration.');
        this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

        // Salva configuração padrão (sobrescreve o corrompido)
        await this.save(this.config);

        return this.config;
      }

      // Outro erro, propaga
      throw error;
    }
  }

  /**
   * Salva configurações no arquivo
   * @param {Object} config - Configuração a salvar
   * @returns {Promise<void>}
   */
  async save(config = null) {
    const configToSave = config || this.config;

    if (!configToSave) {
      throw new Error('No configuration to save');
    }

    // Valida antes de salvar
    this.validateConfig(configToSave);

    try {
      // Garante que o diretório existe
      await fs.mkdir(CONFIG_DIR, { recursive: true });

      // Salva com formatação
      const content = JSON.stringify(configToSave, null, 2);
      await fs.writeFile(this.configPath, content, {
        encoding: 'utf-8',
        mode: 0o600  // Permissões restritas (somente owner)
      });

      this.config = configToSave;
    } catch (error) {
      throw new Error(`Failed to save configuration: ${error.message}`);
    }
  }

  /**
   * Obtém valor de configuração por chave
   * @param {string} key - Chave da configuração (ex: 'theme' ou 'preferences.theme')
   * @returns {*} Valor da configuração
   */
  get(key) {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call load() first.');
    }

    const keys = key.split('.');
    let value = this.config;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Define valor de configuração
   * @param {string} key - Chave da configuração
   * @param {*} value - Valor a definir
   */
  set(key, value) {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call load() first.');
    }

    const keys = key.split('.');
    let target = this.config;

    // Navega até o penúltimo nível
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in target) || typeof target[k] !== 'object') {
        target[k] = {};
      }
      target = target[k];
    }

    // Define o valor
    const lastKey = keys[keys.length - 1];
    target[lastKey] = value;

    // Valida a configuração atualizada
    this.validateConfig(this.config);
  }

  /**
   * Reseta para valores padrão
   * @returns {Promise<void>}
   */
  async reset() {
    this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    await this.save(this.config);
  }

  /**
   * Valida configuração
   * @private
   * @param {Object} config - Configuração a validar
   * @throws {Error} Se configuração inválida
   */
  validateConfig(config) {
    if (!config || typeof config !== 'object') {
      throw new Error('Config must be an object');
    }

    if (!config.version) {
      throw new Error('Config must have a version');
    }

    if (!config.preferences || typeof config.preferences !== 'object') {
      throw new Error('Config must have preferences object');
    }

    const prefs = config.preferences;

    // Valida theme
    const validThemes = ['default', 'dark', 'light', 'high-contrast'];
    if (prefs.theme && !validThemes.includes(prefs.theme)) {
      throw new Error(`Invalid theme: ${prefs.theme}. Must be one of: ${validThemes.join(', ')}`);
    }

    // Valida animationSpeed
    const validSpeeds = ['slow', 'normal', 'fast'];
    if (prefs.animationSpeed && !validSpeeds.includes(prefs.animationSpeed)) {
      throw new Error(`Invalid animationSpeed: ${prefs.animationSpeed}. Must be one of: ${validSpeeds.join(', ')}`);
    }

    // Valida booleanos
    const booleanFields = ['animationsEnabled', 'iconsEnabled', 'showDescriptions', 'showPreviews'];
    for (const field of booleanFields) {
      if (field in prefs && typeof prefs[field] !== 'boolean') {
        throw new Error(`${field} must be a boolean`);
      }
    }

    // Valida historySize
    if (prefs.historySize !== undefined) {
      if (typeof prefs.historySize !== 'number' || prefs.historySize < 1 || prefs.historySize > 1000) {
        throw new Error('historySize must be a number between 1 and 1000');
      }
    }
  }

  /**
   * Valida e migra configuração se necessário
   * @private
   * @param {Object} config - Configuração carregada
   * @returns {Object} Configuração validada e migrada
   */
  validateAndMigrate(config) {
    // Copia configuração padrão
    const migratedConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

    // Atualiza versão
    if (config.version) {
      migratedConfig.version = config.version;
    }

    // Merge preferences (preserva valores válidos do usuário)
    if (config.preferences && typeof config.preferences === 'object') {
      const prefs = config.preferences;

      // Migra cada campo individualmente
      if ('theme' in prefs) migratedConfig.preferences.theme = prefs.theme;
      if ('animationsEnabled' in prefs) migratedConfig.preferences.animationsEnabled = prefs.animationsEnabled;
      if ('animationSpeed' in prefs) migratedConfig.preferences.animationSpeed = prefs.animationSpeed;
      if ('iconsEnabled' in prefs) migratedConfig.preferences.iconsEnabled = prefs.iconsEnabled;
      if ('showDescriptions' in prefs) migratedConfig.preferences.showDescriptions = prefs.showDescriptions;
      if ('showPreviews' in prefs) migratedConfig.preferences.showPreviews = prefs.showPreviews;
      if ('historySize' in prefs) migratedConfig.preferences.historySize = prefs.historySize;

      // Migra keyboard shortcuts se existir
      if ('keyboardShortcuts' in prefs && typeof prefs.keyboardShortcuts === 'object') {
        migratedConfig.preferences.keyboardShortcuts = {
          ...DEFAULT_CONFIG.preferences.keyboardShortcuts,
          ...prefs.keyboardShortcuts
        };
      }
    }

    // Valida configuração migrada
    try {
      this.validateConfig(migratedConfig);
    } catch (error) {
      console.warn(`Config validation failed after migration: ${error.message}. Using defaults.`);
      return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    }

    return migratedConfig;
  }

  /**
   * Obtém configuração padrão
   * @static
   * @returns {Object} Configuração padrão
   */
  static getDefaultConfig() {
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }
}

module.exports = ConfigManager;
