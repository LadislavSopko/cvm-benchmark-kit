#!/bin/bash
# Experiment: does PREFIXING the agent's own top-level test symbols (instead of deleting
# the files) clear the build-collision? Emulates the real verifier (/tests/test.sh).
# Renames the two known colliding identifiers in the agent's NEW test files only;
# gold tests are applied later by the verifier and keep the bare names -> no clash.
set -uo pipefail
cd /app || { echo "no /app"; exit 1; }
git config --global --add safe.directory /app
BASE=24a057bbf9089677b4c49eac4ae1f28287ac8bb9
MODEL=/in/artifacts/model.patch

git reset --hard "$BASE" >/dev/null 2>&1
git clean -fdx >/dev/null 2>&1
git apply "$MODEL" || { echo "ERROR: git apply failed"; exit 1; }
git add -A

NEWTESTS=$(git diff --cached --name-only --diff-filter=A -- '*_test.go')
echo "agent-created NEW *_test.go:"; echo "$NEWTESTS" | sed 's/^/    /'

# Prefix the agent's colliding top-level symbols, whole-word, ONLY in its own new test files.
echo "$NEWTESTS" | while IFS= read -r f; do
  [ -z "$f" ] && continue
  [ -f "$f" ] || continue
  sed -i -E 's/\breloadStatusResponse\b/zeroxReloadStatusResponse/g; s/\bgetReloadStatus\b/zeroxGetReloadStatus/g' "$f"
  echo "  prefixed symbols in: $f"
done
git add -A
git -c user.email=a@b -c user.name=exp commit -qm "agent (prefix)"

rm -rf /logs/verifier /logs/artifacts; mkdir -p /logs/verifier /logs/artifacts
echo "--- running verifier (/tests/test.sh) ---"
bash /tests/test.sh > /tmp/out.prefix.txt 2>&1
echo "reward = $(cat /logs/verifier/reward.txt 2>/dev/null || echo '<none>')"
echo "--- key compile/test lines ---"
grep -aE "redeclared|other declaration|undefined|build failed|^--- FAIL|^FAIL|^ok |New tests exit|Baseline exit" /tmp/out.prefix.txt | head -30
echo "--- DONE ---"
