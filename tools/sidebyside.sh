#!/bin/sh
# Motion check: render a time range at FPS (<= 60 frames per call) paired with the source, then pack the pairs
# into an mp4 (outdir/sidebyside.mp4) and a contact sheet (outdir/sheet.jpg) you can Read.
# Usage: tools/sidebyside.sh START END FPS outdir
S="$1"; E="$2"; F="$3"; OUT="$4"
TIMES=$(python3 -c "
s,e,f=$S,$E,$F; n=int((e-s)*f+1e-6); n=min(n,60)
print(','.join(f'{s+i/f:.3f}' for i in range(n)))")
sh "$(dirname "$0")/compare.sh" "$TIMES" "$OUT"
python3 - "$OUT" "$F" <<'PY'
import cv2, glob, sys, re, numpy as np
out,fps=sys.argv[1],float(sys.argv[2])
fs=sorted(glob.glob(out+'/pair-*.jpg'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
if not fs: sys.exit('no pairs')
ims=[cv2.imread(p) for p in fs]; h,w=ims[0].shape[:2]
vw=cv2.VideoWriter(out+'/sidebyside.mp4',cv2.VideoWriter_fourcc(*'mp4v'),fps,(w,h))
for im in ims: vw.write(cv2.resize(im,(w,h)))
vw.release()
small=[cv2.resize(im,(960,int(960*h/w))) for im in ims]
cols=2
while len(small)%cols: small.append(np.zeros_like(small[0]))
rows=[np.hstack(small[i:i+cols]) for i in range(0,len(small),cols)]
sheet=np.vstack(rows)
if sheet.shape[0]>9000: sheet=cv2.resize(sheet,(int(sheet.shape[1]*9000/sheet.shape[0]),9000))
cv2.imwrite(out+'/sheet.jpg',sheet,[cv2.IMWRITE_JPEG_QUALITY,85]); print('wrote',out+'/sheet.jpg',len(fs),'pairs')
PY
