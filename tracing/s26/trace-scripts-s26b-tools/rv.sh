#!/bin/sh
# rig preview: rv.sh "F,F,..." outdir x0 y0 x1 y1  -> outdir/rv-F.jpg (rig | source crop)
FR="$1"; OUT="$2"; shift 2
AT=$(python3 -c "print(','.join(str(int(f)-2700) for f in '$FR'.split(',')))")
rm -rf "$OUT"; mkdir -p "$OUT"
cd /Users/computer/rootline/apprentice-film/snapshots/s26b-rigview
npx --yes hyperframes@0.8.69 snapshot . --at "$AT" --no-end --describe false --timeout 60000 -o "$OUT" 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E -i "error|fail" | head -5
python3 - "$OUT" "$@" <<'PY'
import cv2, glob, re, sys, numpy as np
out=sys.argv[1]; x0,y0,x1,y1=map(int,sys.argv[2:6])
cap=cv2.VideoCapture('/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4')
for p in glob.glob(out+'/frame-*.png'):
    F=2700+int(round(float(re.search(r'at-([\d.]+)s',p).group(1))))
    a=cv2.imread(p); cap.set(1,F); ok,b=cap.read()
    im=np.hstack([a[y0:y1,x0:x1],b[y0:y1,x0:x1]])
    cv2.imwrite(f'{out}/rv-{F}.jpg',im); print(f'{out}/rv-{F}.jpg')
PY
