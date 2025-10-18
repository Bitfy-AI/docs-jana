/**
 * Tipos e interfaces para validação de workflows do n8n
 * @module types/validation
 */

/**
 * Representação de um workflow do n8n (API response)
 */
export interface N8NWorkflow {
  /** UUID do workflow no n8n */
  id: string;
  /** Nome do workflow (pode conter ID interno) */
  name: string;
  /** Status ativo/inativo */
  active: boolean;
  /** Tags opcionais */
  tags?: string[];
  /** Estrutura de nós do workflow */
  nodes: WorkflowNode[];
  /** Conexões entre nós */
  connections: Record<string, unknown>;
  /** Timestamp de criação (ISO 8601) */
  createdAt: string;
  /** Timestamp de última atualização (ISO 8601) */
  updatedAt: string;
}

/**
 * Nó individual de um workflow
 */
export interface WorkflowNode {
  /** ID único do nó */
  id: string;
  /** Nome do nó */
  name: string;
  /** Tipo do nó (ex: "n8n-nodes-base.httpRequest") */
  type: string;
  /** Parâmetros de configuração do nó */
  parameters: Record<string, unknown>;
  /** Posição [x, y] no canvas */
  position: [number, number];
}

/**
 * Informação sobre ID duplicado detectado
 */
export interface DuplicateInfo {
  /** ID interno duplicado (ex: "(ERR-OUT-001)") */
  internalID: string;
  /** Array de IDs n8n que têm esse ID interno */
  n8nIDs: string[];
  /** Número de ocorrências (length de n8nIDs) */
  count: number;
}

/**
 * Informação de duplicata enriquecida com sugestões de correção
 */
export interface EnrichedDuplicateInfo extends DuplicateInfo {
  /** Sugestões de IDs corretos (sequenciais) */
  suggestions: string[];
}

/**
 * Resultado de validação de workflows
 */
export interface ValidationResult {
  /** true se nenhuma duplicata foi encontrada */
  valid: boolean;
  /** Array de duplicatas detectadas (vazio se valid=true) */
  duplicates: EnrichedDuplicateInfo[];
  /** Total de workflows validados */
  totalWorkflows: number;
  /** Timestamp da validação */
  validatedAt: Date;
}

/**
 * Configuração de validação (lida de .jana/config.json)
 */
export interface ValidationConfig {
  /** Regex customizado para ID interno (opcional) */
  idPattern?: string;
  /** Se true, falha mesmo com 1 duplicata */
  strict: boolean;
  /** Máximo de duplicatas antes de parar validação */
  maxDuplicates: number;
  /** Caminho do arquivo de log */
  logPath: string;
}

/**
 * Configuração padrão de validação
 */
export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  idPattern: String.raw`\([A-Z]+-[A-Z]+-\d{3}\)`,
  strict: true,
  maxDuplicates: 100,
  logPath: '.jana/logs/validation.log',
};

/**
 * Relatório de validação salvo em JSON
 */
export interface ValidationReport {
  /** Timestamp da validação (ISO 8601) */
  timestamp: string;
  /** Total de workflows processados */
  totalWorkflows: number;
  /** Número de duplicatas encontradas */
  duplicatesFound: number;
  /** Detalhes das duplicatas */
  duplicates: EnrichedDuplicateInfo[];
}

/**
 * Códigos de saída da CLI
 */
export enum ExitCode {
  /** Sucesso - sem duplicatas */
  SUCCESS = 0,
  /** Erro de validação - duplicatas detectadas */
  VALIDATION_ERROR = 1,
  /** Erro de conexão com n8n */
  CONNECTION_ERROR = 2,
  /** Erro de configuração */
  CONFIG_ERROR = 3,
}

/**
 * Códigos de erro personalizados
 */
export enum ErrorCode {
  /** Duplicatas detectadas */
  DUPLICATE_IDS = 'DUPLICATE_IDS',
  /** Falha ao conectar com n8n */
  N8N_CONNECTION_FAILED = 'N8N_CONNECTION_FAILED',
  /** Configuração inválida */
  INVALID_CONFIG = 'INVALID_CONFIG',
  /** Padrão de ID inválido (regex) */
  INVALID_ID_PATTERN = 'INVALID_ID_PATTERN',
}
