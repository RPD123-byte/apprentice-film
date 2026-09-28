#!/usr/bin/env python3
# tile.py out.jpg x0 y0 x1 y1 scale cols fr1 fr2 ... ; items may be 'r:path.png' (render) ; labels on each tile; grid lines every 50/100 px
import cv2, sys, numpy as np
D='/Users/computer/rootline/apprentice-film/snapshots/s20-fix2-src'
out=sys.argv[1]; x0,y0,x1,y1=map(int,sys.argv[2:6]); sc=float(sys.argv[6]); cols=int(sys.argv[7]); items=sys.argv[8:]
grid='--grid' in items; items=[i for i in items if i!='--grid']
tiles=[]
for it in items:
    if it.startswith('r:'): im=cv2.imread(it[2:]); lab=it.split('/')[-1]
    else: im=cv2.imread(f'{D}/f_{it}.png'); lab=f'src {it} t={int(it)/25:.2f}'
    im=im[y0:y1,x0:x1].copy()
    if grid:
        for x in range((x0//100+1)*100,x1,100): cv2.line(im,(x-x0,0),(x-x0,y1-y0),(0,0,255) if x%500==0 else (0,140,255),1)
        for y in range((y0//100+1)*100,y1,100): cv2.line(im,(0,y-y0),(x1-x0,y-y0),(0,0,255) if y%500==0 else (0,140,255),1)
    im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA if sc<1 else cv2.INTER_CUBIC)
    if grid:
        for x in range((x0//100+1)*100,x1,100): cv2.putText(im,str(x),(int((x-x0)*sc)+2,12),0,0.4,(0,200,255),1)
        for y in range((y0//100+1)*100,y1,100): cv2.putText(im,str(y),(2,int((y-y0)*sc)-2),0,0.4,(0,200,255),1)
    cv2.putText(im,lab,(4,im.shape[0]-6),0,0.5,(0,255,0),1)
    tiles.append(im)
h,w=tiles[0].shape[:2]
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
rows=[np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,88])
