/**
 * File Manager - Handles file system operations
 */

const fs = require('fs');
const path = require('path');

class FileManager {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Create a timestamped directory for backup
   * @param {string} baseDir - Base directory path
   * @param {string} prefix - Folder prefix
   * @returns {string} Created directory path
   */
  createBackupDirectory(baseDir = process.cwd(), prefix = 'n8n-workflows') {
    // FIX: Validate baseDir to prevent path traversal attacks
    // Ensure baseDir is absolute (not relative with ../)
    if (!path.isAbsolute(baseDir)) {
      throw new Error('baseDir must be an absolute path');
    }

    // FIX: Prevent path traversal by checking for ../ sequences
    const normalizedBase = path.normalize(baseDir);
    if (normalizedBase.includes('..')) {
      throw new Error('baseDir contains invalid path traversal sequences (..)');
    }

    // FIX: Ensure we don't write outside current working directory
    const cwd = process.cwd();
    const resolvedBase = path.resolve(baseDir);
    if (!resolvedBase.startsWith(cwd)) {
      throw new Error(`baseDir must be within current working directory: ${cwd}`);
    }

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, -5);

    const dirPath = path.join(resolvedBase, `${prefix}-${timestamp}`);

    try {
      fs.mkdirSync(dirPath, { recursive: true });
      this.logger.folder(dirPath);
      return dirPath;
    } catch (error) {
      this.logger.error(`Failed to create directory: ${error.message}`);
      throw error;
    }
  }

  /**
   * Ensure directory exists, creating it if necessary
   * @param {string} baseDir - Base directory path
   * @param {string} subDir - Subdirectory name
   * @returns {string} Full directory path
   */
  ensureDirectory(baseDir, subDir) {
    const dirPath = path.join(baseDir, subDir);

    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        this.logger.debug(`Created directory: ${dirPath}`);
      }
      return dirPath;
    } catch (error) {
      this.logger.error(`Failed to create directory: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sanitiza nome de arquivo - remove caracteres inválidos e previne path traversal
   *
   * SEGURANÇA CRÍTICA: Este método protege contra vulnerabilidades de path traversal
   * e garante compatibilidade com sistemas de arquivos Windows/Unix.
   *
   * Proteções implementadas:
   * - Remove separadores de caminho (/, \) para prevenir path traversal
   * - Remove referências a diretório pai (..) para prevenir navegação de diretório
   * - Remove pontos iniciais e finais (arquivos ocultos e nomes inválidos no Windows)
   * - Bloqueia nomes reservados do Windows (CON, PRN, AUX, NUL, COM1-9, LPT1-9)
   * - Remove caracteres de controle (\x00-\x1F)
   * - Normaliza múltiplos hífens/underscores
   * - Limita comprimento a 255 caracteres (limite do sistema de arquivos)
   * - Preserva caracteres Unicode/emoji onde seguro
   *
   * @param {string} filename - Nome do arquivo original
   * @param {number} maxLength - Comprimento máximo do nome do arquivo (padrão: 255)
   * @returns {string} Nome de arquivo sanitizado e seguro
   *
   * @example
   * sanitizeFilename('../../../etc/passwd') // => 'etcpasswd'
   * sanitizeFilename('.hidden') // => 'hidden'
   * sanitizeFilename('file...') // => 'file'
   * sanitizeFilename('CON') // => 'untitled'
   * sanitizeFilename('Test: File/Name') // => 'test--file-name'
   * sanitizeFilename('文档') // => '文档'
   */
  sanitizeFilename(filename, maxLength = 255) {
    // Validação de entrada
    if (!filename || typeof filename !== 'string') {
      return 'untitled';
    }

    // Nomes reservados do Windows (case-insensitive)
    const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

    const sanitized = filename
      // Remove caracteres de controle (\x00-\x1F)
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x1F]/g, '')
      // Remove separadores de caminho e caracteres especiais perigosos
      .replace(/[<>:"/\\|?*]/g, '-')
      // Remove referências a diretório pai
      .replace(/\.\./g, '')
      // Substitui espaços por underscores
      .replace(/\s+/g, '_')
      // Normaliza múltiplos hífens
      .replace(/-+/g, '-')
      // Normaliza múltiplos underscores
      .replace(/_+/g, '_')
      // Remove pontos iniciais (arquivos ocultos)
      .replace(/^\.+/, '')
      // Remove pontos finais (inválido no Windows)
      .replace(/\.+$/, '')
      // Trim caracteres de espaço/hífen/underscore nas bordas
      .replace(/^[-_]+|[-_]+$/g, '');

    // Converte para lowercase para comparação case-insensitive
    const lowerSanitized = sanitized.toLowerCase();

    // Verifica se é nome reservado do Windows
    // FIX: Handle files without extensions correctly
    // split('.')[0] returns the whole filename if there's no dot
    const lastDotIndex = lowerSanitized.lastIndexOf('.');
    const baseName = lastDotIndex > 0 ? lowerSanitized.substring(0, lastDotIndex) : lowerSanitized;

    if (WINDOWS_RESERVED.test(baseName)) {
      return 'untitled';
    }

    // Se ficou vazio após sanitização, retorna nome padrão
    if (!sanitized || sanitized.length === 0) {
      return 'untitled';
    }

    // Limita comprimento (máximo 255 caracteres)
    return sanitized.substring(0, Math.min(maxLength, 255));
  }

  /**
   * Converte nome técnico em nome amigável
   * Remove underscores e hífens, capitaliza palavras
   *
   * @param {string} technicalName - Nome técnico com _ ou -
   * @returns {string} Nome amigável e legível
   *
   * @example
   * makeFriendlyName('my_workflow_name') // => 'My Workflow Name'
   * makeFriendlyName('test-workflow-123') // => 'Test Workflow 123'
   * makeFriendlyName('API_Integration_v2') // => 'API Integration V2'
   */
  makeFriendlyName(technicalName) {
    if (!technicalName || typeof technicalName !== 'string') {
      return 'Untitled';
    }

    return technicalName
      // Substitui underscores e hífens por espaços
      .replace(/[_-]+/g, ' ')
      // Capitaliza primeira letra de cada palavra
      .replace(/\b\w/g, char => char.toUpperCase())
      // Remove espaços múltiplos
      .replace(/\s+/g, ' ')
      // Trim
      .trim();
  }

  /**
   * Save workflow to JSON file
   * @param {string} directory - Target directory
   * @param {object} workflow - Workflow data
   * @returns {string} Saved file path
   */
  saveWorkflow(directory, workflow) {
    // Handle both formats: { id, name, data } and direct workflow object
    const workflowData = workflow.data || workflow;
    const id = workflow.id || workflowData.id;
    const name = workflow.name || workflowData.name;

    // Cria nome amigável COM ESPAÇOS (sem _ ou -)
    const friendlyName = this.makeFriendlyName(name || `workflow-${id}`);
    // NÃO sanitiza demais - apenas remove caracteres realmente inválidos
    // Mantém ESPAÇOS para nome legível
    const safeName = friendlyName.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim();
    const filename = `${safeName} (${id}).json`;
    const filePath = path.join(directory, filename);

    try {
      // FIX: Add directory existence check before writing
      // Create directory if it doesn't exist to prevent ENOENT errors
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
        this.logger.debug(`Created directory: ${directory}`);
      }

      fs.writeFileSync(filePath, JSON.stringify(workflowData, null, 2), 'utf8');
      this.logger.success(`   Salvo: ${filename}`);
      return filename;
    } catch (error) {
      this.logger.error(`   Failed to save ${filename}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Save multiple workflows
   * @param {string} directory - Target directory
   * @param {Array} workflows - Array of workflow objects
   * @returns {Array} Array of saved file information
   */
  saveWorkflows(directory, workflows) {
    const savedFiles = [];

    for (const workflow of workflows) {
      try {
        const filename = this.saveWorkflow(directory, workflow);
        savedFiles.push({
          id: workflow.id,
          name: workflow.name,
          file: filename,
          tags: workflow.tags,
        });
      } catch (error) {
        this.logger.warn(`Skipping workflow ${workflow.name}: ${error.message}`);
      }
    }

    return savedFiles;
  }

  /**
   * Save backup log
   * @param {string} directory - Target directory
   * @param {object} logData - Log data to save
   */
  saveLog(directory, logData) {
    const logPath = path.join(directory, '_backup-log.json');

    try {
      const logContent = {
        ...logData,
        timestamp: new Date().toISOString(),
        generatedBy: 'n8n-workflow-backup-tool',
      };

      fs.writeFileSync(logPath, JSON.stringify(logContent, null, 2), 'utf8');
      this.logger.debug(`Log saved: ${logPath}`);
    } catch (error) {
      this.logger.error(`Failed to save log: ${error.message}`);
    }
  }

  /**
   * Check if directory exists
   * @param {string} dirPath - Directory path
   * @returns {boolean} True if exists
   */
  directoryExists(dirPath) {
    try {
      return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Get directory size
   * @param {string} dirPath - Directory path
   * @returns {number} Size in bytes
   */
  getDirectorySize(dirPath) {
    let totalSize = 0;

    try {
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        const filePath = path.join(dirPath, file);

        try {
          // FIX: Use lstatSync instead of statSync to detect symlinks
          // lstatSync returns info about the symlink itself, not the target
          const stats = fs.lstatSync(filePath);

          // FIX: Skip symbolic links to prevent infinite loops
          if (stats.isSymbolicLink()) {
            this.logger.debug(`Skipping symbolic link: ${filePath}`);
            continue;
          }

          if (stats.isFile()) {
            totalSize += stats.size;
          }
        } catch (error) {
          // FIX: Handle permission errors gracefully - log and continue
          this.logger.debug(`Cannot access ${filePath}: ${error.message}`);
          continue;
        }
      }
    } catch (error) {
      // FIX: Handle directory read errors (permission denied, etc.)
      this.logger.error(`Cannot read directory ${dirPath}: ${error.message}`);
    }

    return totalSize;
  }

  /**
   * Format bytes to human readable
   * @param {number} bytes - Bytes
   * @returns {string} Formatted string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Ensure a directory exists, creating it recursively if needed
   * @param {string} dirPath - Directory path to ensure
   * @returns {Promise<void>}
   */
  async ensureDir(dirPath) {
    try {
      await fs.promises.access(dirPath);
    } catch {
      await fs.promises.mkdir(dirPath, { recursive: true });
      this.logger.debug(`Created directory: ${dirPath}`);
    }
  }

  /**
   * Write content to a file
   * @param {string} filePath - File path
   * @param {string} content - Content to write
   * @returns {Promise<void>}
   */
  async writeFile(filePath, content) {
    try {
      await fs.promises.writeFile(filePath, content, 'utf-8');
      this.logger.debug(`Wrote file: ${filePath}`);
    } catch (error) {
      this.logger.error(`Failed to write file ${filePath}: ${error.message}`);
      throw error;
    }
  }
}

module.exports = FileManager;