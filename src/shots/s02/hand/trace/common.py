# s02 r3 measuring helpers (study only; nothing here is loaded by the film)
import cv2, numpy as np
S='/Users/computer/rootline/apprentice-film/snapshots/s02-r3-src'
def src(f, gray=True):
    im=cv2.imread(f'{S}/{f:04d}.png', 0 if gray else 1); return im
def scurve(f): return f*0.65+0.35*(f*f*(3-2*f))
X=np.linspace(0,1,4096); Y=scurve(X)
def inv_s(y): return np.interp(y,Y,X)
def vign(H=946,W=2206):
    yy,xx=np.mgrid[0:H,0:W].astype(np.float32)
    return 1-0.38*np.clip((((xx-W/2)/(W/2))**2+((yy-H/2)/(H/2))**2)/2,0,1)**1.15
V=vign()
def halo(f255, amt=0.5):
    H,W=f255.shape[:2]
    hl=np.clip((f255-120)/135,0,1)*f255; q=cv2.resize(hl,(W//4,H//4),interpolation=cv2.INTER_AREA)
    return cv2.resize(0.6*cv2.GaussianBlur(q,(0,0),5)+0.4*cv2.GaussianBlur(q,(0,0),16),(W,H),interpolation=cv2.INTER_LINEAR)
def ungrade(img, t, amt=0.5):
    f=img.astype(np.float32)/255
    f=f/(1+0.018*np.sin(t*2*np.pi*0.9)+0.012*np.sin(t*2*np.pi*2.3+1))
    f=f/V
    f=inv_s(np.clip(f,0,1)).astype(np.float32)*255
    g=f.copy()
    for _ in range(3):
        h=halo(g); g=255-(255-f)*255/np.maximum(255-amt*h,1)
    return np.clip(g,0,255)
def grade(f, t, amt=0.5):
    f=f.astype(np.float32); h=halo(f)
    f=255-(255-f)*(255-amt*h)/255
    x=f/255; f=255*(x*(1-0.35)+0.35*(x*x*(3-2*x)))
    f=f*V*(1+0.018*np.sin(t*2*np.pi*0.9)+0.012*np.sin(t*2*np.pi*2.3+1))
    return np.clip(f,0,255)
def avg_ungraded(frames):
    return np.mean([ungrade(src(f).astype(np.float32), f/25) for f in frames],axis=0)
