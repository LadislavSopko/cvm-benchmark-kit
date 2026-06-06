---
name: j-analyze-requirements
description: Decompose the task instruction into an exhaustive list of atomic, independently-testable requirements BEFORE planning. Surfaces buried/secondary clauses that all-or-nothing graders punish.
---
# Requirements Analyst Mindset

## Why this step exists

Graded tasks are **all-or-nothing**: one unmet requirement fails the whole task even when
everything else is correct. The recurring failure mode is NOT bad logic — it is a *missed
requirement*, usually a secondary clause buried inside a compound sentence (e.g. "X must be
disabled while in state S **and** the related view must reflect the same state **and** leaving S
must restore it" — that is three separate requirements). When you extract requirements while also
designing the plan, these clauses slip. This step forces you to enumerate EVERY atomic
requirement first, with full attention, before any implementation design.

The product is `requirements.md` — a flat, numbered list the planner and the plan review both
map against.

## Steps

### 1. Read the task
- Read `instruction.md` in full. Read it twice.
- If `memory-bank/` exists, read it for project context (do not re-derive).

### 1b. Harvest the repo's EXISTING tests for the area you extend (MANDATORY)
The recurring loss: the agent understands the feature, then INVENTS its own softer test scenarios, and
ships a solution that passes them but fails the hidden grader's harder, realistic scenario. The repo almost
always already contains those realistic scenarios — the hidden grader is built from the same conventions.
Do NOT invent from scratch; harvest:
1. LOCATE the existing tests covering the SIBLING / equivalent of what you add — by name and by area: the
   existing method this one parallels (`test_*<sibling>*`), the existing handlers / transports / adapters of
   the same kind, and the directories for cross-cutting concerns (e.g. `tests/custom_scalars/`, error-path
   tests, concurrency tests). Read them.
2. EXTRACT the concrete scenarios they exercise — exact inputs, custom types/scalars, error cases, the
   option/config matrix they toggle (e.g. `parse_results` on a custom-scalar field, each transport, each
   mode), and HOW they read the result (which public surface / entry point).
3. These scenarios ARE the contract. Carry each into `requirements.md`, and the plan must PORT the existing
   test to the new member — same scenario, adapted call — not a self-invented easier one. A new member that
   parallels an existing one INHERITS the existing one's test suite.

### 2. Decompose into ATOMIC requirements
- Split EVERY compound sentence into separate items. Clauses joined by `and`, `,`, `;`,
  `including`, `as well as`, `must also`, `but` are usually SEPARATE requirements.
- One requirement = ONE independently-testable claim. If a single test cannot prove it on its
  own, split further.
- Do NOT paraphrase away specifics. Keep exact field names, header names, enum values, types,
  units, counts, and exact strings from the instruction.

### 3. Hunt the easy-to-miss kinds (checklist — apply to EVERY sentence)
For each sentence, ask whether it also implies any of these, and if so emit a separate item:
- **Negative / "must not"** — must not duplicate, must not move focus, must not apply formatting.
- **State-dependent** — disabled / read-only / empty / before-first-use / after-removal states.
- **Restore / reversal** — switching back, re-enabling, undo, re-adding restores prior behavior.
- **Cardinality** — exactly once, exactly one, no duplicates, at most/at least N.
- **Exact shape** — response/JSON keys, field order, exact types & units (int vs float, ms),
  exact header/enum strings, RFC formats.
- **Lifecycle** — init, re-init, recreation, teardown, add-after-init, remove-then-readd.
- **Targeting** — applies to the *active*/*current* one, not a stale or previous one.
- **Robustness / termination / convergence** — if the feature RECURSES, delegates, or chains, it must
  TERMINATE on a cycle and on a depth bound (a cycle must surface a bounded error, never infinite recursion /
  stack overflow). If it runs CONCURRENTLY or services parallel requests, N concurrent invocations must
  CONVERGE to a consistent state with no deadlock/timeout. If it repeats or sequences, invariants must hold
  across N iterations. These are the exact properties a hidden grader stress-tests and a happy-path suite
  never does — emit each as its own `R` with a concrete `accept:` (e.g. "A→B→A raises an error whose message
  contains 'circular'", "100 concurrent reloads converge to one final state", "45 sequential attempts keep
  invariant X").

### 3b. Surface / entity inventory — expand category-ranging requirements to EACH member
Many requirements quantify over a CATEGORY rather than one thing — e.g. "the controls",
"public callables", "endpoints", "form fields", "UI elements", "response fields". The recurring
miss is satisfying the requirement for SOME members of the category but not all — especially members
with different mechanics. For every such requirement:
1. ENUMERATE the concrete members of the category FROM THE CODEBASE (read the actual code/markup —
   do not guess). E.g. every interactive control in scope (each button, each dropdown/select, each
   file input, each text field), or every public function the task names, or every endpoint.
2. Note which members have DIFFERENT mechanics for this requirement — a native form control, a custom
   dropdown/picker, a file input, and a plain element each express/handle a state differently. These
   differences are exactly where coverage is lost.
3. Emit the requirement's `accept:` so it covers EACH member explicitly (or split into one `R` per
   member when their mechanics differ enough to need separate tests). A representative subset is NOT
   enough — "applies to controls" means EVERY control, including the awkward one.

### 3c. Implied-contract derivation — requirements the spec ENTAILS but never spells out
The instruction is a SUMMARY, not the full contract. An all-or-nothing grader tests the complete
engineering contract, including requirements the literal text never states but logically ENTAILS. These
are the ones that pass your own happy-path tests yet fail the hidden grader. Derive them from two
task-agnostic sources — every derived item must TRACE back to one of these (do not invent free-floating
requirements with no such basis):

1. **Sibling / family parity.** If the task adds a new public member to an existing family (a new method
   beside an existing one, a new transport/backend/adapter/driver beside existing ones, a new variant of an
   existing type), the new member must honor the SAME cross-cutting concerns its siblings already honor —
   unless the instruction explicitly excludes one. Locate the nearest existing sibling IN THE CODEBASE, read
   its signature AND body, and enumerate every cross-cutting behavior it applies: result parsing /
   deserialization, input serialization, validation, defaults taken from the client/config, error & exception
   mapping, resource cleanup/teardown. Each concern the sibling honors becomes a requirement for the new
   member (with a concrete `accept:`), or is explicitly recorded as "excluded because <clause>". A new member
   that declares an option but silently skips its sibling's behavior (e.g. accepts a `parse_result` flag but
   never deserializes) is the classic hidden-grader miss.
   **MANDATORY mechanical step — produce the artifact, do not just "consider":** for the PRIMARY new public
   member, locate its same-name sibling in the code (e.g. `execute` for `execute_incremental`), and in
   `requirements.md` write a `## Sibling surface` block that (a) COPIES the sibling's full parameter
   signature VERBATIM from the source with its `file:line`, and (b) lists ONE numbered `R` per parameter /
   option / cross-cutting behavior, each asserting the new member honors it OR `excluded because <clause>`.
   If `requirements.md` does not contain the copied sibling signature and a per-parameter `R` mapping, this
   step was NOT done — go do it. This block is exactly what turns `parse_result` / `serialize_variables` into
   requirements at analysis time instead of leaving them to luck downstream.
2. **Negative space of capability / support statements.** Every "only A and B do X", "X is supported over A
   and B", enumerated support list, or capability/mode statement ENTAILS its complement: anything NOT in the
   list must FAIL EXPLICITLY (raise / reject / no-op), not silently succeed by falling through a generic path.
   Emit a separate `R` for the unsupported/absent case with its required failure behavior ("calling X on an
   unsupported <thing> raises <ErrorType>"), and assert it CONCRETELY (an exception of an exact type is raised)
   — never "does not crash".
3. **Integration-surface parity.** When the feature plugs into an existing flow (a handler, an event/result
   stream, a registry, a message channel, a return value a caller consumes), its output must be surfaced
   through the SAME mechanism, shape, and entry point that the nearest EXISTING equivalent uses — so any
   consumer that reads the standard way sees it. Find an existing feature of the same kind in the codebase
   (another handler, another tool, another transport, another event), trace HOW its result reaches the
   consumer (which function emits it, the exact object/message shape, the field names, the entry point that
   drives it), and emit requirements that the new feature replicates that exact path. A result delivered
   through a different or ad-hoc path is invisible to a grader that reads the standard surface (the canonical
   symptom: the grader inspects the expected field and finds `null`/`undefined`). The instruction phrase
   "follow existing … patterns" is a direct signal this source applies.

### 4. Write `requirements.md`
Use EXACTLY this format (the plan review parses `R<n>` ids):

```markdown
# Requirements: <task title>

- **R1** [behavioral] <one atomic, testable requirement>
  - accept: <what a passing test asserts — concrete, observable>
  - source: "<exact clause copied from instruction.md>"
- **R2** [non-behavioral] <e.g. exact response shape / type / annotation>
  - accept: <...>
  - source: "<...>"
```
Rules:
- `[behavioral]` = observable runtime behavior; `[non-behavioral]` = shapes, types, signatures,
  annotations, naming, exact strings.
- IDs are `R1..Rn`, contiguous, unique.
- Every sentence/clause of `instruction.md` must be traceable to at least one `R`. Nothing dropped.
- **`accept:` must be a CONCRETE, OBSERVABLE check** — an exact value, attribute, count, state, type,
  or string that a test can assert directly (e.g. "<observed thing> equals <exact value>", "exactly N
  of <thing>", "field F has type T and unit U", "attribute A present/absent"). NEVER vague ("works",
  "is handled", "behaves correctly", "is updated"). A downstream test inherits the strictness of the
  `accept:` line: a soft criterion produces a soft test that goes green while a stricter hidden test
  fails. Pin the tightest exact observable the instruction implies.

### 5. Self-audit for exhaustiveness (MANDATORY)
- Go clause-by-clause through `instruction.md` and confirm each maps to an `R`. List any sentence
  that does not yet — then add the missing `R`.
- Re-run the step-3 checklist over the whole instruction one more time. Buried negative / restore /
  cardinality clauses are the ones that lose tasks.

## Output
Submit ONLY one word: `done` (the work is `requirements.md`, written via tools — not in the reply).

## Rules
- This step produces NO code and NO plan — only `requirements.md`.
- Exhaustive over clever: more granular atomic requirements is better than fewer broad ones.
- TYPES AND STRUCTURES ARE NEVER ASSUMED — they must be COHERENT with the existing code. Every field type,
  data shape, signature, and integration point in an `accept:` criterion is DERIVED from the actual codebase
  (the existing serialized struct, the field a consumer reads, the channel a value travels on), not chosen for
  convenience. A `*_ms`/`*_count`/`*_bytes` field is an integer (int64), never float. A value fed back to an
  existing consumer travels on the SAME field that consumer already reads (e.g. `context`, not `message`).
  Read the code; pin the real type in the `accept:`. Nothing invented.
- Capture requirements the instruction STATES *or ENTAILS* — every implicit one must trace to step 3c (the
  logical complement of an explicit clause, or a cross-cutting behavior an existing sibling already honors).
  Never invent requirements with no such basis; never drop one the instruction states.
