import cv2, numpy as np, json, sys
K=json.load(open(sys.argv[1])); T=K['t']; step=int(sys.argv[2]) if len(sys.argv)>2 else 24
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'; cap=cv2.VideoCapture(V)
def fr(i): cap.set(cv2.CAP_PROP_POS_FRAMES,i); ok,f=cap.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
f0=int(round(T*25)); A=fr(f0)
hull=K['hull']; hull=[hull] if isinstance(hull[0][0],(int,float)) else hull
m=np.zeros(A.shape,np.uint8)
for p in hull: cv2.fillPoly(m,[np.array(p,np.int32)],1)
dis=cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_ULTRAFAST if False else cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
H,W=A.shape; yy,xx=np.mgrid[0:H,0:W].astype(np.float32)
bl=lambda x:cv2.GaussianBlur(x.astype(np.float32),(0,0),3)
for o in (-3,-2,-1,1,2,3):
    B=fr(f0+o)
    fl=dis.calc(B,A,None)   # for each pixel of B: where it is in A
    # coarse grid + smooth (what we could store)
    sm=cv2.GaussianBlur(fl,(0,0),step/2)
    g=sm[::step,::step]
    gy,gx=np.mgrid[0:g.shape[0],0:g.shape[1]]
    fx=cv2.remap(g[...,0],xx/step,yy/step,cv2.INTER_LINEAR); fy=cv2.remap(g[...,1],xx/step,yy/step,cv2.INTER_LINEAR)
    Wp=cv2.remap(A,xx+fx,yy+fy,cv2.INTER_LINEAR)
    Wd=cv2.remap(A,xx+fl[...,0],yy+fl[...,1],cv2.INTER_LINEAR)
    print(o, 'unwarped', round(float(np.abs(bl(A)-bl(B))[m>0].mean()),1), 'dense', round(float(np.abs(bl(Wd)-bl(B))[m>0].mean()),1), f'grid{step}', round(float(np.abs(bl(Wp)-bl(B))[m>0].mean()),1))
