import cv2, numpy as np, json
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V); fps=c.get(5)
def grab(t):
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*fps))); ok,f=c.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.int16)
ts=[round(95.92+0.04*i,2) for i in range(29)]
fr={t:grab(t) for t in ts}
base=np.minimum(fr[95.92],fr[96.2])  # before lines appear
last=fr[97.04]
# lines: thin bright ridges: tophat on last frame, and brighter than base
th=cv2.morphologyEx(last.astype(np.uint8),cv2.MORPH_TOPHAT,np.ones((9,9),np.uint8))
d=(last-base)
m=((th>50)&(d>40)).astype(np.uint8)*255
# remove owl blobs: big components with large thickness
op=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((7,7),np.uint8))
op=cv2.dilate(op,np.ones((15,15),np.uint8))
m[op>0]=0
cv2.imwrite('shardmask.png',m)
L=cv2.HoughLinesP(m,1,np.pi/360,40,minLineLength=40,maxLineGap=8)
segs=[]
for l in L[:,0]:
    x1,y1,x2,y2=map(int,l)
    # appearance time: first frame where mean diff along segment > 30
    n=int(np.hypot(x2-x1,y2-y1)); xs=np.linspace(x1,x2,n).astype(int); ys=np.linspace(y1,y2,n).astype(int)
    ta=None
    for t in ts:
        v=(fr[t][ys,xs]-base[ys,xs]).mean()
        if v>35: ta=t; break
    segs.append([x1,y1,x2,y2,ta])
print(len(segs))
json.dump(segs,open('segs.json','w'))
from collections import Counter
print(Counter([s[4] for s in segs]))
