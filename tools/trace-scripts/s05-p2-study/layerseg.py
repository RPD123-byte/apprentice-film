import sys; sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s05/trace')
import frames, numpy as np, cv2
S=frames.static_target().mean(2)
SETTLE = {'room': [0.0459, -1.30, -163.0, 51.1, 600, 300], 'desk': [0.0639, -2.99, -111.5, 74.9, 700, 650], 'fig': [0.0403, -0.65, 18.1, 26.2, 1650, 500], 'owl': [0.0182, -1.58, 47.9, 23.9, 1580, 440]}
def U(t):
  x=(t-23.12)/0.4; return 0 if x>=1 else (1-max(0,x))**1.85
def M(name,t):
  s_,r_,dx,dy,cx,cy=SETTLE[name]; u=U(t); s=1+s_*u; a=np.radians(r_*u)
  c,sn=np.cos(a)*s,np.sin(a)*s
  # p' = C + d + R S (p - C)
  A=np.array([[c,-sn],[sn,c]]); b=np.array([cx+dx*u,cy+dy*u])-A@np.array([cx,cy])
  return np.hstack([A,b[:,None]]).astype(np.float32)
names=list(SETTLE)
for k in [int(a) for a in sys.argv[1:]]:
  t=k/25; im=frames.pre(k).mean(2)
  errs=[]
  for n in names:
    w=cv2.warpAffine(S,M(n,t),(2206,946),flags=cv2.INTER_LINEAR,borderValue=0)
    # match the motion blur roughly
    w=cv2.GaussianBlur(w,(0,0),2); i2=cv2.GaussianBlur(im,(0,0),2)
    errs.append(cv2.GaussianBlur(np.abs(w-i2),(0,0),4))
  E=np.array(errs); lab=E.argmin(0); conf=np.sort(E,0); conf=conf[1]-conf[0]
  col=np.array([[255,0,0],[0,255,0],[0,0,255],[0,255,255]],np.uint8)
  vis=(cv2.cvtColor((np.clip(im,0,1)*255).astype(np.uint8),cv2.COLOR_GRAY2BGR)*0.4+col[lab]*0.6*np.clip(conf[...,None]*20,0,1)).astype(np.uint8)
  cv2.imwrite(f'layerseg_{k}.jpg',vis); np.save(f'layerseg_{k}.npy',np.stack([lab,conf]))
  print(k, t, U(t))
