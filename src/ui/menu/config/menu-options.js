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
    icon: 'target',
    category: 'action',
    shortcut: 't',
    environments: ['dev', 'prod'], // Disponível em todos os ambientes
    preview: {
      shellCommand: 'Configurar TARGET_N8N_URL e TARGET_N8N_API_KEY',
      affectedPaths: ['Arquivo .env será atualizado'],
      estimatedDuration: 2,
      warning: 'As chaves API serão armazenadas no arquivo .env. Mantenha este arquivo seguro e nunca faça commit dele no controle de versão.'
    }
  },
  {
    key: '2',
    command: 'n8n:download',
    label: 'Baixar Workflows do N8N',
    description: 'Faça download e backup de todos os workflows da sua instância N8N de origem. Suporta filtragem por tags e seleção de diretório de saída. Os workflows baixados serão salvos em um diretório com timestamp, preservando estrutura e metadados.',
    icon: 'download',
    category: 'action',
    shortcut: 'd',
    environments: ['dev'], // Apenas em DEV (usado para backup do próprio n8n)
    preview: {
      shellCommand: 'docs-jana n8n:download',
      affectedPaths: ['./n8n-workflows-{timestamp}/'],
      estimatedDuration: 5,
      warning: null
    }
  },
  {
    key: '3',
    command: 'n8n:compare',
    label: 'Comparar Workflows (Local vs N8N)',
    description: 'NOVATOS: Use isto ANTES de enviar workflows!\n\nCompara os workflows da pasta local com os workflows no seu N8N de destino.\n\nMostra:\n• Quais workflows são NOVOS (não existem no N8N)\n• Quais workflows foram MODIFICADOS (têm versão diferente)\n• Quais workflows são IDÊNTICOS (sem mudanças)\n\nExemplo de versões:\n• (AAA-AAA-001) = versão 1\n• (AAA-AAA-002) = versão 2\n\nIsso ajuda você a saber EXATAMENTE o que vai ser enviado antes de fazer upload!',
    icon: 'stats',
    category: 'info',
    shortcut: 'c',
    environments: ['dev', 'prod'],
    preview: {
      shellCommand: 'pnpm start (selecione esta opção)',
      affectedPaths: ['Nenhuma - apenas visualização'],
      estimatedDuration: 3,
      warning: null
    }
  },
  {
    key: '4',
    command: 'n8n:dry-run',
    label: 'Simular Envio (Dry Run)',
    description: 'NOVATOS: O que é DRY-RUN?\n\nDry-run = "SIMULAR" ou "TESTAR"\n\nEsta opção vai SIMULAR o envio dos workflows SEM fazer nenhuma alteração real no N8N.\n\nÉ como um "teste" para você ver:\n• Se tem algum erro\n• Quais workflows seriam enviados\n• Se tudo está correto\n\nNADA é modificado no N8N! É 100% seguro.\n\nDepois de testar aqui, use a opção "Enviar Workflows" para fazer o envio de verdade.',
    icon: 'refresh',
    category: 'action',
    shortcut: 'r',
    environments: ['dev', 'prod'],
    preview: {
      shellCommand: 'pnpm start (selecione esta opção)',
      affectedPaths: ['Nenhuma - apenas simulação'],
      estimatedDuration: 5,
      warning: 'Nenhum workflow será modificado. Esta é apenas uma simulação.'
    }
  },
  {
    key: '5',
    command: 'n8n:upload',
    label: 'Enviar Workflows para N8N',
    description: 'ATENÇÃO: Esta opção VAI MODIFICAR workflows no seu N8N!\n\nAntes de usar esta opção, SEMPRE faça:\n1º - Comparar Workflows (opção 3)\n2º - Simular Envio (opção 4)\n\nSó use esta opção quando tiver certeza de que quer enviar os workflows para o N8N.\n\nO que acontece:\n• Workflows locais são enviados para o N8N\n• Workflows no N8N são SUBSTITUÍDOS pelos locais\n• IDs dos workflows são preservados\n• Mudanças são PERMANENTES',
    icon: 'upload',
    category: 'destructive',
    shortcut: 'u',
    environments: ['dev', 'prod'],
    preview: {
      shellCommand: 'pnpm start (selecione esta opção)',
      affectedPaths: ['Instância N8N - Workflows SERÃO MODIFICADOS!'],
      estimatedDuration: 8,
      warning: 'ATENÇÃO! Esta ação VAI MODIFICAR workflows no N8N de verdade. Use Dry Run primeiro!'
    }
  },
  {
    key: '6',
    command: 'outline:download',
    label: 'Baixar Documentação do Outline',
    description: 'Faça download de toda documentação da sua instância Outline. Suporta filtragem por coleção e caminhos de saída personalizados. Os documentos serão salvos em formato markdown com hierarquia e metadados preservados.',
    icon: 'docs',
    category: 'action',
    shortcut: 'o',
    environments: ['dev'], // Apenas em DEV (usado para backup da documentação)
    preview: {
      shellCommand: 'pnpm start (selecione esta opção)',
      affectedPaths: ['./outline-docs-{timestamp}/'],
      estimatedDuration: 10,
      warning: null
    }
  },
  {
    key: '8',
    command: 'history',
    label: 'Ver Histórico de Comandos',
    description: 'Visualize o histórico dos comandos executados recentemente com timestamps e status. Re-execute comandos anteriores ou limpe o histórico. Mostra as últimas 10 execuções com indicadores de sucesso/falha e duração.',
    icon: 'stats',
    category: 'info',
    shortcut: 'h',
    environments: ['dev', 'prod'], // Disponível em todos os ambientes
    preview: null
  },
  {
    key: '9',
    command: 'config',
    label: 'Configurações do Menu',
    description: 'Configure as preferências do menu: tema (padrão, escuro, claro, alto contraste), animações (ativadas/desativadas), ícones e mais. Todas as configurações são salvas em ~/.docs-jana/config.json e aplicadas imediatamente.',
    icon: 'settings',
    category: 'utility',
    shortcut: 's',
    environments: ['dev', 'prod'], // Disponível em todos os ambientes
    preview: null
  },
  {
    key: 'h',
    command: 'help',
    label: 'Ajuda e Atalhos',
    description: 'Exibe todos os comandos disponíveis, atalhos de teclado e exemplos de uso. Aprenda a navegar no menu de forma eficiente usando setas, Enter, Escape e teclas de atalho.',
    icon: 'help',
    category: 'info',
    shortcut: '?',
    environments: ['dev', 'prod'], // Disponível em todos os ambientes
    preview: null
  },
  {
    key: '0',
    command: 'exit',
    label: 'Sair',
    description: 'Encerra a aplicação CLI. Todo o histórico e configurações serão salvos automaticamente antes de sair.',
    icon: 'exit',
    category: 'utility',
    shortcut: 'q',
    environments: ['dev', 'prod'], // Disponível em todos os ambientes
    preview: null
  }
];

/**
 * Get all menu options
 * @param {string} [environment] - Filter by environment ('dev', 'prod')
 * @returns {Array} Array of menu option objects
 */
function getAllOptions(environment = null) {
  if (!environment) {
    return [...MENU_OPTIONS];
  }

  // Filter options by environment
  return MENU_OPTIONS.filter(opt => {
    if (!opt.environments || opt.environments.length === 0) {
      // If no environments specified, show in all environments
      return true;
    }
    return opt.environments.includes(environment);
  });
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
