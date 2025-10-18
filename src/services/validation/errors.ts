/**
 * Erros customizados para validação
 * @module services/validation/errors
 */

import { ExitCode, ErrorCode } from '../../types/validation';

/**
 * Erro base para validação
 */
export class ValidationErrorBase extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly exitCode: ExitCode
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Erro de conexão com n8n
 */
export class N8NConnectionError extends ValidationErrorBase {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(
      `Failed to connect to n8n: ${message}`,
      ErrorCode.N8N_CONNECTION_FAILED,
      ExitCode.CONNECTION_ERROR
    );
  }

  /**
   * Formata mensagem de erro user-friendly
   */
  public formatUserMessage(): string[] {
    return [
      '',
      '❌ Erro de conexão com n8n',
      '🔗 Verifique se o n8n está acessível',
      '🔑 Verifique suas credenciais em .jana/config.json',
      '',
      `Detalhes: Status ${this.statusCode} - ${this.message}`,
      '',
    ];
  }
}

/**
 * Erro de configuração
 */
export class ConfigError extends ValidationErrorBase {
  constructor(
    public readonly missingField: string,
    message?: string
  ) {
    super(
      message || `Missing required config field: ${missingField}`,
      ErrorCode.INVALID_CONFIG,
      ExitCode.CONFIG_ERROR
    );
  }

  /**
   * Formata mensagem de erro user-friendly
   */
  public formatUserMessage(): string[] {
    return [
      '',
      '❌ Erro de configuração',
      `📋 Campo ausente ou inválido: ${this.missingField}`,
      '📝 Verifique o arquivo .jana/config.json',
      '',
      `Detalhes: ${this.message}`,
      '',
    ];
  }
}

/**
 * Erro de padrão de ID inválido (regex)
 */
export class InvalidIDPatternError extends ValidationErrorBase {
  constructor(
    public readonly pattern: string,
    public readonly regexError: string
  ) {
    super(
      `Invalid ID pattern regex: ${regexError}`,
      ErrorCode.INVALID_ID_PATTERN,
      ExitCode.CONFIG_ERROR
    );
  }

  /**
   * Formata mensagem de erro user-friendly
   */
  public formatUserMessage(): string[] {
    return [
      '',
      '❌ Padrão de ID inválido',
      `🔍 Regex fornecido: ${this.pattern}`,
      `⚠️  Erro: ${this.regexError}`,
      '',
      '💡 Verifique a sintaxe do regex em validation.idPattern',
      '📖 Exemplo válido: "\\\\([A-Z]+-[A-Z]+-\\\\d{3}\\\\)"',
      '',
    ];
  }
}
