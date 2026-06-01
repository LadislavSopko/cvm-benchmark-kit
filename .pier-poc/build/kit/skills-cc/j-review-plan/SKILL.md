---
name: j-review-plan
description: Review plan for TDDAB/Step conformity. Checks methodology compliance, dependency ordering, and optionally validates with CVM parsePlan.
---

## Prerequisites
- Read `j-settings.md` from project root (REQUIRED - run `j-setup` if missing)
- If not read this session: Read `.claude/commands/mind-sets/junior.md`
- Read (if not already done) MB skip all subdirs

## Steps

### 1. Read Methodology Reference
**Check `j-settings.md @backend-method`:**
- If `tddab` → Read `@tddab-file` + `@tddab-lang-overlay` from j-settings.md
- If `tdd` → Standard TDD rules apply
- If `manual` → No strict methodology

**Read the mindset file completely.** The rules in that file are the ONLY source of truth for the review. Do NOT apply rules from memory or training — only what the mindset file says.

### 2. Find the Plan
Look for plan in:
- Current task folder: `{@tasks}/NN-*/plan.md`, `index.md`, or `tddab-plan.md`
- Or ask user: "Where is the plan file?"

### 3. Detect Plan Type
- If plan has `<red>` with `- test:` lines → TDDAB plan, use tddab-planner.md rules
- If plan has `<actions>` with `- action:` lines → Step plan, read `.claude/commands/mind-sets/step-planner.md` for rules
- If plan has `<files>` tag → multi-file plan, read index.md + all sub-files

### 4. Review — Apply Rules From Mindset File

**Do NOT use a hardcoded checklist.** Review the plan against the rules you read in step 1. The mindset file defines what is correct and what is not.

Focus on these categories:

#### A. Structural Correctness
- Are all required tags present as defined in the mindset file?
- Are block IDs unique and correctly formatted?
- Is `<mission>` comprehensive enough for clean-context execution?

#### B. Dependency & Ordering (CRITICAL)
- For each block: does it use types, functions, or files defined in a LATER block?
- If yes → **dependency error** — the block cannot execute without the later block
- Verify the execution order matches actual dependencies
- Check "no dependencies on future blocks" rule

#### C. Self-Sufficiency
- Can each block be understood with ZERO context beyond the mission?
- Are file paths complete?
- Are there references to "previous discussion" or "as we decided"?

#### D. Completeness (as defined by mindset file)
- Check what the mindset file says about code completeness — apply THOSE rules, not stricter ones
- Check for TODOs, unresolved decisions, "Option A or B"
- Check for "..." that skips DECISIONS (not boilerplate — boilerplate "..." is fine per mindset)

#### E. Project Conformity
- Follows project architecture patterns
- Uses project conventions from j-settings.md
- No security issues (SQL injection, XSS, etc.)

### 5. CVM Structural Validation (if available)

If `mcp__cvm__parsePlan` tool is available, call it on the plan file as a final objective check. The parser validates tag structure, block IDs, and format — things Claude's review might miss.

- If parsePlan returns errors → add them to the report as Structural Issues
- If parsePlan succeeds → note "CVM parsePlan: valid" in the report
- If CVM is not available → skip this step (review is still valid without it)

### 6. Report

If issues found:
```
PLAN REVIEW — ISSUES FOUND

[Dependency / Ordering Errors]
- [specific issue with block IDs and explanation]

[Structural Issues]
- [specific issue]

[Completeness Issues]
- [specific issue]

SUGGESTED FIXES:
1. [specific fix]
2. [specific fix]

Fix these before proceeding with j-develop or j-cvm-exec-plan.
```

If plan is OK:
```
PLAN REVIEW — APPROVED ✅

✓ Structure: all required tags present
✓ Dependencies: execution order matches dependencies
✓ Self-sufficiency: blocks work on clean context
✓ Completeness: per methodology rules
✓ Project conformity: OK

Ready to proceed with j-develop or j-cvm-exec-plan.
```

### 7. Update Plan (if needed)
If user agrees to fixes:
- Edit the plan file with corrections
- Mark reviewed sections

## Rules
- **The mindset file is the ONLY source of truth** — do not invent stricter or looser rules
- Be strict on dependency ordering — this causes real compilation failures
- Be strict on self-sufficiency — blocks execute on clean context
- Be lenient on code style — the mindset file defines what "complete" means
- Explain WHY something is wrong
- Suggest specific fixes, not vague advice
- If plan is good, say so quickly and move on
