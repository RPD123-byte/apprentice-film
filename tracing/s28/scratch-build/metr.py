import cv2, numpy as np, glob, re, sys, os
d=sys.argv[1]
fs=sorted((glob.glob(d+'/frame-*.png') or glob.glob(d+'/frame-*.jpg')),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
for f in fs:
    t=re.search(r'at-([\d.]+)s',f).group(1)
    r=f.replace('frame-','ref-')
    if not os.path.exists(r): continue
    a=cv2.imread(f).astype(np.float32); b=cv2.imread(r).astype(np.float32)
    out=[]
    for s in (12,4):
        A=cv2.GaussianBlur(a,(0,0),s); B=cv2.GaussianBlur(b,(0,0),s); out.append(np.abs(A-B).mean())
    ma=a.mean(axis=(0,1)); mb=b.mean(axis=(0,1))
    # region error on 6x3 grid at sigma 8
    A=cv2.GaussianBlur(a,(0,0),8); B=cv2.GaussianBlur(b,(0,0),8); e=np.abs(A-B).mean(axis=2)
    H,W=e.shape; g=[[e[j*H//3:(j+1)*H//3, i*W//6:(i+1)*W//6].mean() for i in range(6)] for j in range(3)]
    # sharpness: laplacian var
    la=cv2.Laplacian(cv2.cvtColor(a.astype(np.uint8),cv2.COLOR_BGR2GRAY),cv2.CV_32F).var(); lb=cv2.Laplacian(cv2.cvtColor(b.astype(np.uint8),cv2.COLOR_BGR2GRAY),cv2.CV_32F).var()
    print(f"{t:>7} s12={out[0]:.2f} s4={out[1]:.2f} meanBGR r={ma.round(1)} s={mb.round(1)} lap r={la:.0f} s={lb:.0f} worstcell={max(max(x) for x in g):.1f}")
    # heat map
    hm=np.clip(e*6,0,255).astype(np.uint8); hm=cv2.applyColorMap(cv2.resize(hm,(W//2,H//2)),cv2.COLORMAP_JET)
    cv2.imwrite(f"{d}/heat-{t}.jpg",hm,[cv2.IMWRITE_JPEG_QUALITY,70])
