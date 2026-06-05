# DeepSWE via CVM + TDDAB on subscription — how it works

A PoC that runs a DeepSWE task with the CVM benchmark kit methodology (TDDAB + CVM
planexecutor), via `pier`, authenticated with a **subscription** (not an API key).
Verified: reward = 1 on the `fastapi-implicit-head-options` task.

## Run architecture

```
run-poc.ps1 (host)
  → loads .env (CLAUDE_CODE_OAUTH_TOKEN)
  → pier run -c config.yaml
      → builds an air-gapped Docker sandbox from a custom image (allow_internet=false, only api.anthropic.com allowed via egress-proxy/squid)
      → starts the claude-code agent in the sandbox:
          - auth via subscription (OAuth token, apiKeySource=none)
          - prompt-template.j2 = bootstrap: copies the kit, writes instruction.md, starts CVM
          - CVM MCP server (cvm-mcp) drives 5 phases: understand → init MB → plan → review → execute
          - agent uses skills (/tddab-planner, /j-cvm-exec-plan) and the CVM planexecutor (RED/GREEN/VERIFY/COMMIT)
      → after the run, executes the verifier (test.sh) → writes reward.txt (0/1)
```

## Files in `.pier-poc/`

| File | Purpose |
|---|---|
| `.env` | `CLAUDE_CODE_OAUTH_TOKEN` (from `claude setup-token`) + optional `PIER_MODEL`. Gitignored. |
| `run-poc.ps1` | Launcher: loads `.env`, clears `ANTHROPIC_API_KEY`, runs `pier run`. |
| `config.yaml` | Pier job config: agent `claude-code`, model, `prompt_template_path`, task path. |
| `prompt-template.j2` | Agent bootstrap prompt + completeness nudge. `{{ instruction }}` = the task brief. |
| `build/Dockerfile` | Custom image: base task image + cvm-server + CVM `ENV` + kit. |
| `build/kit/` | CLAUDE.md, benchmark-runner.ts, memory-bank/ (copied into /app). |
| `build/kit/skills-cc/` | Skills in Claude Code format (`<name>/SKILL.md`). |
| `tasks/<task>/` | Local copy of a DeepSWE task with a modified `task.toml`. |
| `jobs/` | Run outputs (verdicts, trajectories, patches). Gitignored. |
| `reverify.sh` | Independent re-verification: applies model.patch + test.patch on the base image, runs test.sh. |

## What is changed vs the base DeepSWE run (and why)

Base run: `pier run -p deep-swe/tasks --agent ... --model ... ` with `ANTHROPIC_API_KEY`, a bare agent.
Our changes so CVM + skills + commands + subscription work:

1. **Subscription auth** — instead of `ANTHROPIC_API_KEY`, set `CLAUDE_CODE_OAUTH_TOKEN`
   (pier forwards it into the sandbox). `run-poc.ps1` clears the API key.

2. **Custom Docker image** (`build/Dockerfile`) — DeepSWE tasks are air-gapped (`allow_internet=false`),
   so `npx cvm-server` fails at run time. CVM must therefore be **baked into the image**:
   base task image + `npm install -g cvm-server@latest` + CVM `ENV` + kit into `/opt/cvm-kit`.
   `task.toml` has `docker_image` switched to this image.

3. **CVM as an MCP server** — in `task.toml`:
   ```toml
   [[environment.mcp_servers]]
   name = "cvm"
   transport = "stdio"
   command = "cvm-server"
   ```
   The env is set directly in the image via Dockerfile `ENV` (canonical CVM config):
   `CVM_STORAGE_TYPE=file`, `CVM_DATA_DIR=.cvm` (= `/app/.cvm`, kept out of the graded diff via
   `.git/info/exclude`), `CVM_LOG_LEVEL=info`, `CVM_SANDBOX_ROOT=.` (= the agent's working dir `/app`).
   cvm-server (spawned by claude-code as a stdio MCP server) inherits these from the container env,
   so `command` points straight at `cvm-server` — no wrapper needed. The pier MCP config has no `env`
   field, so it is injected via the image. The only deviation from the canonical config is `command`:
   the air-gapped run uses the baked-in `cvm-server`, not `npx ... cvm-server@latest`.

4. **Skills in Claude Code format** — the kit has flat `.md`; Claude Code loads a skill only as
   `skills/<name>/SKILL.md` with frontmatter (`name` + `description`). Hence `build/kit/skills-cc/`.
   `task.toml` has `skills_dir = "/opt/cvm-kit/skills-cc"`. The runner calls flat names (`/tddab-planner`,
   not `/mind-sets:tddab-planner`).

5. **Bootstrap via prompt template** — `config.yaml` uses `prompt_template_path` (not
   `append_system_prompt`, which pier inserts unquoted and which breaks the command). The template tells the
   agent to copy the kit, write `instruction.md`, and start `mcp__cvm__loadFile/start/getTask/submitTask`.
   It also includes a completeness nudge (satisfy every requirement, exact symbol source, all public signatures).

6. **Pier CRLF fix (Windows)** — `…/site-packages/pier/environments/agent_setup.py`: `write_text(..., newline="\n")`
   for `start-squid.sh`, otherwise the egress-proxy crashes on CRLF. **Lost on pier reinstall.**

7. **deep-swe on LF** — clone the repo with `git -c core.autocrlf=false clone ...` (otherwise `test.sh`/`test.patch`
   get CRLF and the verifier fails → false reward 0).

## How to run it

```powershell
# one-time: token from your subscription
claude setup-token
# paste it into .pier-poc\.env  ->  CLAUDE_CODE_OAUTH_TOKEN="..."

# run (from D:\cvm-benchmark-kit)
.\.pier-poc\run-poc.ps1
```
Prerequisites: Docker Desktop running (Linux engine), `pier` on PATH (`uv tool install datacurve-pier`),
the custom image built (`cd .pier-poc\build; docker build -t cvm-kit-poc:fastapi-implicit-head-options .`).

> For the full from-scratch handoff (building images per task with the right build args,
> running specific tasks, adding new tasks) see **`../HANDOFF.md`**.

## Where the results are and how to evaluate them

Run output: `.pier-poc\jobs\<job-name>\<task>__<id>\`

| File | What it is |
|---|---|
| `verifier/reward.txt` | **Verdict: `1` = success, `0` = failure.** Written by the pier verifier. |
| `verifier/test-stdout.txt` | Test output (e.g. `43 passed`). Baseline and new tests must all pass. |
| `artifacts/model.patch` | The diff the agent produced. |
| `agent/claude-code.txt` | Raw agent stream (every step / tool call). |
| `result.json` | Job summary (n_completed / n_errored, timings). |

**Evaluation:** DeepSWE is all-or-nothing — `reward.txt = 1` only if ALL task tests AND the
baseline pass. `1 failed` in `test-stdout.txt` → reward 0.

```powershell
$T = ".pier-poc\jobs\cvm-poc-fastapi\<task>__<id>"
Get-Content "$T\verifier\reward.txt"                              # 1 / 0
Get-Content "$T\verifier\test-stdout.txt" | Select-String "passed|failed"
```

## Monitoring and independent verification

```powershell
# live during the run:
Get-Content "$T\agent\claude-code.txt" -Wait -Tail 5

# official pier GUI:
pier view .pier-poc\jobs        # http://127.0.0.1:8080

# independent re-verification (applies model.patch + test.patch on a clean base image, runs test.sh):
#   (from .pier-poc, with model.patch/test.patch/test.sh copied into reverify-work/)
docker run --rm -v ${PWD}\reverify-work:/work:ro <base-image> bash /work/reverify.sh
```

`reward.txt` and `test-stdout.txt` are generated by the pier verifier (pytest) in an isolated
container — they are durable on-disk artifacts, verifiable via `pier view` or independent re-verification.

## Status

Verified 2026-06-01: full end-to-end run on subscription, `fastapi-implicit-head-options` → **reward = 1**
(43/43 task tests, 3186 baseline), ~46 min, across 8 TDDAB blocks driven by CVM.
