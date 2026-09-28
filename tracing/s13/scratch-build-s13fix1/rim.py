import cv2,numpy as np, math, sys, json
f=sys.argv[1]; cx,cy,rx,ry,rot=map(float,sys.argv[2:7]); N=32
B=cv2.imread(f,0).astype(float)
B=cv2.GaussianBlur(B,(3,3),0)
Rs=[];Ws=[]
for k in range(N):
    a=k/N*2*math.pi
    prof=[]
    for s in np.arange(0.8,1.2,0.0025):
        x=cx+math.cos(a)*rx*s*math.cos(rot)-math.sin(a)*ry*s*math.sin(rot)
        y=cy+math.cos(a)*rx*s*math.sin(rot)+math.sin(a)*ry*s*math.cos(rot)
        prof.append((s,B[int(round(y)),int(round(x))]))
    r=math.hypot(rx*math.cos(a),ry*math.sin(a))
    # find the darkest point in the band nearest s=1, then its run where v < (min+230)/2
    vals=np.array([v for s,v in prof]); ss=np.array([s for s,v in prof])
    # weight towards s=1
    i0=int(np.argmin(vals+ np.abs(ss-1)*400))
    mn=vals[i0]; thr=(mn+235)/2
    i1=i0
    while i1>0 and vals[i1-1]<thr: i1-=1
    i2=i0
    while i2<len(vals)-1 and vals[i2+1]<thr: i2+=1
    Rs.append(round((ss[i1]+ss[i2])/2,3)); Ws.append(round(min(9,(ss[i2]-ss[i1]+0.0025)*r),1))
    
print(json.dumps({'R':Rs,'W':Ws}))
