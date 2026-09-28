#!/bin/sh
# s13 exact-frame render: renders film frames (default 883..923) at 30 fps ticks that land mid-way inside each
# 25 fps frame, writes OUT/r<frame>.png. Usage: render.sh OUT [f0 f1]
cd /Users/computer/rootline/apprentice-film
OUT="$1"; F0="${2:-883}"; F1="${3:-$F0}"; LIST="${4:-}"
[ -z "$2" ] && F1=923
TIMES=$(python3 -c "
import math
f0,f1=$F0,$F1; ts=[]; L='$LIST'
fr=[int(x) for x in L.split(',')] if L else range(f0,f1+1)
for f in fr:
  ks=[k for k in range(math.ceil(1.2*f),math.ceil(1.2*(f+1))) if f<=k/30*25<f+1]
  k=min(ks,key=lambda k:abs((k/30*25-f)-0.5)); ts.append(f'{(k+0.03)/30:.5f}')
print(','.join(ts))")
mkdir -p "$OUT"; rm -rf "$OUT/raw"
npx --yes hyperframes@0.8.69 snapshot --at "$TIMES" --no-end --describe false --timeout 60000 -o "$OUT/raw" 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E -i "error|fail|saved|warn" | head -20
python3 - "$OUT" <<'PY'
import glob, re, os, sys, math
out=sys.argv[1]
for p in glob.glob(out+'/raw/frame-*-at-*.png'):
    t=float(re.search(r'at-([\d.]+)s',p).group(1)); f=math.floor(t*25+1e-3)
    os.rename(p, f'{out}/r{f}.png')
PY
rm -rf "$OUT/raw"
ls "$OUT" | wc -l
