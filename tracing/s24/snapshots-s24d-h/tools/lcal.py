import cv2,numpy as np,sys
from scipy.signal import find_peaks
ANG=32.1
def rot_img(g):
  h,w=g.shape; M=cv2.getRotationMatrix2D((w/2,h/2),ANG,1.0)
  r=cv2.warpAffine(g,M,(w,h),flags=cv2.INTER_LINEAR,borderValue=-1)
  valid=cv2.warpAffine(np.ones_like(g),M,(w,h),flags=cv2.INTER_NEAREST,borderValue=0)>0.5
  return r,valid
def stats(files, excl=True):
  W=[];V=[];D=[];LENS=[];MEAN=[];HIST=[]
  for fn in files:
    g=cv2.imread(fn,0).astype(np.float32)
    r,valid=rot_img(g)
    if excl:
      big=cv2.blur((r>150).astype(np.float32),(3,31))>0.6
      ex=cv2.dilate(big.astype(np.uint8),np.ones((61,61),np.uint8))>0
    else: ex=np.zeros_like(valid)
    ok=valid&~ex
    MEAN.append(r[ok].mean()); HIST.append(np.histogram(r[ok],bins=[0,20,40,60,80,100,130,160,190,220,256])[0]/ok.sum())
    s=cv2.blur(r,(9,1))
    for x in range(200,1900,100):
      col=s[:,x]; o=ok[:,x]
      ys=np.nonzero(o)[0]
      if len(ys)<200: continue
      # longest run
      best=(0,0,0); st=None; seg=o
      for i,v in enumerate(list(seg)+[False]):
        if v and st is None: st=i
        if not v and st is not None:
          if i-st>best[0]: best=(i-st,st,i)
          st=None
      c=col[best[1]:best[2]]
      if len(c)<150: continue
      bg=np.percentile(c,20)
      pk,_=find_peaks(c,prominence=25,height=bg+30)
      D.append(len(pk)/len(c)*100)
      for p in pk:
        h=c[p]; half=(h+bg)/2; l=p
        while l>0 and c[l]>half: l-=1
        rr=p
        while rr<len(c)-1 and c[rr]>half: rr+=1
        W.append(rr-l); V.append(h)
    s2=cv2.GaussianBlur(r,(0,0),sigmaX=0.1,sigmaY=1.0); seen=set()
    for x in range(300,1900,150):
      col=s2[:,x]
      pk,_=find_peaks(np.where(ok[:,x],col,0),prominence=25,height=40)
      for p in pk:
        h=col[p]; thr=max(25,h*0.4); row=s2[p]; okr=ok[p]
        a=x
        while a>0 and row[a]>thr and okr[a]: a-=1
        b=x
        while b<len(row)-1 and row[b]>thr and okr[b]: b+=1
        key=(p//3,a//20)
        if key in seen: continue
        seen.add(key)
        if not(okr[max(a-1,0)] and okr[min(b+1,len(row)-1)] and valid[p,max(a-8,0)] and valid[p,min(b+8,len(row)-1)]): continue
        if ex[p,max(a-8,0)] or ex[p,min(b+8,len(row)-1)]: continue
        LENS.append(b-a)
  W=np.array(W);V=np.array(V);LENS=np.array(LENS)
  print(' mean %.1f density %.2f'%(np.mean(MEAN),np.mean(D)))
  print(' hist',(np.mean(HIST,0)*100).round(1))
  print(' width pct',np.percentile(W,[10,25,50,75,90]),' peak pct',np.percentile(V,[10,25,50,75,90]).round())
  for lo,hi in [(0,4),(4,7),(7,11),(11,30)]:
    m=(W>=lo)&(W<hi); print('  w',lo,hi,'frac',m.mean().round(3),'val med',np.median(V[m]).round() if m.any() else None)
  print(' len n',len(LENS),'pct',np.percentile(LENS,[10,25,50,75,90]).round())
if __name__=='__main__':
  import glob
  files=[]
  for a in sys.argv[1:]: files+=sorted(glob.glob(a))
  stats(files)
