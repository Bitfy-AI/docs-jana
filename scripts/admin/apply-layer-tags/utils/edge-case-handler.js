/**
 * EdgeCaseHandler - Tratamento de casos extremos e situacoes especiais
 *
 * Responsavel por detectar e tratar edge cases:
 * - Workflows duplicados (mesmo nome)
 * - Codigos invalidos (AAA-AAA-000 placeholder)
 * - Caracteres especiais em nomes
 * - Rate limiting (429) com backoff aumentado
 * - Idempotencia (409) - tag ja existe
 * - Timeouts de rede (ETIMEDOUT, ECONNRESET)
 * - Respostas vazias/malformadas
 *
 * @module utils/edge-case-handler
 */

const Logger = require('../../../../src/utils/logger');
const { RETRY_CONFIG } = require('../config/config');

/**
 * Classe EdgeCaseHandler para tratamento de edge cases
 */
class EdgeCaseHandler {
  /**
   * Cria instancia do EdgeCaseHandler
   *
   * @param {Logger} logger - Logger para registrar operacoes (opcional)
   *
   * @example
   * const handler = new EdgeCaseHandler(logger);
   * const duplicates = handler.detectDuplicateNames(workflows);
   */
  constructor(logger = null) {
    this.logger = logger || new Logger({ logLevel: 'info' });
  }

  /**
   * Detecta workflows com nomes duplicados
   *
   * Workflows podem ter o mesmo name.new mas IDs diferentes.
   * Esta funcao detecta essas duplicatas e loga warnings.
   *
   * @param {Array<Object>} workflowItems - Array de workflow items
   * @returns {Object} Objeto com { hasDuplicates: boolean, duplicates: Map<string, Array> }
   *
   * @example
   * const result = handler.detectDuplicateNames(workflows);
   * if (result.hasDuplicates) {
   *   console.log('Duplicatas encontradas:', result.duplicates);
   * }
   */
  detectDuplicateNames(workflowItems) {
    const nameMap = new Map();
    const duplicates = new Map();

    // Agrupar workflows por nome
    for (const item of workflowItems) {
      const name = item.name?.new || item.name || 'Unknown';

      if (!nameMap.has(name)) {
        nameMap.set(name, []);
      }

      nameMap.get(name).push({
        id: item.id,
        name: name,
        code: item.code
      });
    }

    // Identificar duplicatas (nomes com mais de 1 workflow)
    for (const [name, items] of nameMap.entries()) {
      if (items.length > 1) {
        duplicates.set(name, items);

        this.logger.warn(
          `Workflow duplicado detectado: "${name}" encontrado em ${items.length} workflows`
        );

        for (const item of items) {
          this.logger.warn(`  - ID: ${item.id}, Code: ${item.code}`);
        }

        this.logger.info('Todos os workflows duplicados serao processados (nao serao pulados)');
      }
    }

    return {
      hasDuplicates: duplicates.size > 0,
      duplicates: duplicates
    };
  }

  /**
   * Valida codigos de workflow e identifica placeholders invalidos
   *
   * Detecta codigo placeholder AAA-AAA-000 que indica que o workflow
   * ainda nao foi devidamente categorizado.
   *
   * @param {Array<Object>} workflowItems - Array de workflow items
   * @returns {Object} Objeto com { hasInvalidCodes: boolean, invalidCodes: Array }
   *
   * @example
   * const result = handler.validateWorkflowCodes(workflows);
   * if (result.hasInvalidCodes) {
   *   console.log('Codigos invalidos encontrados:', result.invalidCodes.length);
   * }
   */
  validateWorkflowCodes(workflowItems) {
    const invalidCodes = [];
    const PLACEHOLDER_PATTERN = /^AAA-AAA-\d{3}$/i;

    for (const item of workflowItems) {
      const code = item.code || '';
      const name = item.name?.new || item.name || 'Unknown';

      // Verificar se e placeholder invalido
      if (PLACEHOLDER_PATTERN.test(code)) {
        invalidCodes.push({
          id: item.id,
          name: name,
          code: code
        });

        this.logger.warn(
          `Workflow "${name}" (ID: ${item.id}) possui codigo placeholder: ${code}`
        );
        this.logger.warn('  Sugestao: Atualizar codigo para refletir categoria real do workflow');
      }

      // Verificar se codigo esta ausente
      if (!code || code.trim() === '') {
        invalidCodes.push({
          id: item.id,
          name: name,
          code: 'VAZIO'
        });

        this.logger.warn(
          `Workflow "${name}" (ID: ${item.id}) nao possui codigo definido`
        );
      }
    }

    if (invalidCodes.length > 0) {
      this.logger.info(`Total de workflows com codigos invalidos: ${invalidCodes.length}`);
      this.logger.info('Processamento continuara normalmente apesar dos codigos invalidos');
    }

    return {
      hasInvalidCodes: invalidCodes.length > 0,
      invalidCodes: invalidCodes
    };
  }

  /**
   * Sanitiza nome de workflow para uso em logs e relatorios
   *
   * Remove/substitui caracteres especiais que podem causar problemas:
   * - Colchetes [ ]
   * - Parenteses ( )
   * - Emojis
   * - Caracteres de controle
   *
   * IMPORTANTE: Preserva o nome original para chamadas de API.
   *
   * @param {string} name - Nome do workflow a sanitizar
   * @returns {string} Nome sanitizado
   *
   * @example
   * const sanitized = handler.sanitizeName('Workflow [Test] 🚀');
   * console.log(sanitized); // "Workflow Test"
   */
  sanitizeName(name) {
    if (!name || typeof name !== 'string') {
      return 'Unknown';
    }

    let sanitized = name;

    // Remover emojis (Unicode emoji ranges)
    sanitized = sanitized.replace(/[\u{1F600}-\u{1F64F}]/gu, ''); // Emoticons
    sanitized = sanitized.replace(/[\u{1F300}-\u{1F5FF}]/gu, ''); // Misc Symbols
    sanitized = sanitized.replace(/[\u{1F680}-\u{1F6FF}]/gu, ''); // Transport
    sanitized = sanitized.replace(/[\u{1F1E0}-\u{1F1FF}]/gu, ''); // Flags
    sanitized = sanitized.replace(/[\u{2600}-\u{26FF}]/gu, '');   // Misc symbols
    sanitized = sanitized.replace(/[\u{2700}-\u{27BF}]/gu, '');   // Dingbats

    // Substituir colchetes e parenteses por espacos
    sanitized = sanitized.replace(/[\[\]()]/g, ' ');

    // Remover caracteres de controle
    sanitized = sanitized.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

    // Normalizar espacos multiplos
    sanitized = sanitized.replace(/\s+/g, ' ');

    // Remover espacos nas extremidades
    sanitized = sanitized.trim();

    // Se ficou vazio apos sanitizacao, retornar placeholder
    if (sanitized.length === 0) {
      return 'Unknown';
    }

    return sanitized;
  }

  /**
   * Trata erro de rate limiting (429) com backoff aumentado
   *
   * Quando API retorna 429 (Too Many Requests), esta funcao calcula
   * um backoff maior do que o padrao, respeitando o header Retry-After
   * se disponivel.
   *
   * @param {Error} error - Erro HTTP com statusCode 429
   * @param {number} attempt - Numero da tentativa atual (0-based)
   * @returns {Object} Objeto com { shouldRetry: boolean, delay: number, message: string }
   *
   * @example
   * const result = handler.handleRateLimit(error, 0);
   * if (result.shouldRetry) {
   *   await sleep(result.delay);
   *   // Tentar novamente
   * }
   */
  handleRateLimit(error, attempt) {
    const statusCode = this._extractStatusCode(error);

    if (statusCode !== 429) {
      return {
        shouldRetry: false,
        delay: 0,
        message: 'Nao e erro de rate limit'
      };
    }

    // Maximo de 5 tentativas antes de desistir
    const MAX_RATE_LIMIT_RETRIES = 5;

    if (attempt >= MAX_RATE_LIMIT_RETRIES) {
      this.logger.error(`Rate limit: Maximo de ${MAX_RATE_LIMIT_RETRIES} tentativas atingido`);

      return {
        shouldRetry: false,
        delay: 0,
        message: `Max rate limit retries exceeded (${MAX_RATE_LIMIT_RETRIES})`
      };
    }

    // Tentar extrair Retry-After header (em segundos)
    let retryAfter = this._extractRetryAfter(error);

    // Se header nao disponivel, usar backoff aumentado (2x o backoff normal)
    let delay;
    if (retryAfter) {
      delay = retryAfter * 1000; // Converter para milissegundos
      this.logger.warn(`Rate limit (429): Aguardando ${retryAfter}s conforme Retry-After header`);
    } else {
      // Backoff aumentado: baseDelay * 2^attempt * 2
      const baseDelay = RETRY_CONFIG.baseDelay;
      delay = baseDelay * Math.pow(2, attempt) * 2; // 2x o backoff normal

      this.logger.warn(`Rate limit (429): Aplicando backoff aumentado de ${Math.floor(delay)}ms (tentativa ${attempt + 1}/${MAX_RATE_LIMIT_RETRIES})`);
    }

    return {
      shouldRetry: true,
      delay: delay,
      message: `Rate limit detected, retrying after ${Math.floor(delay)}ms`
    };
  }

  /**
   * Verifica se erro e de idempotencia (409) - tag ja aplicada
   *
   * Erro 409 (Conflict) geralmente indica que a tag ja foi aplicada ao workflow.
   * Neste caso, consideramos como sucesso (operacao idempotente).
   *
   * @param {Error} error - Erro HTTP
   * @returns {boolean} true se e erro de idempotencia (409), false caso contrario
   *
   * @example
   * if (handler.isIdempotencyError(error)) {
   *   console.log('Tag ja aplicada, considerando sucesso');
   *   return { status: 'success', message: 'Tag already applied' };
   * }
   */
  isIdempotencyError(error) {
    const statusCode = this._extractStatusCode(error);

    if (statusCode === 409) {
      this.logger.info('Erro 409 detectado: Tag ja aplicada (operacao idempotente)');
      this.logger.info('Marcando como sucesso (nao e falha)');

      return true;
    }

    return false;
  }

  /**
   * Trata erros de timeout de rede
   *
   * Detecta erros de timeout (ETIMEDOUT, ECONNRESET) e calcula estrategia de retry.
   * Apos 2 falhas consecutivas de timeout, aumenta o timeout da proxima tentativa.
   *
   * @param {Error} error - Erro de rede
   * @param {Object} config - Configuracao atual de timeout
   * @returns {Object} Objeto com { isTimeout: boolean, shouldRetry: boolean, newTimeout: number, message: string }
   *
   * @example
   * const result = handler.handleTimeout(error, { timeout: 5000 });
   * if (result.isTimeout && result.shouldRetry) {
   *   console.log(`Aumentando timeout para ${result.newTimeout}ms`);
   * }
   */
  handleTimeout(error, config = {}) {
    const currentTimeout = config.timeout || RETRY_CONFIG.timeout;
    const timeoutErrors = ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND'];

    const isTimeout = error.code && timeoutErrors.includes(error.code);

    if (!isTimeout) {
      return {
        isTimeout: false,
        shouldRetry: false,
        newTimeout: currentTimeout,
        message: 'Nao e erro de timeout'
      };
    }

    // Log detalhado do erro de timeout
    this.logger.warn(`Erro de timeout detectado: ${error.code} - ${error.message}`);
    this.logger.warn(`Timeout atual: ${currentTimeout}ms`);

    // Aumentar timeout em 50% para proxima tentativa
    const newTimeout = Math.floor(currentTimeout * 1.5);
    const maxTimeout = RETRY_CONFIG.maxTimeout || 60000; // Usar maxTimeout do config (padrao: 60s)

    const adjustedTimeout = Math.min(newTimeout, maxTimeout);

    // Log warning se atingir o limite maximo
    if (adjustedTimeout === maxTimeout && newTimeout > maxTimeout) {
      this.logger.warn(`Timeout atingiu o limite maximo configurado: ${maxTimeout}ms`);
      this.logger.warn('Nao sera possivel aumentar timeout alem desse valor');
    }

    this.logger.info(`Ajustando timeout para ${adjustedTimeout}ms para proxima tentativa (max: ${maxTimeout}ms)`);

    return {
      isTimeout: true,
      shouldRetry: true,
      newTimeout: adjustedTimeout,
      message: `Timeout error (${error.code}), increasing timeout to ${adjustedTimeout}ms (max: ${maxTimeout}ms)`
    };
  }

  /**
   * Valida response body de API
   *
   * Verifica se response e valido:
   * - Nao e null/undefined
   * - JSON valido (se string)
   * - Estrutura esperada (se objeto)
   *
   * @param {any} response - Response da API
   * @returns {Object} Objeto com { isValid: boolean, error: string|null, data: any }
   *
   * @example
   * const result = handler.validateResponse(response);
   * if (!result.isValid) {
   *   console.error('Response invalido:', result.error);
   *   // Retry
   * }
   */
  validateResponse(response) {
    // Response null/undefined
    if (response === null || response === undefined) {
      this.logger.warn('Response vazio ou nulo recebido da API');

      return {
        isValid: false,
        error: 'Response is null or undefined',
        data: null
      };
    }

    // Response e string - tentar parsear JSON
    if (typeof response === 'string') {
      // String vazia
      if (response.trim().length === 0) {
        this.logger.warn('Response vazio (string vazia) recebido da API');

        return {
          isValid: false,
          error: 'Response is empty string',
          data: null
        };
      }

      // Tentar parsear JSON
      try {
        const parsed = JSON.parse(response);

        return {
          isValid: true,
          error: null,
          data: parsed
        };
      } catch (parseError) {
        this.logger.error(`Response nao e JSON valido: ${parseError.message}`);
        this.logger.error(`Response recebido: ${response.substring(0, 200)}...`);

        return {
          isValid: false,
          error: `Invalid JSON: ${parseError.message}`,
          data: null
        };
      }
    }

    // Response e objeto - validar estrutura basica
    if (typeof response === 'object') {
      // Objeto vazio {} pode ser valido dependendo do contexto
      // Mas se esperamos dados e recebemos {}, e um problema

      return {
        isValid: true,
        error: null,
        data: response
      };
    }

    // Response de tipo inesperado
    this.logger.warn(`Response de tipo inesperado: ${typeof response}`);

    return {
      isValid: false,
      error: `Unexpected response type: ${typeof response}`,
      data: null
    };
  }

  // ========== METODOS PRIVADOS ==========

  /**
   * Extrai status code de erro
   * @private
   * @param {Error} error - Erro HTTP
   * @returns {number|null} Status code ou null
   */
  _extractStatusCode(error) {
    if (error.statusCode) {
      return error.statusCode;
    }

    // Extrair de mensagem (ex: "HTTP 404: Not Found")
    const match = error.message && error.message.match(/(\d{3})/);
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * Extrai header Retry-After de erro 429
   * @private
   * @param {Error} error - Erro HTTP 429
   * @returns {number|null} Segundos para aguardar ou null
   */
  _extractRetryAfter(error) {
    // Tentar extrair do erro (se disponivel)
    if (error.headers && error.headers['retry-after']) {
      const retryAfter = error.headers['retry-after'];

      // Pode ser numero (segundos) ou data HTTP
      if (!isNaN(retryAfter)) {
        return parseInt(retryAfter, 10);
      }
    }

    // Tentar extrair da mensagem
    const match = error.message && error.message.match(/retry.*?(\d+)\s*(?:second|sec|s)/i);
    if (match) {
      return parseInt(match[1], 10);
    }

    return null;
  }
}

module.exports = EdgeCaseHandler;
