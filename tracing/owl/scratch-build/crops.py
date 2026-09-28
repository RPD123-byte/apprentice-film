import cv2, glob, re, sys, numpy as np
# crops.py dir out.jpg x0 y0 x1 y1 scale [tmin tmax] [cols]
d,out=sys.argv[1],sys.argv[2]; x0,y0,x1,y1=[int(v) for v in sys.argv[3:7]]; sc=float(sys.argv[7])
tmin=float(sys.argv[8]) if len(sys.argv)>8 else 0; tmax=float(sys.argv[9]) if len(sys.argv)>9 else 999
cols=int(sys.argv[10]) if len(sys.argv)>10 else 1
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
tiles=[]
for f in fs:
    t=float(re.search(r'at-([\d.]+)s',f).group(1))
    if t<tmin or t>tmax: continue
    r=cv2.imread(f)[y0:y1,x0:x1]; s=cv2.imread(f.replace('frame-','ref-'))[y0:y1,x0:x1]
    r=cv2.resize(r,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC); s=cv2.resize(s,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
    sep=np.full((r.shape[0],4,3),(0,0,255),np.uint8)
    im=np.hstack([r,sep,s]); cv2.putText(im,f"{t:.2f} R | S",(6,22),0,0.7,(0,255,255),2)
    tiles.append(im)
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
rows=[np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,88]); print(out,len(tiles))
