/**
 * CommandHistory - Gerenciamento de histórico de execução de comandos
 *
 * Responsável por:
 * - Armazenar histórico de execuções de comandos
 * - Persistir histórico em arquivo local (~/.docs-jana/history.json)
 * - Limitar tamanho do histórico (máximo 100 entradas)
 * - Fornecer consultas ao histórico (recent, last execution, statistics)
 *
 * Requirements: REQ-7, REQ-8 (4.1, 4.2, 8.1, 8.3, 8.6, 8.7)
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const os = require('os');

/**
 * @typedef {Object} ExecutionRecord
 * @property {string} commandName - Nome do comando executado
 * @property {string} timestamp - Timestamp ISO 8601 da execução
 * @property {'success'|'failure'} status - Status da execução
 * @property {number} duration - Duração em milissegundos
 * @property {number} exitCode - Código de saída (0 = sucesso, != 0 = erro)
 * @property {string} [error] - Mensagem de erro (se houver)
 */

/**
 * @typedef {Object} HistoryStatistics
 * @property {Array<{command: string, count: number}>} mostUsed - Comandos mais executados
 * @property {number} totalExecutions - Total de execuções
 * @property {number} successCount - Total de sucessos
 * @property {number} failureCount - Total de falhas
 * @property {number} successRate - Taxa de sucesso (0-1)
 */

class CommandHistory {
  /**
   * Tamanho máximo do histórico (entradas mais antigas serão removidas)
   */
  static MAX_SIZE = 100;

  /**
   * Caminho padrão para arquivo de histórico
   */
  static DEFAULT_HISTORY_PATH = path.join(os.homedir(), '.docs-jana', 'history.json');

  /**
   * Versão do formato do arquivo de histórico
   */
  static FILE_VERSION = '1.0';

  /**
   * @param {string} [historyPath] - Caminho customizado para arquivo de histórico
   */
  constructor(historyPath = CommandHistory.DEFAULT_HISTORY_PATH) {
    this.historyPath = historyPath;
    this.records = [];
    this.maxSize = CommandHistory.MAX_SIZE;
  }

  /**
   * Adiciona uma execução ao histórico
   * Requirements: 4.1, 8.1
   *
   * @param {Object} record - Registro de execução
   * @param {string} record.commandName - Nome do comando
   * @param {number} record.exitCode - Código de saída
   * @param {number} [record.duration] - Duração em ms
   * @param {string} [record.error] - Mensagem de erro
   * @param {string} [record.errorStack] - Stack trace do erro
   * @param {string} [record.errorCode] - Código de erro específico
   * @returns {ExecutionRecord} Registro adicionado com timestamp
   */
  add({ commandName, exitCode, duration = 0, error, errorStack, errorCode }) {
    // Validação de entrada
    if (!commandName || typeof commandName !== 'string') {
      throw new Error('commandName is required and must be a string');
    }

    if (typeof exitCode !== 'number') {
      throw new Error('exitCode is required and must be a number');
    }

    // Criar registro com timestamp ISO 8601
    const record = {
      commandName,
      timestamp: new Date().toISOString(),
      status: exitCode === 0 ? 'success' : 'failure',
      duration: duration || 0,
      exitCode,
    };

    // Adicionar informações de erro detalhadas se houver falha
    if (exitCode !== 0) {
      if (error) {
        // Suportar tanto string quanto objeto Error
        if (typeof error === 'string') {
          record.error = error;
        } else if (error instanceof Error) {
          record.error = error.message;
          if (!errorStack && error.stack) {
            record.errorStack = error.stack;
          }
        } else if (error && typeof error === 'object') {
          record.error = error.message || JSON.stringify(error);
        }
      }

      if (errorStack && typeof errorStack === 'string') {
        record.errorStack = errorStack;
      }

      if (errorCode && typeof errorCode === 'string') {
        record.errorCode = errorCode;
      }

      // Adicionar contexto adicional do erro se não houver mensagem
      if (!record.error) {
        record.error = `Command failed with exit code ${exitCode}`;
      }
    }

    // Adicionar ao início da lista (mais recente primeiro)
    this.records.unshift(record);

    // Remover entradas antigas se exceder tamanho máximo
    // Requirement: 8.6
    if (this.records.length > this.maxSize) {
      this.records = this.records.slice(0, this.maxSize);
    }

    return record;
  }

  /**
   * Obtém todas as execuções (mais recente primeiro)
   * @returns {ExecutionRecord[]} Lista de execuções
   */
  getAll() {
    return [...this.records];
  }

  /**
   * Obtém últimas N execuções
   * Requirement: 8.3
   *
   * @param {number} [count=10] - Número de execuções
   * @returns {ExecutionRecord[]} Lista de execuções recentes
   */
  getRecent(count = 10) {
    if (typeof count !== 'number' || count < 1) {
      throw new Error('count must be a positive number');
    }

    return this.records.slice(0, count);
  }

  /**
   * Obtém última execução de comando específico
   * Requirement: 4.3
   *
   * @param {string} commandName - Nome do comando
   * @returns {ExecutionRecord|null} Última execução ou null
   */
  getLastExecution(commandName) {
    if (!commandName || typeof commandName !== 'string') {
      throw new Error('commandName is required and must be a string');
    }

    return this.records.find(record => record.commandName === commandName) || null;
  }

  /**
   * Obtém estatísticas do histórico
   * Requirement: REQ-7 (Histórico de Comandos com estatísticas)
   *
   * @returns {HistoryStatistics} Estatísticas calculadas
   */
  getStatistics() {
    const stats = {
      totalExecutions: this.records.length,
      successCount: 0,
      failureCount: 0,
      successRate: 0,
      mostUsed: [],
    };

    // Calcular contadores
    const commandCounts = {};

    for (const record of this.records) {
      // Contadores de sucesso/falha
      if (record.status === 'success') {
        stats.successCount++;
      } else {
        stats.failureCount++;
      }

      // Contador de uso por comando
      commandCounts[record.commandName] = (commandCounts[record.commandName] || 0) + 1;
    }

    // Calcular taxa de sucesso
    if (stats.totalExecutions > 0) {
      stats.successRate = stats.successCount / stats.totalExecutions;
    }

    // Ordenar comandos por uso (mais usado primeiro)
    stats.mostUsed = Object.entries(commandCounts)
      .map(([command, count]) => ({ command, count }))
      .sort((a, b) => b.count - a.count);

    return stats;
  }

  /**
   * Limpa todo o histórico
   * Requirement: 8.8
   *
   * @returns {number} Número de registros removidos
   */
  clear() {
    const removedCount = this.records.length;
    this.records = [];
    return removedCount;
  }

  /**
   * Persiste histórico em arquivo
   * Requirement: 8.7
   *
   * @returns {Promise<void>}
   */
  async save() {
    try {
      // Garantir que diretório existe
      const dir = path.dirname(this.historyPath);
      await fs.mkdir(dir, { recursive: true });

      // Estrutura do arquivo
      const fileContent = {
        version: CommandHistory.FILE_VERSION,
        maxSize: this.maxSize,
        lastUpdate: new Date().toISOString(),
        records: this.records,
      };

      // Escrever arquivo
      await fs.writeFile(
        this.historyPath,
        JSON.stringify(fileContent, null, 2),
        'utf-8'
      );

      // Definir permissões restritas (0600 - apenas owner pode ler/escrever)
      // Requirement: Segurança - Configuration Security
      if (process.platform !== 'win32') {
        await fs.chmod(this.historyPath, 0o600);
      }
    } catch (error) {
      throw new Error(`Failed to save history: ${error.message}`);
    }
  }

  /**
   * Carrega histórico de arquivo
   * Requirement: 8.7
   *
   * @returns {Promise<void>}
   */
  async load() {
    try {
      // Verificar se arquivo existe
      try {
        await fs.access(this.historyPath);
      } catch {
        // Arquivo não existe - inicializar vazio
        this.records = [];
        return;
      }

      // Ler arquivo
      const content = await fs.readFile(this.historyPath, 'utf-8');

      // Parse JSON
      let data;
      try {
        data = JSON.parse(content);
      } catch (parseError) {
        // JSON corrompido - backup e reinicializar
        await this._backupCorruptedFile();
        this.records = [];
        return;
      }

      // Validar estrutura do arquivo
      if (!this._validateHistoryFile(data)) {
        // Estrutura inválida - backup e reinicializar
        await this._backupCorruptedFile();
        this.records = [];
        return;
      }

      // Carregar registros
      this.records = Array.isArray(data.records) ? data.records : [];

      // Aplicar limite de tamanho se necessário
      if (this.records.length > this.maxSize) {
        this.records = this.records.slice(0, this.maxSize);
      }

      // Atualizar maxSize se definido no arquivo
      if (typeof data.maxSize === 'number' && data.maxSize > 0) {
        this.maxSize = data.maxSize;
      }
    } catch (error) {
      // Erro de leitura - não é crítico, inicializar vazio
      this.records = [];
    }
  }

  /**
   * Valida estrutura do arquivo de histórico
   * @private
   * @param {Object} data - Dados carregados do arquivo
   * @returns {boolean} True se válido
   */
  _validateHistoryFile(data) {
    // Verificar campos obrigatórios
    if (!data || typeof data !== 'object') {
      return false;
    }

    if (!data.version || typeof data.version !== 'string') {
      return false;
    }

    if (!Array.isArray(data.records)) {
      return false;
    }

    // Validar cada registro
    for (const record of data.records) {
      if (!this._validateExecutionRecord(record)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Valida um registro de execução
   * @private
   * @param {Object} record - Registro a validar
   * @returns {boolean} True se válido
   */
  _validateExecutionRecord(record) {
    if (!record || typeof record !== 'object') {
      return false;
    }

    // Campos obrigatórios
    if (!record.commandName || typeof record.commandName !== 'string') {
      return false;
    }

    if (!record.timestamp || typeof record.timestamp !== 'string') {
      return false;
    }

    if (!record.status || !['success', 'failure'].includes(record.status)) {
      return false;
    }

    if (typeof record.exitCode !== 'number') {
      return false;
    }

    // Validar formato de timestamp ISO 8601
    const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    if (!timestampRegex.test(record.timestamp)) {
      return false;
    }

    return true;
  }

  /**
   * Faz backup de arquivo corrompido
   * @private
   * @returns {Promise<void>}
   */
  async _backupCorruptedFile() {
    try {
      const backupPath = `${this.historyPath}.corrupted.${Date.now()}`;
      await fs.copyFile(this.historyPath, backupPath);
    } catch {
      // Falha no backup não é crítico
    }
  }

  /**
   * Carrega histórico de forma síncrona (para uso em inicialização)
   * @returns {void}
   */
  loadSync() {
    try {
      // Verificar se arquivo existe
      if (!fsSync.existsSync(this.historyPath)) {
        this.records = [];
        return;
      }

      // Ler arquivo
      const content = fsSync.readFileSync(this.historyPath, 'utf-8');

      // Parse JSON
      let data;
      try {
        data = JSON.parse(content);
      } catch {
        // JSON corrompido - reinicializar
        this.records = [];
        return;
      }

      // Validar e carregar
      if (this._validateHistoryFile(data)) {
        this.records = Array.isArray(data.records) ? data.records : [];

        // Aplicar limite de tamanho
        if (this.records.length > this.maxSize) {
          this.records = this.records.slice(0, this.maxSize);
        }
      } else {
        this.records = [];
      }
    } catch {
      this.records = [];
    }
  }
}

module.exports = CommandHistory;
