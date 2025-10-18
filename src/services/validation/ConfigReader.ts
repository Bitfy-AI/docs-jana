/**
 * Leitor de configurações de validação
 * @module services/validation/ConfigReader
 */

import { z } from 'zod';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import type { ValidationConfig } from '../../types/validation';
import { DEFAULT_VALIDATION_CONFIG } from '../../types/validation';

/**
 * Schema Zod para validação de configuração
 */
const ValidationConfigSchema = z.object({
  validation: z.object({
    idPattern: z.string().optional(),
    strict: z.boolean().default(true),
    maxDuplicates: z.number().int().positive().default(100),
    logPath: z.string().default('.jana/logs/validation.log'),
  }),
});

/**
 * Schema completo do arquivo de configuração jana
 */
const JanaConfigSchema = z.object({
  n8n: z
    .object({
      apiUrl: z.string().url().optional(),
      apiKey: z.string().optional(),
    })
    .optional(),
  validation: z.object({
    idPattern: z.string().optional(),
    strict: z.boolean().default(true),
    maxDuplicates: z.number().int().positive().default(100),
    logPath: z.string().default('.jana/logs/validation.log'),
  }),
});

type JanaConfig = z.infer<typeof JanaConfigSchema>;

/**
 * Erro lançado quando configuração é inválida
 */
export class ConfigError extends Error {
  constructor(
    public readonly missingField: string,
    message?: string
  ) {
    super(message || `Missing required config field: ${missingField}`);
    this.name = 'ConfigError';
  }
}

/**
 * Leitor de configurações de validação
 */
export class ConfigReader {
  private static readonly DEFAULT_CONFIG_PATH = '.jana/config.json';
  private configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath || ConfigReader.DEFAULT_CONFIG_PATH;
  }

  /**
   * Lê configuração do arquivo
   * @returns Configuração de validação
   * @throws {ConfigError} Se configuração estiver inválida
   */
  public read(): ValidationConfig {
    // Se arquivo não existe, cria com configuração padrão
    if (!existsSync(this.configPath)) {
      this.createDefaultConfig();
    }

    try {
      const fileContent = readFileSync(this.configPath, 'utf-8');
      const rawConfig = JSON.parse(fileContent);

      // Valida com Zod
      const validatedConfig = JanaConfigSchema.parse(rawConfig);

      // Extrai apenas configuração de validação
      return this.extractValidationConfig(validatedConfig);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        throw new ConfigError(
          firstError.path.join('.'),
          `Invalid config at ${firstError.path.join('.')}: ${firstError.message}`
        );
      }

      if (error instanceof SyntaxError) {
        throw new ConfigError(
          'json.syntax',
          `Invalid JSON in config file: ${error.message}`
        );
      }

      throw error;
    }
  }

  /**
   * Valida regex de padrão de ID
   * @param pattern - Regex string
   * @returns true se válido
   * @throws {ConfigError} Se regex inválido
   */
  public validateIDPattern(pattern: string): boolean {
    try {
      new RegExp(pattern);
      return true;
    } catch (error) {
      throw new ConfigError(
        'validation.idPattern',
        `Invalid regex pattern: ${(error as Error).message}`
      );
    }
  }

  /**
   * Cria arquivo de configuração padrão
   */
  private createDefaultConfig(): void {
    const defaultConfig: JanaConfig = {
      n8n: {
        apiUrl: process.env.N8N_API_URL || 'https://your-n8n-instance.com/api/v1',
        apiKey: process.env.N8N_API_KEY || 'your_api_key_here',
      },
      validation: {
        idPattern: DEFAULT_VALIDATION_CONFIG.idPattern,
        strict: DEFAULT_VALIDATION_CONFIG.strict,
        maxDuplicates: DEFAULT_VALIDATION_CONFIG.maxDuplicates,
        logPath: DEFAULT_VALIDATION_CONFIG.logPath,
      },
    };

    // Cria diretório se não existir
    const dir = dirname(this.configPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Escreve arquivo
    writeFileSync(this.configPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
  }

  /**
   * Extrai configuração de validação do config completo
   */
  private extractValidationConfig(config: JanaConfig): ValidationConfig {
    const validationConfig: ValidationConfig = {
      idPattern: config.validation.idPattern || DEFAULT_VALIDATION_CONFIG.idPattern,
      strict: config.validation.strict,
      maxDuplicates: config.validation.maxDuplicates,
      logPath: config.validation.logPath,
    };

    // Valida regex se fornecido
    if (validationConfig.idPattern) {
      this.validateIDPattern(validationConfig.idPattern);
    }

    return validationConfig;
  }

  /**
   * Retorna configuração padrão sem ler arquivo
   */
  public static getDefault(): ValidationConfig {
    return { ...DEFAULT_VALIDATION_CONFIG };
  }
}
