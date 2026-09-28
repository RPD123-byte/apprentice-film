import cv2, glob, re, os, numpy as np, sys
D=sys.argv[1]
src={int(re.search(r'f(\d+)',os.path.basename(p)).group(1)):cv2.GaussianBlur(cv2.imread(p,0).astype(np.float32),(0,0),3) for p in glob.glob(D+'/src/f*.png')}
def best(img):
    g=cv2.GaussianBlur(cv2.cvtColor(img,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),3)
    sc=sorted((np.abs(g-v).mean(),k) for k,v in src.items())
    return ' '.join(f'{k}:{m:.1f}' for m,k in sc[:3])
for d in sys.argv[2:]:
  for f in sorted(glob.glob(d+'/frame-*.png')):
    t=float(re.search(r'at-([\d.]+)s',f).group(1))
    if not any(abs(t*25-k)<1.5 for k in src): continue
    r=cv2.imread(f); s=cv2.imread(f.replace('frame-','ref-'))
    print(f'{t:7.3f} (t*25={t*25:7.2f})  render~ {best(r):32s} | ref~ {best(s)}')
