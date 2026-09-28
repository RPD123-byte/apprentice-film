import cv2,numpy as np,glob,re
d='snapshots/s08-rev2-a/'
S='snapshots/s08-rev2-src/'
pairs=[]
for p in sorted(glob.glob(d+'frame-*.png')):
    t=float(re.search(r'at-([\d.]+)s',p).group(1))
    if abs(t*5-round(t*5))>1e-6: continue
    k=round(t*25)
    pairs.append((t,k,p))
def luma(im): return cv2.cvtColor(im,cv2.COLOR_BGR2GRAY).astype(float)
for t,k,p in pairs:
    r=cv2.imread(p); s=cv2.imread(S+f'f{k}.png')
    rb=cv2.GaussianBlur(r.astype(float),(0,0),3); sb=cv2.GaussianBlur(s.astype(float),(0,0),3)
    mae=np.abs(rb-sb).mean()
    lr,ls=luma(r),luma(s)
    # global shift via phase correlation on luma
    sh,_=cv2.phaseCorrelate(cv2.GaussianBlur(ls,(0,0),2).astype(np.float32),cv2.GaussianBlur(lr,(0,0),2).astype(np.float32))
    print(f'{t:.2f} f{k} blurMAE {mae:.2f} luma r{lr.mean():.1f} s{ls.mean():.1f} shift({sh[0]:+.2f},{sh[1]:+.2f})')
