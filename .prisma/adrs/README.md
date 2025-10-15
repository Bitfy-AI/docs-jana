# Architecture Decision Records (ADRs)

Este diretório contém os registros de decisões arquiteturais (ADRs) do projeto docs-jana.

## O que são ADRs?

Architecture Decision Records (ADRs) são documentos que capturam decisões importantes sobre arquitetura de software, incluindo contexto, opções consideradas, trade-offs, e consequências.

## Formato

Seguimos o formato MADR (Markdown Any Decision Records) com as seguintes seções:

1. **Status:** PROPOSED | ACCEPTED | REJECTED | DEPRECATED | SUPERSEDED
2. **Context:** Situação e problema que levou à decisão
3. **Decision:** Decisão tomada e justificativa
4. **Options Considered:** Alternativas avaliadas com pros/cons
5. **Consequences:** Impactos positivos e negativos
6. **Trade-offs:** Análise de compromissos (velocity vs quality, etc)
7. **Implementation Plan:** Plano detalhado de execução
8. **Success Metrics:** Critérios de sucesso mensuráveis

## ADRs Existentes

### ADR-002: Implementation Strategy After Phase Completion

**Status:** PROPOSED | **Date:** 2025-10-15 | **Theme:** Process / Development

**Quick Access:**
- 🚀 **START HERE:** [ADR-002-START-HERE.md](./ADR-002-START-HERE.md) - Navigation guide
- 📊 **Executive Summary:** [ADR-002-EXECUTIVE-SUMMARY.md](./ADR-002-EXECUTIVE-SUMMARY.md) - 5 min overview
- 📈 **Visual Timeline:** [ADR-002-VISUAL-TIMELINE.md](./ADR-002-VISUAL-TIMELINE.md) - Diagrams & charts
- ✅ **Action Checklist:** [ADR-002-ACTION-CHECKLIST.md](./ADR-002-ACTION-CHECKLIST.md) - Execution steps
- 📚 **Full ADR:** [ADR-002-implementation-strategy-after-phase-completion.md](./ADR-002-implementation-strategy-after-phase-completion.md) - Complete document

**Summary:** Discovered that 6/8 phases of cli-unification-ux-improvement were already implemented. Decision: Implement mandatory pre-flight validation process to prevent duplicate work. ROI: 400-900%.

**Decision:** Option D - Pre-Flight Validation + Strategic Reset

---

### Table Format

| ID | Título | Status | Data | Documentos |
|---|---|---|---|---|
| ADR-002 | Implementation Strategy After Phase Completion | PROPOSED | 2025-10-15 | [Start Here](./ADR-002-START-HERE.md) • [Summary](./ADR-002-EXECUTIVE-SUMMARY.md) • [Visual](./ADR-002-VISUAL-TIMELINE.md) • [Actions](./ADR-002-ACTION-CHECKLIST.md) • [Full](./ADR-002-implementation-strategy-after-phase-completion.md) |

## Quando Criar um ADR?

Crie um ADR para decisões que:

- Afetam múltiplos componentes do sistema
- Têm impacto de longo prazo
- Envolvem trade-offs significativos
- Requerem aprovação de stakeholders
- Mudam processos ou padrões estabelecidos
- Resolvem ambiguidades ou conflitos

## Como Criar um ADR

1. Copie o template (use ADR-002 como referência)
2. Preencha todas as seções obrigatórias
3. Numere sequencialmente (ADR-XXX)
4. Commit no branch apropriado
5. Solicite review de Technical Lead
6. Atualize status após aprovação

## Processo de Aprovação

1. **PROPOSED:** ADR criado, aguardando review
2. **ACCEPTED:** Aprovado por Technical Lead + stakeholders
3. **REJECTED:** Não aprovado, com justificativa documentada
4. **DEPRECATED:** Substituído por nova decisão
5. **SUPERSEDED:** Referência ao ADR que substituiu

## Revisão

ADRs devem ser revisados:
- Após implementação completa (validar se decisão foi correta)
- A cada 3-6 meses (verificar se ainda é relevante)
- Quando surgem novos requisitos que conflitam

## Referências

- [MADR Format](https://adr.github.io/madr/)
- [Architecture Decision Records](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [ADR Tools](https://github.com/npryce/adr-tools)

---

*Última atualização: 2025-10-15*
