# Melhorias para spec-design Agent

**Data**: 2025-10-02
**Baseado em**: [LESSONS_LEARNED.md](../LESSONS_LEARNED.md)
**Status**: Proposta de Implementação

---

## 📋 Resumo das Melhorias

Este documento detalha as melhorias a serem aplicadas ao agente `spec-design` para garantir compatibilidade de stack, documentar decisões técnicas e prevenir migrações não planejadas.

---

## 🔍 Melhoria #1: Stack Compatibility Matrix (Obrigatória)

### Problema Identificado

**Root Cause**: Agentes não verificam compatibilidade de versões antes de criar designs.

**Impacto Real**:

- NextAuth v4 incompatível com Next.js 14 App Router → 2 dias perdidos
- Payload CMS incompatível com Next.js 14 routing → 2 dias perdidos
- Specs baseadas em tecnologias que não funcionam juntas

### Solução Proposta

Adicionar seção **OBRIGATÓRIA** de verificação de compatibilidade.

#### 1.1 Seção a Adicionar no Design Document

```markdown
## 🔍 Stack Compatibility Matrix (MANDATORY)

**CRITICAL**: Before designing any component, verify ALL library compatibilities.

### Compatibility Verification Table

| Library       | Version | Compatible With    | Verified? | Evidence              | Risk Level |
| ------------- | ------- | ------------------ | --------- | --------------------- | ---------- |
| Next.js       | 14.2.x  | App Router         | ✅        | [Official docs](link) | Low        |
| Drizzle ORM   | 0.30.x  | Next.js 14 Edge    | ✅        | [Benchmark](link)     | Low        |
| OpenAI SDK    | 4.x     | Next.js API Routes | ✅        | [Examples](link)      | Low        |
| TensorFlow.js | 4.x     | Next.js SSR        | ⚠️        | Client-side only      | Medium     |

### Verification Process

For EACH library in the design:

1. **Check Official Docs**
   - Does library officially support framework version?
   - Are there migration guides for this version?

2. **Search GitHub Issues**
   - Query: `"[Library] [Framework] [Version] issue"`
   - Example: "NextAuth Next.js 14 App Router issue"
   - Red flags: 50+ open issues, "not compatible", "breaking change"

3. **Test Skeleton App**
   - Create minimal test project
   - Import library
   - Test critical functionality
   - Document results

4. **Document Evidence**
   - Link to compatibility confirmation
   - Include version numbers
   - Note any limitations/workarounds

### Known Incompatibilities (Reference)

Based on project history (from `.claude/project/LESSONS_LEARNED.md`):

- ❌ **NextAuth v4 + Next.js 14 App Router**
  - Issue: Middleware incompatible with Edge Runtime
  - Evidence: [GitHub Issues](https://github.com/nextauthjs/next-auth/issues?q=app+router)
  - Alternative: Clerk, Supabase Auth (defer to Phase 2)

- ❌ **Payload CMS + Next.js 14**
  - Issue: Requires separate Express backend, routing conflicts
  - Evidence: [GitHub Issues](https://github.com/payloadcms/payload/issues?q=nextjs+14)
  - Alternative: Use headless CMS (Sanity, Contentful) if needed

- ⚠️ **Prisma + Edge Runtime**
  - Issue: Limited support, 2MB bundle size, cold start penalty
  - Evidence: [Prisma Edge Docs](https://www.prisma.io/docs/guides/deployment/edge)
  - Alternative: Drizzle ORM (50KB, native Edge support)

### Compatibility Checkpoint

**STOP and ASK USER** if you detect:

- ❌ Library with 50+ open compatibility issues
- ❌ Library marked "experimental" or "beta" with framework
- ❌ No official docs for framework version
- ❌ Community reports: "doesn't work", "incompatible"

Example:

> **⚠️ COMPATIBILITY WARNING**
>
> I want to use **[Library X v2.0]** for authentication, but I found:
>
> - 127 open GitHub issues about Next.js 14 compatibility
> - No official migration guide for App Router
> - Community consensus: "broken in production"
>
> **Recommendation**: Use **[Alternative Y]** instead because:
>
> - ✅ Official Next.js 14 support
> - ✅ 5 open issues (low)
> - ✅ Used by 10k+ projects
>
> Proceed with alternative?
```

---

## 🔍 Melhoria #2: Alternative Solutions Documentation

### Problema Identificado

**Root Cause**: Escolhas de stack não documentadas com justificativa. Nenhuma seção "Why X over Y?".

**Impacto Real**:

- Specs criadas com Prisma sem justificar por que não Drizzle
- Decisão de migrar para Drizzle veio depois → rework completo

### Solução Proposta

Para CADA escolha técnica major, documentar alternativas consideradas.

```markdown
## 🎯 Technical Decisions & Alternatives

### Decision Framework

For each major technology choice, document:

1. **What** was chosen
2. **Why** it was chosen over alternatives
3. **Trade-offs** (what we gain vs lose)
4. **Evidence** (benchmarks, docs, community)

---

### Example: ORM Choice

#### ✅ CHOSEN: Drizzle ORM

**Why Drizzle?**

- ✅ **Edge Runtime Support**: Native support for Vercel Edge, Cloudflare Workers
- ✅ **Bundle Size**: 50KB (vs Prisma 2MB) → 97% smaller
- ✅ **TypeScript-First**: No code generation, native TS types
- ✅ **Performance**: 3x faster queries (cold start)
- ✅ **SQL-Like**: More control, less magic

**Evidence**:

- [Drizzle Benchmarks](https://orm.drizzle.team/benchmarks)
- [Bundle Size Comparison](link)

**Trade-offs Accepted**:

- ❌ Less mature ecosystem than Prisma (but growing fast)
- ❌ No built-in migrations UI (use `drizzle-kit` CLI)
- ⚠️ Learning curve for SQL-first approach

---

#### ❌ REJECTED: Prisma

**Why NOT Prisma?**

- ❌ **Edge Runtime**: Limited support, many issues
- ❌ **Bundle Size**: 2MB → increases cold start time
- ❌ **Cold Start**: 300-500ms penalty vs Drizzle
- ❌ **Vendor Lock-in**: Prisma-specific syntax

**Evidence**:

- [Prisma Edge Runtime Issues](https://github.com/prisma/prisma/issues?q=edge+runtime)
- [Cold Start Benchmarks](link)

**When to Reconsider**:

- IF Prisma releases Edge-optimized version
- IF bundle size reduced to <200KB
- IF cold start penalty eliminated

---

### Template for Decisions

Use this format for all major choices:

#### ✅ CHOSEN: [Technology Name]

**Why [Technology]?**

- ✅ Reason 1 (with metric)
- ✅ Reason 2 (with evidence)
- ✅ Reason 3

**Evidence**:

- [Link to benchmark/docs]

**Trade-offs Accepted**:

- ❌ Limitation 1
- ⚠️ Caveat 2

---

#### ❌ REJECTED: [Alternative]

**Why NOT [Alternative]?**

- ❌ Deal-breaker 1
- ❌ Deal-breaker 2

**Evidence**:

- [Link to issue/limitation]

**When to Reconsider**:

- IF [condition changes]

---

### Categories Requiring Documentation

Document alternatives for:

1. **ORM/Database Access** (Prisma vs Drizzle vs TypeORM)
2. **Authentication** (NextAuth vs Clerk vs Supabase vs None)
3. **State Management** (Context vs Redux vs Zustand vs Jotai)
4. **Styling** (Tailwind vs CSS Modules vs Styled Components)
5. **Data Fetching** (SWR vs React Query vs native fetch)
6. **Testing** (Jest vs Vitest, Testing Library vs Playwright)

**Threshold**: If choosing between 2+ well-known options, document decision.
```

---

## 🔍 Melhoria #3: Migration Impact Analysis

### Problema Identificado

**Root Cause**: Quando stack muda (Prisma → Drizzle), não há análise de impacto. Specs precisam ser reescritas sem planejamento.

### Solução Proposta

Quando design envolve **mudança de tecnologia**, adicionar seção obrigatória:

```markdown
## 🔄 Migration Impact Analysis (When Stack Changes)

**TRIGGER**: This section is MANDATORY if:

- Replacing existing library (Prisma → Drizzle)
- Removing major feature (Auth removal)
- Changing architecture (Monolith → Microservices)

### Change Impact Matrix

| Change           | Files Affected | Lines Changed | Effort  | Risk   | Rollback Time |
| ---------------- | -------------- | ------------- | ------- | ------ | ------------- |
| Prisma → Drizzle | 15 files       | ~500 LOC      | 2 days  | Medium | 4 hours       |
| NextAuth Removal | 22 files       | ~800 LOC      | 3 days  | High   | 1 day         |
| Payload Abandono | 8 files        | ~200 LOC      | 0.5 day | Low    | 2 hours       |

### Breaking Changes Inventory

List EVERY breaking change by category:

#### 1. Schema Changes

- `User` table removed
- `analysis_jobs.user_id` → `analysis_jobs.ip_address`
- Foreign key constraints removed: `analysis_jobs_user_id_fkey`

#### 2. API Changes

- `/api/auth/*` endpoints removed (8 routes)
- `/api/analysis/create` no longer requires authentication
- Rate limiting changed from user-based to IP-based

#### 3. Client-Side Changes

- `useSession()` hook removed (used in 12 components)
- `localStorage` for history instead of database queries
- No protected routes (middleware.ts deleted)

#### 4. Database Changes

- Migration: `DROP TABLE users CASCADE`
- Migration: `ALTER TABLE analysis_jobs DROP COLUMN user_id`
- Migration: `ALTER TABLE analysis_jobs ADD COLUMN ip_address TEXT`

### Affected Specifications

List specs that need updating:

- [ ] **Epic 1 - requirements.md**: 10 requirements reference auth
  - FR1, FR4, FR7, FR9 need rewrite (remove user account refs)

- [ ] **Epic 1 - design.md**: AuthService component must be removed
  - Delete: Section 5.2 "Authentication Service"
  - Update: Section 3.1 "Data Flow" (no auth middleware)

- [ ] **Epic 1 - tasks.md**: Tasks 15-22 obsolete (auth implementation)
  - Mark as CANCELLED
  - Replace with: IP rate limiting tasks

- [ ] **Sistema Recomendações - requirements.md**: User profile removed
  - FR3: "User preferences" → "IP-based preferences (localStorage)"
  - FR6: Remove "personalized recommendations based on user history"

### Migration Checklist

- [ ] Update all spec files (requirements, design, tasks)
- [ ] Create migration guide: `docs/migrations/prisma-to-drizzle.md`
- [ ] Update architecture docs in `.claude/project/`
- [ ] Archive legacy specs: `.claude/specs/{feature}/archive/`
- [ ] Create ADR documenting decision (see Melhoria #4)
- [ ] Update `kfc-settings.json` stack section
- [ ] Test skeleton app with new stack
- [ ] Update README.md with new stack info

### Rollback Plan

If migration fails:

1. **Immediate Rollback** (<1 hour):
   - `git revert [migration-commit]`
   - Restore from `.claude/specs/{feature}/archive/`

2. **Partial Rollback** (2-4 hours):
   - Keep new stack
   - Restore removed features with workarounds

3. **Full Rollback** (1 day):
   - Restore original stack
   - Re-apply all specs from archive

### Risk Mitigation

- ✅ Archive all specs BEFORE migration
- ✅ Test migration on branch first
- ✅ Keep original dependencies in package.json (commented)
- ✅ Document every breaking change
- ✅ Create ADR with rationale

**CHECKPOINT**: Get user approval before proceeding with breaking changes.
```

---

## 🔍 Melhoria #4: Integration with kfc-settings.json

### Problema Identificado

Designs não refletem stack atual em `kfc-settings.json`. Referências a tecnologias removidas.

### Solução Proposta

````markdown
## ⚙️ Stack Configuration Reference

**MANDATORY**: Read `.claude/kfc-settings.json` BEFORE designing.

### Step 1: Read Current Stack

```json
// From .claude/kfc-settings.json
"stack": {
  "orm": "drizzle",
  "database": "postgresql",
  "auth": "none",  // ← CRITICAL: No auth in MVP
  "frontend": "nextjs-14",
  "stateManagement": "react-context",
  "cache": "redis",
  "ai": "openai-gpt4-turbo"
}
```
````

### Step 2: Design Accordingly

**IF `auth: "none"`**:

- ❌ DO NOT design AuthService, UserService
- ❌ DO NOT include session management
- ✅ Design IP-based rate limiting instead
- ✅ Use localStorage for user data

**IF `orm: "drizzle"`**:

- ✅ Use Drizzle schema syntax
- ✅ Reference Drizzle query patterns
- ❌ DO NOT include Prisma schema

**IF `database: "postgresql"`**:

- ✅ Use PostgreSQL-specific features (JSONB, arrays)
- ✅ Design indexes for Postgres
- ❌ DO NOT use MySQL-specific syntax

### Step 3: Check Migrations Completed

```json
"migrations": {
  "completed": [
    "prisma-to-drizzle",
    "nextauth-removal",
    "payload-cms-abandoned"
  ]
}
```

**Action**: If migration includes "nextauth-removal":
→ **LEARN**: Auth was removed for a reason (compatibility issues)
→ **DO NOT**: Suggest adding auth back without strong justification
→ **REFERENCE**: Read ADR 001 for context

### Step 4: Validate Design Against Stack

Before finalizing design.md:

```markdown
## ✅ Stack Validation Checklist

- [ ] All libraries match `kfc-settings.json` stack?
- [ ] No references to removed technologies (check migrations.completed)?
- [ ] Design aligns with project.framework version?
- [ ] Compatibility matrix verified for all new dependencies?

**IF ANY CHECKBOX FAILS**: Update design to align with stack.
```

---

## 🔍 Melhoria #5: Reference to .claude/project/ Documentation

### Problema Identificado

Designs não consultam arquitetura existente em `.claude/project/`. Reinventam padrões já estabelecidos.

### Solução Proposta

````markdown
## 📖 Architecture Standards Reference

**MANDATORY**: Read `.claude/project/` documentation before designing.

### Files to Read

1. **`.claude/project/architecture-patterns.md`**
   - Established patterns (Service Layer, Repository, etc)
   - Folder structure conventions
   - Naming conventions

2. **`.claude/project/coding-standards.md`**
   - Code style preferences
   - TypeScript patterns
   - Error handling standards

3. **`.claude/project/LESSONS_LEARNED.md`**
   - Past mistakes to avoid
   - Why certain decisions were made
   - Red flags from previous implementations

### Integration in Design Process

**Step 1**: Before designing components, ask:

> "Does `.claude/project/architecture-patterns.md` define a pattern for this?"

**Step 2**: If pattern exists, FOLLOW IT:

```markdown
## Component Design: PromptAnalysisService

**Pattern Used**: Service Layer Pattern
**Reference**: `.claude/project/architecture-patterns.md` Section 3.2

Following project pattern:

- ✅ Single responsibility (analysis only)
- ✅ Dependency injection via constructor
- ✅ Error handling with custom exceptions
- ✅ Async/await for I/O operations

Based on established pattern, this service will:

- Input: `AnalyzePromptInput` DTO
- Output: `AnalysisResult` DTO
- Dependencies: Injected via constructor
```
````

**Step 3**: If NO pattern exists, PROPOSE NEW PATTERN:

```markdown
## New Pattern Proposal: [Pattern Name]

**Why Needed**: [Justification]
**Where to Document**: `.claude/project/architecture-patterns.md`

### Pattern Definition

[Details]

### Example Usage

[Code example]

**Action**: After approval, update `.claude/project/architecture-patterns.md`
```

---

## 🔍 Melhoria #6: Design Validation Checklist

### Solução Proposta

Antes de finalizar design.md:

```markdown
## ✅ Pre-Finalization Checklist

### Compatibility Validation

- [ ] Compatibility matrix completed for ALL libraries?
- [ ] GitHub issues checked for known incompatibilities?
- [ ] Skeleton app tested with critical dependencies?
- [ ] Evidence links provided for all compatibilities?

### Alternative Solutions

- [ ] "Why X over Y?" documented for major choices?
- [ ] Trade-offs explicitly stated?
- [ ] Evidence provided (benchmarks, docs)?
- [ ] Reconsideration criteria defined?

### Stack Alignment

- [ ] Read `kfc-settings.json` stack section?
- [ ] Design uses correct ORM, auth, database?
- [ ] No references to removed technologies?
- [ ] Checked `migrations.completed` for context?

### Architecture Standards

- [ ] Read `.claude/project/architecture-patterns.md`?
- [ ] Followed existing patterns where applicable?
- [ ] Proposed new patterns documented?
- [ ] Consulted LESSONS_LEARNED.md for red flags?

### Migration Impact (if applicable)

- [ ] Change Impact Matrix completed?
- [ ] Breaking changes inventory created?
- [ ] Affected specs listed?
- [ ] Rollback plan documented?
- [ ] Risk mitigation strategies defined?

### Mermaid Diagrams

- [ ] Component diagram shows all major components?
- [ ] Data flow diagram includes error paths?
- [ ] Sequence diagrams cover critical flows?
- [ ] All diagrams render correctly?

**IF ANY CHECKBOX UNCHECKED**: Fix before presenting to user.
```

---

## 📊 Impact Metrics

### Expected Improvements

| Metric                              | Before                      | After                          | Delta          |
| ----------------------------------- | --------------------------- | ------------------------------ | -------------- |
| Compatibility issues discovered     | Post-implementation         | Pre-design                     | 100% earlier   |
| Days lost to incompatible libraries | 4 days (NextAuth + Payload) | 0 days                         | -100%          |
| Stack migration rework              | 15 files, 500 LOC           | Planned upfront                | -100% surprise |
| Designs aligned with stack          | 60% (guesswork)             | 100% (reads kfc-settings.json) | +67%           |

---

## 🔄 Implementation Plan

### Phase 1: Update Agent Prompt

1. Add "Stack Compatibility Matrix" section
2. Add "Alternative Solutions Documentation" template
3. Add "Migration Impact Analysis" section (conditional)
4. Add integration with `kfc-settings.json`
5. Add reference to `.claude/project/` docs
6. Add pre-finalization checklist

### Phase 2: Test with Existing Specs

1. Re-run spec-design on Epic 1
2. Verify it reads kfc-settings.json
3. Check it creates compatibility matrix
4. Ensure it references architecture-patterns.md

### Phase 3: Retroactive ADRs

1. Create ADRs for decisions already made (Drizzle, no auth)
2. Link ADRs in compatibility matrix as evidence

---

## 🎯 Success Criteria

Agent successfully improved when:

1. ✅ Creates compatibility matrix for all designs
2. ✅ Documents "Why X over Y?" for major choices
3. ✅ Reads kfc-settings.json before designing
4. ✅ References `.claude/project/` architecture docs
5. ✅ Creates migration impact analysis when stack changes
6. ✅ Zero compatibility issues discovered post-implementation

---

## 📎 Related Documents

- [LESSONS_LEARNED.md](../LESSONS_LEARNED.md) - Root cause analysis
- [spec-requirements-improvements.md](./spec-requirements-improvements.md) - MVP validation
- [spec-docs-improvements.md](./spec-docs-improvements.md) - ADR auto-generation
- [ADR 003: Migrate to Drizzle](../../docs/decisions/003-migrate-to-drizzle.md) - ORM decision

---

**Next**: Apply these improvements to `.claude/agents/kfc/spec-design.md`
