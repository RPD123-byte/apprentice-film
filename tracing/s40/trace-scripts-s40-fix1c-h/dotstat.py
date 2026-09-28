import cv2,numpy as np,glob,sys
from scipy import ndimage as ndi
from scipy.spatial import cKDTree
src=np.load('srcstack.npy').astype(np.float32)[:12].mean(0)
ren=np.array([cv2.imread(f).astype(np.float32) for f in sorted(glob.glob(sys.argv[1]+'/r-*.png'))]).mean(0)
def dots(img,x0,y0,x1,y1,label):
  c=img[y0:y1,x0:x1]; L=c.mean(-1)
  h=cv2.GaussianBlur(L,(0,0),0.8)-cv2.GaussianBlur(L,(0,0),5)
  pk=(h==ndi.minimum_filter(h,size=5))&(h<-2.0)
  ys,xs=np.nonzero(pk); depth=-h[pk]
  P=np.stack([xs,ys],1).astype(float)
  nn=cKDTree(P).query(P,k=2)[0][:,1] if len(P)>3 else np.array([0])
  area=(x1-x0)*(y1-y0)
  print(f'{label:22s} n/1000px={1000*len(P)/area:5.1f} depth mean {depth.mean() if len(P) else 0:5.1f} p90 {np.percentile(depth,90) if len(P) else 0:5.1f} nn med {np.median(nn):4.1f} hp std {h.std():.2f}')
for nm,reg in {'cloudR-shade':(1900,850,2100,940),'cloudL-tan':(20,800,120,860),'cloudL2':(400,860,600,940),'cloudR2':(2120,700,2200,800),'cloudL-light':(40,600,120,660),'ribL':(230,380,390,480),'ribcream':(250,20,300,60),'sky':(700,60,960,230),'sky2':(1250,560,1450,640)}.items():
  dots(src,*reg,'src '+nm); dots(ren,*reg,'rend '+nm)
