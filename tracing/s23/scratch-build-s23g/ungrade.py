import cv2, numpy as np
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
def ungrade(img, t=117.4, halation=True):
  """source frame (BGR uint8) -> pre-grade frame (BGR float 0..1), exact inverse of finish2.py's grade
  (flicker, vignette, S-curve, halation; the grain cannot be undone)"""
  H,W=img.shape[:2]
  f=img.astype(np.float32)/255
  f=f/(1+0.018*np.sin(t*2*np.pi*0.9)+0.012*np.sin(t*2*np.pi*2.3+1))
  f=f/vign(H,W)[...,None]
  f=inv_s(np.clip(f,0,1)).astype(np.float32)*255
  if halation:
    g=f.copy()
    for _ in range(3):
      h=halo(g); g=255-(255-f)*255/np.maximum(255-0.5*h,1)
    f=np.clip(g,0,255)
  return (f/255).astype(np.float32)
if __name__=='__main__':
  import sys
  im=cv2.imread(sys.argv[1]); u=ungrade(im, float(sys.argv[3]) if len(sys.argv)>3 else 117.4)
  cv2.imwrite(sys.argv[2],np.clip(u*255+0.5,0,255).astype(np.uint8))
