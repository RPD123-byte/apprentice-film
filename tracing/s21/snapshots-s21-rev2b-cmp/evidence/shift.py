# per-frame best integer shift (render -> source) of the owl window, NCC on σ1.5-blurred gray, search ±24 px
import cv2,numpy as np,sys
exec(open('s21-rev2b-v/owlsheet.py').read().split('tiles=[]')[0].split('step=int')[0])
src=open('s21-rev2b-v/owlsheet.py').read()
ns={}
exec(src[src.index('def interp'):src.index('tiles=[]')],ns)
win=ns['win']
def g(p): return cv2.GaussianBlur(cv2.cvtColor(cv2.imread(p),cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),1.5)
step=int(sys.argv[1]) if len(sys.argv)>1 else 2
for f in range(1736,1863,step):
    t=f/25; x0,y0,x1,y1=win(t); x0=max(x0,0);y0=max(y0,0);x1=min(x1,2206);y1=min(y1,946)
    R=g(f's21-rev2b-h/r-{t:.2f}.png'); S=g(f's21-rev2-src/f{f:04d}.png')
    P=24
    tpl=R[y0+P if y0==0 else y0:y1,x0:x1] if False else R[y0:y1,x0:x1]
    # search: place render window in source with offset
    Sx0,Sy0=max(0,x0-P),max(0,y0-P); Sx1,Sy1=min(2206,x1+P),min(946,y1+P)
    # restrict template to fully-inside part
    res=cv2.matchTemplate(S[Sy0:Sy1,Sx0:Sx1],tpl,cv2.TM_CCOEFF_NORMED)
    _,mv,_,ml=cv2.minMaxLoc(res)
    dx=ml[0]+Sx0-x0; dy=ml[1]+Sy0-y0
    r0=res[y0-Sy0,x0-Sx0] if 0<=y0-Sy0<res.shape[0] and 0<=x0-Sx0<res.shape[1] else float('nan')
    print(f'{t:.2f} win({x0},{y0},{x1},{y1}) best dx={dx:+d} dy={dy:+d} ncc={mv:.3f} ncc@0={r0:.3f}')
