# Runs a single-task DeepSWE PoC via Pier + CVM benchmark kit, on subscription auth.
#
# Setup (once):
#   1. claude setup-token          # mint a token from your Claude subscription
#   2. paste it into .pier-poc\.env  (CLAUDE_CODE_OAUTH_TOKEN=...)
# Then just:
#   .\.pier-poc\run-poc.ps1                                       # fastapi task (default)
#   .\.pier-poc\run-poc.ps1 -Config .pier-poc\config-prometheus.yaml   # another task
#
# Run from the repo root (D:\cvm-benchmark-kit). The token is read from .pier-poc\.env
# (gitignored) — no need to export anything by hand.
param(
    [string]$Config = ".pier-poc\config.yaml"
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

# Pick the config; if PIER_MODEL is set, write a temp copy with the model swapped.
$config = $Config
if ($env:PIER_MODEL) {
    $runConfig = Join-Path $here ".config.run.yaml"
    (Get-Content $Config) `
        -replace '(?<=model_name:\s).*', $env:PIER_MODEL `
        | Set-Content $runConfig
    $config = ".pier-poc\.config.run.yaml"
    Write-Host "Using model override: $($env:PIER_MODEL)"
}

Write-Host "Running pier with config: $config"
pier run -c $config --debug
