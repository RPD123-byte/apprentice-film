# diffmap.py render.png k out.jpg [x0 y0 x1 y1]: signed blurred luminance diff (render - source), red = render brighter
import sys, cv2, numpy as np
sys.path.insert(0, __file__.rsplit('/',1)[0]); from src import frame
r=cv2.cvtColor(cv2.imread(sys.argv[1]),cv2.COLOR_BGR2GRAY).astype(np.float32); s=cv2.cvtColor(frame(int(sys.argv[2])),cv2.COLOR_BGR2GRAY).astype(np.float32)
sg=3
d=cv2.GaussianBlur(r,(0,0),sg)-cv2.GaussianBlur(s,(0,0),sg)
if len(sys.argv)>7:
    x0,y0,x1,y1=map(int,sys.argv[4:8]); d=d[y0:y1,x0:x1]; s=s[y0:y1,x0:x1]
g=np.clip(s*0.5,0,255)
im=np.stack([g,g,g],-1)
im[...,2]+=np.clip(d*4,0,255); im[...,0]+=np.clip(-d*4,0,255)
im=np.clip(im,0,255).astype(np.uint8)
if im.shape[1]>1400: im=cv2.resize(im,None,fx=1400/im.shape[1],fy=1400/im.shape[1],interpolation=cv2.INTER_AREA)
cv2.imwrite(sys.argv[3],im)
print('mean signed %.2f abs %.2f'%(d.mean(),np.abs(d).mean()))
