/**
 * Menu Options Configuration
 *
 * Defines all menu options for the interactive CLI menu.
 * Each option includes:
 * - key: Unique identifier
 * - command: Command name to execute
 * - label: Display text
 * - description: Detailed description
 * - icon: Unicode icon
 * - category: Visual category (action, info, destructive, utility)
 * - shortcut: Keyboard shortcut (optional)
 * - preview: Command preview details (optional)
 *
 * Requirements: REQ-3 (Ícones), REQ-7 (Atalhos), REQ-9 (Preview)
 */

const MENU_OPTIONS = [
  {
    key: '1',
    command: 'n8n:configure-target',
    label: 'Configurar N8N de Destino',
    description: 'Configure a instância N8N de destino onde os workflows serão enviados. Você vai informar a URL e a chave API, testar a conexão e salvar automaticamente no arquivo .env. Esta configuração é necessária antes de fazer upload de workflows.',
    icon: '🎯',
    category: 'action',
    shortcut: 't',
    preview: {
      shellCommand: 'Configurar TARGET_N8N_URL e TARGET_N8N_API_KEY',
      affectedPaths: ['Arquivo .env será atualizado'],
      estimatedDuration: 2,
      warning: '⚠️  As chaves API serão armazenadas no arquivo .env. Mantenha este arquivo seguro e nunca faça commit dele no controle de versão.'
    }
  },
  {
    key: '2',
    command: 'n8n:download',
    label: 'Baixar Workflows do N8N',
    description: 'Faça download e backup de todos os workflows da sua instância N8N de origem. Suporta filtragem por tags e seleção de diretório de saída. Os workflows baixados serão salvos em um diretório com timestamp, preservando estrutura e metadados.',
    icon: '📥',
    category: 'action',
    shortcut: 'd',
    preview: {
      shellCommand: 'docs-jana n8n:download',
      affectedPaths: ['./n8n-workflows-{timestamp}/'],
      estimatedDuration: 5,
      warning: null
    }
  },
  {
    key: '3',
    command: 'n8n:upload',
    label: 'Enviar Workflows para N8N',
    description: 'Envie workflows para sua instância N8N de destino com IDs preservados. Suporta modo dry-run para testar sem fazer alterações. ATENÇÃO: Este comando vai modificar workflows na sua instância N8N. Use --dry-run primeiro para verificar as mudanças.',
    icon: '📤',
    category: 'action',
    shortcut: 'u',
    preview: {
      shellCommand: 'docs-jana n8n:upload --input {path}',
      affectedPaths: ['Instância N8N - Workflows remotos serão modificados'],
      estimatedDuration: 8,
      warning: '⚠️  Este comando vai modificar workflows na sua instância N8N. Sempre use --dry-run primeiro para verificar as mudanças antes de enviar.'
    }
  },
  {
    key: '4',
    command: 'outline:download',
    label: 'Baixar Documentação do Outline',
    description: 'Faça download de toda documentação da sua instância Outline. Suporta filtragem por coleção e caminhos de saída personalizados. Os documentos serão salvos em formato markdown com hierarquia e metadados preservados.',
    icon: '📚',
    category: 'action',
    shortcut: 'o',
    preview: {
      shellCommand: 'docs-jana outline:download',
      affectedPaths: ['./outline-docs-{timestamp}/'],
      estimatedDuration: 10,
      warning: null
    }
  },
  {
    key: '5',
    command: 'history',
    label: 'Ver Histórico de Comandos',
    description: 'Visualize o histórico dos comandos executados recentemente com timestamps e status. Re-execute comandos anteriores ou limpe o histórico. Mostra as últimas 10 execuções com indicadores de sucesso/falha e duração.',
    icon: '📜',
    category: 'info',
    shortcut: 'h',
    preview: null
  },
  {
    key: '6',
    command: 'config',
    label: 'Configurações do Menu',
    description: 'Configure as preferências do menu: tema (padrão, escuro, claro, alto contraste), animações (ativadas/desativadas), ícones e mais. Todas as configurações são salvas em ~/.docs-jana/config.json e aplicadas imediatamente.',
    icon: '⚙️',
    category: 'utility',
    shortcut: 's',
    preview: null
  },
  {
    key: '7',
    command: 'help',
    label: 'Ajuda e Atalhos',
    description: 'Exibe todos os comandos disponíveis, atalhos de teclado e exemplos de uso. Aprenda a navegar no menu de forma eficiente usando setas, Enter, Escape e teclas de atalho.',
    icon: '❓',
    category: 'info',
    shortcut: '?',
    preview: null
  },
  {
    key: '0',
    command: 'exit',
    label: 'Sair',
    description: 'Encerra a aplicação CLI. Todo o histórico e configurações serão salvos automaticamente antes de sair.',
    icon: '🚪',
    category: 'utility',
    shortcut: 'q',
    preview: null
  }
];

/**
 * Get all menu options
 * @returns {Array} Array of menu option objects
 */
function getAllOptions() {
  return [...MENU_OPTIONS];
}

/**
 * Get option by command name
 * @param {string} commandName - Command name
 * @returns {Object|null} Menu option or null if not found
 */
function getOptionByCommand(commandName) {
  return MENU_OPTIONS.find(opt => opt.command === commandName) || null;
}

/**
 * Get option by shortcut key
 * @param {string} key - Shortcut key
 * @returns {Object|null} Menu option or null if not found
 */
function getOptionByShortcut(key) {
  return MENU_OPTIONS.find(opt => opt.shortcut === key) || null;
}

/**
 * Get option by numeric key
 * @param {string} key - Numeric key (0-9)
 * @returns {Object|null} Menu option or null if not found
 */
function getOptionByKey(key) {
  return MENU_OPTIONS.find(opt => opt.key === key) || null;
}

/**
 * Get options by category
 * @param {string} category - Category (action, info, destructive, utility)
 * @returns {Array} Array of matching menu options
 */
function getOptionsByCategory(category) {
  return MENU_OPTIONS.filter(opt => opt.category === category);
}

module.exports = {
  MENU_OPTIONS,
  getAllOptions,
  getOptionByCommand,
  getOptionByShortcut,
  getOptionByKey,
  getOptionsByCategory
};
