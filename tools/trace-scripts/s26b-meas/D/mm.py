# mm.py F0 F1 : per frame, sequential-RANSAC similarity models of the frame's shards against the stage page (median A)
import cv2, numpy as np, json, sys, pickle
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
cap=cv2.VideoCapture(V)
F0,F1=int(sys.argv[1]),int(sys.argv[2])
A=cv2.cvtColor(cv2.imread('../medA.png'),cv2.COLOR_BGR2GRAY)
sift=cv2.SIFT_create(nfeatures=40000,contrastThreshold=0.012)
kr,dr=sift.detectAndCompute(A,None); PR=np.float32([k.pt for k in kr])
flann=cv2.FlannBasedMatcher(dict(algorithm=1,trees=5),dict(checks=64))
out={}
for F in range(F0,F1+1):
    cap.set(1,F); ok,f=cap.read(); g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
    # ignore the owl
    m=np.full(g.shape,255,np.uint8)
    try:
        om=np.fromfile(f'../fit/m/{F}.bin',np.uint8).reshape(473,1103); om=cv2.resize(om,(2206,946))>127
        m[cv2.dilate(om.astype(np.uint8),np.ones((21,21),np.uint8))>0]=0
    except Exception: pass
    kf,df=sift.detectAndCompute(g,m)
    ms=flann.knnMatch(df,dr,k=2)
    good=[a for a,b in ms if a.distance<0.78*b.distance]
    P=PR[[a.trainIdx for a in good]]; Q=np.float32([kf[a.queryIdx].pt for a in good])
    alive=np.ones(len(good),bool); models=[]
    for it in range(200):
        idx=np.nonzero(alive)[0]
        if len(idx)<8: break
        M,inl=cv2.estimateAffinePartial2D(P[idx],Q[idx],ransacReprojThreshold=3,maxIters=5000,confidence=0.999)
        if M is None: break
        inl=inl.ravel().astype(bool)
        if inl.sum()<8: break
        pr=P[idx]@M[:,:2].T+M[:,2]; err=np.hypot(*(pr-Q[idx]).T); sel=idx[err<3.5]
        # refit on the selection
        M2,_=cv2.estimateAffinePartial2D(P[sel],Q[sel],method=cv2.LMEDS)
        if M2 is not None: M=M2
        s=float(np.hypot(M[0,0],M[1,0]))
        if 0.5<s<4:
            models.append({'M':M.tolist(),'s':s,'P':P[sel].tolist(),'Q':Q[sel].tolist()})
        alive[sel]=False
    out[F]=models
    print(F,len(good),'matches',len(models),'models',[len(mm['P']) for mm in models][:12])
pickle.dump(out,open(f'mm-{F0}-{F1}.pkl','wb'))
