# study only: mosaic of flight frames in HOLD-frame coords (owl masked) to read the carton stack below the hold view
import cv2, numpy as np, re, json
T=open('/Users/computer/rootline/apprentice-film/src/shots/s02/hand/tracks.js').read()
CAM=[float(v) for v in re.search(r'export const CAM = \[([^\]]*)\]',T).group(1).split(',')]
CF0=261
O=open('/Users/computer/rootline/apprentice-film/src/shots/s02/hand/owltrack.js').read()
ROOT=[float(v) for v in re.search(r'export const OWL_ROOT = \[([^\]]*)\]',O).group(1).split(',')]
def cam(f):
    i=min(len(CAM)//2-1,f-CF0); return CAM[2*i],CAM[2*i+1]
BO=(2203.3,-1893.4)
X0,Y0,Wd,Hd=-900,-100,3300,2000
acc=np.zeros((Hd,Wd),np.float32); wt=np.zeros_like(acc)
for f in list(range(350,478,2)):
    s=cv2.imread(f'../s02-fix1h-src/{f:04d}.png',0).astype(np.float32)
    m=np.ones_like(s)
    if f>=397:
        k=f-397; x,y,sc,_=ROOT[4*k:4*k+4]
        m[max(0,int(y-560*sc)):int(y+260*sc), max(0,int(x-560*sc)):int(x+560*sc)]=0
    cx,cy=cam(f)
    # hold coords of frame (0,0): world = frame - cam; hold = world - BO
    hx=-cx-BO[0]; hy=-cy-BO[1]
    x=int(round(hx-X0)); y=int(round(hy-Y0)); h,w=s.shape
    if x<0 or y<0 or x+w>Wd or y+h>Hd: 
        xs=max(0,-x); ys=max(0,-y); xe=min(w,Wd-x); ye=min(h,Hd-y)
        if xe<=xs or ye<=ys: continue
        acc[y+ys:y+ye,x+xs:x+xe]+=(s*m)[ys:ye,xs:xe]; wt[y+ys:y+ye,x+xs:x+xe]+=m[ys:ye,xs:xe]; continue
    acc[y:y+h,x:x+w]+=s*m; wt[y:y+h,x:x+w]+=m
M=acc/np.maximum(wt,1e-3); M[wt<0.5]=0
np.save('../s02-fix1-z/hold_mosaic.npy',M)
v=np.clip(255*(M/255)**0.6,0,255).astype(np.uint8); v=cv2.cvtColor(v,cv2.COLOR_GRAY2BGR)
for gx in range(0,Wd,100):
    c=(0,0,255) if (gx+X0)%500==0 else (0,90,160); cv2.line(v,(gx,0),(gx,Hd),c,1)
    if (gx+X0)%500==0: cv2.putText(v,str(gx+X0),(gx+2,14),0,0.5,(0,255,255),1)
for gy in range(0,Hd,100):
    c=(0,0,255) if (gy+Y0)%500==0 else (0,90,160); cv2.line(v,(0,gy),(Wd,gy),c,1)
    if (gy+Y0)%500==0: cv2.putText(v,str(gy+Y0),(2,gy-2),0,0.5,(0,255,255),1)
cv2.imwrite('../s02-fix1-z/hold_mosaic.jpg',v,[cv2.IMWRITE_JPEG_QUALITY,85])
cv2.imwrite('../s02-fix1-z/hold_mosaic_s.jpg',cv2.resize(v,None,fx=0.6,fy=0.6,interpolation=cv2.INTER_AREA),[cv2.IMWRITE_JPEG_QUALITY,85])
print(M.shape)
