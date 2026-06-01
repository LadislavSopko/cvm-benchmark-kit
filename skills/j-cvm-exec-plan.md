---
description: Parse and execute a TDDAB plan via CVM planexecutor. Autonomous block-by-block execution with RED/GREEN/VERIFY/COMMIT phases. Supports resume after interruption. Use when user says execute plan, esegui piano, run plan CVM.
---

# CVM Execute Plan

Parse a TDDAB or Step plan and execute it using the CVM planexecutor.

## Prerequisites

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

### 1. Get plan path and parse

- If user specified a path → use that
- Otherwise check MB activeContext for plan path
- If still unknown → ask user: "Which plan file should I execute?" and STOP until answered
- **Do NOT search for plan files. Do NOT read the plan file.** The planexecutor provides all context needed per phase. Reading the plan pollutes context and encourages deviation.
- Call `mcp__cvm__parsePlan` with the file path (CVM reads the file internally)
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

### 5. If something goes wrong

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
