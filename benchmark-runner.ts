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

  console.log("Phase 3: Generate TDDAB plan...");
  CC("Now generate the implementation plan. Follow these steps IN ORDER: " +
    "1. Load the TDDAB planner mindset: use skill /tddab-planner " +
    "2. Read the mindset carefully — it contains ALL the rules for creating plans. " +
    "3. Use your codebase understanding and memory-bank context to generate a TDDAB plan. " +
    "4. Save as plan.md. " +
    "Submit ONLY one word: done.");

  console.log("Phase 4: Review plan...");
  var reviewPassed = false;
  while (!reviewPassed) {
    var rv = CC("Use skill /j-review-plan on plan.md. " +
      "If j-settings.md is missing, default to tddab methodology (mindset skill /tddab-planner). " +
      "If the review finds ANY issue or parsePlan is invalid: fix plan.md directly. " +
      "Do ALL analysis in tool calls, NOT in your reply. " +
      "Submit ONLY one word: passed or failed.");
    var v = rv.toLowerCase();
    reviewPassed = v.startsWith("passed");
    console.log("Review passed: " + reviewPassed);
  }

  console.log("Phase 5: Execute plan via CVM...");
  CC("Use skill /j-cvm-exec-plan on plan.md. Submit ONLY one word: done when execution is complete.");

  console.log("=== Benchmark Runner Complete ===");
}
