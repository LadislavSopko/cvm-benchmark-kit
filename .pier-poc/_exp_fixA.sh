#!/bin/bash
# Experiment: does removing the agent's own NEW *_test.go files (fix A) clear the
# build-collision failure, and would the solution then pass the hidden tests?
# Emulates the real verifier (/tests/test.sh) for two cases: control vs fixA.
set -uo pipefail
cd /app || { echo "no /app"; exit 1; }
git config --global --add safe.directory /app
BASE=24a057bbf9089677b4c49eac4ae1f28287ac8bb9
MODEL=/in/artifacts/model.patch

run_case() {
  MODE="$1"
  echo ""
  echo "############################## CASE: $MODE ##############################"
  git reset --hard "$BASE" >/dev/null 2>&1
  git clean -fdx >/dev/null 2>&1

  if ! git apply "$MODEL"; then echo "[$MODE] ERROR: git apply model.patch failed"; return; fi
  git add -A

  # Agent-created NEW test files = added (A) *_test.go vs base.
  NEWTESTS=$(git diff --cached --name-only --diff-filter=A -- '*_test.go')
  echo "[$MODE] agent-created NEW *_test.go:"; echo "$NEWTESTS" | sed 's/^/    /'

  if [ "$MODE" = "fixA" ] && [ -n "$NEWTESTS" ]; then
    echo "$NEWTESTS" | while IFS= read -r f; do [ -n "$f" ] && rm -f "$f" && echo "[$MODE] removed: $f"; done
    git add -A
  fi

  git -c user.email=a@b -c user.name=exp commit -qm "agent ($MODE)"

  rm -rf /logs/verifier /logs/artifacts; mkdir -p /logs/verifier /logs/artifacts
  echo "[$MODE] --- running verifier (/tests/test.sh) ---"
  bash /tests/test.sh > "/tmp/out.$MODE.txt" 2>&1
  echo "[$MODE] reward = $(cat /logs/verifier/reward.txt 2>/dev/null || echo '<none>')"
  echo "[$MODE] --- key compile/test lines ---"
  grep -aE "redeclared|other declaration|undefined|build failed|^--- FAIL|^FAIL|^ok |New tests exit|Baseline exit" "/tmp/out.$MODE.txt" | head -30
}

run_case control
run_case fixA
echo ""
echo "############################## DONE ##############################"
