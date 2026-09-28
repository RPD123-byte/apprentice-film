import cv2, numpy as np, sys, re
# pair.py DIR n x0 y0 x1 y1 [scale] [--reg] -> ../s18-fix2-pairs/<tag>  (render left/top, source right/bottom)
args=[x for x in sys.argv[1:] if not x.startswith('--')]; reg='--reg' in sys.argv
d=args[0]; n=int(args[1]); x0,y0,x1,y1=map(int,args[2:6]); sc=float(args[6]) if len(args)>6 else 1.0
if reg:
    txt=open('../../src/shots/s18/shotA.js').read(); PATH=eval(re.search(r'PATH_A = (\[.*?\]);', txt, re.S).group(1)); P={r[0]:(r[1],r[2]) for r in PATH}
    dx,dy=P[n]; x0+=dx;x1+=dx;y0+=dy;y1+=dy
r=cv2.imread('%s/r%d.png'%(d,n)); s=cv2.imread('../s18-fix2-src/f%04d.png'%n)
a=r[y0:y1,x0:x1]; b=s[y0:y1,x0:x1]
if sc!=1: a=cv2.resize(a,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA if sc<1 else cv2.INTER_CUBIC); b=cv2.resize(b,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA if sc<1 else cv2.INTER_CUBIC)
if (x1-x0)>(y1-y0)*1.3: out=np.vstack([a,np.full((4,a.shape[1],3),(0,0,255),np.uint8),b])
else: out=np.hstack([a,np.full((a.shape[0],4,3),(0,0,255),np.uint8),b])
cv2.putText(out,'%d'%n,(6,20),cv2.FONT_HERSHEY_SIMPLEX,0.6,(0,0,255),2)
import os; os.makedirs('../s18-fix2-pairs',exist_ok=True)
p='../s18-fix2-pairs/%s_p%d_%d_%d.jpg'%(d.replace('/','_'),n,x0,y0); cv2.imwrite(p,out,[cv2.IMWRITE_JPEG_QUALITY,92]); print(p)
