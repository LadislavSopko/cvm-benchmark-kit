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

### 5. If something goes wrong

- If VERIFY fails → respond `failed`, the executor will give you a FIX phase
- If stuck after multiple fix attempts → report error and STOP

## Resuming after interruption

The planexecutor saves progress automatically. If interrupted:
1. Run this skill again with the same plan path
2. parsePlan will re-parse (backup old uplan.json)
3. planexecutor will skip already-completed blocks
4. Execution continues from where it left off
