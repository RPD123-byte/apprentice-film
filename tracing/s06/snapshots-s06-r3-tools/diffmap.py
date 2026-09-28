import cv2, numpy as np, sys, glob, re
d=sys.argv[1]; T=float(sys.argv[2]); s=float(sys.argv[3]) if len(sys.argv)>3 else 5
f=[p for p in glob.glob(d+'/frame-*.png') if abs(float(re.search(r'at-([\d.]+)s',p).group(1))-T)<1e-3][0]
k=int(np.floor(T*30+1e-6)); i=int(np.floor(k/30*25+1e-3))
c=cv2.VideoCapture('/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'); c.set(1,i); ok,b=c.read()
a=cv2.imread(f,0).astype(np.float32); b=cv2.cvtColor(b,cv2.COLOR_BGR2GRAY).astype(np.float32)
e=cv2.GaussianBlur(a,(0,0),s)-cv2.GaussianBlur(b,(0,0),s)
vis=np.zeros(a.shape+(3,),np.uint8); vis[...,2]=np.clip(e*8,0,255); vis[...,0]=np.clip(-e*8,0,255); vis[...,1]=(b*0.25).astype(np.uint8)
cv2.imwrite(f'{d}/diff{s:g}-{T:.2f}.jpg',cv2.resize(vis,None,fx=0.5,fy=0.5))
