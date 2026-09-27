# presD.py: outline presence over the D ring frames, mapped into frame 2818 coordinates by the ring's chained motion
import cv2, numpy as np, json
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
cap=cv2.VideoCapture(V)
rows={r[0]:r for r in json.load(open('ringcum.json'))['rows']}
acc=None; n=0
R=json.load(open('ringD.json'))
cum=np.eye(3)
for F in range(2818,2839):
    if F>2818:
        r=R[str(F)]
        Ms=[np.vstack([np.array(r[s][:6]).reshape(2,3),[0,0,1]]) for s in 'LR' if s in r and r[s][-1]>=150]
        M=sum(Ms)/len(Ms); cum=M@cum
    cap.set(1,F); ok,f=cap.read(); g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
    hsv=cv2.cvtColor(f,cv2.COLOR_BGR2HSV)
    th=cv2.morphologyEx(g,cv2.MORPH_TOPHAT,np.ones((9,9),np.uint8))
    mk=((th>40)&(g>140)&(hsv[...,1]<80)).astype(np.float32)
    mk=cv2.dilate(mk,np.ones((3,3),np.uint8))
    w=cv2.warpAffine(mk,cum[:2].astype(np.float32),(2206,946),flags=cv2.INTER_LINEAR|cv2.WARP_INVERSE_MAP)
    acc=w if acc is None else acc+w; n+=1
P=acc/n; np.save('P-D.npy',P); cv2.imwrite('P-D.png',(P*255).astype(np.uint8))
