import cv2, numpy as np, os
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
_cap=None
def src(t):
    global _cap
    if _cap is None: _cap=cv2.VideoCapture(V)
    _cap.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=_cap.read(); return f
def scurve(f): return f*0.65+0.35*(f*f*(3-2*f))
X=np.linspace(0,1,4096); Y=scurve(X)
def inv_s(y): return np.interp(y,Y,X)
def vign(H,W):
  yy,xx=np.mgrid[0:H,0:W].astype(np.float32)
  return 1-0.38*np.clip((((xx-W/2)/(W/2))**2+((yy-H/2)/(H/2))**2)/2,0,1)**1.15
def halo(f255):
  H,W=f255.shape[:2]
  hl=np.clip((f255-120)/135,0,1)*f255; q=cv2.resize(hl,(W//4,H//4),interpolation=cv2.INTER_AREA)
  return cv2.resize(0.6*cv2.GaussianBlur(q,(0,0),5)+0.4*cv2.GaussianBlur(q,(0,0),16),(W,H),interpolation=cv2.INTER_LINEAR)
def ungrade(img, t, halation=True):
  H,W=img.shape[:2]
  f=img.astype(np.float32)/255
  f=f/(1+0.018*np.sin(t*2*np.pi*0.9)+0.012*np.sin(t*2*np.pi*2.3+1))
  f=f/(vign(H,W)[...,None] if f.ndim==3 else vign(H,W))
  f=inv_s(np.clip(f,0,1)).astype(np.float32)*255
  if halation:
    g=f.copy()
    for _ in range(3):
      h=halo(g); g=255-(255-f)*255/np.maximum(255-0.5*h,1)
    f=np.clip(g,0,255)
  return f  # 0..255 float
def grade(f, t):
  # the source finish (no grain): f 0..255 float BGR
  f=f.astype(np.float32)
  hl=np.clip((f-120)/135,0,1)*f; H,W=f.shape[:2]; q=cv2.resize(hl,(W//4,H//4),interpolation=cv2.INTER_AREA); h=cv2.resize(0.6*cv2.GaussianBlur(q,(0,0),5)+0.4*cv2.GaussianBlur(q,(0,0),16),(W,H),interpolation=cv2.INTER_LINEAR)
  f=255-(255-f)*(255-0.50*h)/255
  x=f/255; f=255*(x*(1-0.35)+0.35*(x*x*(3-2*x)))
  f=f*(vign(H,W)[...,None] if f.ndim==3 else vign(H,W))
  f=f*(1+0.018*np.sin(t*2*np.pi*0.9)+0.012*np.sin(t*2*np.pi*2.3+1))
  return np.clip(f,0,255)
def gray(x): return cv2.cvtColor(x,cv2.COLOR_BGR2GRAY) if x.ndim==3 else x
