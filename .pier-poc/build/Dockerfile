# Custom CVM-kit image for a DeepSWE PoC task.
# Base = the task's prebuilt image. Override per task with --build-arg BASE_IMAGE=...
# (default is the fastapi task image, which already has python deps + Node 24).
# We add: cvm-server (built from the local D:\cvm repo), an env wrapper, and the kit files.
ARG BASE_IMAGE=public.ecr.aws/d3j8x8q7/swe-bench-202605:kh7191qb52n5pfwh0a4yhahmt18343sn
FROM ${BASE_IMAGE}

# cvm-server is a Node program. Go/other task images may not ship Node, so ensure
# it exists (network is available at build time). No-op when Node is already present.
RUN if ! command -v node >/dev/null 2>&1; then \
        (curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y --no-install-recommends nodejs) \
        || (apt-get update && apt-get install -y --no-install-recommends nodejs npm); \
    fi \
    && node --version && npm --version

# Pre-warm the Go module cache for the verifier. The verifier runs air-gapped and
# compiles tests with GOWORK=off, so module versions resolve from go.mod pins (NOT the
# go.work workspace). Some of those source zips (e.g. grpc-gateway/v2 v2.27.7) are not
# fetched by the base image's `go mod download`, so offline compilation fails with
# "[setup failed]" — a false negative unrelated to the agent's solution. Here we replicate
# the verifier's exact compile (both test modes) while the network is up, which caches
# every dep it needs. git checkout restores go.mod/go.sum so the agent's diff stays clean.
# No-op unless WARM_GO=1, so non-Go task images (e.g. fastapi) are unaffected.
ARG WARM_GO=0
ARG WARM_GO_PKG=./cmd/prometheus
ARG WARM_GO_TAGS=olympus_new
RUN if [ "$WARM_GO" = "1" ] && [ -f /app/go.mod ]; then \
        cd /app \
        && GOWORK=off GOFLAGS=-mod=mod go test -count=1 -run '^$' ${WARM_GO_PKG} \
        && GOWORK=off GOFLAGS=-mod=mod go test -tags=${WARM_GO_TAGS} -count=1 -run '^$' ${WARM_GO_PKG} \
        && git checkout -- go.mod go.sum; \
    fi

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
