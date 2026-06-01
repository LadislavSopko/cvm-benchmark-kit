cd /app
python3 - <<'PY'
try:
    import annotated_doc; print("annotated_doc.Doc =", annotated_doc.Doc)
except Exception as e: print("annotated_doc import error:", e)
try:
    import typing_extensions as te; print("typing_extensions.Doc =", te.Doc)
except Exception as e: print("te.Doc error:", e)
try:
    import annotated_doc, typing_extensions
    print("SAME class?", annotated_doc.Doc is typing_extensions.Doc)
except Exception as e: print("cmp error:", e)
# what does fastapi itself re-export / use?
import inspect, fastapi
PY
