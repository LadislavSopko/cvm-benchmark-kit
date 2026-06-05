§MBEL:5.0

[PROJECT]
@name::cvm-benchmark-kit{harness}
@purpose::RunDeepSWEbenchmark{via:pier+CVM+TDDAB,auth:ClaudeSubscription¬API}
@question::DoesCVMkitHelp↔bareModel

[VISION]
MeasureCVM/TDDABmethodology{onRealDeepSWEtasks}+subscriptionAuth(¬expensiveAPI)
©User>goal::evaluateEachRun+aggregatePassRate+measureVariance

[PROBLEMS_SOLVED]
>subscriptionAuth::CLAUDE_CODE_OAUTH_TOKEN→sandbox{apiKeySource:none}
>airGap::tasks{allow_internet:false}→CVMbakedIntoImage(¬npxAtRuntime)
>orchestration::CVMrunner{5phases}drivesAgent deterministically
>evaluation::perTrialReport+jobAggregate+liveCVMmonitor

[SCOPE]
@thisProject::harness+tooling+kitSources+per-taskAdaptations
!separation::thisMB::aboutHarness(pier/docker/scripts/results)
¬thisMB::kitSandboxMB{agentRuntimeScratchpad,perSolvedTask,createdFreshPhase2}
(theBenchmark-runningClaudes get theirOwn MB in /app — unrelated to this one)

[SUCCESS]
faithfulVerifier{reward↔officialTests}+trustworthyReward{0|1 allOrNothing}+reproducibleRuns
!notLeaderboardComparable::kit+model+env differ from DeepSWE baseline(mini-swe-agent/Modal)
