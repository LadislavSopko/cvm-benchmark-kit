§MBEL:5.0

[FOCUS]
@initialized::thisProjectMB{harness}←©User{separate from kit sandbox-MB}
@currentTask::prometheus-transactional-reload-status{go,WARM_GO}rerun on Linux/WSL2→reward=1✓
@hostMigration::harness now runs on Linux/WSL2{prev Windows-only}←©User

[RECENT]
>LINUX HARNESS PROVEN@2026-06-06::prometheus reward=1 on WSL2{pier 0.2.0 via uv tool,no pwsh→`pier run -c config-prometheus.yaml --debug` direct,image WARM_GO built,.env token via claude setup-token}→first non-Windows run✓
>METHODOLOGY SUITE DEPLOYED::requirements→accept→trueRED→adversarial VERIFY applied{quill task validation}
>REQUIREMENTS COVERAGE INFRA::j-analyze-requirements skill + Phase 3 "Analyze requirements" + review gate F{all Rk tested}
>TS/PLAYWRIGHT AIR-GAP::prebuilt base images complete{node_modules+chromium cached};only Go needs WARM_GO
>ARIA ACCESSIBILITY RULE::native form controls use native property;non-form elements use matching ARIA attribute{sync visual+semantic}
>W3C GRADER FIX + UPSTREAM PR::quill picker aria-disabled tolerance{null≡'false'};opened Draft PR#24 deep-swe fork
>QUILL RESULTS 7 TRIALS::r7 best 14/15 pass{image input+read-only restore fixed};each trial misses different 1 req{variance not fixable}
>AGGREGATE BEFORE QUILL::3/5 complete{fastapi-run2✅,prometheus✅r3r4,cliffy✅3/4}+tooling+multi-trial validated

[DECISIONS]
@thisMB::memory-bank/{repoRoot,per CLAUDE.md}::aboutHarness ONLY
!¬mix::kitSandboxMB{agent runtime,perTask,built into image}≠thisMB
(note::build.sh copies whole memory-bank/ into kit→only README.md reaches sandbox;could trim build.sh to README-only if cleaner)

[BLOCKERS]
⚠{socket-flake}::NonZeroAgentExitCodeError mid-EXECUTE{turn 267/400,"socket connection closed unexpectedly"}→pier retry=0 restarts turn 0,NO mid-trial resume{custom in-container --resume wrapper not implemented}
⚠{variance}::model+env variance ceiling at ~14/15✓per clean run;different 1 req fails each trial{need multi-task+multi-trial measurement,not single→green}
⚠{graderDrift}::quill W3C fix in .pier-poc diverges from stock DeepSWE(upstream PR pending)→affects benchmark comparability

[NEXT]
→expand::multi-task sample{credible pass@k measurement,not single-task variance chase}
→measure::multi-trial per task{3+ runs per task for reliable baselines}
?A/B::bareModel↔CVMkit{isolate kit contribution}
