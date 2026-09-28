# heads.py RDIR OUT t1,t2,... [half=34] [scale=6] [cols=3]: head-centred crops (centre from probe json lines on stdin)
import cv2, numpy as np, sys, json
R,out,ts=sys.argv[1],sys.argv[2],sys.argv[3].split(',')
half=int(sys.argv[4]) if len(sys.argv)>4 else 34; sc=float(sys.argv[5]) if len(sys.argv)>5 else 6; cols=int(sys.argv[6]) if len(sys.argv)>6 else 3
L=[json.loads(l)['head'] for l in sys.stdin if l.startswith('{')]; C={round(float(t),2):L[i] for i,t in enumerate(ts)}
SRC='/Users/computer/rootline/apprentice-film/snapshots/s21-r3-src'; tiles=[]
for t in ts:
    t=float(t); f=round(t*25); cx,cy=map(int,map(round,C[round(t,2)]))
    a=cv2.imread(f'{R}/r-{t:.2f}.png'); b=cv2.imread(f'{SRC}/f{f:04d}.png')
    x0,y0=max(0,cx-half),max(0,cy-half); x1,y1=x0+2*half,y0+2*half
    im=np.hstack([a[y0:y1,x0:x1],np.full((y1-y0,1,3),(0,160,255),np.uint8),b[y0:y1,x0:x1]])
    im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
    cv2.putText(im,f'{t:.2f}',(6,22),cv2.FONT_HERSHEY_SIMPLEX,0.65,(0,255,255),2); tiles.append(im)
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
rows=[np.hstack([np.pad(x,((2,2),(2,2),(0,0))) for x in tiles[i:i+cols]]) for i in range(0,len(tiles),cols)]
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,90])
