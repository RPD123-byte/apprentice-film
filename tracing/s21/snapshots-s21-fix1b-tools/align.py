# align.py RDIR key hw hh [search]: for each probe line on stdin, NCC-align a (2hw x 2hh) render window centred on the
# landmark `key` (e.g. cup, eye, head) inside the source (±search px); prints the source-minus-render offset
import cv2, numpy as np, sys, json
R,key,hw,hh=sys.argv[1],sys.argv[2],int(sys.argv[3]),int(sys.argv[4]); S=int(sys.argv[5]) if len(sys.argv)>5 else 8
SRC='/Users/computer/rootline/apprentice-film/snapshots/s21-r3-src'
g=lambda p: cv2.GaussianBlur(cv2.cvtColor(cv2.imread(p),cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),1.0)
res=[]
for l in sys.stdin:
    if not l.startswith('{'): continue
    d=json.loads(l); t=d['t']; cx,cy=map(int,map(round,d[key]))
    import os
    if not os.path.exists(f'{R}/r-{t:.2f}.png'): continue
    r=g(f'{R}/r-{t:.2f}.png'); s=g(f'{SRC}/f{round(t*25):04d}.png')
    tpl=r[cy-hh:cy+hh,cx-hw:cx+hw]; win=s[cy-hh-S:cy+hh+S,cx-hw-S:cx+hw+S]
    m=cv2.matchTemplate(win,tpl,cv2.TM_CCOEFF_NORMED); _,mv,_,ml=cv2.minMaxLoc(m)
    dx,dy=ml[0]-S,ml[1]-S
    # subpixel (parabola)
    def sub(a,b,c): return 0.5*(a-c)/(a-2*b+c) if (a-2*b+c)!=0 else 0
    x,y=ml
    if 0<x<m.shape[1]-1: dx+=sub(m[y,x-1],m[y,x],m[y,x+1])
    if 0<y<m.shape[0]-1: dy+=sub(m[y-1,x],m[y,x],m[y+1,x])
    res.append((t,dx,dy,mv)); print(f'{t:6.2f} {key} ({cx},{cy})  d=({dx:+5.1f},{dy:+5.1f})  ncc {mv:.2f}')
a=np.array(res); w=a[:,3]>0.5
if w.any(): print('mean (ncc>0.5): d=(%+.1f, %+.1f)'%(a[w,1].mean(),a[w,2].mean()))
