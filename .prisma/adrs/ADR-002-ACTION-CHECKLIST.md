# ADR-002: Action Checklist

**Status:** READY TO EXECUTE
**Estimated Time:** 4 hours
**ROI:** 400-900%

---

## Quick Decision Matrix

```
┌────────────────────────────────────────────────────────────┐
│  IF YOU HAVE 5 MINUTES → Execute Phase 1 (Discard Branch) │
│  IF YOU HAVE 1 HOUR    → Execute Phase 1 + 2 (Script)     │
│  IF YOU HAVE 3 HOURS   → Execute Phase 1-3 (Full Audit)   │
│  IF YOU HAVE 4 HOURS   → Execute ALL PHASES (Complete)    │
└────────────────────────────────────────────────────────────┘
```

---

## PHASE 1: Discard Redundant Branch ⚡

**Time:** 5 minutes
**Risk:** Zero
**Blocker:** None

### Steps

- [ ] 1. Save work as reference (optional)
```bash
cd "c:\Users\Windows Home\Documents\GitHub\docs-jana"
git diff phase-1/remove-dead-code main > .prisma/archive/discarded-phase1-work.patch
```

- [ ] 2. Return to main branch
```bash
git checkout main
```

- [ ] 3. Delete redundant branch
```bash
git branch -D phase-1/remove-dead-code
```

- [ ] 4. Verify clean state
```bash
git status
git log --oneline -10
```

### Success Criteria

- [ ] Working directory is on `main` branch
- [ ] Branch `phase-1/remove-dead-code` no longer exists
- [ ] Git status shows clean working tree
- [ ] (Optional) Patch file saved in .prisma/archive/

### Verification Command

```bash
git branch | grep phase-1  # Should return nothing
```

---

## PHASE 2: Create Pre-Flight Validation Script 🔧

**Time:** 1 hour
**Risk:** Low
**Blocker:** None

### Steps

- [ ] 1. Create script file
```bash
touch scripts/dev/pre-flight-check.js
```

- [ ] 2. Implement script (see template below)

- [ ] 3. Make executable
```bash
chmod +x scripts/dev/pre-flight-check.js  # Unix
# Windows: no action needed
```

- [ ] 4. Test script
```bash
node scripts/dev/pre-flight-check.js --spec cli-unification-ux-improvement --phase 1
```

- [ ] 5. Create documentation
```bash
# Add usage to README or scripts/dev/README.md
```

### Script Template

```javascript
#!/usr/bin/env node
/**
 * PRE-FLIGHT CHECK: Validates codebase state before starting spec phase
 *
 * Usage:
 *   node scripts/dev/pre-flight-check.js --spec <name> --phase <number>
 *
 * Output:
 *   - Expected vs Actual state
 *   - Tasks/phases already implemented
 *   - Delta of remaining work
 *   - GO/NO-GO/PARTIAL decision
 *
 * Exit Codes:
 *   0 = GO (proceed with implementation)
 *   1 = NO-GO (already implemented)
 *   2 = PARTIAL (some work done, adjust scope)
 *   3 = ERROR (invalid spec/phase)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Parse arguments
const args = process.argv.slice(2);
const specName = args[args.indexOf('--spec') + 1];
const phaseNumber = args[args.indexOf('--phase') + 1];

if (!specName || !phaseNumber) {
  console.error('❌ Usage: node pre-flight-check.js --spec <name> --phase <number>');
  process.exit(3);
}

console.log(`\n🔍 PRE-FLIGHT CHECK: ${specName} - Phase ${phaseNumber}\n`);

// Search git log for keywords
const keywords = [
  specName,
  `FASE ${phaseNumber}`,
  `Phase ${phaseNumber}`,
  `phase ${phaseNumber}`,
  // Add spec-specific keywords here
];

console.log('📊 Searching git history...\n');

let foundCommits = [];

keywords.forEach(keyword => {
  try {
    const result = execSync(
      `git log --all --oneline --grep="${keyword}"`,
      { encoding: 'utf8', cwd: process.cwd() }
    );

    if (result.trim()) {
      const commits = result.trim().split('\n');
      commits.forEach(commit => {
        const [hash, ...messageParts] = commit.split(' ');
        const message = messageParts.join(' ');
        if (!foundCommits.find(c => c.hash === hash)) {
          foundCommits.push({ hash, message, keyword });
        }
      });
    }
  } catch (e) {
    // No matches found for this keyword
  }
});

// Analyze results
if (foundCommits.length === 0) {
  console.log('✅ GO - No previous implementation found\n');
  console.log('┌─────────────────────────────────────────────┐');
  console.log('│  Safe to proceed with implementation        │');
  console.log('└─────────────────────────────────────────────┘\n');
  process.exit(0);
} else {
  console.log(`⚠️  FOUND ${foundCommits.length} potentially related commit(s):\n`);

  foundCommits.forEach(({ hash, message, keyword }) => {
    console.log(`  ${hash} - ${message}`);
    console.log(`  └─ Matched keyword: "${keyword}"\n`);
  });

  console.log('❌ NO-GO - Implementation may already exist\n');
  console.log('┌─────────────────────────────────────────────┐');
  console.log('│  RECOMMENDATION:                            │');
  console.log('│  1. Review commits above                    │');
  console.log('│  2. Check if work is actually complete      │');
  console.log('│  3. If complete: Skip this phase            │');
  console.log('│  4. If partial: Adjust scope                │');
  console.log('└─────────────────────────────────────────────┘\n');

  process.exit(1);
}
```

### Success Criteria

- [ ] Script exists at `scripts/dev/pre-flight-check.js`
- [ ] Script is executable
- [ ] Test run completes without errors
- [ ] Output shows GO/NO-GO decision clearly
- [ ] Documentation created

### Verification Command

```bash
node scripts/dev/pre-flight-check.js --spec test --phase 1
# Should execute without syntax errors
```

---

## PHASE 3: Audit All Specifications 📊

**Time:** 2-3 hours
**Risk:** Low
**Blocker:** Requires Phase 2 complete

### Steps

#### 3.1: Analyze cli-unification-ux-improvement

- [ ] Run pre-flight for each phase
```bash
for i in {1..8}; do
  echo "=== Phase $i ==="
  node scripts/dev/pre-flight-check.js --spec cli-unification-ux-improvement --phase $i
  echo ""
done
```

- [ ] Document results
```markdown
Phase 1: NO-GO (ad2842c) ✅
Phase 2: NO-GO (a5f475a) ✅
Phase 3: NO-GO (cbc090b, c30f9d0) ✅
Phase 4: NO-GO (339bcbd) ✅
Phase 5: GO/PARTIAL? ❓
Phase 6: GO/PARTIAL? ❓
Phase 7: NO-GO (a80ab3a) ✅
Phase 8: NO-GO (a80ab3a) ✅
```

#### 3.2: Analyze Other Specs

- [ ] cli-ux-enhancement
```bash
node scripts/dev/pre-flight-check.js --spec cli-ux-enhancement --phase 1
git log --all --grep="ux\|UX\|visual\|modernization" --oneline
```

- [ ] cli-architecture-refactor
```bash
node scripts/dev/pre-flight-check.js --spec cli-architecture-refactor --phase 1
git log --all --grep="architecture\|refactor" --oneline
```

- [ ] n8n-transfer-system-refactor
```bash
git log --all --grep="transfer\|n8n-transfer" --oneline
```

- [ ] interactive-menu-enhancement
```bash
git log --all --grep="interactive\|menu" --oneline
git show ff7db10 --stat
```

- [ ] tag-layer-implementation
```bash
git log --all --grep="tag\|layer" --oneline
git show e640d3d --stat
```

- [ ] update-workflow-names
```bash
git log --all --grep="workflow.*name\|rename" --oneline
ls scripts/admin/ | grep -i "update.*name"
```

#### 3.3: Create Status Dashboard

- [ ] Create dashboard file
```bash
touch .prisma/specs/SPECIFICATION-STATUS-DASHBOARD.md
```

- [ ] Fill with results (see template below)

### Dashboard Template

```markdown
# Specification Status Dashboard

**Last Updated:** 2025-10-15
**Audited By:** Pre-Flight Check Script + Manual Review

---

## ✅ COMPLETED

| Spec | Status | Commit(s) | LOC Impact | Notes |
|------|--------|-----------|------------|-------|
| cli-unification-ux-improvement | 6/8 phases | ad2842c, a5f475a, cbc090b, c30f9d0, 339bcbd, a80ab3a | -3,634 | Phases 1-4, 7-8 done |
| tag-layer-implementation | Complete | e640d3d | TBD | SOURCE/TARGET tag system |
| ... | ... | ... | ... | ... |

---

## 🟡 PARTIALLY COMPLETED

| Spec | Status | Completed | Remaining | Next Phase |
|------|--------|-----------|-----------|------------|
| cli-unification-ux-improvement | 6/8 | Phases 1-4, 7-8 | Phases 5-6? | Validate Phase 5 |
| interactive-menu-enhancement | Partial | ff7db10 | Unknown | Manual review |
| ... | ... | ... | ... | ... |

---

## 🔴 NOT STARTED (Validated)

| Spec | Reason | Priority | Est. Time | ROI |
|------|--------|----------|-----------|-----|
| [spec] | Pre-flight: GO | High | 20h | 8/10 |
| ... | ... | ... | ... | ... |

---

## ⚪ UNKNOWN STATUS (Requires Manual Review)

| Spec | Issue | Action Required |
|------|-------|-----------------|
| cli-ux-enhancement | No clear commits | Manual code review |
| ... | ... | ... |

---

## RECOMMENDED PRIORITY

1. **[Top Spec]** - Reason: High ROI, clear scope, NOT_STARTED validated
2. **[Second Spec]** - Reason: Completes partial work (cli-unification phase 5?)
3. **[Third Spec]** - Reason: User-facing improvements

---

## Notes

- All specs audited using pre-flight-check.js
- Manual review required for UNKNOWN status items
- Priority based on: ROI, completeness, dependencies, user value
- Next review date: 2025-11-15
```

### Success Criteria

- [ ] All specs analyzed
- [ ] Status dashboard created
- [ ] Priority list established
- [ ] Recommended next work identified

---

## PHASE 4: Document Process 📝

**Time:** 30 minutes
**Risk:** Zero
**Blocker:** Requires Phase 1-3 complete

### Steps

- [ ] 1. Update development guidelines
```bash
# Edit or create: .prisma/docs/development-guidelines.md
```

- [ ] 2. Add pre-flight check section (see template below)

- [ ] 3. Create implementation checklist template

- [ ] 4. Update ADR status
```bash
# In ADR-002: Change status from PROPOSED to ACCEPTED
```

- [ ] 5. Communicate to team
```bash
# Share ADR-002-EXECUTIVE-SUMMARY.md via Slack/email
```

### Development Guidelines Section

```markdown
## Pre-Flight Check (MANDATORY)

Before starting ANY phase/task from a specification, you MUST:

### 1. Run Pre-Flight Check

```bash
node scripts/dev/pre-flight-check.js --spec <spec-name> --phase <phase-number>
```

### 2. Review Output

- **GO (exit code 0):** ✅ Safe to proceed, no previous implementation found
- **NO-GO (exit code 1):** ❌ Already implemented, review commits listed
- **PARTIAL (exit code 2):** 🟡 Some work done, adjust scope accordingly
- **ERROR (exit code 3):** ⚠️ Invalid spec/phase, check parameters

### 3. Make Decision

| Result | Action |
|--------|--------|
| GO | Proceed with full implementation |
| NO-GO | Skip phase, mark as complete in tracking |
| PARTIAL | Review commits, adjust scope to remaining tasks |

### 4. Document Decision

Add note to task/phase tracking:

```
Pre-flight check: [GO/NO-GO/PARTIAL]
Commit references: [hash if NO-GO/PARTIAL]
Adjusted scope: [if PARTIAL]
```

### Why This Matters

**Case Study:** Phase 1 of `cli-unification-ux-improvement` was re-implemented
despite being completed in commit `ad2842c`. This wasted development time
(-292 LOC duplicated) and created redundant branch. Pre-flight check prevents this.

**ROI:** 4 hours of process setup prevents 20-40 hours of duplicate work.

### Exceptions

Pre-flight check may be skipped ONLY for:
- Brand new features not based on specifications
- Exploratory/prototype work
- Hot fixes/emergency patches

For all specification-driven work: **PRE-FLIGHT CHECK IS MANDATORY.**
```

### Success Criteria

- [ ] Development guidelines updated
- [ ] Pre-flight check documented as MANDATORY
- [ ] Implementation checklist created
- [ ] ADR-002 status updated to ACCEPTED
- [ ] Team communication sent

---

## PHASE 5: Prioritize Next Implementation 🎯

**Time:** 1 hour
**Risk:** Low
**Blocker:** Requires Phase 3 complete

### Steps

- [ ] 1. Review status dashboard
```bash
cat .prisma/specs/SPECIFICATION-STATUS-DASHBOARD.md
```

- [ ] 2. Identify top candidates
```yaml
Criteria:
  - Status: NOT_STARTED (validated)
  - Business value: User-facing improvements
  - Technical readiness: Complete specification
  - Dependencies: No blockers
  - ROI: High value / reasonable effort
```

- [ ] 3. Run pre-flight on top candidate
```bash
node scripts/dev/pre-flight-check.js --spec <top-candidate> --phase 1
```

- [ ] 4. If GO: Create implementation plan

- [ ] 5. If NO-GO: Try next candidate

- [ ] 6. Document decision

### Implementation Plan Template

```markdown
# Implementation Plan: [Spec Name]

**Pre-Flight Status:** GO ✅
**Estimated Time:** [X hours]
**Priority:** [High/Medium/Low]
**Dependencies:** [None/List]

## Scope

- Phase 1: [Description] ([Y] tasks, [Z]h)
- Phase 2: [Description] ([Y] tasks, [Z]h)
- ...

## Branch Strategy

```bash
git checkout -b feature/[spec-name]-phase-1
```

## Timeline

- Week 1: Phases 1-2
- Week 2: Phases 3-4
- Week 3: Testing & Documentation

## Success Criteria

- [ ] All tasks completed
- [ ] Tests passing
- [ ] Documentation updated
- [ ] Code reviewed
- [ ] Merged to main

## Rollback Plan

If issues discovered:
1. Revert commits
2. Re-run pre-flight check
3. Adjust scope
```

### Success Criteria

- [ ] Next spec identified
- [ ] Pre-flight check: GO validated
- [ ] Implementation plan created
- [ ] Timeline estimated
- [ ] Team assigned/notified

---

## Quick Reference

### Command Cheat Sheet

```bash
# Discard branch
git checkout main && git branch -D phase-1/remove-dead-code

# Run pre-flight
node scripts/dev/pre-flight-check.js --spec <name> --phase <num>

# Check spec status
cat .prisma/specs/SPECIFICATION-STATUS-DASHBOARD.md

# View recent commits
git log --oneline --all --grep="FASE\|Phase" -20

# Analyze specific spec
git log --all --grep="<keyword>" --oneline
```

### Time Estimates

| Phase | Time | Can Skip If |
|-------|------|-------------|
| 1. Discard Branch | 5 min | N/A |
| 2. Pre-Flight Script | 1h | Already exists |
| 3. Audit Specs | 2-3h | Dashboard up-to-date |
| 4. Document Process | 30 min | Guidelines updated |
| 5. Prioritize Next | 1h | Already decided |

### Decision Tree

```
Start
  │
  ├─ Need quick action? → Phase 1 only (5 min)
  │
  ├─ Have 1 hour? → Phase 1 + 2 (script creation)
  │
  ├─ Have 3 hours? → Phase 1-3 (full audit)
  │
  └─ Have 4 hours? → ALL PHASES (complete setup)
```

---

## Completion Checklist

### Phase 1 ✅
- [ ] Branch discarded
- [ ] On main branch
- [ ] Clean working directory

### Phase 2 ✅
- [ ] Pre-flight script created
- [ ] Script tested
- [ ] Documentation written

### Phase 3 ✅
- [ ] All specs analyzed
- [ ] Status dashboard created
- [ ] Priority established

### Phase 4 ✅
- [ ] Guidelines updated
- [ ] Checklist created
- [ ] Team notified

### Phase 5 ✅
- [ ] Next spec identified
- [ ] Pre-flight: GO validated
- [ ] Implementation plan ready

---

## What's Next?

After completing all phases:

1. **Implement Next Spec**
   - Use pre-flight check first
   - Follow implementation plan
   - Commit with clear messages

2. **Monitor Process**
   - Track pre-flight adoption
   - Measure duplicate work incidents (should be zero)
   - Gather team feedback

3. **Iterate**
   - Refine pre-flight script based on usage
   - Update dashboard regularly
   - Improve process documentation

---

## Support

**Questions?**
- Review ADR-002 (full document)
- Check ADR-002-EXECUTIVE-SUMMARY.md
- See ADR-002-VISUAL-TIMELINE.md for diagrams

**Issues?**
- Script not working: Check Node.js version
- False positives: Refine keyword matching
- Process unclear: Request clarification from Tech Lead

---

*Action checklist for ADR-002 | 2025-10-15*
