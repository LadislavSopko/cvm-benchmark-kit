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

[CVM_6_PHASES]
1::UNDERSTAND{explore codebase,submit "done"}
2::INIT-MB{create /app/memory-bank,MBEL,submit "done"}
3::ANALYZE-REQUIREMENTS{skill /j-analyze-requirements→requirements.md{R1..Rn exhaustive,hunt checklist,surface inventory},submit "done"}
4::PLAN{skill /tddab-planner→plan.md{RED test per Rk},submit "done"}
5::REVIEW{skill /j-review-plan,loop until "passed";blocking gates: Coverage{all Rk tested+exhaustive+surface coverage}}
6::EXECUTE{skill /j-cvm-exec-plan→true RED→GREEN→adversarial VERIFY→COMMIT per block;completion gate sweeps all Rk}

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

[FAIL_MODES_LEARNED]
§pattern::AgentTestCollision{Go/any lang with test discovery}
  ↳cause{agent declares TestXxx in same pkg as grader→[redeclared in this block]→build failed}
  ↳condition{verifier resets ONLY files in gold test.patch;agent's EXTRA test files survive}
  ↳solution{PREFIX CONVENTION: agent prefixes ALL top-level identifiers (TestZerox_,varZerox_,TypeZerox) in own test files; taught upfront in prompt-template.j2}
  ↳applied{.pier-poc/prompt-template.j2 "TEST SYMBOL NAMESPACING" rule + benchmark-runner.ts phases 3(plan RED tests) & 5(execute reminder)}
  ↳verified{prometheus r3(delete) & r4(prefix) both reward=1; prefix keeps agent tests discoverable (TestZerox_...), scales better than deletion}

§pattern::GoAirGapCache{go.work vs GOWORK=off version mismatch}
  ↳cause{go.work in source caches different grpc-gateway version than verifier's GOWORK=off compile}
  ↳symptom{[setup failed] in verifier; unit tests never run}
  ↳solution{Dockerfile ARG WARM_GO=1 + WARM_GO_PKG/WARM_GO_TAGS: pre-warm go.work at build time for each task, then git checkout go.mod/go.sum→ready for verifier}
  ↳status{CONFIRMED: WARM_GO=1 in prometheus Dockerfile → verifier runs hidden tests, no [setup failed]}

[METHODOLOGY_SUITE]
§pattern::RequirementsCoverageMechanism{exhaustive atomic requirements+surface inventory}
  ↳skill{j-analyze-requirements: decompose instruction.md→numbered list R1..Rn;[behavioral]/[non-behavioral] tag;concrete observable accept: criterion;source clause}
  ↳inventory{hunt checklist: negative/must-not,state-dependent disabled/read-only,restore/reversal,cardinality,exact-shape,lifecycle,targeting + surface-inventory step{enumerate each concrete member a category ranges over;cover EACH esp. members with different mechanics}}
  ↳integrated{benchmark-runner Phase 3 "Analyze requirements"→requirements.md before plan;Phase 5 Review category F "Requirement Coverage" BLOCKING gate{every Rk tested,exhaustive vs instruction,surface coverage of each category member}}
  ↳verified{quill R19 enumerated image/link/video handlers but missed size-picker surface→new inventory step would catch}

§pattern::AcceptDrivenAssertions{concrete observable criteria NOT vague/truthy}
  ↳rule{each accept: and its RED test must assert CONCRETE observable{exact value|attribute count|state|type|string},never vague}
  ↳why{soft criteria→soft tests GREEN while hidden grader enforces stricter rule→test passes pre-impl but fails on grade}
  ↳practice{j-analyze-requirements + tddab-planner require explicit accept criterion;j-cvm-exec-plan enforces true RED{test must FAIL before impl}}
  ↳verified{quill image-input test now asserts exact FileList type,read-only test checks classList.contains('ql-expanded')===false}

§pattern::TrueRedAdversarialVerify{test must fail for right reason before impl;probe actual behavior like grader}
  ↳trueRED{before GREEN impl,make test FAIL and observe the failure reason matches expect;test that passes pre-impl is too weak}
  ↳adversarial{after GREEN impl,probe actual behavior{exact value,negative case,boundary,reversal—not "test passed" acceptance};final completion gate sweeps every requirement vs accept criterion}
  ↳practice{j-cvm-exec-plan enforces true RED flag + "adversarial VERIFY" step + completion gate before done}
  ↳verified{quill r4 image-input fixed by enforcing adversarial test{upload,verify exact type,check attribute match}}

§pattern::ARIAAccessibilitySync{native property+ARIA attribute in sync for state semantic}
  ↳rule{native form controls{input/button/select} use native property{disabled|checked};non-form elements{span|div} convey same state via matching ARIA attribute{aria-disabled,aria-expanded,aria-pressed,aria-selected,aria-hidden}}
  ↳why{W3C WAI-ARIA conformance;hidden grader tests may check both visual + ARIA}
  ↳practice{when task involves HTML UI + requirement about element STATE/SEMANTICS→check both sides;keep in sync}
  ↳context{quill picker: disabled→aria-disabled="true"|absent;expanded→aria-expanded="true"|false;hides picker menu→no aria-hidden needed if display:none}

§pattern::W3CAttributeDefaults{true/false ARIA attributes default to false when absent}
  ↳rule{WAI-ARIA spec: absent boolean attribute ≡ attribute="false";do NOT reject null/missing as wrong}
  ↳practice{asserting aria-disabled: accept both null AND "false",reject only "true";disabled property requires explicit aria-disabled="true"}
  ↳context{quill grader fix: changed .toBe('false')→.not.toBe('true') to accept W3C-conformant solutions that omit aria-disabled}
  ↳status{upstream PR#24 deep-swe fork with W3C evidence;.pier-poc task diverges from stock DeepSWE}

[REPORTING]
make-report.mjs{node,noDeps}::trialDir→report.html | jobDir→index.html+perTrial | jobsRoot→aggregate dashboard{passRate+perTask rollup+variance}
watch-cvm.mjs::live CVM monitor{loadFile/start/getTask[phase]/submitTask,wall-clock+spinner}

[TEAM_TRACKER]
§artifact::deepswe-tasks.md{repoRoot,113 tasks©deepswe.datacurve.ai × 4 runs,markdown table sorted by difficulty(passRate asc)}
@purpose::checklist{which runs executed}+teamDivision{assign each TASK to Owner∈{Domino|Simon|Laco}}
¬scope::reward|trajectory|details→.pier-poc/jobs/index.html{do NOT duplicate here}
@truth::the .md file itself{git-committed;edit directly→commit;no localStorage,no html}
@shape::row::| # | Diff | `taskId` | lang | Owner | R1 | R2 | R3 | R4 |{run cell::"[ ]"|"[x]"}
!rule::afterEachRun→Claude edits matching task row in deepswe-tasks.md{flip "[ ]"→"[x]" for that run}→commit
@assign::Owner column per TASK{¬per run}
©seed::actual .pier-poc/jobs/ on disk{ONLY quill r1+r2 executed=2 jobs;¬progress.md historical claims{jobs deleted,unverifiable}}
