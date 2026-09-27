# flying-owl silhouette check: render the owl alone (ungraded) and compare row widths / extents with the source
import sys, numpy as np, cv2
from run import Lab, src
fr=[int(v) for v in sys.argv[1].split(',')]; out=sys.argv[2] if len(sys.argv)>2 else None
L=Lab()
for f in fr:
    L.js('(o)=>window.__labset(o)',{'only':{'chars':True,'owlOnly':True,'room':False}})
    r,_=L.frame(f,False)
    L.js('(o)=>window.__labset(o)',{'only':None})
    R=cv2.cvtColor(r,cv2.COLOR_BGR2GRAY)>25
    s=src(f); S=cv2.GaussianBlur(cv2.cvtColor(s,cv2.COLOR_BGR2GRAY),(0,0),1.5)
    ys,xs=np.nonzero(R); x0,x1,y0,y1=xs.min(),xs.max(),ys.min(),ys.max()
    pad=60; X0,Y0,X1,Y1=max(0,x0-pad),max(0,y0-pad),min(2206,x1+pad),min(946,y1+pad)
    Sm=(S>135).astype(np.uint8); Sm[:Y0]=0; Sm[Y1:]=0; Sm[:,:X0]=0; Sm[:,X1:]=0
    Sm=cv2.morphologyEx(Sm,cv2.MORPH_CLOSE,np.ones((7,7),np.uint8))
    n,lab,st,_=cv2.connectedComponentsWithStats(Sm,8); k=1+np.argmax(st[1:,4]) if n>1 else 0; Sm=(lab==k)
    iou=(R&Sm).sum()/max(1,(R|Sm).sum())
    sy,sx=np.nonzero(Sm)
    print(f'f{f} IoU {iou:.3f} render bbox x {x0}-{x1} y {y0}-{y1} | src bbox x {sx.min()}-{sx.max()} y {sy.min()}-{sy.max()}')
    for yy in range(y0,y1,25):
        rr=np.nonzero(R[yy])[0]; ss=np.nonzero(Sm[yy])[0]
        print('   y',yy,'render',(rr.min(),rr.max()) if len(rr) else None,'src',(ss.min(),ss.max()) if len(ss) else None)
    if out:
        v=np.zeros((946,2206,3),np.uint8); v[...,2]=R*255; v[...,1]=Sm*255
        cv2.imwrite(f'{out}/sil{f}.jpg',v[Y0:Y1,X0:X1])
L.close()
