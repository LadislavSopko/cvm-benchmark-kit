# CLAUDE.md — CVM Benchmark Kit

## How to Start

**Load and run the CVM benchmark-runner program.** It orchestrates the entire flow automatically.

```
1. mcp__cvm__loadFile → programId: "benchmark-runner", filePath: "benchmark-runner.ts"
2. mcp__cvm__start → programId: "benchmark-runner", executionId: "run-1"
3. Follow the getTask/submitTask loop — the program guides you through each phase
```

The benchmark-runner handles 5 phases: understand → init MB → plan → review → execute. Follow its prompts.

## What the Runner Does

| Phase | What the runner asks you to do |
|-------|-------------------------------|
| 1. UNDERSTAND | Explore the codebase, understand the task |
| 2. INIT MB | Create memory-bank/ with project context |
| 3. PLAN | Load tddab-planner mindset, generate plan.md |
| 4. REVIEW | Review plan against mindset rules (loop until clean) |
| 5. EXECUTE | Use skill /j-cvm-exec-plan on plan.md |

## Debugging

When something fails during execution, use Protocol D (systematic debugging):
1. READ — quote the exact error from logs/output
2. ISOLATE — find precise location (file:line)
3. DOCS — check framework docs if relevant
4. HYPOTHESIZE — state ONE prediction
5. VERIFY — make ONE change and test

Read `skills/mind-sets/debug-protocol.md` for the full methodology.

## Memory Bank Updates

Update `memory-bank/activeContext.md` and `memory-bank/progress.md` after each completed block, BEFORE committing. The commit should include both the code changes and the MB updates.

## Rules

- The mindset files are the ONLY source of truth for methodology — do not invent your own rules
- Never write code without a plan
- Never skip the review step
- One change at a time during debugging
- Update Memory Bank before each commit
