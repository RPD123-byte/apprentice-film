# ringD.py: per D frame, (1) the colour-page window (pixels matching the arriving colour page), (2) left/right ring
# motion frame-to-frame (ORB similarity on the non-window, non-owl region)
import cv2, numpy as np, json
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
cap=cv2.VideoCapture(V)
def grab(F): cap.set(1,F); ok,f=cap.read(); return f
PA=[[112.7,0.8219,166.7,100.5],[112.9,0.8288,165.8,101.5],[113.1,0.8505,147.1,91.6],[113.3,0.8869,110.1,72.4],[113.45,0.9211,70.6,52.0],[113.6,0.9385,55.2,39.3],[113.8,0.9616,35.8,25.7],[114.05,0.9792,18.9,13.7],[114.3,0.9912,9.0,6.7]]
def arr(t):
    for i in range(1,len(PA)):
        if t<=PA[i][0]:
            a,b=PA[i-1],PA[i]; u=(t-a[0])/(b[0]-a[0]); return [a[k]+(b[k]-a[k])*u for k in (1,2,3)]
    return PA[-1][1:]
cc=grab(2937).astype(np.float32)
orb=cv2.ORB_create(6000)
out={}; prev=None
for F in range(2818,2852):
    f=grab(F); s,tx,ty=arr(F/25)
    Wc=cv2.warpAffine(cc,np.float32([[s,0,tx],[0,s,ty]]),(2206,946))
    d=cv2.GaussianBlur(np.abs(f.astype(np.float32)-Wc).sum(2),(0,0),4)
    win=(d<60).astype(np.uint8)
    win=cv2.morphologyEx(win,cv2.MORPH_OPEN,np.ones((9,9),np.uint8))
    try:
        om=np.fromfile(f'../fit/m/{F}.bin',np.uint8).reshape(473,1103); om=cv2.resize(om,(2206,946))>127
    except Exception: om=np.zeros(win.shape,bool)
    win2=win.copy(); win2[om]=1
    win2=cv2.morphologyEx(win2,cv2.MORPH_CLOSE,np.ones((25,25),np.uint8))
    n,lab,st,cen=cv2.connectedComponentsWithStats(win2)
    i=1+np.argmax(st[1:,4]) if n>1 else 0
    W=(lab==i).astype(np.uint8)
    cs,_=cv2.findContours(W,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    poly=cv2.approxPolyDP(max(cs,key=cv2.contourArea),3,True).reshape(-1,2).tolist() if cs else []
    g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
    ring=((W==0)&(~om)).astype(np.uint8)*255
    k,dsc=orb.detectAndCompute(g,ring)
    rec={'window':poly,'area':int(W.sum())}
    if prev is not None:
        pk,pd=prev
        m=sorted(cv2.BFMatcher(cv2.NORM_HAMMING,crossCheck=True).match(pd,dsc),key=lambda x:x.distance)[:3000]
        A=np.float32([pk[x.queryIdx].pt for x in m]); B=np.float32([k[x.trainIdx].pt for x in m])
        for side,sel in (('L',A[:,0]<1103),('R',A[:,0]>=1103)):
            if sel.sum()<10: continue
            M,inl=cv2.estimateAffinePartial2D(A[sel],B[sel],ransacReprojThreshold=2.5)
            if M is None: continue
            rec[side]=[round(float(v),5) for v in M.ravel()]+[int(inl.sum())]
    prev=(k,dsc); out[F]=rec
    print(F,'window area',rec['area'],'L',rec.get('L',[None]*7)[-1],'R',rec.get('R',[None]*7)[-1], 'sL %.4f'%np.hypot(*rec['L'][0:4:3]) if 'L' in rec else '', 'sR %.4f'%np.hypot(*rec['R'][0:4:3]) if 'R' in rec else '')
json.dump(out,open('ringD.json','w'))
