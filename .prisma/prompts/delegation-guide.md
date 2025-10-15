# Workflow Orchestration Delegation Guide

**Purpose**: Extended reference for complexity-based task delegation

**Audience**: Workflow Orchestrator (main agent), developers debugging orchestration decisions

**Last Updated**: 2025-10-02

---

## 📖 Table of Contents

1. [Quick Reference](#quick-reference)
2. [Complexity Scoring Rubric (Detailed)](#complexity-scoring-rubric-detailed)
3. [Decision Tree Walkthrough](#decision-tree-walkthrough)
4. [50+ Categorized Examples](#50-categorized-examples)
5. [Edge Cases & How to Handle](#edge-cases--how-to-handle)
6. [Escalation Policy](#escalation-policy)
7. [Performance Metrics](#performance-metrics)

---

## Quick Reference

**TL;DR**: Calculate complexity score (0-50), apply decision tree:

- **0-15 points**: Execute directly in Orchestrator (fast)
- **16-30 points**: Evaluate context → ask user if unclear
- **31-50 points**: MUST delegate to sub-agent (quality)

**Decision Rule**: When in doubt, prefer delegation for quality over speed.

---

## Complexity Scoring Rubric (Detailed)

### Factor 1: File Operations (0-10 points)

**Calculation**:

- Count total files touched (read, write, rename, delete)
- Include cross-referenced files needing updates

**Scoring Table**:

| Files Touched  | Points | Examples                                                           |
| -------------- | ------ | ------------------------------------------------------------------ |
| 0 (query only) | 0      | "What is MVP?"                                                     |
| 1              | 2      | Read prisma.yaml                                                   |
| 2-3            | 5      | Update 2 agent prompts                                             |
| 4-5            | 8      | Reorganize spec directory (5 files)                                |
| 6-10           | 10     | Create full spec (requirements, design, tasks + 3 supporting docs) |
| 11+            | 10     | Audit entire codebase                                              |

**Edge Cases**:

- **Multi-file grep**: Count as 1 file operation (read-only)
- **Directory listing**: Count as 0 files (metadata only)
- **Renaming with cross-refs**: Count renamed file + all files referencing it

### Factor 2: Cross-References to Update (0-10 points)

**Calculation**:

- Count links/references in other files pointing to modified files
- Include internal links (markdown `[text](./path.md)`)
- Include code imports/references

**Scoring Table**:

| Cross-Refs | Points | Examples                              |
| ---------- | ------ | ------------------------------------- |
| 0          | 0      | New file, no existing refs            |
| 1-2        | 3      | Rename file referenced in 2 docs      |
| 3-5        | 7      | Update design.md referenced in 4 docs |
| 6-10       | 10     | Rename agent referenced in 8 files    |
| 11+        | 10     | Reorganize spec (15+ broken links)    |

**Detection Strategy**:

```bash
# Example: Count cross-refs to requisitos.md
grep -r "requisitos.md" .prisma/especificacoes/{feature}/ | wc -l
```

### Factor 3: Validation Required (0-15 points)

**Calculation**:

- Assess depth of validation needed after changes
- Consider domain expertise required

**Scoring Table**:

| Validation Type           | Points | Examples                                        |
| ------------------------- | ------ | ----------------------------------------------- |
| None (read-only)          | 0      | Read file, grep pattern                         |
| Simple check (grep/regex) | 3      | Verify file exists, count lines                 |
| Logical validation        | 8      | Check EARS format, validate JSON syntax         |
| Domain expertise          | 15     | Validate architecture patterns, security review |

**Domain Expertise Indicators**:

- Architecture decisions (patterns, trade-offs)
- Security-critical changes (auth, permissions)
- Business logic (requirements validation)
- Performance optimization (profiling, benchmarking)

### Factor 4: Agent Coordination Needed (0-15 points)

**Calculation**:

- Count sub-agents needed for task completion
- Consider sequential vs parallel coordination

**Scoring Table**:

| Coordination Level      | Points | Examples                       |
| ----------------------- | ------ | ------------------------------ |
| No agents               | 0      | Orchestrator solo execution    |
| Read agent outputs      | 5      | Summarize 2 design.md versions |
| Sequential (2-3 agents) | 10     | elicitador → analista          |
| Parallel (4+ agents)    | 15     | Context audit (5 agents)       |

**Examples**:

- **Sequential**: Elicitation → Requirements → Design (each depends on previous)
- **Parallel**: 3 spec-requirements agents generating alternative approaches (independent)

---

## Decision Tree Walkthrough

### Scenario 1: Simple Task (Score 5)

**Request**: "Read prisma.yaml"

**Scoring**:

- Files: 1 (+2 points)
- Cross-refs: 0 (+0 points)
- Validation: Simple (+3 points)
- Coordination: None (+0 points)
- **Total: 5 points**

**Decision Path**:

1. Calculate score → 5
2. Check range → 0-15 (Simple)
3. **Route**: Execute Directly in Orchestrator
4. **Action**: Read file, return content

**Expected Time**: <5 seconds

---

### Scenario 2: Gray Area Task (Score 18)

**Request**: "Update 3 agent prompts with activation context sections"

**Scoring**:

- Files: 3 (+5 points)
- Cross-refs: 3-5 (+7 points)
- Validation: Logical (+8 points)
- Coordination: None (+0 points)
- **Total: 20 points**

**Decision Path**:

1. Calculate score → 20
2. Check range → 16-30 (Moderate)
3. **Evaluate Context**:
   - Time-critical? No
   - Quality-critical? Yes (logical changes)
   - User preference? Ask
4. **Ask User**: "Task complexity is moderate (score: 20). Execute in Orchestrator (faster, ~2min) or delegate to sub-agent (more thorough, ~5min)?"
5. **Route based on user choice**

**If User Chooses Orchestrator**:

- Execute directly with logical validation
- **Expected Time**: ~2 minutes

**If User Chooses Delegate**:

- Invoke appropriate sub-agent (spec-docs for agent updates)
- **Expected Time**: ~5 minutes

---

### Scenario 3: Complex Task (Score 47)

**Request**: "Design authentication system with OAuth2 + JWT"

**Scoring**:

- Files: 1 (design.md) (+2 points)
- Cross-refs: 0 (+0 points)
- Validation: Domain expertise (+15 points)
- Coordination: Read agent outputs (+5 points)
- **Expertise Factor**: Security-critical (+25 points)
- **Total: 47 points**

**Decision Path**:

1. Calculate score → 47
2. Check range → 31-50 (Complex)
3. **Route**: MUST Delegate to Sub-Agent
4. **Select Agent**: spec-design (architecture + design expertise)
5. **Invoke**: spec-design with full context

**Expected Time**: 90-120 seconds (excludes spec-design execution)

---

## 50+ Categorized Examples

### Category A: Requirements Domain (10 examples)

| Scenario                                           | Files | Cross-Refs | Validation | Coord | Score | Executor                       | Notes                       |
| -------------------------------------------------- | ----- | ---------- | ---------- | ----- | ----- | ------------------------------ | --------------------------- |
| Read existing requirements.md                      | 1     | 0          | Simple     | 0     | 5     | Orchestrator                   | Read-only                   |
| Find all EARS requirements                         | 1     | 0          | Simple     | 0     | 5     | Orchestrator                   | Grep-based search           |
| Count total requirements                           | 1     | 0          | Simple     | 0     | 5     | Orchestrator                   | Simple metric               |
| Add 1 new FR to requirements                       | 1     | 0          | Logical    | 0     | 13    | Orchestrator                   | Single addition, logical    |
| Validate all FRs have acceptance criteria          | 1     | 0          | Logical    | 0     | 13    | Orchestrator                   | Validation task             |
| Create requirements from vague idea                | 1     | 0          | Domain     | 5     | 33    | elicitador → analista          | Needs elicitation           |
| Refactor requirements structure                    | 1     | 3-5        | Domain     | 0     | 28    | Contextual                     | Structural change           |
| Merge 2 requirements docs                          | 2     | 6+         | Domain     | 0     | 35    | spec-requirements              | Multiple sources, expertise |
| Generate 3 alternative requirement sets (parallel) | 3     | 0          | Domain     | 15    | 45    | spec-requirements (3 parallel) | Parallel coordination       |
| Validate requirements trace to design              | 2     | 0          | Domain     | 0     | 25    | spec-compliance                | Traceability check          |

### Category B: Design Domain (10 examples)

| Scenario                                  | Files | Cross-Refs | Validation | Coord | Score | Executor                     | Notes                  |
| ----------------------------------------- | ----- | ---------- | ---------- | ----- | ----- | ---------------------------- | ---------------------- |
| Read existing design.md                   | 1     | 0          | Simple     | 0     | 5     | Orchestrator                 | Read-only              |
| Find "Component X" in design              | 1     | 0          | Simple     | 0     | 5     | Orchestrator                 | Grep search            |
| Count components in design                | 1     | 0          | Simple     | 0     | 5     | Orchestrator                 | Simple metric          |
| Add 1 Mermaid diagram                     | 1     | 0          | Logical    | 0     | 13    | Orchestrator                 | Single addition        |
| Validate Mermaid syntax                   | 1     | 0          | Logical    | 0     | 13    | Orchestrator                 | Syntax check           |
| Design new authentication system          | 1     | 0          | Domain     | 0     | 35    | spec-design                  | Security expertise     |
| Review architecture for patterns          | 1     | 0          | Domain     | 0     | 25    | spec-architect               | Architecture review    |
| Create design from requirements           | 1     | 1-2        | Domain     | 5     | 33    | spec-design                  | Requires requirements  |
| Compare 2 design alternatives             | 2     | 0          | Domain     | 0     | 25    | spec-brainstorm → spec-judge | Comparison task        |
| Generate 5 design alternatives (parallel) | 5     | 0          | Domain     | 15    | 50    | spec-design (5 parallel)     | Parallel brainstorming |

### Category C: Tasks Domain (10 examples)

| Scenario                          | Files | Cross-Refs | Validation | Coord | Score | Executor                  | Notes                      |
| --------------------------------- | ----- | ---------- | ---------- | ----- | ----- | ------------------------- | -------------------------- |
| Read existing tasks.md            | 1     | 0          | Simple     | 0     | 5     | Orchestrator              | Read-only                  |
| Count pending tasks               | 1     | 0          | Simple     | 0     | 5     | Orchestrator              | Simple metric              |
| Mark 1 task as complete           | 1     | 0          | Simple     | 0     | 5     | Orchestrator              | Single update              |
| Find all P0 tasks                 | 1     | 0          | Simple     | 0     | 5     | Orchestrator              | Grep search                |
| Add 1 new subtask                 | 1     | 0          | Logical    | 0     | 13    | Orchestrator              | Single addition            |
| Create tasks from design          | 1     | 1-2        | Domain     | 5     | 28    | spec-tasks                | Requires design            |
| Validate task dependencies        | 1     | 0          | Logical    | 0     | 13    | Orchestrator              | Dependency check           |
| Execute 1 task (default mode)     | 1-5   | 0          | Domain     | 0     | 15-25 | Orchestrator or spec-impl | Depends on task complexity |
| Execute 5 tasks in parallel       | 10+   | 6+         | Domain     | 15    | 50    | spec-impl (5 parallel)    | Parallel execution         |
| Generate task breakdown from epic | 1     | 0          | Domain     | 5     | 28    | spec-tasks                | Task planning              |

### Category D: Validation & Compliance (10 examples)

| Scenario                        | Files | Cross-Refs | Validation | Coord | Score | Executor        | Notes                 |
| ------------------------------- | ----- | ---------- | ---------- | ----- | ----- | --------------- | --------------------- |
| Check file exists               | 1     | 0          | Simple     | 0     | 5     | Orchestrator    | Simple check          |
| Validate JSON syntax            | 1     | 0          | Logical    | 0     | 13    | Orchestrator    | Syntax validation     |
| Count lines in file             | 1     | 0          | Simple     | 0     | 5     | Orchestrator    | Simple metric         |
| Grep for duplicates             | 1     | 0          | Simple     | 0     | 5     | Orchestrator    | Grep-based            |
| Validate EARS format            | 1     | 0          | Logical    | 0     | 13    | Orchestrator    | Format check          |
| Validate all cross-references   | 3     | 6+         | Logical    | 0     | 25    | Contextual      | Multiple files        |
| Validate spec compliance        | 3     | 6+         | Domain     | 0     | 38    | spec-compliance | Full compliance check |
| Validate code against standards | 10+   | 0          | Domain     | 0     | 35    | spec-standards  | Code validation       |
| Audit entire codebase           | 10+   | 0          | Domain     | 15    | 50    | code-audit      | Deep audit            |
| Context audit (5 agents)        | 10+   | 0          | Domain     | 15    | 50    | spec-meta       | Parallel agents       |

### Category E: Documentation Domain (10 examples)

| Scenario                   | Files | Cross-Refs | Validation | Coord | Score | Executor       | Notes                  |
| -------------------------- | ----- | ---------- | ---------- | ----- | ----- | -------------- | ---------------------- |
| Read README.md             | 1     | 0          | Simple     | 0     | 5     | Orchestrator   | Read-only              |
| Find broken links          | 3     | 6+         | Logical    | 0     | 25    | Contextual     | Link validation        |
| Add 1 paragraph to doc     | 1     | 0          | Logical    | 0     | 13    | Orchestrator   | Single addition        |
| Fix typo in heading        | 1     | 0          | Simple     | 0     | 5     | Orchestrator   | Trivial edit           |
| Create ADR from decision   | 1     | 3-5        | Domain     | 0     | 31    | spec-decision  | Decision documentation |
| Create user-facing docs    | 1     | 0          | Domain     | 5     | 28    | spec-docs      | Documentation creation |
| Create agent-facing docs   | 1     | 0          | Domain     | 5     | 28    | spec-architect | Agent documentation    |
| Archive legacy docs        | 5     | 6+         | Logical    | 0     | 25    | Contextual     | File reorganization    |
| Generate API documentation | 10+   | 0          | Domain     | 0     | 35    | spec-docs      | API doc generation     |
| Translate docs to PT-BR    | 19    | 0          | Domain     | 10    | 47    | spec-docs      | Translation task       |

### Category F: Configuration & Setup (5 examples)

| Scenario                  | Files | Cross-Refs | Validation | Coord | Score | Executor     | Notes               |
| ------------------------- | ----- | ---------- | ---------- | ----- | ----- | ------------ | ------------------- |
| Read prisma.yaml          | 1     | 0          | Simple     | 0     | 5     | Orchestrator | Read-only           |
| Update 1 config value     | 1     | 0          | Simple     | 0     | 5     | Orchestrator | Single value change |
| Add 3 new config sections | 1     | 0          | Logical    | 0     | 16    | Contextual   | Structural change   |
| Validate JSON syntax      | 1     | 0          | Logical    | 0     | 13    | Orchestrator | Syntax check        |
| Initialize new project    | 10+   | 0          | Domain     | 5     | 40    | spec-setup   | Project setup       |

### Category G: File Operations (5 examples)

| Scenario                                | Files | Cross-Refs | Validation | Coord | Score | Executor     | Notes              |
| --------------------------------------- | ----- | ---------- | ---------- | ----- | ----- | ------------ | ------------------ |
| Rename 1 file (git mv)                  | 1     | 1-2        | Simple     | 0     | 8     | Orchestrator | Simple rename      |
| Rename 5 files (UPPERCASE → kebab-case) | 5     | 6+         | Simple     | 0     | 23    | Contextual   | Multiple renames   |
| Reorganize directory structure          | 5     | 6+         | Logical    | 0     | 25    | Contextual   | Directory reorg    |
| Create missing directories              | 3     | 0          | Simple     | 0     | 8     | Orchestrator | Directory creation |
| Archive old spec versions               | 5     | 6+         | Logical    | 0     | 25    | Contextual   | Archival process   |

---

## Edge Cases & How to Handle

### Edge Case 1: Conversational Query

**Example**: "What is MVP?"

**Scoring**: 0 points (no files, no validation, no coordination)

**Decision**: Execute directly in Orchestrator (conversational response)

**Handling**: Respond with definition, no file operations needed

---

### Edge Case 2: Ambiguous Complexity (Gray Area)

**Example**: "Update 3 agent prompts"

**Scoring**: 18-20 points (depends on cross-refs)

**Decision**: Context-dependent → Ask user

**Handling**:

1. Calculate score precisely (18-20)
2. Prompt user: "Task complexity is moderate (score: 19). Execute in Orchestrator (faster, ~2min) or delegate (more thorough, ~5min)?"
3. Route based on user choice

---

### Edge Case 3: User Override

**Example**: User says "Execute this directly, don't delegate"

**Scoring**: 35 points (complex task)

**Decision**: Respect user override, but warn

**Handling**:

1. Calculate score → 35 (normally delegate)
2. Detect user override command
3. Warn: "⚠️ This task has complexity score 35 (complex). Proceeding with direct execution as requested, but quality may be lower than delegated approach."
4. Execute directly with best effort

---

### Edge Case 4: Cascading Complexity

**Example**: "Create full spec (requirements + design + tasks)"

**Scoring**: 50 points (maximum complexity)

**Decision**: MUST delegate, cascading to multiple sub-agents

**Handling**:

1. Calculate score → 50
2. Recognize cascade pattern (requirements → design → tasks)
3. Orchestrate sequential delegation:
   - spec-requirements (creates requirements.md)
   - Wait for user approval
   - spec-design (creates design.md)
   - Wait for user approval
   - spec-tasks (creates tasks.md)
4. Return complete spec after all phases

---

### Edge Case 5: Uncertainty in Scoring

**Example**: "Analyze this codebase for issues"

**Scoring**: Unclear (10+ files? Domain expertise? Agents needed?)

**Decision**: Default to delegation (safe choice)

**Handling**:

1. Acknowledge uncertainty: "Analyzing complexity..."
2. Default score → 25 (assume moderate complexity)
3. Ask user for clarification: "Should I delegate this to code-audit (thorough) or analyze quickly in Orchestrator (fast)?"
4. Route based on user preference

---

## Escalation Policy

### When to Escalate to User

**Triggers**:

1. **Score 16-30 (Gray Area)**: Always ask user preference
2. **Uncertainty**: Cannot calculate score confidently → ask user
3. **User Override Detected**: Warn about complexity mismatch, proceed if user confirms
4. **Sub-Agent Failure**: Fallback to Orchestrator execution, notify user

**Escalation Template**:

```
⚠️ Task Complexity Assessment

Task: [description]
Calculated Score: [score] ([range])

Recommendation: [Execute Directly | Delegate to {agent}]

Options:
1. Fast: Execute in Orchestrator (~[time estimate])
2. Thorough: Delegate to sub-agent (~[time estimate])

Your preference?
```

### When NOT to Escalate

**Auto-Execute Scenarios**:

- Score 0-15: Execute directly without asking
- Score 31-50: Delegate without asking (clear complexity)
- User has explicit preference in request ("do this quickly" → Orchestrator)

---

## Performance Metrics

### Expected Execution Times

| Score Range          | Executor     | Expected Time  | Notes                              |
| -------------------- | ------------ | -------------- | ---------------------------------- |
| 0-5                  | Orchestrator | <5 seconds     | Trivial reads, simple queries      |
| 6-15                 | Orchestrator | 5-10 seconds   | Simple operations, grep            |
| 16-30 (Orchestrator) | Orchestrator | 10-120 seconds | Logical tasks, moderate complexity |
| 16-30 (Delegated)    | Sub-Agent    | 30-300 seconds | Excludes sub-agent execution time  |
| 31-50                | Sub-Agent    | 30-120 seconds | Orchestration overhead only        |

**Note**: Sub-agent execution time varies by task (requirements: 2-5min, design: 3-8min, tasks: 1-3min)

### Performance Optimization Tips

1. **Prefer Orchestrator for Simple Tasks**: Score 0-15 tasks are <10s in Orchestrator, 30-45s if delegated (3-4× slower)
2. **Prefer Delegation for Domain Expertise**: Score 31-50 tasks risk quality issues if executed in Orchestrator
3. **Gray Area (16-30)**: Balance speed vs quality based on user needs
4. **Parallel Delegation**: For independent tasks, delegate to multiple sub-agents in parallel (5× speedup)

---

## Revision History

| Version | Date       | Changes                                                           |
| ------- | ---------- | ----------------------------------------------------------------- |
| 1.0     | 2025-10-02 | Initial creation with 50+ examples, edge cases, escalation policy |

---

**For quick reference, see**: [spec-workflow-starter.md](./spec-workflow-starter.md#workflow-orchestration-policy)
