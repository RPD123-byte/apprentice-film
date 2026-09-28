# srcmask.py: source colour-owl masks for F (t >= 114.08) = |frame - warped clean page|
import cv2, numpy as np, sys, json
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
cap=cv2.VideoCapture(V)
def fr(F):
    cap.set(cv2.CAP_PROP_POS_FRAMES,F); ok,f=cap.read(); return f
PA=[[112.7,0.8219,166.7,100.5],[112.9,0.8288,165.8,101.5],[113.1,0.8505,147.1,91.6],[113.3,0.8869,110.1,72.4],
 [113.45,0.9211,70.6,52.0],[113.6,0.9385,55.2,39.3],[113.8,0.9616,35.8,25.7],[114.05,0.9792,18.9,13.7],
 [114.3,0.9912,9.0,6.7],[114.5,0.9953,5.1,2.8],[114.7,0.9992,0.8,0.4],[114.9,1,0,0]]
def arr(t):
    if t<=PA[0][0]: return PA[0][1:]
    for i in range(1,len(PA)):
        if t<=PA[i][0]:
            a,b=PA[i-1],PA[i]; u=(t-a[0])/(b[0]-a[0]); return [a[k]+(b[k]-a[k])*u for k in (1,2,3)]
    return [1,0,0]
def clean():
    a=fr(2937).astype(np.float32)   # 117.48: owl in the corner
    b=fr(2875).astype(np.float32)   # 115.00: owl centre-left
    c=a.copy(); c[0:330,1850:2206]=b[0:330,1850:2206]
    return c
C=clean()
def mask(F, thr=55):
    t=F/25; s,tx,ty=arr(t)
    f=fr(F).astype(np.float32)
    M=np.float32([[s,0,tx],[0,s,ty]])
    cw=cv2.warpAffine(C,M,(2206,946),flags=cv2.INTER_LINEAR,borderMode=cv2.BORDER_REPLICATE)
    d=np.abs(cv2.GaussianBlur(f,(0,0),2.5)-cv2.GaussianBlur(cw,(0,0),2.5)).sum(2)
    k=(d>thr).astype(np.uint8)
    k=cv2.morphologyEx(k,cv2.MORPH_OPEN,np.ones((5,5),np.uint8)); k=cv2.morphologyEx(k,cv2.MORPH_CLOSE,np.ones((15,15),np.uint8))
    n,lab,st,cen=cv2.connectedComponentsWithStats(k)
    if n<2: return None,f
    i=1+np.argmax(st[1:,4]); m=(lab==i)
    # fill holes
    mm=m.astype(np.uint8)*255; cs,_=cv2.findContours(mm,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    out=np.zeros_like(mm); cv2.drawContours(out,cs,-1,255,-1)
    return out>0,f
if __name__=='__main__':
    Fs=[int(x) for x in sys.argv[1].split(',')]; outd=sys.argv[2]
    import os; os.makedirs(outd,exist_ok=True)
    tiles=[]
    for F in Fs:
        m,f=mask(F)
        if m is None: continue
        ys,xs=np.nonzero(m)
        print(F, F/25, 'bbox',xs.min(),ys.min(),xs.max(),ys.max(),'area',m.sum())
        vis=f.astype(np.uint8).copy(); vis[~m]=(vis[~m]*0.3).astype(np.uint8)
        cv2.putText(vis,f'{F/25:.2f}',(20,60),0,2,(0,255,255),3)
        tiles.append(cv2.resize(vis,(551,236)))
        np.save(f'{outd}/m{F}.npy',m)
    while len(tiles)%4: tiles.append(np.zeros_like(tiles[0]))
    cv2.imwrite(outd+'/masks.jpg',np.vstack([np.hstack(tiles[i:i+4]) for i in range(0,len(tiles),4)]))
