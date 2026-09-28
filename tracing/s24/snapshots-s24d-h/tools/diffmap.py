import cv2,numpy as np,sys
ren=sys.argv[1]; k=int(sys.argv[2]); out=sys.argv[3]
a=cv2.imread(ren,0).astype(np.float32); b=cv2.imread('src/f%04d.png'%(2420+k),0).astype(np.float32)
d=cv2.GaussianBlur(a,(0,0),8)-cv2.GaussianBlur(b,(0,0),8)
vis=np.zeros(a.shape+(3,),np.uint8)
vis[...,2]=np.clip(d*4,0,255); vis[...,1]=np.clip(-d*4,0,255)
base=cv2.cvtColor(b.astype(np.uint8),cv2.COLOR_GRAY2BGR)//3
cv2.imwrite(out,cv2.resize(np.maximum(vis,base),None,fx=0.5,fy=0.5))
# region table
for name,(x0,y0,x1,y1) in {'TL':(0,0,735,315),'TM':(735,0,1470,315),'TR':(1470,0,2206,315),'ML':(0,315,735,630),'MM':(735,315,1470,630),'MR':(1470,315,2206,630),'BL':(0,630,735,946),'BM':(735,630,1470,946),'BR':(1470,630,2206,946)}.items():
  print(name,'%.1f'%d[y0:y1,x0:x1].mean(),end='  ')
print()
