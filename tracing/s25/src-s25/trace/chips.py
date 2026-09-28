# paper chips per frame: small bright near-rectangular blobs that are not on the clean page
import cv2,numpy as np,json
from segm import L
base=np.median(np.stack([cv2.cvtColor(cv2.imread(f'src/f{f:05d}.png'),cv2.COLOR_BGR2GRAY) for f in [2513,2540,2542,2545,2548,2555,2560,2600,2615,2630,2650]]),0).astype(np.float32)
out={}
for f in range(2513,2590):
    if f==2514: continue
    g=cv2.cvtColor(cv2.imread(f'src/f{f:05d}.png'),cv2.COLOR_BGR2GRAY).astype(np.float32)
    gb=cv2.GaussianBlur(g,(0,0),0.8)
    m=((gb>175)&(gb-base>55)).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
    n,lab,st,cen=cv2.connectedComponentsWithStats(m,connectivity=4)
    chips=[]
    for i in range(1,n):
        a=st[i,4]
        if a<40 or a>900: continue
        ys,xs=np.nonzero(lab[st[i,1]:st[i,1]+st[i,3],st[i,0]:st[i,0]+st[i,2]]==i)
        pts=np.stack([xs+st[i,0],ys+st[i,1]],1).astype(np.float32)
        (cx,cy),(w,h),ang=cv2.minAreaRect(pts)
        if min(w,h)<6 or max(w,h)>45 or max(w,h)/max(1,min(w,h))>4.5: continue
        if a/(w*h+1e-6)<0.68: continue
        v=float(np.median(gb[pts[:,1].astype(int),pts[:,0].astype(int)]))/255
        # dark outline check: ring 2..4 px outside the rect
        box=cv2.boxPoints(((cx,cy),(w+8,h+8),ang)).astype(np.int32); box2=cv2.boxPoints(((cx,cy),(w+2,h+2),ang)).astype(np.int32)
        x0,y0=max(0,int(cx)-40),max(0,int(cy)-40); sub=np.zeros((80,80),np.uint8)
        cv2.fillPoly(sub,[box-[x0,y0]],1); cv2.fillPoly(sub,[box2-[x0,y0]],0)
        ring=gb[y0:y0+80,x0:x0+80][sub[:gb[y0:y0+80,x0:x0+80].shape[0],:gb[y0:y0+80,x0:x0+80].shape[1]]>0]
        if len(ring)==0 or np.percentile(ring,30)>v*255-70: continue
        chips.append([round(float(cx),1),round(float(cy),1),round(float(w)+1,1),round(float(h)+1,1),round(float(np.radians(ang)),2),round(v,2)])
    out[f]=chips
    if f%6==1: print(f/25,len(chips))
json.dump(out,open('chips.json','w'))
f=2522
vis=cv2.imread(f'src/f{f:05d}.png')
for cx,cy,w,h,a,v in out[f]:
    box=cv2.boxPoints(((cx,cy),(w,h),np.degrees(a))).astype(np.int32); cv2.polylines(vis,[box],True,(0,0,255),2)
cv2.imwrite('chips.jpg',cv2.resize(vis,None,fx=0.5,fy=0.5))
