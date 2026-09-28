# signed blurred diff map (render - source), gray 128 = equal, brighter = render too bright: python3 dmap.py DIR f x0 y0 x1 y1 out [sigma]
import cv2,numpy as np,sys
d,f=sys.argv[1],int(sys.argv[2]); x0,y0,x1,y1=map(int,sys.argv[3:7]); out=sys.argv[7]; sg=float(sys.argv[8]) if len(sys.argv)>8 else 8
r=cv2.imread(f'{d}/r{f:04d}.png',0).astype(np.float32); s=cv2.imread('../s02-fix1h-src/%04d.png'%f,0).astype(np.float32)
D=cv2.GaussianBlur(r,(0,0),sg)-cv2.GaussianBlur(s,(0,0),sg)
m=np.clip(128+D*3,0,255).astype(np.uint8)[y0:y1,x0:x1]
col=cv2.applyColorMap(m,cv2.COLORMAP_JET)
g=cv2.cvtColor(s[y0:y1,x0:x1].astype(np.uint8),cv2.COLOR_GRAY2BGR)
im=cv2.addWeighted(col,0.6,g,0.4,0)
for yy in range(0,y1-y0,50): cv2.putText(im,str(y0+yy),(2,yy+12),0,0.4,(255,255,255),1)
for xx in range(0,x1-x0,100): cv2.putText(im,str(x0+xx),(xx+2,y1-y0-4),0,0.4,(255,255,255),1)
cv2.imwrite(out,im); print(out)
