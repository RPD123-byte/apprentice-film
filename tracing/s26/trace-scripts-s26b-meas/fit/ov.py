# ov.py poses.json F [F...] -> ov-<F>.jpg : source frame with the source mask (green) and rig silhouette (red)
import cv2, numpy as np, sys, json, subprocess
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
cap=cv2.VideoCapture(V)
d=json.loads(subprocess.run(['node','sil.mjs',sys.argv[1]]+sys.argv[2:],capture_output=True,text=True,check=True).stdout)
tiles=[]
for F in sys.argv[2:]:
    cap.set(1,int(F)); ok,f=cap.read()
    M=np.fromfile(f'm/{F}.bin',np.uint8).reshape(473,1103); M=cv2.resize(M,(2206,946))>127
    R=np.zeros(M.shape,np.uint8)
    for p in d[F]['sil']: cv2.fillPoly(R,[np.array(p).round().astype(np.int32)],1)
    vis=(f*0.6).astype(np.uint8)
    cs,_=cv2.findContours(M.astype(np.uint8),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE); cv2.drawContours(vis,cs,-1,(0,255,0),2)
    cs,_=cv2.findContours(R,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE); cv2.drawContours(vis,cs,-1,(0,0,255),2)
    for e in d[F]['eyes']: cv2.circle(vis,(int(e[0]),int(e[1])),5,(255,0,255),-1)
    iou=(M&(R>0)).sum()/(M|(R>0)).sum()
    cv2.putText(vis,f'F{F} IoU {iou:.3f}',(20,50),0,1.5,(0,255,255),3)
    cv2.imwrite(f'ov-{F}.jpg',vis)
    tiles.append(cv2.resize(vis,(1103,473)))
if len(tiles)>1:
    while len(tiles)%2: tiles.append(np.zeros_like(tiles[0]))
    cv2.imwrite('ov-sheet.jpg',np.vstack([np.hstack(tiles[i:i+2]) for i in range(0,len(tiles),2)]))
