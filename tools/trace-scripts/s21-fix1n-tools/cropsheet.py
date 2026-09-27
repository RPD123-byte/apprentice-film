import cv2, glob, re, sys, numpy as np
# cropsheet.py dir out.jpg t0 t1 x0 y0 x1 y1 scale cols
d,out=sys.argv[1],sys.argv[2]; t0,t1=float(sys.argv[3]),float(sys.argv[4]); x0,y0,x1,y1=map(int,sys.argv[5:9]); sc=float(sys.argv[9]); cols=int(sys.argv[10])
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
tiles=[]
for f in fs:
    t=float(re.search(r'at-([\d.]+)s',f).group(1))
    if t<t0-1e-6 or t>t1+1e-6: continue
    a=cv2.imread(f)[y0:y1,x0:x1]; b=cv2.imread(f.replace('frame-','ref-'))[y0:y1,x0:x1]
    a=cv2.resize(a,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA if sc<1 else cv2.INTER_CUBIC); b=cv2.resize(b,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA if sc<1 else cv2.INTER_CUBIC)
    im=np.vstack([a,np.full((3,a.shape[1],3),(0,0,160),np.uint8),b])
    cv2.putText(im,f"{t:.2f}",(4,16),cv2.FONT_HERSHEY_SIMPLEX,0.5,(0,0,255),1)
    im=cv2.copyMakeBorder(im,0,6,0,6,cv2.BORDER_CONSTANT,value=(60,60,60))
    tiles.append(im)
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
rows=[np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,88]); print(len(tiles))
