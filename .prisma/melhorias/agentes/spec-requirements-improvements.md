# Melhorias para spec-requirements Agent

**Data**: 2025-10-02
**Baseado em**: [LESSONS_LEARNED.md](../LESSONS_LEARNED.md)
**Status**: Proposta de Implementação

---

## 📋 Resumo das Melhorias

Este documento detalha as melhorias a serem aplicadas ao agente `spec-requirements` para evitar over-engineering e garantir foco no MVP.

---

## 🎯 Melhoria #1: MVP Scope Validation (Obrigatória)

### Problema Identificado

**Root Cause**: Agentes KFC não questionam se feature é necessária no MVP. Specs assumem "full product" ao invés de "minimum viable".

**Impacto Real**:

- 2+ semanas gastas em autenticação antes de validar produto
- Velocidade de desenvolvimento -40%
- Rework completo quando removemos auth

### Solução Proposta

Adicionar checkpoint **OBRIGATÓRIO** antes de gerar requirements.

#### 1.1 Seção a Adicionar no Prompt do Agente

Inserir ANTES da geração de requirements:

````markdown
## 🎯 MVP SCOPE VALIDATION (CHECKPOINT OBRIGATÓRIO)

**CRITICAL**: Before generating ANY requirements, you MUST validate if features are needed for MVP.

### Validation Process

For EACH feature in the user's request, ask yourself these 3 questions:

#### Question 1: Is this needed to validate core hypothesis?

- **YES** → Include in MVP
- **NO** → Flag for Phase 2

#### Question 2: Can users experience core value without this?

- **YES** → Defer feature (not critical)
- **NO** → Include in MVP (essential)

#### Question 3: Does removing this reduce friction?

- **YES** → Remove (example: auth creates signup barrier)
- **NO** → Keep if passes Q1 and Q2

### Red Flags - Automatically Defer to Phase 2

If you detect ANY of these in requirements, **STOP and ASK USER** before including:

- ❌ **Authentication** (unless product IS about auth)
  - User accounts, login/signup, sessions, JWT
  - Protected routes, middleware
  - Social login (Google, GitHub, etc)

- ❌ **User Profiles/Preferences**
  - User settings, customization
  - Profile pictures, bio, personal data

- ❌ **Social Features**
  - Sharing, comments, likes
  - Following/followers
  - Activity feeds

- ❌ **Admin Dashboards**
  - User management panels
  - Analytics dashboards
  - Content moderation

- ❌ **Advanced Analytics**
  - Detailed metrics tracking
  - Funnel analysis
  - A/B testing infrastructure

- ❌ **Billing/Payments**
  - Payment gateways (Stripe, PayPal)
  - Subscription management
  - Invoice generation
  - _Alternative_: Manual billing first

- ❌ **Complex Permissions**
  - Role-based access control (RBAC)
  - Organization/team management
  - Fine-grained permissions

### MVP-Only Features (Approved by Default)

These are acceptable in MVP:

- ✅ **Core Value Proposition** (the main product feature)
  - Example: Prompt analysis engine

- ✅ **Basic UI** to demonstrate value
  - Simple forms, result display

- ✅ **Minimal Data Persistence**
  - localStorage is acceptable
  - Database only if essential

- ✅ **IP-Based Rate Limiting**
  - Alternative to auth-based limits

- ✅ **Single Deployment**
  - Monolith over microservices for MVP

### User Checkpoint

When red flags detected, you MUST present this to user:

> **⚠️ MVP SCOPE WARNING**
>
> I detected the following features that may not be necessary for MVP:
>
> - **[Feature Name 1]**: [Reason it's a red flag]
> - **[Feature Name 2]**: [Reason it's a red flag]
>
> **Recommendation**: Defer these to Phase 2 to:
>
> - ✅ Reduce development time by [X weeks]
> - ✅ Lower friction for users
> - ✅ Validate core value faster
>
> **Questions**:
>
> 1. Do you want to include these in MVP or defer to Phase 2?
> 2. What is the core hypothesis you want to validate?
> 3. Can users experience the main value without these features?
>
> Please confirm before I proceed with requirements generation.

### Example Scenarios

#### ❌ Bad: Over-Engineered MVP

```markdown
User request: "I want to build a prompt analysis tool"

Agent generates requirements including:

- FR1: User authentication with NextAuth
- FR2: User profile management
- FR3: Social sharing features
- FR4: Prompt analysis (core feature)
- FR5: Team collaboration
- FR6: Subscription billing

WRONG: Included 5 non-essential features before validating FR4.
```
````

#### ✅ Good: MVP-Focused

```markdown
User request: "I want to build a prompt analysis tool"

Agent asks:

> "I see you want prompt analysis. Should we include:
>
> - Authentication? (Adds 2-3 weeks, creates signup friction)
> - Social features? (Not needed to validate analysis quality)
>
> My recommendation: Start with:
>
> - Prompt analysis engine (core value)
> - Simple web UI
> - localStorage for history (no auth needed)
> - IP-based rate limiting
>
> Add auth later once we validate users want this. Agree?"

User: "Yes, makes sense"

Agent generates MVP requirements:

- FR1: Prompt analysis with results in <60s
- FR2: Web UI to submit prompts
- FR3: Display analysis results
- FR4: localStorage-based history (5 most recent)
- FR5: IP-based rate limiting (5/day)

CORRECT: Focused on core value, deferred infrastructure.
```

````

#### 1.2 Reference to Architecture Standards

Agents should READ from `.claude/project/architecture-patterns.md` to understand project-specific patterns:

```markdown
## 📖 Architecture Standards Reference

Before generating requirements, READ and follow:

- **File**: `.claude/project/architecture-patterns.md`
- **Purpose**: Understand project-specific patterns, tech stack, constraints
- **Action**: Reference patterns when writing requirements

Example:
> "Based on `.claude/project/architecture-patterns.md`, this project uses:
> - Next.js 14 App Router
> - Drizzle ORM
> - No authentication (MVP phase)
>
> I will ensure requirements align with this stack."
````

---

## 🎯 Melhoria #2: MVP Scope Justification Table

### Problema Identificado

Requirements não justificam **por que** cada feature está no MVP.

### Solução Proposta

Adicionar seção obrigatória após geração de requirements:

```markdown
## 🎯 MVP Scope Justification

### Features Included (Must-Have)

| Feature ID | Feature Name         | Why in MVP?                | Validates What?                    |
| ---------- | -------------------- | -------------------------- | ---------------------------------- |
| FR1        | Prompt Analysis      | Core value proposition     | Users want AI prompt analysis      |
| FR2        | Results Display      | Show analysis output       | Users understand results           |
| FR3        | IP Rate Limiting     | Prevent abuse without auth | 5/day is acceptable limit          |
| FR4        | localStorage History | Basic persistence          | Users want to review past analyses |

### Features Deferred (Phase 2)

| Feature         | Why Deferred?                           | When to Add?                              | Estimated Effort |
| --------------- | --------------------------------------- | ----------------------------------------- | ---------------- |
| Authentication  | Not needed to validate analysis quality | After 1000+ users proven demand           | 2-3 weeks        |
| User Profiles   | Premature personalization               | After retention metrics show repeat usage | 1 week           |
| Social Sharing  | Not core to analysis experience         | After NPS >50                             | 1 week           |
| Admin Dashboard | No admin needs until scale              | After 10k+ analyses                       | 2 weeks          |

### Total Time Saved by Deferring

- **Immediate MVP**: 3-4 weeks
- **If included all features**: 9-11 weeks
- **Time saved**: 6-7 weeks (60% faster to market)

### Validation Criteria

We will add deferred features when:

- ✅ 1000+ unique users
- ✅ 10k+ analyses completed
- ✅ NPS score >40
- ✅ 25%+ weekly retention
```

---

## 🎯 Melhoria #3: Compatibility Reference

### Problema Identificado

Requirements não consideram compatibilidade de stack (ex: NextAuth incompatível com Next.js 14).

### Solução Proposta

Adicionar referência ao `kfc-settings.json` stack section:

```markdown
## 📦 Stack Compatibility Check

Before finalizing requirements, verify compatibility with current stack:

**Read from**: `.claude/kfc-settings.json` → `stack` section

Example output:

> "Current stack from kfc-settings.json:
>
> - ORM: drizzle
> - Database: postgresql
> - Auth: none (MVP phase)
> - Frontend: nextjs-14
> - Cache: redis
>
> ✅ All requirements compatible with this stack.
> ⚠️ FR5 requires authentication - conflicts with 'auth: none'. Recommend deferring."

**Action**: If requirements conflict with stack, FLAG and suggest alternatives.
```

---

## 🎯 Melhoria #4: EARS Format Enhancement

### Current State

Agente já usa EARS format (WHEN, IF, THEN, SHALL).

### Enhancement

Ensure EARS requirements avoid over-specification:

```markdown
## 📝 EARS Format Best Practices for MVP

### ❌ Bad: Over-Specified

**FR1**: WHEN a user creates an account with email and password, and verifies their email, and completes their profile, THEN the system SHALL allow them to submit a prompt for analysis.

_Problem_: Includes auth (email verification, profile) before core feature.

### ✅ Good: MVP-Focused

**FR1**: WHEN a user submits a prompt via the web interface, THEN the system SHALL analyze it and return results within 60 seconds.

_Why better_: No auth requirement, focuses on core value.

### Template for MVP Requirements

Use this structure:

**FR[N]**: [EVENT TRIGGER], THEN the system SHALL [CORE ACTION] [QUALITY ATTRIBUTE].

Examples:

- **FR1**: WHEN a user pastes a prompt, THEN the system SHALL analyze it using GPT-4 and return a quality score (0-100) within 60 seconds.
- **FR2**: WHEN analysis completes, THEN the system SHALL display results with actionable improvements.
- **FR3**: IF a user exceeds 5 analyses in 24 hours, THEN the system SHALL rate-limit based on IP address.
```

---

## 🎯 Melhoria #5: Integration with kfc-settings.json

### Problema Identificado

Agentes não leem `kfc-settings.json` para entender stack atual, migrations, etc.

### Solução Proposta

````markdown
## ⚙️ Integration with kfc-settings.json

**MANDATORY STEP**: Before generating requirements, READ `.claude/kfc-settings.json`

### Extract Information

1. **Stack Section** → Understand current technologies
   ```json
   "stack": {
     "orm": "drizzle",
     "auth": "none",
     ...
   }
   ```
````

2. **Migrations Completed** → Know what was removed/changed

   ```json
   "migrations": {
     "completed": ["prisma-to-drizzle", "nextauth-removal"]
   }
   ```

3. **Project Type** → Understand framework
   ```json
   "project": {
     "type": "next-app",
     "framework": "Next.js 14"
   }
   ```

### Action Based on Settings

IF `auth: "none"`:
→ DO NOT include authentication requirements
→ Use IP-based rate limiting instead
→ Use localStorage for persistence

IF `orm: "drizzle"`:
→ Write requirements assuming Drizzle ORM
→ DO NOT reference Prisma

IF migration includes `"nextauth-removal"`:
→ Learn from past mistake: auth was removed for a reason
→ Do not suggest re-adding unless explicitly requested

````

---

## 🎯 Melhoria #6: Checklist Before Finalization

### Solução Proposta

Antes de finalizar requirements.md, agente deve validar:

```markdown
## ✅ Pre-Finalization Checklist

Before presenting requirements.md to user, verify:

### MVP Validation
- [ ] All features are **necessary** to validate core hypothesis?
- [ ] No "nice-to-have" features included?
- [ ] Authentication deferred to Phase 2 (unless product IS about auth)?
- [ ] Complexity is **minimum viable**?

### Stack Compatibility
- [ ] Requirements align with current stack in `kfc-settings.json`?
- [ ] No references to removed technologies (check `migrations.completed`)?
- [ ] All library choices compatible with framework version?

### EARS Quality
- [ ] All requirements use proper EARS format?
- [ ] Requirements are testable and measurable?
- [ ] No over-specification (auth, profiles, etc in simple requirements)?

### Documentation
- [ ] MVP Scope Justification table completed?
- [ ] Deferred features documented with rationale?
- [ ] Time saved estimation calculated?

### Architecture Reference
- [ ] Read `.claude/project/architecture-patterns.md`?
- [ ] Requirements follow established patterns?
- [ ] No conflicts with architectural decisions?

**IF ANY CHECKBOX IS UNCHECKED**: Fix before presenting to user.
````

---

## 📊 Impact Metrics

### Expected Improvements

| Metric                          | Before                  | After            | Delta |
| ------------------------------- | ----------------------- | ---------------- | ----- |
| Features in MVP                 | 15-20 (over-engineered) | 5-8 (focused)    | -60%  |
| Time to MVP                     | 9-11 weeks              | 3-4 weeks        | -65%  |
| Rework due to stack conflicts   | 40% of features         | <5%              | -87%  |
| User friction (signup barriers) | High (auth required)    | Zero (no signup) | -100% |

---

## 🔄 Implementation Plan

### Phase 1: Update Agent Prompt

1. Add "MVP Scope Validation" section to `.claude/agents/kfc/spec-requirements.md`
2. Add reference to read `kfc-settings.json`
3. Add reference to read `.claude/project/architecture-patterns.md`
4. Add "Pre-Finalization Checklist"

### Phase 2: Test with Existing Specs

1. Re-run spec-requirements on Epic 1 (should now detect auth as red flag)
2. Verify it suggests deferring auth to Phase 2
3. Check it references kfc-settings.json correctly

### Phase 3: Documentation

1. Update KFC workflow documentation
2. Add examples of good vs bad MVP scoping

---

## 🎯 Success Criteria

Agent successfully improved when:

1. ✅ Detects and questions authentication in non-auth products
2. ✅ Reads kfc-settings.json before generating requirements
3. ✅ Includes "MVP Scope Justification" table
4. ✅ Passes pre-finalization checklist
5. ✅ Generates 60% fewer requirements by focusing on MVP
6. ✅ References `.claude/project/` docs when relevant

---

## 📎 Related Documents

- [LESSONS_LEARNED.md](../LESSONS_LEARNED.md) - Root cause analysis
- [spec-design-improvements.md](./spec-design-improvements.md) - Compatibility matrix
- [spec-docs-improvements.md](./spec-docs-improvements.md) - ADR auto-generation
- [ADR 001: Remove NextAuth](../../docs/decisions/001-remove-nextauth.md) - Why auth was removed

---

**Next**: Apply these improvements to `.claude/agents/kfc/spec-requirements.md`
