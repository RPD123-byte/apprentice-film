import cv2,numpy as np,sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
def grab(t):
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read(); return f
for t in [float(x) for x in sys.argv[1:]]:
    f=grab(t); g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
    m=(g>175).astype(np.uint8)*255
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((9,9),np.uint8))
    n,lab,st,cen=cv2.connectedComponentsWithStats(m)
    i=np.argmax(st[1:,4])+1
    mm=(lab==i).astype(np.uint8)*255
    cs,_=cv2.findContours(mm,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    cc=max(cs,key=cv2.contourArea)
    hull=cv2.convexHull(cc)
    ap=cv2.approxPolyDP(hull,0.015*cv2.arcLength(hull,True),True)
    print(t, 'bbox',st[i][:4],'area',st[i][4],'quad',ap.reshape(-1,2).tolist())
