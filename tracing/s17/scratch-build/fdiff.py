import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V); a,b=int(sys.argv[1]),int(sys.argv[2])
c.set(cv2.CAP_PROP_POS_FRAMES,a); prev=None
for n in range(a,b+1):
    ok,f=c.read(); g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
    d=np.abs(g-prev).mean() if prev is not None else 0
    print(n, f"{n/25:.2f}", f"mean={g.mean():.1f}", f"diff={d:.1f}")
    prev=g
