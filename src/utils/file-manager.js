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
   * Sanitize filename - remove invalid characters
   * @param {string} filename - Original filename
   * @param {number} maxLength - Maximum filename length
   * @returns {string} Sanitized filename
   */
  sanitizeFilename(filename, maxLength = 200) {
    return filename
      .replace(/[<>:"/\\|?*]/g, '-')
      .replace(/\s+/g, '_')
      .substring(0, maxLength);
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
}

module.exports = FileManager;