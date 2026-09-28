import numpy as np,cv2,sys
sys.path.insert(0,'snapshots/s08-fix1-tools')
from gmodel import *
f0=np.load('snapshots/s08-fix1-tools/f0target.npy').astype(float)
raw=cv2.imread(sys.argv[1] if len(sys.argv)>1 else 'snapshots/s08-fix1-raw/r765.png').astype(float)
yy,xx=np.mgrid[0:H,0:W]
T=cv2.GaussianBlur(f0,(0,0),2).mean(-1); R=cv2.GaussianBlur(raw,(0,0),2).mean(-1)
hsvT=cv2.cvtColor(np.clip(f0,0,255).astype(np.uint8),cv2.COLOR_BGR2HSV)[...,1]/255
hsvR=cv2.cvtColor(np.clip(raw,0,255).astype(np.uint8),cv2.COLOR_BGR2HSV)[...,1]/255
bright=(T>150)&(R>150)&(hsvT<0.2)&(hsvR<0.2)
# erode to avoid edges
bright=cv2.erode(bright.astype(np.uint8),np.ones((7,7),np.uint8))==1
dark=(T<45)&(R<60)
dark=cv2.erode(dark.astype(np.uint8),np.ones((9,9),np.uint8))==1
st=100
print('bright ratio T/R (blocks %d)'%st)
print('      '+' '.join('%5d'%x for x in range(0,W,st)))
for y in range(0,H,st):
  row=[]
  for x in range(0,W,st):
    m=bright[y:y+st,x:x+st]
    row.append('%5.2f'%np.median(T[y:y+st,x:x+st][m]/R[y:y+st,x:x+st][m]) if m.sum()>200 else '    .')
  print('%5d '%y+' '.join(row))
print('dark diff T-R')
for y in range(0,H,st):
  row=[]
  for x in range(0,W,st):
    m=dark[y:y+st,x:x+st]
    row.append('%5.1f'%np.median(T[y:y+st,x:x+st][m]-R[y:y+st,x:x+st][m]) if m.sum()>200 else '    .')
  print('%5d '%y+' '.join(row))
print('dark ratio T/R')
for y in range(0,H,st):
  row=[]
  for x in range(0,W,st):
    m=dark[y:y+st,x:x+st]
    row.append('%5.2f'%(np.median(T[y:y+st,x:x+st][m])/np.median(R[y:y+st,x:x+st][m])) if m.sum()>200 else '    .')
  print('%5d '%y+' '.join(row))
print('R dark level')
for y in range(0,H,st):
  row=[]
  for x in range(0,W,st):
    m=dark[y:y+st,x:x+st]
    row.append('%5.1f'%(np.median(R[y:y+st,x:x+st][m])) if m.sum()>200 else '    .')
  print('%5d '%y+' '.join(row))
