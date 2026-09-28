import cv2,numpy as np,sys
p=sys.argv[1]; im=cv2.imread(p,0); W=im.shape[1]//2
crops=[(350,150,750,450),(830,140,1230,440),(1300,80,1700,380),(100,760,500,946),(1800,200,2200,500)]
rows=[]
for x0,y0,x1,y1 in crops:
  a=im[y0:y1,x0:x1]; b=im[y0:y1,W+x0:W+x1]
  rows.append(cv2.resize(np.hstack([a,np.full((y1-y0,4),128,np.uint8),b]),None,fx=1.5,fy=1.5,interpolation=cv2.INTER_NEAREST))
sel=[int(s) for s in sys.argv[3].split(',')] if len(sys.argv)>3 else range(len(rows))
mw=max(rows[i].shape[1] for i in sel)
cv2.imwrite(sys.argv[2],np.vstack([np.pad(rows[i],((0,4),(0,mw-rows[i].shape[1]))) for i in sel]))
