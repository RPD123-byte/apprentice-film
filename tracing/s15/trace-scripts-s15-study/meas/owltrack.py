import cv2,numpy as np,sys,json
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
t0,t1=40.72,45.68
c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t0*25)))
prev=(1150,640)
out=[];tiles=[]
n=int(round((t1-t0)*25))+1
for i in range(n):
    t=t0+i/25
    ok,f=c.read(); g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
    bl=cv2.blur(g,(9,9)); sq=cv2.blur(g*g,(9,9)); sd=np.sqrt(np.maximum(sq-bl*bl,0))
    m=((bl>228)&(sd<14)).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((5,5),np.uint8))
    k,lab,st,cen=cv2.connectedComponentsWithStats(m)
    best=None;bs=-1
    for j in range(1,k):
        x,y,w,h,a=st[j]
        if a<800: continue
        d=np.hypot(cen[j][0]-prev[0],cen[j][1]-prev[1])
        # prefer compact blobs near previous center
        score=a/(1+ (d/120)**2)
        if w>700 or h>600: score*=0.05
        if score>bs: bs=score;best=j
    if best is None: out.append([round(t,2),None]); continue
    x,y,w,h,a=st[best]; cx,cy=cen[best]
    prev=(cx,cy)
    out.append([round(t,2),int(x),int(y),int(w),int(h),int(a),round(float(cx),1),round(float(cy),1)])
    vis=f.copy(); cv2.rectangle(vis,(x,y),(x+w,y+h),(0,0,255),4)
    vis=cv2.resize(vis,(368,158)); cv2.putText(vis,f'{t:.2f}',(3,14),0,0.45,(0,255,255),1); tiles.append(vis)
for o in out: print(o)
json.dump(out,open(sys.argv[1],'w'))
while len(tiles)%8: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(sys.argv[2],np.vstack([np.hstack(tiles[i:i+8]) for i in range(0,len(tiles),8)]))
