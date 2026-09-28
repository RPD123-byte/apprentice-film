#!/usr/bin/env python3
# heat.py raw.png vref.npy out.jpg [cell] [x0 y0 x1 y1]: cell-mean value error map over the source (red: mine brighter)
import cv2, sys, numpy as np
a=cv2.imread(sys.argv[1]).astype(np.float32).mean(2)/255; v=np.load(sys.argv[2]); out=sys.argv[3]
c=int(sys.argv[4]) if len(sys.argv)>4 else 25
x0,y0,x1,y1=[int(t) for t in sys.argv[5:9]] if len(sys.argv)>8 else (0,0,a.shape[1],a.shape[0])
src=cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/f1/clean_ff.png')[y0:y1,x0:x1].astype(np.float32)
A=a[y0:y1,x0:x1]; V=v[y0:y1,x0:x1]; H,W=A.shape
ov=src.copy(); rows=[]
for y in range(0,H,c):
    for x in range(0,W,c):
        d=A[y:y+c,x:x+c].mean()-V[y:y+c,x:x+c].mean()
        col=(0,0,255) if d>0 else (255,0,0)
        al=min(1,abs(d)*4)
        ov[y:y+c,x:x+c]=ov[y:y+c,x:x+c]*(1-al*0.7)+np.array(col,np.float32)*al*0.7
        rows.append((abs(d),d,x+x0,y+y0))
cv2.imwrite(out,ov.clip(0,255).astype(np.uint8),[cv2.IMWRITE_JPEG_QUALITY,85])
rows.sort(reverse=True)
print('mean |cell err| %.3f'%np.mean([r[0] for r in rows]))
print('worst cells:',' '.join('(%d,%d)%+.2f'%(r[2],r[3],r[1]) for r in rows[:24]))
