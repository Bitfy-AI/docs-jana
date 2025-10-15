# Status da Especificação: CLI Unification & UX Improvement

**Criado**: 2025-10-14
**Status**: Em andamento - Design completo
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

## Achados da Auditoria Integrados

- 33 violações de Factory Pattern
- 2 HttpClients duplicados (792 LOC)
- 2 Loggers duplicados (827 LOC)
- 8 arquivos de código morto (2.091 LOC)
- 67 valores hardcoded

## Ações em Progresso

⏳ **Fase 1**: Remoção de código morto (-2091 LOC, 3h)
- Identificação de arquivos seguros para remoção
- Backup antes da remoção
- Commits atômicos

🔜 **Fase 2**: Unificação HttpClient (-542 LOC, 4h)
🔜 **Fase 3**: Factory Pattern (-500 LOC, 1 semana)
🔜 **Fase 4**: Logger (-477 LOC, 1 semana)

## Redução Total Esperada

**Antes**: ~22.000 LOC
**Depois**: ~16.800 LOC (-23%)

## Próximos Passos

1. ✅ Completar requirements.md
2. ✅ Completar design.md
3. ⏳ Executar Fase 1 (código morto)
4. 🔜 Criar tasks.md (quebra de tarefas)
5. 🔜 Iniciar implementação
