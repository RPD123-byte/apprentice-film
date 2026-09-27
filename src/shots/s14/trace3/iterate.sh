#!/bin/sh
# One tone/light fitting pass over the dolly: iterate.sh NFIX NLIGHT [fit]
#   fit: start the face tones from a fresh multi-frame fit of the source; then NFIX render+fix rounds of the face
#   tones and NLIGHT render+fit rounds of the per-layer light; prints the dolly errors at the end.
cd /Users/computer/rootline/apprentice-film
T=src/shots/s14/trace3
D=snapshots/s14-r3-dolly
ALL=$(python3 -c "print(','.join(f'{40+0.04*k:.2f}' for k in range(1,17)))")
ALL0=$(python3 -c "print(','.join(f'{40+0.04*k:.2f}' for k in range(17)))")
frames() { python3 -c "
import glob,re
fs=sorted(glob.glob('$D/frame-*.png'),key=lambda f:float(re.search(r'at-([\d.]+)s',f).group(1)))
print(','.join(f for f in fs if float(re.search(r'at-([\d.]+)s',f).group(1))>40.01))"; }
if [ "$3" = "fit" ]; then echo "export const LIGHT = { t: [40.0, 40.64], g: {} };" > src/shots/s14/light3.js; python3 $T/tone3.py fit $ALL; fi
i=0; while [ $i -lt $1 ]; do sh tools/compare.sh $ALL $D >/dev/null; python3 $T/tone3.py fix $ALL $(frames) 1 1 | head -1; i=$((i+1)); done
i=0; while [ $i -lt $2 ]; do sh tools/compare.sh $ALL0 $D >/dev/null; python3 $T/light3.py $D 1 >/dev/null; echo light $i; i=$((i+1)); done
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
