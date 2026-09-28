import cv2,numpy as np,sys
from scipy.signal import find_peaks
from lstat import rotated
LENS=[];CENS=[];ENDS=[];PROF=[]
for n in range(int(sys.argv[1]),int(sys.argv[2])):
  r,valid,M=rotated(n)
  big=cv2.blur((r>150).astype(np.float32),(3,31))>0.6
  ex=cv2.dilate(big.astype(np.uint8),np.ones((61,61),np.uint8))>0
  s=cv2.GaussianBlur(r,(0,0),sigmaX=0.1,sigmaY=1.0)
  seen=set()
  for x in range(300,1900,150):
    col=s[:,x]
    pk,_=find_peaks(np.where(valid[:,x]&~ex[:,x],col,0),prominence=25,height=40)
    for p in pk:
      h=col[p]; thr=max(25,h*0.4)
      row=s[p]; okr=valid[p]&~ex[p]
      a=x
      while a>0 and row[a]>thr and okr[a]: a-=1
      b=x
      while b<len(row)-1 and row[b]>thr and okr[b]: b+=1
      key=(p//3,a//20)
      if key in seen: continue
      seen.add(key)
      # both ends must be real ends: next pixel valid and not excluded
      if not(okr[max(a-1,0)] and okr[min(b+1,len(row)-1)] and valid[p,max(a-8,0)] and valid[p,min(b+8,len(row)-1)]): continue
      if ex[p,max(a-8,0)] or ex[p,min(b+8,len(row)-1)]: continue
      L=b-a; LENS.append(L)
      seg=row[a:b+1]
      if L>60:
        # brightness profile along length normalised: 10 bins
        bins=np.array_split(seg,10); PROF.append([np.mean(q)/h for q in bins])
LENS=np.array(LENS)
print('closed segs',len(LENS),'len pct',np.percentile(LENS,[10,25,50,75,90,97]).round())
P=np.array(PROF); print('profile along (tail->head)',P.mean(0).round(2))
