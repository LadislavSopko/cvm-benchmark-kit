# DeepSWE cez CVM + TDDAB na predplatnom — ako to funguje

PoC, ktorý spúšťa DeepSWE úlohu s metodikou CVM benchmark kitu (TDDAB + CVM planexecutor),
cez `pier`, autentifikovaný **predplatným** (nie API). Overené: reward = 1 na úlohe
`fastapi-implicit-head-options`.

## Architektúra behu

```
run-poc.ps1 (host)
  → načíta .env (CLAUDE_CODE_OAUTH_TOKEN)
  → pier run -c config.yaml
      → postaví air-gapped Docker sandbox z custom image (allow_internet=false, povolené len api.anthropic.com cez egress-proxy/squid)
      → spustí claude-code agenta v sandboxe:
          - auth predplatným (OAuth token, apiKeySource=none)
          - prompt-template.j2 = bootstrap: skopíruje kit, zapíše instruction.md, naštartuje CVM
          - CVM MCP server (cvm-mcp) riadi 5 fáz: understand → init MB → plan → review → execute
          - agent používa skills (/tddab-planner, /j-cvm-exec-plan) a CVM planexecutor (RED/GREEN/VERIFY/COMMIT)
      → po dobehnutí spustí verifier (test.sh) → zapíše reward.txt (0/1)
```

## Súbory v `.pier-poc/`

| Súbor | Účel |
|---|---|
| `.env` | `CLAUDE_CODE_OAUTH_TOKEN` (z `claude setup-token`) + voliteľný `PIER_MODEL`. Gitignored. |
| `run-poc.ps1` | Launcher: načíta `.env`, vynuluje `ANTHROPIC_API_KEY`, spustí `pier run`. |
| `config.yaml` | Pier job config: agent `claude-code`, model, `prompt_template_path`, cesta k úlohe. |
| `prompt-template.j2` | Bootstrap promptu agenta + completeness nudge. `{{ instruction }}` = zadanie úlohy. |
| `build/Dockerfile` | Custom image: base task image + cvm-server + wrapper + kit. |
| `build/cvm-server.tgz` | cvm-server zbuildený z lokálneho `D:\cvm` (npm verzia je stará). |
| `build/cvm-mcp` | Wrapper, ktorý spúšťa cvm-server s env premennými (CVM nemá env pole v pier MCP configu). |
| `build/kit/` | CLAUDE.md, benchmark-runner.ts, memory-bank/ (kopírujú sa do /app). |
| `build/kit/skills-cc/` | Skilly v Claude Code formáte (`<nazov>/SKILL.md`). |
| `tasks/<task>/` | Lokálna kópia DeepSWE úlohy s upraveným `task.toml`. |
| `jobs/` | Výstupy behov (verdikty, trajektórie, patche). Gitignored. |
| `reverify.sh` | Nezávislá re-verifikácia: aplikuje model.patch + test.patch na base image, spustí test.sh. |

## Čo je upravené oproti base behu DeepSWE (a prečo)

Base beh: `pier run -p deep-swe/tasks --agent ... --model ... ` s `ANTHROPIC_API_KEY`, holý agent.
Naše úpravy, aby fungoval CVM + skilly + commandy + predplatné:

1. **Auth predplatným** — namiesto `ANTHROPIC_API_KEY` sa nastaví `CLAUDE_CODE_OAUTH_TOKEN`
   (pier ho prepošle do sandboxu). `run-poc.ps1` API key vynuluje.

2. **Custom Docker image** (`build/Dockerfile`) — DeepSWE úlohy sú air-gapped (`allow_internet=false`),
   takže `npx cvm-server` za behu zlyhá. CVM preto musí byť **zabudovaný v image**:
   base task image + `npm i -g cvm-server.tgz` + wrapper `cvm-mcp` + kit do `/opt/cvm-kit`.
   `task.toml` má `docker_image` prepnutý na tento image.

3. **CVM ako MCP server** — v `task.toml`:
   ```toml
   [[environment.mcp_servers]]
   name = "cvm"
   transport = "stdio"
   command = "cvm-mcp"
   ```
   Wrapper `cvm-mcp` nastaví `CVM_STORAGE_TYPE=file`, `CVM_DATA_DIR=/tmp/cvm-data`, `CVM_SANDBOX_ROOT=/app`.

4. **Skilly v Claude Code formáte** — kit má ploché `.md`; Claude Code načíta skill len ako
   `skills/<nazov>/SKILL.md` s frontmatterom (`name` + `description`). Preto `build/kit/skills-cc/`.
   `task.toml` má `skills_dir = "/opt/cvm-kit/skills-cc"`. Runner volá ploché názvy (`/tddab-planner`,
   nie `/mind-sets:tddab-planner`).

5. **Bootstrap cez prompt template** — `config.yaml` používa `prompt_template_path` (nie
   `append_system_prompt`, ktorý pier vkladá nequotovaný a rozbije príkaz). Template povie agentovi
   skopírovať kit, zapísať `instruction.md` a naštartovať `mcp__cvm__loadFile/start/getTask/submitTask`.
   Obsahuje aj completeness nudge (splniť každú požiadavku, presný zdroj symbolu, všetky public signatúry).

6. **Pier CRLF fix (Windows)** — `…/site-packages/pier/environments/agent_setup.py`: `write_text(..., newline="\n")`
   pre `start-squid.sh`, inak egress-proxy padne na CRLF. **Stratí sa pri reinštalácii pier.**

7. **deep-swe na LF** — repo klonovať s `git -c core.autocrlf=false clone ...` (inak `test.sh`/`test.patch`
   majú CRLF a verifier zlyhá → falošný reward 0).

## Ako to spustiť

```powershell
# jednorazovo: token z predplatného
claude setup-token
# vlož ho do .pier-poc\.env  ->  CLAUDE_CODE_OAUTH_TOKEN="..."

# spustenie (z D:\cvm-benchmark-kit)
.\.pier-poc\run-poc.ps1
```
Predpoklady: beží Docker Desktop (Linux engine), `pier` na PATH (`uv tool install datacurve-pier`),
custom image postavený (`cd .pier-poc\build; docker build -t cvm-kit-poc:fastapi-implicit-head-options .`).

## Kde sú výsledky a ako ich vyhodnotiť

Výstup behu: `.pier-poc\jobs\<job-name>\<task>__<id>\`

| Súbor | Čo je to |
|---|---|
| `verifier/reward.txt` | **Verdikt: `1` = úspech, `0` = neúspech.** Píše ho pier verifier. |
| `verifier/test-stdout.txt` | Výstup pytestu (napr. `43 passed`). Baseline aj nové testy musia prejsť. |
| `artifacts/model.patch` | Diff, ktorý agent vyrobil. |
| `agent/claude-code.txt` | Surový stream agenta (každý krok / tool call). |
| `result.json` | Súhrn jobu (n_completed / n_errored, časy). |

**Vyhodnotenie:** DeepSWE je all-or-nothing — `reward.txt = 1` len ak prejdú VŠETKY testy úlohy
aj baseline. `1 failed` v `test-stdout.txt` → reward 0.

```powershell
$T = ".pier-poc\jobs\cvm-poc-fastapi\<task>__<id>"
Get-Content "$T\verifier\reward.txt"                              # 1 / 0
Get-Content "$T\verifier\test-stdout.txt" | Select-String "passed|failed"
```

## Sledovanie a nezávislé overenie

```powershell
# naživo počas behu:
Get-Content "$T\agent\claude-code.txt" -Wait -Tail 5

# oficiálne GUI od pier:
pier view .pier-poc\jobs        # http://127.0.0.1:8080

# nezávislá re-verifikácia (aplikuje model.patch + test.patch na čistý base image, spustí test.sh):
#   (z .pier-poc, s nakopírovaným model.patch/test.patch/test.sh do reverify-work/)
docker run --rm -v ${PWD}\reverify-work:/work:ro <base-image> bash /work/reverify.sh
```

`reward.txt` a `test-stdout.txt` generuje pier verifier (pytest) v izolovanom kontajneri — sú to
trvalé artefakty na disku, dajú sa overiť aj cez `pier view` alebo nezávislou re-verifikáciou.

## Stav

Overené 2026-06-01: plný beh end-to-end na predplatnom, `fastapi-implicit-head-options` → **reward = 1**
(43/43 testov úlohy, 3186 baseline), ~46 min, cez 8 TDDAB blokov riadených CVM.
