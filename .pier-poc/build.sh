#!/usr/bin/env bash
# Regenerates .pier-poc/build/kit/ — the Docker build input — from the kit SOURCES at the repo root.
#
# SOURCES (edit these):   CLAUDE.md, benchmark-runner.ts, j-settings.md, .mcp.json, memory-bank/, skills-cc/
# PRODUCT (generated):    .pier-poc/build/kit/   ← never hand-edit; this script overwrites it
#
# The Dockerfile (.pier-poc/build/Dockerfile) does `COPY kit /opt/cvm-kit`, and task.toml sets
# skills_dir=/opt/cvm-kit/skills-cc. So skills-cc/ is the deployed skill set.
#
# Usage:  ./.pier-poc/build.sh        (run from anywhere)
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"   # .pier-poc
ROOT="$(cd "$HERE/.." && pwd)"                          # repo root (kit sources)
KIT="$HERE/build/kit"                                   # product

echo "Building $KIT from sources at $ROOT"

# Wipe and recreate ONLY the kit/ payload (leaves Dockerfile and cvm-server.tgz in build/ untouched).
rm -rf "$KIT"
mkdir -p "$KIT"

# Copy the source files into the kit payload.
cp    "$ROOT/CLAUDE.md"            "$KIT/CLAUDE.md"
cp    "$ROOT/benchmark-runner.ts" "$KIT/benchmark-runner.ts"
cp    "$ROOT/j-settings.md"       "$KIT/j-settings.md"
cp    "$ROOT/.mcp.json"           "$KIT/.mcp.json"
cp -r "$ROOT/memory-bank"         "$KIT/memory-bank"
cp -r "$ROOT/skills-cc"           "$KIT/skills-cc"

echo "Done. Contents:"
( cd "$KIT" && find . -maxdepth 2 -mindepth 1 | sort | sed 's/^/  /' )
