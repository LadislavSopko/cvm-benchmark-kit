# Custom CVM-kit image for the DeepSWE PoC task.
# Base = the task's prebuilt image (already has the fastapi repo + python deps + Node 24).
# We add: cvm-server (built from the local D:\cvm repo), an env wrapper, and the kit files.
FROM public.ecr.aws/d3j8x8q7/swe-bench-202605:kh7191qb52n5pfwh0a4yhahmt18343sn

# Install cvm-server globally from the locally-built tarball (its runtime deps
# come from public npm at build time, when the network is still available).
COPY cvm-server.tgz /tmp/cvm-server.tgz
RUN npm install -g /tmp/cvm-server.tgz \
    && command -v cvm-server \
    && rm -f /tmp/cvm-server.tgz

# Env wrapper used as the MCP stdio command (see task.toml mcp_servers).
COPY cvm-mcp /usr/local/bin/cvm-mcp
RUN chmod +x /usr/local/bin/cvm-mcp

# Kit files (CLAUDE.md, benchmark-runner.ts, skills/, memory-bank/) for the agent
# to copy into /app at runtime. skills_dir in task.toml points at /opt/cvm-kit/skills.
COPY kit /opt/cvm-kit
