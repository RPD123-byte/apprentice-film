# Python mirror of src/lib/post.js (no grain): forward(pre, t) and inverse(post, t). Images float32 0..1, HxWx3 or HxW.
import cv2, numpy as np
W,H=2206,946
def _blur_q(x,s):
  # separable gaussian limited to 3 sigma, clamp-to-edge
  r=int(np.floor(s*3)); k=np.exp(-0.5*(np.arange(-r,r+1)**2)/(s*s)); k/=k.sum()
  x=cv2.sepFilter2D(x,-1,k,np.array([1.0]),borderType=cv2.BORDER_REPLICATE)
  return cv2.sepFilter2D(x,-1,np.array([1.0]),k,borderType=cv2.BORDER_REPLICATE)
def halo_map(pre):
  qw,qh=round(W/4),round(H/4)
  s=cv2.resize(pre,(qw,qh),interpolation=cv2.INTER_AREA)
  hl=np.clip((s-120/255)/(135/255),0,1)*s
  hb=0.6*_blur_q(hl,5)+0.4*_blur_q(hl,16)
  return cv2.resize(hb,(W,H),interpolation=cv2.INTER_LINEAR)
def vig():
  y,x=np.mgrid[0:H,0:W]; u=(x+0.5)/W; v=(y+0.5)/H
  qx=(u-0.5)*2; qy=(v-0.5)*2; r=np.clip((qx*qx+qy*qy)/2,0,1)
  return (1-0.38*r**1.15).astype(np.float32)
V=vig()
def flick(t): return 1+0.018*np.sin(t*2*np.pi*0.9)+0.012*np.sin(t*2*np.pi*2.3+1)
def scurve(f): return f*0.65+0.35*(f*f*(3-2*f))
def iscurve(y):
  # invert monotone S-curve by Newton
  f=y.copy()
  for _ in range(8):
    g=scurve(f)-y; d=0.65+0.35*(6*f-6*f*f); f=np.clip(f-g/d,0,1)
  return f
def forward(pre,t,halo=0.5):
  hb=halo_map(pre); vv=V if pre.ndim==2 else V[...,None]
  f=1-(1-pre)*(1-halo*hb); f=scurve(f); f=f*vv*flick(t)
  return np.clip(f,0,1)
def inverse(post,t,halo=0.5,it=3):
  vv=V if post.ndim==2 else V[...,None]
  y=np.clip(post/(vv*flick(t)),0,1); y=iscurve(y)   # = 1-(1-pre)(1-halo hb)
  pre=y.copy()
  for _ in range(it):
    hb=halo_map(pre); pre=np.clip(1-(1-y)/np.maximum(1e-3,1-halo*hb),0,1)
  return pre
