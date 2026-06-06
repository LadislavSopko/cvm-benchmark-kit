---
name: j-review-plan
description: Review plan for TDDAB/Step conformity. Checks methodology compliance, dependency ordering, and validates with CVM parsePlan.
---

## Prerequisites
- Read `j-settings.md` if it exists (provides methodology config)
- Read (if not already done) MB — skip if memory-bank/ does not exist yet

## Steps

### 1. Read Methodology Reference
**Check `j-settings.md @backend-method` (if j-settings.md exists):**
- If `tddab` → load the `/tddab-planner` skill (its rules are the source of truth). If `@tddab-lang-overlay` is defined and not empty, also apply it.
- If `tdd` → Standard TDD rules apply
- If `manual` or j-settings.md missing → Default to tddab, load the `/tddab-planner` skill

**Read the mindset file completely.** The rules in that file are the ONLY source of truth for the review. Do NOT apply rules from memory or training — only what the mindset file says.

### 2. Find the Plan
- If a plan path was provided → use that
- Otherwise look in current directory for `plan.md` or `index.md`
- If not found → STOP with error: "Plan file not found. Provide the path."

### 3. Detect Plan Type
- If plan has `<red>` with `- test:` lines → TDDAB plan, use tddab-planner.md rules
- If plan has `<actions>` with `- action:` lines → Step plan, load the `/step-planner` skill for rules
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
- No security issues (SQL injection, XSS, etc.)

#### F. Requirement Coverage (BLOCKING — only if `requirements.md` exists)
This is the gate against all-or-nothing near-misses, where the plan satisfies most of the task but
silently drops one requirement. If `requirements.md` exists:
- **Exhaustive list:** re-read `instruction.md` clause by clause and confirm `requirements.md`
  captured EVERY clause — especially secondary ones buried in compound sentences (negative
  "must not", disabled/read-only states, restore-on-switch-back, "exactly once", "no duplicates",
  exact response shapes). A missed clause is a BLOCKING gap — add the requirement, then fail.
- **Every requirement is tested:** every `R1..Rn` must map to at least one `<red>` test in the plan
  (via the test annotations / the plan's coverage lines). Any `R` with zero covering tests is a
  BLOCKING gap — add the block/test, then fail.
- **Surface coverage:** for any requirement that ranges over a category (every control / callable /
  endpoint / field / UI surface), confirm the plan tests EACH enumerated member, not a representative
  subset — especially members with different mechanics (native control vs custom dropdown/picker vs
  file input). A category requirement covering only some members is a BLOCKING gap.
- **Implied-contract / grader-persona pass (BLOCKING):** explicit clauses are not the whole grade. Re-read
  the plan as the HIDDEN GRADER, not as the author. For every new public member the task adds, check the plan
  carried over its nearest sibling's cross-cutting concerns (result parsing/deserialization, input
  serialization, validation, defaults from client/config, error & exception mapping, cleanup) — a declared
  option with no test that it actually takes effect is a gap. For every "only X supports / X works over A and
  B" statement, check there is a test that the UNSUPPORTED case RAISES. Concretely: write the meanest test the
  grader would write that the current plan would NOT pass — if such a test exists, it names a missing
  requirement: add the `R` and its `<red>` test, then fail. (See `j-analyze-requirements` step 3c.)
- **Assertion strength (BLOCKING):** reject any `<red>` test whose assertion is soft — `hasattr`, a bare
  truthy/non-empty check, `is not None` as the ONLY check, or "no exception raised". Each must assert a
  CONCRETE consequence (exact type, value, structure, or raised exception type). A soft test goes green for the
  agent and red for the grader.
- **Integration-surface parity (BLOCKING):** if the feature plugs into an existing flow (handler, event/result
  stream, registry, message channel, a return value a caller reads), confirm the plan surfaces its output
  through the SAME mechanism/shape/entry point the nearest existing equivalent uses, and tests it by reading
  that standard surface. A result delivered through an ad-hoc path the standard consumer does not read is a
  BLOCKING gap (symptom: the grader inspects the expected field and finds `null`/`undefined`). (See
  `j-analyze-requirements` §3c source 3.)
- **Robustness coverage (BLOCKING):** for any recursive/delegating/chaining feature, the plan must test cycle
  and depth termination (a cycle surfaces a bounded error, never a hang/stack-overflow); for any concurrent
  feature, that N concurrent calls converge with no deadlock; for any repeated/sequenced feature, that
  invariants hold across N iterations. Missing any applicable robustness test is a BLOCKING gap.
- **Final integration block + ported tests (BLOCKING):** the plan MUST end with an integration block
  (`NN-integration`) whose tests drive each behavioral requirement through the REAL public surface, NO mocks
  (tddab-planner rule 5b). Every behavioral `R` must be covered there in addition to its unit test, and those
  tests must be PORTED from the repo's existing tests for the sibling/area (scenarios harvested in
  `j-analyze-requirements` step 1b — custom scalars, error paths, option matrix), NOT self-invented softer
  ones. A missing integration block, a behavioral `R` not exercised end-to-end, or invented scenarios where
  the repo already has realistic ones, is a BLOCKING gap.
- **Full-suite run at completion (BLOCKING):** the plan's final block `<success>` must require running the
  ENTIRE existing repo test suite (the project's whole test command), not just the new blocks' tests, at 0
  failures — this is half the grade (the grader re-runs the repo's baseline suite) and catches regressions
  the agent's own tests never would. If the final block does not run the full suite, it is a BLOCKING gap.
- **Added-path coverage (BLOCKING):** every code path the plan introduces must have a covering `<red>` test
  that exercises it with a concrete assertion — each new branch, each option/flag the code accepts (both the
  on and off value), each error / early-return / empty / null path, each loop body. A plan that adds a
  parameter, branch, or error path with NO test that enters it is a BLOCKING gap (the canonical case: a flag
  accepted in the signature but no test proves it changes behavior) — add the test, then fail. No added
  production path may exist without a test that would fail if that path were removed.
- Do not pass the plan while any requirement is uncovered, any instruction clause is unmapped, any category
  requirement covers only a subset of its members, an implied-contract requirement is missing, or any test
  asserts something soft.

### 5. CVM Structural Validation (if available)

If `mcp__cvm__parsePlan` tool is available, call it on the plan file as a final objective check. The parser validates tag structure, block IDs, and format — things Claude's review might miss.

- If parsePlan returns errors → add them to the report as Structural Issues
- If parsePlan succeeds → note "CVM parsePlan: valid" in the report
- If CVM is not available → skip this step (review is still valid without it)

### 6. Submit the verdict — ONE word only

The review itself (checking rules, listing issues, fixing `plan.md`) is your WORK, done on screen in your turn. What you SUBMIT is only the verdict — a single bare token:

- No issues found AND (if available) parsePlan valid → submit `passed`
- Any issue, parsePlan error, or doubt → fix `plan.md` first, then submit `failed`

Submit exactly `passed` or `failed` — lowercase, one word, nothing else. No report, no `✅`, no summary. The fixes go into `plan.md`, never into the reply. Submit `failed`, not `failed. dependency issue in block 03`.

### 7. Update Plan (if needed)
If issues were found:
- Edit the plan file with corrections
- Re-run review from step 4

## Rules
- **The mindset file is the ONLY source of truth** — do not invent stricter or looser rules
- Be strict on dependency ordering — this causes real compilation failures
- Be strict on self-sufficiency — blocks execute on clean context
- Be lenient on code style — the mindset file defines what "complete" means
- Explain WHY something is wrong
- Suggest specific fixes, not vague advice
- If plan is good, say so quickly and move on
- **Gate output:** submit ONLY the verdict word — `passed` or `failed`, lowercase, nothing else. No report in the submit. The review notes stay on screen in your turn. Submit `passed`, not `passed. <reasons>`.
