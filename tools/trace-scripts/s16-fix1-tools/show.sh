#!/bin/sh
# show.sh outdir frames  -> renders graded frames via the harness, scores, and writes head/low crops (render over source)
cd /Users/computer/rootline/apprentice-film
node snapshots/s16-fix1-tools/r.mjs "$1" "$2" 2>&1 | grep -v 404 | grep -v willRead
python3 snapshots/s16-fix1-tools/score.py "$1" "$2" sheet
python3 - "$1" "$2" <<'PY'
import cv2,numpy as np,sys
out=sys.argv[1]
for f in sys.argv[2].split(','):
    r=cv2.imread(f'{out}/r{f}.png'); s=cv2.imread(f'snapshots/s16-p2-src/f{f}.png')
    cv2.imwrite(f'{out}/head{f}.jpg', np.hstack([r[0:480,1150:1700], s[0:480,1150:1700]]), [cv2.IMWRITE_JPEG_QUALITY,92])
    cv2.imwrite(f'{out}/low{f}.jpg', np.vstack([r[420:946,600:2206], s[420:946,600:2206]]), [cv2.IMWRITE_JPEG_QUALITY,88])
PY
