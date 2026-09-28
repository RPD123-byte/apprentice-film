import json, numpy as np, cv2, sys
import fgx, cel as C
from sweep import L7,L9,L13,L16
orig=C.contours
k=int(sys.argv[1]); box=list(map(int,sys.argv[2].split(','))); zoom=float(sys.argv[3])
F=fgx.load(k); P,cov=fgx.predict(k); m,d=fgx.fgmask(F,P,cov,G=fgx.GL[k])
X0,Y0,X1,Y1=box
panels=[F[Y0:Y1,X0:X1]]
for lev,sm,eps in [(L7,0.8,0.8),(L9,0.8,0.8),(L13,0.8,0.55)]:
    C.contours=lambda mk,eps=eps,minA=5,smooth=sm: orig(mk,eps=eps,minA=minA,smooth=smooth)
    cel=C.trace(F,m,levels=lev)
    cel2=dict(cel); x0,y0,x1,y1=cel['bbox']; cel2['bbox']=[x0-X0,y0-Y0,x1-X0,y1-Y0]
    cel2['fills']=[{'c':f['c'],'r':[(np.array(r).reshape(-1,2)-[2*X0,2*Y0]).ravel().tolist() for r in f['r']]} for f in cel['fills']]
    # clip bbox to crop
    R=C.raster(cel2,(Y1-Y0,X1-X0,3),P[Y0:Y1,X0:X1],feather=0) if (x0>=X0 and y0>=Y0 and x1<=X1 and y1<=Y1) else None
    if R is None:
        big=np.zeros((946,2206,3),np.float32); big[:]=P
        R=C.raster(cel,(946,2206,3),P,feather=0)[Y0:Y1,X0:X1]
    panels.append(R)
v=np.hstack(panels)
cv2.imwrite(sys.argv[4],cv2.resize(np.clip(v*255,0,255).astype(np.uint8),None,fx=zoom,fy=zoom,interpolation=cv2.INTER_CUBIC if zoom>1 else cv2.INTER_AREA))
