#!/usr/bin/env python3
# regions.py renderdir t1 t2 ... : blurred(σ3) region means render vs source for the room objects
import cv2, numpy as np, sys
D='/Users/computer/rootline/apprentice-film/snapshots/s20-fix1b3-src'
R={'woofer':(290,290,540,540),'coil':(0,430,360,570),'plant':(620,0,800,230),'backstack':(1150,110,1300,650),'bigstack':(1509,70,1760,620),
   'bench':(1790,120,2206,450),'floor':(1330,850,1800,946),'synthpanel':(1450,630,2040,735),'port':(420,660,600,840),'crate':(170,560,456,946),'sidepanel':(606,60,730,860),'case':(140,0,300,470)}
rd=sys.argv[1]
for t in sys.argv[2:]:
    fr=int(round(float(t)*25)); s=cv2.GaussianBlur(cv2.imread(f'{D}/f_{fr}.png',0).astype(np.float32),(0,0),3); r=cv2.GaussianBlur(cv2.imread(f'{rd}/r_{float(t):.2f}.png',0).astype(np.float32),(0,0),3)
    out=[]
    for k,(x0,y0,x1,y1) in R.items(): out.append(f'{k} {s[y0:y1,x0:x1].mean():.0f}/{r[y0:y1,x0:x1].mean():.0f} ({np.abs(s[y0:y1,x0:x1]-r[y0:y1,x0:x1]).mean():.0f})')
    print(t,' | '.join(out))
