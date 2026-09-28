import cv2,numpy as np,json,sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
d=json.load(open(sys.argv[1])); out=sys.argv[2]
ts=sorted(float(k) for k in d)
if len(sys.argv)>3: ts=[t for t in ts if any(abs(t-float(x))<1e-3 for x in sys.argv[3].split(','))]
tiles=[]
C=np.float32([[0,0],[465,0],[465,648],[0,648]]).reshape(-1,1,2)
B=np.float32([[51,160],[423,160],[423,600.5],[51,600.5]]).reshape(-1,1,2)
for t in ts:
    H=np.array(d[str(t)] if str(t) in d else d[f'{t}'])
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read()
    f=(f*0.8).astype(np.uint8)
    for Q,col in [(C,(0,0,255)),(B,(0,255,0))]:
        q=cv2.perspectiveTransform(Q,H).reshape(-1,2)
        cv2.polylines(f,[q.astype(np.int32)],True,col,3)
    cv2.putText(f,f'{t:.2f}',(20,60),0,2,(0,255,255),3)
    tiles.append(cv2.resize(f,None,fx=0.25,fy=0.25))
cols=4
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(out,np.vstack([np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]),[cv2.IMWRITE_JPEG_QUALITY,85])
