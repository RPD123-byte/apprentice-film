# metric.py DIR [--save] : for each DIR/r-T.png, blurred MAE vs the source frame round(T*25); writes DIR/src-T.png with --save
import cv2, glob, re, sys, numpy as np, os
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
d=sys.argv[1]; save='--save' in sys.argv
cap=cv2.VideoCapture(V)
def src(fi):
    p=f'/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/src/{fi}.png'
    if os.path.exists(p): return cv2.imread(p)
    os.makedirs(os.path.dirname(p),exist_ok=True)
    cap.set(cv2.CAP_PROP_POS_FRAMES,fi); ok,f=cap.read(); cv2.imwrite(p,f); return f
fs=sorted(glob.glob(d+'/r-*.png'),key=lambda p:float(re.search(r'r-([\d.]+)\.png',p).group(1)))
R=[]
for f in fs:
    t=float(re.search(r'r-([\d.]+)\.png',f).group(1)); fi=round(t*25)
    a=cv2.imread(f,0).astype(np.float32); sb=src(fi); b=cv2.cvtColor(sb,cv2.COLOR_BGR2GRAY).astype(np.float32)
    if save: cv2.imwrite(f.replace('/r-','/src-'),sb)
    m6=np.abs(cv2.GaussianBlur(a,(0,0),6)-cv2.GaussianBlur(b,(0,0),6)).mean()
    m2=np.abs(cv2.GaussianBlur(a,(0,0),2)-cv2.GaussianBlur(b,(0,0),2)).mean()
    bp=lambda x: np.abs(cv2.GaussianBlur(x,(0,0),1)-cv2.GaussianBlur(x,(0,0),3)).mean()
    R.append((t,m6,m2,bp(a),bp(b),a.mean(),b.mean()))
    print(f"{t:6.2f} f{fi} s6 {m6:5.2f} s2 {m2:5.2f} tex {bp(a):4.2f}/{bp(b):4.2f} mean {a.mean():5.1f}/{b.mean():5.1f}")
if R:
    v=np.array(R); print(f"MEAN s6 {v[:,1].mean():.2f} s2 {v[:,2].mean():.2f} tex {v[:,3].mean():.2f}/{v[:,4].mean():.2f}")
