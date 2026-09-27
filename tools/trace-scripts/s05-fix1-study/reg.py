# reg.py frame.png ref.png  -> region mean luminance render/source for the reviewer's regions
import cv2, sys, numpy as np
f=cv2.cvtColor(cv2.imread(sys.argv[1]),cv2.COLOR_BGR2GRAY).astype(float); r=cv2.cvtColor(cv2.imread(sys.argv[2]),cv2.COLOR_BGR2GRAY).astype(float)
R={'beanie14-16':(1400,20,1650,150),'beanieR':(1650,150,1750,240),'lefthand':(600,720,720,800),'back':(1600,720,1900,900),'desk950':(950,420,1250,560),'face':(1300,240,1420,500),'owlhead':(1480,260,1660,440),'owlbody':(1480,450,1760,690),'cup':(1410,300,1500,430),'rhand':(900,620,1170,750),'cartonL':(0,105,230,470),'cartonM':(725,0,900,160),'kbd':(470,600,1000,760),'deskL':(0,700,400,946),'spkC':(1147,203,1320,505),'spkL':(65,330,212,830),'torso':(1250,720,1540,946),'arm':(1180,640,1480,780),'frame':(0,0,2206,946)}
k=int(sys.argv[3]) if len(sys.argv)>3 else 0
if k: f=cv2.blur(f,(k,k)); r=cv2.blur(r,(k,k))
for n,(x0,y0,x1,y1) in R.items():
    a=f[y0:y1,x0:x1]; b=r[y0:y1,x0:x1]
    print(f'{n:12s} render {a.mean():6.1f} src {b.mean():6.1f}  d {a.mean()-b.mean():+6.1f}  mae(blur9) {np.abs(cv2.blur(a,(9,9))-cv2.blur(b,(9,9))).mean():5.1f}  std {a.std():5.1f}/{b.std():5.1f}')
