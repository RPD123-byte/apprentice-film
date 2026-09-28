import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
Q=np.float32([[315,246],[834,168],[898,519],[409,648]])
D=np.float32([[0,0],[1600,0],[1600,1000],[0,1000]])
M=cv2.getPerspectiveTransform(Q,D)
ts=[float(x) for x in sys.argv[1].split(',')]; out=sys.argv[2]
tiles=[]
for t in ts:
    c.set(1,int(round(t*25))); ok,f=c.read()
    r=cv2.warpPerspective(f,M,(1600,1000))
    r=cv2.resize(r,(800,500)); cv2.putText(r,f'{t:.2f}',(5,20),0,0.6,(0,255,255),2); tiles.append(r)
cols=int(sys.argv[3]) if len(sys.argv)>3 else 2
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(out,np.vstack([np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]),[cv2.IMWRITE_JPEG_QUALITY,88])
