import cv2,numpy as np,sys,re,glob
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
d=sys.argv[1]; ts=sys.argv[2].split(',')
rows=[]
for t in ts:
  t=float(t); c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,s=c.read()
  r=cv2.imread(f'{d}/r-{t:.2f}.png')
  gs=cv2.GaussianBlur(cv2.cvtColor(s,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),8); gr=cv2.GaussianBlur(cv2.cvtColor(r,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),8)
  dm=gr-gs
  vis=np.clip(128+dm*2,0,255).astype(np.uint8)
  vis=cv2.applyColorMap(vis,cv2.COLORMAP_JET) if False else cv2.cvtColor(vis,cv2.COLOR_GRAY2BGR)
  cv2.putText(vis,f'{t:.2f} MAE {np.abs(dm).mean():.1f}',(20,50),0,1.5,(0,0,255),3)
  rows.append(cv2.resize(np.hstack([vis,cv2.resize(r,(s.shape[1],s.shape[0]))]),None,fx=0.3,fy=0.3))
cv2.imwrite(f'{d}/diffmap.jpg',np.vstack(rows))
