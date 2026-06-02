§MBEL:5.0

[ARCHITECTURE]
@flow::run-poc.ps1→pierRun→airGappedSandbox{customImage}→claudeCodeAgent→bootstrap→CVMrunner{5ph}→verifier→reward.txt

[RUN_FLOW]
run-poc.ps1{load .env,clear ANTHROPIC_API_KEY,optional PIER_MODEL,build temp config}
→pier{sandbox←task.toml docker_image,allow_internet:false,egress:api.anthropic.com only}
→claude-code{--print,--permission-mode=bypassPermissions,--max-turns 400,prompt_template_path}
→bootstrap(prompt-template.j2){cp kit→/app,write instruction.md,.git/info/exclude{kit+.cvm+plan.md},start CVM}
→CVMrunner(benchmark-runner.ts){getTask/submitTask loop}
→verifier(tests/test.sh){Step0 capture model.patch,Step1 reset test-patch files,Step2 apply test.patch,Step3 base,Step4 new}
→reward::1 ⟺ baseExit0 & newExit0

[CVM_5_PHASES]
1::UNDERSTAND{explore codebase,submit "done"}
2::INIT-MB{create /app/memory-bank,MBEL,submit "done"}
3::PLAN{skill /tddab-planner→plan.md,submit "done"}
4::REVIEW{skill /j-review-plan,loop until "passed",fix plan.md directly}
5::EXECUTE{skill /j-cvm-exec-plan→RED→GREEN→VERIFY→COMMIT per block}

[KIT_SOURCES→PRODUCT]
sources{repoRoot}::CLAUDE.md+benchmark-runner.ts+j-settings.md+.mcp.json+memory-bank/{templateREADME}+skills-cc/
→.pier-poc/build.sh→.pier-poc/build/kit/{gitignored,GENERATED,¬handEdit}→Dockerfile COPY kit→/opt/cvm-kit
@skills_dir::/opt/cvm-kit/skills-cc(task.toml)
!note::build.sh copies WHOLE memory-bank/→but bootstrap only cp README.md→/app(grammar template);agent creates own MB

[PER_TASK_IMAGE]
!eachTask::distinctRepo+commit+lang→DeepSWE ships 1 prebuilt image per ext_id→customImage perTask unavoidable
customImage::FROM taskPrebuilt+node{mars-base has v24}+cvm-server@npm+CVM env{ENV}+kit
selection↔pureConfig(run-poc.ps1 -Tasks){imageBuild::oneTime perTask,¬perSelection}

[VERIFIER]
runsInSameContainer asAgent{environment.exec}→airGapped→allDeps mustBeCachedInImage
(Go{go.work}::workspace caches diff grpc-gateway version than GOWORK=off verifier→[setup failed] unless warmed)
reverifyOffline::apply model.patch|reference solution+test.patch,--network none→trust reward

[REPORTING]
make-report.mjs{node,noDeps}::trialDir→report.html | jobDir→index.html+perTrial | jobsRoot→aggregate dashboard{passRate+perTask rollup+variance}
watch-cvm.mjs::live CVM monitor{loadFile/start/getTask[phase]/submitTask,wall-clock+spinner}
