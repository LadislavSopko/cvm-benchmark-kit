---
name: tddab-planner
description: TDDAB plan format and rules — test-first, atomic blocks, RED/GREEN/VERIFY, bottom-up decomposition.
---
# TDDAB Planner Mindset

## What is TDDAB?
**Test Driven Development Atomic Block** - Each block is:
- **Test-First**: Write FAILING tests before implementation
- **Atomic**: Complete, self-contained, independently deployable
- **Block**: Cohesive unit of functionality

### The Three Sacred Phases
```
1. RED Phase    → Write tests that FAIL
2. GREEN Phase  → Write code to make tests PASS
3. VERIFY Phase → Confirm atomic deployment works
```

---

## TDDAB Plan Format

### Required Tags

Plans use lightweight XML tags for machine-parseable structure.
Keep markdown readable — tags mark boundaries, not replace content.

| Tag | Where | Purpose |
|-----|-------|---------|
| `<mission>` | Once, top of plan | Full project context — enough that any block can execute on clean context |
| `<block id="NN-name">` | Wraps each TDDAB | Block boundary with unique id |
| `<intro>` | Inside block | Context: what, why, dependencies, files |
| `<red>` | Inside block | Test definitions (bullet list) |
| `<success>` | Inside block | Checklist of verifiable outcomes that must ALL pass |

### Plan Template

```markdown
# TDDAB Plan: [Feature Name]
**Date:** YYYY-MM-DD

<mission>
[Full project context — architecture, tech stack, patterns, conventions,
file structure, testing approach, build commands. Must contain enough
information that ANY block can be executed on a completely clean context
without prior knowledge. Think of it as the briefing document for a
developer who just walked into the project.
Clean policy (MANDATORY — state it here, scoped to the project's REAL tools):
list the project's ACTUAL checks (whichever of build / typecheck / lint / test
exist, with exact commands) and require them at 0 errors / 0 warnings; warnings
are failures. Do NOT invent absent tooling. No "pre-existing" exemption, no
suppress / skip / disable workarounds — fix the root cause.]
</mission>

<block id="01-short-name">
## TDDAB-1: [Block Title]

<intro>
[What this block does. Dependencies on previous blocks.
Files to create/modify. Key decisions already made.]
</intro>

<red>
- test: [first test that must fail then pass]
- test: [second test]
- test: [third test]
</red>

### Implementation
[Code in the target language showing types, signatures, key logic, test assertions.
Must be detailed enough that j-develop can produce compilable code from it.
Does NOT need perfect imports or boilerplate — j-develop handles that.
No TODOs, no unresolved decisions.]

<success>
- [ ] [first verifiable outcome that must pass]
- [ ] [second verifiable outcome that must pass]
- [ ] [third verifiable outcome that must pass]
</success>
</block>

<block id="02-next-thing">
## TDDAB-2: [Next Block]
...same structure...
</block>
```

### Tag Rules
1. `<mission>` — EXACTLY once, before first block, must be comprehensive enough for clean-context execution
2. `<block id="">` — id format: `NN-kebab-case`, must be unique across ALL files
3. `<intro>` — MUST be self-sufficient (executable with zero prior context)
4. `<red>` — each line starts with `- test:`, describes ONE testable behavior. Must cover ALL cases: happy path, edge cases, error conditions, boundaries. No arbitrary limits on count. If `requirements.md` exists, annotate each test with the requirement id(s) it covers, e.g. `- test: response omits field F when the input is empty (R7)`.
5. `<success>` — checklist of verifiable outcomes (`- [ ]` format), ALL must pass
6. `<files>` — ONLY in index.md, signals multi-file mode (see Multi-File Plans below)
7. Tags can span multiple lines
8. No nesting tags inside other tags (except all tags are inside `<block>`)
9. Standard markdown between tags is preserved for human reading
10. **Never write raw TDDAB tag names with angle brackets inside any tag content** (mission, block, intro, red, success, files). This applies to ALL text inside ANY tag — not just mission. When referencing tags in prose, use backtick-wrapped form or write without angle brackets ("the mission tag", "the files list"). The parser cannot distinguish a literal tag name from a real tag boundary.

---

## Requirement Coverage (MANDATORY when `requirements.md` exists)

If `requirements.md` is present (produced by `/j-analyze-requirements`), it is the authoritative
list of what the task demands. The plan MUST cover it completely:

1. Read `requirements.md` before writing any block.
2. EVERY requirement `R1..Rn` must be covered by at least one `<red>` test in some block. Annotate
   each test with the id(s) it covers (see Tag Rule 4).
3. Secondary / buried requirements (negative "must not", disabled/read-only states, restore-on-
   switch-back, "exactly once", "no duplicates", exact response shapes) need their OWN explicit
   RED test — they are the ones all-or-nothing grading punishes. Do not fold them into a happy-path
   test where they can silently go unchecked.
4. End the plan with a coverage line per requirement, e.g. `R7 → block 04 (test: empty-input
   response)`. Any `R` with no covering test is an incomplete plan — add the block/test.
5. Each covering RED test must encode the requirement's `accept:` criterion as a CONCRETE value/state
   assertion — assert the exact observable (value, attribute, count, type, string, state), not mere
   presence or truthiness. A test that would still pass without the precise required behavior is too
   weak: it lets execution go GREEN while a stricter hidden grader test fails. Write the assertion at
   the tightest exact form the `accept:` line states.
6. When a requirement ranges over a CATEGORY of entities (every control / callable / endpoint / field /
   UI surface — see the requirements' surface inventory), the RED tests must cover EACH enumerated
   member, not a representative subset — especially members with different mechanics (a native control
   vs a custom dropdown/picker vs a file input behave differently). The member the plan forgets is the
   one the hidden grader checks.
7. **Idempotency / exactly-once / lifecycle requirements need a REPEAT test, never a single-trigger
   test.** When a requirement says an effect/binding happens "exactly once" / "no duplicates", or
   concerns add-after-init, remove-then-readd, or re-init, the `<red>` test MUST exercise the
   repetition: trigger the action TWICE (and where controls are added/removed, do add→remove→re-add),
   then assert the effect applied EXACTLY ONCE — exact final value/state, no doubled output, no
   duplicate element/listener (assert the deduplicated COUNT or the exact single-applied result). A test
   that triggers the action only once goes GREEN even when the handler is bound twice — the classic loss
   (text becomes `alphaA` instead of `alpha`, a node appears twice, a listener fires N times).

---

## WHAT A TDDAB PLAN IS NOT

### NEVER Include:
- Options or alternatives ("Should we A or B?")
- Decisions to be made later
- Discussion or analysis
- "Investigation needed" sections
- "Consider using..." phrases
- Multiple approaches

### NEVER Write:
```
// WRONG - This is discussion, not a plan
"Option A: Use library X"
"Option B: Build custom solution"

// WRONG - This is not executable
"Investigate if we need..."
"Consider whether..."
```

---

## TDDAB Planning Rules

### 1. Information Self-Sufficiency (CRITICAL!)
**Each TDDAB must be understandable with ZERO context:**
- Show FULL file paths, not relative references
- Write code in the target language with types, signatures, key logic, and test assertions
- Code is REFERENCE — detailed enough for j-develop to produce compilable code, but does NOT need perfect imports or boilerplate
- Never reference "previous discussion" or "as we decided"
- Never use "..." to skip DECISIONS — but acceptable for standard boilerplate
- `<mission>` must contain enough project context that ANY block works on clean context

**Why:** Plans are executed in fresh context where only one block is visible at a time. The `<mission>` is the only briefing — it must cover architecture, stack, patterns, commands. The AI agent compiles and verifies during j-develop, not during planning.

### 2. Preliminary Work Handling
**Merge non-testable setup into first TDDAB implementation:**
- Package additions → Part of TDDAB-1 implementation
- Configuration changes → Part of implementation phase
- File deletions → Part of implementation phase

**NEVER create separate "setup" or "preparation" blocks**

### 3. Atomic Block Rules
Each TDDAB must be:
- **Deployable alone** — System works after this block
- **Rollback-able** — Can revert with `git revert HEAD`
- **Complete** — No dependencies on future blocks
- **Tested** — Has tests that prove it works

### 4. RED = CONTRACT (CRITICAL!)
The `<red>` tests define the **interface contract** for the block — they specify WHAT the unit must do, not how the full feature works end-to-end.

```
CORRECT: RED tests for a Service block
- test: CreateOrder with valid items → returns Order with status Created
- test: CreateOrder with empty items → throws ArgumentException
- test: CreateOrder calls repository.Save exactly once

WRONG: RED tests that are API/E2E tests for the whole endpoint
- test: POST /api/orders returns 201
- test: POST /api/orders with bad data returns 400
(These test the WHOLE stack, not ONE block)
```
**EXCEPTION:** this unit-level rule applies to the per-LAYER blocks. The plan ALSO ends with ONE mandatory
integration block (rule 5b) whose tests ARE end-to-end through the real public surface — by design.

### 5. Bottom-Up Decomposition (CRITICAL!)
Features MUST be decomposed into blocks **bottom-up by layer**, not as one monolithic block per endpoint/feature.

```
CORRECT decomposition for "Add Order endpoint":
  Block 01: Order model + validation       (unit tests)
  Block 02: OrderService business logic     (unit tests, mock repository)
  Block 03: OrderRepository persistence     (integration tests)
  Block 04: OrderController endpoint        (tests with mocked service)

WRONG — one block for entire endpoint:
  Block 01: Complete Order endpoint          (6 API tests)
  (This is NOT atomic, NOT testable in isolation, NOT rollback-safe)
```

**Why bottom-up?**
- Each block tests ONE responsibility in isolation
- If Block 02 fails, you know the problem is in the service, not the model or controller
- Blocks can be developed in parallel by different agents
- Each block is genuinely atomic — revert one without breaking others

**Decomposition strategy:**
1. **Data/Model** — entities, DTOs, value objects, validation rules
2. **Logic/Service** — business rules, orchestration (mock external deps)
3. **Persistence** — repository, DB access (integration test if needed)
4. **Interface** — controller/endpoint/CLI (mock service layer)
5. **Wiring** — DI registration, configuration (final block if needed)

### 5b. Mandatory final integration block — drive the REAL public surface, NO mocks (CRITICAL!)
Bottom-up unit blocks (rule 5) test each layer in isolation with mocks — necessary, but they CANNOT catch a
feature wired to the wrong surface, an option declared but never applied end-to-end, or a result the real
consumer never sees. The hidden grader drives the feature through its REAL public API as an external
consumer — so the plan MUST end with an integration block:

- `<block id="NN-integration">` (last block) whose `<red>` tests drive each behavioral requirement through
  the REAL public entry point a consumer uses (the public method / endpoint / handler / stream), with NO
  mocks of the layers under test, reading the result from the SAME surface a caller reads.
- Exercise the full option/config matrix on that public surface (every flag/mode toggled — e.g.
  parse_results on/off on a custom-scalar field, each transport, each mode), using the realistic scenarios
  HARVESTED from the repo's existing tests (see `/j-analyze-requirements` step 1b — PORT them, do not invent
  softer ones).
- Cover robustness end-to-end where applicable: recursion/cycle termination, N concurrent calls converge,
  N-iteration invariants.
- This block COMPLEMENTS, does not replace, the unit blocks. Every behavioral requirement `R` must be covered
  by at least one integration test HERE, in addition to its unit test. It is the block that catches what
  isolated unit tests structurally cannot.

### 6. Test-First Enforcement
```
CORRECT:
1. Write failing test       (RED)
2. Write implementation     (GREEN)
3. Verify tests pass        (VERIFY)
4. Commit and push          (COMMIT)

WRONG:
1. Write implementation
2. Write tests afterward
```

### 7. Exact Types, Units & Wire Formats — COHERENT WITH EXISTING CODE, NOTHING INVENTED (CRITICAL!)
Types are NEVER assumed or chosen for convenience. Every type, field shape, signature, and integration point
the new code introduces MUST be DERIVED FROM and CONSISTENT WITH the existing codebase it plugs into — read
the actual code, do not guess. The whole structure into which your code is inserted (the serialized struct,
the field a consumer reads, the channel a value travels on) must stay coherent with what is already there.
- A unit/type suffix dictates the type: `*_ms` / `*_count` / `*_bytes` are INTEGER (`int64`), never float.
  `reloader_timings_ms` is integer milliseconds — compute it as `.Milliseconds()` (int64), NOT
  `float64(d.Nanoseconds())/1e6`. A float here fails the grader's `int64` unmarshal even though your own
  float-typed test passed. Pin it: "reloader_timings_ms: JSON integer, int64, no fractional".
- The value must travel on the SAME field/channel the existing consumer reads. If the existing code reads
  prior turns from `request.context`, feed your result back via `context` — not a different field like
  `message` — or the consumer (and the grader) sees nothing. Trace how the existing consumer reads it.
- Your `<red>` test must assert the REQUIREMENT using the REAL contract's types — never a self-chosen shape.
  A test written against an assumed type/field passes locally and fails the grader. The test follows the
  existing code's contract; the code does not follow the test's convenient assumption.

When the task names a data field, response field, header, or any serialized value, the `<red>` tests AND `<success>` criteria MUST pin its EXACT type, unit, and wire format — never leave it to inference.

- A field whose name carries a unit/type suffix (`*_ms`, `*_count`, `*_id`, `*_bytes`, `*_seconds`) implies an exact type. State it explicitly: "reloader_timings_ms: integer milliseconds, no fractional/float".
- JSON number type matters on the wire: integer vs float are NOT interchangeable. If the grader unmarshals `0.001` into an `int64` field, it fails. If a field is integer ms, emit `1`, never `0.001`.
- Assert the TYPE, not just presence. A RED test must check the serialized type/shape — e.g. "the JSON value of `reloader_timings_ms` is an integer", "the `Allow` header equals `GET, HEAD, POST, ...` exactly", "method/field order is X, Y, Z" — not merely that the field exists.
- Exact symbol source: if the task names a specific import/class for a value, the test must assert THAT exact symbol. Two identically-named types from different modules fail an isinstance/type check.

**Why (benchmark-critical):** the hidden grading tests assert exact shapes and types. A plan that leaves a field's type/unit ambiguous lets GREEN pass on your OWN tests while the grader's stricter test fails. The block's `<red>` is your only defense — encode the exact contract there.

### 8. Clean Policy — 0 errors / 0 warnings on the project's REAL toolchain
Code we hand back must be clean — but ONLY against the tooling the project actually uses. Never invent tools it does not have.

- During UNDERSTAND, detect the project's real toolchain and exact commands: which of **Build / TypeCheck / Lint / Test (BTLT)** actually exist (e.g. `deno check`, `go vet`, `npm run lint`, `pytest`). If the project has no linter, there is NO lint requirement — do not add one. Forcing absent tooling does more harm than good.
- Whatever DOES exist must be clean: every check the project provides runs with 0 errors AND 0 warnings (treat warnings as errors). Its tests pass — none skipped, ignored, commented out, or marked pending.
- A block is NOT done until those real commands are clean. The `<mission>` states WHICH commands apply; each block's `<success>` lists them as exit criteria.
- **It is a STATE, not a delta.** The bar is "the project's checks are green NOW (0/0)", not "I added no new warnings". A warning already present still has to go.
- **"Pre-existing" is not an excuse.** If a real check reports it, you own it and fix the ROOT CAUSE — not "already there" / "unrelated".
- **No workarounds.** Never suppress or hide it to make a check pass: no `@ts-ignore` / `eslint-disable` / `#[allow(...)]` / `# type: ignore` / `@SuppressWarnings`, no commenting-out or skipping a failing test, no loosening the project's config. Fix the cause. Suppressing a warning is a FAILED block.

This is a planning/agent discipline encoded in the mission + success criteria — NOT a separate machine-enforced gate. State in the mission the EXACT clean commands the project has, e.g.: "Clean policy: `deno check` + `deno test` must be 0 errors / 0 warnings; no suppressions, no pre-existing exemption." Add to each block's `<success>`: "<project's checks> clean: 0 errors / 0 warnings".

---

## TDDAB Size Guidelines

### Ideal TDDAB Size:
- **Tests**: ALL necessary — happy path, edge cases, error conditions, boundary values. No fixed number. A simple validator may need 2 tests, a complex service may need 15. Cover ALL edge cases.
- **Files**: 1-3 files modified
- **Scope**: Single layer or single responsibility

### Too Large (Split It):
- Modifies > 5 files
- Multiple unrelated features
- Can't deploy independently
- Spans multiple layers (model + service + controller in ONE block)
- Tests are API/E2E level instead of unit level

### Too Small (Merge It):
- Single test case
- < 10 lines of code
- Just config changes

---

## TDDAB Naming Convention

```
<block id="NN-kebab-case-name">
## TDDAB-N: [Verb] [Feature] [Context]
```

Examples:
```
<block id="01-add-auth-config">
## TDDAB-1: Add Authentication Configuration

<block id="02-replace-jwt-oauth">
## TDDAB-2: Replace JWT with OAuth Provider

<block id="03-update-claims-logic">
## TDDAB-3: Update Claims Extraction Logic
```

id matches the block number and a short descriptive slug.

---

## Execution Order Section

Every plan MUST end with an execution order showing dependencies:

```markdown
## Execution Order
01-first-thing    → no dependencies
02-second-thing   → depends on 01
03-third-thing    → depends on 01, 02
04-parallel-thing → depends on 01 (can run parallel with 02-03)
```

---

## TDDAB Quality Checklist

For each block, verify:
- [ ] Has unique `<block id="">`
- [ ] Has `<intro>` with full context
- [ ] Has `<red>` with testable behaviors
- [ ] Has `<success>` with clear exit criterion
- [ ] Tests are written first and will fail
- [ ] Implementation approach is clear (no TODOs, no unresolved decisions)
- [ ] Block is atomic and deployable
- [ ] No decisions or options included
- [ ] File paths are exact
- [ ] Code shows types, signatures, key logic, assertions (compilability verified by j-develop)
- [ ] Every data field / response value has its EXACT type+unit pinned in `<red>` (integer vs float, ms, exact header strings, exact symbol source)
- [ ] Mission lists the project's REAL checks (whichever of build/typecheck/lint/test exist, exact commands) and requires them at 0/0; each block's `<success>` lists those checks clean
- [ ] Can be rolled back independently
- [ ] No dependencies on future blocks

---

## Multi-File Plans

For large plans, split into an **index.md** + multiple sub-files to avoid mission duplication.

### When to Split
- Plan exceeds ~300 lines or ~10 blocks
- Natural layer boundaries exist (models, services, API, UI)
- Multiple developers/agents will work on different sections

### index.md Format
```markdown
# TDDAB Plan: [Feature Name]
**Date:** YYYY-MM-DD

<mission>
[Full project context — single source of truth]
</mission>

<files>
- 01-models.md
- 02-services.md
- 03-api.md
</files>
```

### Sub-file Format (e.g., 01-models.md)
```markdown
# Models Layer

<block id="01-order-entity">
## TDDAB-1: Create Order Entity

<intro>
[Context for this block]
</intro>

<red>
- test: [first test]
</red>

### Implementation
[Reference code]

<success>
- [ ] [verifiable outcome]
</success>
</block>
```

### Multi-File Rules
1. `<mission>` in index.md is **authoritative**. `<mission>` in sub-files is silently ignored.
2. `<files>` tag in index.md signals multi-file mode. One filename per line, prefixed with `- `.
3. Block IDs must be **globally unique** across all files.
4. File order in `<files>` = execution order.
5. Paths are relative to the directory where index.md lives.
6. No `<files>` tag + `<mission>` present = single-file plan (full backward compatibility).

---

## CVM Integration

This plan format is designed to be parsed by CVM:
- `<mission>` → initial context prompt
- `<block>` → task array entry with id, line references
- `<intro>` + `<red>` → prompt for RED phase
- `<success>` → prompt for VERIFY loop exit criteria
- `<files>` → multi-file mode: CVM reads index.md for mission, then parses each sub-file for blocks

When NOT using CVM, the same format works perfectly for manual execution — tags are lightweight and don't hurt readability.

---

## GOLDEN RULES OF TDDAB

1. **If you write "Option A or B"** → STOP, make the decision first
2. **If you write "TODO"** → STOP, make the decision now
3. **If you use "..." to skip a decision** → STOP, resolve it ("..." for boilerplate is fine)
4. **If you write "investigate"** → STOP, do it now, then plan
4. **If tests aren't first** → STOP, restructure the block
5. **If it's not atomic** → STOP, split or merge blocks
6. **If there's no `<block>` tag** → STOP, add structure
7. **If a field has a unit/type suffix (`_ms`, `_id`, `_count`) or the task states a wire format/header/order** → STOP, pin the EXACT type+unit in the RED test, never infer
8. **If one of the project's real checks shows ANY warning or error** → the block is NOT done; fix the ROOT CAUSE. 0/0 on the tools the project actually has (don't invent absent ones) — no "pre-existing" excuse, no suppress/skip/disable workarounds. The mission must list those checks
9. **Test file names must be collision-proof** → every test file the plan creates is named `zerox_<name>_test.go` (e.g. `zerox_reload_test.go`), NEVER a grader-like name (`transactional_reload_test.go`). The hidden grader's verifier resets/replaces any test file whose path matches one of ITS files — deleting the agent's same-named file and orphaning any helper defined there but used in another file (`undefined` symbol → whole package build fails, even though it compiled for the agent). Plan the RED tests with `zerox_`-prefixed FILE names from the start, and keep each helper in the SAME file as its uses

---

## ACTIVATION TRIGGER

When user requests TDDAB planning:
1. Ensure all decisions are made first
2. Create atomic blocks with clear reference code
3. Tests ALWAYS come first
4. Use `<mission>`, `<block>`, `<intro>`, `<red>`, `<success>` tags
5. No options, no discussions, no investigations
6. Complete, deployable code only
7. End with execution order

**A TDDAB plan is a RECIPE, not a DISCUSSION!**
