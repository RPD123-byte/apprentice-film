# crop.py DIR x0 y0 x1 y1 out.jpg [--scale s] : stacks render|ref crops for every frame in DIR
import cv2, glob, re, sys, numpy as np
d=sys.argv[1]; x0,y0,x1,y1=map(int,sys.argv[2:6]); out=sys.argv[6]
sc=float(sys.argv[sys.argv.index('--scale')+1]) if '--scale' in sys.argv else 1.0
only=sys.argv[sys.argv.index('--only')+1].split(',') if '--only' in sys.argv else None
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
rows=[]
for f in fs:
    t=re.search(r'at-([\d.]+)s',f).group(1)
    if only and not any(abs(float(t)-float(o))<1e-3 for o in only): continue
    r=f.replace('frame-','ref-')
    a=cv2.imread(f)[y0:y1,x0:x1]; b=cv2.imread(r)[y0:y1,x0:x1]
    row=np.hstack([a,np.full((a.shape[0],4,3),(0,200,255),np.uint8),b])
    if sc!=1: row=cv2.resize(row,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA)
    cv2.putText(row,t,(4,18),0,0.6,(0,255,255),2)
    rows.append(row); rows.append(np.full((3,row.shape[1],3),(0,200,255),np.uint8))
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,90]); print(out,len(rows)//2)
