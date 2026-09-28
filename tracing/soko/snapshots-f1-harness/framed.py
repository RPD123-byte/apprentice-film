# framed.py OUT T [--header 0] [--banner] [--box ...] : drawFramedPage (dev libs) graded at t vs the source frame
import sys, cv2, numpy as np, argparse
sys.path.insert(0,'.')
from run import Lab, build
from common import *
ap=argparse.ArgumentParser(); ap.add_argument('out'); ap.add_argument('t',type=float); ap.add_argument('--header',type=int,default=1); ap.add_argument('--banner',action='store_true'); ap.add_argument('--box',nargs='*',default=[])
a=ap.parse_args()
build('entry_dev.js','bundle_dev.js')
open('hd.html','w').write(open('h.html').read().replace('bundle.js','bundle_dev.js'))
L=Lab('hd.html')
png=L.png('''async (o) => { const {S, createPost, HP}=F1; const c=document.createElement('canvas'); c.width=2206; c.height=946; const g=c.getContext('2d');
  g.fillStyle='#000'; g.fillRect(0,0,2206,946);
  const pc=S.sokoPageCanvas({gaze:'down', header: !!o.h});
  const T=performance.now(); S.drawFramedPage(g, pc, o.b ? { over: (x) => { x.save(); S.framedTransform(x); HP.drawHippieBanner(x); x.restore(); } } : {}); window.__ms=performance.now()-T;
  const out=document.getElementById('out'); const grade=createPost(out); grade(c, o.t, {fade:1, grain:0}); return out; }''', {'t':a.t,'h':a.header,'b':a.banner})
print('framed ms', L.js('() => window.__ms'))
L.close()
r=png[...,:3]; s=src(a.t)
cv2.imwrite(f'../f1-p3/{a.out}_fr.png', r)
A=cv2.GaussianBlur(gray(r).astype(np.float32),(0,0),6); B=cv2.GaussianBlur(gray(s).astype(np.float32),(0,0),6)
print('graded sigma6 MAE full %.2f'%np.abs(A-B).mean())
for nm,(x0,y0,x1,y1) in {'top band':(300,60,1900,125),'left margin':(20,200,140,900),'right margin':(2030,200,2190,900),'top-left corner':(20,20,140,125),'top-right corner':(2030,20,2190,125)}.items():
    print(f'{nm}: ours {A[y0:y1,x0:x1].mean():.1f} src {B[y0:y1,x0:x1].mean():.1f}')
print('profile y (x 600-1600):', ' '.join(f'{y}:{A[y,600:1600].mean():.0f}/{B[y,600:1600].mean():.0f}' for y in (20,50,80,100,116,126)))
print('profile x (y 300-800):', ' '.join(f'{x}:{A[300:800,x].mean():.0f}/{B[300:800,x].mean():.0f}' for x in (10,40,70,100,125,140, 2035,2060,2100,2150,2195)))
for bx in a.box:
    x0,y0,x1,y1,sc=[float(v) for v in bx.split(',')]; x0,y0,x1,y1=int(x0),int(y0),int(x1),int(y1)
    im=np.vstack([r[y0:y1,x0:x1],np.full((4,x1-x0,3),(0,0,255),np.uint8),s[y0:y1,x0:x1]])
    cv2.imwrite(f'../f1-p3/{a.out}_{x0}_{y0}.jpg',cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA if sc<1 else cv2.INTER_CUBIC),[cv2.IMWRITE_JPEG_QUALITY,90])
