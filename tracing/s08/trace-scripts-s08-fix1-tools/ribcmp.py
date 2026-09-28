import cv2,numpy as np,sys
rd=sys.argv[1]; x0,y0,x1,y1,st=map(int,sys.argv[2:7])
a=cv2.imread(rd+'/r765.png').astype(np.uint8); b=((cv2.imread('snapshots/s08-rev1-src/f765.png').astype(float)+cv2.imread('snapshots/s08-rev1-src/f764.png').astype(float))/2).astype(np.uint8)
def cl(im):
  sm=cv2.bilateralFilter(im,7,40,5); hsv=cv2.cvtColor(sm,cv2.COLOR_BGR2HSV).astype(float); H=hsv[...,0]*2; S=hsv[...,1]; V=hsv[...,2]
  c=np.zeros(H.shape,np.uint8)
  c[(V>50)&(S>40)&((H>215)&(H<290))]=2
  c[(V>50)&(S>50)&((H>=290)|(H<8))]=3
  c[(V>50)&(S>60)&(H>=8)&(H<30)]=4
  c[(V>50)&(S>60)&(H>=30)&(H<70)]=5
  return cv2.erode(c,np.ones((5,5),np.uint8)) if False else c
ca,cb=cl(a),cl(b)
nm={2:'vio',3:'pnk',4:'org',5:'yel'}
for c in [2,3,4,5]:
  print('class',nm[c],' (ren -> src) mean RGB per block')
  for y in range(y0,y1,st):
    row=[]
    for x in range(x0,x1,st):
      ma=cv2.erode((ca[y:y+st,x:x+st]==c).astype(np.uint8),np.ones((5,5),np.uint8))==1
      mb=cv2.erode((cb[y:y+st,x:x+st]==c).astype(np.uint8),np.ones((5,5),np.uint8))==1
      if ma.sum()>60 and mb.sum()>60:
        A=a[y:y+st,x:x+st][ma].mean(0)[::-1]; B=b[y:y+st,x:x+st][mb].mean(0)[::-1]
        row.append('(%d,%d) %3d,%3d,%3d>%3d,%3d,%3d'%(x,y,*A,*B))
    if row: print('  '+' | '.join(row))
