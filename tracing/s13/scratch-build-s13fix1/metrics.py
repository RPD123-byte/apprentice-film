# metrics.py dir [dir2 ...]: per pair blurred MAE, IoU, region means (render-source)
import cv2, glob, re, sys, numpy as np
REG = {'undercup':(1400,380,1560,445),'cushion':(1380,190,1430,390),'plate':(1485,220,1540,340),'cheekL':(900,420,1000,520),
 'nub':(820,280,905,460),'chest':(950,480,1100,720),'flank':(1480,560,1680,760),'feet':(1150,860,1600,946),'tail':(1620,650,1830,946),
 'beak':(1000,395,1120,515),'crown':(1050,30,1400,130),'wing':(1650,250,2100,720),'slider':(1440,50,1530,210),'face':(1000,200,1350,450)}
for d in sys.argv[1:]:
    fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
    tot=[]
    for f in fs:
        t=re.search(r'at-([\d.]+)s',f).group(1); r=f.replace('frame-','ref-')
        A=cv2.imread(f,0).astype(np.float32); B=cv2.imread(r,0).astype(np.float32)
        Ab=cv2.GaussianBlur(A,(0,0),8); Bb=cv2.GaussianBlur(B,(0,0),8)
        mae=np.abs(Ab-Bb).mean(); tot.append(mae)
        ma=A>60; mb=B>60; iou=(ma&mb).sum()/max(1,(ma|mb).sum())
        hp=lambda I: np.abs(I-cv2.GaussianBlur(I,(0,0),2))
        s=' '.join(f"{k}:{A[y0:y1,x0:x1].mean()-B[y0:y1,x0:x1].mean():+.0f}" for k,(x0,y0,x1,y1) in REG.items())
        print(f"t={t} MAE={mae:.2f} IoU={iou:.3f} hp={hp(A)[0:946,850:2110].mean():.1f}/{hp(B)[0:946,850:2110].mean():.1f} | {s}")
    print(d,'mean MAE',np.mean(tot))
