#!/bin/sh
# time-true render of the s27 fix2 harness: film times (multiples of 0.04) -> snapshots/s27-fix2-NAME/frame-<t>.png
P=/Users/computer/rootline/apprentice-film
case "$2" in */*|""|.*) echo "give a bare name"; exit 1;; esac
OUT="$P/snapshots/s27-fix2-$2"
rm -rf "$OUT"
TH=$(python3 -c "import sys;print(','.join('%.6f'%((round(float(t)*25)+1e-3)/30) for t in sys.argv[1].split(',')))" "$1")
cd "$P" && npx --yes hyperframes@0.8.69 snapshot snapshots/s27-fix2-harness --at "$TH" --no-end --describe false --timeout 120000 -o "$OUT" 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E -i "error|fail|warn" | head -20
python3 - "$OUT" <<'PY'
import os,re,sys
d=sys.argv[1]
for f in os.listdir(d):
    m=re.search(r'at-([\d.]+?)s\.png$',f)
    if m:
        t=round(round(float(m.group(1))*30)*1.2/25*25)/25 if False else round(float(m.group(1))*30)/25
        os.rename(os.path.join(d,f),os.path.join(d,'frame-at-%.2fs.png'%t))
    elif f.endswith('.jpg'): os.remove(os.path.join(d,f))
print(len([f for f in os.listdir(d) if f.endswith('.png')]),'frames')
PY
