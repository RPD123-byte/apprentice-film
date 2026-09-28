import cv2,numpy as np,glob,sys
m=cv2.imread('mask.png'); cloud=m[...,2]>128; obj=m[...,1]>128; rib=m[...,0]>128
src=np.load('srcstack.npy').astype(np.float32)[:12].mean(0)
ren=np.array([cv2.imread(f).astype(np.float32) for f in sorted(glob.glob(sys.argv[1]+'/r-*.png'))]).mean(0)
def dog(img):
  L=img.mean(-1); return cv2.GaussianBlur(L,(0,0),1.2)-cv2.GaussianBlur(L,(0,0),3.5), L
ds,Ls=dog(src); dr,Lr=dog(ren)
g=cv2.GaussianBlur(Ls,(0,0),3); edge=cv2.dilate((np.hypot(cv2.Sobel(g,cv2.CV_32F,1,0),cv2.Sobel(g,cv2.CV_32F,0,1))>8).astype(np.uint8),np.ones((9,9)))>0
g=cv2.GaussianBlur(Lr,(0,0),3); edge|=cv2.dilate((np.hypot(cv2.Sobel(g,cv2.CV_32F,1,0),cv2.Sobel(g,cv2.CV_32F,0,1))>8).astype(np.uint8),np.ones((9,9)))>0
owl=np.zeros_like(edge); owl[180:480,1470:1720]=True
sky=(~obj)&(~edge)
ribm=rib&(~edge)&(~cloud)&(~owl)
cl=cloud&(~edge)
for nm,sel in (('sky',sky),('rib',ribm),('cloud',cl)):
  print(nm,'src rms %.2f ren rms %.2f'%(np.sqrt((ds[sel]**2).mean()),np.sqrt((dr[sel]**2).mean())))
# ribbons by luminance bins
for lo in range(40,250,30):
  sel=ribm&(Ls>=lo)&(Ls<lo+30)
  if sel.sum()>3000: print(' rib L%d-%d n=%d src %.2f ren %.2f'%(lo,lo+30,sel.sum(),np.sqrt((ds[sel]**2).mean()),np.sqrt((dr[sel]**2).mean())))
# sky: smoothed energy maps
def local(e,sel,s=25):
  num=cv2.GaussianBlur(np.where(sel,e,0).astype(np.float32),(0,0),s); den=cv2.GaussianBlur(sel.astype(np.float32),(0,0),s)
  return np.sqrt(num/np.maximum(den,1e-3)), den
Es,den=local(ds**2,sky); Er,_=local(dr**2,sky)
np.save('Esky_src.npy',Es); 
for yb in range(0,946,100):
  row=[]
  for xb in range(0,2206,160):
    c=(slice(yb,yb+100),slice(xb,xb+160)); s=sky[c]
    row.append('%4.1f/%4.1f'%(np.sqrt((ds[c][s]**2).mean()),np.sqrt((dr[c][s]**2).mean())) if s.sum()>1500 else '   ---   ')
  print('y%3d '%yb+' '.join(row))
