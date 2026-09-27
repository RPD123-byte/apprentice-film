#!/bin/sh
# N rounds of: render the dolly (17 frames) -> fold per-face gains (facegain.py); then a final render + errors
cd /Users/computer/rootline/apprentice-film
T=src/shots/s14/trace3; D=snapshots/s14-r3-dolly
ALL0=$(python3 -c "print(','.join(f'{40+0.04*k:.2f}' for k in range(17)))")
i=0; while [ $i -lt $1 ]; do sh tools/compare.sh $ALL0 $D >/dev/null; python3 $T/facegain.py $D ${2:-0.8}; i=$((i+1)); done
sh tools/compare.sh $ALL0 $D >/dev/null
python3 -c "
import cv2,numpy as np,glob,re
tot=[]
for f in sorted(glob.glob('$D/frame-*.png'),key=lambda f:float(re.search(r'at-([\d.]+)s',f).group(1))):
  t=re.search(r'at-([\d.]+)s',f).group(1); a=cv2.imread(f).astype(float); b=cv2.imread(f.replace('frame-','ref-')).astype(float)
  e=np.abs(cv2.GaussianBlur(a,(0,0),8)-cv2.GaussianBlur(b,(0,0),8)).mean(); tot.append(e)
  print(t, 'mean',round(a.mean(),1),round(b.mean(),1),'blur8',round(e,2))
print('avg blur8', round(sum(tot)/len(tot),2))
"
