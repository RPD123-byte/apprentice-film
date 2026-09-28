import cv2, numpy as np
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V); fps=c.get(5)
def grab(t):
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*fps))); ok,f=c.read(); return f.astype(np.int16)
ts=[95.92+0.04*i for i in range(29)]
fr=[grab(t) for t in ts]
plate=np.median(np.stack(fr),0)
for t,f in zip(ts,fr):
    d=np.abs(f-plate).max(2).astype(np.uint8)
    m=(d>60).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((5,5),np.uint8))
    n,lab,st,cen=cv2.connectedComponentsWithStats(m)
    comps=sorted([(st[i,4],i) for i in range(1,n)],reverse=True)[:3]
    s=' '.join(f"[({st[i,0]},{st[i,1]})-({st[i,0]+st[i,2]},{st[i,1]+st[i,3]}) c=({cen[i][0]:.0f},{cen[i][1]:.0f}) a={a}]" for a,i in comps)
    print(f"{t:.2f} {s}")
