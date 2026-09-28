# fast exact inverse of the finish pass (same maths as f2k-tools/ungrade.py, cached vignette)
import cv2, numpy as np, time
def scurve(f): return f*0.65+0.35*(f*f*(3-2*f))
X=np.linspace(0,1,4096); Y=scurve(X)
_V={}
def vign(H,W):
  if (H,W) not in _V:
    yy,xx=np.mgrid[0:H,0:W].astype(np.float32)
    _V[(H,W)]=(1-0.38*np.clip((((xx-W/2)/(W/2))**2+((yy-H/2)/(H/2))**2)/2,0,1)**1.15).astype(np.float32)[...,None]
  return _V[(H,W)]
def halo(f255):
  H,W=f255.shape[:2]
  hl=np.clip((f255-120)/135,0,1)*f255; q=cv2.resize(hl,(W//4,H//4),interpolation=cv2.INTER_AREA)
  return cv2.resize(0.6*cv2.GaussianBlur(q,(0,0),5)+0.4*cv2.GaussianBlur(q,(0,0),16),(W,H),interpolation=cv2.INTER_LINEAR)
def ungrade(img, t):
  H,W=img.shape[:2]
  f=img.astype(np.float32)/255
  f/=(1+0.018*np.sin(t*2*np.pi*0.9)+0.012*np.sin(t*2*np.pi*2.3+1))
  f/=vign(H,W)
  f=np.interp(np.clip(f,0,1),Y,X).astype(np.float32)*255
  g=f.copy()
  for _ in range(3):
    h=halo(g); g=255-(255-f)*255/np.maximum(255-0.5*h,1)
  return (np.clip(g,0,255)/255).astype(np.float32)
if __name__=='__main__':
  im=cv2.imread('src/02110.png'); t0=time.time(); u=ungrade(im,84.4); print(time.time()-t0)
  from ungrade import ungrade as U0
  t0=time.time(); v=U0(im,84.4); print(time.time()-t0, np.abs(u-v).max())
