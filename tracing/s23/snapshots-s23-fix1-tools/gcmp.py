#!/usr/bin/env python3
# gcmp.py galdir "page k x0 y0 x1 y1 name" ... -> galdir/cmp-<name>.jpg: owl render on black | source | source with the
# render laid over at 60 % (lighten)
import sys,cv2,numpy as np,glob,re
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s23r-tools')
from m import src
d=sys.argv[1]; outs=[]
for a in sys.argv[2:]:
    p=a.split(); page,k,x0,y0,x1,y1=map(int,p[:6]); name=p[6]; sc=float(p[7]) if len(p)>7 else 1.5
    f=glob.glob(f'{d}/out/frame-{page:02d}-*.png')
    if not f: print('no page',page); continue
    r=cv2.imread(f[0])[y0:y1,x0:x1]; s=src(k)[y0:y1,x0:x1]
    ov=np.maximum(s.astype(np.float32)*0.55, r.astype(np.float32)).astype(np.uint8)
    im=np.hstack([r,s,ov]); im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
    cv2.imwrite(f'{d}/cmp-{name}.jpg',im,[cv2.IMWRITE_JPEG_QUALITY,88]); outs.append(f'{d}/cmp-{name}.jpg')
print('\n'.join(outs))
