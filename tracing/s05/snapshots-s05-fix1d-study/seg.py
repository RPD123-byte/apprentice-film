# segment a region of the ungraded reference into faces (felzenszwalb on a blurred copy), simplify each to a polygon
# (<= ~8 vertices), print polygons with their mean value; draw an overlay for review.
import sys, json, numpy as np, cv2
from skimage.segmentation import felzenszwalb
ref=sys.argv[1]; x0,y0,x1,y1=[int(v) for v in sys.argv[2:6]]
scale=float(sys.argv[6]) if len(sys.argv)>6 else 300; sig=float(sys.argv[7]) if len(sys.argv)>7 else 3
minsz=int(sys.argv[8]) if len(sys.argv)>8 else 400; eps=float(sys.argv[9]) if len(sys.argv)>9 else 4
u=np.load(f'{ref}_u.npy').mean(2)[y0:y1,x0:x1]
ub=cv2.GaussianBlur(u,(0,0),sig)
lab=felzenszwalb(ub,scale=scale,sigma=0.5,min_size=minsz)
img=cv2.cvtColor((np.clip(u,0,1)*255).astype(np.uint8),cv2.COLOR_GRAY2BGR)
out={}
for L in np.unique(lab):
    m=(lab==L).astype(np.uint8)
    if m.sum()<minsz: continue
    cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    c=max(cs,key=cv2.contourArea)
    p=cv2.approxPolyDP(c,eps,True)[:,0,:]
    pts=[[int(x+x0),int(y+y0)] for x,y in p]
    out[f'r{L}']=dict(poly=pts,mean=round(float(ub[m>0].mean()),3),area=int(m.sum()))
    col=tuple(int(v) for v in np.random.RandomState(L).randint(60,255,3))
    cv2.polylines(img,[p.reshape(-1,1,2)],True,col,1,cv2.LINE_AA)
    M=cv2.moments(m); cx,cy=int(M['m10']/M['m00']),int(M['m01']/M['m00'])
    cv2.putText(img,str(L),(cx,cy),0,0.35,col,1)
json.dump(out,open(sys.argv[10] if len(sys.argv)>10 else 'seg.json','w'))
cv2.imwrite('seg.jpg',img)
print(len(out))
