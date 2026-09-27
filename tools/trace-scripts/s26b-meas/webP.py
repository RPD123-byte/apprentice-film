# presence of thin bright crack lines during A (110.52-111.52), mapped to STAGE coords (= pre-squash s25 stage)
import cv2, numpy as np, re, json
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
def grab(F):
    c.set(1,F); ok,f=c.read(); return f
ref=cv2.cvtColor(grab(2250),cv2.COLOR_BGR2GRAY).astype(np.float32)  # 90.0 s: the uncracked framed page
refmax=cv2.dilate(ref,np.ones((7,7),np.uint8))
K=[(110.52,1.0029),(110.64,1.0027),(110.8,1.0015),(111.0,1.0008),(111.2,1.0006),(111.4,1.0003),(111.52,1.0)]
def cam(t):
    for i in range(1,len(K)):
        if t<=K[i][0]+1e-9:
            a,b=K[i-1],K[i]; u=(t-a[0])/(b[0]-a[0]); return a[1]+(b[1]-a[1])*u
    return 1.0
acc=None; n=0
for F in range(2763,2789):
    f=grab(F); g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
    th=cv2.morphologyEx(g,cv2.MORPH_TOPHAT,np.ones((13,13),np.uint8))
    m=(th>55)&(g>140)&(g-refmax>30)
    hsv=cv2.cvtColor(f,cv2.COLOR_BGR2HSV); m&=hsv[...,1]<70
    m=cv2.dilate(m.astype(np.uint8)*255,np.ones((3,3),np.uint8)).astype(np.float32)/255
    s=cam(F/25); M=np.float32([[s,0,1150*(1-s)],[0,s,950*(1-s)]])  # stage -> frame
    m=cv2.warpAffine(m,M,(2206,946),flags=cv2.INTER_LINEAR|cv2.WARP_INVERSE_MAP)
    acc=m if acc is None else acc+m; n+=1
P=acc/n
src=open('/Users/computer/rootline/apprentice-film/src/shots/s25/cracks.js').read()
mm=re.search(r'CRACKS_STAND\s*=\s*\[([^\]]*)\]',src,re.S)
S=np.array([float(v) for v in mm.group(1).replace('\n','').split(',') if v.strip()]).reshape(-1,4)
B=np.zeros(P.shape,np.uint8)
for x0,y0,x1,y1 in S: cv2.line(B,(int(round(x0)),int(round(y0))),(int(round(x1)),int(round(y1))),255,9)
np.save('P-A.npy',P); np.save('Pn-A.npy',P*(B==0))
cv2.imwrite('P-A.png',(P*255).astype(np.uint8)); cv2.imwrite('Pn-A.png',(P*(B==0)*255).astype(np.uint8))
print(n)
