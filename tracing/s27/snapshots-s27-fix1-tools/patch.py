# compare median colours of named patches: render png vs source frame.  patch.py render.png T
import cv2, sys, numpy as np
from src import frame
R=cv2.imread(sys.argv[1]); t=float(sys.argv[2]); S=frame(t)
P={'cheek':(700,440,740,470),'face_lo':(720,480,760,500),'side':(605,470,622,560),'arm':(700,625,760,645),'hand':(850,620,940,660),
'shoulder':(150,330,300,420),'crown':(800,130,880,200),'cuff':(900,260,960,330),'hair':(650,262,850,300),'cup':(520,480,580,560),
'sleeveR':(970,600,1020,680),'sleeveL':(650,700,750,800),'jacketLo':(100,600,300,800),'desk':(1100,850,1300,900),'wall':(1300,250,1500,350)}
if len(sys.argv)>3: P={k:v for k,v in P.items() if k in sys.argv[3].split(',')}
for k,(x0,y0,x1,y1) in P.items():
    r=np.median(R[y0:y1,x0:x1].reshape(-1,3),0)[::-1]; s=np.median(S[y0:y1,x0:x1].reshape(-1,3),0)[::-1]
    print(f"{k:9s} render {r.astype(int)}  source {s.astype(int)}  diff {(s-r).astype(int)}")
