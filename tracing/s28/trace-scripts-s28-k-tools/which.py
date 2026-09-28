# which source frame best matches each render frame (sigma 8 blurred diff)
import sys,glob,re,cv2,numpy as np
d=sys.argv[1]
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
for fp in sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1))):
    t=float(re.search(r'at-([\d.]+)s',fp).group(1))
    a=cv2.GaussianBlur(cv2.resize(cv2.imread(fp),None,fx=0.25,fy=0.25).astype(np.float32),(0,0),2)
    k0=int(round(t*25)); out=[]
    for k in range(k0-3,k0+4):
        c.set(cv2.CAP_PROP_POS_FRAMES,k); ok,f=c.read()
        b=cv2.GaussianBlur(cv2.resize(f,None,fx=0.25,fy=0.25).astype(np.float32),(0,0),2)
        out.append((k-k0,round(float(np.abs(a-b).mean()),2)))
    best=min(out,key=lambda x:x[1])
    print(f"{t:.2f}", best, out)
