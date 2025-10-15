/**
 * CommandExecutor - Wrapper para execução de comandos
 *
 * Responsável por:
 * - Executar comandos através do CommandOrchestrator do index.js
 * - Capturar início e fim da execução para calcular duração
 * - Capturar sucesso/falha da execução
 * - Retornar ExecutionResult estruturado
 *
 * Requirements: REQ-4 (Status da Última Execução), REQ-8 (Histórico)
 */

const { executeCommand } = require('../../../../index');

/**
 * @typedef {Object} ExecutionResult
 * @property {boolean} success - Se a execução foi bem-sucedida
 * @property {string} message - Mensagem de resultado
 * @property {number} timestamp - Timestamp da execução (ms)
 * @property {number} duration - Duração da execução (ms)
 * @property {Object} [data] - Dados retornados pelo comando (se sucesso)
 * @property {Object} [error] - Detalhes do erro (se falha)
 */

class CommandExecutor {
  /**
   * @param {Object} options - Opções do executor
   * @param {boolean} [options.verbose=false] - Habilitar logging verboso
   * @param {boolean} [options.debug=false] - Habilitar modo debug
   */
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.debug = options.debug || false;
  }

  /**
   * Executa comando e retorna resultado estruturado
   *
   * @param {string} commandName - Nome do comando (ex: 'n8n:download')
   * @param {Array} [args=[]] - Argumentos do comando
   * @param {Object} [flags={}] - Flags do comando
   * @returns {Promise<ExecutionResult>} Resultado da execução
   *
   * @example
   * const executor = new CommandExecutor();
   * const result = await executor.execute('n8n:download', ['--output', './workflows']);
   */
  async execute(commandName, args = [], flags = {}) {
    const startTime = Date.now();

    try {
      if (this.verbose) {
        console.log(`[CommandExecutor] Executing: ${commandName}`);
        console.log('[CommandExecutor] Args:', args);
        console.log('[CommandExecutor] Flags:', flags);
      }

      // Merge flags com opções do executor
      const mergedFlags = {
        ...flags,
        verbose: flags.verbose || this.verbose,
        debug: flags.debug || this.debug
      };

      // Executa comando através do orchestrator
      const result = await executeCommand({
        command: commandName,
        args,
        flags: mergedFlags,
        env: process.env
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      if (this.verbose) {
        console.log(`[CommandExecutor] Completed in ${duration}ms`);
        console.log('[CommandExecutor] Success:', result.success);
      }

      // Retorna resultado estruturado
      return {
        success: result.success,
        message: result.message,
        timestamp: endTime,
        duration,
        data: result.data || null,
        error: result.error || null
      };

    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      if (this.verbose) {
        console.error(`[CommandExecutor] Failed in ${duration}ms`);
        console.error('[CommandExecutor] Error:', error.message);
      }

      // Retorna resultado de erro
      return {
        success: false,
        message: error.message || 'Command execution failed',
        timestamp: endTime,
        duration,
        data: null,
        error: {
          code: error.code || 'EXECUTION_ERROR',
          message: error.message,
          stack: this.debug ? error.stack : undefined
        }
      };
    }
  }

  /**
   * Executa múltiplos comandos em sequência
   *
   * @param {Array<Object>} commands - Array de comandos a executar
   * @param {string} commands[].name - Nome do comando
   * @param {Array} [commands[].args] - Argumentos
   * @param {Object} [commands[].flags] - Flags
   * @returns {Promise<Array<ExecutionResult>>} Array de resultados
   *
   * @example
   * const results = await executor.executeMany([
   *   { name: 'n8n:download', args: ['--output', './workflows'] },
   *   { name: 'outline:download', args: ['--output', './docs'] }
   * ]);
   */
  async executeMany(commands) {
    const results = [];

    for (const cmd of commands) {
      const result = await this.execute(cmd.name, cmd.args, cmd.flags);
      results.push(result);

      // Se um comando falhar, interrompe a sequência
      if (!result.success) {
        if (this.verbose) {
          console.warn(`[CommandExecutor] Stopping sequence due to failure: ${cmd.name}`);
        }
        break;
      }
    }

    return results;
  }

  /**
   * Valida se um comando existe
   *
   * @param {string} commandName - Nome do comando
   * @returns {boolean} True se o comando existe
   */
  isValidCommand(commandName) {
    const validCommands = [
      'n8n:download',
      'n8n:upload',
      'outline:download',
      'history',
      'config',
      'help',
      'exit'
    ];

    return validCommands.includes(commandName);
  }

  /**
   * Obtém informações sobre um comando
   *
   * @param {string} commandName - Nome do comando
   * @returns {Object|null} Metadados do comando ou null
   */
  getCommandInfo(commandName) {
    const { MENU_OPTIONS } = require('../config/menu-options');
    return MENU_OPTIONS.find(opt => opt.command === commandName) || null;
  }

  /**
   * Habilita modo verbose
   */
  enableVerbose() {
    this.verbose = true;
  }

  /**
   * Desabilita modo verbose
   */
  disableVerbose() {
    this.verbose = false;
  }

  /**
   * Habilita modo debug
   */
  enableDebug() {
    this.debug = true;
  }

  /**
   * Desabilita modo debug
   */
  disableDebug() {
    this.debug = false;
  }
}

module.exports = CommandExecutor;
