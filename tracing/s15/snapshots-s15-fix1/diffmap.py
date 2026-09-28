# diffmap.py dir f out.jpg : render | source | blurred signed diff (red = render brighter, blue = darker)
import sys,cv2,numpy as np
sys.path.insert(0,'h'); from common import frame
d,f,out=sys.argv[1],int(sys.argv[2]),sys.argv[3]
r=cv2.imread(f'{d}/r{f}.png'); s=frame(f)
a=cv2.GaussianBlur(cv2.cvtColor(r,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),12); b=cv2.GaussianBlur(cv2.cvtColor(s,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),12)
dd=np.clip((a-b)*3,-255,255); m=np.zeros_like(r); m[...,2]=np.clip(dd,0,255); m[...,0]=np.clip(-dd,0,255)
top=np.hstack([r,s]); bot=np.hstack([m,cv2.cvtColor(((a+b)/2).astype(np.uint8),cv2.COLOR_GRAY2BGR)])
im=cv2.resize(np.vstack([top,bot]),(2206,946)); cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,85])
print('mae12',np.abs(a-b).mean())
