import cv2,numpy as np,sys,json
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
def grab(t):
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read(); return f
res={}
t=float(sys.argv[1]); t1=float(sys.argv[2]); step=float(sys.argv[3])
while t<=t1+1e-6:
    f=grab(t).astype(np.int16)
    b,g,r=f[...,0],f[...,1],f[...,2]
    mx=f.max(2); mn=f.min(2)
    m=((mx<125)&(mn>40)&(mx-mn<22)).astype(np.uint8)*255
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((9,9),np.uint8))
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((15,15),np.uint8))
    n,lab,st,cen=cv2.connectedComponentsWithStats(m)
    i=1+np.argmax(st[1:,4])
    mask=(lab==i).astype(np.uint8)
    cs,_=cv2.findContours(mask,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    cnt=max(cs,key=cv2.contourArea)
    hull=cv2.convexHull(cnt)
    ap=cv2.approxPolyDP(hull,0.02*cv2.arcLength(hull,True),True).reshape(-1,2)
    x,y,w,h=cv2.boundingRect(cnt)
    print(f"{t:.2f} area={st[i,4]} bbox=({x},{y},{x+w},{y+h}) poly={ap.tolist()}")
    res[f"{t:.2f}"]=dict(bbox=[int(x),int(y),int(x+w),int(y+h)],poly=ap.tolist())
    t+=step
json.dump(res,open('snapshots/s28-tools/lid.json','w'))
