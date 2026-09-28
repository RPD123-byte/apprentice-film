import cv2, glob, re, sys, numpy as np
d=sys.argv[1]
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
print(f"{'t':>7} {'mR':>6} {'mS':>6} {'mae6':>6} {'owl6':>6} {'des6':>6} {'p50R':>5} {'p50S':>5} {'p95R':>5} {'p95S':>5} {'blkR':>5} {'blkS':>5}")
for f in fs:
    t=re.search(r'at-([\d.]+)s',f).group(1)
    r=cv2.imread(f,0).astype(np.float32); s=cv2.imread(f.replace('frame-','ref-'),0).astype(np.float32)
    br=cv2.GaussianBlur(r,(0,0),6); bs=cv2.GaussianBlur(s,(0,0),6)
    D=np.abs(br-bs)
    owl=D[280:610,330:930].mean(); des=D[80:560,880:1320].mean()
    print(f"{t:>7} {r.mean():6.1f} {s.mean():6.1f} {D.mean():6.2f} {owl:6.2f} {des:6.2f} {np.percentile(r,50):5.0f} {np.percentile(s,50):5.0f} {np.percentile(r,95):5.0f} {np.percentile(s,95):5.0f} {(r<12).mean():5.2f} {(s<12).mean():5.2f}")
