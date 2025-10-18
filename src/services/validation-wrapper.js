/**
 * Wrapper JavaScript para módulo de validação TypeScript
 * Permite uso em código JavaScript existente sem compilar TS
 *
 * @module services/validation-wrapper
 */

const path = require('path');
const fs = require('fs');

/**
 * Validador de workflows com interface JavaScript
 */
class WorkflowValidator {
  constructor(logger) {
    this.logger = logger || console;
    this.config = this.loadConfig();
  }

  /**
   * Carrega configuração de validação
   */
  loadConfig() {
    const configPath = path.join(process.cwd(), '.jana', 'config.json');

    // Configuração padrão
    const defaultConfig = {
      validation: {
        idPattern: String.raw`\([A-Z]+-[A-Z]+-\d{3}\)`,
        strict: true,
        maxDuplicates: 100,
        logPath: '.jana/logs/validation.log',
      }
    };

    // Tenta ler arquivo de config
    if (fs.existsSync(configPath)) {
      try {
        const fileContent = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(fileContent);
        return config.validation || defaultConfig.validation;
      } catch (error) {
        this.logger.warn?.(`Failed to read config, using defaults: ${error.message}`);
        return defaultConfig.validation;
      }
    }

    // Cria config padrão se não existir
    this.createDefaultConfig(configPath, defaultConfig);
    return defaultConfig.validation;
  }

  /**
   * Cria arquivo de configuração padrão
   */
  createDefaultConfig(configPath, config) {
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    this.logger.info?.(`Created default config at ${configPath}`);
  }

  /**
   * Extrai IDs internos de workflows
   */
  extractInternalIDs(workflows) {
    const pattern = new RegExp(this.config.idPattern, 'g');
    const idMap = new Map();

    for (const workflow of workflows) {
      const id = this.extractSingleID(workflow, pattern);
      if (id) {
        if (!idMap.has(id)) {
          idMap.set(id, []);
        }
        idMap.get(id).push(workflow.id);
      }
    }

    return idMap;
  }

  /**
   * Extrai ID de um único workflow
   */
  extractSingleID(workflow, pattern) {
    pattern.lastIndex = 0;

    // Busca no nome
    const nameMatch = pattern.exec(workflow.name);
    if (nameMatch) {
      return nameMatch[0].trim().toUpperCase();
    }

    // Fallback: busca em tags
    if (workflow.tags && workflow.tags.length > 0) {
      const tagsString = workflow.tags.map(t => t.name || t).join(' ');
      pattern.lastIndex = 0;
      const tagMatch = pattern.exec(tagsString);
      if (tagMatch) {
        return tagMatch[0].trim().toUpperCase();
      }
    }

    return null;
  }

  /**
   * Detecta duplicatas
   */
  findDuplicates(idMap) {
    const duplicates = [];

    for (const [internalID, n8nIDs] of idMap.entries()) {
      if (n8nIDs.length > 1) {
        duplicates.push({
          internalID,
          n8nIDs,
          count: n8nIDs.length,
        });
      }
    }

    // Ordena por severidade (mais duplicatas primeiro)
    return duplicates.sort((a, b) => b.count - a.count);
  }

  /**
   * Gera sugestões de IDs corretos
   */
  generateSuggestions(duplicates, idMap) {
    const usedIDs = new Set(idMap.keys());

    return duplicates.map(dup => {
      const suggestions = [];
      const neededSuggestions = Math.min(dup.count - 1, 3);

      for (let i = 0; i < neededSuggestions; i++) {
        const suggestion = this.suggestNextID(
          dup.internalID,
          new Set([...usedIDs, ...suggestions])
        );
        if (suggestion) {
          suggestions.push(suggestion);
        }
      }

      return {
        ...dup,
        suggestions,
      };
    });
  }

  /**
   * Sugere próximo ID disponível
   */
  suggestNextID(internalID, usedIDs) {
    const match = internalID.match(/\(([A-Z]+-[A-Z]+)-(\d{3})\)/);
    if (!match) return null;

    const [, prefix, numberStr] = match;
    const currentNumber = parseInt(numberStr, 10);

    // Busca gaps primeiro
    for (let i = 1; i < currentNumber; i++) {
      const candidate = `(${prefix}-${String(i).padStart(3, '0')})`;
      if (!usedIDs.has(candidate)) {
        return candidate;
      }
    }

    // Incrementa sequencialmente
    for (let i = currentNumber + 1; i <= 999; i++) {
      const candidate = `(${prefix}-${String(i).padStart(3, '0')})`;
      if (!usedIDs.has(candidate)) {
        return candidate;
      }
    }

    return null;
  }

  /**
   * Formata mensagens de erro
   */
  formatErrorMessages(enrichedDuplicates) {
    const messages = [];

    messages.push('');
    messages.push(`❌ Detectadas ${enrichedDuplicates.length} duplicatas de ID interno:`);
    messages.push('');

    for (const dup of enrichedDuplicates) {
      messages.push(`📍 ID interno: ${dup.internalID}`);
      messages.push(`   Encontrado em ${dup.n8nIDs.length} workflows:`);

      dup.n8nIDs.forEach((n8nID, index) => {
        messages.push(`   ${index + 1}. Workflow n8n ID: ${n8nID}`);
        if (index > 0 && dup.suggestions[index - 1]) {
          messages.push(`      → Sugestão: Alterar para ${dup.suggestions[index - 1]}`);
        }
      });

      messages.push('');
    }

    messages.push('💡 Corrija os IDs duplicados no n8n e execute o download novamente.');
    messages.push('');

    return messages;
  }

  /**
   * Salva relatório JSON
   */
  saveReport(totalWorkflows, duplicates) {
    const logPath = this.config.logPath || '.jana/logs/validation-errors.json';
    const logDir = path.dirname(logPath);

    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const report = {
      timestamp: new Date().toISOString(),
      totalWorkflows,
      duplicatesFound: duplicates.length,
      duplicates,
    };

    fs.writeFileSync(logPath, JSON.stringify(report, null, 2), 'utf-8');
    return logPath;
  }

  /**
   * Valida workflows - método principal
   * @param {Array} workflows - Array de workflows do n8n
   * @param {Object} options - Opções de validação
   * @returns {Object} Resultado da validação
   * @throws {Error} Se duplicatas forem encontradas e strict=true
   */
  validate(workflows, options = {}) {
    const skipValidation = options.skipValidation || false;
    const strict = options.strict !== undefined ? options.strict : this.config.strict;

    this.logger.info?.('🔍 Validating workflow IDs...');

    const startTime = Date.now();

    // 1. Extrai IDs
    const idMap = this.extractInternalIDs(workflows);
    this.logger.debug?.(`Extracted ${idMap.size} unique IDs from ${workflows.length} workflows`);

    // 2. Detecta duplicatas
    const duplicates = this.findDuplicates(idMap);

    if (duplicates.length === 0) {
      const duration = Date.now() - startTime;
      this.logger.info?.(`✅ Validation passed - no duplicate IDs found (${duration}ms)`);

      return {
        valid: true,
        duplicates: [],
        totalWorkflows: workflows.length,
        duration,
      };
    }

    // 3. Enriquece com sugestões
    const enrichedDuplicates = this.generateSuggestions(duplicates, idMap);

    // 4. Formata mensagens
    const messages = this.formatErrorMessages(enrichedDuplicates);

    // 5. Salva relatório
    const logPath = this.saveReport(workflows.length, enrichedDuplicates);

    const duration = Date.now() - startTime;

    this.logger.error?.(
      `❌ Validation failed - ${duplicates.length} duplicate(s) found (${duration}ms)`
    );

    // Se skipValidation, apenas avisa
    if (skipValidation) {
      this.logger.warn?.('⚠️  Validation errors ignored (--skip-validation flag)');
      messages.forEach(msg => this.logger.warn?.(msg));
      this.logger.info?.(`🔍 Detalhes salvos em: ${logPath}`);

      return {
        valid: false,
        duplicates: enrichedDuplicates,
        totalWorkflows: workflows.length,
        duration,
        skipped: true,
      };
    }

    // Se strict mode, lança erro
    if (strict) {
      const error = new Error('Validation failed: duplicate IDs detected');
      error.name = 'ValidationError';
      error.messages = messages;
      error.duplicates = enrichedDuplicates;
      error.logPath = logPath;
      throw error;
    }

    return {
      valid: false,
      duplicates: enrichedDuplicates,
      totalWorkflows: workflows.length,
      duration,
      messages,
      logPath,
    };
  }
}

module.exports = WorkflowValidator;
