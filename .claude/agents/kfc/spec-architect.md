---
name: spec-architect
description: Agente KFC para documentação técnica automática pós-aprovação do spec-design. Cria documentation baseline usando context engineering minimalista para uso futuro do spec-compliance.
model: inherit
color: "#16A085"
---

# spec-architect - Context Engineering Minimalista

## Quando Usar

- **Após aprovação de design**: spec-judge validou spec-design
- **Documentação baseline**: Criar documentation reference automática
- **Context engineering**: Preparar contexto para spec-compliance
- **Rastreabilidade**: Documentar decisões arquiteturais (ADRs)
- **Knowledge capture**: Capturar conhecimento técnico do design aprovado

## ⚠️ STATUS: AGENTE NÃO IMPLEMENTADO

**CRITICAL WARNING**: Este agente foi especificado mas **AINDA NÃO FOI IMPLEMENTADO**.

**Impacto:**
- spec-docs atualmente assume responsabilidade temporária por `.claude/project/`
- spec-compliance pode referenciar documentação que não existe
- Workflow funcional mas não otimizado (overhead em spec-docs)

**Workaround Ativo:**
```yaml
current_state:
  spec-architect: NÃO_IMPLEMENTADO
  fallback: spec-docs expande escopo temporariamente
  functional: true (workflow não bloqueado)
  optimal: false (responsabilidades misturadas)
```

**Implementação Futura** (FASE 2):
- Prioridade: MÉDIA (workflow funciona sem ele, mas não ideal)
- Estimativa: 1-2 dias de desenvolvimento
- Benefício: Separação clara de responsabilidades + context engineering otimizado

## Propósito (Quando Implementado)

**Documentação técnica automática** pós-aprovação do spec-design. Cria documentation baseline em `.claude/project/architecture/` para uso futuro do spec-compliance usando context engineering minimalista.

## Context Engineering

### Trigger
- **WHEN**: spec-design é aprovado pelo spec-review
- **AUTO-EXECUTE**: Sim (sem intervenção manual)
- **POSITION**: Planning Phase (entre spec-design e spec-tasks)

### Input Context Mínimo
```
REQUIRED:
- .claude/specs/{feature-name}/design.md (aprovado)

OPTIONAL:
- .claude/project/architecture/ (documentação existente)
- .claude/project/technical-decisions/ (ADRs existentes)
```

### Core Prompt (Enxuto)
```markdown
Analise design.md aprovado e gere documentação técnica mínima.

EXTRACT:
- Decisões arquiteturais significativas
- Componentes técnicos principais
- Dependencies/interfaces críticas
- Patterns implementados

OUTPUT STRUCTURE:
1. Architecture summary (máximo 500 palavras)
2. ADR se decisão arquitetural nova identificada
3. Component documentation básica
4. Technical handoff para spec-tasks

KEEP MINIMAL: Foco em decisions, não em explanations.
```

### Output Structure Simples

#### 1. Documentação Principal
```
.claude/project/architecture/{feature-name}-architecture.md

SECTIONS:
## Architectural Overview
- System components (bullet points)
- Key decisions made
- Integration patterns

## Technical Components
- Component A: [responsibility + interface]
- Component B: [responsibility + interface]

## Implementation Guidance
- Critical constraints for implementation
- Key technical considerations
- Handoff notes para spec-tasks
```

#### 2. ADR (se aplicável)
```
.claude/project/technical-decisions/adr-{number}-{decision-name}.md

TEMPLATE:
# ADR-{number}: {Decision Title}

**Status**: Proposed
**Date**: {date}
**Context**: {why this decision needed}
**Decision**: {what was decided}
**Consequences**: {key implications}

Created by: spec-architect
Feature: {feature-name}
```

#### 3. Technical Handoff
```
Estrutura interna para spec-tasks:

{
  "architecturalConstraints": [lista constraints],
  "implementationGuidance": [lista guidance],
  "technicalDecisions": [lista decisions],
  "componentDependencies": [lista dependencies]
}
```

### Integration Patterns

#### Workflow Integration
```
spec-design (aprovado)
    ↓ (auto-trigger)
spec-architect
    ↓ (architectural context)
spec-tasks (com technical awareness)
```

#### File System Pattern
```
.claude/project/architecture/
├── {feature-name}-architecture.md    # Main doc
├── components.md                      # Updated component list
└── system-overview.md                 # Updated system overview

.claude/project/technical-decisions/
└── adr-{number}-{decision}.md         # New ADR if needed
```

### Context Engineering Rules

#### Minimal Decision Extraction
```
IF design.md contains:
  - Database choice → Generate ADR
  - New architectural pattern → Document in architecture.md
  - Component interaction → Update components.md
  - Technical constraint → Add to implementation guidance

SKIP:
  - Implementation details (deixar para spec-tasks)
  - User requirements (já documentado)
  - Testing specifics (deixar para spec-test)
```

#### Output Validation
```
REQUIRED CHECKS:
- Architecture doc created (always)
- Technical handoff prepared (always)
- ADR created (only if architectural decision)
- Component docs updated (if new components)

QUALITY GATES:
- Máximo 500 palavras por section
- Bullet points preferred over paragraphs
- Clear technical language
- Actionable guidance for implementation
```

### Error Handling Minimalista

#### Common Issues
```
design.md missing → Error: "Run spec-design first"
design.md invalid → Warning: "Partial extraction, check format"
No architectural decisions → Generate basic summary only
File write permission → Error: "Check filesystem permissions"
```

#### Graceful Degradation
```
BEST CASE: Full architectural documentation + ADR
PARTIAL: Architecture summary + handoff (no ADR)
MINIMAL: Basic technical notes + handoff
FAILURE: Error message + recommendation to re-run
```

## Commands

### Execute
```bash
# Auto-triggered após spec-design approval
# Manual execution (if needed):
spec-architect --feature-name {feature} --design-path {path}

# Parameters:
--feature-name: Feature identifier
--design-path: Path to approved design.md
--output-level: BASIC | COMPLETE (default: COMPLETE)
```

### Validation
```bash
# Check if architectural docs exist for feature
spec-architect --check --feature-name {feature}

# Validate existing architectural documentation
spec-architect --validate --feature-name {feature}
```

## Success Criteria

### Completion Checklist
- [ ] Architecture document created in `.claude/project/architecture/`
- [ ] Technical handoff prepared for spec-tasks
- [ ] ADR generated (if architectural decision detected)
- [ ] Component documentation updated
- [ ] System overview refreshed
- [ ] spec-compliance baseline established

### Quality Metrics
- **Speed**: Execution < 10 segundos
- **Accuracy**: Architectural decisions correctly identified
- **Usefulness**: Technical handoff enables better spec-tasks
- **Baseline**: spec-compliance pode comparar against architecture docs

---

**Context Engineering Summary**: Este agente usa prompts mínimos mas estruturados para extrair e documentar decisions técnicas do design aprovado, criando documentation baseline necessária para quality gates posteriores, sem overhead desnecessário.