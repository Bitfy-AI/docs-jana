# Status da Especificação: CLI Unification & UX Improvement

**Criado**: 2025-10-14
**Atualizado**: 2025-10-15
**Status**: Pronto para Implementação
**Prioridade**: ALTA

## Documentos Criados

✅ **Requirements** (`.prisma/especificacoes/cli-unification-ux-improvement/requirements.md`)
- 90+ requisitos detalhados em formato EARS
- 5 categorias: FUNC, NFUNC, INTERFACE, DADOS, NEGÓCIO
- Critérios de aceitação completos
- Análise de riscos
- Cronograma estimado: 6 semanas

✅ **Design** (`.prisma/especificacoes/cli-unification-ux-improvement/design.md`)
- Arquitetura completa com diagramas Mermaid
- Consolidação de código duplicado
- Factory Pattern correto
- Menu Enhanced corrigido
- Plano de migração em 4 fases

✅ **Tasks** (`.prisma/especificacoes/cli-unification-ux-improvement/tasks.md`)
- 56 tarefas detalhadas organizadas em 6 fases
- Estimativas de esforço por tarefa
- Mapeamento completo para requisitos
- Diagrama de dependências Mermaid
- Estratégia de rollback e paralelização
- Total: ~111 horas (2.8 semanas full-time)

## Achados da Auditoria Integrados

- 33 violações de Factory Pattern
- 2 HttpClients duplicados (792 LOC)
- 2 Loggers duplicados (827 LOC)
- 8 arquivos de código morto (2.091 LOC)
- 67 valores hardcoded

## Fases de Implementação

⏳ **Fase 1**: Remoção de código morto (7 tasks, 3h, -292 LOC) - **EM ANDAMENTO**
  - ✅ TASK-001: Preparação (branch criada)
  - ✅ TASK-002 a TASK-004: Código morto removido (generate-workflow-docs.js, -292 LOC)
  - ✅ TASK-006: Commit criado (a726bc7)
  - 🔜 TASK-007: Merge para main
  - **Nota**: A maioria do código morto (1.799 LOC) já foi removida em commits anteriores

🔜 **Fase 2**: Unificação HttpClient (10 tasks, 4h, -542 LOC)
🔜 **Fase 3**: Factory Pattern (17 tasks, 40h, -500 LOC)
🔜 **Fase 4**: Logger Unificado (12 tasks, 40h, -477 LOC)
🔜 **Fase 5**: Componentes Adicionais (6 tasks, 16h, -200 LOC)
🔜 **Fase 6**: Testing & Documentation (4 tasks, 8h)

## Redução Total Esperada

**Antes**: ~22.000 LOC
**Depois**: ~16.800 LOC (-23%)
**Redução Conservadora Mapeada**: -3.810 LOC (73% da meta)

## Métricas das Tasks

- **Total de Tasks**: 56 tarefas
- **Esforço Total**: ~111 horas (2.8 semanas full-time)
- **Prioridade Alta**: 38 tasks
- **Prioridade Média**: 18 tasks
- **Risco Médio/Alto**: 22 tasks
- **Cobertura de Testes**: >= 80%

## Progresso Atual

**Branch**: `phase-1/remove-dead-code`
**Commit**: `a726bc7` - chore: remove dead code - generate-workflow-docs.js
**LOC Reduzidas**: -292 (11% da meta da Fase 1)

### Última Execução

**Data**: 2025-10-15
**Método**: Implementação paralela (comando /prisma:implementacao-paralela)
**Resultado**: Fase 1 parcialmente completa

**Descoberta Importante**: A auditoria original identificou 2.091 LOC de código morto, mas a maior parte (1.799 LOC) já foi removida em commits anteriores. Apenas 1 arquivo permanecia:
- `scripts/admin/generate-workflow-docs.js` (292 LOC) ✅ Removido

## Próximos Passos

1. ✅ Completar requirements.md
2. ✅ Completar design.md
3. ✅ Completar tasks.md (quebra de tarefas)
4. ✅ Iniciar TASK-001 (Preparação Fase 1)
5. ✅ Executar TASK-002 a TASK-004 (Remoção de código morto)
6. ✅ Executar TASK-006 (Commit)
7. 🔜 **Executar TASK-007** (Merge para main)
8. 🔜 **Iniciar Fase 2** (Unificação HttpClient)

## Como Iniciar Implementação

```bash
# 1. Revisar documentação completa
cat .prisma/especificacoes/cli-unification-ux-improvement/tasks.md

# 2. Começar Fase 1
git checkout -b phase-1/remove-dead-code

# 3. Seguir tasks sequencialmente
# Ver tasks.md para detalhes completos de cada tarefa
```
