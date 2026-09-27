#!/bin/sh
# build_d2.sh T [offsets] -- re-trace one key (draw mode) keeping its measured flows when they exist, calibrate, write JS
T=$1; OFFS=${2:--2,-1,1}
N=$(echo $T | tr -d .)
[ -f tr/d$T.json ] && cp tr/d$T.json tr/d$T.prev.json
python3 tr/trace_key.py $T tr/masks_d.json tr/d$T.json 2>/dev/null | tail -1 | cut -c1-60
python3 - $T "$OFFS" <<'PY'
import json, sys, os
T, offs = sys.argv[1], sys.argv[2].split(",")
p = f"tr/d{T}.prev.json"
K = json.load(open(f"tr/d{T}.json"))
ok = False
if os.path.exists(p):
    P = json.load(open(p))
    F = P.get("flows") or {}
    need = [str(int(o)) for o in offs if int(o) != 0]
    held = set(P.get("held", []))
    # reuse when every requested offset was measured before (stored, or found to be a held frame)
    if all(k in F or k in held for k in need):
        K["flows"] = {k: F[k] for k in need if k in F}; K["held"] = [k for k in need if k in held]; ok = True
    if not need: K["flows"] = {}; ok = True
json.dump(K, open(f"tr/d{T}.json", "w"))
print("flows reused" if ok else "flows needed")
sys.exit(0 if ok else 3)
PY
[ $? -eq 3 ] && python3 tr/flow_key.py tr/d$T.json $OFFS 24 | grep -v offset
python3 tr/calib.py tr/d$T.json
python3 tr/tojs_d.py tr/d$T.json ../../src/shots/s04/tk/k$N.js K$N
