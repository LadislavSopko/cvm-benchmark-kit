#!/usr/bin/env node
// make-report.mjs — Build a self-contained HTML report for a pier/CVM trial (or a whole job),
// similar to the DeepSWE trial viewer, so each run can be evaluated at a glance.
//
// Usage (run from the repo root, needs only Node — no deps):
//   node .pier-poc/make-report.mjs <trial-dir>            # one trial -> <trial-dir>/report.html
//   node .pier-poc/make-report.mjs <job-dir>              # whole job  -> per-trial reports + index.html
//   node .pier-poc/make-report.mjs <dir> --md             # also emit report.md
//
// Examples:
//   node .pier-poc/make-report.mjs .pier-poc/jobs/cvm-poc-cliffy
//   node .pier-poc/make-report.mjs .pier-poc/jobs/cvm-poc-cliffy/cliffy-config-file-parsing__oY9CEwy

import fs from "node:fs";
import path from "node:path";

const ARGS = process.argv.slice(2);
const WANT_MD = ARGS.includes("--md");
const TARGET = ARGS.find((a) => !a.startsWith("--"));
if (!TARGET) {
  console.error("usage: node make-report.mjs <trial-dir|job-dir> [--md]");
  process.exit(1);
}

// ---------- small helpers ----------
const readText = (p) => { try { return fs.readFileSync(p, "utf8"); } catch { return null; } };
const readJson = (p) => { const t = readText(p); if (t == null) return null; try { return JSON.parse(t); } catch { return null; } };
const exists = (p) => { try { return fs.existsSync(p); } catch { return false; } };
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const stripAnsi = (s) => String(s ?? "").replace(/\x1b\[[0-9;]*m/g, "");
const num = (n) => (n == null ? "—" : Number(n).toLocaleString("en-US"));
const trunc = (s, n) => { s = String(s ?? ""); return s.length > n ? s.slice(0, n) + `\n… [${s.length - n} more chars]` : s; };

function fmtDuration(ms) {
  if (ms == null) return "—";
  const s = Math.round(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return (h ? `${h}h ` : "") + (h || m ? `${m}m ` : "") + `${sec}s`;
}

// ---------- detect: trial dir vs job dir ----------
function isTrialDir(d) { return exists(path.join(d, "agent", "claude-code.txt")) || exists(path.join(d, "verifier")); }
function listTrialDirs(jobDir) {
  return fs.readdirSync(jobDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && isTrialDir(path.join(jobDir, e.name)))
    .map((e) => path.join(jobDir, e.name));
}

// ---------- parse the Claude Code stream-json trajectory ----------
function parseTrajectory(streamPath) {
  const out = {
    system: null, steps: [], finalText: null,
    durationMs: null, numTurns: null,
    tok: { input: 0, output: 0, cacheRead: 0, cacheCreate: 0 },
    counts: { assistant: 0, tools: 0, thinking: 0, errors: 0 },
    toolHist: {},
  };
  const raw = readText(streamPath);
  if (raw == null) return out;
  const pending = new Map(); // tool_use_id -> step (so results attach to their call)
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let ev; try { ev = JSON.parse(line); } catch { continue; }
    if (ev.type === "system" && ev.subtype === "init") { out.system = ev; continue; }
    if (ev.type === "result") {
      out.finalText = ev.result ?? null;
      out.durationMs = ev.duration_ms ?? null;
      out.numTurns = ev.num_turns ?? null;
      continue;
    }
    const msg = ev.message;
    if (!msg || !Array.isArray(msg.content)) continue;

    if (ev.type === "assistant") {
      out.counts.assistant++;
      const u = msg.usage || {};
      out.tok.input += u.input_tokens || 0;
      out.tok.output += u.output_tokens || 0;
      out.tok.cacheRead += u.cache_read_input_tokens || 0;
      out.tok.cacheCreate += u.cache_creation_input_tokens || 0;
      for (const c of msg.content) {
        if (c.type === "thinking") { out.counts.thinking++; out.steps.push({ kind: "thinking" }); }
        else if (c.type === "text" && c.text && c.text.trim()) { out.steps.push({ kind: "text", text: c.text }); }
        else if (c.type === "tool_use") {
          out.counts.tools++;
          out.toolHist[c.name] = (out.toolHist[c.name] || 0) + 1;
          const step = { kind: "tool", name: c.name, input: c.input || {}, result: null, isError: false };
          out.steps.push(step);
          pending.set(c.id, step);
        }
      }
    } else if (ev.type === "user") {
      for (const c of msg.content) {
        if (c && c.type === "tool_result") {
          let txt = c.content;
          if (Array.isArray(txt)) txt = txt.map((x) => (typeof x === "string" ? x : x.text || "")).join("\n");
          const step = pending.get(c.tool_use_id);
          if (step) { step.result = txt; step.isError = !!c.is_error; if (c.is_error) out.counts.errors++; }
        }
      }
    }
  }
  return out;
}

// ---------- render a unified diff into colored HTML, grouped per file ----------
function renderDiff(patch) {
  if (!patch || !patch.trim()) return `<p class="muted">No model.patch (empty diff).</p>`;
  const files = [];
  let cur = null;
  for (const line of patch.split(/\r?\n/)) {
    const m = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
    if (m) { cur = { name: m[2], lines: [] }; files.push(cur); continue; }
    if (!cur) { cur = { name: "(preamble)", lines: [] }; files.push(cur); }
    cur.lines.push(line);
  }
  let added = 0, removed = 0;
  for (const f of files) for (const l of f.lines) { if (/^\+(?!\+\+)/.test(l)) added++; else if (/^-(?!--)/.test(l)) removed++; }
  const body = files.map((f) => {
    const rows = f.lines.map((l) => {
      let cls = "ctx";
      if (/^\+(?!\+\+)/.test(l)) cls = "add";
      else if (/^-(?!--)/.test(l)) cls = "del";
      else if (/^@@/.test(l)) cls = "hunk";
      else if (/^(index |new file|deleted file|similarity|rename|---|\+\+\+)/.test(l)) cls = "meta";
      return `<div class="dl ${cls}">${esc(l) || "&nbsp;"}</div>`;
    }).join("");
    return `<details class="file" open><summary><span class="fn">${esc(f.name)}</span></summary><div class="diff">${rows}</div></details>`;
  }).join("");
  return `<p class="muted">${files.length} file(s), <span class="add-t">+${added}</span> / <span class="del-t">−${removed}</span></p>${body}`;
}

// ---------- summarize a tool call's input compactly ----------
function toolSummary(name, input) {
  if (!input || typeof input !== "object") return "";
  if (name === "Bash") return input.command || "";
  if (name === "Read") return input.file_path || "";
  if (name === "Edit") return (input.file_path || "") + (input.old_string ? "  (edit)" : "");
  if (name === "Write") return input.file_path || "";
  if (name === "Glob" || name === "Grep") return input.pattern || JSON.stringify(input);
  if (name === "Skill") return input.skill || input.command || JSON.stringify(input);
  if (String(name).startsWith("mcp__cvm__")) return JSON.stringify(input, null, 2);
  return JSON.stringify(input, null, 2);
}

// ---------- verifier parse ----------
function parseVerifier(trialDir) {
  const reward = (readText(path.join(trialDir, "verifier", "reward.txt")) || "").trim();
  const out = stripAnsi(readText(path.join(trialDir, "verifier", "test-stdout.txt")) || "");
  const baseExit = (out.match(/Baseline exit code:\s*(\d+)/) || [])[1];
  const newExit = (out.match(/New tests exit code:\s*(\d+)/) || [])[1];
  return { reward, out, baseExit, newExit };
}

// ---------- build one trial report ----------
function buildTrial(trialDir, repoRoot) {
  const cfg = readJson(path.join(trialDir, "config.json")) || {};
  const trialName = cfg.trial_name || path.basename(trialDir);
  const taskName = trialName.split("__")[0];
  // Resolve the task dir from config.json's recorded path (reliable; the trial name may be
  // truncated, e.g. "…-reload" for "…-reload-status"). Fall back to the trial-name guess.
  let taskDir = cfg.task?.path
    ? path.resolve(repoRoot, String(cfg.task.path).replace(/\\/g, "/"))
    : path.join(repoRoot, ".pier-poc", "tasks", taskName);
  if (!exists(path.join(taskDir, "task.toml"))) taskDir = path.join(repoRoot, ".pier-poc", "tasks", taskName);
  const taskToml = readText(path.join(taskDir, "task.toml")) || "";
  const tget = (k) => (taskToml.match(new RegExp(`^${k}\\s*=\\s*['"]?(.+?)['"]?\\s*$`, "m")) || [])[1] || "";
  const instruction = readText(path.join(taskDir, "instruction.md")) || "(instruction.md not found)";
  const traj = parseTrajectory(path.join(trialDir, "agent", "claude-code.txt"));
  const ver = parseVerifier(trialDir);
  const patch = readText(path.join(trialDir, "artifacts", "model.patch")) || "";

  const running = !ver.reward;          // no reward.txt yet → trial in progress / incomplete
  const pass = ver.reward === "1";
  const title = tget("display_title") || taskName;
  const meta = {
    "Task ID": tget("task_id") || taskName,
    "Repository": tget("repository_url"),
    "Language": tget("language"),
    "Base commit": tget("base_commit_hash"),
    "Model": cfg.agent?.model_name,
    "Agent": cfg.agent?.name,
    "Max turns": cfg.agent?.kwargs?.max_turns,
  };

  const toolHist = Object.entries(traj.toolHist).sort((a, b) => b[1] - a[1])
    .map(([n, c]) => `<span class="chip">${esc(n)} ·${c}</span>`).join(" ");

  // trajectory rows
  const stepsHtml = traj.steps.map((s) => {
    if (s.kind === "thinking") return `<div class="step think">💭 thinking</div>`;
    if (s.kind === "text") return `<div class="step say"><div class="say-b">${esc(s.text)}</div></div>`;
    // tool
    const sm = toolSummary(s.name, s.input);
    const res = s.result == null ? "" :
      `<details class="tr"><summary>${s.isError ? "⚠ result (error)" : "result"}</summary><pre>${esc(s.result)}</pre></details>`;
    return `<div class="step tool${s.isError ? " err" : ""}">
      <div class="tn">🔧 ${esc(s.name)}</div>
      ${sm ? `<pre class="ti">${esc(sm)}</pre>` : ""}
      ${res}</div>`;
  }).join("");

  const css = `
  :root{--bg:#0d1117;--panel:#161b22;--bd:#30363d;--fg:#e6edf3;--mut:#8b949e;--add:#2ea04326;--addb:#3fb950;--del:#f8514926;--delb:#f85149;--acc:#58a6ff}
  *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.5 -apple-system,Segoe UI,Roboto,sans-serif}
  .wrap{max-width:1080px;margin:0 auto;padding:24px}
  h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;border-bottom:1px solid var(--bd);padding-bottom:6px;margin:28px 0 12px}
  .badge{display:inline-block;padding:3px 12px;border-radius:999px;font-weight:700;font-size:13px}
  .pass{background:var(--add);color:var(--addb);border:1px solid var(--addb)}.fail{background:var(--del);color:var(--delb);border:1px solid var(--delb)}
  .run{background:#9e6a0326;color:#d29922;border:1px solid #d29922}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:14px 0}
  .stat{background:var(--panel);border:1px solid var(--bd);border-radius:8px;padding:10px 12px}
  .stat .k{color:var(--mut);font-size:11px;text-transform:uppercase;letter-spacing:.04em}.stat .v{font-size:18px;font-weight:600;margin-top:2px}
  table.meta{width:100%;border-collapse:collapse;background:var(--panel);border:1px solid var(--bd);border-radius:8px;overflow:hidden}
  table.meta td{padding:7px 12px;border-bottom:1px solid var(--bd);vertical-align:top}table.meta td.k{color:var(--mut);width:160px}
  .chip{display:inline-block;background:var(--panel);border:1px solid var(--bd);border-radius:6px;padding:2px 8px;font-size:12px;color:var(--mut);margin:2px 0}
  details{background:var(--panel);border:1px solid var(--bd);border-radius:8px;margin:8px 0}
  summary{cursor:pointer;padding:8px 12px;font-weight:600;user-select:none}
  pre{margin:0;padding:10px 12px;white-space:pre-wrap;word-break:break-word;font:12px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace;color:var(--fg)}
  .muted{color:var(--mut)}.add-t{color:var(--addb)}.del-t{color:var(--delb)}
  .diff{font:12px/1.4 ui-monospace,Consolas,monospace;overflow-x:auto}
  .dl{padding:0 12px;white-space:pre-wrap;word-break:break-word}
  .dl.add{background:var(--add)}.dl.del{background:var(--del)}.dl.hunk{color:var(--acc)}.dl.meta{color:var(--mut)}
  .file summary .fn{font-family:ui-monospace,monospace;font-size:13px}
  .traj{border:1px solid var(--bd);border-radius:8px;overflow:hidden}
  .step{padding:8px 12px;border-bottom:1px solid var(--bd)}
  .step.say{background:#1f2937}.say-b{white-space:pre-wrap}
  .step.think{color:var(--mut);font-size:12px}
  .step.tool .tn{font-weight:600;color:var(--acc)}.step.tool.err{background:var(--del)}
  .ti{background:#0b0f14;border:1px solid var(--bd);border-radius:6px;margin:6px 0 0}
  .tr{margin:6px 0 0;background:#0b0f14}
  a{color:var(--acc)}`;

  const statCards = [
    ["Verdict", running ? `<span class="badge run">RUNNING / incomplete</span>` : pass ? `<span class="badge pass">PASS · reward 1</span>` : `<span class="badge fail">FAIL · reward ${esc(ver.reward || "?")}</span>`],
    ["Baseline", ver.baseExit === "0" ? "✅ pass" : `❌ exit ${esc(ver.baseExit ?? "?")}`],
    ["New tests", ver.newExit === "0" ? "✅ pass" : `❌ exit ${esc(ver.newExit ?? "?")}`],
    ["Duration", fmtDuration(traj.durationMs)],
    ["Turns", num(traj.numTurns)],
    ["Tool calls", num(traj.counts.tools)],
    ["Output tokens", num(traj.tok.output)],
    ["Cache read tok", num(traj.tok.cacheRead)],
  ].map(([k, v]) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div></div>`).join("");

  const metaRows = Object.entries(meta).filter(([, v]) => v)
    .map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td>${esc(v)}</td></tr>`).join("");

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} — trial report</title><style>${css}</style></head><body><div class="wrap">
<h1>${esc(title)}</h1>
<div class="muted">${esc(trialName)}</div>
<div class="grid">${statCards}</div>
<h2>Task</h2>
<table class="meta">${metaRows}</table>
<details open><summary>Instruction (prompt)</summary><pre>${esc(instruction)}</pre></details>
<h2>Verifier output</h2>
<details><summary>Full test-stdout.txt</summary><pre>${esc(ver.out || "(none)")}</pre></details>
<h2>Diff (model.patch)</h2>
${renderDiff(patch)}
<h2>Agent trajectory <span class="muted">(${traj.counts.assistant} assistant msgs · ${traj.counts.tools} tools · ${traj.counts.thinking} thinking)</span></h2>
<div class="muted" style="margin-bottom:8px">${toolHist}</div>
<div class="traj">${stepsHtml || '<div class="step muted">no trajectory</div>'}</div>
${traj.finalText ? `<h2>Final summary (agent)</h2><pre>${esc(traj.finalText)}</pre>` : ""}
<p class="muted" style="margin-top:24px">Generated by make-report.mjs</p>
</div></body></html>`;

  fs.writeFileSync(path.join(trialDir, "report.html"), html);

  if (WANT_MD) {
    const md = `# ${title}\n\n**${trialName}**\n\n` +
      `| | |\n|---|---|\n` +
      `| Verdict | ${running ? "⏳ RUNNING / incomplete" : pass ? "✅ PASS (reward 1)" : `❌ FAIL (reward ${ver.reward || "?"})`} |\n` +
      `| Baseline / New | exit ${ver.baseExit ?? "?"} / ${ver.newExit ?? "?"} |\n` +
      `| Duration | ${fmtDuration(traj.durationMs)} |\n| Turns | ${num(traj.numTurns)} |\n| Tool calls | ${num(traj.counts.tools)} |\n` +
      `| Output tokens | ${num(traj.tok.output)} |\n` +
      Object.entries(meta).filter(([, v]) => v).map(([k, v]) => `| ${k} | ${v} |`).join("\n") + "\n\n" +
      `## Instruction\n\n${instruction}\n\n## Diff stats\n\n\`\`\`\n${patch.split(/\r?\n/).filter(l => /^diff --git/.test(l)).map(l => l.replace("diff --git a/", "").replace(/ b\/.*/, "")).join("\n") || "(empty)"}\n\`\`\`\n\n` +
      (traj.finalText ? `## Final summary\n\n${traj.finalText}\n` : "");
    fs.writeFileSync(path.join(trialDir, "report.md"), md);
  }

  return {
    trialName, dir: path.basename(trialDir), taskId: tget("task_id") || taskName, title,
    pass, running, reward: ver.reward, durationMs: traj.durationMs, duration: fmtDuration(traj.durationMs),
    turns: traj.numTurns, tools: traj.counts.tools, lang: meta.Language,
  };
}

// ---------- resolve repo root (…./.pier-poc/jobs/<job>/<trial>) ----------
function repoRootFrom(p) {
  let d = path.resolve(p);
  for (let i = 0; i < 8; i++) {
    if (exists(path.join(d, ".pier-poc"))) return d;
    const up = path.dirname(d);
    if (up === d) break; d = up;
  }
  return process.cwd();
}

const DASH_CSS = `body{background:#0d1117;color:#e6edf3;font:14px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;margin:0}
 .wrap{max-width:1080px;margin:0 auto;padding:24px}h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;border-bottom:1px solid #30363d;padding-bottom:6px;margin:26px 0 12px}
 table{width:100%;border-collapse:collapse;background:#161b22;border:1px solid #30363d;border-radius:8px;overflow:hidden;margin-bottom:8px}
 td,th{padding:9px 12px;border-bottom:1px solid #30363d;text-align:left;vertical-align:top}th{color:#8b949e;font-size:12px;text-transform:uppercase;letter-spacing:.03em}
 .badge{display:inline-block;padding:2px 10px;border-radius:999px;font-weight:700;font-size:12px}
 .pass{background:#2ea04326;color:#3fb950}.fail{background:#f8514926;color:#f85149}.run{background:#9e6a0326;color:#d29922}a{color:#58a6ff;text-decoration:none}a:hover{text-decoration:underline}
 .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:14px 0}
 .card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:12px}.card .k{color:#8b949e;font-size:11px;text-transform:uppercase}.card .v{font-size:22px;font-weight:700;margin-top:2px}
 .bar{height:8px;border-radius:999px;background:#f8514926;overflow:hidden;min-width:90px}.bar>i{display:block;height:100%;background:#3fb950}
 .muted{color:#8b949e}small{color:#8b949e}`;

function badgeHTML(r) {
  if (r.running) return '<span class="badge run">RUNNING</span>';
  return r.pass ? '<span class="badge pass">PASS</span>' : `<span class="badge fail">FAIL (${esc(r.reward || "?")})</span>`;
}
function verdictCell(r, linkPrefix) {
  const b = r.running ? '<span class="badge run">RUN</span>' : r.pass ? '<span class="badge pass">PASS</span>' : `<span class="badge fail">FAIL${r.reward && r.reward !== "0" ? " (" + esc(r.reward) + ")" : ""}</span>`;
  return `<a href="${linkPrefix}${esc(r.dir)}/report.html">${b}</a>`;
}

// Build all trials in a job dir, write its index.html, return {jobName, rows}.
function processJob(jobDir, repoRoot) {
  const jobName = path.basename(jobDir);
  const rows = [];
  for (const t of listTrialDirs(jobDir)) {
    try { rows.push(buildTrial(t, repoRoot)); } catch (e) { console.error(`! ${t}: ${e.message}`); }
  }
  const passN = rows.filter((r) => r.pass).length;
  const done = rows.filter((r) => !r.running).length;
  const runN = rows.filter((r) => r.running).length;
  const trh = rows.map((r) => `<tr>
    <td><a href="./${esc(r.dir)}/report.html">${esc(r.title)}</a><br><small>${esc(r.dir)}</small></td>
    <td>${esc(r.lang || "")}</td>
    <td>${badgeHTML(r)}</td>
    <td>${esc(r.duration)}</td><td>${num(r.turns)}</td><td>${num(r.tools)}</td></tr>`).join("");
  const html = `<!doctype html><meta charset="utf-8"><title>${esc(jobName)} — job report</title><style>${DASH_CSS}</style>
   <div class="wrap"><p><a href="../index.html">← all jobs</a></p><h1>${esc(jobName)}</h1>
   <div class="cards"><div class="card"><div class="k">Pass rate</div><div class="v">${passN}/${done}${runN ? ` <small>(+${runN} running)</small>` : ""}</div></div></div>
   <table><tr><th>Task</th><th>Lang</th><th>Verdict</th><th>Duration</th><th>Turns</th><th>Tools</th></tr>${trh}</table>
   <p class="muted">Generated by make-report.mjs</p></div>`;
  fs.writeFileSync(path.join(jobDir, "index.html"), html);
  return { jobName, rows };
}

// ---------- main ----------
const target = path.resolve(TARGET);
const repoRoot = repoRootFrom(target);
const isJobDir = (d) => listTrialDirs(d).length > 0;

if (isTrialDir(target)) {
  const r = buildTrial(target, repoRoot);
  console.log(`✓ ${r.title}: ${r.pass ? "PASS" : "FAIL"} → ${path.join(target, "report.html")}`);
} else if (isJobDir(target)) {
  const { rows } = processJob(target, repoRoot);
  const passN = rows.filter((r) => r.pass).length;
  const done = rows.filter((r) => !r.running).length;
  console.log(`✓ Job: ${passN}/${done} passed${rows.length - done ? `, ${rows.length - done} running` : ""} → ${path.join(target, "index.html")}`);
  for (const r of rows) console.log(`   - ${r.running ? "RUN " : r.pass ? "PASS" : "FAIL"}  ${r.title}`);
} else {
  // jobs root: aggregate every job dir under it
  const jobDirs = fs.readdirSync(target, { withFileTypes: true })
    .filter((e) => e.isDirectory() && isJobDir(path.join(target, e.name)))
    .map((e) => path.join(target, e.name));
  if (!jobDirs.length) { console.error(`No jobs/trials found under ${target}`); process.exit(1); }

  const all = []; // {job, ...row}
  for (const jd of jobDirs) {
    const { jobName, rows } = processJob(jd, repoRoot);
    for (const r of rows) all.push({ job: jobName, ...r });
  }
  const passN = all.filter((r) => r.pass).length;
  const done = all.filter((r) => !r.running).length;   // completed (pass+fail), excludes running
  const runN = all.filter((r) => r.running).length;
  const totMs = all.reduce((a, r) => a + (r.durationMs || 0), 0);
  const tools = all.reduce((a, r) => a + (r.tools || 0), 0);

  // per-task rollup
  const byTask = new Map();
  for (const r of all) {
    const k = r.taskId;
    if (!byTask.has(k)) byTask.set(k, { taskId: k, title: r.title, lang: r.lang, runs: [] });
    byTask.get(k).runs.push(r);
  }
  const taskRows = [...byTask.values()].sort((a, b) => a.taskId.localeCompare(b.taskId)).map((t) => {
    const p = t.runs.filter((r) => r.pass).length;
    const n = t.runs.filter((r) => !r.running).length;   // completed runs
    const rN = t.runs.length - n;                        // running
    const pct = n ? Math.round((p / n) * 100) : 0;
    const dots = t.runs.map((r) => verdictCell(r, `./${esc(r.job)}/`)).join(" ");
    return `<tr><td>${esc(t.title)}<br><small>${esc(t.taskId)}</small></td><td>${esc(t.lang || "")}</td>
      <td><b>${p}/${n}</b>${rN ? ` <small>+${rN}⏳</small>` : ""}</td>
      <td><div style="display:flex;align-items:center;gap:8px"><div class="bar"><i style="width:${pct}%"></i></div><small>${pct}%</small></div></td>
      <td>${dots}</td></tr>`;
  }).join("");

  // full trial list (newest jobs likely sorted by name)
  const allRows = all.sort((a, b) => (a.job + a.taskId).localeCompare(b.job + b.taskId)).map((r) => `<tr>
    <td><a href="./${esc(r.job)}/${esc(r.dir)}/report.html">${esc(r.title)}</a></td>
    <td><a href="./${esc(r.job)}/index.html">${esc(r.job)}</a></td>
    <td>${esc(r.lang || "")}</td>
    <td>${badgeHTML(r)}</td>
    <td>${esc(r.duration)}</td><td>${num(r.turns)}</td><td>${num(r.tools)}</td></tr>`).join("");

  const pct = done ? Math.round((passN / done) * 100) : 0;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
   <title>CVM Benchmark — all tasks</title><style>${DASH_CSS}</style></head><body><div class="wrap">
   <h1>CVM Benchmark — all tasks</h1>
   <div class="cards">
     <div class="card"><div class="k">Overall pass rate</div><div class="v">${passN}/${done} <small>(${pct}%)</small></div></div>
     ${runN ? `<div class="card"><div class="k">Running</div><div class="v">${runN}⏳</div></div>` : ""}
     <div class="card"><div class="k">Unique tasks</div><div class="v">${byTask.size}</div></div>
     <div class="card"><div class="k">Jobs</div><div class="v">${jobDirs.length}</div></div>
     <div class="card"><div class="k">Total agent time</div><div class="v">${fmtDuration(totMs)}</div></div>
     <div class="card"><div class="k">Total tool calls</div><div class="v">${num(tools)}</div></div>
   </div>
   <h2>By task <small>(pass rate across all runs — shows variance)</small></h2>
   <table><tr><th>Task</th><th>Lang</th><th>Passed</th><th>Rate</th><th>Runs</th></tr>${taskRows}</table>
   <h2>All runs</h2>
   <table><tr><th>Task</th><th>Job</th><th>Lang</th><th>Verdict</th><th>Duration</th><th>Turns</th><th>Tools</th></tr>${allRows}</table>
   <p class="muted">Generated by make-report.mjs · ${all.length} trials across ${jobDirs.length} jobs</p>
   </div></body></html>`;
  fs.writeFileSync(path.join(target, "index.html"), html);
  console.log(`✓ Aggregate: ${passN}/${done} passed${runN ? `, ${runN} running` : ""} across ${byTask.size} tasks, ${jobDirs.length} jobs → ${path.join(target, "index.html")}`);
}
