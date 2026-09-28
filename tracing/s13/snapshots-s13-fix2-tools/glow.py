# glow.py DIR frame : mean screen value in distance bands outside the lit silhouette (render vs source), x > 600 and x < 600
import cv2, numpy as np, sys
S='/Users/computer/rootline/apprentice-film/snapshots/s13-w3-src'; d,f=sys.argv[1],sys.argv[2]
r=cv2.imread(f'{d}/r{f}.png',0).astype(np.float32); s=cv2.imread(f'{S}/f{f}.png',0).astype(np.float32)
lit=(cv2.GaussianBlur(s,(0,0),1)>70).astype(np.uint8)
# keep only the big owl blob
n,lab,st,_=cv2.connectedComponentsWithStats(lit); k=1+np.argmax(st[1:,cv2.CC_STAT_AREA]); lit=(lab==k).astype(np.uint8)
dist=cv2.distanceTransform(1-lit,cv2.DIST_L2,5)
for a,b in [(1,3),(3,6),(6,10),(10,15),(15,25),(25,40),(40,80),(80,160),(160,300)]:
    m=(dist>=a)&(dist<b)
    print(f'{a:3d}-{b:3d}px  R {r[m].mean():6.2f}  S {s[m].mean():6.2f}  diff {r[m].mean()-s[m].mean():+5.2f}')
m=np.zeros_like(lit,bool); m[:, :600]=True; m&=dist>40
print('far left bg  R %.2f S %.2f'%(r[m].mean(), s[m].mean()))
