import cv2, glob, re, os, numpy as np
R='/Users/computer/rootline/apprentice-film/snapshots/'
fs=[]
for d in ['s22-rev1-a','s22-rev1-m2']:
    for p in glob.glob(R+d+'/frame-*.png'):
        t=float(re.search(r'at-([\d.]+)s',p).group(1)); r=p.replace('frame-','ref-')
        if os.path.exists(r) and t>=79.78: fs.append((round(t,2),p,r))
fs=sorted(set(fs))
seen=set()
k=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(5,5))
def blob(p):
    g=cv2.GaussianBlur(cv2.imread(p,0).astype(np.float32),(0,0),1.5)[:127]
    m=(g>165).astype(np.uint8); m=cv2.morphologyEx(m,cv2.MORPH_OPEN,k)
    ys,xs=np.nonzero(m)
    if len(xs)<50: return None
    return xs.mean(),ys.mean(),xs.min(),xs.max(),ys.min(),len(xs)
print('t      R cx  cy  x0-x1  ytop  area |  S cx  cy  x0-x1  ytop area | dcx dcy dtop')
for t,p,r in fs:
    if t in seen: continue
    seen.add(t)
    if abs(t*5-round(t*5))>1e-6: continue   # only 0.2-grid (exact frames)
    a=blob(p); b=blob(r)
    if a is None or b is None: print(t,a is None,b is None); continue
    print('%.2f %5.0f %4.0f %4.0f-%4.0f %3.0f %5d | %5.0f %4.0f %4.0f-%4.0f %3.0f %5d | %4.0f %4.0f %4.0f'%(t,*a,*b,a[0]-b[0],a[1]-b[1],a[4]-b[4]))
