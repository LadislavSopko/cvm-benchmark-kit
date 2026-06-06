---
name: j-cvm-exec-plan
description: Parse and execute a TDDAB plan via CVM planexecutor. Autonomous block-by-block execution with RED/GREEN/VERIFY/COMMIT phases. Supports resume after interruption.
---

# CVM Execute Plan

Parse a TDDAB or Step plan and execute it using the CVM planexecutor.

## Prerequisites

- **CVM MCP server must be available** — check if `mcp__cvm__parsePlan` tool exists.
  If NOT available → STOP with error: "CVM MCP server not available. Cannot execute plan."

## What to do

### 1. Get plan path and parse

- If a path was provided → use that
- Otherwise check MB activeContext for plan path (if MB exists)
- If still unknown → STOP with error: "Plan file path required but unknown."
- **Do NOT search for plan files. Do NOT read the plan file.** The planexecutor provides all context needed per phase. Reading the plan pollutes context and encourages deviation.
- Call `mcp__cvm__parsePlan` with the file path (CVM reads the file internally)
- If invalid → show errors and STOP
- If valid → continue

### 2. Check progress

- Read `.cvm/uplan-progress.json` if it exists
- If blocks are already completed, report: "Resuming: N blocks already done, will skip them"

### 3. Load and start planexecutor

```
mcp__cvm__loadFile → programId: "planexecutor", filePath: "@planexecutor"
mcp__cvm__start    → programId: "planexecutor", executionId: "run-<timestamp>"
```

### 4. Execute the loop

**CVM protocol is STRICTLY SYNCHRONOUS. Violating this causes phase desync.**

Rules:
- **ONE CVM tool call per turn** — never batch getTask + submitTask or multiple CVM calls in the same message
- **ALL CVM calls (getTask, submitTask) must be made by the main conversation** — never delegate CVM communication to Agent/subagents
- Subagents CAN be used for the work itself (analyzing files, running tests, exploring code) — but the CVM protocol stays in master
- **Strict sequence**: getTask → do the work → submitTask → wait for response → then getTask again
- **NEVER call getTask before submitTask response is confirmed**

The loop:
1. Call `mcp__cvm__getTask` — get the next prompt
2. Do the work the prompt asks (write tests, implement, verify, etc.)
3. Call `mcp__cvm__submitTask` with the response — wait for confirmation
4. Go to step 1

Repeat until `getTask` returns "Execution completed".

### 4b. Submit ONE word — never a report

Do all the thinking and checking AS WORK in your turn (run the tests, read the code, gather file:line evidence — that guardrail stays). But `submitTask` is a SIGNAL, not a report. Submit ONLY the bare token, nothing else:

- VERIFY / RE-VERIFY → submit exactly `passed` or `failed`
- RED / GREEN / FIX / UPDATE MEMORY BANK / COMMIT → submit exactly `done`
- CROSS-CHECK → submit exactly the JSON the prompt asks for

Lowercase, one token, no punctuation, no explanation, no `✅`, no summary after it. Submit `passed`, not `passed. all criteria met`. Submit `done`, not `done. created file X and Y`.

Submit `passed` ONLY when every success criterion genuinely holds against the actual code; otherwise `failed` — the executor gives you a FIX phase. When in doubt, `failed`: a false `passed` commits broken code and fails the task.

### 4c. Phase discipline — true RED and adversarial VERIFY

The grader's tests are hidden; you only see your own. The failure that loses tasks is going GREEN on
a test that is weaker than the grader's. Two disciplines prevent it (apply on EVERY block — generic to
any language/stack):

**RED must genuinely fail for the right reason (before you implement):**
- Run the block's new tests against the CURRENT code BEFORE writing the implementation. You must
  OBSERVE them FAIL.
- The failure must be because the required behavior is ABSENT — an assertion mismatch on the expected
  value/state. NOT a compile error, import error, typo, or missing-symbol setup failure (that proves
  nothing about the behavior). If it errors for a setup reason, fix the test until it fails on the
  assertion itself.
- If a test PASSES before you implement anything, it is too weak — it does not actually exercise the
  required behavior. Tighten it (assert the exact value/state the requirement demands) until it fails,
  then implement.
- BAN soft assertions. A test that only checks shape/existence — `hasattr`, a bare truthy/non-empty check,
  `is not None` as the ONLY check, or "no exception was raised" — proves nothing the hidden grader cares
  about and will pass before you implement. Assert the CONCRETE consequence: exact type
  (`isinstance(x, datetime)`), exact value, exact structure, or the exact raised exception
  (`pytest.raises(SomeError)` / expecting an error of a named type). If the strongest thing you can assert is
  soft, the requirement is under-specified — pin the exact observable before writing the test.

**EVERY added code path MUST be covered by a test — absolute, no exceptions:**
- You may NOT add a single line or branch of production code that no test exercises. Every new branch, every
  option/flag the code accepts, every error / early-return / empty / null path, every loop body must be
  ENTERED by at least one test whose assertion FAILS if that path is broken or removed. This is the TDDAB
  contract taken literally: code exists only because a RED test demanded it.
- Declaring an option/parameter and not exercising it is the canonical miss — e.g. accepting a `parse_result`
  flag but no test asserts it changes the output. If you add the option, you add its branch AND a test that
  flips it (`True` vs `False`) and asserts the observable difference.
- **Coverage gate before COMMIT:** measure coverage over the files you changed using the stack's tool
  (`coverage.py` / `pytest --cov`, `vitest --coverage`, `go test -cover`). Read the report: any added line or
  branch NOT hit by your tests is a gap. Add a concrete test that exercises it, or delete the dead code. Do
  NOT submit `done` for COMMIT while any added production path is uncovered.

**VERIFY is adversarial, not self-congratulatory:**
- VERIFY does not mean "my test passed." For each success criterion / requirement in scope, act like an
  independent grader trying to BREAK the implementation: construct the strictest concrete probe of the
  ACTUAL behavior (read the real output / state / value / attribute / type), including the exact value,
  the negative case, the boundary, and the "switch back / undo / second instance" case where relevant.
- **Idempotency / exactly-once probe — MANDATORY for any cardinality or lifecycle requirement** ("exactly
  once", "no duplicates", add-after-init, remove-then-readd, re-init): trigger the action a SECOND time,
  and where controls can be added/removed do add→remove→re-add, then assert the effect applied EXACTLY
  ONCE — exact final value/state, no doubled output, no duplicate element/listener. A handler bound twice
  PASSES a single-trigger test but fails the grader (text becomes `alphaA` not `alpha`, a node appears
  twice, a listener fires N times). If the second trigger doubles anything, submit `failed`.
- **Termination / concurrency probe — MANDATORY for any recursive, delegating, or concurrent requirement.**
  The grader stress-tests robustness; your happy path does not. If the feature RECURSES, delegates, or
  chains: drive a CYCLE (A→B→A and a deeper A→B→C→A) and a depth bound, and assert it surfaces a BOUNDED
  error (e.g. a message containing "circular") — never a hang or `Maximum call stack size exceeded`. If it
  runs CONCURRENTLY or services parallel requests: fire N invocations at once and assert they CONVERGE to one
  consistent final state with no deadlock/timeout. If a probe hangs, times out, or stack-overflows, the real
  code is broken — submit `failed`.
- If any strict probe does not hold, submit `failed` — the executor gives you a FIX phase. Only submit
  `passed` when the strict probes genuinely hold against the real code, not just your own happy-path test.

### 4d. Completion gate — adversarial requirement sweep

When the executor reports the plan complete, do ONE final pass before treating the work as done (only if
`requirements.md` exists): for EVERY requirement `R1..Rn`, probe the actual built behavior against its
`accept:` criterion with the strictest concrete check (exact value/state/count, negative case, boundary,
reversal). For any requirement about cardinality or lifecycle ("exactly once", "no duplicates",
add-after-init, remove-then-readd), run the idempotency probe from 4c — trigger twice / add→remove→re-add
and confirm the effect applied exactly once (no doubling, no duplicate listener). Any requirement whose
real behavior does not exactly satisfy its `accept:` criterion is NOT done — fix it (re-run the relevant
tests, correct the implementation) before finishing. Do not rely on your own tests having passed; verify
the behavior directly.

### 5. If something goes wrong

- If VERIFY fails → first line `failed`, the executor will give you a FIX phase
- Keep fixing and re-verifying until genuinely `passed` — never fake a `passed` to escape the loop

## Resuming after interruption

The planexecutor saves progress automatically. If interrupted:
1. Run this skill again with the same plan path
2. parsePlan will re-parse (backup old uplan.json)
3. planexecutor will skip already-completed blocks
4. Execution continues from where it left off
