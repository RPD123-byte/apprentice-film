import cv2,numpy as np,sys
s=cv2.imread('src/f3450.png').astype(np.float32).mean(2); n=cv2.imread(sys.argv[1]).astype(np.float32).mean(2)
m=cv2.imread('mask.png'); obj=m[...,1]>128
wm=np.zeros_like(obj); wm[280:640,480:1660]=obj[280:640,480:1660]; wm[650:720,:]=False
wm[180:470,1480:1710]=False  # drop owl box
dist=cv2.distanceTransform((~wm).astype(np.uint8),cv2.DIST_L2,5)
# direction: gradient of dist tells outward normal
gy=cv2.Sobel(dist,cv2.CV_32F,0,1,ksize=5); gx=cv2.Sobel(dist,cv2.CV_32F,1,0,ksize=5)
ang=np.degrees(np.arctan2(gy,gx))  # 90 = pointing down (below the letters)
band=np.zeros_like(obj); band[250:660,480:1680]=True
sky=(~obj)&band
for nm,(a0,a1) in {'below(60..120)':(60,120),'right(-30..30)':(-30,30),'left(150..210)':(150,180),'above(-120..-60)':(-120,-60)}.items():
  out=[]
  for d0 in range(0,40,4):
    sel=sky&(dist>=d0)&(dist<d0+4)&(((ang>=a0)&(ang<a1))|((a1>180)&(ang<a1-360)))
    if sel.sum()>100: out.append(f'{d0}:{n[sel].mean()-s[sel].mean():+.0f}({s[sel].mean():.0f})')
  print(nm,' '.join(out))
