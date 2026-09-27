import numpy as np
W,H=2206,946
def flick(t): return 1+0.018*np.sin(t*2*np.pi*0.9)+0.012*np.sin(t*2*np.pi*2.3+1.0)
def vign(x,y):
  qx=(x/W-0.5)*2; qy=(y/H-0.5)*2; r=np.clip((qx*qx+qy*qy)/2,0,1); return 1-0.38*r**1.15
def S(f): return 0.65*f+0.35*f*f*(3-2*f)
def Sinv(o):
  lo=np.zeros_like(o); hi=np.ones_like(o)
  for _ in range(40):
    m=(lo+hi)/2; big=S(m)>o; hi=np.where(big,m,hi); lo=np.where(big,lo,m)
  return (lo+hi)/2
def grade(c,x,y,t=30.6,halo=0.0):
  f=1-(1-c)*(1-halo)
  return S(f)*vign(x,y)*flick(t)
def ungrade(o,x,y,t=30.6,halo=0.0):
  f=Sinv(np.clip(o/(vign(x,y)*flick(t)),0,1))
  return 1-(1-f)/(1-halo)
# s08 light (buildStatic)
def light(x,y):
  r=np.sqrt(((x-1150)/1350)**2+((y-470)/700)**2)/1.08
  st=[(0,1),(0.55,1),(0.8,0xd8/255),(1,0x9e/255)]
  m1=np.interp(np.clip(r,0,1),[s[0] for s in st],[s[1] for s in st])
  m2=np.interp(np.clip(y/260,0,1),[0,1],[0xb8/255,1])
  d=np.sqrt((x-950)**2+(y-480)**2); a=np.clip(1-d/700,0,1)
  add=np.array([9,10,8])/255*np.asarray(a)[...,None] if np.ndim(a) else np.array([9,10,8])/255*a
  return m1*m2, add
def f0_for(o_rgb,x,y,t=30.6,halo=0.0):
  o=np.array(o_rgb,float)/255; f=ungrade(o,x,y,t,halo); m,add=light(x,y)
  return np.clip((f-add)/m,0,1)*255
def out_for(c_rgb,x,y,t=30.6,halo=0.0):
  c=np.array(c_rgb,float)/255; m,add=light(x,y); f=np.clip(c*m+add,0,1); return grade(f,x,y,t,halo)*255
import cv2
def halo_map(raw_bgr):
  # raw_bgr float 0..255 full res -> hb (0..1) per pixel per channel
  s=cv2.resize(raw_bgr/255.0,(round(W/4),round(H/4)),interpolation=cv2.INTER_AREA)
  hl=np.clip((s-120/255)/(135/255),0,1)*s
  def bl(im,sig):
    k=int(sig*3)*2+1; return cv2.GaussianBlur(im,(k,k),sig,borderType=cv2.BORDER_REPLICATE)
  hb=0.6*bl(hl,5)+0.4*bl(hl,16)
  return cv2.resize(hb,(W,H),interpolation=cv2.INTER_LINEAR)
def grade_img(raw_bgr,t=30.6):
  hb=halo_map(raw_bgr); f=raw_bgr/255.0
  f=1-(1-f)*(1-0.5*hb)
  yy,xx=np.mgrid[0:H,0:W]
  return S(f)*vign(xx,yy)[...,None]*flick(t)*255
def lightfix(x,y):
  x=np.asarray(x,float); y=np.asarray(y,float)
  GY=[(690,1),(760,0.955),(830,0.905),(890,0.87),(946,0.845)]
  gy=np.interp(y,[g[0] for g in GY],[round(255*g[1])/255 for g in GY])
  d=np.sqrt((x+60)**2+(y-900)**2)/420
  lf=np.interp(np.clip(d,0,1),[0,0.55,1],[242/255,245/255,1])
  lf=np.where((x<460)&(y>=480),lf,1)
  d2=np.sqrt(((x-950))**2+((y-610)/0.55)**2)/380
  dd=np.interp(np.clip(d2,0,1),[0,0.5,1],[11/255,8/255,0])
  d3=np.sqrt(((x-1010))**2+((y-800)/0.75)**2)/200
  dd2=np.interp(np.clip(d3,0,1),[0,0.5,1],[9/255,6/255,0])
  dd=1-(1-dd)*(1-dd2)
  return gy*lf, dd
def light_total(x,y):
  m,add=light(x,y); m2,dd=lightfix(x,y)
  return m, add, m2, dd   # raw = ((page*m + add)*m2) / (1-dd)
