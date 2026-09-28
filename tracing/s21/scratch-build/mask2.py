import cv2, numpy as np, glob, re, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
d=sys.argv[1]; TH=float(sys.argv[2]) if len(sys.argv)>2 else 45
def srcn(n):
    c.set(cv2.CAP_PROP_POS_FRAMES,n); ok,f=c.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
def nearest(t):
    n=int(round(t*25))
    if abs(t*25-n)>0.49: n=int(t*25)
    return n
A='snapshots/s21-rev1-a/'
gray=lambda p: cv2.cvtColor(cv2.imread(p),cv2.COLOR_BGR2GRAY).astype(np.float32)
bgt=[69.6,70.4,71.2,72.0,72.8,73.6,74.4]
af={float(re.search(r'at-([\d.]+)s',p).group(1)):p for p in glob.glob(A+'frame-*.png')}
def norm(img): return img/ max(1,np.median(img[300:700,800:1400]))
rbg=np.median(np.stack([norm(gray(af[t])) for t in bgt]),0)
sbg=np.median(np.stack([norm(srcn(nearest(t))) for t in bgt]),0)
np.save('/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/rbg.npy',rbg); np.save('/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/sbg.npy',sbg)
files={float(re.search(r'at-([\d.]+)s',p).group(1)):p for p in glob.glob(d+'/frame-*.png')}
k=np.ones((3,3),np.uint8)
print(' t      | render bbox cx,cy area mean p90 | source bbox cx,cy area mean p90 | IoU')
for t in sorted(files):
    if t<69.44 or t>74.52: continue
    r=gray(files[t]); s=srcn(nearest(t))
    out=[]; ms=[]
    for img,bg in [(r,rbg),(s,sbg)]:
        g=np.median(img[300:700,800:1400])
        m=((img-bg*g)>TH).astype(np.uint8)   # owl is brighter than bg
        m=cv2.morphologyEx(m,cv2.MORPH_OPEN,k); m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((7,7),np.uint8))
        n,lab,st,cen=cv2.connectedComponentsWithStats(m)
        keep=np.zeros_like(m)
        if n>1:
            big=1+np.argmax(st[1:,4]); keep[lab==big]=1
            bx0,by0,bw,bh=st[big,:4]
            for i in range(1,n):  # add comps near the biggest
                if i!=big and st[i,4]>40 and st[i,0]<bx0+bw+60 and st[i,0]+st[i,2]>bx0-60 and st[i,1]<by0+bh+60 and st[i,1]+st[i,3]>by0-60: keep[lab==i]=1
        ms.append(keep)
        ys,xs=np.nonzero(keep)
        if len(xs)==0: out.append('none'); continue
        v=img[keep>0]
        out.append(f'({xs.min():4d},{ys.min():4d},{xs.max():4d},{ys.max():4d}) {xs.mean():6.1f},{ys.mean():6.1f} {len(xs):6d} {v.mean():5.1f} {np.percentile(v,90):5.1f}')
    iou=(ms[0]&ms[1]).sum()/max(1,(ms[0]|ms[1]).sum())
    print(f'{t:.3f} | '+' | '.join(out)+f' | {iou:.2f}')
    np.save(f'/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/m_{t:.3f}.npy',np.stack(ms))
