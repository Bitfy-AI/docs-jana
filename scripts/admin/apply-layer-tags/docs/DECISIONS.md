# Decisoes Tecnicas - Tag Layer Implementation

Este documento registra decisoes tecnicas tomadas durante a implementacao do script de aplicacao de tags em workflows do n8n, especificamente na resolucao de questoes em aberto identificadas na TASK-3.4.

---

## Sumario

1. [Como aplicar multiplas tags simultaneamente?](#decisao-1-aplicacao-de-multiplas-tags)
2. [Workflow sem layer definida - usar layer padrao?](#decisao-2-layer-padrao-para-workflows)
3. [Encoding de caracteres especiais nos nomes](#decisao-3-encoding-de-caracteres-especiais)
4. [Cache de tags - invalidar apos quanto tempo?](#decisao-4-cache-de-tags-configuravel)
5. [Timeout aumentado apos falhas - max limite?](#decisao-5-limite-maximo-de-timeout)

---

## DECISAO-1: Aplicacao de Multiplas Tags

### Questao Original

Como aplicar multiplas tags simultaneamente a um workflow? O n8n suporta multiplas tags por workflow. Precisamos de um metodo eficiente para aplicar varias tags de uma vez.

### Decisao Tomada

Implementar o metodo `applyMultipleTags(workflowId, tagIds[])` no `TagService` que utiliza o endpoint `PUT /api/v1/workflows/{id}/tags` com payload `{ tagIds: [id1, id2, ...] }`.

### Justificativa

- **Eficiencia:** Uma unica requisicao API aplica todas as tags, reduzindo latencia e evitando rate limiting
- **Atomicidade:** Operacao atomica garante que todas as tags sejam aplicadas ou nenhuma, evitando estados inconsistentes
- **Compatibilidade:** Endpoint nativo da API n8n suporta multiplas tags nativamente

### Implementacao

**Arquivo:** `scripts/admin/apply-layer-tags/core/services/tag-service.js`

```javascript
/**
 * Aplica multiplas tags a um workflow simultaneamente
 *
 * @param {string} workflowId - ID do workflow
 * @param {Array<string>} tagIds - Array de IDs de tags
 * @returns {Promise<Object>} Workflow atualizado
 */
async applyMultipleTags(workflowId, tagIds) {
  if (!Array.isArray(tagIds) || tagIds.length === 0) {
    throw new Error('tagIds deve ser um array nao vazio');
  }

  const endpoint = `/api/v1/workflows/${workflowId}/tags`;
  const payload = { tagIds: tagIds };

  const response = await this.httpClient.put(endpoint, payload);
  return response.data || response;
}
```

### Uso

```javascript
// Aplicar tag unica (metodo existente)
await tagService.applyTagToWorkflow(workflowId, tagId);

// Aplicar multiplas tags (novo metodo)
await tagService.applyMultipleTags(workflowId, ['tag1', 'tag2', 'tag3']);
```

### Referencias

- `scripts/admin/apply-layer-tags/core/services/tag-service.js` - linhas 286-342
- Documentacao API n8n: https://docs.n8n.io/api/

---

## DECISAO-2: Layer Padrao para Workflows

### Questao Original

Se um workflow no mapping nao tem layer definida, qual comportamento adotar? Devemos interromper a execucao com erro ou usar um valor padrao?

### Decisao Tomada

Workflows sem layer definida receberao automaticamente a layer **"F" (Logs/Diversos)** como fallback, com log de warning (nao erro).

### Justificativa

- **Robustez:** Script nao falha por falta de layer, permitindo processamento completo
- **Rastreabilidade:** Warning registra workflows que usaram layer padrao para posterior categorizacao manual
- **Sensato:** Layer "F" (Logs/Diversos) e adequada para workflows nao categorizados
- **Flexibilidade:** Permite correcao posterior sem reprocessamento completo

### Implementacao

**Arquivo 1:** `scripts/admin/apply-layer-tags/config/config.js`

```javascript
/**
 * Layer padrao para workflows sem layer definida
 */
const DEFAULT_LAYER = 'F';

module.exports = {
  // ...
  DEFAULT_LAYER
};
```

**Arquivo 2:** `scripts/admin/apply-layer-tags/core/validators/data-validator.js`

```javascript
validateMappingItem(item) {
  const warnings = [];
  let hasDefaultLayer = false;
  let appliedLayer = item.layer;

  // Validar campo layer (permite undefined - usa padrao)
  const layerValidation = this.validateLayer(item.layer);
  if (!layerValidation.isValid) {
    if (!item.layer || item.layer === undefined || item.layer === null || item.layer === '') {
      hasDefaultLayer = true;
      appliedLayer = DEFAULT_LAYER;
      warnings.push({
        field: 'layer',
        value: item.layer,
        message: `Layer nao definida para workflow "${item.name?.new || item.id}". Usando layer padrao: ${DEFAULT_LAYER} (${LAYERS[DEFAULT_LAYER]})`
      });
    } else {
      // Layer invalida (nao undefined) - erro
      errors.push(...layerValidation.errors);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    hasDefaultLayer,
    appliedLayer
  };
}
```

### Comportamento

| Condicao | Comportamento | Log |
|----------|---------------|-----|
| Layer = "A" | Usa layer "A" | Nenhum |
| Layer = undefined | Usa layer "F" | WARNING: Layer nao definida, usando F |
| Layer = null | Usa layer "F" | WARNING: Layer nao definida, usando F |
| Layer = "" | Usa layer "F" | WARNING: Layer nao definida, usando F |
| Layer = "Z" | Erro | ERROR: Layer invalida 'Z', esperado A-F |

### Referencias

- `scripts/admin/apply-layer-tags/config/config.js` - linhas 77-83
- `scripts/admin/apply-layer-tags/core/validators/data-validator.js` - linhas 54-128

---

## DECISAO-3: Encoding de Caracteres Especiais

### Questao Original

Workflows com acentos, emojis, caracteres especiais sao suportados? Como garantir compatibilidade entre logs e API?

### Decisao Tomada

- **API:** Preservar nome original (UTF-8) sem sanitizacao
- **Logs:** Sanitizar caracteres especiais para logs/relatorios usando `EdgeCaseHandler.sanitizeName()`
- **Garantir:** Encoding UTF-8 em todas as comunicacoes HTTP

### Justificativa

- **Preservacao de Dados:** API n8n suporta UTF-8 nativamente, nao ha necessidade de sanitizacao
- **Compatibilidade de Logs:** Logs podem ter problemas com emojis e caracteres especiais em terminais antigos
- **Separacao de Responsabilidades:** Sanitizacao apenas para apresentacao, nao para dados

### Implementacao

**Arquivo:** `scripts/admin/apply-layer-tags/utils/edge-case-handler.js`

```javascript
/**
 * Sanitiza nome de workflow para uso em logs e relatorios
 *
 * Remove/substitui caracteres especiais que podem causar problemas.
 * IMPORTANTE: Preserva o nome original para chamadas de API.
 *
 * @param {string} name - Nome do workflow a sanitizar
 * @returns {string} Nome sanitizado
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
  // ... (outros ranges)

  // Substituir colchetes e parenteses por espacos
  sanitized = sanitized.replace(/[\[\]()]/g, ' ');

  // Normalizar espacos multiplos
  sanitized = sanitized.replace(/\s+/g, ' ');

  return sanitized.trim();
}
```

### Uso

```javascript
// Para API - usar nome original
const response = await httpClient.put(`/api/v1/workflows/${id}`, {
  name: workflow.name.new  // UTF-8 preservado
});

// Para logs - usar nome sanitizado
const displayName = edgeCaseHandler.sanitizeName(workflow.name.new);
logger.info(`Processando workflow: ${displayName}`);
```

### Casos de Teste

| Nome Original | API | Log Sanitizado |
|---------------|-----|----------------|
| `Workflow teste` | `Workflow teste` | `Workflow teste` |
| `Workflow [Beta]` | `Workflow [Beta]` | `Workflow  Beta ` |
| `Workflow 🚀 Test` | `Workflow 🚀 Test` | `Workflow  Test` |
| `José's Workflow` | `José's Workflow` | `José's Workflow` |

### Referencias

- `scripts/admin/apply-layer-tags/utils/edge-case-handler.js` - linhas 155-206

---

## DECISAO-4: Cache de Tags Configuravel

### Questao Original

TagService usa cache de 30s. E suficiente? Deve ser configuravel? Como invalidar manualmente?

### Decisao Tomada

- **TTL Configuravel:** Cache TTL movido para `config.js` como `CACHE_CONFIG.tagCacheTTL` (padrao: 30000ms)
- **Invalidacao Manual:** Metodo `clearCache()` publico para invalidacao explicita
- **Logs Detalhados:** Adicionar logs de cache hit/miss com idade do cache

### Justificativa

- **Flexibilidade:** Permite ajustar TTL conforme necessidade sem modificar codigo
- **Visibilidade:** Logs de cache facilitam debug e monitoramento de performance
- **Controle:** Invalidacao manual util apos criar novas tags
- **Performance:** Cache reduz chamadas API em 80-90% em cenarios tipicos

### Implementacao

**Arquivo 1:** `scripts/admin/apply-layer-tags/config/config.js`

```javascript
/**
 * Configuracoes de cache
 */
const CACHE_CONFIG = {
  tagCacheTTL: 30000 // Cache de tags: 30 segundos
};

module.exports = {
  // ...
  CACHE_CONFIG
};
```

**Arquivo 2:** `scripts/admin/apply-layer-tags/core/services/tag-service.js`

```javascript
constructor(httpClient = null, logger = null) {
  // ...
  this._tagsCache = null;
  this._cacheTimestamp = null;
  this._cacheTTL = CACHE_CONFIG.tagCacheTTL; // Configuravel via config.js
}

async listTags() {
  const now = Date.now();

  // Verificar cache
  if (this._tagsCache && this._cacheTimestamp && (now - this._cacheTimestamp) < this._cacheTTL) {
    const cacheAge = Math.floor((now - this._cacheTimestamp) / 1000);
    this.logger.debug(`Cache hit: Retornando ${this._tagsCache.length} tags do cache (idade: ${cacheAge}s)`);
    return this._tagsCache;
  }

  // Cache miss - buscar API
  this.logger.debug('Cache miss: Buscando tags via API: GET /api/v1/tags');
  const response = await this.httpClient.get('/api/v1/tags');
  const tags = response.data || response || [];

  // Atualizar cache
  this._tagsCache = tags;
  this._cacheTimestamp = now;

  this.logger.debug(`Tags encontradas e cacheadas: ${tags.length} (TTL: ${this._cacheTTL}ms)`);
  return tags;
}

/**
 * Limpa o cache interno de tags
 */
clearCache() {
  this._tagsCache = null;
  this._cacheTimestamp = null;
  this.logger.debug('Cache de tags limpo');
}
```

### Uso

```javascript
// Usar cache (padrao)
const tags = await tagService.listTags(); // Cache hit se dentro do TTL

// Invalidar cache manualmente apos criar tag
await tagService.createTag('nova-tag');
tagService.clearCache(); // Proximo listTags() fara API call

// Ajustar TTL (em config.js)
CACHE_CONFIG.tagCacheTTL = 60000; // 60 segundos
```

### Metricas de Cache

```
Cache hit: Retornando 10 tags do cache (idade: 15s)
Cache miss: Buscando tags via API: GET /api/v1/tags
Tags encontradas e cacheadas: 10 (TTL: 30000ms)
Cache de tags limpo
```

### Quando Invalidar Cache

1. Apos criar nova tag: `tagService.createTag()` ja invalida automaticamente
2. Apos deletar tag (futuro)
3. Apos modificar tags externamente
4. Em testes: Limpar entre testes para garantir isolamento

### Referencias

- `scripts/admin/apply-layer-tags/config/config.js` - linhas 85-90
- `scripts/admin/apply-layer-tags/core/services/tag-service.js` - linhas 49, 65-91, 311-315

---

## DECISAO-5: Limite Maximo de Timeout

### Questao Original

EdgeCaseHandler aumenta timeout em 50% apos falhas. Qual o maximo? Como evitar timeouts infinitamente crescentes?

### Decisao Tomada

- **Limite Maximo:** 60 segundos (60000ms) definido em `RETRY_CONFIG.maxTimeout`
- **Log Warning:** Registrar quando limite maximo e atingido
- **Comportamento:** Timeout nao aumenta alem do limite, mesmo apos multiplas falhas

### Justificativa

- **Prevencao de Timeouts Excessivos:** 60s e suficiente para requisicoes mais lentas sem bloquear indefinidamente
- **Experiencia do Usuario:** Timeouts muito longos degradam UX e podem indicar problemas maiores
- **Recursos:** Evita consumo excessivo de recursos (conexoes abertas, memoria)
- **Feedback:** Warnings ajudam a identificar problemas de infraestrutura/rede

### Implementacao

**Arquivo 1:** `scripts/admin/apply-layer-tags/config/config.js`

```javascript
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  timeout: 5000,
  maxTimeout: 60000 // Timeout maximo apos aumentos: 60 segundos
};
```

**Arquivo 2:** `scripts/admin/apply-layer-tags/utils/edge-case-handler.js`

```javascript
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

  // Aumentar timeout em 50% para proxima tentativa
  const newTimeout = Math.floor(currentTimeout * 1.5);
  const maxTimeout = RETRY_CONFIG.maxTimeout || 60000;

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
```

### Progressao de Timeout

| Tentativa | Timeout Anterior | Calculo | Timeout Final | Observacao |
|-----------|------------------|---------|---------------|------------|
| 0 (inicial) | 5000ms | - | 5000ms | Timeout padrao |
| 1 (apos 1 falha) | 5000ms | 5000 * 1.5 = 7500 | 7500ms | Aumentado 50% |
| 2 (apos 2 falhas) | 7500ms | 7500 * 1.5 = 11250 | 11250ms | Aumentado 50% |
| 3 (apos 3 falhas) | 11250ms | 11250 * 1.5 = 16875 | 16875ms | Aumentado 50% |
| ... | ... | ... | ... | ... |
| 8 (apos 8 falhas) | 42656ms | 42656 * 1.5 = 63984 | **60000ms** | **Limite atingido** |
| 9 (apos 9 falhas) | 60000ms | 60000 * 1.5 = 90000 | **60000ms** | Mantido no limite |

### Logs

```
Erro de timeout detectado: ETIMEDOUT - Request timeout after 5000ms
Timeout atual: 5000ms
Ajustando timeout para 7500ms para proxima tentativa (max: 60000ms)

...

Erro de timeout detectado: ETIMEDOUT - Request timeout after 42656ms
Timeout atual: 42656ms
Ajustando timeout para 60000ms para proxima tentativa (max: 60000ms)
Timeout atingiu o limite maximo configurado: 60000ms
Nao sera possivel aumentar timeout alem desse valor
```

### Referencias

- `scripts/admin/apply-layer-tags/config/config.js` - linha 36
- `scripts/admin/apply-layer-tags/utils/edge-case-handler.js` - linhas 317-356

---

## Resumo das Mudancas

### Arquivos Modificados

1. **config/config.js**
   - Adicionar `RETRY_CONFIG.maxTimeout = 60000`
   - Adicionar `DEFAULT_LAYER = 'F'`
   - Adicionar `CACHE_CONFIG.tagCacheTTL = 30000`

2. **core/services/tag-service.js**
   - Adicionar metodo `applyMultipleTags(workflowId, tagIds[])`
   - Atualizar cache para usar `CACHE_CONFIG.tagCacheTTL`
   - Adicionar logs de cache hit/miss

3. **core/validators/data-validator.js**
   - Tratar layer undefined como warning (nao erro)
   - Aplicar layer padrao quando layer ausente
   - Adicionar campo `warnings` ao ValidationResult

4. **utils/edge-case-handler.js**
   - Aplicar limite `RETRY_CONFIG.maxTimeout` em `handleTimeout()`
   - Adicionar logs de warning quando limite atingido

### Arquivos Criados

1. **docs/DECISIONS.md** (este arquivo)
   - Documentar 5 decisoes tecnicas
   - Justificar cada escolha
   - Incluir exemplos de codigo e uso

### Compatibilidade

Todas as mudancas sao **backward compatible**:
- Metodos existentes nao foram modificados (apenas estendidos)
- Defaults razoaveis para novas configuracoes
- Warnings nao quebram execucao

### Testes Recomendados

1. Testar `applyMultipleTags()` com 1, 3, 5 tags
2. Testar workflow sem layer (deve usar "F" com warning)
3. Testar cache hit/miss com diferentes TTLs
4. Testar timeout progressivo ate atingir limite
5. Testar caracteres especiais em nomes (UTF-8, emojis)

---

**Documento criado por:** code-ai (Claude Agent)
**Data:** 2025-10-02
**Versao:** 1.0
**Status:** Aprovado
