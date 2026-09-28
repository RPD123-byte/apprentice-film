import cv2,numpy as np,sys
rd=sys.argv[1]; fr=int(sys.argv[2]) if len(sys.argv)>2 else 765; st=int(sys.argv[3]) if len(sys.argv)>3 else 100
a=cv2.imread(f'{rd}/r{fr}.png').astype(float)
b=cv2.imread(f'snapshots/s08-rev1-src/f{fr}.png').astype(float)
if fr==765: b=(b+cv2.imread('snapshots/s08-rev1-src/f764.png').astype(float))/2
la=cv2.GaussianBlur(a.mean(-1),(0,0),2); lb=cv2.GaussianBlur(b.mean(-1),(0,0),2)
sa=cv2.cvtColor(a.astype(np.uint8),cv2.COLOR_BGR2HSV)[...,1]/255; sb=cv2.cvtColor(b.astype(np.uint8),cv2.COLOR_BGR2HSV)[...,1]/255
br=(la>120)&(lb>120)&(sa<0.25)&(sb<0.25)
br=cv2.erode(br.astype(np.uint8),np.ones((7,7),np.uint8))==1
print('bright neutral: ren/src output luma')
print('      '+' '.join('%7d'%x for x in range(0,2206,st)))
for y in range(0,946,st):
  row=[]
  for x in range(0,2206,st):
    m=br[y:y+st,x:x+st]
    row.append('%3.0f/%3.0f'%(np.median(la[y:y+st,x:x+st][m]),np.median(lb[y:y+st,x:x+st][m])) if m.sum()>150 else '   .   ')
  print('%5d '%y+' '.join(row))
