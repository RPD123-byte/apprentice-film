import cv2, glob, re, sys, numpy as np
# strip2.py dir x0 y0 x1 y1 out.jpg [cols] [scale]
d=sys.argv[1]; x0,y0,x1,y1=map(int,sys.argv[2:6]); out=sys.argv[6]; cols=int(sys.argv[7]) if len(sys.argv)>7 else 7; sc=float(sys.argv[8]) if len(sys.argv)>8 else 0.5
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
tiles=[]
for f in fs:
  t=re.search(r'at-([\d.]+)s',f).group(1)
  a=cv2.imread(f)[y0:y1,x0:x1]; b=cv2.imread(f.replace('frame-','ref-'))[y0:y1,x0:x1]
  if sc!=1: a=cv2.resize(a,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA); b=cv2.resize(b,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA)
  tile=np.vstack([a,np.full((3,a.shape[1],3),(0,0,255),np.uint8),b])
  cv2.putText(tile,t,(4,16),cv2.FONT_HERSHEY_SIMPLEX,0.5,(0,255,255),1)
  tile=np.pad(tile,((2,2),(2,2),(0,0)))
  tiles.append(tile)
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
rows=[np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,90])
