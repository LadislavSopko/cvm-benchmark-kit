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
git apply --whitespace=nowarn /tmp/sol.patch && echo "[diag] solution applied" || { echo "APPLY FAIL"; exit 1; }
python3 - <<'PYEOF'
import inspect
from typing import get_args
from fastapi import FastAPI, APIRouter
try:
    from typing_extensions import Doc
except Exception:
    from typing import Doc
targets="__init__ include_router add_api_route api_route get put post delete options head patch trace".split()
def check(cls):
    for name in targets:
        fn=getattr(cls,name)
        sig=inspect.signature(fn)
        for p in ("auto_head","auto_options"):
            if p not in sig.parameters:
                print(f"  {cls.__name__}.{name:14}.{p:12} MISSING-PARAM"); continue
            ann=sig.parameters[p].annotation; args=get_args(ann)
            has_doc=bool(args) and any(isinstance(i,Doc) for i in args[1:])
            print(f"  {cls.__name__}.{name:14}.{p:12} {'OK' if has_doc else 'NO-DOC (annotated=%s)'%bool(args)}")
print("=== FastAPI ==="); check(FastAPI)
print("=== APIRouter ==="); check(APIRouter)
PYEOF
