# usage: cmp.py RDIR frames... [--crop x0 y0 x1 y1] [--out file] [--w W]  -> render|source stacked vertically per frame; prints sigma8 MAE
import cv2, sys, numpy as np
a=sys.argv[1:]; rd=a[0]; rest=a[1:]
crop=None; out=None; W=1600; cols=1
def take(flag,n):
    global rest
    if flag in rest:
        i=rest.index(flag); v=rest[i+1:i+1+n]; rest=rest[:i]+rest[i+1+n:]; return v
    return None
c=take('--crop',4); o=take('--out',1); w=take('--w',1); hz=take('--h',0)
if c: crop=list(map(int,c))
if o: out=o[0]
if w: W=int(w[0])
tiles=[]; scores=[]
for s in rest:
    f=int(round(float(s)*25)) if '.' in s else int(s)
    r=cv2.imread(f'{rd}/r-{f:05d}.png'); src=cv2.imread(f'src/f{f:05d}.png')
    if r is None: print('missing',f); continue
    if crop: x0,y0,x1,y1=crop; r=r[y0:y1,x0:x1]; src=src[y0:y1,x0:x1]
    gr=cv2.GaussianBlur(cv2.cvtColor(r,cv2.COLOR_BGR2GRAY).astype(float),(0,0),8); gs=cv2.GaussianBlur(cv2.cvtColor(src,cv2.COLOR_BGR2GRAY).astype(float),(0,0),8)
    e=np.abs(gr-gs).mean(); scores.append(e)
    print(f'{f} {f/25:.2f} s8MAE {e:.2f} mean r {gr.mean():.1f} s {gs.mean():.1f}')
    t=np.hstack([r,src]) if hz is not None else np.vstack([r,src])
    cv2.putText(t,f'{f/25:.2f}',(10,40),cv2.FONT_HERSHEY_SIMPLEX,1.2,(0,255,255),2)
    tiles.append(t)
if scores: print('mean', np.mean(scores).round(2))
if out and tiles:
    im=np.vstack(tiles) if hz is not None else np.hstack(tiles)
    sc=W/im.shape[1]; im=cv2.resize(im,(W,int(im.shape[0]*sc)),interpolation=cv2.INTER_AREA)
    cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,90])
