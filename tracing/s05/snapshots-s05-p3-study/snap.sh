#!/bin/sh
# snap.sh "k1,k2,..." OUTDIR : render source frames k (578..667) through the shot-only scratch project
cd /Users/computer/rootline/apprentice-film/snapshots/s05-p3-proj
TIMES=$(python3 -c "import sys; print(','.join(f'{(int(k)-578)/30+0.01:.4f}' for k in '$1'.split(',')))")
OUT="$2"; rm -rf "$OUT"
npx --yes hyperframes@0.8.69 snapshot --at "$TIMES" --no-end --describe false --timeout 30000 -o "$OUT" 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E -i "error|fail|saved|warn" | head -20
# rename to frame-k.png
python3 - "$OUT" <<'PY'
import sys,glob,re,os
for p in glob.glob(sys.argv[1]+'/*.png'):
    m=re.search(r'at-([\d.]+)s',p)
    if not m: continue
    k=578+round((float(m.group(1))-0.01)*30)
    os.rename(p, os.path.join(sys.argv[1], f'k{k}.png'))
PY
ls "$OUT" | head -3
