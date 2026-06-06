---
name: j-coverage-crosscheck
description: Deep bidirectional coverage cross-check BEFORE review — plan↔requirements↔reality. Produces coverage.md (full test inventory + two coverage matrices). Catches MISSING requirements (the implicit cross-cutting ones), not just untested ones.
---
# Coverage Cross-Check Mindset

## Why this phase exists (read first)
The all-or-nothing loss has TWO shapes, and the ordinary review only catches one:
- **Untested requirement** — `R` exists in `requirements.md` but no test covers it. (Gate F catches this.)
- **MISSING requirement** — the behavior the grader tests was NEVER written as an `R` at all, so there is
  nothing to map and the review passes a plan that is silently incomplete. **This is the one that keeps
  losing tasks** (e.g. `execute_incremental` must honor the client's `parse_results` like its sibling
  `execute` — never derived, so never tested, so shipped raw).

A forward check (requirements → tests) cannot catch a MISSING requirement, because the requirement is not
there to check. This phase adds the REVERSE check (reality → requirements) and demands deep, evidence-based
reasoning, not a nominal tick-box. Output is `coverage.md`.

## Inputs
Read all three before reasoning:
- `requirements.md` (the R1..Rn list)
- `plan.md` (the blocks and their `<red>` tests)
- Your Phase-1 harvest notes + the codebase: the EXISTING tests for the area, and the SIBLING/equivalent of
  every new public member you add. Re-open the actual files — do not work from memory.

## Steps

### 1. Test inventory
List EVERY `<red>` test in the plan, across all blocks: `block-id · test description · R-ids it claims`.
A flat, complete list. If a block has tests with no R annotation, flag it.

### 2. FORWARD matrix — requirements → tests (is each R really covered?)
For each `R1..Rn`: list the covering test(s). Then reason as the hidden grader for EACH:
- Would this test FAIL if the required behavior were removed/broken? If a test would still pass with the
  behavior absent, the coverage is NOMINAL — treat as UNCOVERED. (A `hasattr`/truthy/"no error" test, or a
  test whose scenario never triggers the actual code path, is nominal.)
- Is the assertion the CONCRETE observable the `accept:` demands (exact value/type/structure/raised error)?
Any `R` with zero real covering tests → gap.

### 3. REVERSE matrix — reality → requirements (the part that catches the killer)
This is the new, decisive direction. Build it from the CODE, not from `requirements.md`:
- **Sibling feature surface.** For EVERY new public member you add, open its nearest EXISTING namesake/sibling
  (the existing method this one parallels: `execute`→`execute_incremental`, the existing handler/transport of
  the same kind). Enumerate its FULL surface: every parameter, option/flag, default-from-client/config,
  cross-cutting behavior (result parsing/deserialization e.g. `parse_results`, input serialization,
  validation, error/exception mapping, cleanup). For EACH item: is there an `R` (and a test) that the new
  member honors it? If not → it is a MISSING requirement. Add the `R` and a test now.
- **Existing tests harvested.** For each existing test of the area (e.g. `tests/custom_scalars/*` for result
  parsing, error-path tests, concurrency tests): is its scenario represented by an `R`+test ported to the new
  member? If not → MISSING requirement. Add it.
- **Negative space & robustness.** Each enumerated support list → the unsupported case has an `R`. Each
  recursive/concurrent/sequenced behavior → a termination/convergence/invariant `R`.

### 4. Integration coverage
Confirm every BEHAVIORAL `R` is covered at least once in the final integration block (real public surface, no
mocks), not only by a mocked unit test.

### 5. Write `coverage.md` and act on gaps
Write `coverage.md` containing: the test inventory, the FORWARD matrix, the REVERSE matrix, and a GAPS
section. For every gap (untested R, nominal coverage, OR missing R from the reverse check):
- Add the missing `R` to `requirements.md` and the missing/strengthened `<red>` test to `plan.md` NOW.
- Re-run from step 1 until BOTH matrices are complete with zero gaps.

## Output
Submit ONLY one word: `done` (the work is `coverage.md` + the fixes to `requirements.md`/`plan.md`).
Do not submit `done` while any gap remains — a missing reverse-direction requirement is the failure this
phase exists to stop.

## Rules
- The REVERSE check is mandatory and is the whole point — never skip it because the forward matrix looks
  complete. The forward matrix being green is exactly the state in which tasks were lost.
- Enumerate the sibling's surface from the ACTUAL code, member by member. "It looks covered" is not allowed —
  name each sibling parameter/feature and point to its `R`+test, or add it.
- No code is written here — only `coverage.md`, and edits to `requirements.md` / `plan.md`.
