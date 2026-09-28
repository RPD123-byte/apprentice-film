import cv2, numpy as np
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
cap=cv2.VideoCapture(V); cap.set(1,2849); ok,f=cap.read(); g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
A=cv2.cvtColor(cv2.imread('../medA.png'),cv2.COLOR_BGR2GRAY).astype(np.float32)
# slab at 113.96: centre (972,60), angle -32 deg (previous fit). Unrotate the frame about that centre.
cx,cy,ang=972,60,-32
M=cv2.getRotationMatrix2D((cx,cy),ang,1.0)   # rotate by ang (ccw positive) -> aligns slab axes
u=cv2.warpAffine(g,M,(2206,946),flags=cv2.INTER_LINEAR,borderValue=-1)
cv2.imwrite('unrot.jpg',np.clip(u,0,255).astype(np.uint8))
crop=u[30:630,100:1380]
best=[]
for k in [2.5,3,3.5,4,5,6,7,8]:
    c=cv2.resize(crop,None,fx=1/k,fy=1/k,interpolation=cv2.INTER_AREA)
    for rd in [-12,-6,0,6,12]:
        h,w=c.shape; Mr=cv2.getRotationMatrix2D((w/2,h/2),rd,1); cr=cv2.warpAffine(c,Mr,(w,h),borderMode=cv2.BORDER_REFLECT)
        cr=cr[h//8:h-h//8,w//8:w-w//8]
        As=cv2.GaussianBlur(A,(0,0),max(0.8,14/k))
        r=cv2.matchTemplate(As,cr,cv2.TM_CCOEFF_NORMED); _,mv,_,ml=cv2.minMaxLoc(r)
        best.append((mv,k,rd,ml[0]+cr.shape[1]/2,ml[1]+cr.shape[0]/2))
best.sort(reverse=True)
for b in best[:8]: print('score %.3f k %.1f rot %d at (%.0f,%.0f)'%b)
