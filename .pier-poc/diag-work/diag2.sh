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
git apply --whitespace=nowarn /tmp/sol.patch && echo "[diag2] applied" || { echo APPLYFAIL; exit 1; }
python3 - <<'PYEOF'
import inspect
from typing import get_args
from annotated_doc import Doc          # EXACTLY what the test imports
from fastapi import FastAPI, APIRouter
targets="__init__ include_router add_api_route api_route get put post delete options head patch trace".split()
fails=[]
def check(cls):
    for name in targets:
        sig=inspect.signature(getattr(cls,name))
        for p in ("auto_head","auto_options"):
            if p not in sig.parameters: fails.append(f"{cls.__name__}.{name}.{p} MISSING"); continue
            args=get_args(sig.parameters[p].annotation)
            ok=bool(args) and any(isinstance(i,Doc) for i in args[1:])
            if not ok: fails.append(f"{cls.__name__}.{name}.{p} NO-DOC(annot={bool(args)})")
check(FastAPI); check(APIRouter)
print("TOTAL checked: 48; FAILURES:", len(fails))
for f in fails[:20]: print("  ", f)
# show what Doc the module actually bound
import fastapi.applications as A, fastapi.routing as R
print("applications.Doc =", getattr(A,'Doc',None))
print("routing.Doc      =", getattr(R,'Doc',None))
PYEOF
