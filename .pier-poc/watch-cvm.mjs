#!/usr/bin/env node
// watch-cvm.mjs — Live monitor of CVM MCP calls during a pier/CVM run.
// Tails the agent's stream-json and prints each mcp__cvm__ call (loadFile / start /
// getTask / submitTask) as it happens: the phase prompt CVM hands back, and the
// one-word/result the agent submits. No deps (Node builtins only).
//
// Usage (run from anywhere):
//   node .pier-poc/watch-cvm.mjs <trial-dir|job-dir>          # catch up, then follow live
//   node .pier-poc/watch-cvm.mjs <job-dir> --once             # print CVM calls so far, exit
//   node .pier-poc/watch-cvm.mjs <job-dir> --full             # don't trim long prompts/results
//
// If given a job dir, it picks the trial whose agent log was modified most recently
// (the active one). Ctrl+C to stop following.

import fs from "node:fs";
import path from "node:path";

const ARGS = process.argv.slice(2);
const ONCE = ARGS.includes("--once");
const FULL = ARGS.includes("--full");
const TARGET = ARGS.find((a) => !a.startsWith("--"));
if (!TARGET) { console.error("usage: node watch-cvm.mjs <trial-dir|job-dir> [--once] [--full]"); process.exit(1); }

const exists = (p) => { try { return fs.existsSync(p); } catch { return false; } };
const logOf = (trialDir) => path.join(trialDir, "agent", "claude-code.txt");

// Resolve to a single agent log: trial dir directly, or newest trial under a job dir.
function resolveLog(target) {
  if (exists(logOf(target))) return logOf(target);
  let cands = [];
  try {
    for (const e of fs.readdirSync(target, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const lg = logOf(path.join(target, e.name));
      if (exists(lg)) cands.push(lg);
    }
  } catch {}
  if (!cands.length) return null;
  cands.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return cands[0];
}

const C = { dim: "\x1b[2m", b: "\x1b[1m", cyan: "\x1b[36m", grn: "\x1b[32m", yel: "\x1b[33m", mag: "\x1b[35m", red: "\x1b[31m", rst: "\x1b[0m" };
const pad2 = (n) => String(n).padStart(2, "0");
const stamp = () => { const d = new Date(); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`; };

// Live status line (spinner) + event emitter that clears the spinner before printing.
let following = false, lastAt = Date.now(), spin = 0;
const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const clearStatus = () => { if (following) process.stdout.write("\x1b[2K\r"); };
const emit = (s) => { clearStatus(); process.stdout.write(s + "\n"); lastAt = Date.now(); };
const clip = (s, n) => { s = String(s ?? "").replace(/\s+/g, " ").trim(); return FULL || s.length <= n ? s : s.slice(0, n) + ` …(+${s.length - n})`; };
function block(text, color) { // multi-line, indented
  const body = FULL ? String(text ?? "") : clip(text, 600);
  return body.split("\n").map((l) => `        ${color}${l}${C.rst}`).join("\n");
}

// phase hint from a getTask prompt
function phaseOf(p) {
  p = String(p || "");
  if (/UNDERSTAND the project|Explore the codebase/i.test(p)) return "1·UNDERSTAND";
  if (/memory-bank\//i.test(p)) return "2·INIT-MB";
  if (/generate the implementation plan|tddab-planner/i.test(p) && /plan\.md/i.test(p) && !/review/i.test(p)) return "3·PLAN";
  if (/j-review-plan|Review the plan/i.test(p)) return "4·REVIEW";
  if (/j-cvm-exec-plan/i.test(p)) return "5·EXECUTE";
  if (/Execution completed/i.test(p)) return "DONE";
  return "";
}

const pending = new Map(); // tool_use_id -> cvm tool name
let nGet = 0, nSub = 0;

function handleLine(line) {
  if (!line.trim()) return;
  let ev; try { ev = JSON.parse(line); } catch { return; }

  if (ev.type === "result") {
    emit(`${C.dim}[${stamp()}]${C.rst} ${C.b}${C.grn}■ run complete${C.rst} ${C.dim}(turns=${ev.num_turns ?? "?"}, ${Math.round((ev.duration_ms || 0) / 1000)}s)${C.rst}`);
    if (ev.result) emit(block(ev.result, C.dim));
    process.exit(0);
  }

  const msg = ev.message;
  if (!msg || !Array.isArray(msg.content)) return;

  if (ev.type === "assistant") {
    for (const c of msg.content) {
      if (c.type !== "tool_use") continue;
      if (!String(c.name).startsWith("mcp__cvm__")) continue;
      const short = c.name.replace("mcp__cvm__", "");
      pending.set(c.id, short);
      if (short === "loadFile")
        emit(`${C.dim}[${stamp()}]${C.rst} ${C.cyan}📂 loadFile${C.rst} ${C.dim}programId=${c.input?.programId} file=${c.input?.filePath}${C.rst}`);
      else if (short === "start")
        emit(`${C.dim}[${stamp()}]${C.rst} ${C.cyan}▶  start${C.rst} ${C.dim}exec=${c.input?.executionId}${C.rst}`);
      else if (short === "submitTask") {
        nSub++;
        emit(`${C.dim}[${stamp()}]${C.rst} ${C.mag}⬆  submitTask #${nSub}${C.rst}`);
        emit(block(c.input?.result ?? JSON.stringify(c.input), C.mag));
      }
      // getTask: the interesting payload is the RESULT, printed when it arrives below.
    }
  } else if (ev.type === "user") {
    for (const c of msg.content) {
      if (!c || c.type !== "tool_result") continue;
      const name = pending.get(c.tool_use_id);
      if (!name) continue;
      pending.delete(c.tool_use_id);
      let txt = c.content;
      if (Array.isArray(txt)) txt = txt.map((x) => (typeof x === "string" ? x : x.text || "")).join("\n");
      if (name === "getTask") {
        nGet++;
        const ph = phaseOf(txt);
        emit(`${C.dim}[${stamp()}]${C.rst} ${C.yel}⬇  getTask #${nGet}${C.rst}${ph ? ` ${C.b}${C.yel}[${ph}]${C.rst}` : ""}${c.is_error ? ` ${C.red}(error)${C.rst}` : ""}`);
        emit(block(txt, C.yel));
      } else if (name === "loadFile" || name === "start") {
        if (c.is_error) emit(`        ${C.red}${clip(txt, 200)}${C.rst}`);
      }
      // submitTask result is just an ack ("Execution resumed") — skip.
    }
  }
}

// ---- main ----
function start() {
  const LOG = resolveLog(path.resolve(TARGET));
  if (!LOG) {
    if (ONCE) { console.error(`No agent log under ${TARGET}`); process.exit(1); }
    process.stdout.write(`${C.dim}waiting for agent log under ${TARGET} …${C.rst}\r`);
    setTimeout(start, 1000);
    return;
  }
  emit(`${C.b}CVM monitor${C.rst} ${C.dim}→ ${LOG}${C.rst}\n`);

  let offset = 0, buf = "";
  const pump = () => {
    let sz; try { sz = fs.statSync(LOG).size; } catch { return; }
    if (sz < offset) { offset = 0; buf = ""; }
    if (sz > offset) {
      const fd = fs.openSync(LOG, "r");
      const b = Buffer.alloc(sz - offset);
      fs.readSync(fd, b, 0, b.length, offset);
      fs.closeSync(fd);
      offset = sz; buf += b.toString("utf8");
      let nl;
      while ((nl = buf.indexOf("\n")) >= 0) { handleLine(buf.slice(0, nl)); buf = buf.slice(nl + 1); }
    }
  };
  pump(); // catch up on everything so far
  if (ONCE) {
    emit(`\n${C.dim}— ${nGet} getTask, ${nSub} submitTask so far —${C.rst}`);
    process.exit(0);
  }
  emit(`${C.dim}— caught up (${nGet} getTask, ${nSub} submitTask); following live, Ctrl+C to stop —${C.rst}`);
  following = true;
  // Heartbeat: show the monitor is alive and waiting for the next CVM call.
  setInterval(() => {
    if (!following) return;
    const idle = Math.round((Date.now() - lastAt) / 1000);
    process.stdout.write(`\x1b[2K\r${C.dim}${FRAMES[spin++ % FRAMES.length]} [${stamp()}] waiting for next CVM call… ${idle}s idle${C.rst}`);
  }, 250);
  setInterval(pump, 400);
}
start();
