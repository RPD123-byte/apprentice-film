import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V); fps=c.get(5)
D=[0,0.03,0.06,0.091,0.1221,0.1714,0.2052,0.2395,0.2726,0.3076,0.3413,0.3769,0.4122,0.4495,0.4857,0.5223]
C=np.array([1104.5,642.9])
t0=40.0; nf=int(sys.argv[1]) if len(sys.argv)>1 else 10
c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t0*fps)))
frames=[]
for i in range(nf):
    ok,f=c.read(); frames.append(cv2.cvtColor(f,cv2.COLOR_BGR2GRAY))
g0=frames[0]
mask=np.full_like(g0,255); mask[540:946,850:1350]=0
pts=cv2.goodFeaturesToTrack(g0,1500,0.005,12,mask=mask)
p=pts; alive=np.ones(len(pts),bool); tr=[pts.reshape(-1,2)]
for i in range(1,nf):
    q,st,err=cv2.calcOpticalFlowPyrLK(frames[i-1],frames[i],p,None,winSize=(41,41),maxLevel=5)
    r,st2,_=cv2.calcOpticalFlowPyrLK(frames[i],frames[i-1],q,None,winSize=(41,41),maxLevel=5)
    fb=np.linalg.norm((r-p).reshape(-1,2),axis=1)
    alive&=(st.reshape(-1)==1)&(st2.reshape(-1)==1)&(fb<1.5)
    tr.append(q.reshape(-1,2)); p=q
T=np.stack(tr)[:,alive]; p0=T[0]
# solve w per point: p_t - C = (p0 - C)/(1 - d w)  -> ratio
out=[]
for j in range(T.shape[1]):
    ws=[]
    for i in range(1,nf):
        a=p0[j]-C; b=T[i,j]-C
        k=np.dot(a,b)/np.dot(a,a)
        if np.dot(a,a)>400: ws.append((1-1/k)/D[i])
    if ws:
        w=np.median(ws); pred=np.array([C+(p0[j]-C)/(1-D[i]*w) for i in range(nf)]); e=np.abs(pred-T[:,j]).max()
        out.append((p0[j,0],p0[j,1],w,e))
out=np.array(out); np.save('wpts.npy',out)
print(len(out))
# grid summary: median w per 150px cell
for y in range(0,946,120):
    row=''
    for x in range(0,2206,150):
        s=out[(out[:,0]>=x)&(out[:,0]<x+150)&(out[:,1]>=y)&(out[:,1]<y+120)&(out[:,3]<8)]
        row+=(f'{np.median(s[:,2]):5.2f}' if len(s)>=2 else '   - ')+' '
    print(f'{y:4d} '+row)
