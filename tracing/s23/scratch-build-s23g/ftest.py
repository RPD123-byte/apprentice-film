import json, numpy as np, cv2, sys
import fgx, cel as C
for k in map(int,sys.argv[1].split(',')):
    F=fgx.load(k); P,cov=fgx.predict(k); m,d=fgx.fgmask(F,P,cov,G=fgx.GL[k])
    cel=json.load(open('cels/%05d.json'%k))
    x0,y0,x1,y1=cel['bbox']; X0,Y0,X1,Y1=max(0,x0-30),max(0,y0-30),min(2206,x1+30),min(946,y1+30)
    Fc=F[Y0:Y1,X0:X1]; Pc=P[Y0:Y1,X0:X1]; mm=m[Y0:Y1,X0:X1]>0
    cel2=dict(cel); cel2['bbox']=[x0-X0,y0-Y0,x1-X0,y1-Y0]
    cel2['fills']=[{'c':f['c'],'r':[(np.array(r).reshape(-1,2)-[2*X0,2*Y0]).ravel().tolist() for r in f['r']]} for f in cel['fills']]
    for fe in [0.0,0.4,0.6,0.8,1.0,1.3]:
        R=C.raster(cel2,Fc.shape,Pc,feather=fe)
        e1=np.abs(cv2.GaussianBlur(R,(0,0),0.7)-cv2.GaussianBlur(Fc,(0,0),0.7)).mean(-1)[mm].mean()
        e2=np.abs(cv2.GaussianBlur(R,(0,0),1.5)-cv2.GaussianBlur(Fc,(0,0),1.5)).mean(-1)[mm].mean()
        # sharpness: mean gradient magnitude inside mask
        gr=lambda I: np.hypot(cv2.Sobel(I.mean(-1),cv2.CV_32F,1,0),cv2.Sobel(I.mean(-1),cv2.CV_32F,0,1))[mm].mean()
        print(k,'feather',fe,'e0.7 %.4f e1.5 %.4f  grad R %.3f F %.3f'%(e1,e2,gr(R),gr(Fc)))
