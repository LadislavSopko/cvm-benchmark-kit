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

Call `mcp__cvm__getTask` to get the next prompt. The planexecutor orchestrates all phases and provides self-sufficient prompts — follow what each prompt says.

Call `mcp__cvm__submitTask` with the response requested by the prompt.

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
