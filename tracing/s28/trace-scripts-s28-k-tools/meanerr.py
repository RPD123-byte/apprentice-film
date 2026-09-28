# mean blurred error map over the frames of a snapshot dir (optionally a time range) -> image + 8x4 cell table
import sys,glob,re,cv2,numpy as np
d=sys.argv[1]; t0=float(sys.argv[2]) if len(sys.argv)>2 else 0; t1=float(sys.argv[3]) if len(sys.argv)>3 else 999
c=cv2.VideoCapture('/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4')
acc=None; n=0; sgn=None
for fp in sorted(glob.glob(d+'/frame-*.png')):
    t=float(re.search(r'at-([\d.]+)s',fp).group(1))
    if not (t0<=t<=t1): continue
    a=cv2.imread(fp).astype(np.float32); c.set(1,round(t*25)); ok,b=c.read(); b=b.astype(np.float32)
    A=cv2.GaussianBlur(a,(0,0),8); B=cv2.GaussianBlur(b,(0,0),8)
    e=np.abs(A-B).mean(2); s=(A-B).mean(2)
    acc=e if acc is None else acc+e; sgn=s if sgn is None else sgn+s; n+=1
acc/=n; sgn/=n
H,W=acc.shape
print('frames',n,'mean',acc.mean().round(2))
for j in range(4):
    print(' '.join(f"{acc[j*H//4:(j+1)*H//4, i*W//8:(i+1)*W//8].mean():5.1f}{'+' if sgn[j*H//4:(j+1)*H//4, i*W//8:(i+1)*W//8].mean()>0 else '-'}" for i in range(8)))
v=cv2.applyColorMap(np.clip(acc*12,0,255).astype(np.uint8),cv2.COLORMAP_INFERNO)
cv2.imwrite(sys.argv[4] if len(sys.argv)>4 else d+'/meanerr.jpg',cv2.resize(v,None,fx=0.4,fy=0.4))
