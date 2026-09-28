#!/bin/sh
# ab.sh NAME : render the A/B probe frames into snapshots/s14-fix2-ab-NAME and print blurred MAE per frame
cd /Users/computer/rootline/apprentice-film
T=40.04,40.16,40.32,40.48,40.6
sh tools/compare.sh $T snapshots/s14-fix2-ab-$1 2>&1 | grep -i -E "error|fail"
python3 - "$1" <<'PY'
import cv2,numpy as np,glob,re,sys
d='snapshots/s14-fix2-ab-'+sys.argv[1]; tot=[]
for f in sorted(glob.glob(d+'/frame-*.png')):
    a=cv2.cvtColor(cv2.imread(f),cv2.COLOR_BGR2GRAY).astype(float); b=cv2.cvtColor(cv2.imread(f.replace('frame-','ref-')),cv2.COLOR_BGR2GRAY).astype(float)
    e=np.abs(cv2.GaussianBlur(a,(0,0),8)-cv2.GaussianBlur(b,(0,0),8)).mean(); tot.append(e)
print(sys.argv[1], ' '.join(f'{e:.2f}' for e in tot), 'avg', round(sum(tot)/len(tot),3), 'blk', round(float(np.mean([(cv2.cvtColor(cv2.imread(f),cv2.COLOR_BGR2GRAY)<8).mean() for f in glob.glob(d+'/frame-*.png')])),3))
PY
