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
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, -5);

    const dirPath = path.join(baseDir, `${prefix}-${timestamp}`);

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

    let sanitized = filename
      // Remove caracteres de controle (\x00-\x1F)
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
    // Extrai nome base sem extensão para verificação
    const baseName = lowerSanitized.split('.')[0];
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
   * Save workflow to JSON file
   * @param {string} directory - Target directory
   * @param {object} workflow - Workflow data
   * @returns {string} Saved file path
   */
  saveWorkflow(directory, workflow) {
    const { id, name, data } = workflow;
    const safeName = this.sanitizeFilename(name || `workflow-${id}`);
    const filename = `${safeName}-${id}.json`;
    const filePath = path.join(directory, filename);

    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
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

    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);

      if (stats.isFile()) {
        totalSize += stats.size;
      }
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