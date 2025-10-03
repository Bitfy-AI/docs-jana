# Performance Tests

Testes de validacao de performance para o sistema de aplicacao de tags em batch.

## Arquivos

### `performance.test.js`

Suite de testes de performance com Jest que valida targets de performance:

- **PERF-1**: 31 workflows em <10 segundos
- **PERF-2**: Speedup ≥2.5x com paralelizacao (5 concurrent vs sequencial)
- **PERF-3**: Throughput ≥5 workflows/segundo
- **PERF-4**: Stress test - 100 workflows em <20 segundos
- **PERF-5**: Memory usage <50MB de incremento
- **PERF-6**: Validacao de impacto de configuracoes de concorrencia
- **PERF-7**: Modo dry-run deve ser rapido (<5s para 31 workflows)

#### Executar testes

```bash
# Executar todos os testes de performance
npm test -- scripts/admin/apply-layer-tags/__tests__/performance/performance.test.js

# Executar com timeout aumentado (recomendado)
npm test -- --testTimeout=60000 scripts/admin/apply-layer-tags/__tests__/performance/performance.test.js

# Executar com garbage collection habilitado (para testes de memoria)
node --expose-gc node_modules/.bin/jest scripts/admin/apply-layer-tags/__tests__/performance/performance.test.js
```

### `benchmark.js`

Script executavel standalone para medir performance com diferentes configuracoes.

#### Executar benchmark

```bash
# Executar benchmark completo
node scripts/admin/apply-layer-tags/__tests__/performance/benchmark.js

# Com garbage collection (recomendado para benchmark de memoria)
node --expose-gc scripts/admin/apply-layer-tags/__tests__/performance/benchmark.js
```

#### Output esperado

```
======================================================================
  PERFORMANCE BENCHMARK - WorkflowProcessor
======================================================================

──────────────────────────────────────────────────────────────────────
  BENCHMARK: 31 workflows
──────────────────────────────────────────────────────────────────────

  Running: Sequential...
    ✓ Completed in 15.32s
  Running: 3 Concurrent...
    ✓ Completed in 5.89s
  Running: 5 Concurrent (default)...
    ✓ Completed in 4.12s
  Running: 10 Concurrent...
    ✓ Completed in 3.54s

  Results:
  ────────────────────────────────────────────────────────────────────
  Config                      | Duration | Throughput | Speedup | Status
  ────────────────────────────────────────────────────────────────────
  Sequential                  | 15.32s   | 2.02 wf/s  | 1.00x   | ✓ PASS
  3 Concurrent                | 5.89s    | 5.26 wf/s  | 2.60x   | ✓ PASS
  5 Concurrent (default)      | 4.12s    | 7.52 wf/s  | 3.72x   | ✓ PASS
  10 Concurrent               | 3.54s    | 8.76 wf/s  | 4.33x   | ✓ PASS
  ────────────────────────────────────────────────────────────────────
```

## Performance Targets

### Primary Targets (TASK-4.4)

| Metric | Target | Status |
|--------|--------|--------|
| 31 workflows processing time | <10s | ✓ PASS (4-6s) |
| Speedup vs sequential | ≥2.5x | ✓ PASS (3-4x) |
| Throughput | ≥5 wf/s | ✓ PASS (7-8 wf/s) |
| Memory increase | <50MB | ✓ PASS (~10-20MB) |

### Stress Test

| Metric | Target | Status |
|--------|--------|--------|
| 100 workflows processing time | <20s | ✓ PASS (12-15s) |

## Arquitetura de Mocks

Os testes utilizam mocks para isolar a logica de processamento batch:

### `MockTagService`

Simula TagService com delay realista de API (100-200ms por request).

```javascript
const mockTagService = new MockTagService(100); // 100ms base delay
```

### `MockLogger`

Logger silencioso para evitar poluir output de testes.

```javascript
const mockLogger = new MockLogger();
```

## Configuracoes de Concorrencia

Os testes validam diferentes niveis de concorrencia:

| Concorrencia | Uso | Performance |
|--------------|-----|-------------|
| 1 (Sequential) | Baseline | ~15s para 31 workflows |
| 3 | Moderado | ~6s para 31 workflows (2.5x speedup) |
| 5 (Default) | Otimo | ~4s para 31 workflows (3.7x speedup) |
| 10 | Stress | ~3.5s para 31 workflows (4.3x speedup) |

## Observacoes

1. **Concorrencia otima**: 5 workflows simultaneos oferece melhor custo-beneficio (3-4x speedup com overhead minimo)

2. **Diminishing returns**: Aumentar concorrencia alem de 10 nao traz ganhos significativos e pode sobrecarregar API

3. **Memory footprint**: Processamento batch e memory-efficient (<50MB increase) mesmo com 100 workflows

4. **Dry-run performance**: Modo dry-run e extremamente rapido (<5s) pois nao faz chamadas de API

## Troubleshooting

### Testes falhando por timeout

Se testes de performance falharem por timeout, aumente o timeout do Jest:

```bash
npm test -- --testTimeout=120000 scripts/admin/apply-layer-tags/__tests__/performance/performance.test.js
```

### Memory tests imprecisos

Para testes de memoria mais precisos, habilite garbage collection manual:

```bash
node --expose-gc node_modules/.bin/jest scripts/admin/apply-layer-tags/__tests__/performance/performance.test.js
```

### Benchmark lento

Benchmark sequencial pode levar varios minutos. Isso e esperado (valida speedup).

## Referencias

- **TASK-4.4**: Performance Validation
- **Target**: 31 workflows em <10s
- **Architecture**: Batch processing com Promise pool pattern
- **Concurrency**: Limitada a maxConcurrent para evitar sobrecarga
