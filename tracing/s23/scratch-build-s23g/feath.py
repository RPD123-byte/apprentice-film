import json, numpy as np, cv2, sys
import fgx, cel as C
def fillonly(cel): c=dict(cel); c['lines']=[]; return c
for k in map(int,sys.argv[1].split(',')):
    F,P,cov,m=fgx.fg(k,shards=False)
    cel=json.load(open('cels3/%05d.json'%k))
    x0,y0,x1,y1=cel['bbox']; X0,Y0,X1,Y1=max(0,x0-30),max(0,y0-30),min(2206,x1+30),min(946,y1+30)
    Fc=F[Y0:Y1,X0:X1]; Pc=P[Y0:Y1,X0:X1]; mm=m[Y0:Y1,X0:X1]>0
    cel2=dict(cel); cel2['bbox']=[x0-X0,y0-Y0,x1-X0,y1-Y0]
    cel2['fills']=[{'c':f['c'],'r':[(np.array(r).reshape(-1,2)-[2*X0,2*Y0]).ravel().tolist() for r in f['r']]} for f in cel['fills']]
    cel2['strokes']=[]
    out=[]
    for fe in [0,0.8,1.5,2.5,3.5]:
        R=C.raster(cel2,Fc.shape,Pc,feather=fe)
        e1=np.abs(cv2.GaussianBlur(R,(0,0),1)-cv2.GaussianBlur(Fc,(0,0),1)).mean(-1)[mm].mean()
        e3=np.abs(cv2.GaussianBlur(R,(0,0),3)-cv2.GaussianBlur(Fc,(0,0),3)).mean(-1)[mm].mean()
        out.append('f%.1f e1 %.4f e3 %.4f'%(fe,e1,e3))
    print(k,' | '.join(out))
