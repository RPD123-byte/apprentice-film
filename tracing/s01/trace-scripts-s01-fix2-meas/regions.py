# regions.py render.png ref.png : region mean/std (frame coords, t~0)
import cv2,numpy as np,sys
r=cv2.cvtColor(cv2.imread(sys.argv[1]),cv2.COLOR_BGR2GRAY).astype(float); g=cv2.cvtColor(cv2.imread(sys.argv[2]),cv2.COLOR_BGR2GRAY).astype(float)
R={'crown':(1040,560,1115,620),'headmid':(1000,640,1150,720),'headlow':(1000,730,1150,790),'cuff':(1010,800,1140,830),'nape':(1000,835,1170,880),
 'hoodL':(905,600,945,700),'hoodR':(1210,600,1260,700),'wedgeR':(1272,670,1300,705),'sleeveR':(1260,570,1400,650),'upperR':(1230,730,1420,800),'sleeveL':(780,560,900,680),'upperL':(790,720,900,800),
 'lhand':(890,380,990,480),'rhand':(1090,455,1200,520),'chair':(850,850,1330,872),'deskL':(560,360,760,520),'deskR':(1330,420,1650,530),'left':(0,0,560,946),'right':(1780,0,2206,946),'floorBL':(150,800,450,946),
 'lamp':(1436,104,1555,212),'mug':(1437,322,1560,440),'spkR':(1508,148,1672,392),'spkL':(548,100,715,362),'frame':(0,0,2206,946)}
for k,(x0,y0,x1,y1) in R.items():
    a=r[y0:y1,x0:x1]; b=g[y0:y1,x0:x1]
    print(f"{k:9s} render {a.mean():6.1f} ({a.std():5.1f})  src {b.mean():6.1f} ({b.std():5.1f})  d={a.mean()-b.mean():+6.1f}")
