import cv2, numpy as np, json, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
d=json.load(open('spans.json')); c=cv2.VideoCapture(V); tiles=[]
for key,T in d.items():
    T=np.array(T); a,b=[float(x) for x in key.split('-')]
    for t,k in [(a,0),(b,len(T)-1)]:
        c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read()
        for j in range(T.shape[1]):
            pts=np.int32(T[:,j]); cv2.polylines(f,[pts],False,(0,200,255),1); cv2.circle(f,tuple(pts[k]),5,(0,0,255),-1)
        cv2.putText(f,f'{key} @ {t}',(10,40),0,1.2,(0,255,0),3); tiles.append(cv2.resize(f,(1103,473)))
rows=[np.hstack(tiles[i:i+2]) for i in range(0,len(tiles),2)]
cv2.imwrite('vizspans.jpg',np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,80])
