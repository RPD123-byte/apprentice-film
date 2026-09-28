cd /Users/computer/rootline/apprentice-film
echo "== eval"; sh src/shots/s14/trace3/iterate_f2.sh eval
echo "== motion"; START=$(date +%s); sh tools/sidebyside.sh 36.92 40.72 10 snapshots/s14-fix2-motion; echo "motion secs $(( $(date +%s) - START ))"
echo "== det"; sh tools/compare.sh 36.94,37.68,39.12,39.92,40.24,40.64,40.68 snapshots/s14-fix2-det-a >/dev/null 2>&1; sh tools/compare.sh 36.94,37.68,39.12,39.92,40.24,40.64,40.68 snapshots/s14-fix2-det-b >/dev/null 2>&1
python3 - <<'PY'
import cv2,glob,numpy as np
for f in sorted(glob.glob('snapshots/s14-fix2-det-a/frame-*.png')):
    g=f.replace('det-a','det-b'); a=cv2.imread(f).astype(int); b=cv2.imread(g).astype(int)
    print(f.split('/')[-1], 'maxdiff', int(np.abs(a-b).max()))
PY
echo FINALDONE
