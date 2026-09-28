import cv2,numpy as np,sys,glob,re
SRC='/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/src/f%04d.png'
d=sys.argv[1]
fs=sorted(glob.glob(d+'/k*.png'))
tot=[]
for fn in fs:
  k=int(re.search(r'k(\d+)\.png',fn).group(1))
  a=cv2.imread(fn); b=cv2.imread(SRC%(2420+k))
  ga=cv2.cvtColor(a,cv2.COLOR_BGR2GRAY).astype(float); gb=cv2.cvtColor(b,cv2.COLOR_BGR2GRAY).astype(float)
  m1=np.abs(ga-gb).mean()
  sa=cv2.resize(cv2.GaussianBlur(ga,(0,0),8),None,fx=0.25,fy=0.25); sb=cv2.resize(cv2.GaussianBlur(gb,(0,0),8),None,fx=0.25,fy=0.25)
  m8=np.abs(sa-sb).mean()
  # best match source frame among k-2..k+2
  best=[]
  for dk in range(-2,3):
    c=cv2.imread(SRC%(2420+k+dk));
    if c is None: continue
    gc=cv2.cvtColor(c,cv2.COLOR_BGR2GRAY).astype(float)
    sc=cv2.resize(cv2.GaussianBlur(gc,(0,0),8),None,fx=0.25,fy=0.25)
    best.append((np.abs(sa-sc).mean(),dk))
  bm=min(best)
  d20a=(ga<20).mean(); d20b=(gb<20).mean()
  tot.append((k,m1,m8))
  print('k%d  s1 %.1f  s8 %.2f  mean r %.1f s %.1f  dark<20 r %.3f s %.3f  bestdk %+d (%.2f)'%(k,m1,m8,ga.mean(),gb.mean(),d20a,d20b,bm[1],bm[0]))
t=np.array(tot); print('MEAN s1 %.2f  s8 %.2f'%(t[:,1].mean(),t[:,2].mean()))
