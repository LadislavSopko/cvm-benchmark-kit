---
name: step-planner
description: Step plan format for removal, migration, and cleanup work (non-TDD). Uses actions tag instead of red.
---
# Step Planner Mindset

## What is a Step Plan?
A **Step Plan** is for sequential operations that don't follow test-first methodology:
- **Removal**: retiring legacy code, deleting unused features
- **Migration**: moving data, changing schemas, switching providers
- **Cleanup**: refactoring config, removing dead dependencies
- **Infrastructure**: environment changes, deploy procedures

### Difference from TDDAB
```
TDDAB: Write tests FIRST → implement → verify tests pass
Step:  Execute action → verify nothing broke → commit
```

Use TDDAB when building new functionality. Use Step Plan when the work is removing, moving, or reconfiguring — there are no new tests to write.

---

## Step Plan Format

### Required Tags

| Tag | Where | Purpose |
|-----|-------|---------|
| `<mission>` | Once, top of plan | Full project context (type auto-detected from blocks) |
| `<block id="NN-name">` | Wraps each step | Step boundary with unique id |
| `<intro>` | Inside block | Context: what, why, dependencies, preconditions |
| `<actions>` | Inside block | List of actions to execute (replaces `<red>` from TDDAB) |
| `<success>` | Inside block | Checklist of verifiable outcomes that must ALL pass |

### Plan Template

```markdown
# Step Plan: [Feature Name]
**Date:** YYYY-MM-DD

<mission>
[Full project context — architecture, tech stack, what is being removed/migrated,
what must remain working, test command to verify stability.
Must contain enough information that ANY block can be executed on clean context.
Plan type (tddab or step) is auto-detected from blocks: all "- action:" → step.]
</mission>

<block id="01-short-name">
## Step 1: [Block Title]

<intro>
[What this step does. Preconditions (which steps must complete first).
Why this order matters. Files/dirs affected.]
</intro>

<actions>
- action: [first action to perform]
- action: [second action]
- action: [third action]
</actions>

<success>
- [ ] [verifiable outcome — e.g., test suite passes]
- [ ] [verifiable outcome — e.g., no references remain]
</success>
</block>
```

### Tag Rules
1. `<mission>` — EXACTLY once, plain tag (no attributes). Plan type is auto-detected: all `- action:` blocks → step
2. `<block id="">` — id format: `NN-kebab-case`, must be unique across ALL files
3. `<intro>` — MUST include preconditions if the step depends on prior steps
4. `<actions>` — each line starts with `- action:`, describes ONE concrete action. Can be file removal, config edit, command execution, etc.
5. `<success>` — checklist of verifiable outcomes (`- [ ]` format), ALL must pass
6. `<files>` — ONLY in index.md for multi-file plans (same as TDDAB)
7. Tags can span multiple lines
8. No nesting tags inside other tags (except all tags are inside `<block>`)
9. Standard markdown between tags is preserved for human reading
10. **Never write raw TDDAB/step tag names with angle brackets inside any tag content.** Use backtick form or plain text when referencing tags in prose.

---

## Step Planning Rules

### 1. Information Self-Sufficiency
Same as TDDAB — each block must be understandable with ZERO context:
- Show FULL file paths
- Include exact commands to run
- Never reference "previous discussion"
- `<mission>` must contain the test/verification command

### 2. Action Clarity
Each `- action:` line must be a concrete, executable instruction:

```
CORRECT:
- action: Remove directory src/neo_cortex/stores/ entirely
- action: Delete chromadb, networkx from [project.dependencies] in pyproject.toml
- action: Run uv sync to rebuild lockfile

WRONG:
- action: Clean up old stuff
- action: Fix the config
- action: Remove things that aren't needed
```

### 3. Verification Strategy
Every block needs at least one verification. Common patterns:

```
For code removal:
- [ ] pytest tests/ -x → N tests pass (same count as before)
- [ ] grep -r "removed_module" src/ → 0 matches

For config changes:
- [ ] application starts without errors
- [ ] no references to old config values remain

For dependency removal:
- [ ] uv sync completes without errors
- [ ] removed packages not in lockfile
```

### 4. Atomic Steps
Each step must be:
- **Safe to commit** — system works after this step
- **Rollback-able** — can revert with `git revert HEAD`
- **Ordered** — preconditions stated in `<intro>`
- **Verified** — has success criteria that prove it worked

### 5. No Mixing
A plan is EITHER tddab (`- test:`) OR step (`- action:`), never both. The parser rejects mixed plans.

---

## Step Size Guidelines

### Ideal Step Size:
- **Actions**: 1-5 related actions per block
- **Scope**: single concern (one package, one config file, one dependency group)
- **Verification**: same test suite runs after each step

### Too Large (Split It):
- Removes unrelated things in one step
- If step fails, unclear which action caused it
- Cannot rollback cleanly

### Too Small (Merge It):
- Single file deletion with no verification needed
- Config line removal that has no impact alone

---

## CVM Integration

This plan format is parsed by CVM with `type: "step"` in uplan.json:
- `<mission>` → provides context (type auto-detected from blocks)
- `<block>` → task array entry
- `<intro>` + `<actions>` → prompt for EXECUTE phase
- `<success>` → prompt for VERIFY phase
- `<files>` → multi-file mode (same as TDDAB)

### CVM Execution Flow (Step)
```
For each block:
  1. EXECUTE → Claude performs the actions from <actions>
  2. VERIFY  → Claude checks all <success> criteria
  3. FIX     → (only if VERIFY fails) debug and fix
  4. COMMIT  → atomic checkpoint
```

No RED/GREEN phases — actions are executed directly.

---

## GOLDEN RULES OF STEP PLANS

1. **If actions are vague** → STOP, make them concrete
2. **If no verification** → STOP, add success criteria
3. **If mixing test-first with actions** → STOP, split into two plans
4. **If step depends on another** → state it in `<intro>` as precondition
5. **If not atomic** → STOP, split the step
