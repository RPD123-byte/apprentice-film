import cv2, glob, re, sys, numpy as np
d=sys.argv[1]
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
tot=[]
for f in fs:
    t=float(re.search(r'at-([\d.]+)s',f).group(1))
    A0=cv2.imread(f,0); B0=cv2.imread(f.replace("frame-","ref-"),0)
    if A0 is None or B0 is None: continue
    a=A0.astype(np.float32); b=B0.astype(np.float32)
    ab=cv2.GaussianBlur(a,(0,0),6); bb=cv2.GaussianBlur(b,(0,0),6)
    e=np.abs(ab-bb)
    top=e[0:128].mean(); hdr=e[180:370,190:1980].mean(); page=e[370:946,144:2023].mean(); lm=e[128:946,0:144].mean(); rm=e[128:946,2023:].mean()
    # signed means
    s_top=(ab-bb)[0:128].mean(); s_hdr=(ab-bb)[180:370,190:1980].mean()
    print(f"{t:6.2f} all {e.mean():5.1f} top {top:5.1f}({s_top:+5.1f}) hdr {hdr:5.1f}({s_hdr:+5.1f}) page {page:5.1f} L {lm:5.1f} R {rm:5.1f}")
    tot.append(e.mean())
print('mean',np.mean(tot))
