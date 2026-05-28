# CLAUDE.md — CVM Benchmark Kit

## Purpose

This kit configures Claude Code to solve coding tasks using structured TDDAB methodology + CVM execution. Instead of writing code directly, Claude follows a disciplined flow: understand → plan → review → execute.

## Mandatory Flow

For EVERY task, follow these steps IN ORDER. Never skip steps. Never write code without a plan.

### 1. UNDERSTAND
- Read the task description (instruction.md) carefully
- Explore the codebase: file structure, existing tests, dependencies, build system
- Identify the language, framework, test runner, and conventions used

### 2. INIT MEMORY BANK
- Read `memory-bank/README.md` to understand the MBEL format
- Create these files in `memory-bank/`:
  - `productContext.md` — what this project does, its purpose
  - `techContext.md` — language, framework, build commands, test commands, dependencies
  - `activeContext.md` — current task focus, what needs to be done
  - `progress.md` — empty (will be updated during execution)

### 3. PLAN
- Read `skills/mind-sets/tddab-planner.md` completely — these are the rules for generating plans
- Generate a TDDAB plan from the task description following ALL rules in the mindset
- Save as `plan.md` in the working directory
- The plan must have: `<mission>`, `<block>`, `<intro>`, `<red>`, `<success>` tags
- If the task is removal/migration/cleanup: read `skills/mind-sets/step-planner.md` and use `<actions>` instead of `<red>`

### 4. REVIEW
- Read the mindset file again (tddab-planner.md or step-planner.md)
- Review the plan against ALL rules in the mindset
- Focus on: block dependencies (no block uses types from future blocks), self-sufficiency, completeness
- If ANY issue found → fix the plan and review again
- Loop until the plan is clean

### 5. EXECUTE
- Use skill `/j-cvm-exec-plan` on plan.md
- This parses the plan via CVM, loads the planexecutor, and runs the getTask/submitTask loop
- Follow each phase: RED → GREEN → VERIFY → COMMIT (TDDAB) or EXECUTE → VERIFY → COMMIT (step)

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
