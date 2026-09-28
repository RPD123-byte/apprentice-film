#!/bin/sh
# round.sh OUTDIR : official compare at the standard s17 times + blurred MAE per frame
cd /Users/computer/rootline/apprentice-film
T=47.8,47.88,48.2,48.6,49.0,49.6,50.2,50.8,51.4,52.0,52.44,52.56,52.64,52.72,52.84,52.96,53.08,53.2
sh tools/compare.sh $T $1
python3 - "$1" <<'PY'
import cv2,numpy as np,glob,re,sys
fs=sorted(glob.glob(sys.argv[1]+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
g=lambda x:cv2.GaussianBlur(x,(0,0),6)
tot=[]
for f in fs:
    t=re.search(r'at-([\d.]+)s',f).group(1); a=cv2.imread(f,0).astype(np.float32); b=cv2.imread(f.replace('frame-','ref-'),0).astype(np.float32)
    e=np.abs(g(a)-g(b)); o=e[280:610,330:930].mean(); tot.append(e.mean())
    print(t,'full %.2f owlbox %.2f'%(e.mean(),o))
print('mean %.2f'%np.mean(tot))
PY
