---
description: Parse and execute a TDDAB plan via CVM planexecutor. Autonomous block-by-block execution with RED/GREEN/VERIFY/COMMIT phases. Supports resume after interruption. Use when user says execute plan, esegui piano, run plan CVM.
---

# CVM Execute Plan

Parse a TDDAB plan and execute it using the CVM planexecutor.

## Prerequisites

- Read `j-settings.md` from project root (REQUIRED - run `j-setup` if missing)
- If not read this session: Read `.claude/commands/mind-sets/junior.md`
- Read (if not already done) MB skip all subdirs
- **Load language mindset** based on `@language` in j-settings.md:
  - `csharp` → based on `@csharp-mindset`: `net10` → `mind-sets/csharp-senior_10.md`, `legacy` → `mind-sets/csharp-senior.md`, missing → default to `net10`
  - `typescript` → `mind-sets/typescript-senior.md`
  - `java` → `mind-sets/java-senior.md`
  - `kotlin` → `mind-sets/kmp-senior.md`
  - `python` → `mind-sets/python-senior.md`
  - `go` → `mind-sets/go-senior.md`
  - `rust` → `mind-sets/rust-senior.md`
  - `php` → `mind-sets/php-senior.md`
  - `swift` → `mind-sets/swift-senior.md`
  - `dart` → `mind-sets/dart-senior.md`
  - `perl` → `mind-sets/perl-senior.md`
  - other → skip (junior.md is sufficient)
- **Load TDDAB overlay** if `@tddab-lang-overlay` in j-settings.md points to one (e.g., `mind-sets/csharp-tddab-overlay.md`)
- **Code navigation** — check `@code-nav-local` in j-settings.md:
  - `lsai` → use `mcp__lsai__*` tools (search, info, usages, callers) instead of grep/glob
  - `vs-mcp` → use `mcp__vs-mcp__*` tools (FindSymbols, FindSymbolUsages, GetDocumentOutline)
  - `grep` or missing → use grep/glob/find
  - When spawning agents, pass the same instruction so they use MCP tools too
- **CVM MCP server must be available** — check if `mcp__cvm__parsePlan` tool exists.
  If NOT available → tell user:
  ```
  CVM MCP server not configured. Run /j-mcp-setup and add CVM, or add manually to .mcp.json:
  {
    "mcpServers": {
      "cvm": {
        "command": "npx",
        "args": ["cvm-server@latest"],
        "env": { "CVM_STORAGE_TYPE": "file", "CVM_DATA_DIR": ".cvm", "CVM_SANDBOX_ROOT": "." }
      }
    }
  }
  ```
  STOP.

## What to do

### 1. Parse the plan

- Find `index.md` (multi-file plan) or `plan.md` (single-file) in current directory (or user-specified path). Prefer `index.md` if both exist.
- Call `mcp__cvm__parsePlan` with the file path
- If invalid → show errors and STOP
- If valid → continue

### 2. Check progress

- Read `.cvm/uplan-progress.json` if it exists
- If blocks are already completed, inform user: "Resuming: N blocks already done, will skip them"
- If user wants to restart from scratch: delete `.cvm/uplan-progress.json` first

### 3. Load and start planexecutor

```
mcp__cvm__loadFile → programId: "planexecutor", filePath: "@planexecutor"
mcp__cvm__start    → programId: "planexecutor", executionId: "run-<timestamp>"
```

### 4. Execute the loop

Call `mcp__cvm__getTask` to get the next prompt. The planexecutor orchestrates phases:

| Phase | What YOU must do | Respond with |
|-------|-----------------|--------------|
| MISSION BRIEFING | Read the project context, prepare yourself | `done` |
| RED PHASE | Write ONLY the failing tests described in the prompt | `done` |
| GREEN PHASE | Implement minimum code to make tests pass | `done` |
| VERIFY PHASE | Run tests + typecheck + verify ALL success criteria | `passed` or `failed` |
| FIX PHASE | Debug and fix the failing tests/criteria | `done` |
| RE-VERIFY | Run tests again after fix | `passed` or `failed` |
| COMMIT PHASE | `git add` + `git commit` with the message from the prompt | `done` |
| FINAL REVIEW | Run full test suite, confirm no regressions | `done` |

Call `mcp__cvm__submitTask` with the appropriate response.

Repeat until `getTask` returns "Execution completed".

### 5. Important rules for each phase

**RED PHASE:**
- Write ONLY tests, NO production code
- Tests MUST fail (they test unwritten code)
- Use the test descriptions from the prompt
- Use the build/test commands from j-settings.md (`@test-backend`, `@test-frontend`)

**GREEN PHASE:**
- Write minimum implementation to make tests pass
- Use the context and planRef from the prompt
- Follow the language mindset rules loaded in Prerequisites
- DO NOT refactor or add extras

**VERIFY PHASE (CRITICAL — no shortcuts):**
- Actually run: build, typecheck, tests (use commands from j-settings.md)
- For EACH success criterion: use code navigation tools (LSAI, vs-mcp, xmp4) or read the actual file to confirm it exists
- Output a checklist BEFORE responding:
  - `[x]` criterion — file:line evidence
  - `[ ]` criterion — WHAT is missing
- Count: X/Y criteria met
- Reply `passed` ONLY if X equals Y (ALL criteria met)
- Reply `failed` if ANY criterion is `[ ]`
- **NEVER respond `passed` without showing the full checklist with evidence**
- If something fails, use Protocol D (RIDHV) for systematic debugging

**COMMIT PHASE:**
- Stage relevant files (not unrelated changes)
- Use the commit message suggested in the prompt
- Push if instructed

### 6. If something goes wrong

- If VERIFY fails → respond `failed`, the executor will give you a FIX phase
- If you're stuck and can't fix → tell the user, they may need to modify the plan
- If the executor hits an error → report to user

## Resuming after interruption

The planexecutor saves progress automatically. If you were interrupted:
1. Just run this command again
2. parsePlan will re-parse (backup old uplan.json)
3. planexecutor will skip already-completed blocks
4. Execution continues from where it left off

## Resetting (start over)

If user wants to redo everything from scratch:
```bash
rm .cvm/uplan-progress.json
```
Then run this command again.
