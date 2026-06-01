cd /app; python3 - <<'PYEOF'
import re
src=open('/work/model.patch','rb').read().decode('utf-8','replace')
out,keep=[],False
for line in src.split('\n'):
    if line.startswith('diff --git '):
        m=re.match(r'diff --git a/(.+?) b/(.+)',line); keep=bool(m and m.group(2).startswith('fastapi/'))
    if keep: out.append(line)
open('/tmp/sol.patch','w').write('\n'.join(out)+'\n')
PYEOF
git apply --whitespace=nowarn /tmp/sol.patch
echo "=== AutoHeadParam / AutoOptionsParam definícia v routing.py ==="
grep -nE 'AutoHeadParam|AutoOptionsParam' /app/fastapi/routing.py | head
echo "=== APIRouter.add_api_route: auto_head/options anotácia v zdroji ==="
python3 - <<'PYEOF'
import inspect, fastapi.routing as R
s=inspect.getsource(R.APIRouter.add_api_route)
import re
for ln in s.split('\n'):
    if 'auto_head' in ln or 'auto_options' in ln: print(repr(ln.strip()))
PYEOF
