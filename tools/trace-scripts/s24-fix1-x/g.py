# usage: g.py K out.jpg [x0 y0 x1 y1] [--step S] [--z Z] [--r render.png]  gridded source frame k (optionally render stacked above)
import cv2, sys, numpy as np
a=sys.argv[1:]
def opt(n,d):
    global a
    if n in a: i=a.index(n); v=a[i+1]; del a[i:i+2]; return v
    return d
step=int(opt('--step','100')); z=float(opt('--z','1')); rp=opt('--r',None)
k=int(a[0]); out=a[1]
S=cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/s24-rev1-src/f_%05d.png'%(k+20))
ims=[S] if rp is None else [cv2.imread(rp),S]
x0,y0,x1,y1=(0,0,S.shape[1],S.shape[0]) if len(a)<6 else map(int,a[2:6])
res=[]
for f in ims:
    f=f.copy()
    for x in range(0,f.shape[1],step):
        cv2.line(f,(x,0),(x,f.shape[0]),(0,200,255) if x%500 else (0,0,255),1); cv2.putText(f,str(x),(x+2,y0+14 if y0<f.shape[0] else 14),0,0.45,(0,255,255),1)
    for y in range(0,f.shape[0],step):
        cv2.line(f,(0,y),(f.shape[1],y),(0,200,255) if y%500 else (0,0,255),1); cv2.putText(f,str(y),(x0+2,y-3),0,0.45,(0,255,255),1)
    f=f[y0:y1,x0:x1]
    if z!=1: f=cv2.resize(f,None,fx=z,fy=z,interpolation=cv2.INTER_CUBIC)
    res.append(f)
o=res[0] if len(res)==1 else np.vstack([res[0],np.full((6,res[0].shape[1],3),(0,0,200),np.uint8),res[1]])
cv2.imwrite(out,o,[cv2.IMWRITE_JPEG_QUALITY,90])
