# errmap.py PREFIX out.jpg sigma t1 t2 ... : signed blurred difference (render - source) averaged, as a colour map
import cv2,numpy as np,sys
P=sys.argv[1]; out=sys.argv[2]; sg=float(sys.argv[3]); ts=sys.argv[4:]
acc=None
for t in ts:
    r=cv2.imread(f'{P}-{t}.png'); s=cv2.imread('../s20-rev1-src/n%d.png'%round(float(t)*25))
    g1=cv2.GaussianBlur(cv2.cvtColor(r,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),sg)
    g2=cv2.GaussianBlur(cv2.cvtColor(s,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),sg)
    d=g1-g2; acc=d if acc is None else acc+d
acc/=len(ts)
v=np.clip(acc*4,-255,255)
im=np.zeros(acc.shape+(3,),np.uint8)
im[...,2]=np.clip(v,0,255); im[...,0]=np.clip(-v,0,255)
s=cv2.imread('../s20-rev1-src/n%d.png'%round(float(ts[0])*25))
im=cv2.addWeighted(im,0.75,(s*0.35).astype(np.uint8),1,0)
for x in range(0,im.shape[1],100): cv2.line(im,(x,0),(x,im.shape[0]),(0,90,0),1); cv2.putText(im,str(x),(x+2,14),0,0.45,(0,255,0),1)
for y in range(0,im.shape[0],100): cv2.line(im,(0,y),(im.shape[1],y),(0,90,0),1); cv2.putText(im,str(y),(2,y-2),0,0.45,(0,255,0),1)
cv2.imwrite(out,cv2.resize(im,None,fx=0.8,fy=0.8))
print('mean abs', np.abs(acc).mean())
