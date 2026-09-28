# presC.py: presence of thin bright lines over the rigid part of the blast (F0..F1), mapped into frame Fref coordinates
import cv2, numpy as np, sys, json
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
cap=cv2.VideoCapture(V)
def grab(F): cap.set(1,F); ok,f=cap.read(); return f
Fref,F0,F1=int(sys.argv[1]),int(sys.argv[2]),int(sys.argv[3]); tag=sys.argv[4]
ref=cv2.cvtColor(grab(Fref),cv2.COLOR_BGR2GRAY)
orb=cv2.ORB_create(8000)
kr,dr=orb.detectAndCompute(ref,None)
acc=None; n=0; Ms={}
for F in range(F0,F1+1):
    f=grab(F); g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
    if F==Fref: M=np.float32([[1,0,0],[0,1,0]])
    else:
        k,d=orb.detectAndCompute(g,None)
        m=sorted(cv2.BFMatcher(cv2.NORM_HAMMING,crossCheck=True).match(dr,d),key=lambda x:x.distance)[:2000]
        A=np.float32([kr[x.queryIdx].pt for x in m]); B=np.float32([k[x.trainIdx].pt for x in m])
        M,inl=cv2.estimateAffinePartial2D(A,B,ransacReprojThreshold=2)   # ref -> F
        print(F,'inl',int(inl.sum()),'s=%.4f tx=%.1f ty=%.1f'%(np.hypot(M[0,0],M[1,0]),M[0,2],M[1,2]))
    Ms[F]=M.tolist()
    gf=g.astype(np.float32)
    th=cv2.morphologyEx(gf,cv2.MORPH_TOPHAT,np.ones((9,9),np.uint8))
    hsv=cv2.cvtColor(f,cv2.COLOR_BGR2HSV)
    mk=((th>45)&(gf>150)&(hsv[...,1]<80)).astype(np.float32)
    mk=cv2.dilate(mk,np.ones((3,3),np.uint8))
    w=cv2.warpAffine(mk,M,(2206,946),flags=cv2.INTER_LINEAR|cv2.WARP_INVERSE_MAP)
    acc=w if acc is None else acc+w; n+=1
P=acc/n
np.save(f'P-{tag}.npy',P); json.dump(Ms,open(f'cam-{tag}.json','w'))
cv2.imwrite(f'P-{tag}.png',(P*255).astype(np.uint8))
