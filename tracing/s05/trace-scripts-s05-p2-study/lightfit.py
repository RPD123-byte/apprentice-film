import sys; sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s05/trace')
import numpy as np,cv2,frames,glob,re,math
H,W=946,2206
M=dict(np.load('cache/masks.npz'))
ev=np.ones((H,W),np.uint8); cv2.fillPoly(ev,[np.array([[315,246],[834,168],[898,519],[409,648]])],0); ev=cv2.erode(ev,np.ones((41,41),np.uint8))>0
ev&=~(cv2.dilate((M['rh']|M['arm']|M['rhB']|M['armB']).astype(np.uint8),np.ones((121,121),np.uint8))>0)
x=np.arange(W,dtype=np.float32); w=np.where(x<1250,1,np.where(x>1700,0.2,1-0.8*(x-1250)/450))[None,:].repeat(H,0)
k=lambda a: cv2.GaussianBlur(a,(0,0),6)
out=[]
for f in sorted(glob.glob('../s05-p2-proj/outallu/frame-*.png'),key=lambda p: float(re.search(r'at-(\d+\.\d+)s',p).group(1))):
  P=float(re.search(r'at-(\d+\.\d+)s',f).group(1))-10; P=math.floor(P*25+1e-6)/25; kf=578+round(P*25)
  r=k(cv2.imread(f).astype(np.float32).mean(2)/255); s=k(frames.pre(kf).mean(2))
  sel=ev[::3,::3]; R=r[::3,::3][sel]; S=s[::3,::3][sel]; Wv=w[::3,::3][sel]
  # s = r*(g0 + A*w): least squares for g0, A
  Am=np.stack([R, R*Wv],1); g0,A=np.linalg.lstsq(Am,S,rcond=None)[0]
  # also fit with g0 fixed = 1
  A1=((S-R)*R*Wv).sum()/((R*Wv)**2).sum()
  out.append((kf/25,g0,A,A1)); print(f'{kf/25:.2f} g0 {g0:.3f} A {A:+.3f}  (g0=1: A {A1:+.3f})')
