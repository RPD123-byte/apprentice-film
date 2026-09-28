#!/usr/bin/env python3
# pairs.py : drawing (d-KEY.png) vs source crop with a grid, for each head
import cv2, numpy as np, sys
D='/Users/computer/rootline/apprentice-film/snapshots/s25-fix2-dbg'
SPEC={'dive':(2521,640,300,900,540,2.2),'hov':(2553,880,230,1170,500,2.2),'hov2':(2562,880,240,1180,520,2.2),'vs2':(2540,1780,620,2060,840,2.2),
'vs3':(2543,1770,680,2000,880,2.4),'dash84':(2546,1480,590,1720,790,2.5),'eTR':(2528,1580,80,1790,260,3),'eSt':(2522,150,540,360,760,2.5)}
for key in sys.argv[1].split(','):
    f,x0,y0,x1,y1,sc=SPEC[key]; st=10
    s=cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s25-fix1-src/f{f:05d}.png')[y0:y1,x0:x1]; d=cv2.imread(f'{D}/d-{key}.png')[y0:y1,x0:x1]
    out=[]
    for im in (d,s):
        im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
        for x in range((x0//st+1)*st,x1,st):
            X=int((x-x0)*sc); c=(0,140,255) if x%(st*5)==0 else (0,60,120); cv2.line(im,(X,0),(X,im.shape[0]-1),c,1)
            if x%(st*5)==0: cv2.putText(im,str(x),(X+2,12),0,0.4,(0,255,255),1)
        for y in range((y0//st+1)*st,y1,st):
            Y=int((y-y0)*sc); c=(0,140,255) if y%(st*5)==0 else (0,60,120); cv2.line(im,(0,Y),(im.shape[1]-1,Y),c,1)
            if y%(st*5)==0: cv2.putText(im,str(y),(2,Y-2),0,0.4,(0,255,255),1)
        out.append(im)
    cv2.imwrite(f'{D}/hk-{key}.jpg', np.hstack([out[0], np.full((out[0].shape[0],6,3),(0,200,255),np.uint8), out[1]]))
