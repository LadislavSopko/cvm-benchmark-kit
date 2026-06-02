# Runs a single-task DeepSWE PoC via Pier + CVM benchmark kit, on subscription auth.
#
# Setup (once):
#   1. claude setup-token          # mint a token from your Claude subscription
#   2. paste it into .pier-poc\.env  (CLAUDE_CODE_OAUTH_TOKEN=...)
# Then just:
#   .\.pier-poc\run-poc.ps1                                       # fastapi task (default)
#   .\.pier-poc\run-poc.ps1 -Config .pier-poc\config-prometheus.yaml   # another task
#
# Select which tasks to run WITHOUT touching any image (-Config supplies agent/job
# settings; -Tasks overrides the task list). Images are a one-time build per task.
#   .\.pier-poc\run-poc.ps1 -Tasks all                            # every prepared task
#   .\.pier-poc\run-poc.ps1 -Tasks prometheus-transactional-reload-status
#   .\.pier-poc\run-poc.ps1 -Tasks "fastapi-implicit-head-options,prometheus-transactional-reload-status" -JobName cvm-poc-multi
#
# Run from the repo root (D:\cvm-benchmark-kit). The token is read from .pier-poc\.env
# (gitignored) — no need to export anything by hand.
param(
    [string]$Config = ".pier-poc\config.yaml",
    # "all" = every dir under .pier-poc\tasks; or a comma-separated list of task dir names.
    [string]$Tasks,
    [string]$JobName
)

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path

# --- load .pier-poc\.env (KEY=VALUE lines) into the process environment ---
$envFile = Join-Path $here ".env"
if (Test-Path $envFile) {
    foreach ($line in Get-Content $envFile) {
        $t = $line.Trim()
        if ($t -eq "" -or $t.StartsWith("#")) { continue }
        $i = $t.IndexOf("=")
        if ($i -lt 1) { continue }
        $key = $t.Substring(0, $i).Trim()
        $val = $t.Substring($i + 1).Trim().Trim('"').Trim("'")
        Set-Item -Path "Env:$key" -Value $val
    }
} else {
    Write-Error "Missing $envFile. Copy .pier-poc\.env.example to .pier-poc\.env and add your token."
    exit 1
}

if (-not $env:CLAUDE_CODE_OAUTH_TOKEN) {
    Write-Error "CLAUDE_CODE_OAUTH_TOKEN is empty in .pier-poc\.env. Run 'claude setup-token' and paste the token there."
    exit 1
}

# Ensure no API key is present, so Claude Code prefers the subscription OAuth token.
$env:ANTHROPIC_API_KEY = ""

# Make sure pier is on PATH.
$env:Path += ";$env:USERPROFILE\.local\bin"

# Build the effective config text (start from -Config), applying optional overrides.
$configText = Get-Content $Config -Raw
$rewrite = $false

# Optional job name override.
if ($JobName) {
    $configText = $configText -replace '(?m)^job_name:.*', "job_name: $JobName"
    $rewrite = $true
    Write-Host "Job name: $JobName"
}

# Optional model override (PIER_MODEL).
if ($env:PIER_MODEL) {
    $configText = $configText -replace '(?<=model_name:\s).*', $env:PIER_MODEL
    $rewrite = $true
    Write-Host "Using model override: $($env:PIER_MODEL)"
}

# Optional task selection: rebuild the tasks: block (assumed to be the last key).
if ($Tasks) {
    $tasksRoot = Join-Path $here "tasks"
    if ($Tasks -eq "all") {
        $names = Get-ChildItem $tasksRoot -Directory | Select-Object -ExpandProperty Name
    } else {
        $names = $Tasks.Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ }
    }
    if (-not $names) { Write-Error "No tasks selected."; exit 1 }

    $lines = @()
    foreach ($n in $names) {
        $toml = Join-Path $tasksRoot "$n\task.toml"
        if (-not (Test-Path $toml)) { Write-Error "Task not found: '$n' (missing $toml)"; exit 1 }
        # Warn if the task's docker_image isn't built locally (selection won't rebuild it).
        $m = Select-String -Path $toml -Pattern '^\s*docker_image\s*=\s*"(.+)"' | Select-Object -First 1
        if ($m) {
            $img = $m.Matches.Groups[1].Value
            docker image inspect $img *> $null
            if ($LASTEXITCODE -ne 0) { Write-Warning "Image not built for '$n': $img  (build it before running)" }
        }
        $lines += "  - path: .pier-poc/tasks/$n"
    }
    # Strip the existing tasks: block to EOF, then append the selected one.
    $configText = [regex]::Replace($configText, '(?s)\r?\ntasks:.*$', '')
    $configText = $configText.TrimEnd() + "`n`ntasks:`n" + ($lines -join "`n") + "`n"
    $rewrite = $true
    Write-Host ("Selected tasks (" + $names.Count + "): " + ($names -join ", "))
}

if ($rewrite) {
    $config = ".pier-poc\.config.run.yaml"
    Set-Content -Path (Join-Path $here ".config.run.yaml") -Value $configText
} else {
    $config = $Config
}

# pier resolves the config path AND the config's relative paths (jobs_dir, tasks: - path:)
# against its CWD, so it must run from the repo root regardless of where this script was invoked.
$repoRoot = Split-Path -Parent $here
Set-Location $repoRoot

Write-Host "Running pier with config: $config (cwd: $repoRoot)"
pier run -c $config --debug
