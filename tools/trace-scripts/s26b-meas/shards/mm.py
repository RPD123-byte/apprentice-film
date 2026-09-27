# mm.py F : multi-model (sequential RANSAC) similarity fits of the frame's shards against the B&W stage page (median A,
# stage coords) and the colour page (source 117.48 = colour-page coords). Writes models-F.json
import cv2, numpy as np, json, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
cap=cv2.VideoCapture(V)
def grab(F): cap.set(1,F); ok,f=cap.read(); return f
F=int(sys.argv[1])
fr=grab(F); g=cv2.cvtColor(fr,cv2.COLOR_BGR2GRAY)
A=cv2.cvtColor(cv2.imread('../medA.png'),cv2.COLOR_BGR2GRAY)
Cc=grab(2937); Cg=cv2.cvtColor(Cc,cv2.COLOR_BGR2GRAY)
sift=cv2.SIFT_create(nfeatures=20000, contrastThreshold=0.02)
kf,df=sift.detectAndCompute(g,None)
out=[]
for name,ref in (('bw',A),('col',Cg)):
    kr,dr=sift.detectAndCompute(ref,None)
    bf=cv2.BFMatcher(cv2.NORM_L2)
    ms=bf.knnMatch(df,dr,k=2)
    good=[m for m,n in ms if m.distance<0.8*n.distance]
    P=np.float32([kr[m.trainIdx].pt for m in good]); Q=np.float32([kf[m.queryIdx].pt for m in good])
    alive=np.ones(len(good),bool)
    for it in range(400):
        idx=np.nonzero(alive)[0]
        if len(idx)<6: break
        M,inl=cv2.estimateAffinePartial2D(P[idx],Q[idx],ransacReprojThreshold=2.5,maxIters=4000,confidence=0.999)
        if M is None: break
        inl=inl.ravel().astype(bool)
        if inl.sum()<6: break
        # refit on inliers, collect all alive points within 3 px
        pts=idx[inl]
        pr=(P[idx]@M[:,:2].T+M[:,2]); err=np.hypot(*(pr-Q[idx]).T)
        sel=idx[err<3.0]
        s=float(np.hypot(M[0,0],M[1,0])); a=float(np.arctan2(M[1,0],M[0,0]))
        q=Q[sel]
        out.append({'src':name,'M':M.tolist(),'n':int(len(sel)),'s':s,'rot':a,'bbox':[float(q[:,0].min()),float(q[:,1].min()),float(q[:,0].max()),float(q[:,1].max())]})
        alive[sel]=False
    print(name,len(good),'matches;',sum(1 for o in out if o['src']==name),'models')
json.dump(out,open(f'models-{F}.json','w'))
for o in sorted(out,key=lambda o:-o['n'])[:40]: print(o['src'],o['n'],'s=%.3f rot=%.1f'%(o['s'],np.degrees(o['rot'])),[round(v) for v in o['bbox']])
