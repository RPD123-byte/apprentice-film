import cv2, sys, numpy as np, glob, re
# regsheet.py dir x0 y0 x1 y1 out [scale] [cols] [tmin] [tmax]  -> grid of (render|source) crops over time, labelled
d=sys.argv[1]; x0,y0,x1,y1=map(int,sys.argv[2:6]); out=sys.argv[6]; sc=float(sys.argv[7]) if len(sys.argv)>7 else 0.5
cols=int(sys.argv[8]) if len(sys.argv)>8 else 3; tmin=float(sys.argv[9]) if len(sys.argv)>9 else -1; tmax=float(sys.argv[10]) if len(sys.argv)>10 else 1e9
fs=[]
for p in glob.glob(f'{d}/frame-*-at-*s.png'):
    t=float(re.search(r'at-([\d.]+)s',p).group(1))
    if tmin<=t<=tmax: fs.append((t,p,p.replace('/frame-','/ref-')))
fs.sort()
tiles=[]
for t,a,b in fs:
    A=cv2.imread(a)[y0:y1,x0:x1]; B=cv2.imread(b)[y0:y1,x0:x1]
    A=cv2.resize(A,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA); B=cv2.resize(B,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA)
    tile=np.hstack([A,np.full((A.shape[0],3,3),(0,0,255),np.uint8),B])
    tile=np.vstack([np.zeros((22,tile.shape[1],3),np.uint8),tile,np.full((6,tile.shape[1],3),40,np.uint8)])
    cv2.putText(tile,f'{t:.2f}  render | source',(4,16),cv2.FONT_HERSHEY_SIMPLEX,0.5,(0,255,255),1)
    tiles.append(tile)
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
rows=[np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,88]); print(out,np.vstack(rows).shape)
