import cv2, sys, numpy as np
# srcstrip.py n0 n1 step x0 y0 x1 y1 out [cols] [tw]
n0,n1,st=map(int,sys.argv[1:4]); x0,y0,x1,y1=map(int,sys.argv[4:8]); out=sys.argv[8]
cols=int(sys.argv[9]) if len(sys.argv)>9 else 8; tw=int(sys.argv[10]) if len(sys.argv)>10 else 240
d='/Users/computer/rootline/apprentice-film/snapshots/s20-rev1-src'
tiles=[]
for n in range(n0,n1+1,st):
    f=cv2.imread(f'{d}/n{n:04d}.png')[y0:y1,x0:x1]
    th=int(f.shape[0]*tw/f.shape[1]); f=cv2.resize(f,(tw,th),interpolation=cv2.INTER_AREA)
    cv2.putText(f,f"{n/25:.2f}",(4,16),0,0.5,(0,255,255),1); tiles.append(f)
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
rows=[np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,88])
