import cv2, numpy as np
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
K=[(110.52,1.0029),(110.64,1.0027),(110.8,1.0015),(111.0,1.0008),(111.2,1.0006),(111.4,1.0003),(111.52,1.0)]
def cam(t):
    for i in range(1,len(K)):
        if t<=K[i][0]+1e-9:
            a,b=K[i-1],K[i]; u=(t-a[0])/(b[0]-a[0]); return a[1]+(b[1]-a[1])*u
    return 1.0
fs=[]
for F in range(2763,2789,2):
    c.set(1,F); ok,f=c.read(); s=cam(F/25)
    M=np.float32([[s,0,1150*(1-s)],[0,s,950*(1-s)]])
    fs.append(cv2.warpAffine(f,M,(2206,946),flags=cv2.INTER_LINEAR|cv2.WARP_INVERSE_MAP))
med=np.median(np.array(fs),0).astype(np.uint8)
cv2.imwrite('medA.png',med)
