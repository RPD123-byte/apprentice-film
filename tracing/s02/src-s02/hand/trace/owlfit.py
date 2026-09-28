# fit the kit perch owl's placement (x, y, s) to the sitting owl's silhouette in the hold average (IoU, brute force)
import sys, os, json, cv2, numpy as np
os.environ['ENTRY']='entry_owl.js'; sys.argv=[sys.argv[0]]
from run import Lab
A=np.load('../s02-r3-meas/hold_pre.npy'); B=cv2.GaussianBlur(A,(0,0),1.5)
box=(930,30,1260,352)   # hold frame; stop at the lid
x0,y0,x1,y1=box
S=(B[y0:y1,x0:x1]>150).astype(np.uint8)
n,lab,st,cen=cv2.connectedComponentsWithStats(S,8); k=1+np.argmax(st[1:,4]); S=(lab==k).astype(np.uint8)
S=cv2.morphologyEx(S,cv2.MORPH_CLOSE,np.ones((9,9),np.uint8))
L=Lab(); best=None
for s in [0.68,0.70,0.72,0.74,0.76,0.78,0.80]:
    L.js('(c)=>{window.OWLCFG=Object.assign({},LAB.owlPose("perch",{eyes:{state:"glossy"}}),{x:1100,y:500,s:c})}', s)
    img,_=L.frame(4)
    g=cv2.GaussianBlur(cv2.cvtColor(img,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),1.5)
    R=(g>110).astype(np.uint8)
    n,lab,st,cen=cv2.connectedComponentsWithStats(R,8); k=1+np.argmax(st[1:,4]); R=(lab==k).astype(np.uint8)
    R=cv2.morphologyEx(R,cv2.MORPH_CLOSE,np.ones((9,9),np.uint8))
    for dx in range(-70,71,2):
        for dy in range(-260,-120,2):
            # render placed at (1100+dx, 500+dy) -> shift the render mask by (dx,dy) and crop the box
            M=np.zeros_like(R); 
            xs,xe=max(0,dx),min(2206,2206+dx); ys,ye=max(0,dy),min(946,946+dy)
            M[ys:ye,xs:xe]=R[ys-dy:ye-dy,xs-dx:xe-dx]
            C=M[y0:y1,x0:x1]
            iou=(C&S).sum()/max(1,(C|S).sum())
            if best is None or iou>best[0]: best=(iou,s,1100+dx,500+dy)
    print(s, best)
L.close(); print('BEST', best)
L=Lab()
iou,s,x,y=best
L.js('(c)=>{window.OWLCFG=Object.assign({},LAB.owlPose("perch",{eyes:{state:"glossy"}}),{x:c[0],y:c[1],s:c[2]})}', [x,y,s])
img,_=L.frame(4); L.close()
g=cv2.GaussianBlur(cv2.cvtColor(img,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),1.5)
R=(g[y0:y1,x0:x1]>110).astype(np.uint8)
o=np.dstack([S*255,R*255,np.zeros_like(S)]).astype(np.uint8)
o=cv2.addWeighted(o,0.6,cv2.cvtColor(np.clip(A[y0:y1,x0:x1],0,255).astype(np.uint8),cv2.COLOR_GRAY2BGR),0.4,0)
cv2.imwrite('../s02-r3-r35/owlfit.png',cv2.resize(o,None,fx=2,fy=2))
