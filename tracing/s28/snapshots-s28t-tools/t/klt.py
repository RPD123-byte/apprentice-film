# KLT tracks over the orbit (129.20..131.40), seeded every 5 frames, forward-backward checked.
import cv2,numpy as np,json
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
n0=int(round(129.20*25)); nF=int(round(131.40*25))
c.set(cv2.CAP_PROP_POS_FRAMES,n0)
G=[]
for n in range(n0,nF+1):
    ok,f=c.read(); G.append(cv2.GaussianBlur(cv2.cvtColor(f,cv2.COLOR_BGR2GRAY),(0,0),1.0))
N=len(G)
lk=dict(winSize=(31,31),maxLevel=4,criteria=(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,40,0.01))
tracks=[]
for s in range(0,N-1,4):
    p=cv2.goodFeaturesToTrack(G[s],1500,0.01,12)
    if p is None: continue
    p=p.reshape(-1,2)
    tr=[[ (s,float(x),float(y)) ] for x,y in p]
    alive=np.arange(len(p)); cur=p.copy()
    for k in range(s+1,N):
        nxt,st,_=cv2.calcOpticalFlowPyrLK(G[k-1],G[k],cur.reshape(-1,1,2).astype(np.float32),None,**lk)
        back,st2,_=cv2.calcOpticalFlowPyrLK(G[k],G[k-1],nxt,None,**lk)
        nxt=nxt.reshape(-1,2); back=back.reshape(-1,2)
        ok=(st.ravel()==1)&(st2.ravel()==1)&(np.linalg.norm(back-cur,axis=1)<0.7)
        ok&=(nxt[:,0]>2)&(nxt[:,0]<2204)&(nxt[:,1]>2)&(nxt[:,1]<944)
        for j in np.where(ok)[0]: tr[alive[j]].append((k,float(nxt[j,0]),float(nxt[j,1])))
        alive=alive[ok]; cur=nxt[ok]
        if len(alive)==0 or k-s>=12: break
    tracks+= [t for t in tr if len(t)>=5]
json.dump(dict(n0=n0,tracks=tracks),open('snapshots/s28t-tools/t/klt.json','w'))
print(len(tracks))
