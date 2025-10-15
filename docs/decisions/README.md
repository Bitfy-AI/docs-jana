# Architecture Decision Records (ADRs)

Este diretório contém os Architecture Decision Records (ADRs) do projeto docs-jana.

## 📋 O que são ADRs?

ADRs documentam decisões arquiteturais importantes, incluindo:
- **Contexto**: Por que a decisão foi necessária
- **Decisão**: O que foi decidido
- **Alternativas**: Outras opções consideradas
- **Consequências**: Impactos positivos e negativos

## 📚 Lista de ADRs

### Padrões Arquiteturais

| # | Título | Status | Data |
|---|--------|--------|------|
| [001](adr-001-service-locator-pattern.md) | Service Locator Pattern | ⚠️ Pendente | - |
| [002](adr-002-factory-pattern-di.md) | Factory Pattern para DI | ⚠️ Pendente | - |
| [003](adr-003-template-method-pattern.md) | Template Method via BaseCommand | ⚠️ Pendente | - |

### Componentes e Serviços

| # | Título | Status | Data |
|---|--------|--------|------|
| [004](adr-004-httpclient-unification.md) | Unificação do HttpClient | ⚠️ Pendente | - |
| [005](adr-005-visual-system-architecture.md) | Visual System Architecture | ⚠️ Pendente | - |
| [006](adr-006-logger-data-masking.md) | Logger com Data Masking | ⚠️ Pendente | - |

### Estratégias de Desenvolvimento

| # | Título | Status | Data |
|---|--------|--------|------|
| [007](adr-007-parallel-implementation.md) | Parallel Implementation Strategy | ⚠️ Pendente | - |
| [008](adr-008-menu-orchestrator-pattern.md) | Menu Orchestrator Pattern | ⚠️ Pendente | - |
| [009](adr-009-cli-refactor-phases.md) | CLI Refactor em 6 Fases | ⚠️ Pendente | - |
| [010](adr-010-zero-breaking-changes.md) | Zero Breaking Changes Policy | ⚠️ Pendente | - |

## 📝 Como Criar um Novo ADR

### 1. Use o Template

Copie o template: `cp TEMPLATE.md adr-XXX-titulo.md`

### 2. Numeração

- ADRs são numerados sequencialmente (001, 002, 003...)
- Número não é reutilizado mesmo se ADR for depreciado

### 3. Status Possíveis

- **Proposta**: Em discussão
- **Aceita**: Implementada
- **Depreciada**: Não mais válida
- **Substituída**: Por outro ADR

### 4. Processo de Aprovação

1. Crie issue no GitHub descrevendo a decisão
2. Crie branch `adr/XXX-titulo`
3. Escreva o ADR seguindo o template
4. Abra PR linkando a issue
5. Mínimo 2 aprovações de desenvolvedores senior
6. Merge e implementação

## 🔍 Template

Ver [TEMPLATE.md](TEMPLATE.md) para estrutura completa.

## 📊 Estatísticas

- **Total de ADRs**: 10 (pendentes)
- **Aceitos**: 0
- **Propostos**: 10
- **Depreciados**: 0

## 🎯 ADRs Críticos (Alta Prioridade)

Estes ADRs impactam toda a arquitetura e devem ser documentados primeiro:

1. **ADR-001**: Service Locator Pattern - Fundação da arquitetura
2. **ADR-003**: Template Method Pattern - Estrutura de comandos
3. **ADR-007**: Parallel Implementation - Estratégia de refatoração

## 📚 Referências

- [Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [ADR GitHub](https://adr.github.io/)
- [Architecture Decision Record (ADR) examples](https://github.com/joelparkerhenderson/architecture-decision-record)

---

**Última atualização**: 2025-10-15
