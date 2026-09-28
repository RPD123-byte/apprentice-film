#!/usr/bin/env python3
# roomfit.py render.png outdir [regions...] : per-region blurred MAE vs the owl-free source composite, + overlays
import cv2, numpy as np, sys, os
ROOT='/Users/computer/rootline/apprentice-film'
REG={'case':(120,0,330,480),'spk':(290,40,620,946),'side':(600,0,820,946),'rack':(720,140,900,900),'crate':(0,400,470,946),
 'sign':(880,0,1150,150),'lbox':(1150,0,1400,650),'mbox':(1350,0,1800,620),'xst':(1550,130,2206,640),'keys':(1320,560,2206,946),'floor':(440,780,1340,946)}
r=cv2.cvtColor(cv2.imread(sys.argv[1]),cv2.COLOR_BGR2GRAY).astype(np.float32)
s=cv2.cvtColor(cv2.imread(ROOT+'/snapshots/s20-b3-study/cleanA.png'),cv2.COLOR_BGR2GRAY).astype(np.float32)
out=sys.argv[2]; os.makedirs(out,exist_ok=True)
m=np.ones_like(s,bool); m[370:860,975:1300]=False
a=cv2.GaussianBlur(r,(0,0),6); b=cv2.GaussianBlur(s,(0,0),6); e=np.abs(a-b)
names=sys.argv[3:] or list(REG)
tot=[]
for k in REG:
    x0,y0,x1,y1=REG[k]; mm=m[y0:y1,x0:x1]; v=e[y0:y1,x0:x1][mm].mean(); bias=(a-b)[y0:y1,x0:x1][mm].mean(); tot.append(v)
    print(f"{k:6s} mae6 {v:6.2f} bias {bias:+6.2f}")
    if k in names:
        o=np.dstack([r,s,r])[y0:y1,x0:x1].astype(np.uint8)
        z=min(1.4, 900/max(x1-x0,y1-y0)); o=cv2.resize(o,None,fx=z,fy=z)
        for x in range((x0//50+1)*50,x1,50): X=int((x-x0)*z); cv2.line(o,(X,0),(X,6),(0,255,255),1); cv2.putText(o,str(x),(X+2,10),0,0.33,(0,255,255),1)
        for y in range((y0//50+1)*50,y1,50): Y=int((y-y0)*z); cv2.line(o,(0,Y),(6,Y),(0,255,255),1); cv2.putText(o,str(y),(2,Y-2),0,0.33,(0,255,255),1)
        cv2.imwrite(f"{out}/ov_{k}.jpg",o,[cv2.IMWRITE_JPEG_QUALITY,88])
print('all mae6 %.2f'%e[m].mean())
