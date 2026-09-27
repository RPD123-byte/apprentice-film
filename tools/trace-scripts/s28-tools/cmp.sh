#!/bin/sh
# compare.sh + fill in any missing reference frames / pairs (the snapshot tool sometimes skips them).
sh tools/compare.sh "$1" "$2" > /dev/null 2>&1
python3 - "$2" <<'PY'
import sys,glob,re,cv2,numpy as np
d=sys.argv[1]
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
for fp in sorted(glob.glob(d+'/frame-*.png')):
    m=re.search(r'frame-(\d+)-at-([\d.]+)s',fp); idx,t=m.group(1),float(m.group(2))
    rp=f"{d}/ref-{idx}-at-{m.group(2)}s.png"
    import os
    if not os.path.exists(rp):
        c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read(); cv2.imwrite(rp,f)
    pp=f"{d}/pair-{idx}-at-{m.group(2)}s.jpg"
    if not os.path.exists(pp):
        a=cv2.imread(fp); b=cv2.imread(rp)
        h=a.shape[0]; s=np.hstack([a,np.zeros((h,8,3),np.uint8),b])
        cv2.imwrite(pp,cv2.resize(s,None,fx=0.45,fy=0.45),[cv2.IMWRITE_JPEG_QUALITY,88])
print('ok',len(glob.glob(d+'/frame-*.png')),'frames')
PY
