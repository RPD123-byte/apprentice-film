import cv2, numpy as np, glob, sys
d=sys.argv[1]
def mask(f):
    hsv=cv2.cvtColor(cv2.GaussianBlur(f,(0,0),6),cv2.COLOR_BGR2HSV)
    m=((hsv[...,1]<45)&(hsv[...,2]>20)&(hsv[...,2]<150)).astype(np.uint8)*255
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((25,25),np.uint8))
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((61,61),np.uint8))
    n,lab,st,cen=cv2.connectedComponentsWithStats(m)
    if n<2: return np.zeros(m.shape,bool)
    i=1+np.argmax(st[1:,4]); return lab==i
out=[]
for fr in sorted(glob.glob(d+'/frame-*.png')):
    rf=fr.replace('frame-','ref-'); b=cv2.imread(rf)
    if b is None: continue
    a=mask(cv2.imread(fr)); b=mask(b)
    print(fr.split('/')[-1],'IoU',round((a&b).sum()/max(1,(a|b).sum()),3))
    vis=np.zeros(a.shape+(3,),np.uint8); vis[a,2]=255; vis[b,1]=255
    out.append(cv2.resize(vis,(551,236)))
while len(out)%4: out.append(np.zeros_like(out[0]))
cv2.imwrite(d+'/masks.jpg',np.vstack([np.hstack(out[i:i+4]) for i in range(0,len(out),4)]))
