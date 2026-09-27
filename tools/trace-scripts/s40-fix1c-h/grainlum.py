import cv2,numpy as np,glob,sys
def analyze(fr,label):
  fr=fr.astype(np.float32)
  L=fr.mean(-1)
  L=L-L.mean(axis=(1,2),keepdims=True)+L.mean()
  m=L.mean(0)
  mov=L-m
  movhp=np.array([f-cv2.GaussianBlur(f,(0,0),4) for f in mov])
  var=(movhp**2).mean(0)
  lum=cv2.GaussianBlur(m,(0,0),3)
  gx=cv2.Sobel(cv2.GaussianBlur(m,(0,0),2),cv2.CV_32F,1,0); gy=cv2.Sobel(cv2.GaussianBlur(m,(0,0),2),cv2.CV_32F,0,1)
  flat=np.hypot(gx,gy)<6
  flat[180:480,1470:1720]=False
  flat[:20]=False; flat[-20:]=False; flat[:,:20]=False; flat[:,-20:]=False
  out=[]
  for lo in range(40,260,20):
    sel=flat&(lum>=lo)&(lum<lo+20)
    if sel.sum()>2000: out.append((lo+10,np.sqrt(var[sel].mean()),sel.sum()))
  print(label,' '.join(f'{a}:{b:.2f}' for a,b,c in out))
  return out
src=np.load('srcstack.npy')[:12]
analyze(src,'src ')
if len(sys.argv)>1:
  fs=sorted(glob.glob(sys.argv[1]+'/r-*.png'))
  analyze(np.array([cv2.imread(f) for f in fs]),'rend')
