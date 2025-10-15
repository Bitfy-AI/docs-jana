/**
 * KeyboardMapper - Mapeamento de teclas para ações
 *
 * Responsável por:
 * - Mapear teclas físicas para ações lógicas
 * - Suportar atalhos customizáveis
 * - Detectar conflitos de atalhos
 * - Fornecer mapeamentos padrão (setas, números, letras)
 *
 * Requirements: REQ-6 (Atalhos de Teclado)
 */

class KeyboardMapper {
  /**
   * Inicializa o mapeador com atalhos padrão
   */
  constructor() {
    // Mapeamentos padrão
    this.defaultMappings = this.getDefaultMappings();

    // Mapeamentos customizados (sobrescrevem os padrões)
    this.customMappings = new Map();

    // Atalhos reservados (não podem ser sobrescritos)
    this.reservedKeys = new Set(['up', 'down', 'left', 'right', 'enter', 'escape', 'space']);
  }

  /**
   * Define os mapeamentos padrão do teclado
   * @private
   * @returns {Map} Mapeamentos padrão
   */
  getDefaultMappings() {
    const mappings = new Map();

    // Navegação
    mappings.set('up', { action: 'navigate-up', description: 'Move para opção anterior' });
    mappings.set('down', { action: 'navigate-down', description: 'Move para próxima opção' });

    // Seleção
    mappings.set('enter', { action: 'select', description: 'Seleciona/executa opção atual' });
    mappings.set('space', { action: 'select', description: 'Seleciona/executa opção atual' });

    // Sistema
    mappings.set('q', { action: 'quit', description: 'Sair do menu' });
    mappings.set('escape', { action: 'quit', description: 'Sair do menu' });

    // Utilitários
    mappings.set('h', { action: 'help', description: 'Exibir ajuda' });
    mappings.set('?', { action: 'help', description: 'Exibir ajuda' });
    mappings.set('r', { action: 'refresh', description: 'Recarregar/atualizar' });
    mappings.set('p', { action: 'preview', description: 'Visualizar preview' });
    mappings.set('backspace', { action: 'history', description: 'Ver histórico' });
    mappings.set('c', { action: 'config', description: 'Configurações' });

    // Seleção direta (números 1-9)
    for (let i = 1; i <= 9; i++) {
      mappings.set(String(i), {
        action: `select-${i}`,
        description: `Selecionar opção ${i}`
      });
    }

    return mappings;
  }

  /**
   * Obtém a ação associada a uma tecla
   * @param {string} key - Tecla pressionada (normalizada)
   * @returns {string|null} Nome da ação ou null se não mapeada
   */
  getAction(key) {
    if (!key || typeof key !== 'string') {
      return null;
    }

    // Normaliza a tecla (lowercase, trim)
    const normalizedKey = key.toLowerCase().trim();

    // Verifica primeiro nos mapeamentos customizados
    if (this.customMappings.has(normalizedKey)) {
      return this.customMappings.get(normalizedKey).action;
    }

    // Depois verifica nos mapeamentos padrão
    if (this.defaultMappings.has(normalizedKey)) {
      return this.defaultMappings.get(normalizedKey).action;
    }

    // Tecla não mapeada
    return null;
  }

  /**
   * Customiza mapeamento de teclas
   * @param {Object} mappings - Objeto com mapeamentos { key: action }
   * @throws {Error} Se houver conflito ou tecla reservada
   */
  customizeKeymap(mappings) {
    if (!mappings || typeof mappings !== 'object') {
      throw new Error('Mappings must be an object');
    }

    // Valida todos os mapeamentos antes de aplicar
    const validatedMappings = new Map();

    for (const [key, action] of Object.entries(mappings)) {
      const normalizedKey = key.toLowerCase().trim();

      // Valida conflito com teclas de navegação essenciais PRIMEIRO
      if (this.isNavigationKey(normalizedKey)) {
        throw new Error(`Cannot override navigation key: ${normalizedKey}`);
      }

      // Valida tecla reservada (inclui navigation keys)
      if (this.reservedKeys.has(normalizedKey)) {
        throw new Error(`Cannot override reserved key: ${normalizedKey}`);
      }

      // Valida formato da ação (pode ser string ou objeto com action)
      let actionValue = action;
      if (typeof action === 'object' && action !== null && action.action) {
        actionValue = action.action;
      }

      if (!actionValue || typeof actionValue !== 'string' || actionValue.trim() === '') {
        throw new Error(`Invalid action for key "${key}": must be a non-empty string`);
      }

      validatedMappings.set(normalizedKey, {
        action: actionValue.trim(),
        description: action.description || `Custom: ${actionValue.trim()}`
      });
    }

    // Verifica conflitos internos (mesma tecla mapeada para ações diferentes)
    const conflicts = this.detectConflicts(validatedMappings);
    if (conflicts.length > 0) {
      throw new Error(`Key conflicts detected: ${conflicts.join(', ')}`);
    }

    // Aplica mapeamentos customizados
    for (const [key, mapping] of validatedMappings.entries()) {
      this.customMappings.set(key, mapping);
    }
  }

  /**
   * Remove mapeamento customizado
   * @param {string} key - Tecla a ser removida
   */
  removeCustomMapping(key) {
    const normalizedKey = key.toLowerCase().trim();
    this.customMappings.delete(normalizedKey);
  }

  /**
   * Limpa todos os mapeamentos customizados
   */
  clearCustomMappings() {
    this.customMappings.clear();
  }

  /**
   * Obtém todos os atalhos (padrão + customizados)
   * @returns {Array<{key: string, action: string, description: string}>}
   */
  getAllShortcuts() {
    const shortcuts = [];

    // Adiciona mapeamentos padrão
    for (const [key, mapping] of this.defaultMappings.entries()) {
      if (!this.customMappings.has(key)) {
        shortcuts.push({
          key,
          action: mapping.action,
          description: mapping.description,
          type: 'default'
        });
      }
    }

    // Adiciona mapeamentos customizados (sobrescrevem padrão)
    for (const [key, mapping] of this.customMappings.entries()) {
      shortcuts.push({
        key,
        action: mapping.action,
        description: mapping.description,
        type: 'custom'
      });
    }

    // Ordena por tipo e tecla
    return shortcuts.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'default' ? -1 : 1;
      }
      return a.key.localeCompare(b.key);
    });
  }

  /**
   * Valida se uma tecla está disponível para customização
   * @param {string} key - Tecla a validar
   * @returns {boolean} True se disponível
   */
  isAvailable(key) {
    const normalizedKey = key.toLowerCase().trim();

    // Verifica se é reservada ou de navegação
    if (this.reservedKeys.has(normalizedKey) || this.isNavigationKey(normalizedKey)) {
      return false;
    }

    // Verifica se já está em uso (padrão ou customizado)
    if (this.defaultMappings.has(normalizedKey) || this.customMappings.has(normalizedKey)) {
      return false;
    }

    return true;
  }

  /**
   * Verifica se uma tecla é de navegação essencial
   * @private
   * @param {string} key - Tecla normalizada
   * @returns {boolean}
   */
  isNavigationKey(key) {
    return ['up', 'down', 'left', 'right', 'enter', 'escape', 'space'].includes(key);
  }

  /**
   * Detecta conflitos em um conjunto de mapeamentos
   * @private
   * @param {Map} mappings - Mapeamentos a verificar
   * @returns {Array<string>} Lista de teclas com conflito
   */
  detectConflicts(mappings) {
    const conflicts = [];
    const seenKeys = new Set();

    for (const key of mappings.keys()) {
      if (seenKeys.has(key)) {
        conflicts.push(key);
      }
      seenKeys.add(key);
    }

    return conflicts;
  }

  /**
   * Verifica se uma tecla é case-sensitive
   * @param {string} key - Tecla a verificar
   * @returns {boolean}
   */
  isCaseSensitive(key) {
    // Por padrão, tratamos teclas como case-insensitive
    // Mas podemos ter casos especiais no futuro
    return false;
  }

  /**
   * Obtém descrição de uma tecla
   * @param {string} key - Tecla
   * @returns {string|null} Descrição ou null
   */
  getDescription(key) {
    const normalizedKey = key.toLowerCase().trim();

    if (this.customMappings.has(normalizedKey)) {
      return this.customMappings.get(normalizedKey).description;
    }

    if (this.defaultMappings.has(normalizedKey)) {
      return this.defaultMappings.get(normalizedKey).description;
    }

    return null;
  }

  /**
   * Exporta configuração atual para persistência
   * @returns {Object} Configuração serializável
   */
  exportConfig() {
    const config = {
      version: '1.0',
      customMappings: {}
    };

    for (const [key, mapping] of this.customMappings.entries()) {
      config.customMappings[key] = {
        action: mapping.action,
        description: mapping.description
      };
    }

    return config;
  }

  /**
   * Importa configuração de mapeamentos
   * @param {Object} config - Configuração a importar
   * @throws {Error} Se configuração inválida
   */
  importConfig(config) {
    if (!config || !config.customMappings) {
      throw new Error('Invalid config format');
    }

    // Salva estado atual para rollback
    const previousMappings = new Map(this.customMappings);

    // Limpa mapeamentos atuais
    this.customMappings.clear();

    // Aplica novos mapeamentos
    try {
      this.customizeKeymap(config.customMappings);
    } catch (error) {
      // Se falhar, restaura estado anterior
      this.customMappings = previousMappings;
      throw error;
    }
  }
}

module.exports = KeyboardMapper;
