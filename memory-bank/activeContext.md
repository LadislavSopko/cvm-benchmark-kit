§MBEL:5.0

[FOCUS]
@initialized::thisProjectMB{harness}←©User{separate from kit sandbox-MB}
⚡documented::ADD+RUN+REBUILD process{techContext}←©User priority

[RECENT]
>refactor::removed cvm-mcp wrapper→cvm-server direct + ENV{CVM_SANDBOX_PATHS}
>switched::cvm-server local-tgz→npm@1.1.0
>added::.pier-poc/build.sh{kit gen} + make-report.mjs + watch-cvm.mjs + run-poc.ps1{-Tasks,-JobName}
>removed::.pier-poc/build/kit from git{gitignored,generated}
>added::.ai-agent submodule{github LadislavSopko/ai-agent}→.ai-agent
>verified::fastapi-run2{new image:cvm-server@npm+SANDBOX_PATHS}→reward1✓{Phase1 reads instruction.md,config works}

[DECISIONS]
@thisMB::memory-bank/{repoRoot,per CLAUDE.md}::aboutHarness ONLY
!¬mix::kitSandboxMB{agent runtime,perTask,built into image}≠thisMB
(note::build.sh copies whole memory-bank/ into kit→only README.md reaches sandbox;could trim build.sh to README-only if cleaner)

[NEXT]
?A/B::bareModel↔CVMkit{isolate kit contribution,same model/env}
?expandSample::more trials/tasks{credible passRate,variance}
?stagedGit::build/kit removal + .gitignore + .ai-agent submodule{commit when user says}
