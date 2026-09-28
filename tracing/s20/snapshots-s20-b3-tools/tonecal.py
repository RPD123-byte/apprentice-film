#!/usr/bin/env python3
# tonecal.py render.png : suggest TONE gains (per painter) from pre-grade region means, source / render
import cv2,numpy as np,sys,re
ROOT='/Users/computer/rootline/apprentice-film'
r=cv2.cvtColor(cv2.imread(sys.argv[1]),cv2.COLOR_BGR2GRAY).astype(np.float32)/255
s=cv2.cvtColor(cv2.imread(ROOT+'/snapshots/s20-b3-study/cleanA.png'),cv2.COLOR_BGR2GRAY).astype(np.float32)/255
H,W=s.shape; yy,xx=np.mgrid[0:H,0:W]; qx=(xx/W-0.5)*2; qy=(yy/H-0.5)*2; vig=1-0.38*np.minimum(1,(qx*qx+qy*qy)/2)**1.15
lut=np.linspace(0,1,2001); out=lut*0.65+0.35*lut*lut*(3-2*lut)
inv=lambda g: np.interp(np.clip(g/vig,0,1),out,lut)
R=inv(r); S=inv(s)
m=np.ones_like(S,bool); m[370:860,975:1300]=False
cv2.fillPoly(m.view(np.uint8),[np.int32([[1285,240],[1525,205],[1460,810],[1205,740]])],0)
cv2.fillPoly(m.view(np.uint8),[np.int32([[555,250],[790,260],[900,880],[800,900],[600,470]])],0)
REG={'case':[(145,0,265,450)],'books':[(300,0,600,45)],'speaker':[(300,50,606,946),(606,50,728,260)],'plant':[(650,0,800,250)],'rack':[(730,150,872,740)],
 'crate':[(0,530,456,946)],'boxes':[(1150,0,1790,620)],'xstand':[(1580,190,2000,610)],'table':[(1780,60,2206,640)],'keyboard':[(1330,580,2206,946)],'sign':[(900,0,1140,140)]}
t=open(ROOT+'/src/shots/s20/b3/room.js').read(); cur=dict(re.findall(r'(\w+): ([\d.]+)',re.search(r'export const TONE = \{(.*?)\}',t).group(1)))
out_={}
for k,bs in REG.items():
    a=b=0
    for (x0,y0,x1,y1) in bs:
        mm=m[y0:y1,x0:x1]; a+=S[y0:y1,x0:x1][mm].sum(); b+=R[y0:y1,x0:x1][mm].sum()
    g=float(cur.get(k,1))*np.clip((a+1)/(b+1),0.7,1.4)
    out_[k]=round(g,2); print(f'{k:9s} src/render {a/max(b,1):.3f}  gain {cur.get(k)} -> {out_[k]}')
if '--write' in sys.argv:
    new='export const TONE = { '+', '.join(f'{k}: {v}' for k,v in {**cur,**out_}.items())+' };'
    t=re.sub(r'export const TONE = \{.*?\};',new,t); open(ROOT+'/src/shots/s20/b3/room.js','w').write(t); print(new)
