#!/bin/bash
set -uo pipefail; cd /app
git config --global --add safe.directory /app >/dev/null 2>&1 || true
python3 - <<'PYEOF'
import re
src=open('/work/model.patch','rb').read().decode('utf-8','replace')
out,keep=[],False
for line in src.split('\n'):
    if line.startswith('diff --git '):
        m=re.match(r'diff --git a/(.+?) b/(.+)',line); keep=bool(m and m.group(2).startswith('fastapi/'))
    if keep: out.append(line)
open('/tmp/sol.patch','w').write('\n'.join(out)+'\n')
PYEOF
git apply --whitespace=nowarn /tmp/sol.patch && echo "[fix] solution applied"
echo "[fix] výskyty bare typu pred opravou:"; grep -c 'auto_head: bool | DefaultPlaceholder = Default(None)' /app/fastapi/routing.py
# 2-riadková oprava: použiť alias na APIRouter.add_api_route
sed -i 's/auto_head: bool | DefaultPlaceholder = Default(None)/auto_head: AutoHeadParam = Default(None)/' /app/fastapi/routing.py
sed -i 's/auto_options: bool | DefaultPlaceholder = Default(None)/auto_options: AutoOptionsParam = Default(None)/' /app/fastapi/routing.py
echo "[fix] po oprave (malo by byť 0):"; grep -c 'auto_head: bool | DefaultPlaceholder = Default(None)' /app/fastapi/routing.py
mkdir -p /tests /logs/verifier /logs/artifacts
cp /work/test.patch /tests/test.patch; cp /work/test.sh /tests/test.sh; chmod +x /tests/test.sh
echo "[fix] spúšťam oficiálny verifier..."
bash /tests/test.sh >/tmp/v.log 2>&1
echo "[fix] ===== REWARD ====="; cat /logs/verifier/reward.txt
echo "[fix] test súhrn:"; grep -E 'passed|failed' /tmp/v.log | tail -3
