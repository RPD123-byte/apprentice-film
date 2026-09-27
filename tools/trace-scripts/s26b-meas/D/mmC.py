# mmC.py REF F0 F1 : like mm.py but against a reference source frame REF (owl masked in both)
import cv2, numpy as np, json, sys, pickle
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
cap=cv2.VideoCapture(V)
REF,F0,F1=int(sys.argv[1]),int(sys.argv[2]),int(sys.argv[3])
def owlmask(F,g):
    m=np.full(g.shape,255,np.uint8)
    try:
        om=np.fromfile(f'../fit/m/{F}.bin',np.uint8).reshape(473,1103); om=cv2.resize(om,(2206,946))>127
        m[cv2.dilate(om.astype(np.uint8),np.ones((21,21),np.uint8))>0]=0
    except Exception: pass
    return m
cap.set(1,REF); ok,a=cap.read(); A=cv2.cvtColor(a,cv2.COLOR_BGR2GRAY)
sift=cv2.SIFT_create(nfeatures=40000,contrastThreshold=0.012)
kr,dr=sift.detectAndCompute(A,owlmask(REF,A)); PR=np.float32([k.pt for k in kr])
flann=cv2.FlannBasedMatcher(dict(algorithm=1,trees=5),dict(checks=64))
out={}
for F in range(F0,F1+1):
    cap.set(1,F); ok,f=cap.read(); g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
    kf,df=sift.detectAndCompute(g,owlmask(F,g))
    ms=flann.knnMatch(df,dr,k=2)
    good=[x for x,y in ms if x.distance<0.8*y.distance]
    P=PR[[x.trainIdx for x in good]]; Q=np.float32([kf[x.queryIdx].pt for x in good])
    alive=np.ones(len(good),bool); models=[]
    for it in range(300):
        idx=np.nonzero(alive)[0]
        if len(idx)<7: break
        M,inl=cv2.estimateAffinePartial2D(P[idx],Q[idx],ransacReprojThreshold=3,maxIters=5000,confidence=0.999)
        if M is None: break
        inl=inl.ravel().astype(bool)
        if inl.sum()<7: break
        pr=P[idx]@M[:,:2].T+M[:,2]; err=np.hypot(*(pr-Q[idx]).T); sel=idx[err<3.5]
        s=float(np.hypot(M[0,0],M[1,0]))
        if 0.5<s<5: models.append({'M':M.tolist(),'s':s,'P':P[sel].tolist(),'Q':Q[sel].tolist()})
        alive[sel]=False
    out[F]=models
    print(F,len(good),'matches',len(models),'models',sum(len(mm['P']) for mm in models),'inl',[ (len(mm['P']),round(mm['s'],2)) for mm in models][:10])
pickle.dump(out,open(f'mmC-{REF}-{F0}-{F1}.pkl','wb'))
