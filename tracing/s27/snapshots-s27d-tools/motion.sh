#!/bin/sh
# Motion check through the s27 harness: render T0..T1 every STEP (<=60 frames), pair with the source, pack a sheet.
# usage: motion.sh T0 T1 STEP NAME
T=$(python3 -c "
s,e,st=$1,$2,$3; n=int(round((e-s)/st))+1; n=min(n,60)
print(','.join(f'{s+i*st:.2f}' for i in range(n)))")
./render.sh "$T" "$4" > /dev/null
python3 pair.py ../s27d-$4 | tail -1
python3 - ../s27d-$4 <<'PY'
import cv2, glob, sys, numpy as np, re
d=sys.argv[1]
fs=sorted(glob.glob(d+'/pair-*.jpg'),key=lambda p:float(re.search(r'pair-([\d.]+)\.jpg',p).group(1)))
ims=[cv2.resize(cv2.imread(f),(440,378)) for f in fs]
while len(ims)%6: ims.append(np.zeros_like(ims[0]))
cv2.imwrite(d+'/msheet.jpg',np.vstack([np.hstack(ims[i:i+6]) for i in range(0,len(ims),6)]),[cv2.IMWRITE_JPEG_QUALITY,75])
PY
