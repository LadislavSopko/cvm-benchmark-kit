---
name: j-cvm-check-plan
description: Validate a TDDAB plan file using CVM parsePlan. Shows block count, IDs, validation errors.
---

# CVM Check Plan

Validate a TDDAB plan file using the CVM `parsePlan` tool.

## Prerequisites

Check if `mcp__cvm__parsePlan` tool is available.
If NOT available → STOP with error: "CVM MCP server not available. Cannot validate plan."

## What to do

1. Get the plan file path:
   - If a path was provided, use that
   - Otherwise look for `index.md` or `plan.md` in current directory (prefer `index.md`)
   - If not found → STOP with error: "Plan file not found in current directory."

2. Call `mcp__cvm__parsePlan` with the plan file path

3. Report the result:
   - If valid: show block count, block IDs, and path to generated uplan.json
   - If invalid: show all validation errors with line numbers

4. If `.cvm/uplan-progress.json` exists, also report which blocks are already completed

## Example output (valid)

```
Plan OK ✓

Blocks: 3
  01-greet    (lines 20-45)
  02-farewell (lines 47-72)
  03-summary  (lines 74-95)

Saved: .cvm/uplan.json

Progress: 1/3 completed (01-greet done)
```

## Example output (invalid)

```
Plan INVALID ✗

Errors:
  line 0: Missing <mission> tag
  line 15: Block "01-test" missing <red> tag
```

## Notes
- parsePlan overwrites .cvm/uplan.json every time (backs up to .bak)
- Use this to validate before executing
- Progress file is NOT affected by this command
