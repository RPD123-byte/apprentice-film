import cv2,numpy as np,sys
s=cv2.imread('src/f3450.png').astype(np.float32).mean(2); n=cv2.imread(sys.argv[1]).astype(np.float32).mean(2)
m=cv2.imread('mask.png'); obj=m[...,1]>128
# distance from the glyph/extrusion region: use darkness of source extrusion? use render dark keyline mask instead
# define wordmark region = obj within the wordmark box
wm=np.zeros_like(obj); wm[300:640,480:1660]=obj[300:640,480:1660]
wm[650:720,:]=False
dist=cv2.distanceTransform((~wm).astype(np.uint8),cv2.DIST_L2,5)
band=np.zeros_like(obj); band[440:650,500:1660]=True
sky=(~obj)&band
for d0 in range(0,60,4):
  sel=sky&(dist>=d0)&(dist<d0+4)
  if sel.sum()>200: print(f'd {d0:2d}-{d0+4:2d} n={sel.sum():6d} render {n[sel].mean():6.1f} src {s[sel].mean():6.1f} diff {n[sel].mean()-s[sel].mean():+5.1f}')
