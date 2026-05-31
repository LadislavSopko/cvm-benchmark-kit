#!/bin/bash
# Reproduce pier's verifier against the agent's already-captured solution (model.patch),
# without re-running the agent. Run inside the base task image.
set -uo pipefail
cd /app
git config --global --add safe.directory /app >/dev/null 2>&1 || true

# Keep only the agent's fastapi/* changes from model.patch (drop .cvm/, benchmark-runner.ts, instruction.md).
python3 - <<'PYEOF'
import re
src = open('/work/model.patch', 'rb').read().decode('utf-8', 'replace')
out, keep = [], False
for line in src.split('\n'):
    if line.startswith('diff --git '):
        m = re.match(r'diff --git a/(.+?) b/(.+)', line)
        keep = bool(m and m.group(2).startswith('fastapi/'))
    if keep:
        out.append(line)
open('/tmp/sol.patch', 'w').write('\n'.join(out) + '\n')
print("[reverify] solution files:")
for l in out:
    if l.startswith('+++ '):
        print("   ", l[4:])
PYEOF

echo "[reverify] applying agent solution..."
git apply --whitespace=nowarn /tmp/sol.patch && echo "[reverify] SOLUTION APPLIED" || { echo "[reverify] SOLUTION APPLY FAILED"; exit 90; }

mkdir -p /tests /logs/verifier /logs/artifacts
cp /work/test.patch /tests/test.patch
cp /work/test.sh    /tests/test.sh
chmod +x /tests/test.sh

echo "[reverify] running official verifier (test.sh)..."
bash /tests/test.sh
echo "[reverify] ===== REWARD ====="
cat /logs/verifier/reward.txt 2>/dev/null || echo "(no reward written)"
