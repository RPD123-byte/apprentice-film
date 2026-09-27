# Auto landmarks for a morph span: features inside the figure mask (minus the owl) at Ta tracked forward to Tb,
# and features at Tb tracked backward to Ta; keep the tracks whose frame-to-frame forward/backward error stays small.
import cv2, numpy as np, sys, json
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
MASK={
 20.84:([(100,946),(120,650),(480,460),(560,350),(560,0),(1500,0),(1490,340),(1440,480),(1540,560),(1620,590),(1760,610),(1950,700),(2050,946)],(1680,370,200,260)),
 21.64:([(540,946),(560,760),(700,560),(840,500),(830,250),(830,0),(1745,0),(1720,320),(1780,520),(1850,600),(1950,640),(2206,700),(2206,946)],(1950,380,190,280)),
 22.04:([(790,946),(1000,730),(1090,700),(1080,520),(1020,300),(1010,100),(1010,0),(1930,0),(1900,330),(1920,500),(1960,700),(2206,720),(2206,946)],(2090,430,170,310)),
 22.48:([(650,946),(650,860),(1200,720),(1330,660),(1250,560),(1135,440),(1150,300),(1090,160),(1120,0),(1960,0),(1940,300),(1780,420),(1760,700),(2150,760),(2206,946)],(1935,480,200,310)),
 23.04:([(480,946),(520,760),(830,650),(1080,680),(1300,600),(1360,560),(1250,380),(1210,180),(1230,0),(1910,0),(1900,300),(1960,500),(2090,700),(2100,946)],(1650,470,200,270)),
 23.12:([(480,946),(520,760),(830,650),(1080,680),(1300,600),(1360,560),(1250,380),(1210,180),(1230,0),(1910,0),(1900,300),(1960,500),(2090,700),(2100,946)],(1650,470,200,270)),
}
c=cv2.VideoCapture(V)
def grab(i):
    c.set(cv2.CAP_PROP_POS_FRAMES,i); ok,f=c.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
def mask_for(t,shape):
    poly,(ox,oy,rx,ry)=MASK[t]; m=np.zeros(shape,np.uint8)
    cv2.fillPoly(m,[np.int32(poly)],255); cv2.ellipse(m,(ox,oy),(rx,ry),0,0,360,0,-1); return m
lk=dict(winSize=(31,31),maxLevel=4,criteria=(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,30,0.01))
def run(frames,P):
    alive=np.ones(len(P),bool); out=[P.copy()]
    for k in range(1,len(frames)):
        p1,s1,_=cv2.calcOpticalFlowPyrLK(frames[k-1],frames[k],P,None,**lk)
        pb,s2,_=cv2.calcOpticalFlowPyrLK(frames[k],frames[k-1],p1,None,**lk)
        fb=np.linalg.norm(pb-P,axis=1); alive&=(s1.ravel()==1)&(s2.ravel()==1)&(fb<0.8)
        P=p1.reshape(-1,2); out.append(P.copy())
    return np.array(out),alive
def span(Ta,Tb,n=500):
    ia,ib=int(round(Ta*25)),int(round(Tb*25)); frames=[grab(i) for i in range(ia,ib+1)]
    res=[]
    fa=cv2.goodFeaturesToTrack(frames[0],n,0.01,16,mask=mask_for(Ta,frames[0].shape),blockSize=7).reshape(-1,2)
    Tf,af=run(frames,fa.astype(np.float32)); res.append(Tf[:,af])
    fbk=cv2.goodFeaturesToTrack(frames[-1],n,0.01,16,mask=mask_for(Tb,frames[0].shape),blockSize=7).reshape(-1,2)
    Tr,ar=run(frames[::-1],fbk.astype(np.float32)); res.append(Tr[::-1][:,ar])
    T=np.concatenate(res,axis=1)
    # the end points must lie in the masks (drop tracks that slid onto the owl / background)
    ma,mb=mask_for(Ta,frames[0].shape),mask_for(Tb,frames[0].shape)
    ok=[ma[int(min(945,max(0,p[1]))),int(min(2205,max(0,p[0])))]>0 and mb[int(min(945,max(0,q[1]))),int(min(2205,max(0,q[0])))]>0 for p,q in zip(T[0],T[-1])]
    T=T[:,np.array(ok,bool)]
    # thin: drop tracks closer than 22 px at Ta to an earlier kept one
    keep=[]
    for j in range(T.shape[1]):
        if all(np.hypot(*(T[0,j]-T[0,k]))>22 for k in keep): keep.append(j)
    T=T[:,keep]
    print(f'span {Ta}-{Tb}: fwd {af.sum()}/{len(af)} bwd {ar.sum()}/{len(ar)} kept {T.shape[1]}')
    return T
spans=[(20.84,21.64),(21.64,22.04),(22.04,22.48),(22.48,23.04),(23.04,23.12)]
out={}
for a,b in spans: out[f'{a}-{b}']=span(a,b).round(1).tolist()
json.dump(out,open('spans.json','w'))
