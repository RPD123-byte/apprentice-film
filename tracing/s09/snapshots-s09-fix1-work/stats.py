import cv2,numpy as np,sys
# stats.py FRAME REF [name x0 y0 x1 y1]...  (or uses default regions)
f=cv2.imread(sys.argv[1]).astype(np.float32); r=np.load(sys.argv[2]) if sys.argv[2].endswith('.npy') else cv2.imread(sys.argv[2]).astype(np.float32)
regs={}
a=sys.argv[3:]
for i in range(0,len(a),5): regs[a[i]]=tuple(map(int,a[i+1:i+5]))
def st(im,x0,y0,x1,y1):
    g=im[y0:y1,x0:x1].mean(2)
    hf=np.abs(g-cv2.GaussianBlur(g,(0,0),2)).mean()
    b=im[y0:y1,x0:x1].reshape(-1,3).mean(0)
    return f'mean {g.mean():6.1f} med {np.median(g):5.0f} p10 {np.percentile(g,10):5.0f} p90 {np.percentile(g,90):5.0f} blk<20 {(g<20).mean():.2f} HF {hf:5.1f} BGR {b[0]:.1f}/{b[1]:.1f}/{b[2]:.1f}'
for k,(x0,y0,x1,y1) in regs.items():
    fb=cv2.GaussianBlur(f.mean(2),(0,0),6)[y0:y1,x0:x1]; rb=cv2.GaussianBlur(r.mean(2),(0,0),6)[y0:y1,x0:x1]
    print(f'{k:10s} R {st(f,x0,y0,x1,y1)}\n{"":10s} S {st(r,x0,y0,x1,y1)}  mae6 {np.abs(fb-rb).mean():.1f}')
