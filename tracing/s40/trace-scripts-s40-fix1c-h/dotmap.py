import cv2,numpy as np,glob,sys
def emap(img):
  L=img.mean(-1)
  dog=cv2.GaussianBlur(L,(0,0),1.2)-cv2.GaussianBlur(L,(0,0),3.5)
  g=cv2.GaussianBlur(L,(0,0),3); gx=cv2.Sobel(g,cv2.CV_32F,1,0); gy=cv2.Sobel(g,cv2.CV_32F,0,1)
  edge=cv2.dilate((np.hypot(gx,gy)>8).astype(np.uint8),np.ones((9,9)))>0
  return dog**2, edge
src=np.load('srcstack.npy').astype(np.float32)[:12].mean(0)
ren=np.array([cv2.imread(f).astype(np.float32) for f in sorted(glob.glob(sys.argv[1]+'/r-*.png'))]).mean(0)
es,edge=emap(src); er,edge2=emap(ren); edge=edge|edge2
cs=32; Hc,Wc=946//cs,2206//cs
Ms=np.full((Hc,Wc),np.nan); Mr=np.full((Hc,Wc),np.nan)
for j in range(Hc):
  for i in range(Wc):
    sl=(slice(j*cs,(j+1)*cs),slice(i*cs,(i+1)*cs)); ok=~edge[sl]
    if ok.sum()>200: Ms[j,i]=np.sqrt(es[sl][ok].mean()); Mr[j,i]=np.sqrt(er[sl][ok].mean())
np.save('Ms.npy',Ms); np.save('Mr.npy',Mr)
def vis(M): 
  im=np.clip((np.nan_to_num(M,nan=0)-0.5)/2.5*255,0,255).astype(np.uint8)
  return cv2.applyColorMap(cv2.resize(im,(1103,473),interpolation=cv2.INTER_NEAREST),cv2.COLORMAP_JET)
cv2.imwrite(sys.argv[2],np.vstack([vis(Mr),np.full((6,1103,3),255,np.uint8),vis(Ms)]))
print('median src %.2f ren %.2f'%(np.nanmedian(Ms),np.nanmedian(Mr)))
