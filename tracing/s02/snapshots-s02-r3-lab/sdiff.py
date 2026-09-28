# signed blurred difference (render - source), sigma S, gridded: red = render brighter, blue = render darker
import cv2, numpy as np, sys
d,f=sys.argv[1],int(sys.argv[2]); S=float(sys.argv[3]) if len(sys.argv)>3 else 6
x0,y0,x1,y1=[int(v) for v in sys.argv[4].split(':')] if len(sys.argv)>4 else (0,0,2206,946)
a=cv2.GaussianBlur(cv2.imread(f'{d}/r{f:04d}.png',0).astype(np.float32),(0,0),S); b=cv2.GaussianBlur(cv2.imread(f'../s02-r3-src/{f:04d}.png',0).astype(np.float32),(0,0),S)
e=(a-b)[y0:y1,x0:x1]; base=cv2.imread(f'../s02-r3-src/{f:04d}.png',0)[y0:y1,x0:x1].astype(np.float32)*0.5
o=np.dstack([base+np.clip(-e,0,127)*2, base, base+np.clip(e,0,127)*2]).clip(0,255).astype(np.uint8)
for x in range((x0//100+1)*100,x1,100): cv2.line(o,(x-x0,0),(x-x0,y1-y0),(0,255,0),1); cv2.putText(o,str(x),(x-x0+2,12),0,0.4,(0,255,0),1)
for y in range((y0//100+1)*100,y1,100): cv2.line(o,(0,y-y0),(x1-x0,y-y0),(0,255,0),1); cv2.putText(o,str(y),(2,y-y0-2),0,0.4,(0,255,0),1)
cv2.imwrite(f'{d}/sdiff-{f:04d}.jpg',o,[cv2.IMWRITE_JPEG_QUALITY,85])
