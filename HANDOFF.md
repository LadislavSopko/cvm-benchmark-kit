# HANDOFF — how to run tasks (from scratch)

A practical guide for someone taking over this kit who wants to run individual DeepSWE
tasks via pier + CVM + TDDAB on a **subscription** (not an API key).

This is the quickstart. How it works internally and *why* lives in **`.pier-poc/README.md`**
(run architecture, the 7 deviations from the base DeepSWE run, result evaluation). Read that
when you need the details; this file is just "do these steps and it runs".

---

## 0. Prerequisites (one-time)

| Thing | How |
|---|---|
| **Docker Desktop** | Running, switched to the **Linux engine**. |
| **Node.js** | Not needed on the host (CVM is baked into the image). |
| **pier** | `uv tool install datacurve-pier` → `pier` must be on PATH (`~/.local/bin`). |
| **Claude token** | `claude setup-token` → paste into `.pier-poc\.env` (see step 1). |
| **pier CRLF patch (Windows)** | Required, otherwise the egress proxy dies. See ⚠️ below. |

> ⚠️ **pier CRLF patch (Windows — lost on every pier reinstall).**
> In `…/site-packages/pier/environments/agent_setup.py`, the `write_text(...)` call for
> `start-squid.sh` must pass `newline="\n"`. Without it the sandbox builds, but the
> egress-proxy/squid crashes on CRLF and the run fails. After every
> `uv tool install ... pier` (upgrade/reinstall), re-check/re-apply this patch.

---

## 1. Token (one-time)

```powershell
claude setup-token                     # mints a token from your subscription
copy .pier-poc\.env.example .pier-poc\.env
# in .pier-poc\.env set:  CLAUDE_CODE_OAUTH_TOKEN="..."
```

`.env` is gitignored — the token is never committed. `run-poc.ps1` loads it for you and
also clears `ANTHROPIC_API_KEY` so Claude Code uses the subscription.

---

## 2. Build the image for a task (one-time per task)

Tasks run **air-gapped** (`allow_internet=false`), so CVM cannot be downloaded at run time —
it must be **baked into the Docker image**. For each task you build its image once.

**Always regenerate the kit first** (copies the current CLAUDE.md / skills-cc / benchmark-runner into the build context):

```bash
bash .pier-poc/build.sh
```

**Then build the image** (run from `.pier-poc\build`). The BASE_IMAGE pattern is always
`public.ecr.aws/d3j8x8q7/swe-bench-202605:<ext_id>`, where `<ext_id>` comes from the task's
`task.toml`. The image is tagged `cvm-kit-poc:<task_id>` (exactly what `task.toml` expects).

### fastapi-implicit-head-options (Python) — verified, reward=1
```powershell
cd .pier-poc\build
docker build -t cvm-kit-poc:fastapi-implicit-head-options .
```
(this is the default BASE_IMAGE in the Dockerfile, no build args needed)

### prometheus-transactional-reload-status (Go) — note: needs WARM_GO
```powershell
cd .pier-poc\build
docker build `
  --build-arg BASE_IMAGE=public.ecr.aws/d3j8x8q7/swe-bench-202605:kh7faaexjnnv9h4vt84e0r1v4d82qtv7 `
  --build-arg WARM_GO=1 `
  --build-arg WARM_GO_PKG=./cmd/prometheus `
  --build-arg WARM_GO_TAGS=olympus_new `
  -t cvm-kit-poc:prometheus-transactional-reload-status .
```
> `WARM_GO=1` pre-warms the Go module cache for the verifier. Without it, air-gapped test
> compilation fails with `[setup failed]` → **false reward 0** (unrelated to the agent's solution).

### cliffy-config-file-parsing (TypeScript/Deno)
```powershell
cd .pier-poc\build
docker build `
  --build-arg BASE_IMAGE=public.ecr.aws/d3j8x8q7/swe-bench-202605:kh72088pg9vkc6peacnkc35yy9832jff `
  -t cvm-kit-poc:cliffy-config-file-parsing .
```

### quill-shared-toolbar-focus (TypeScript)
```powershell
cd .pier-poc\build
docker build `
  --build-arg BASE_IMAGE=public.ecr.aws/d3j8x8q7/swe-bench-202605:kh73sgee6751fmh72hwwctyscx832frj `
  -t cvm-kit-poc:quill-shared-toolbar-focus .
```

> The build needs network (it pulls Node/cvm-server, and with WARM_GO also Go deps) — that's
> fine; only the **run** is air-gapped, not the image build.

**Verify the image exists:** `docker image inspect cvm-kit-poc:<task_id>`
(`run-poc.ps1` checks this itself and warns if an image is missing).

---

## 3. Run a task

Always from the **repo root** (`D:\cvm-benchmark-kit`). The token is read from `.env`.

```powershell
# fastapi (default config)
.\.pier-poc\run-poc.ps1

# a specific task by directory name (overrides the task list; image must be built)
.\.pier-poc\run-poc.ps1 -Tasks prometheus-transactional-reload-status -JobName cvm-poc-prometheus
.\.pier-poc\run-poc.ps1 -Tasks cliffy-config-file-parsing -JobName cvm-poc-cliffy
.\.pier-poc\run-poc.ps1 -Tasks quill-shared-toolbar-focus -JobName cvm-poc-quill

# multiple tasks at once
.\.pier-poc\run-poc.ps1 -Tasks "fastapi-implicit-head-options,quill-shared-toolbar-focus" -JobName cvm-poc-multi

# every prepared task (each must have its image built!)
.\.pier-poc\run-poc.ps1 -Tasks all -JobName cvm-poc-all
```

Optional `run-poc.ps1` switches:
- `-Config <path>` — dedicated configs: `config.yaml` (fastapi), `config-prometheus.yaml`, `config-quill.yaml`. `-Tasks` overrides the task list anyway, so for most things the default config + `-Tasks` is enough.
- `-JobName <name>` — output job name (directory under `jobs/`).
- `PIER_MODEL` in `.env` — model override (default `anthropic/claude-opus-4-8`).

---

## 4. Results and evaluation

Output: `.pier-poc\jobs\<job-name>\<task>__<id>\`

| File | What it is |
|---|---|
| `verifier/reward.txt` | **Verdict: `1` = success, `0` = failure.** |
| `verifier/test-stdout.txt` | Test output (e.g. `43 passed`). |
| `artifacts/model.patch` | The diff the agent produced. |
| `agent/claude-code.txt` | Raw agent stream (every step / tool call). |
| `result.json` | Job summary. |

```powershell
$T = ".pier-poc\jobs\cvm-poc-fastapi\<task>__<id>"
Get-Content "$T\verifier\reward.txt"                                   # 1 / 0
Get-Content "$T\verifier\test-stdout.txt" | Select-String "passed|failed"
Get-Content "$T\agent\claude-code.txt" -Wait -Tail 5                   # live during the run
pier view .pier-poc\jobs                                               # GUI: http://127.0.0.1:8080
```

> **DeepSWE is all-or-nothing:** `reward=1` only if ALL task tests AND the baseline pass.
> For independent re-verification (model.patch + test.patch on a clean base image) see `.pier-poc/README.md`.

---

## 5. Adding a new DeepSWE task

1. Copy the task from DeepSWE into `.pier-poc\tasks\<task-id>\` (structure: `instruction.md`,
   `task.toml`, `environment/`, `solution/`, `tests/`). Clone the `deep-swe` repo with
   `git -c core.autocrlf=false clone …` — otherwise `test.sh`/`test.patch` get CRLF and the
   verifier fails (false reward 0).
2. In `task.toml` set:
   - `docker_image = "cvm-kit-poc:<task-id>"`
   - `skills_dir = "/opt/cvm-kit/skills-cc"`
   - the `[[environment.mcp_servers]]` block with `name="cvm"`, `transport="stdio"`, `command="cvm-server"`
   - `allow_internet = false`
   - note the `ext_id` in `[metadata]` — that's the base-image tag.
3. Build the image (step 2 above). For **Go** tasks add `--build-arg WARM_GO=1` plus
   `WARM_GO_PKG` / `WARM_GO_TAGS` matching what the verifier compiles.
4. Run: `.\.pier-poc\run-poc.ps1 -Tasks <task-id> -JobName cvm-poc-<task-id>`.

---

## Reference table of prepared tasks

| Task | Language | ext_id (= base-image tag) | WARM_GO |
|---|---|---|---|
| `fastapi-implicit-head-options` | Python | `kh7191qb52n5pfwh0a4yhahmt18343sn` | — |
| `prometheus-transactional-reload-status` | Go | `kh7faaexjnnv9h4vt84e0r1v4d82qtv7` | `1` (`./cmd/prometheus`, tag `olympus_new`) |
| `cliffy-config-file-parsing` | TypeScript/Deno | `kh72088pg9vkc6peacnkc35yy9832jff` | — |
| `quill-shared-toolbar-focus` | TypeScript | `kh73sgee6751fmh72hwwctyscx832frj` | — |

Base image = `public.ecr.aws/d3j8x8q7/swe-bench-202605:<ext_id>`.
