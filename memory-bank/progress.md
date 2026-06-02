§MBEL:5.0

[PROGRESS]
@phase::tooling+multiTaskRuns{validated end-to-end}

[RESULTS::CVMkit]
fastapi-implicit-head-options{py}::run1✓1 + run2✓1{new image cvm-server@npm+SANDBOX_PATHS}
prometheus-transactional-reload-status{go}::✗0{realBug::reloader_timings_ms float↔int64 expected}+harnessFix{Go warm-up GOWORK=off}
cliffy-config-file-parsing{ts/deno}::run1✓ run2✗ run3✓ run4✓ → 3/4≈75%{run2 fail::missing export ConfigParseError/ConfigValidationError from mod.ts}
@aggregate::5/7{after fastapi-run2;variance real,small sample}

[TOOLING::done]
✓run-poc.ps1{-Tasks,-JobName,-Config,model override}
✓build.sh{regen build/kit/ from sources}
✓Dockerfile{ARG BASE_IMAGE+WARM_GO,cvm-server@npm,ENV CVM_*}
✓make-report.mjs{trial|job|aggregate,full untruncated outputs}
✓watch-cvm.mjs{live CVM monitor,wall-clock HH:MM:SS+spinner}
✓reverifyOffline{reference solution→reward not false-neg}

[KEY_LEARNINGS]
!recurringFailMode::exactPublicSurface{field type | missing export}¬coreLogic
!variance::need multiple trials/task{1 run unreliable}
!harness vs leaderboard::¬comparable{kit+model+env differ from DeepSWE mini-swe-agent/Modal}
!provisioning::Go go.work warm-up needed;Deno/python images complete as-is
