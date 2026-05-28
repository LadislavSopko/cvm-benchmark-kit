# CVM Benchmark Kit

Minimal skill set for running Claude Code with TDDAB + CVM methodology on coding benchmarks (e.g., DeepSWE).

## What's Inside

```
cvm-benchmark-kit/
├── CLAUDE.md                      ← instructions for Claude (understand → plan → review → execute)
├── skills/
│   ├── mind-sets/
│   │   ├── tddab-planner.md       ← TDDAB plan format and rules
│   │   ├── step-planner.md        ← Step plan format (removal/migration/cleanup)
│   │   └── debug-protocol.md      ← Protocol D systematic debugging
│   ├── j-cvm-exec-plan.md         ← CVM plan executor skill
│   └── j-cvm-check-plan.md        ← CVM plan validator skill
└── memory-bank/
    └── README.md                  ← MBEL v5.0 grammar (Memory Bank format)
```

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
  --model anthropic/claude-opus-4-7 \
  --ak skills_dir=./cvm-benchmark-kit/skills \
  --ak memory_dir=./cvm-benchmark-kit/memory-bank

# Single task test
pier run -p deep-swe/tasks/<task-id> \
  --agent claude-code \
  --ak skills_dir=./cvm-benchmark-kit/skills
```

## Requirements

- Claude Code CLI (with subscription or API key)
- Node.js (for CVM MCP server)
- CVM MCP server: `npx cvm-server@next`

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
