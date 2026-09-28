import cv2, numpy as np, json
m=cv2.imread('shardmask.png',0)
md=cv2.dilate(m,np.ones((3,3),np.uint8))
segs=json.load(open('segs.json'))
def pts(s,n=None):
    x1,y1,x2,y2=s[:4]; n=n or max(2,int(np.hypot(x2-x1,y2-y1))); return np.linspace(x1,x2,n).round().astype(int),np.linspace(y1,y2,n).round().astype(int)
keep=[]; acc=np.zeros_like(m)
segs=sorted(segs,key=lambda s:-np.hypot(s[2]-s[0],s[3]-s[1]))
for s in segs:
    xs,ys=pts(s); cov=(md[ys,xs]>0).mean()
    if cov<0.85: continue
    new=(acc[ys,xs]==0).mean()
    if new<0.35: continue
    keep.append(s); cv2.line(acc,(s[0],s[1]),(s[2],s[3]),255,7)
for s in keep:
    if s[4] is None or s[4]<96.12: s[4]=96.12
print(len(keep))
from collections import Counter
print(sorted(Counter([s[4] for s in keep]).items()))
vis=np.zeros((946,2206,3),np.uint8)
for s in keep: cv2.line(vis,(s[0],s[1]),(s[2],s[3]),(255,255,255),2)
cv2.imwrite('keep.png',vis)
json.dump(keep,open('keep.json','w'))
print(json.dumps([[int(a) for a in s[:4]]+[s[4]] for s in keep]).replace(' ',''))
