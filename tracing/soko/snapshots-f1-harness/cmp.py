# cmp.py OUT [--page] [--box x0,y0,x1,y1,scale ...] : render the DEV illustration, pair crops with the source plate
import sys, time, cv2, numpy as np, argparse
sys.path.insert(0,'.')
from run import Lab, build
from common import *
ap=argparse.ArgumentParser(); ap.add_argument('out'); ap.add_argument('--page',action='store_true'); ap.add_argument('--box',nargs='*',default=[])
ap.add_argument('--gaze',default='owl'); ap.add_argument('--nograde',action='store_true'); ap.add_argument('--soft',type=float,default=0.65); ap.add_argument('--dbg',default='')
a=ap.parse_args()
build('entry_dev.js','bundle_dev.js')
open('hd.html','w').write(open('h.html').read().replace('bundle.js','bundle_dev.js'))
L=Lab('hd.html')
if a.dbg: L.js('(d) => { globalThis.__F1DBG = d; }', a.dbg)
t0=time.time()
fn = '''async (o) => { const {S,I}=F1; const c=document.createElement('canvas'); c.width=2206; c.height=946; const g=c.getContext('2d'); g.fillStyle='#000'; g.fillRect(0,0,2206,946);
  const T=performance.now();
  if (o.page) g.drawImage(S.sokoPageCanvas({gaze:o.gaze, soft:o.soft}),0,0); else { const k=I.sokoIllCanvas({gaze:o.gaze}); I.blurCanvas(k, o.soft); g.drawImage(k,0,0); }
  window.__ms = performance.now()-T; return c; }'''
raw=L.png(fn,{'page':a.page,'gaze':a.gaze,'soft':a.soft})[...,:3]
ms=L.js('() => window.__ms')
L.close()
print(f'build {ms:.0f} ms')
cv2.imwrite(f'../f1-p3/{a.out}_raw.png', raw)
gr=grade(raw.astype(np.float32),50.0).astype(np.uint8)
cv2.imwrite(f'../f1-p3/{a.out}_g.png', gr)
SG=cv2.imread('../f1-p3/clean_g.png'); SU=cv2.imread('../f1-p3/clean_u.png')
ru=gray(raw).astype(np.float32); su=gray(SU).astype(np.float32)
def mae(x0,y0,x1,y1,s):
    A=cv2.GaussianBlur(ru,(0,0),s)[y0:y1,x0:x1]; B=cv2.GaussianBlur(su,(0,0),s)[y0:y1,x0:x1]; return np.abs(A-B).mean(), (A-B).mean()
m6=mae(0,0,2206,946,6)
gg=cv2.GaussianBlur(gray(gr).astype(np.float32),(0,0),6); sgg=cv2.GaussianBlur(gray(SG).astype(np.float32),(0,0),6)
print(f'full pre-grade sigma6 MAE {m6[0]:.2f} bias {m6[1]:+.2f} | graded sigma6 MAE {np.abs(gg-sgg).mean():.2f}, designer {np.abs(gg-sgg)[150:900,900:1300].mean():.2f}')
for bx in a.box:
    x0,y0,x1,y1,s=[float(v) for v in bx.split(',')]; x0,y0,x1,y1=int(x0),int(y0),int(x1),int(y1)
    A=gr[y0:y1,x0:x1]; B=SG[y0:y1,x0:x1]
    im=np.hstack([A,np.full((A.shape[0],4,3),(0,0,255),np.uint8),B]) if (x1-x0)<(y1-y0)*1.6 else np.vstack([A,np.full((4,A.shape[1],3),(0,0,255),np.uint8),B])
    im=cv2.resize(im,None,fx=s,fy=s,interpolation=cv2.INTER_CUBIC)
    nm=f'../f1-p3/{a.out}_{x0}_{y0}.jpg'; cv2.imwrite(nm,im,[cv2.IMWRITE_JPEG_QUALITY,92])
    e2=mae(x0,y0,x1,y1,2); e6=mae(x0,y0,x1,y1,6)
    print(f'box {x0},{y0},{x1},{y1}: s2 {e2[0]:.2f} ({e2[1]:+.2f})  s6 {e6[0]:.2f} ({e6[1]:+.2f})  -> {nm}')
