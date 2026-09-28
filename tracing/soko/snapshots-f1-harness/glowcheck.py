# glowcheck.py: our JS addScreenGlow vs the source finish pass formula (finish2.py) applied to the same pre-grade frame
import sys, cv2, numpy as np
sys.path.insert(0,'.')
from run import Lab, build
build('entry_dev.js','bundle_dev.js')
L=Lab('hd.html')
res={}
for glow in (0,1):
    res[glow]=L.png('''async (o) => { const {S, HP}=F1; const c=document.createElement('canvas'); c.width=2206; c.height=946; const g=c.getContext('2d');
      const pc=S.sokoPageCanvas({gaze:'down', header: !o.b});
      S.drawFramedPage(g, pc, { glow: o.glow, over: o.b ? (x) => { x.save(); S.framedTransform(x); HP.drawHippieBanner(x); x.restore(); } : null }); return c; }''', {'glow':glow,'b':len(sys.argv)>1})[...,:3].astype(np.float32)
L.close()
A,B=res[0],res[1]
H,W=A.shape[:2]
x0,y0,x1,y1=137,121.5,2030,946   # FRAMED.glowRect
inside=np.zeros((H,W),np.float32); inside[int(np.ceil(y0)):int(y1),x0:x1]=1
outside=(1-cv2.GaussianBlur(inside,(0,0),10))[...,None]
sm=cv2.resize(A*inside[...,None],(W//8,H//8),interpolation=cv2.INTER_AREA); gl=0.6*cv2.GaussianBlur(sm,(0,0),7)+0.4*cv2.GaussianBlur(sm,(0,0),26)
gl=np.minimum(cv2.resize(gl,(W,H),interpolation=cv2.INTER_CUBIC)*4.5,120)
P=A+gl*outside
dB=(B-A).mean(2); dP=(P-A).mean(2)
for nm,(a,b,c,d) in {'top band':(300,60,1900,118),'left margin':(20,200,135,900),'right margin':(2032,200,2190,900),'top-left corner':(20,20,135,118)}.items():
    print(f'{nm}: JS glow {dB[b:d,a:c].mean():.2f}  finish2 {dP[b:d,a:c].mean():.2f}')
print('JS glow profile y @x 600-1600:', ' '.join(f'{y}:{dB[y,600:1600].mean():.1f}/{dP[y,600:1600].mean():.1f}' for y in (10,40,70,100,115,119,121,124)))
print('x profile @y 300-800:', ' '.join(f'{x}:{dB[300:800,x].mean():.1f}/{dP[300:800,x].mean():.1f}' for x in (5,40,80,120,135,138,2028,2032,2060,2120,2200)))
