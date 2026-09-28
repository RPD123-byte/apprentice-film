# edge energy of the designer in the pans: render (desbK candidates) vs source
import sys, json, numpy as np, cv2
from run import Lab, src, mae
cam=None
L=Lab()
fr=[int(x) for x in sys.argv[1].split(',')]; ks=[float(x) for x in sys.argv[2].split(',')]
def camat(f):
    return L.js('(f)=>{return null}',f)
def sob(im,box):
    g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY).astype(np.float32)
    x0,y0,x1,y1=box; g=g[y0:y1,x0:x1]
    if g.size==0: return 0
    gx=cv2.Sobel(g,cv2.CV_32F,1,0); gy=cv2.Sobel(g,cv2.CV_32F,0,1); return float(np.mean(np.hypot(gx,gy)))
for f in fr:
    s=src(f)
    # designer mask: render desOnly (ungraded) and threshold its alpha-ish brightness
    L.js('(o)=>window.__labset(o)',{'only':{'chars':True,'desOnly':True},'desbK':0})
    d,_=L.frame(f,False)
    L.js('(o)=>window.__labset(o)',{'only':None})
    m=(cv2.cvtColor(d,cv2.COLOR_BGR2GRAY)>20).astype(np.uint8)
    m=cv2.erode(m,np.ones((9,9),np.uint8))
    ys,xs=np.nonzero(m)
    if len(xs)<1000: print(f,'no designer'); continue
    box=(int(np.percentile(xs,2)),int(np.percentile(ys,2)),int(np.percentile(xs,98)),int(np.percentile(ys,98)))
    row=[f, 'src %.1f'%sob(s,box)]
    for k in ks:
        L.js('(o)=>window.__labset(o)',{'desbK':k})
        r,_=L.frame(f,True)
        row.append('k%.1f %.1f/%.2f'%(k,sob(r,box),mae(r,s)[0]))
    L.js('(o)=>window.__labset(o)',{'desbK':None})
    print(*row, box, flush=True)
L.close()
