import cv2, glob, re, numpy as np, sys
d=sys.argv[1]
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
print('t      meanR meanS  blurMAE  IoU   p5/25/50/75/95 R | S (inside src sil)')
for f in fs:
    t=re.search(r'at-([\d.]+)s',f).group(1)
    r=f.replace('frame-','ref-')
    A=cv2.imread(f,0).astype(np.float32); B=cv2.imread(r,0).astype(np.float32)
    bA=cv2.GaussianBlur(A,(0,0),12); bB=cv2.GaussianBlur(B,(0,0),12)
    box=(slice(0,946),slice(640,1960))
    mae=np.abs(bA-bB)[box].mean()
    sA=cv2.GaussianBlur(A,(0,0),3)>70; sB=cv2.GaussianBlur(B,(0,0),3)>70
    iou=(sA&sB).sum()/max(1,(sA|sB).sum())
    m=sB&sA
    pa=np.percentile(A[m],[5,25,50,75,95]).astype(int) if m.any() else []
    pb=np.percentile(B[m],[5,25,50,75,95]).astype(int) if m.any() else []
    print(f'{t:7s} {A.mean():5.1f} {B.mean():5.1f}  {mae:6.2f}  {iou:.3f}  {list(pa)} | {list(pb)}')
