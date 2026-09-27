import cv2, numpy as np, json
m=cv2.imread('snapshots/s24-study/shardmask.png',0)
n,lab,st,cen=cv2.connectedComponentsWithStats(m,8)
conf=[]; 
mm=m.copy()
for i in range(1,n):
    x,y,w,h,a=st[i]
    if 40<=a<=900 and max(w,h)<45:
        pts=np.column_stack(np.where(lab==i))[:,::-1].astype(np.float32)
        (cx,cy),(rw,rh),ang=cv2.minAreaRect(pts)
        sol=a/max(1,rw*rh)
        if sol>0.6:
            conf.append([round(cx,1),round(cy,1),round(rw+1,1),round(rh+1,1),round(ang,1)])
            mm[lab==i]=0
print('confetti',len(conf))
# remove owl regions
for (x0,y0,x1,y1) in [(830,300,1580,660),(340,190,640,420),(1760,580,1960,780)]:
    mm[y0:y1,x0:x1]=0
cv2.imwrite('snapshots/s24-study/linemask.png',mm)
sk=mm
L=cv2.HoughLinesP(sk,1,np.pi/720,30,minLineLength=30,maxLineGap=8)
segs=[l[0].tolist() for l in L]
print('segs',len(segs))
# merge near-collinear overlapping segments
def ang(s): return np.arctan2(s[3]-s[1],s[2]-s[0])%np.pi
def dist_pt_line(p,s):
    a=np.array(s[:2],float); b=np.array(s[2:],float); d=b-a; L=np.hypot(*d)
    return abs(np.cross(d,np.array(p)-a))/L
merged=True
segs=[list(map(float,s)) for s in segs]
while merged:
    merged=False
    out=[]
    used=[False]*len(segs)
    for i in range(len(segs)):
        if used[i]: continue
        s=segs[i]
        for j in range(i+1,len(segs)):
            if used[j]: continue
            t=segs[j]
            da=abs(ang(s)-ang(t)); da=min(da,np.pi-da)
            if da>0.06: continue
            if max(dist_pt_line(t[:2],s),dist_pt_line(t[2:],s))>4: continue
            # overlap along direction
            a=np.array(s[:2]); d=np.array(s[2:])-a; Ls=np.hypot(*d); u=d/Ls
            pr=[0,Ls,np.dot(np.array(t[:2])-a,u),np.dot(np.array(t[2:])-a,u)]
            lo,hi=min(pr[2:]),max(pr[2:])
            if lo>Ls+10 or hi<-10: continue
            lo=min(0,lo); hi=max(Ls,hi)
            p0=a+u*lo; p1=a+u*hi
            s=[p0[0],p0[1],p1[0],p1[1]]; used[j]=True; merged=True
        out.append(s); used[i]=True
    segs=out
print('merged',len(segs))
segs=[[round(v,1) for v in s] for s in segs]
json.dump({'conf':conf,'segs':segs},open('snapshots/s24-study/shards.json','w'))
vis=np.zeros((946,2206,3),np.uint8)
for s in segs: cv2.line(vis,(int(s[0]),int(s[1])),(int(s[2]),int(s[3])),(255,255,255),3)
for c in conf:
    box=cv2.boxPoints(((c[0],c[1]),(c[2],c[3]),c[4])); cv2.fillPoly(vis,[box.astype(np.int32)],(0,200,255))
cv2.imwrite('snapshots/s24-study/shardvis.png',vis)
