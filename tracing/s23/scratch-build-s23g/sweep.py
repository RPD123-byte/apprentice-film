import json, numpy as np, cv2, sys
import fgx, cel as C
L13=C.LEVELS
L9=[0.15,0.3,0.45,0.58,0.69,0.78,0.85,0.91,0.95]
L7=[0.18,0.38,0.56,0.7,0.8,0.88,0.94]
L16=[0.08,0.16,0.24,0.32,0.40,0.48,0.56,0.63,0.70,0.76,0.81,0.85,0.89,0.92,0.95,0.97]
def ev(F,P,m,cel):
    x0,y0,x1,y1=cel['bbox']; X0,Y0,X1,Y1=max(0,x0-30),max(0,y0-30),min(2206,x1+30),min(946,y1+30)
    Fc=F[Y0:Y1,X0:X1]; Pc=P[Y0:Y1,X0:X1]; mm=m[Y0:Y1,X0:X1]>0
    cel2=dict(cel); cel2['bbox']=[x0-X0,y0-Y0,x1-X0,y1-Y0]
    cel2['fills']=[{'c':f['c'],'r':[(np.array(r).reshape(-1,2)-[2*X0,2*Y0]).ravel().tolist() for r in f['r']]} for f in cel['fills']]
    R=C.raster(cel2,Fc.shape,Pc,feather=0)
    e1=np.abs(cv2.GaussianBlur(R,(0,0),1.0)-cv2.GaussianBlur(Fc,(0,0),1.0)).mean(-1)[mm].mean()
    e3=np.abs(cv2.GaussianBlur(R,(0,0),3)-cv2.GaussianBlur(Fc,(0,0),3)).mean(-1)[mm].mean()
    return e1,e3
orig=C.contours
for k in map(int,sys.argv[1].split(',')):
    F=fgx.load(k); P,cov=fgx.predict(k); m,d=fgx.fgmask(F,P,cov,G=fgx.GL[k])
    for lname,lev in [('L7',L7),('L9',L9),('L13',L13),('L16',L16)]:
        for sm,eps in [(0.8,0.55),(0.6,0.45),(0.8,0.8),(1.0,1.0),(0.5,0.35)]:
            C.contours=lambda mk,eps=eps,minA=5,smooth=sm: orig(mk,eps=eps,minA=minA,smooth=smooth)
            cel=C.trace(F,m,levels=lev)
            n=sum(len(r)//2 for f in cel['fills'] for r in f['r'])
            e1,e3=ev(F,P,m,cel)
            print(k,lname,'sm',sm,'eps',eps,'pts',n,'e1 %.4f e3 %.4f'%(e1,e3))
