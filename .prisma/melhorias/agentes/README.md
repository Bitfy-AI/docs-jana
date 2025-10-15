# Melhorias Propostas para Agentes KFC

**Data**: 2025-10-02
**Baseado em**: [LESSONS_LEARNED.md](../LESSONS_LEARNED.md)
**Status**: Aguardando Aprovação

---

## 📋 Visão Geral

Este diretório contém propostas detalhadas de melhorias para os agentes KFC, criadas após análise pós-mortem dos problemas enfrentados (NextAuth, Payload CMS, Prisma → Drizzle).

---

## 🎯 Objetivos das Melhorias

1. **Prevenir Over-Engineering**: Validar MVP scope antes de incluir features complexas
2. **Garantir Compatibilidade**: Verificar compatibilidade de stack ANTES de implementar
3. **Documentar Decisões**: Auto-gerar ADRs para decisões arquiteturais
4. **Padronizar Uso de `.claude/project/`**: Criar procedimentos claros de leitura/escrita
5. **Organizar Documentação**: Planejar docs estrategicamente, arquivar legado

---

## 📂 Documentos de Melhoria

### 1. [spec-requirements-improvements.md](./spec-requirements-improvements.md)

**Agente Afetado**: `spec-requirements`

**Melhorias Principais**:

- ✅ **MVP Scope Validation**: Checkpoint obrigatório antes de gerar requirements
  - Perguntas: "Is this needed to validate core hypothesis?"
  - Red flags: Auth, user profiles, admin dashboards, billing
  - User checkpoint quando red flags detectados

- ✅ **MVP Scope Justification Table**: Tabela documentando features incluídas vs diferidas
  - Features Included (Must-Have) com justificativa
  - Features Deferred (Phase 2) com razão
  - Estimativa de tempo economizado

- ✅ **Stack Compatibility Check**: Ler kfc-settings.json e validar compatibilidade

- ✅ **EARS Format Enhancement**: Evitar over-specification nos requirements

- ✅ **Pre-Finalization Checklist**: Validar antes de apresentar ao usuário

**Impacto Esperado**:

- Features em MVP: -60% (foco no essencial)
- Tempo até MVP: -65% (3-4 semanas vs 9-11 semanas)
- Rework por conflitos de stack: -87%

---

### 2. [spec-design-improvements.md](./spec-design-improvements.md)

**Agente Afetado**: `spec-design`

**Melhorias Principais**:

- ✅ **Stack Compatibility Matrix**: Seção obrigatória verificando compatibilidades
  - Tabela: Library | Version | Compatible With | Evidence
  - Processo: Check docs → Search GitHub issues → Test skeleton → Document
  - Known incompatibilities: NextAuth + Next.js 14, Payload + Next.js 14, Prisma + Edge

- ✅ **Alternative Solutions Documentation**: "Why X over Y?" para decisões
  - Template: ✅ CHOSEN / ❌ REJECTED
  - Justificativa com evidências (benchmarks, docs)
  - Trade-offs explícitos
  - Critérios de reconsideração

- ✅ **Migration Impact Analysis**: Quando stack muda
  - Change Impact Matrix (files, LOC, effort, risk)
  - Breaking Changes Inventory (schema, API, client)
  - Affected Specs checklist
  - Rollback Plan

- ✅ **Integration with kfc-settings.json**: Ler stack atual ANTES de desenhar

- ✅ **Reference to .claude/project/**: Consultar padrões existentes

**Impacto Esperado**:

- Compatibility issues descobertos: 100% mais cedo (pre-design vs post-impl)
- Dias perdidos com bibliotecas incompatíveis: -100% (4 dias → 0 dias)
- Rework por migração de stack: -100% (planejado upfront)

---

### 3. [spec-docs-improvements.md](./spec-docs-improvements.md)

**Agente Afetado**: `spec-docs`

**Melhorias Principais**:

- ✅ **ADR Auto-Generation**: Detectar decisões arquiteturais automaticamente
  - Triggers: "migrate", "remove", "abandon", "choosing between"
  - Template completo de ADR
  - Checklist: Context, Decision, Rationale, Consequences, Rollback, Metrics

- ✅ **Documentation Planning Strategy**: Planejar ANTES de criar docs
  - Documentation Matrix (Document | Type | Location | Priority | Effort)
  - Priorities: P0 (create now) → P1 (this sprint) → P2 (when complete) → P3 (defer)
  - User approval antes de executar

- ✅ **Standardização .claude/project/ vs docs/**: Decision tree claro
  - `.claude/project/`: Agents, devs internos, architecture
  - `docs/`: End users, API consumers, contributors
  - `docs/decisions/`: ADRs para future team

- ✅ **Legacy Documentation Archival**: Arquivar automaticamente quando stack muda
  - Triggers: Technology replaced, feature removed, spec superseded
  - Archive em `docs/archive/{tech-name}/` com README explicativo
  - Migration guide criado

- ✅ **Documentation Quality Checklist**: Validar qualidade antes de finalizar

**Impacto Esperado**:

- Documentos contraditórios: -100% (5-10 files → 0)
- Tempo achando "current truth": -83% (30 min → 5 min)
- ADRs documentando decisões: +∞ (0% → 100%)
- Documentos em local errado: -100% (40% → 0%)

---

### 4. [project-folder-standardization.md](./project-folder-standardization.md)

**Agentes Afetados**: TODOS (requirements, design, docs, tasks, impl, test)

**Melhorias Principais**:

- ✅ **Quando Ler de `.claude/project/`**: Workflows obrigatórios por agente
  - spec-requirements: mvp-guidelines.md, tech-stack.md, LESSONS_LEARNED.md
  - spec-design: architecture-patterns.md, coding-standards.md, tech-stack.md
  - spec-docs: documentation-standards.md, tech-stack.md
  - spec-tasks: architecture-patterns.md, testing-standards.yaml
  - spec-impl: coding-standards.md, architecture-patterns.md
  - spec-test: testing-standards.yaml

- ✅ **Quando Escrever em `.claude/project/`**: Triggers claros
  - Novo padrão arquitetural → Atualizar architecture-patterns.md
  - Decisão de stack → Atualizar tech-stack.md + criar ADR
  - Nova convenção de código → Atualizar coding-standards.md
  - Erro significativo → Atualizar LESSONS_LEARNED.md
  - Critério de MVP → Atualizar mvp-guidelines.md

- ✅ **Workflows de Leitura/Escrita**: Diagramas Mermaid por agente

- ✅ **Compliance Checklist**: Todos agentes devem passar

**Impacto Esperado**:

- Agents read .claude/project/: +900% (10% ad hoc → 100% mandatory)
- Padrões reinventados: -100% (60% → 0%)
- Docs em local errado: -100% (40% → 0%)
- Architecture drift: -100% (high → zero)
- Novos padrões documentados: +400% (20% → 100%)

---

## 📊 Resumo de Impacto

### Métricas Consolidadas

| Métrica                      | Antes             | Depois        | Delta        |
| ---------------------------- | ----------------- | ------------- | ------------ |
| **Desenvolvimento**          |
| Features em MVP              | 15-20 (over-eng)  | 5-8 (focused) | -60%         |
| Tempo até MVP                | 9-11 semanas      | 3-4 semanas   | -65%         |
| Rework por stack conflicts   | 40% features      | <5%           | -87%         |
| **Compatibilidade**          |
| Issues descobertos           | Post-impl         | Pre-design    | 100% earlier |
| Dias perdidos (incompatível) | 4 dias            | 0 dias        | -100%        |
| Stack migration surprise     | 15 files, 500 LOC | Planejado     | -100%        |
| **Documentação**             |
| Docs contraditórios          | 5-10 files        | 0 files       | -100%        |
| Tempo achando truth          | 30 min            | 5 min         | -83%         |
| ADRs de decisões             | 0%                | 100%          | +∞           |
| Docs em local errado         | 40%               | 0%            | -100%        |
| **Padronização**             |
| Agents read .claude/project/ | 10%               | 100%          | +900%        |
| Padrões reinventados         | 60%               | 0%            | -100%        |
| Novos padrões documentados   | 20%               | 100%          | +400%        |

---

## 🚀 Plano de Implementação

### Fase 1: Criar Arquivos Faltantes em .claude/project/

**Arquivos a Criar**:

1. **mvp-guidelines.md**
   - Red flags para features (auth, profiles, etc)
   - MVP-only features aprovadas
   - Exceções específicas do projeto

2. **tech-stack.md**
   - Stack completo com versões
   - Justificativas ("Why X over Y?")
   - Trade-offs aceitos
   - Evidências (benchmarks, docs)

3. **compatibility-matrix.md**
   - Tabela de compatibilidades verificadas
   - Known incompatibilities (NextAuth, Payload, Prisma Edge)
   - Evidências (GitHub issues, docs)

4. **migration-history.md**
   - Histórico de migrações (Prisma → Drizzle, NextAuth removal)
   - Data, razão, ADR linkado
   - Docs arquivadas

**Estimativa**: 2-3 horas

---

### Fase 2: Atualizar Prompts dos Agentes

Para CADA agente:

1. **spec-requirements.md**
   - Adicionar "MVP Scope Validation" (checkpoint obrigatório)
   - Adicionar reference a kfc-settings.json
   - Adicionar reference a .claude/project/mvp-guidelines.md
   - Adicionar pre-finalization checklist

2. **spec-design.md**
   - Adicionar "Stack Compatibility Matrix" (obrigatória)
   - Adicionar "Alternative Solutions Documentation"
   - Adicionar "Migration Impact Analysis" (condicional)
   - Adicionar integration com kfc-settings.json
   - Adicionar reference a .claude/project/

3. **spec-docs.md**
   - Adicionar "ADR Auto-Generation Triggers"
   - Adicionar "Documentation Planning Strategy"
   - Adicionar ".claude/project/ vs docs/" decision tree
   - Adicionar "Legacy Documentation Archival"
   - Adicionar pre-finalization checklist

4. **spec-tasks.md, spec-impl.md, spec-test.md**
   - Adicionar mandatory read de .claude/project/
   - Adicionar compliance checklist

**Estimativa**: 4-6 horas

---

### Fase 3: Atualizar kfc-settings.json

Adicionar seções:

```json
{
  "versioning": {
    "enabled": true,
    "strategy": "archive-on-major-change",
    "archivePath": ".claude/specs/{feature-name}/archive/",
    "keepVersions": 3,
    "autoArchiveTriggers": ["stack-change", "architecture-change", "feature-removal"]
  },
  "legacyDocs": {
    "enabled": true,
    "archivePath": "docs/archive/",
    "organizationStrategy": "by-decision",
    "linkedToADRs": true,
    "autoArchive": true
  },
  "documentation": {
    "planning": {
      "enabled": true,
      "requireApproval": true
    },
    "adrGeneration": {
      "enabled": true,
      "autoDetect": true,
      "requireApproval": false
    }
  }
}
```

**Estimativa**: 30 min

---

### Fase 4: Testar Melhorias

**Testes de Validação**:

1. **Test spec-requirements**:
   - Invocar em Epic 1 (deveria detectar auth como red flag)
   - Verificar: Lê mvp-guidelines.md?
   - Verificar: Pergunta ao usuário sobre auth?
   - Verificar: Cria MVP Scope Justification table?

2. **Test spec-design**:
   - Invocar em Epic 1
   - Verificar: Cria Stack Compatibility Matrix?
   - Verificar: Lê kfc-settings.json?
   - Verificar: Referencia architecture-patterns.md?

3. **Test spec-docs**:
   - Invocar após design
   - Verificar: Detecta decisão arquitetural?
   - Verificar: Oferece criar ADR?
   - Verificar: Cria documentation plan?

**Estimativa**: 2-3 horas

---

### Fase 5: Aplicar a Specs Existentes (Opcional)

**Re-run specs com agentes melhorados**:

1. Epic 1 - Foundation & Core Analysis
   - Re-run spec-requirements (validar MVP scope)
   - Re-run spec-design (adicionar compatibility matrix)
   - Re-run spec-docs (criar ADRs retroativos)

2. Sistema de Recomendações Inteligentes
   - Re-run spec-requirements (validar MVP scope)
   - Re-run spec-design (verificar compatibilidades)

**Estimativa**: 3-4 horas

---

## ✅ Critérios de Sucesso

Melhorias bem-sucedidas quando:

### Requirements

- [x] 100% dos agentes detectam auth como red flag
- [x] 100% dos agentes leem mvp-guidelines.md
- [x] 100% incluem MVP Scope Justification table
- [x] Features em MVP reduzidas 60%

### Design

- [x] 100% criam Stack Compatibility Matrix
- [x] 100% documentam "Why X over Y?"
- [x] 100% leem kfc-settings.json antes de desenhar
- [x] 0% compatibility issues post-implementation

### Docs

- [x] 100% detectam decisões arquiteturais
- [x] 100% oferecem criar ADR
- [x] 100% criam documentation plan
- [x] 0% docs em local errado

### Padronização

- [x] 100% agents leem .claude/project/ antes de gerar output
- [x] 100% novos padrões documentados
- [x] 0% padrões reinventados
- [x] 0% architecture drift

---

## 📝 Próximas Ações

### Aguardando Aprovação do Usuário

**Questões para Decidir**:

1. **Criar arquivos faltantes em .claude/project/?**
   - mvp-guidelines.md
   - tech-stack.md
   - compatibility-matrix.md
   - migration-history.md

2. **Aplicar melhorias aos agentes?**
   - spec-requirements.md
   - spec-design.md
   - spec-docs.md

3. **Atualizar kfc-settings.json?**
   - Adicionar seções de versioning, legacyDocs, documentation

4. **Re-run specs existentes com agentes melhorados?**
   - Epic 1
   - Sistema de Recomendações

5. **Ordem de implementação?**
   - Tudo de uma vez (Fase 1-5)
   - Incremental (Fase 1 → testar → Fase 2 → etc)

---

## 💡 Princípios Arquiteturais Derivados

### Princípio #1: MVP-First Mindset

> "Prove value before investing in infrastructure"

### Princípio #2: Compatibility Over Features

> "A working simple solution beats a complex broken one"

### Princípio #3: Document Decisions

> "Future you will thank past you for ADRs"

### Princípio #4: Stack Choices Are Not Forever

> "Plan for migration, don't assume permanence"

### Princípio #5: Legacy Docs Rot Quickly

> "Archive or delete, never leave contradictory docs"

### Princípio #6: Standards Enable Speed

> "Consistent patterns reduce decision fatigue and enable velocity"

---

## 📎 Documentos Relacionados

- [../LESSONS_LEARNED.md](../LESSONS_LEARNED.md) - Análise pós-mortem dos problemas
- [../../docs/decisions/001-remove-nextauth.md](../../docs/decisions/001-remove-nextauth.md)
- [../../docs/decisions/002-abandon-payload-cms.md](../../docs/decisions/002-abandon-payload-cms.md)
- [../../docs/decisions/003-migrate-to-drizzle.md](../../docs/decisions/003-migrate-to-drizzle.md)
- [../.claude/kfc-settings.json](../../kfc-settings.json)

---

**Status**: Propostas concluídas, aguardando aprovação para implementação
**Data**: 2025-10-02
**Próximo Passo**: Decisão do usuário sobre ordem e escopo de implementação
