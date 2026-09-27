# Compare render vs reference frames from a compare.sh output dir: blurred mean abs diff overall + per cell,
# and mean colour per named box (render vs ref) to calibrate fills.
import sys,glob,re,json,cv2,numpy as np
d=sys.argv[1]; boxes=json.loads(sys.argv[2]) if len(sys.argv)>2 else {}
for fp in sorted(glob.glob(d+'/frame-*.png')):
    t=re.search(r'at-([\d.]+)s',fp).group(1)
    rp=fp.replace('frame-','ref-')
    a=cv2.imread(fp).astype(np.float32); b=cv2.imread(rp).astype(np.float32)
    if a.shape!=b.shape: b=cv2.resize(b,(a.shape[1],a.shape[0]))
    for s in (4,12):
        A=cv2.GaussianBlur(a,(0,0),s); B=cv2.GaussianBlur(b,(0,0),s)
        print(f"t={t} sigma{s}: MAD={np.abs(A-B).mean():.2f}")
    A=cv2.GaussianBlur(a,(0,0),8); B=cv2.GaussianBlur(b,(0,0),8)
    # 6x4 grid of cells
    H,W=a.shape[:2]; rows=[]
    for j in range(4):
        rows.append(' '.join(f"{np.abs(A[j*H//4:(j+1)*H//4,i*W//6:(i+1)*W//6]-B[j*H//4:(j+1)*H//4,i*W//6:(i+1)*W//6]).mean():5.1f}" for i in range(6)))
    print('  cells:\n   '+'\n   '.join(rows))
    for name,(x0,y0,x1,y1) in boxes.items():
        ma=a[y0:y1,x0:x1].reshape(-1,3).mean(0)[::-1]; mb=b[y0:y1,x0:x1].reshape(-1,3).mean(0)[::-1]
        print(f"  {name:12s} render {ma.round(0)} ref {mb.round(0)} diff {(ma-mb).round(0)}")
