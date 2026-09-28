# pairs.py RDIR OUT.jpg t1,t2,.. x0 y0 x1 y1 [scale] [cols] -> mosaic of (render | source) crops
import cv2, numpy as np, sys
R,out,ts=sys.argv[1],sys.argv[2],sys.argv[3]; x0,y0,x1,y1=map(int,sys.argv[4:8])
sc=float(sys.argv[8]) if len(sys.argv)>8 else 2; cols=int(sys.argv[9]) if len(sys.argv)>9 else 2
SRC='/Users/computer/rootline/apprentice-film/snapshots/s21-r3-src'
tiles=[]
for t in ts.split(','):
    t=float(t); f=round(t*25)
    a=cv2.imread(f'{R}/r-{t:.2f}.png'); b=cv2.imread(f'{SRC}/f{f:04d}.png')
    im=np.hstack([a[y0:y1,x0:x1],np.full((y1-y0,3,3),(0,160,255),np.uint8),b[y0:y1,x0:x1]])
    im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
    cv2.putText(im,f'{t:.2f}',(6,22),cv2.FONT_HERSHEY_SIMPLEX,0.65,(0,255,255),2); tiles.append(im)
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
rows=[np.hstack([np.pad(x,((2,2),(2,2),(0,0))) for x in tiles[i:i+cols]]) for i in range(0,len(tiles),cols)]
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,90])
