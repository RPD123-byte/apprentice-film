import cv2,numpy as np,sys
r=cv2.imread(sys.argv[1]).astype(np.float32); s=cv2.imread(sys.argv[2]).astype(np.float32)
m=cv2.imread('mask.png'); cloud=m[...,2]>128; obj=m[...,1]>128; rib=(m[...,0]>128)&~cloud
sky=~obj
for nm,sel in (('sky',sky),('rib',rib),('cloud',cloud),('obj-other',obj&~cloud&~rib)):
  d=(r-s)[sel].mean(0)[::-1]; print(nm,'signed RGB diff',d.round(2))
