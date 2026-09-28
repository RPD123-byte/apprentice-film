import cv2,numpy as np,sys
r=cv2.imread(sys.argv[1],0).astype(np.float32)/255
f=np.load('snapshots/s20-f2-trace/clean.npy')[60:1006,60:2266]
x0,y0,x1,y1=[int(v) for v in sys.argv[2].split()] if len(sys.argv)>2 else (0,0,1100,946)
a=r[y0:y1,x0:x1]; b=f[y0:y1,x0:x1]
g1=cv2.GaussianBlur(a,(0,0),6); g2=cv2.GaussianBlur(b,(0,0),6)
print('MAE s6 %.2f  s1.5 %.2f  s0 %.2f'%(np.abs(g1-g2).mean()*255, np.abs(cv2.GaussianBlur(a,(0,0),1.5)-cv2.GaussianBlur(b,(0,0),1.5)).mean()*255, np.abs(a-b).mean()*255))
if len(sys.argv)>3:
  zx0,zy0,zx1,zy1,sc=[float(v) for v in sys.argv[4].split()] if len(sys.argv)>4 else (250,250,750,650,1)
  zx0,zy0,zx1,zy1=map(int,(zx0,zy0,zx1,zy1))
  im=np.hstack([r[zy0:zy1,zx0:zx1],f[zy0:zy1,zx0:zx1]])
  im=cv2.resize((np.clip(im,0,1)*255).astype(np.uint8),None,fx=sc,fy=sc,interpolation=cv2.INTER_NEAREST if sc>1 else cv2.INTER_AREA)
  cv2.imwrite(sys.argv[3],im)
