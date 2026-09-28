# per-frame metrics: blurred MAE, mean, percentiles, hp energy; tile grid biases
import cv2, sys, glob, re, numpy as np
d=sys.argv[1]
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
for p in fs:
    t=re.search(r'at-([\d.]+)s',p).group(1)
    r=cv2.imread(p,0).astype(np.float32); s=cv2.imread(p.replace('frame-','ref-'),0).astype(np.float32)
    rb=cv2.GaussianBlur(r,(0,0),8); sb=cv2.GaussianBlur(s,(0,0),8)
    mae=np.abs(rb-sb).mean()
    hp=lambda x: np.abs(x-cv2.GaussianBlur(x,(0,0),2)).mean()
    pr=np.percentile(r,[10,50,90,99]); ps=np.percentile(s,[10,50,90,99])
    print(f'{t:>6} bMAE {mae:5.1f} mean {r.mean():5.1f}/{s.mean():5.1f} p10 {pr[0]:3.0f}/{ps[0]:3.0f} p50 {pr[1]:3.0f}/{ps[1]:3.0f} p90 {pr[2]:3.0f}/{ps[2]:3.0f} p99 {pr[3]:3.0f}/{ps[3]:3.0f} hp {hp(r):4.1f}/{hp(s):4.1f} blk<8 {(r<8).mean():.2f}/{(s<8).mean():.2f}')
