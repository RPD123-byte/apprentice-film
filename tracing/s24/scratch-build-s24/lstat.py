import cv2,numpy as np,sys
from scipy.ndimage import maximum_filter1d, uniform_filter1d, label
ANG=32.1
def rotated(n):
  g=cv2.imread('src/f%04d.png'%n,0).astype(np.float32)
  h,w=g.shape; M=cv2.getRotationMatrix2D((w/2,h/2),ANG,1.0)
  r=cv2.warpAffine(g,M,(w,h),flags=cv2.INTER_LINEAR,borderValue=-1)
  valid=cv2.warpAffine(np.ones_like(g),M,(w,h),flags=cv2.INTER_NEAREST,borderValue=0)>0.5
  return r,valid,M
def tracks(r,valid,ex=None,thr=70):
  s=uniform_filter1d(r,5,axis=1)
  # local max in y
  mx=maximum_filter1d(s,5,axis=0)
  bg=cv2.erode(s,np.ones((25,1)))  # min over 25 rows
  pk=(s>=mx)&(s>thr)&(s-bg>30)&valid
  if ex is not None: pk&=~ex
  # link along x: dilate vertically by 1 then label with structure horizontal
  pk2=cv2.dilate(pk.astype(np.uint8),np.ones((3,1),np.uint8))
  lab,nl=label(pk2,structure=np.array([[0,0,0],[1,1,1],[0,0,0]]))
  # simpler: label with 8-connectivity
  lab,nl=label(pk2,structure=np.ones((3,3)))
  out=[]
  objs=__import__('scipy.ndimage',fromlist=['find_objects']).find_objects(lab)
  for i,sl in enumerate(objs):
    if sl is None: continue
    ys,xs=np.nonzero(lab[sl]==i+1)
    xs=xs+sl[1].start; ys=ys+sl[0].start
    L=xs.max()-xs.min()+1
    if L<15: continue
    yc=np.median(ys)
    vals=s[ys,xs]
    out.append((xs.min(),xs.max(),yc,L,np.percentile(vals,90),np.median(vals)))
  return np.array(out)
if __name__=='__main__':
  allL=[];allV=[];dens=[]
  for n in range(int(sys.argv[1]),int(sys.argv[2])):
    r,valid,M=rotated(n)
    # exclude owl & scissors: big bright blobs in original -> compute mask on rotated: pixels where 41x41 mean > 120
    big=cv2.blur((r>150).astype(np.float32),(3,31))>0.6
    ex=cv2.dilate(big.astype(np.uint8),np.ones((41,41),np.uint8))>0
    t=tracks(r,valid,ex)
    allL+=list(t[:,3]); allV+=list(t[:,4])
    # density: count distinct rows with tracks per perpendicular length in a column strip
  allL=np.array(allL);allV=np.array(allV)
  print('n',len(allL),'L pct',np.percentile(allL,[10,25,50,75,90,97]).round(0))
  print('V pct',np.percentile(allV,[10,25,50,75,90]).round(0))
