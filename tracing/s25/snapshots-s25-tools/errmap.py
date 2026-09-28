# errmap.py render.png FRAME out.jpg -- sigma-8 |diff| map (render - source), signed (red = render brighter), + region stats
import cv2,numpy as np,sys
r=cv2.imread(sys.argv[1],0).astype(np.float32); f=int(sys.argv[2])
s=cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s25-src/f{f:05d}.png',0).astype(np.float32)
d=cv2.GaussianBlur(r,(0,0),8)-cv2.GaussianBlur(s,(0,0),8)
a=np.abs(d)
print('all %.2f'%a.mean())
for nm,(x0,y0,x1,y1) in {'owlbox':(800,280,1400,920),'left':(144,360,800,912),'right':(1400,360,2023,912),'banner':(144,128,2023,360),'room':(0,0,2206,128),'bottom':(0,912,2206,946),'sides':(0,0,144,946)}.items():
    print(nm, '%.2f'%a[y0:y1,x0:x1].mean(), 'signed %.2f'%d[y0:y1,x0:x1].mean(), 'contrib %.2f'%(a[y0:y1,x0:x1].sum()/a.size))
vis=np.zeros(r.shape+(3,),np.uint8)
vis[...,2]=np.clip(d*4,0,255); vis[...,1]=np.clip(-d*4,0,255)
cv2.imwrite(sys.argv[3],cv2.resize(vis,None,fx=0.5,fy=0.5))
