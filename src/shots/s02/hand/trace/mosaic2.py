# study only: pre-grade world mosaic of the pans (owl masked), for authoring the mid world by eye. Not loaded by the film.
import cv2, numpy as np, json, re
from common import ungrade, src
cam=json.load(open('oldcam.json'))
txt=open('../s02-r3-orig/s02.js.orig').read()
rows=re.findall(r'\[(1[6-9]\.\d\d), ([\d.]+), ([\d.]+), ([\d.]+), (-?[\d.]+)\]', txt)
ROOT={int(round(float(r[0])*25)):[float(v) for v in r[1:]] for r in rows}
X0,Y0=-100,-2000; Wd,Hd=4600,3000; S=0.5
acc=np.zeros((int(Hd*S),int(Wd*S)),np.float32); wt=np.zeros_like(acc)
for f in list(range(264,365,2))+list(range(413,478,2)):
    c=cam[str(f)]; im=ungrade(src(f).astype(np.float32),f/25)
    m=np.ones_like(im)
    if f in ROOT:
        x,y,s,_=ROOT[f]; m[max(0,int(y-520*s)):int(y+430*s), max(0,int(x-660*s)):int(x+660*s)]=0
    im=cv2.resize(im,None,fx=S,fy=S,interpolation=cv2.INTER_AREA); m=cv2.resize(m,None,fx=S,fy=S,interpolation=cv2.INTER_NEAREST)
    x=int(round((-c[0]-X0)*S)); y=int(round((-c[1]-Y0)*S)); h,w=im.shape
    acc[y:y+h,x:x+w]+=im*m; wt[y:y+h,x:x+w]+=m
M=acc/np.maximum(wt,1e-3); M[wt<0.5]=0
np.save('world_pre_half.npy',M)
v=np.clip(M*3,0,255).astype(np.uint8); v=cv2.cvtColor(v,cv2.COLOR_GRAY2BGR)
for gx in range(0,Wd,100):
    X=int(gx*S); cv2.line(v,(X,0),(X,v.shape[0]),(0,0,255) if (gx+X0)%500==0 else (0,90,160),1)
    if (gx+X0)%500==0: cv2.putText(v,str(gx+X0),(X+2,12),0,0.4,(0,255,255),1)
for gy in range(0,Hd,100):
    Y=int(gy*S); cv2.line(v,(0,Y),(v.shape[1],Y),(0,0,255) if (gy+Y0)%500==0 else (0,90,160),1)
    if (gy+Y0)%500==0: cv2.putText(v,str(gy+Y0),(2,Y-2),0,0.4,(0,255,255),1)
cv2.imwrite('world_pre_x3.jpg',v,[cv2.IMWRITE_JPEG_QUALITY,85])
print(M.shape, M.max())
