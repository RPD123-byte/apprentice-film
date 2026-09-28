# harness frames rF.png -> add sF.png (source frame by index) + pairF.jpg + metrics
import cv2, glob, re, sys, numpy as np
d=sys.argv[1]; V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
def lab(im): return cv2.cvtColor(cv2.GaussianBlur(im,(0,0),8).astype(np.float32)/255,cv2.COLOR_BGR2LAB)
for f in sorted(glob.glob(d+'/r*.png')):
    F=int(re.search(r'r(\d+)\.png',f).group(1))
    c.set(cv2.CAP_PROP_POS_FRAMES,F); ok,s=c.read()
    cv2.imwrite(f"{d}/s{F}.png",s)
    a=cv2.imread(f)
    dE=np.sqrt(((lab(a)-lab(s))**2).sum(2)).mean()
    ya=cv2.cvtColor(a,cv2.COLOR_BGR2GRAY).mean(); ys=cv2.cvtColor(s,cv2.COLOR_BGR2GRAY).mean()
    print(F, f"{F/25:.2f}", f"dE8 {dE:.2f}", f"Y {ya:.1f}/{ys:.1f}")
    p=np.hstack([cv2.resize(a,(1103,473)),np.zeros((473,6,3),np.uint8),cv2.resize(s,(1103,473))])
    cv2.imwrite(f"{d}/pair{F}.jpg",p,[cv2.IMWRITE_JPEG_QUALITY,88])
