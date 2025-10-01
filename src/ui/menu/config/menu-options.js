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
    command: 'n8n:download',
    label: 'Download workflows from N8N',
    description: 'Download and backup all workflows from your N8N instance. Supports filtering by tags and output directory selection. The downloaded workflows will be saved in a timestamped directory with preserved structure and metadata.',
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
    key: '2',
    command: 'n8n:upload',
    label: 'Upload workflows to N8N',
    description: 'Upload workflows to your N8N instance with preserved IDs. Supports dry-run mode for testing without making changes. WARNING: This will modify workflows on your N8N instance. Use --dry-run first to verify changes.',
    icon: '📤',
    category: 'action',
    shortcut: 'u',
    preview: {
      shellCommand: 'docs-jana n8n:upload --input {path}',
      affectedPaths: ['N8N Instance - Remote workflows will be modified'],
      estimatedDuration: 8,
      warning: '⚠️  This command will modify workflows on your N8N instance. Always use --dry-run first to verify changes before uploading.'
    }
  },
  {
    key: '3',
    command: 'outline:download',
    label: 'Download documentation from Outline',
    description: 'Download all documentation from your Outline instance. Supports collection filtering and custom output paths. Documents will be saved in markdown format with preserved hierarchy and metadata.',
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
    key: '4',
    command: 'history',
    label: 'View command history',
    description: 'View the history of recently executed commands with timestamps and status. Re-execute previous commands or clear history. Shows the last 10 executions with success/failure indicators and duration.',
    icon: '📜',
    category: 'info',
    shortcut: 'h',
    preview: null
  },
  {
    key: '5',
    command: 'n8n:configure-target',
    label: 'Configure Target N8N Instance',
    description: 'Configure the target N8N instance where workflows will be uploaded. Enter URL and API key, test connection, and save to .env file. This is required before uploading workflows.',
    icon: '🎯',
    category: 'action',
    shortcut: 't',
    preview: {
      shellCommand: 'Configure TARGET_N8N_URL and TARGET_N8N_API_KEY',
      affectedPaths: ['.env file will be updated'],
      estimatedDuration: 2,
      warning: '⚠️  API keys will be stored in .env file. Keep this file secure and never commit it to version control.'
    }
  },
  {
    key: '6',
    command: 'config',
    label: 'Menu Settings',
    description: 'Configure menu preferences: theme (default, dark, light, high-contrast), animations (enabled/disabled), icons, and more. All settings are persisted to ~/.docs-jana/config.json and applied immediately.',
    icon: '⚙️',
    category: 'utility',
    shortcut: 's',
    preview: null
  },
  {
    key: '7',
    command: 'help',
    label: 'Help & Shortcuts',
    description: 'Show all available commands, keyboard shortcuts, and usage examples. Learn how to navigate the menu efficiently using arrow keys, Enter, Escape, and shortcut keys.',
    icon: '❓',
    category: 'info',
    shortcut: '?',
    preview: null
  },
  {
    key: '0',
    command: 'exit',
    label: 'Exit',
    description: 'Exit the CLI application. All history and configuration will be saved automatically before exiting.',
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
