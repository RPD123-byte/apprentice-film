#!/bin/sh
# snap.sh "k1,k2,..." OUTDIR [raw] : render source frames k (578..667) through the shot-only scratch project
# (raw: ungraded pre-grade canvas; files k<k>.png)
cd /Users/computer/rootline/apprentice-film/snapshots/s05-fix1d-proj
OFF=0; [ "$3" = "raw" ] && OFF=10
TIMES=$(python3 -c "print(','.join(f'{(int(k)-578)/30+0.01+$OFF:.4f}' for k in '$1'.split(',')))")
OUT="$2"; rm -rf "$OUT"
npx --yes hyperframes@0.8.69 snapshot --at "$TIMES" --no-end --describe false --timeout 90000 -o "$OUT" 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E -i "error|fail|warn|s05draw" | head -30
python3 - "$OUT" "$OFF" <<'PY'
import sys,glob,re,os
off=float(sys.argv[2])
for p in glob.glob(sys.argv[1]+'/*.png'):
    m=re.search(r'at-([\d.]+)s',p)
    if not m: continue
    k=578+round((float(m.group(1))-0.01-off)*30)
    os.rename(p, os.path.join(sys.argv[1], f'k{k}.png'))
PY
