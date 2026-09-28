import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
cap=cv2.VideoCapture(V); F=int(sys.argv[1]); x0,y0,x1,y1=map(int,sys.argv[2:6])
cap.set(1,F); ok,f=cap.read(); g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
A=cv2.cvtColor(cv2.imread('../medA.png'),cv2.COLOR_BGR2GRAY).astype(np.float32)
A=cv2.GaussianBlur(A,(0,0),1.0)
patch=g[y0:y1,x0:x1]
best=[]
for s in np.arange(1.2,2.61,0.1):
    for rdeg in range(-20,21,5):
        ps=cv2.resize(patch,None,fx=1/s,fy=1/s,interpolation=cv2.INTER_AREA)
        h,w=ps.shape; Mr=cv2.getRotationMatrix2D((w/2,h/2),rdeg,1); ps=cv2.warpAffine(ps,Mr,(w,h),borderMode=cv2.BORDER_REFLECT)
        c=ps[h//6:h-h//6,w//6:w-w//6]
        r=cv2.matchTemplate(A,c,cv2.TM_CCOEFF_NORMED); _,mv,_,ml=cv2.minMaxLoc(r)
        best.append((mv,s,rdeg,ml[0]+c.shape[1]/2,ml[1]+c.shape[0]/2))
best.sort(reverse=True)
for b in best[:5]: print('score %.3f s %.1f rot %d at (%.0f,%.0f)'%b)
