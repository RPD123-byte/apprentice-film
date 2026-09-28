# strip.py dir x0 y0 x1 y1 scale out t0 t1  -> rows: render / source tiles over time
import cv2, numpy as np, glob, re, sys
d=sys.argv[1]; x0,y0,x1,y1=map(int,sys.argv[2:6]); sc=float(sys.argv[6]); out=sys.argv[7]; t0=float(sys.argv[8]); t1=float(sys.argv[9])
fr=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
fr=[p for p in fr if t0-1e-6<=float(re.search(r'at-([\d.]+)s',p).group(1))<=t1+1e-6]
cols=int(sys.argv[10]) if len(sys.argv)>10 else 8
tiles=[]
for p in fr:
    t=re.search(r'at-([\d.]+)s',p).group(1)
    a=cv2.imread(p)[y0:y1,x0:x1]; b=cv2.imread(p.replace('frame-','ref-'))[y0:y1,x0:x1]
    a=cv2.resize(a,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA); b=cv2.resize(b,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA)
    tile=np.vstack([a,np.full((3,a.shape[1],3),255,np.uint8),b])
    cv2.putText(tile,t,(3,14),cv2.FONT_HERSHEY_SIMPLEX,0.45,(255,255,255),1)
    tile=np.pad(tile,((3,3),(3,3),(0,0)))
    tiles.append(tile)
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
rows=[np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,90]); print(out)
