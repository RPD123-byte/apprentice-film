import cv2,numpy as np,sys
sys.path.insert(0,'snapshots/s08-fix1-tools')
from gmodel import *
rd=sys.argv[1] if len(sys.argv)>1 else 'snapshots/s08-fix1-h1'
rawp=sys.argv[2] if len(sys.argv)>2 else 'snapshots/s08-fix1-raw/r765.png'
raw=cv2.imread(rawp).astype(float)
src=(cv2.imread('snapshots/s08-rev1-src/f764.png').astype(float)+cv2.imread('snapshots/s08-rev1-src/f765.png').astype(float))/2
ren=cv2.imread(rd+'/r765.png').astype(float)
yy,xx=np.mgrid[0:H,0:W]
f0s=Sinv(np.clip(src/255/(vign(xx,yy)[...,None]*flick(30.6)),0,1))
est=raw
for it in range(4):
  hb=halo_map(est); need=np.clip(1-(1-f0s)/(1-0.5*hb),0,1)*255; est=need
Rl=cv2.GaussianBlur(raw.mean(-1),(0,0),3); Nl=cv2.GaussianBlur(need.mean(-1),(0,0),3)
la=cv2.GaussianBlur(ren.mean(-1),(0,0),2); lb=cv2.GaussianBlur(src.mean(-1),(0,0),2)
sa=cv2.cvtColor(ren.astype(np.uint8),cv2.COLOR_BGR2HSV)[...,1]/255; sb=cv2.cvtColor(src.astype(np.uint8),cv2.COLOR_BGR2HSV)[...,1]/255
br=cv2.erode(((la>100)&(lb>90)&(sa<0.25)&(sb<0.25)).astype(np.uint8),np.ones((7,7),np.uint8))==1
dk=cv2.erode(((la<55)&(lb<55)).astype(np.uint8),np.ones((9,9),np.uint8))==1
xr=[(0,150),(150,300),(300,500),(500,700),(700,900),(900,1100),(1100,1440),(1950,2206)]
print('k bright / k dark   (needed raw / current raw)')
print('       '+'  '.join('%11s'%('%d-%d'%r) for r in xr))
for y in range(460,946,40):
  row=[]
  for x0,x1 in xr:
    s=''
    for m in [br,dk]:
      mm=m[y:y+40,x0:x1]
      s+=('%5.2f'%(np.median(Nl[y:y+40,x0:x1][mm])/np.median(Rl[y:y+40,x0:x1][mm])) if mm.sum()>150 else '   . ')+' '
    row.append(s)
  print('%4d  '%y+' '.join(row))
