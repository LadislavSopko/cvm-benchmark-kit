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
    "2. Explore the codebase: file structure, existing code, tests, build system. " +
    "3. Identify the language, framework, test runner, and key patterns used. " +
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
    "5. Save as plan.md. " +
    "When the plan names RED tests/helpers, give every test-declared top-level identifier the 'zerox_' " +
    "prefix (test entry points as TestZerox_...) so they cannot collide with the grader's hidden tests in " +
    "the same package. " +
    "Submit ONLY one word: done.");

  console.log("Phase 5: Review plan...");
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

  console.log("Phase 6: Execute plan via CVM...");
  CC("Use skill /j-cvm-exec-plan on plan.md. " +
    "REMEMBER (test symbol namespacing): every test you write must prefix ALL top-level identifiers you " +
    "declare with 'zerox_' (helper types/functions, package-level vars/consts), and test entry points as " +
    "TestZerox_... — the grader's hidden tests compile in the same package and identical names break the " +
    "build. Apply it from the first test, not as an afterthought. " +
    "Submit ONLY one word: done when execution is complete.");

  console.log("=== Benchmark Runner Complete ===");
}
