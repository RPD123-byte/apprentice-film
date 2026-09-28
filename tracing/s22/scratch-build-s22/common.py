import cv2, numpy as np
S='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s22'
fr=np.load(S+'/frames.npy',mmap_mode='r')
def idx(t): return int(round(t*25))-1863
def gray(t): return cv2.cvtColor(np.array(fr[idx(t)]),cv2.COLOR_BGR2GRAY).astype(np.float32)
def crop_sub(img,x0,y0,w,h):
    # sub-pixel crop: output[j,i] = img[y0+j, x0+i]
    M=np.float32([[1,0,-x0],[0,1,-y0]])
    return cv2.warpAffine(img,M,(w,h),flags=cv2.INTER_CUBIC,borderMode=cv2.BORDER_REFLECT)

# ---- grade model (src/lib/post.js) and its approximate inverse
Wf,Hf=2206,946
_yy,_xx=np.mgrid[0:Hf,0:Wf].astype(np.float32)
_qx=((_xx+0.5)/Wf-0.5)*2; _qy=((_yy+0.5)/Hf-0.5)*2
_r=np.clip((_qx*_qx+_qy*_qy)/2,0,1)
VIG=(1-0.38*_r**1.15).astype(np.float32)
_lut_x=np.linspace(0,1,4097); _lut_y=_lut_x*0.65+0.35*_lut_x*_lut_x*(3-2*_lut_x)
def S_inv(y): return np.interp(y,_lut_y,_lut_x).astype(np.float32)
def S_fwd(x): return (x*0.65+0.35*x*x*(3-2*x)).astype(np.float32)
def flick(t): return 1+0.018*np.sin(t*2*np.pi*0.9)+0.012*np.sin(t*2*np.pi*2.3+1.0)
def halo_of(f):
    # f: full-frame pre-grade grey 0..1 -> hb (halation) as post.js (quarter res box, clamp, blur 5 & 16 at quarter res)
    q=cv2.resize(f,(Wf//4+ (1 if Wf%4>=2 else 0), round(Hf/4)),interpolation=cv2.INTER_AREA)
    hl=np.clip((q-120/255)/(135/255),0,1)*q
    b5=cv2.GaussianBlur(hl,(0,0),5); b16=cv2.GaussianBlur(hl,(0,0),16)
    hb=0.6*b5+0.4*b16
    return cv2.resize(hb,(Wf,Hf),interpolation=cv2.INTER_LINEAR)
def ungrade(t, img=None, halo=0.5, iters=3):
    # graded source frame -> estimated pre-grade grey (0..1), ignoring grain
    if img is None: img=np.array(fr[idx(t)]).astype(np.float32).mean(axis=2)
    g=img/255.0/flick(t)/VIG
    y=S_inv(np.clip(g,0,1))
    f=y.copy()
    for _ in range(iters):
        hb=halo_of(f)
        f=1-(1-y)/np.maximum(1e-3,1-halo*hb)
        f=np.clip(f,0,1)
    return f
def grade(f,t,halo=0.5):
    hb=halo_of(f); y=1-(1-f)*(1-halo*hb); return np.clip(S_fwd(y)*VIG*flick(t),0,1)
