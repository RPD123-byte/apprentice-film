#!/bin/sh
# time-true render through an s27t harness: film times (multiples of 0.04, comma list) -> OUTDIR/frame-at-<t>s.png
# usage: rt.sh TIMES OUTNAME [harness]   (harness dir under snapshots/: s27t-final/s27t-harness (s27 only, default) | s27t-final/s27t-harness3 (s26+s27+s28); copies of their index.html are in harness/, harness3/ here: symlink assets and src next to them)
P=/Users/computer/rootline/apprentice-film
case "$2" in */*|""|.*) echo "give a bare name"; exit 1;; esac
HN="${3:-s27t-final/s27t-harness}"
OUT="$P/snapshots/s27t-$2"
rm -rf "$OUT"
TH=$(python3 -c "import sys;print(','.join('%.6f'%((round(float(t)*25)+1e-3)/30) for t in sys.argv[1].split(',')))" "$1")
cd "$P" && npx --yes hyperframes@0.8.69 snapshot snapshots/$HN --at "$TH" --no-end --describe false --timeout 170000 -o "$OUT" 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E -i "error|fail|warn" | head -20
python3 - "$OUT" <<'PY'
import os,re,sys
d=sys.argv[1]
for f in os.listdir(d):
    m=re.search(r'at-([\d.]+?)s\.png$',f)
    if m:
        k=round(float(m.group(1))*30)
        os.rename(os.path.join(d,f),os.path.join(d,'frame-%05d.png'%k))
    elif f.endswith('.jpg'): os.remove(os.path.join(d,f))
print(len([f for f in os.listdir(d) if f.endswith('.png')]),'frames')
PY
