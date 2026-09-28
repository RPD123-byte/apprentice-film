# Background (back wall) KLT track with dynamic masks: the laptop (screen H + base H, dilated), the designer (left of a
# measured boundary), the desk (below the desk/wall line) and the mug are excluded. Homography ref(119.6) -> t.
# Also reports per-region residuals so we can see whether one wall homography explains every background object.
import cv2, numpy as np, sys, json
from src import frame
tref=119.6; tend=float(sys.argv[1]) if len(sys.argv)>1 else 125.0; outname=sys.argv[2] if len(sys.argv)>2 else 'bg'
S={round(r[0],2):np.array(r[1:]).reshape(3,3) for r in json.load(open('../s27d-meas/screen.json'))}
for r in json.load(open('../s27d-meas/screen2.json')): S[round(r[0],2)]=np.array(r[1:]).reshape(3,3)
B={round(r[0],2):np.array(r[1:]).reshape(3,3) for r in json.load(open('../s27d-meas/klt_base.json'))['H']}
# designer right boundary x(t) (read off gridded frames), and the desk/wall line y at A and at B
DX=[(120.8,-50),(121.0,60),(121.2,140),(121.5,260),(121.8,380),(122.1,520),(122.4,640),(122.7,760),(123.0,860),(123.3,930),(123.6,990),(124.0,1040),(124.4,1070),(125.0,1090),(127.6,1090),(128.2,1120),(128.8,1150),(129.3,1180)]
def dx(t): return np.interp(t,[a for a,b in DX],[b for a,b in DX],left=-100)
def deskline(t): return np.interp(t,[119.6,122.0,124.6,127.6,129.3],[640,610,545,545,600])
LID=np.float32([[-100,-240],[2300,-240],[2300,1170],[-100,1170]])
BASEQ=np.float32([[680,673],[1489,673],[1620,774],[546,774]])
Wd,Hd=2206,946
def mask(t):
    m=np.zeros((Hd,Wd),np.uint8); m[:int(deskline(t))-8,:]=255
    k=round(t,2)
    if k in S:
        q=cv2.perspectiveTransform(LID[None],S[k])[0]; cv2.fillPoly(m,[np.int32(q)],0)
    if k in B:
        q=cv2.perspectiveTransform(BASEQ[None],B[k])[0]; cv2.fillPoly(m,[np.int32(q)],0)
    m=cv2.erode(m,np.ones((31,31),np.uint8))
    x=int(dx(t))+60
    if x>0: m[:,:min(Wd,x)]=0
    return m
lk=dict(winSize=(21,21),maxLevel=4,criteria=(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,40,0.01))
ts=[round(tref+i*0.04,2) for i in range(int(round((tend-tref)/0.04))+1)]
g0=frame(tref,True); m0=mask(tref)
cur=cv2.goodFeaturesToTrack(g0,2500,0.004,8,mask=m0).reshape(-1,2).astype(np.float32); refp=cur.copy()
prev=g0; Hc=np.eye(3); out={tref:np.eye(3)}
REG={'shelfL':(0,0,660,290),'shelfR':(1040,0,1600,390),'speak':(390,410,700,660),'books':(1330,330,1620,620),'window':(1600,0,2206,640)}
for t in ts[1:]:
    g=frame(t,True); m=mask(t)
    nxt,st,_=cv2.calcOpticalFlowPyrLK(prev,g,cur.reshape(-1,1,2),None,**lk)
    bck,st2,_=cv2.calcOpticalFlowPyrLK(g,prev,nxt,None,**lk)
    nxt=nxt.reshape(-1,2); fb=np.linalg.norm(bck.reshape(-1,2)-cur,axis=1)
    ok=(st.ravel()==1)&(st2.ravel()==1)&(fb<0.7)
    ok&=np.array([0<=x<Wd and 0<=y<Hd and m[int(y),int(x)]>0 for x,y in nxt])
    cur=nxt[ok]; refp=refp[ok]
    M,inl=cv2.findHomography(refp,cur,cv2.RANSAC,2.0)
    err=np.linalg.norm(cv2.perspectiveTransform(refp.reshape(-1,1,2),M).reshape(-1,2)-cur,axis=1)
    # per-region residuals (ref-frame regions)
    rs=[]
    for nm,(x0,y0,x1,y1) in REG.items():
        sel=(refp[:,0]>=x0)&(refp[:,0]<x1)&(refp[:,1]>=y0)&(refp[:,1]<y1)
        if sel.sum()>=10:
            d=(cur[sel]-cv2.perspectiveTransform(refp[sel].reshape(-1,1,2),M).reshape(-1,2)).mean(0)
            rs.append(f"{nm}:{sel.sum()}({d[0]:+.1f},{d[1]:+.1f})")
    keep=err<6; cur=cur[keep]; refp=refp[keep]
    Hc=M/M[2,2]; out[t]=Hc
    if len(cur)<900:
        mm=m.copy()
        for x,y in cur: cv2.circle(mm,(int(x),int(y)),8,0,-1)
        Q=cv2.goodFeaturesToTrack(g,2000-len(cur),0.004,8,mask=mm)
        if Q is not None:
            Q=Q.reshape(-1,2).astype(np.float32); R=cv2.perspectiveTransform(Q.reshape(-1,1,2),np.linalg.inv(Hc)).reshape(-1,2)
            cur=np.vstack([cur,Q]); refp=np.vstack([refp,R])
    c=cv2.perspectiveTransform(np.float32([[[0,0],[2206,0],[2206,640],[0,640]]]),Hc)[0]
    print(f"{t:.2f} pts={len(cur)} inl={int(inl.sum())} med={np.median(err):.2f} "+" ".join(f"({x:.0f},{y:.0f})" for x,y in c)+"  "+" ".join(rs),flush=True)
    prev=g
json.dump({'tref':tref,'H':[[k]+[round(float(v),8) for v in out[k].flatten()] for k in sorted(out)]},open(f'../s27d-meas/{outname}.json','w'))
