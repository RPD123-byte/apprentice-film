import cv2,numpy as np,glob,re,sys
dirs=sys.argv[1:]
seen={}
for d in dirs:
    for p in glob.glob(f"{d}/frame-*-at-*s.png"):
        t=float(re.search(r'at-([\d.]+)s',p).group(1))
        seen.setdefault(round(t,3),(d,p))
def lap(g): return float(np.abs(cv2.Laplacian(g,cv2.CV_32F,ksize=1)).mean())
print(" t     meanR meanS | blur8err blur32err | lapR lapS | 3x3 cell means R/S")
for t in sorted(seen):
    d,p=seen[t]; q=p.replace('/frame-','/ref-')
    r=cv2.imread(p,0).astype(np.float32); s=cv2.imread(q,0).astype(np.float32)
    e8=np.abs(cv2.GaussianBlur(r,(0,0),8)-cv2.GaussianBlur(s,(0,0),8)).mean()
    e32=np.abs(cv2.GaussianBlur(r,(0,0),32)-cv2.GaussianBlur(s,(0,0),32)).mean()
    cells=[]
    for j in range(3):
        for i in range(3):
            a=r[j*315:(j+1)*315,i*735:(i+1)*735].mean(); b=s[j*315:(j+1)*315,i*735:(i+1)*735].mean()
            cells.append(f"{a:4.0f}/{b:<4.0f}")
    print(f"{t:6.2f} {r.mean():5.1f} {s.mean():5.1f} | {e8:6.1f} {e32:6.1f} | {lap(r):5.1f} {lap(s):5.1f} | "+" ".join(cells))
