# Melhorias para spec-docs Agent

**Data**: 2025-10-02
**Baseado em**: [LESSONS_LEARNED.md](../LESSONS_LEARNED.md)
**Feedback do Usuário**: "faltou um planejamento de docs no agente docs"
**Status**: Proposta de Implementação

---

## 📋 Resumo das Melhorias

Este documento detalha as melhorias a serem aplicadas ao agente `spec-docs` para:

1. Auto-gerar ADRs (Architecture Decision Records)
2. Arquivar documentação legada
3. Padronizar uso de `.claude/project/` vs `docs/`
4. **NOVO**: Adicionar planejamento estratégico de documentação

---

## 📝 Melhoria #1: Architecture Decision Records (ADRs) - Auto-Generation

### Problema Identificado

**Root Cause**: Specs não incluem "Migration Guide" quando decisões mudam. Falta ADRs para documentar decisões arquiteturais.

**Impacto Real**:

- Documentos contraditórios (Prisma vs Drizzle, Auth vs NoAuth)
- Agentes não sabem qual versão é "truth"
- Tempo gasto organizando docs ao invés de codar

### Solução Proposta

Adicionar **detecção automática** de decisões arquiteturais e gerar ADRs.

#### 1.1 Triggers para ADR Auto-Generation

```markdown
## 📝 ADR Auto-Generation Triggers

**CRITICAL**: Agent must AUTOMATICALLY detect architectural decisions and offer to create ADRs.

### Detection Keywords

Monitor user messages and spec content for these keywords:

#### 🔄 Technology Changes

- "migrate", "migration", "switch to", "change from"
- "replace [X] with [Y]"
- "move from [X] to [Y]"
- Example: "migrate from Prisma to Drizzle"

#### ❌ Feature Removal

- "remove", "delete", "abandon", "drop"
- "no longer using", "deprecate"
- Example: "remove NextAuth", "abandon Payload CMS"

#### ⚠️ Rejected Solutions

- "tried [X] but", "attempted [X] failed"
- "[X] doesn't work with [Y]"
- "incompatible", "conflict"
- Example: "Payload CMS doesn't work with Next.js 14"

#### 🎯 Technology Selection

- "choosing between [X] and [Y]"
- "decided to use [X]", "going with [X]"
- "evaluating [X] vs [Y]"
- Example: "choosing Clerk vs Supabase vs None for auth"

#### 🏗️ Architectural Decisions

- "architecture", "pattern", "approach"
- "monolith vs microservices"
- "client-side vs server-side"
- Example: "using Service Layer pattern"

### Trigger Detection Process

**Step 1**: Scan for keywords in:

- User's initial request
- Requirements document
- Design document
- Conversation context

**Step 2**: If keyword detected, extract:

- **What** is being changed/decided
- **Why** (if mentioned)
- **Alternatives** considered (if any)

**Step 3**: Present ADR creation prompt:

> **📝 ADR TRIGGER DETECTED**
>
> I detected an architectural decision:
>
> - **Decision**: [What is being changed/decided]
> - **Type**: [Migration / Removal / Selection / Pattern]
>
> **Should I create an ADR to document this?**
>
> This will:
>
> - ✅ Document rationale for future reference
> - ✅ Prevent confusion about "why we did this"
> - ✅ Help onboard new team members
> - ✅ Provide rollback context if needed
>
> Create ADR? (yes/no)

### Auto-Detection Examples

#### Example 1: Technology Migration
```

User: "We're migrating from Prisma to Drizzle because of bundle size"

Agent detects:

- Keyword: "migrating from"
- Old tech: Prisma
- New tech: Drizzle
- Reason: bundle size

Agent prompts:

> "📝 ADR Trigger: Migrating from Prisma to Drizzle. Create ADR-XXX to document this decision?"

```

#### Example 2: Feature Removal

```

User: "Remove NextAuth, it's incompatible with Next.js 14"

Agent detects:

- Keyword: "Remove"
- Tech: NextAuth
- Reason: incompatible with Next.js 14

Agent prompts:

> "📝 ADR Trigger: Removing NextAuth due to compatibility. Create ADR to document why and what we're using instead?"

```

#### Example 3: Rejected Solution

```

User: "Tried Payload CMS for 2 days, doesn't work with our routing"

Agent detects:

- Keyword: "Tried ... doesn't work"
- Tech: Payload CMS
- Issue: routing conflict

Agent prompts:

> "📝 ADR Trigger: Rejected Payload CMS. Create ADR to document why it failed and save future teams from trying it?"

```

```

#### 1.2 ADR Template

````markdown
## ADR Template (Auto-Generated)

### File Naming Convention

`docs/decisions/XXX-decision-slug.md`

Where:

- `XXX` = Zero-padded number (001, 002, 003, ...)
- `decision-slug` = Kebab-case description
- Examples:
  - `001-remove-nextauth.md`
  - `002-abandon-payload-cms.md`
  - `003-migrate-to-drizzle.md`

### Template Structure

```markdown
# ADR XXX: [Decision Title]

**Status**: Proposed | Accepted | Rejected | Superseded
**Date**: YYYY-MM-DD
**Deciders**: [Names/Roles]
**Context**: [Project phase, sprint, milestone]

---

## Context

[Why was this decision needed? What problem were we trying to solve?]

### Background

[Project state before decision]

### Problem Statement

[Specific issue requiring decision]

---

## Decision

**We will [DECISION STATEMENT]**

### What Changed

[Concrete actions taken]

### Why This Decision

[Core rationale in 2-3 sentences]

---

## Rationale

### Detailed Reasoning

[In-depth explanation of why this decision makes sense]

### Alternatives Considered

| Option            | Pros                 | Cons                 | Verdict       |
| ----------------- | -------------------- | -------------------- | ------------- |
| Option A (Chosen) | ✅ Pro 1<br>✅ Pro 2 | ❌ Con 1             | ✅ **CHOSEN** |
| Option B          | ✅ Pro 1             | ❌ Con 1<br>❌ Con 2 | ❌ Rejected   |
| Option C          | ✅ Pro 1             | ❌ Deal-breaker      | ❌ Rejected   |

### Evidence

- [Benchmark results](link)
- [GitHub issues](link)
- [Community feedback](link)
- [Internal testing results](link)

---

## Consequences

### Positive Consequences

- ✅ **Benefit 1**: [Description with metric if possible]
- ✅ **Benefit 2**: [Description]
- ✅ **Benefit 3**: [Description]

### Negative Consequences

- ❌ **Trade-off 1**: [What we lose]
- ❌ **Trade-off 2**: [Limitation]
- ⚠️ **Risk 1**: [Potential issue]

### Mitigation Strategies

For each negative consequence:

**Trade-off 1: [Description]**

- Mitigation: [How we address this]
- Fallback: [Plan B if mitigation fails]

---

## Implementation Plan

### Phase 1: [Phase Name] (Timeline)

- [ ] Step 1
- [ ] Step 2
- [ ] Step 3

### Phase 2: [Phase Name] (Timeline)

- [ ] Step 1
- [ ] Step 2

### Validation Criteria

[How to verify implementation succeeded]

---

## Rollback Plan

### Trigger Conditions

[When to consider rollback]

- IF [condition 1]
- IF [condition 2]

### Rollback Steps

1. [Step 1 with estimated time]
2. [Step 2 with estimated time]
3. [Step 3 with estimated time]

**Total Rollback Time**: [Estimate]

### Data Safety

[How to preserve data during rollback]

---

## Metrics for Success

### Quantitative Metrics

| Metric      | Before | Target | Actual (Update post-impl) |
| ----------- | ------ | ------ | ------------------------- |
| Bundle size | 2MB    | 200KB  | TBD                       |
| Cold start  | 500ms  | 100ms  | TBD                       |
| API latency | 200ms  | 50ms   | TBD                       |

### Qualitative Metrics

- [ ] Developer experience improved
- [ ] Deployment simpler
- [ ] Maintenance easier

**Review Date**: [3 months after implementation]

---

## Lessons Learned

**IMPORTANT**: Fill this section AFTER implementation (not before)

### What Went Well

- ✅ [Success 1]
- ✅ [Success 2]

### What Went Poorly

- ❌ [Issue 1]
- ❌ [Issue 2]

### What We'd Do Differently

- 🔄 [Improvement 1]
- 🔄 [Improvement 2]

### Knowledge Captured

[Key insights for future similar decisions]

---

## Related Decisions

- [ADR XXX: Related Decision](./XXX-related-decision.md)
- [ADR YYY: Superseded By](./YYY-superseded-by.md)

---

## References

### Official Documentation

- [Library docs](link)
- [Framework docs](link)

### Community Resources

- [GitHub discussions](link)
- [Blog posts](link)

### Internal Resources

- [Spec document](.claude/specs/...)
- [Implementation PR](link)

---

**Last Updated**: YYYY-MM-DD
**Next Review**: YYYY-MM-DD (3-6 months)
**Status**: [Current status]
```
````

````

---

## 📝 Melhoria #2: Documentation Planning Strategy

### Problema Identificado (Feedback do Usuário)

**Feedback**: "faltou um planejamento de docs no agente docs"

**Root Cause**: Agente spec-docs cria documentação reativa (quando solicitado) sem planejamento estratégico de QUAIS docs criar, QUANDO criar, e ONDE colocar.

### Solução Proposta

Adicionar **fase de planejamento de documentação** ANTES de criar docs.

#### 2.1 Documentation Planning Framework

```markdown
## 📋 Documentation Planning Strategy (MANDATORY)

**CRITICAL**: Before creating ANY documentation, plan the complete documentation ecosystem.

### Step 1: Analyze Documentation Needs

Based on requirements.md and design.md, identify:

#### A. Technical Documentation (`.claude/project/`)

Purpose: For agents and developers to understand architecture

Trigger: Create when...
- ✅ New architectural pattern introduced
- ✅ Technology choice made (requires ADR)
- ✅ Cross-cutting concern established (auth, logging, etc)
- ✅ Development standards defined

Examples:
- `architecture-patterns.md` - Patterns used in project
- `tech-stack.md` - Current stack with versions
- `coding-standards.md` - Code style, naming conventions
- `testing-standards.yaml` - Test structure, coverage rules
- `LESSONS_LEARNED.md` - Post-mortems, mistakes to avoid

#### B. User Documentation (`docs/`)

Purpose: For end-users, API consumers, contributors

Trigger: Create when...
- ✅ Public API available
- ✅ Setup/installation process exists
- ✅ Feature has user-facing behavior
- ✅ Contributing guidelines needed

Examples:
- `docs/api/` - API reference
- `docs/guides/` - How-to guides
- `docs/tutorials/` - Step-by-step tutorials
- `docs/contributing.md` - Contribution guidelines

#### C. Decision Documentation (`docs/decisions/`)

Purpose: Record architectural decisions (ADRs)

Trigger: Create when...
- ✅ Technology migration (Prisma → Drizzle)
- ✅ Feature removal (NextAuth abandoned)
- ✅ Architectural pattern chosen (monolith vs microservices)
- ✅ Trade-offs made (bundle size vs features)

Examples:
- `001-remove-nextauth.md`
- `002-abandon-payload-cms.md`
- `003-migrate-to-drizzle.md`

#### D. Specification Documentation (`.claude/specs/`)

Purpose: Requirements, design, tasks for features

Trigger: Created by spec agents (not spec-docs)

Examples:
- `.claude/specs/epic-1/requirements.md`
- `.claude/specs/epic-1/design.md`
- `.claude/specs/epic-1/tasks.md`

### Step 2: Create Documentation Matrix

Before generating docs, present this matrix to user:

| Document | Type | Location | Priority | Reason | Estimated Effort |
|----------|------|----------|----------|--------|-----------------|
| ADR 004: Drizzle ORM | Decision | `docs/decisions/` | P0 | Document ORM choice | 30 min |
| architecture-patterns.md | Technical | `.claude/project/` | P1 | Establish Service Layer pattern | 1 hour |
| API Reference | User | `docs/api/` | P2 | Public API available in Epic 1 | 2 hours |
| Contributing Guide | User | `docs/contributing.md` | P3 | Open source project | 1 hour |

**Priorities**:
- **P0** (Critical): Must create now (decisions, core architecture)
- **P1** (High): Create this sprint (patterns, standards)
- **P2** (Medium): Create when feature complete (API docs, guides)
- **P3** (Low): Create when needed (nice-to-have)

### Step 3: Get User Approval

> **📋 DOCUMENTATION PLAN**
>
> Based on requirements and design, I recommend creating these documents:
>
> **Priority 0 (Create Now)**:
> - ADR 004: Drizzle ORM choice (30 min)
> - .claude/project/architecture-patterns.md (1 hour)
>
> **Priority 1 (This Sprint)**:
> - .claude/project/tech-stack.md (30 min)
>
> **Priority 2 (When Feature Complete)**:
> - docs/api/analysis-api.md (2 hours)
>
> **Priority 3 (Defer)**:
> - docs/contributing.md (defer to open source launch)
>
> **Total Immediate Effort**: 1.5 hours
>
> Approve this plan? Any additions/changes?

### Step 4: Execute in Priority Order

Create documents P0 → P1 → P2 → P3

For EACH document:
1. Use appropriate template (ADR, pattern doc, API reference)
2. Follow structure from `.claude/templates/`
3. Cross-reference related docs
4. Update index/README if needed
````

#### 2.2 Documentation Quality Checklist

```markdown
## ✅ Documentation Quality Checklist

For EACH document created, verify:

### Content Quality

- [ ] **Purpose Clear**: First paragraph explains "Why this doc exists"
- [ ] **Audience Defined**: Clear who this is for (agents, developers, users)
- [ ] **Structure Logical**: Sections flow naturally
- [ ] **Examples Included**: Code examples where applicable
- [ ] **Up-to-Date**: References current stack from kfc-settings.json

### Discoverability

- [ ] **Linked From Index**: Added to relevant README or index
- [ ] **Cross-Referenced**: Links to related docs
- [ ] **Findable**: In correct folder (`.claude/project/` vs `docs/`)
- [ ] **Naming Consistent**: Follows project conventions

### Maintainability

- [ ] **Last Updated Date**: Includes timestamp
- [ ] **Review Schedule**: Notes when to review (3-6 months)
- [ ] **Change History**: Link to git history or changelog
- [ ] **Ownership**: Clear who maintains this

### Accuracy

- [ ] **No Contradictions**: Doesn't conflict with other docs
- [ ] **No Outdated Tech**: References current stack
- [ ] **Links Valid**: All hyperlinks work
- [ ] **Code Examples Test**: Code snippets are correct

**IF ANY CHECKBOX FAILS**: Fix before committing doc.
```

---

## 📝 Melhoria #3: Standardização .claude/project/ vs docs/

### Problema Identificado

**Root Cause**: "muitos desses arquivos deveriam estar na pasta/projects, mas nao estao mapeados um procedimento dentro dos agentes para isso ser padronizado"

### Solução Proposta

Criar **regras claras** de quando usar `.claude/project/` vs `docs/`.

#### 3.1 Documentation Location Decision Tree

````markdown
## 📂 Documentation Location Rules

**QUESTION 1**: Who is the PRIMARY audience?

### IF audience = "Agents (Claude Code)" OR "Developers (Internal)"

→ **Location**: `.claude/project/`

Examples:

- Architecture patterns (for agents to follow)
- Coding standards (for agents generating code)
- Lessons learned (for agents to avoid mistakes)
- Tech stack rationale (for agents to understand choices)

### IF audience = "End Users" OR "API Consumers" OR "Contributors (External)"

→ **Location**: `docs/`

Examples:

- API reference (for users calling our API)
- Setup guides (for users installing product)
- Tutorials (for users learning features)
- Contributing guide (for external contributors)

### IF audience = "Future Team" OR "Decision Makers"

→ **Location**: `docs/decisions/` (ADRs)

Examples:

- Why we chose Drizzle over Prisma
- Why we removed NextAuth
- Architecture decisions with trade-offs

---

**QUESTION 2**: Is this about CODE or about PRODUCT?

### IF about CODE (implementation details)

→ **Location**: `.claude/project/`

Examples:

- How to structure services
- Error handling patterns
- Database schema conventions
- Testing strategies

### IF about PRODUCT (user-facing features)

→ **Location**: `docs/`

Examples:

- Feature overview
- User guides
- API endpoints
- Changelog

---

**QUESTION 3**: Should this be versioned with specs?

### IF tied to specific feature/epic

→ **Location**: `.claude/specs/{feature-name}/`

Examples:

- requirements.md (for Epic 1)
- design.md (for Epic 1)
- tasks.md (for Epic 1)

### IF applies to ENTIRE PROJECT (cross-cutting)

→ **Location**: `.claude/project/` OR `docs/`

Examples:

- Architecture patterns (all features)
- Coding standards (all code)
- Tech stack (entire project)

---

### Quick Reference Table

| Document Type         | Primary Audience | Location           | Example                    |
| --------------------- | ---------------- | ------------------ | -------------------------- |
| Architecture Patterns | Agents, Devs     | `.claude/project/` | `architecture-patterns.md` |
| Coding Standards      | Agents, Devs     | `.claude/project/` | `coding-standards.md`      |
| Lessons Learned       | Agents, Devs     | `.claude/project/` | `LESSONS_LEARNED.md`       |
| Tech Stack            | Agents, Devs     | `.claude/project/` | `tech-stack.md`            |
| Testing Standards     | Agents, Devs     | `.claude/project/` | `testing-standards.yaml`   |
| ADRs                  | Future team      | `docs/decisions/`  | `001-remove-nextauth.md`   |
| API Reference         | End users        | `docs/api/`        | `analysis-api.md`          |
| Setup Guide           | End users        | `docs/`            | `setup.md`                 |
| Contributing          | External devs    | `docs/`            | `contributing.md`          |
| Feature Specs         | Agents           | `.claude/specs/`   | `epic-1/requirements.md`   |

---

### Migration of Misplaced Docs

**Action**: If doc is in wrong location, move it

Example:

```bash
# Document about "Service Layer Pattern" currently in docs/
# Should be in .claude/project/ (for agents)

git mv docs/service-layer-pattern.md .claude/project/architecture-patterns.md

# Update all references
# Create redirect in docs/README.md if needed
```
````

**Checkpoint**: Ask user before moving existing docs

> "I found `service-layer-pattern.md` in `docs/` but it's for agents/devs. Move to `.claude/project/`?"

````

---

## 📝 Melhoria #4: Legacy Documentation Archival

### Problema Identificado

**Root Cause**: Múltiplos MDs de implementações que falharam. Specs não incluem "Migration Guide" quando decisões mudam.

### Solução Proposta

Processo automático de arquivamento quando decisões mudam.

#### 4.1 Archive Trigger Detection

```markdown
## 🗄️ Legacy Documentation Archival (Automatic)

### Triggers for Archival

Archive docs automatically when:

1. **Technology Replaced**
   - Keyword: "migrate from X to Y"
   - Action: Archive all docs mentioning X
   - Example: Prisma docs archived when migrated to Drizzle

2. **Feature Removed**
   - Keyword: "remove", "abandon", "deprecate"
   - Action: Archive all docs about removed feature
   - Example: NextAuth docs archived when auth removed

3. **Spec Superseded**
   - Keyword: "updated spec", "new version"
   - Action: Move old spec to `.claude/specs/{feature}/archive/`
   - Example: requirements-v1-with-auth.md archived

### Archive Process

**Step 1**: Identify docs to archive
```bash
# Find all docs mentioning removed tech
grep -r "Prisma" docs/
grep -r "NextAuth" .claude/specs/
````

**Step 2**: Create archive location

```
docs/archive/
├── prisma-era/           # All Prisma-related docs
│   ├── schema.md
│   └── migrations.md
├── nextauth-era/         # All NextAuth-related docs
│   ├── setup.md
│   └── api-routes.md
└── README.md             # Index of archived docs
```

**Step 3**: Move files with context

```bash
# Create archive folder with timestamp
mkdir -p docs/archive/nextauth-era

# Move docs
mv docs/auth/*.md docs/archive/nextauth-era/

# Create README explaining why archived
cat > docs/archive/nextauth-era/README.md << 'EOF'
# NextAuth Documentation (Archived)

**Archived Date**: 2025-01-10
**Reason**: NextAuth removed due to Next.js 14 incompatibility
**Replaced By**: No auth in MVP (IP-based rate limiting)
**Related ADR**: [ADR 001: Remove NextAuth](../../decisions/001-remove-nextauth.md)

These docs are kept for historical context only.
EOF
```

**Step 4**: Update references

- Find all links to archived docs
- Replace with links to new docs OR archive location
- Add deprecation notices

**Step 5**: Create migration guide

```markdown
# Migration Guide: NextAuth Removal

**From**: NextAuth-based authentication
**To**: No auth (IP-based rate limiting)
**Date**: 2025-01-10

## What Changed

[Details]

## How to Migrate Code

[Steps]

## Where to Find Old Docs

[Link to archive]
```

### Archive Index

Create `docs/archive/README.md`:

```markdown
# Archived Documentation

This folder contains documentation for technologies/features no longer used in the project.

## Why Archive?

- ✅ Preserve institutional knowledge
- ✅ Help understand past decisions
- ✅ Provide context for ADRs
- ❌ Prevent confusion about current stack

---

## Archived Technologies

### NextAuth (Archived 2025-01-10)

- **Why Removed**: Incompatibility with Next.js 14 App Router
- **Replaced By**: No auth in MVP
- **Related ADR**: [ADR 001](../decisions/001-remove-nextauth.md)
- **Docs**: [nextauth-era/](./nextauth-era/)

### Prisma (Archived 2025-01-08)

- **Why Removed**: Large bundle size, Edge Runtime issues
- **Replaced By**: Drizzle ORM
- **Related ADR**: [ADR 003](../decisions/003-migrate-to-drizzle.md)
- **Docs**: [prisma-era/](./prisma-era/)

### Payload CMS (Archived 2025-01-08)

- **Why Removed**: Routing conflicts with Next.js 14
- **Replaced By**: N/A (was attempted auth solution)
- **Related ADR**: [ADR 002](../decisions/002-abandon-payload-cms.md)
- **Docs**: [payload-era/](./payload-era/)

---

**IMPORTANT**: Do NOT use archived docs for current development. Refer to ADRs for context.
```

````

---

## 📝 Melhoria #5: Integration with kfc-settings.json

### Solução Proposta

```markdown
## ⚙️ kfc-settings.json Integration

### Proposed Addition to kfc-settings.json

Add versioning and archival configuration:

```json
{
  "versioning": {
    "enabled": true,
    "strategy": "archive-on-major-change",
    "archivePath": ".claude/specs/{feature-name}/archive/",
    "keepVersions": 3,
    "autoArchiveTriggers": [
      "stack-change",
      "architecture-change",
      "feature-removal"
    ]
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
````

### Read Before Creating Docs

```markdown
## Reading kfc-settings.json

Before creating documentation:

1. **Read `versioning.enabled`**
   - IF true: Create archive of old versions before updating

2. **Read `legacyDocs.archivePath`**
   - Use this path for archived docs

3. **Read `documentation.adrGeneration.autoDetect`**
   - IF true: Automatically detect ADR triggers
   - IF false: Only create ADRs when explicitly requested

4. **Read `migrations.completed`**
   - Learn what was removed/changed
   - Archive related docs
```

---

## 📝 Melhoria #6: Documentation Validation Checklist

### Solução Proposta

```markdown
## ✅ Pre-Finalization Checklist

Before completing spec-docs phase:

### Documentation Planning

- [ ] Documentation matrix created with priorities?
- [ ] User approved documentation plan?
- [ ] Effort estimated for each doc?
- [ ] Correct location determined (`.claude/project/` vs `docs/`)?

### ADR Generation

- [ ] Architectural decisions detected?
- [ ] ADRs created for all major decisions?
- [ ] ADR template followed completely?
- [ ] Evidence links included?
- [ ] Related ADRs cross-referenced?

### Legacy Documentation

- [ ] Obsolete docs identified?
- [ ] Archive created with README explaining context?
- [ ] Migration guide created if needed?
- [ ] References updated to point to new docs?

### Documentation Quality

- [ ] All docs follow quality checklist?
- [ ] Cross-references added?
- [ ] Index/README updated?
- [ ] No contradictions with other docs?

### Integration

- [ ] Read kfc-settings.json for config?
- [ ] Followed versioning strategy?
- [ ] Archived according to strategy?

**IF ANY CHECKBOX UNCHECKED**: Fix before completing.
```

---

## 📊 Impact Metrics

### Expected Improvements

| Metric                        | Before        | After           | Delta |
| ----------------------------- | ------------- | --------------- | ----- |
| Contradictory docs            | 5-10 files    | 0 files         | -100% |
| Time finding "current truth"  | 30 min        | 5 min           | -83%  |
| ADRs documenting decisions    | 0 (before)    | 100% coverage   | +∞    |
| Documentation location errors | 40% misplaced | 0% misplaced    | -100% |
| Legacy docs causing confusion | High          | Zero (archived) | -100% |

---

## 🔄 Implementation Plan

### Phase 1: Update Agent Prompt

1. Add "ADR Auto-Generation Triggers" section
2. Add "Documentation Planning Strategy"
3. Add ".claude/project/ vs docs/" decision tree
4. Add "Legacy Documentation Archival" process
5. Add pre-finalization checklist

### Phase 2: Update kfc-settings.json

1. Add `versioning` section
2. Add `legacyDocs` section
3. Add `documentation` section

### Phase 3: Test with Existing Specs

1. Re-run spec-docs (should detect ADR opportunities)
2. Verify it creates documentation plan
3. Check it archives legacy docs correctly

---

## 🎯 Success Criteria

Agent successfully improved when:

1. ✅ Automatically detects and offers to create ADRs
2. ✅ Creates documentation plan before generating docs
3. ✅ Places docs in correct location (`.claude/project/` vs `docs/`)
4. ✅ Archives legacy docs when decisions change
5. ✅ Reads kfc-settings.json for configuration
6. ✅ Zero contradictory documentation

---

## 📎 Related Documents

- [LESSONS_LEARNED.md](../LESSONS_LEARNED.md) - Root cause analysis
- [spec-requirements-improvements.md](./spec-requirements-improvements.md) - MVP validation
- [spec-design-improvements.md](./spec-design-improvements.md) - Compatibility matrix
- [ADR 001: Remove NextAuth](../../docs/decisions/001-remove-nextauth.md) - Example ADR

---

**Next**: Apply these improvements to `.claude/agents/kfc/spec-docs.md` (pending approval)
