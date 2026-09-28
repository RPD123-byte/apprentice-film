import json, numpy as np, cv2, sys
import cel as C, fgx
k=int(sys.argv[1])
F=fgx.load(k); P,cov=fgx.predict(k); m,d=fgx.fgmask(F,P,cov)
res=[]
for name,kw in [('heal5',dict()),('noheal',dict(heal=1,ink=False)),('heal3',dict(heal=3))]:
    cel=C.trace(F,m,**kw)
    npts=sum(len(r)//2 for f in cel['fills'] for r in f['r'])+sum(len(s['w']) for s in cel['strokes'])
    R=C.raster(cel,F.shape,np.zeros_like(F),feather=0.6)
    x0,y0,x1,y1=1230,170,1420,330
    res.append(R[y0:y1,x0:x1])
    mm=m>0
    e2=np.abs(cv2.GaussianBlur(R,(0,0),1.5)-cv2.GaussianBlur(F*mm[...,None],(0,0),1.5)).mean(-1)[mm].mean()
    print(name,'points',npts,'err1.5 %.4f'%e2)
x0,y0,x1,y1=1230,170,1420,330
v=np.hstack([F[y0:y1,x0:x1]]+res)
cv2.imwrite('try2.jpg',cv2.resize(np.clip(v*255,0,255).astype(np.uint8),None,fx=2.5,fy=2.5,interpolation=cv2.INTER_CUBIC))
