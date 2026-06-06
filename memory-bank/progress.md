§MBEL:5.0

[PROGRESS]
@phase::methodology-suite deployment + multi-task validation + browser task

[RESULTS::CVMkit]
fastapi-implicit-head-options{py}::run1✓1 + run2✓1{cvm-server@npm+SANDBOX_PATHS}
prometheus-transactional-reload-status{go}::r2✗0,r3✓1{delete},r4✓1{prefix zerox_}+WARM_GO → 2/3✓
  +LinuxR1✓1{VERIFIED on disk@2026-06-06:reward=1,baseline ok 74.6s+hidden ok 4.2s,WARM_GO→no setup-failed,zerox_ prefix→no collision;firstLinux/WSL2 run}
cliffy-config-file-parsing{ts/deno}::run1✓ run2✗ run3✓ run4✓ → 3/4≈75%
→aggregate pre-quill::3/5 complete
quill-shared-toolbar-focus{ts/vitest/playwright}::7 trials{r1=6fail,r2=2fail,r3=4fail,r4=2fail,r5=3fail,r6=TRUNCATED{529x7},r7=1fail clean verdict}
  r7best::14/15✓{image-input+read-only-restore fixed via accept-driven+trueRED+adversarial};1fail=size-picker surface miss
  @conclusion::each methodology improvement verified on target{prefix→no collision,requirements→read-only captured,accept/trueRED/adversarial→image fixed,ARIA+W3C→semantics};but hits variance ceiling at 14/15✓per run
  @pattern::different requirement fails each clean trial{variance not fixable via solution quality;need multi-task+multi-trial measurement}

[TODO_TASKS::revisit]
!claude-code-by-agents-recursive-delegation{ts}::FAIL@2026-06-06{official 5%,#110 hardest tier}→DO_LATER
  bug{PROVEN by hand}::agent feeds tool_result via request.MESSAGE;grader reads it from request.CONTEXT{findToolResultInContext(continuationCall.context)}→null→5/7 fail
  fix{PROVEN}::patch message→context{push {role:user,content:feedbackJSON} into providerRequest.context}→7/7 pass
  why::base handler executeSingleAgent builds providerRequest={message,...} NO context anywhere;instruction says "follow existing handler patterns"→agent followed→message. provider anthropic.ts DOES read request.context for history→context is protocol-correct channel but handler never populates it
  verdict::gold/test CORRECT(protocol:tool_result∈conversation=context)¬PR-on-test;instruction MISLEADING("follow patterns"→message);self-referential TDDAB trap{agent tests own wrong assumption→green}
  noUpstream::baryhuang repo restructured to Swift OpenAgents;feature never merged;only DeepSWE gold(context) as ref

[SKILLS::extended]
✓j-analyze-requirements{Phase 3:decompose→R1..Rn exhaustive + hunt checklist + surface inventory}
✓benchmark-runner.ts{6 phases: Understand→MB→AnalyzeRequirements→Plan→Review{+F gate}→Execute}
✓tddab-planner+j-review-plan{extended with coverage+accept-strictness+surface-coverage rules}
✓j-cvm-exec-plan{enforces true RED + adversarial VERIFY + completion gate per requirement}

[TOOLING::done]
✓run-poc.ps1{-Tasks,-JobName,-Config,model override}
✓build.sh{regen build/kit/ from sources}
✓Dockerfile{ARG BASE_IMAGE+WARM_GO,cvm-server@npm,ENV CVM_*}
✓make-report.mjs{trial|job|aggregate,full untruncated outputs}
✓watch-cvm.mjs{live CVM monitor,wall-clock HH:MM:SS+spinner}
✓reverifyOffline{reference solution→reward not false-neg}

[KEY_LEARNINGS]
!recurringFailMode::exactPublicSurface{field type | missing export}¬coreLogic
!variance::model+env variance ceiling~14/15✓;different req fails per trial{need multi-task measurement,not single→green chase}
!provisioning::Go needs WARM_GO;TS/playwright air-gap complete{prebuilt base has node_modules+chromium};python needs no warm-up
!harness vs leaderboard::¬comparable{kit+model+env differ from DeepSWE}
!graderDrift::W3C fix in .pier-poc/quill diverges stock DeepSWE{upstream PR pending→affects benchmark}
