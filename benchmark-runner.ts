/// <reference no-default-lib="true"/>
declare function CC(prompt: string): string;
declare var fs: any;

function main() {
  var task = fs.readFile("instruction.md");
  if (task === null) {
    console.log("ERROR: Cannot read instruction.md");
    return;
  }

  console.log("=== CVM Benchmark Runner ===");
  console.log("Task loaded: " + task.length + " chars");

  console.log("Phase 1: Understand the codebase...");
  CC("You have a coding task to solve. Before anything else, UNDERSTAND the project: " +
    "1. Read the task description below to know WHAT is needed. " +
    "2. Explore the codebase: file structure, existing code, tests, build system, test runner. " +
    "3. CONFIRM, NEVER ASSUME: for every type, field/JSON key, function signature, error type, and the " +
    "field/channel a value travels on that your change will touch, READ the exact line in the existing code " +
    "that defines or consumes it — the existing sibling method this one parallels, the handlers/providers " +
    "that consume the value (e.g. how an existing call reads conversation history), the serialized struct " +
    "and its real types (a *_ms/*_count field is the integer type the code uses, never a guessed float). " +
    "These exact facts are the contract; in requirements and plan you will pin ONLY what " +
    "you read here — a type, field, or channel you did not read is forbidden. " +
    "4. HARVEST: for the PRIMARY new public member, OPEN its same-name sibling in the code (e.g. `execute` for " +
    "`execute_incremental`) and READ its full parameter signature, AND read the existing tests for the area " +
    "(cross-cutting dirs like tests/custom_scalars/, error-path, concurrency). Note each sibling parameter " +
    "(parse_result, serialize_variables, ...) and each existing test scenario — these become requirements " +
    "you must replicate, NOT invent softer versions of. This is what surfaces parse_result-style implicit " +
    "requirements at analysis time. " +
    "TASK: " + task + " " +
    "Do all exploration in tool calls. Submit ONLY one word: done.");

  console.log("Phase 2: Initialize Memory Bank...");
  CC("Create a memory-bank/ directory and initialize it with project context from your exploration: " +
    "1. memory-bank/productContext.md — what this project does, its purpose " +
    "2. memory-bank/techContext.md — language, framework, build commands, test commands, dependencies " +
    "3. memory-bank/activeContext.md — current task context and what needs to be done " +
    "4. memory-bank/progress.md — empty for now, will track block progress " +
    "Use MBEL v5.0 format if memory-bank/README.md exists, otherwise use plain text. " +
    "Submit ONLY one word: done.");

  console.log("Phase 3: Analyze requirements...");
  CC("Before planning, exhaustively analyze WHAT the task requires — this is the gate against " +
    "all-or-nothing near-misses where one missed requirement fails the whole task. " +
    "1. Load the requirements analyst mindset: use skill /j-analyze-requirements " +
    "2. Follow it to decompose instruction.md into an exhaustive numbered list of atomic, " +
    "independently-testable requirements (R1..Rn). Split compound sentences and surface buried secondary " +
    "clauses (negative 'must not', disabled/read-only states, restore-on-switch-back, 'exactly once', " +
    "'no duplicates', exact response shapes). " +
    "3. Save as requirements.md. " +
    "Submit ONLY one word: done.");

  console.log("Phase 4: Generate TDDAB plan...");
  CC("Now generate the implementation plan. Follow these steps IN ORDER: " +
    "1. Load the TDDAB planner mindset: use skill /tddab-planner " +
    "2. Read the mindset carefully — it contains ALL the rules for creating plans. " +
    "3. Use your codebase understanding, memory-bank context, AND requirements.md to generate a TDDAB plan. " +
    "4. Cover EVERY requirement R1..Rn from requirements.md with at least one RED test, and annotate each " +
    "test with the requirement id(s) it covers. " +
    "5. End the plan with a MANDATORY final integration block (id NN-integration) whose RED tests drive each " +
    "behavioral requirement through the REAL public surface as an external consumer (NO mocks), porting the " +
    "realistic scenarios harvested in Phase 1 (full option/config matrix, custom scalars, error paths, " +
    "concurrency/termination) — every behavioral R must also be covered here, not only by unit blocks. " +
    "6. Save as plan.md. " +
    "When the plan names RED tests/helpers, give every test-declared top-level identifier the 'zerox_' " +
    "prefix (test entry points as TestZerox_...) so they cannot collide with the grader's hidden tests in " +
    "the same package. ALSO name every test FILE 'zerox_<name>_test.go' (NOT a grader-like name such as " +
    "transactional_reload_test.go): the verifier resets/replaces any test file whose name matches a hidden " +
    "grader file, deleting your version and orphaning helpers used in your other files -> build fails. Keep " +
    "each helper in the SAME file as its uses. " +
    "Submit ONLY one word: done.");

  console.log("Phase 5: Coverage cross-check (deep, bidirectional)...");
  CC("Before reviewing, do a DEEP bidirectional coverage cross-check of plan.md against requirements.md " +
    "AND against the codebase reality. " +
    "1. Load the cross-check mindset: use skill /j-coverage-crosscheck " +
    "2. Build the TEST INVENTORY (every <red> test across all blocks). " +
    "3. FORWARD matrix: every R1..Rn has a test that would FAIL if the behavior were absent (not nominal). " +
    "4. REVERSE matrix (the decisive one): for EVERY new public member, open its existing namesake/sibling " +
    "in the code (e.g. execute -> execute_incremental) and enumerate its FULL surface — every parameter, " +
    "option, default-from-client (parse_results, serialize_variables, ...), cross-cutting behavior — and for " +
    "EACH confirm there is an R + test, else it is a MISSING requirement: add the R to requirements.md and a " +
    "RED test to plan.md NOW. Do the same for each existing harvested test (e.g. tests/custom_scalars/). " +
    "5. Save coverage.md and FIX requirements.md/plan.md until both matrices have zero gaps. " +
    "Submit ONLY one word: done.");

  console.log("Phase 6: Review plan...");
  var reviewPassed = false;
  while (!reviewPassed) {
    var rv = CC("Use skill /j-review-plan on plan.md. " +
      "If j-settings.md is missing, default to tddab methodology (mindset skill /tddab-planner). " +
      "MUST apply category F (Requirement Coverage): verify requirements.md is exhaustive vs instruction.md " +
      "AND every requirement R1..Rn maps to at least one RED test in plan.md — any uncovered requirement or " +
      "unmapped instruction clause is a BLOCKING gap. " +
      "If the review finds ANY issue or parsePlan is invalid: fix plan.md (and requirements.md if a clause " +
      "was missed) directly. " +
      "Do ALL analysis in tool calls, NOT in your reply. " +
      "Submit ONLY one word: passed or failed.");
    var v = rv.toLowerCase();
    reviewPassed = v.startsWith("passed");
    console.log("Review passed: " + reviewPassed);
  }

  console.log("Phase 7: Execute plan via CVM...");
  CC("Use skill /j-cvm-exec-plan on plan.md. " +
    "REMEMBER (test namespacing): every test you write must prefix ALL top-level identifiers you " +
    "declare with 'zerox_' (helper types/functions, package-level vars/consts), and test entry points as " +
    "TestZerox_... — the grader's hidden tests compile in the same package and identical names break the " +
    "build. AND name every test FILE 'zerox_<name>_test.go' — never a grader-like name; the verifier deletes/" +
    "replaces files whose name matches a hidden grader file, orphaning helpers used elsewhere -> build fails. " +
    "Keep each helper in the SAME file as its uses. Apply it from the first test, not as an afterthought. " +
    "Submit ONLY one word: done when execution is complete.");

  console.log("=== Benchmark Runner Complete ===");
}
