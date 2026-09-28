import cv2, glob, re, sys, numpy as np
d=sys.argv[1]; x0,y0,x1,y1=map(int,sys.argv[2:6]); out=sys.argv[6]; sc=float(sys.argv[7]) if len(sys.argv)>7 else 1.0
cols=int(sys.argv[8]) if len(sys.argv)>8 else 1
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
tiles=[]
for f in fs:
    t=re.search(r'at-([\d.]+)s',f).group(1)
    r=f.replace('frame-','ref-')
    a=cv2.imread(f)[y0:y1,x0:x1]; b=cv2.imread(r)[y0:y1,x0:x1]
    im=np.hstack([a,np.full((a.shape[0],4,3),(0,0,255),np.uint8),b])
    im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA if sc<1 else cv2.INTER_CUBIC)
    cv2.putText(im,t+'s  render | source',(6,22),cv2.FONT_HERSHEY_SIMPLEX,0.7,(0,255,255),2)
    tiles.append(im)
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
rows=[np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,90]); print(out)
