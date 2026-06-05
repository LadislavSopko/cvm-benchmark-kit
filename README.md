# CVM Benchmark Kit

Minimal skill set for running Claude Code with TDDAB + CVM methodology on coding benchmarks (e.g., DeepSWE).

## What's Inside

```
cvm-benchmark-kit/                 ← SOURCES (edit these)
├── CLAUDE.md                      ← instructions for Claude (understand → plan → review → execute)
├── benchmark-runner.ts            ← CVM program orchestrating the 5 phases
├── j-settings.md                  ← methodology config
├── skills-cc/                     ← Claude Code skills (SKILL.md format, the deployed form)
│   ├── tddab-planner/SKILL.md     ← TDDAB plan format and rules
│   ├── step-planner/SKILL.md      ← Step plan format (removal/migration/cleanup)
│   ├── debug-protocol/SKILL.md    ← Protocol D systematic debugging
│   ├── j-review-plan/SKILL.md     ← plan review (gate)
│   ├── j-cvm-exec-plan/SKILL.md   ← CVM plan executor skill
│   └── j-cvm-check-plan/SKILL.md  ← CVM plan validator skill
├── memory-bank/
│   └── README.md                  ← MBEL v5.0 grammar (Memory Bank format)
└── .pier-poc/
    ├── build.sh                   ← regenerates build/kit/ from the sources above
    └── build/                     ← PRODUCT (generated; do not edit by hand)
        ├── Dockerfile
        └── kit/                   ← copied into the image (skills_dir → kit/skills-cc)
```

> **Sources vs product:** edit only the files at the repo root (`skills-cc/`, `benchmark-runner.ts`, `CLAUDE.md`, `j-settings.md`, `memory-bank/`). Then run `.pier-poc/build.sh` to regenerate `.pier-poc/build/kit/`, which the Dockerfile copies into the image. Never hand-edit `.pier-poc/build/kit/`.

## Usage with Pier (DeepSWE)

```bash
# 1. Clone repos
git clone https://github.com/datacurve-ai/deep-swe
git clone https://github.com/LadislavSopko/cvm-benchmark-kit

# 2. Install pier
uv tool install git+https://github.com/datacurve-ai/pier

# 3. Run benchmark with CVM kit
pier run -p deep-swe/tasks \
  --agent claude-code \
  --model anthropic/claude-opus-4-8 \
  --ak skills_dir=./cvm-benchmark-kit/skills-cc \
  --ak memory_dir=./cvm-benchmark-kit/memory-bank

# Single task test
pier run -p deep-swe/tasks/<task-id> \
  --agent claude-code \
  --ak skills_dir=./cvm-benchmark-kit/skills-cc
```

## Requirements

- Claude Code CLI (with subscription or API key)
- Node.js (for CVM MCP server)
- CVM MCP server: `cvm-server` (interactive use: `npx cvm-server@latest`; the air-gapped pier PoC bakes it into the Docker image — see `.pier-poc/README.md` and `HANDOFF.md`)

## How It Works

1. Claude reads CLAUDE.md — understands the mandatory flow
2. Explores the codebase and initializes Memory Bank
3. Generates a TDDAB plan following tddab-planner.md rules
4. Reviews the plan in a loop until clean
5. Executes via CVM planexecutor (RED → GREEN → VERIFY → COMMIT per block)
6. Memory Bank updated before each commit

The CVM planexecutor provides guardrails: CROSS-CHECK verification, Protocol D debugging, mission context at every phase.

## Components

| Component | Source | Purpose |
|-----------|--------|---------|
| TDDAB Planner | [ai-agent](https://github.com/LadislavSopko/ai-agent) | Plan format and rules |
| Step Planner | [ai-agent](https://github.com/LadislavSopko/ai-agent) | Non-TDD plan format |
| Debug Protocol | [ai-agent](https://github.com/LadislavSopko/ai-agent) | Systematic debugging |
| CVM Server | [cvm](https://www.npmjs.com/package/cvm-server) | Plan execution engine |
| Pier | [pier](https://github.com/datacurve-ai/pier) | Benchmark runner |
| DeepSWE | [deep-swe](https://github.com/datacurve-ai/deep-swe) | Benchmark tasks |
